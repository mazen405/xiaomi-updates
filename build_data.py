#!/usr/bin/env python3
"""Build the static data set used by the app from the open
XiaomiFirmwareUpdater/miui-updates-tracker project (credit: @XiaomiFirmwareUpdater).

Inputs  (--src): a checkout of the tracker repo with data/ and rss/latest.xml
Outputs (--out): data/index.json, data/meta.json, data/app.json (first run only),
                 data/devices/<base-codename>.json

History is append-only: a ROM that was ever seen is never removed.
Run with --backfill (needs a FULL clone of the tracker) to rebuild older history
from the git log of data/latest.yml.
"""
import argparse
import base64
import hashlib
import html
import json
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import yaml

try:
    Loader = yaml.CSafeLoader
except AttributeError:  # pragma: no cover
    Loader = yaml.SafeLoader

SCHEMA = 2
SOURCE = "XiaomiFirmwareUpdater/miui-updates-tracker"
CC = {"eea": "EEA", "in": "India", "ru": "Russia", "id": "Indonesia", "tr": "Turkey", "tw": "Taiwan",
      "jp": "Japan", "lm": "Latin America", "sg": "Singapore", "kr": "Korea", "sa": "Saudi Arabia",
      "mx": "Mexico", "br": "Brazil", "ua": "Ukraine", "vn": "Vietnam", "th": "Thailand", "my": "Malaysia",
      "ph": "Philippines", "pk": "Pakistan", "bd": "Bangladesh", "il": "Israel", "ae": "UAE"}
REGIONS = sorted(set(CC.values()) | {"Global", "China"}, key=len, reverse=True)
SUFFIX = {"Global": "_global", "China": ""}
SUFFIX.update({name: f"_{cc}_global" for cc, name in CC.items()})
BRANCHES = ("Stable", "Stable Beta", "Weekly", "Public Beta")
METHODS = ("Recovery", "Fastboot")
MAX_CL = 2500
# روابط التحميل المسموحة: خوادم شاومي الرسمية فقط وعبر https
HOST_OK = re.compile(r"^(?:[a-z0-9-]+\.d\.miui\.com|bkt-sgp-miui-ota-update-[a-z0-9-]+\.oss-[a-z0-9-]+\.aliyuncs\.com)$")


def safe_link(u):
    try:
        p = urlparse(str(u or "").strip())
    except ValueError:
        return ""
    if p.scheme not in ("http", "https") or not p.hostname or not HOST_OK.match(p.hostname):
        return ""
    return "https://" + p.netloc + p.path + (("?" + p.query) if p.query else "")


def dload(path):
    with open(path, encoding="utf-8") as f:
        return yaml.load(f, Loader=Loader)


def base_of(code):
    return re.sub(r"(?:_[a-z]{2,3})?_global$", "", code)


def region_of(code, name):
    for r in REGIONS:
        if name.endswith(" " + r):
            return r
    m = re.search(r"(?:_([a-z]{2,3}))?_global$", code)
    if m:
        return CC.get(m.group(1), "Global") if m.group(1) else "Global"
    return "China"


def clean_name(name, region):
    return name[: -len(region) - 1].strip() if region and name.endswith(" " + region) else name.strip()


def families(names):
    fam = set()
    for n in names:
        low = n.lower()
        if "poco" in low:
            fam.add("poco")
        if "redmi" in low:
            fam.add("redmi")
        if re.search(r"\bpad\b", low):
            fam.add("pad")
        if re.search(r"\bmix\b", low):
            fam.add("mix")
        if re.search(r"\b(xiaomi|mi)\b", low) and "redmi" not in low:
            fam.add("xiaomi")
    return sorted(fam)


def rom_key(r):
    return (r["cn"], r["br"], r["m"], r["v"])


def to_rom(e):
    """Convert a latest.yml entry to our compact record; None if unusable."""
    try:
        code, br, m, v = str(e["codename"]), str(e["branch"]), str(e["method"]), str(e["version"])
    except (KeyError, TypeError):
        return None
    link = safe_link(e.get("link"))
    if not (code and v and br and m and link and br in BRANCHES and m in METHODS):
        return None
    d = e.get("date")
    return {
        "cn": code, "rg": "", "br": br, "m": m, "v": v,
        "an": str(e.get("android") or ""), "d": str(d) if d else "",
        "sz": str(e.get("size") or ""), "md5": str(e.get("md5") or "").lower(),
        "u": link, "nm": str(e.get("name") or ""),
    }


def changelogs(src):
    """map download link -> plain-text changelog, from rss/latest.xml"""
    f = Path(src) / "rss" / "latest.xml"
    out = {}
    if not f.exists():
        return out
    try:
        root = ET.parse(f).getroot()
    except ET.ParseError as e:
        print("warn: cannot parse latest.xml:", e, file=sys.stderr)
        return out
    for it in root.iter("item"):
        link = (it.findtext("link") or "").strip()
        desc = it.findtext("description") or ""
        m = re.search(r"Changelog:</b>(.*?)</p>", desc, re.S)
        if not (link and m):
            continue
        txt = re.sub(r"<br\s*/?>", "\n", m.group(1))
        txt = html.unescape(re.sub(r"<[^>]+>", "", txt)).strip()
        if txt:
            out[link] = txt[:MAX_CL]
    return out


def load_state(out):
    state = {}
    d = Path(out) / "devices"
    if d.exists():
        for f in d.glob("*.json"):
            try:
                j = json.loads(f.read_text(encoding="utf-8"))
                for r in j["roms"]:
                    r["u"] = safe_link(r.get("u"))
                j["roms"] = [r for r in j["roms"] if r["u"]]
                base = j.pop("base", j["codename"]); j.pop("scope", None); j["codename"] = base
                cur = state.get(base)
                if cur is None:
                    state[base] = j
                else:
                    for n in j["names"]:
                        if n not in cur["names"]:
                            cur["names"].append(n)
                    for x in j["regions"]:
                        if not any(y["id"] == x["id"] and y["cn"] == x["cn"] for y in cur["regions"]):
                            cur["regions"].append(x)
                    have = {rom_key(r) for r in cur["roms"]}
                    cur["roms"].extend(r for r in j["roms"] if rom_key(r) not in have)
            except (ValueError, KeyError):
                print("warn: bad device file", f, file=sys.stderr)
    return state


def merge(state, devnames, entries, cl_map):
    """Merge raw latest.yml-style entries into state. Returns number of NEW roms."""
    added = 0
    touched = set()
    for e in entries:
        r = to_rom(e)
        if not r:
            continue
        base = base_of(r["cn"])
        nm = devnames.get(r["cn"]) or r.pop("nm") or r["cn"]
        r.pop("nm", None)
        r["rg"] = region_of(r["cn"], nm)
        dev = state.setdefault(base, {"schema": SCHEMA, "codename": base, "names": [], "regions": [], "roms": []})
        dev.setdefault("_idx", {x_key: x for x_key, x in ((rom_key(x), x) for x in dev["roms"])})
        cleaned = clean_name(nm, r["rg"])
        if cleaned not in dev["names"]:
            dev["names"].append(cleaned)
        if not any(x["id"] == r["rg"] and x["cn"] == r["cn"] for x in dev["regions"]):
            dev["regions"].append({"id": r["rg"], "cn": r["cn"], "name": nm})
        old = dev["_idx"].get(rom_key(r))
        cl = cl_map.get(r["u"])
        if old is None:
            if cl:
                r["cl"] = cl
            dev["roms"].append(r)
            dev["_idx"][rom_key(r)] = r
            added += 1
        else:
            for k in ("an", "sz", "md5", "u"):
                if r[k]:
                    old[k] = r[k]
            if r["d"] and (not old["d"]):
                old["d"] = r["d"]
            if cl and not old.get("cl"):
                old["cl"] = cl
        touched.add(base)
    return added, touched


def put(path, body):
    """write only when the bytes differ; returns True if written"""
    path = Path(path)
    if path.exists() and path.read_bytes() == body:
        return False
    path.write_bytes(body)
    return True


def listings(dev):
    """النسخة الصينية تُعرض كجهاز مستقل عن النسخ العالمية (الاسم التجاري يختلف: ريدمي مقابل بوكو)."""
    base = dev["codename"]
    regs = sorted(dev["regions"], key=lambda x: (x["id"] != "Global", x["id"] != "China", x["id"]))
    cn = [x for x in regs if x["id"] == "China"]
    rest = [x for x in regs if x["id"] != "China"]
    has_cn_roms = any(r["rg"] == "China" for r in dev["roms"])
    has_rest_roms = any(r["rg"] != "China" for r in dev["roms"])
    if not (cn and rest and has_cn_roms and has_rest_roms):
        d = {"schema": SCHEMA, "codename": base, "names": dev["names"][:8], "regions": regs, "roms": list(dev["roms"])}
        return [(base, d, "", "")]

    def mk(id_, group, scope, pick):
        names = []
        for x in group:
            n = clean_name(x["name"], x["id"])
            if n and n != x["cn"] and n not in names:
                names.append(n)
        if not names:
            names = dev["names"][:2] or [base]
        return (id_, {"schema": SCHEMA, "codename": id_, "base": base, "scope": scope, "names": names[:8],
                      "regions": group, "roms": [r for r in dev["roms"] if pick(r["rg"])]}, scope, base)
    return [mk(base, rest, "gl", lambda g: g != "China"), mk(base + "~cn", cn, "cn", lambda g: g == "China")]


def write(out, state):
    out = Path(out)
    (out / "devices").mkdir(parents=True, exist_ok=True)
    index = []
    nroms = 0
    written = set()
    for base, full in state.items():
        full.pop("_idx", None)
        for lid, dev, scope, bc in listings(full):
            dev["roms"].sort(key=lambda r: (r["d"], r["v"]), reverse=True)
            body = json.dumps(dev, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            put(out / "devices" / f"{lid}.json", body)
            written.add(f"{lid}.json")
            nroms += len(dev["roms"])
            last = dev["roms"][0]["d"] if dev["roms"] else ""
            e = {"c": lid, "n": dev["names"][:4], "r": [x["id"] for x in dev["regions"]],
                 "d": last, "b": dev["roms"][0]["br"] if dev["roms"] else "",
                 "f": families(dev["names"]), "k": len(dev["roms"]),
                 "lv": dev["roms"][0]["v"] if dev["roms"] else "",
                 "h": hashlib.sha256(body).hexdigest()[:16]}
            if scope:
                e["s"] = scope
                e["bc"] = bc
            index.append(e)
    for f in (out / "devices").glob("*.json"):
        if f.name not in written:
            f.unlink()
    index.sort(key=lambda e: (e["d"], e["c"]), reverse=True)
    body = json.dumps(index, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return len(index), nroms, body


def sign(data, pem):
    """ECDSA P-256 / SHA-256, raw r||s (what WebCrypto verifies), base64"""
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
    key = serialization.load_pem_private_key(pem.encode(), password=None)
    r, s = decode_dss_signature(key.sign(data, ec.ECDSA(hashes.SHA256())))
    return base64.b64encode(r.to_bytes(32, "big") + s.to_bytes(32, "big")).decode()


def validate(out):
    out = Path(out)
    idx = json.loads((out / "index.json").read_text(encoding="utf-8"))
    assert isinstance(idx, list) and idx, "index empty"
    for e in idx:
        assert isinstance(e["c"], str) and isinstance(e["n"], list) and isinstance(e["r"], list), e
        f = out / "devices" / f"{e['c']}.json"
        assert f.exists(), f"missing {f}"
        assert hashlib.sha256(f.read_bytes()).hexdigest()[:16] == e["h"], f"hash mismatch {f}"
    for f in (out / "devices").glob("*.json"):
        j = json.loads(f.read_text(encoding="utf-8"))
        assert j["schema"] == SCHEMA and isinstance(j["roms"], list), f
        for r in j["roms"]:
            assert r["br"] in BRANCHES and r["m"] in METHODS and r["v"] and safe_link(r["u"]) == r["u"], (f, r)
    return len(idx)


def git(src, *a):
    return subprocess.run(["git", "-C", str(src), *a], check=True, capture_output=True).stdout


def history(src):
    """كل الإدخالات التي ظهرت يوماً في data/latest.yml عبر تاريخ git، من الأقدم إلى الأحدث.
    سريع: يقرأ نسخ الملف عبر cat-file --batch ويحلل كل كتلة فريدة مرة واحدة فقط."""
    log = git(src, "log", "--reverse", "--raw", "--no-abbrev", "--format=C %H", "--", "data/latest.yml").decode().splitlines()
    oids = []
    for line in log:
        if line.startswith(":") and line.rstrip().endswith("data/latest.yml"):
            new = line.split()[3]
            if set(new) != {"0"} and (not oids or oids[-1] != new):
                oids.append(new)
    print(f"snapshots: {len(oids)}", flush=True)
    proc = subprocess.Popen(["git", "-C", str(src), "cat-file", "--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    seen_blocks, seen_oids, entries = set(), set(), {}
    for i, oid in enumerate(oids):
        if oid in seen_oids:
            continue
        seen_oids.add(oid)
        proc.stdin.write(oid.encode() + b"\n"); proc.stdin.flush()
        head = proc.stdout.readline().split()
        if len(head) != 3:
            continue
        data = proc.stdout.read(int(head[2])); proc.stdout.read(1)
        for block in data.decode("utf-8", "replace").split("\n- android:"):
            if block in seen_blocks:
                continue
            seen_blocks.add(block)
            text = block if block.startswith("- android:") else "- android:" + block
            try:
                got = yaml.load(text, Loader=Loader)
            except yaml.YAMLError:
                continue
            for e in got if isinstance(got, list) else []:
                if isinstance(e, dict) and e.get("codename") and e.get("version"):
                    entries[(e["codename"], e.get("name"), e.get("branch"), e.get("method"), str(e["version"]))] = e
        if i % 500 == 0:
            print(f"history {i}/{len(oids)} unique={len(entries)}", flush=True)
    proc.stdin.close(); proc.wait()
    return list(entries.values())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", default="data")
    ap.add_argument("--backfill", action="store_true")
    ap.add_argument("--telegram", action="store_true", help="fast lane: also read the tracker Telegram channel")
    ap.add_argument("--require-sign", action="store_true")
    a = ap.parse_args()
    pem = os.environ.get("DATA_SIGNING_KEY", "").strip()
    if a.require_sign and not pem:
        raise SystemExit("مفتاح التوقيع DATA_SIGNING_KEY غير موجود في أسرار المستودع")
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)

    devnames = {}
    for code, v in (dload(Path(a.src) / "data" / "devices.yml") or {}).items():
        if isinstance(v, list) and v:
            devnames[str(code)] = str(v[0])

    state = load_state(out)
    added = 0
    touched = set()
    if a.backfill:
        n, t = merge(state, devnames, history(a.src), {})
        added += n
        touched |= t
    latest = dload(Path(a.src) / "data" / "latest.yml") or []
    n, t = merge(state, devnames, latest, changelogs(a.src))
    added += n
    touched |= t

    # catalog devices that have no ROM yet still appear (search finds them, page says "no releases")
    for code, nm in devnames.items():
        base = base_of(code)
        rg = region_of(code, nm)
        dev = state.setdefault(base, {"schema": SCHEMA, "codename": base, "names": [], "regions": [], "roms": []})
        touched.add(base)
        cleaned = clean_name(nm, rg)
        if cleaned not in dev["names"]:
            dev["names"].append(cleaned)
        if not any(x["id"] == rg and x["cn"] == code for x in dev["regions"]):
            dev["regions"].append({"id": rg, "cn": code, "name": nm})

    if a.telegram:
        try:
            from telegram_lane import fetch_entries
            ents, clm = fetch_entries(SUFFIX)
            clm = {safe_link(k): v for k, v in clm.items()}
            n, t = merge(state, devnames, ents, clm)
            added += n
            touched |= t
            print(f"telegram lane: {len(ents)} posts read, {n} new")
        except Exception as ex:  # the fast lane must never break the main build
            print("telegram lane skipped:", ex, file=sys.stderr)

    ndev, nroms, idx_body = write(out, state)
    idx_changed = put(out / "index.json", idx_body)
    sig_file = out / "index.sig"
    if pem and (idx_changed or not sig_file.exists()):
        sig_file.write_text(sign(idx_body, pem), encoding="utf-8")
    validate(out)

    if added or a.backfill or not (out / "meta.json").exists():
        try:
            sha = git(a.src, "rev-parse", "HEAD").decode().strip()
        except Exception:
            sha = ""
        (out / "meta.json").write_text(json.dumps({
            "schema": SCHEMA, "updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "devices": ndev, "roms": nroms, "source": SOURCE, "source_commit": sha,
        }, ensure_ascii=False), encoding="utf-8")
    if not (out / "app.json").exists():
        (out / "app.json").write_text(json.dumps({
            "schema": SCHEMA, "latest_app": "1.0.0", "min_app": "1.0.0", "notice": "", "apk_url": ""}), encoding="utf-8")
    print(f"devices={ndev} roms={nroms} new={added}")


if __name__ == "__main__":
    main()
