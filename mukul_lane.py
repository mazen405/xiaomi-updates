"""مسار إضافي سريع: قراءة المنشورات العامة لقناة تلجرام تنشر إصدارات HyperOS مبكراً.
نأخذ منها الحقائق فقط (الجهاز، الإصدار، النوع، التاريخ، الحجم، الرابط الرسمي، ملاحظات الإصدار)
ولا ننقل نص المنشور ولا أي حسابات أو روابط خاصة بالقناة.
قاعدة الأمان: لا يُعتمد رابط التنزيل إلا إذا طابق اسم الملف رمز الجهاز ورقم الإصدار نفسه
(رأينا منشوراً يضع رابط جهاز آخر)، وإلا يُسجَّل الإصدار «بانتظار الرابط الرسمي» بلا زر تنزيل.
أي خطأ هنا لا يوقف البناء الأساسي."""
import re
import time
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

URL = "https://t.me/s/TECH_MUKUL"
HEADERS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
           "Accept-Language": "en"}
MONTHS = {m: i + 1 for i, m in enumerate("jan feb mar apr may jun jul aug sep oct nov dec".split())}
VER_CC = {"CN": "China", "MI": "Global", "IN": "India", "EU": "EEA", "ID": "Indonesia", "RU": "Russia",
          "TR": "Turkey", "TW": "Taiwan", "JP": "Japan"}


def _get(url, tries=3):
    for i in range(tries):
        try:
            r = requests.get(url, headers=HEADERS, timeout=30)
            if r.status_code == 200:
                return r.text
        except requests.RequestException:
            pass
        time.sleep(2 * (i + 1))
    return None


def _branch(status):
    s = status.lower()
    if "public" in s:
        return "Public Beta"
    if "weekly" in s or "dev" in s:
        return "Weekly"
    if "pilot" in s or "beta" in s:
        return "Stable Beta"
    if "stable" in s or "official" in s or "full release" in s:
        return "Stable"
    return ""


SKIP = {}


def _no(why, text=""):
    SKIP[why] = SKIP.get(why, 0) + 1
    if text:
        print("  [early] تخطّي (%s): %s" % (why, text.strip().splitlines()[0][:70]))
    return None


def parse_beta_post(text, suffix_by_region, names, post_date=""):
    """صيغة: «#Xiaomi17 #HyperOS4 … Update Released For Beta Testers» ثم Version وحجم الحزمة.
    الرابط في هذه المنشورات يشير إلى منشور تلجرام لا إلى ملف رسمي، فلا يُعتمد أبداً (الإصدار «بانتظار الرابط الرسمي»)."""
    head = text.strip().splitlines()[0] if text.strip() else ""
    if not re.search(r"released for beta", text[:300], re.I):
        return None
    m = re.search(r"Version:\s*([A-Z][A-Za-z0-9.]+)", text)
    ver = m.group(1) if m else ""
    cc = re.search(r"([A-Z]{2})XM$", ver)
    region = VER_CC.get(cc.group(1)) if cc else None
    if not ("." in ver and region in suffix_by_region):
        return _no("إصدار بيتا: نسخة/منطقة غير مفهومة", head)
    tags = [t for t in re.findall(r"#(\w+)", head.split("Released")[0])
            if not re.match(r"(hyperos|miui|january|february|march|april|may|june|july|august|september|october|november|december)", t, re.I)]
    base = next((names[re.sub(r"[^a-z0-9]", "", t.lower())] for t in tags
                 if re.sub(r"[^a-z0-9]", "", t.lower()) in names), None)
    if not base:
        return _no("إصدار بيتا: جهاز غير معروف", head)
    sz = re.search(r"size:\s*([\d.]+)\s*([KMG]B)", text, re.I)
    size = f"{sz.group(1)} {sz.group(2).upper()}" if sz else ""
    an = re.search(r"Android:\s*([\d.]+)", text)
    return {"codename": base + suffix_by_region[region], "name": "", "branch": "Stable Beta", "method": "Recovery",
            "version": ver, "android": an.group(1) if an else "", "date": post_date, "size": size, "md5": "",
            "link": "", "pending": True, "changelog": "", "known_only": True}


def parse_text(text, suffix_by_region, post_date="", names=None):
    """text: نص المنشور. يعيد إدخالاً بصيغة latest.yml أو None."""
    head = text.strip().splitlines()[0] if text.strip() else ""
    if "|" not in head:
        e = parse_beta_post(text, suffix_by_region, names or {}, post_date)
        if e:
            return e
        return _no("ليس منشور إصدار", head if SKIP.get("ليس منشور إصدار", 0) < 30 else "")
    tags = re.findall(r"#(\w+)", head.split("|", 1)[1])
    by_norm = {r.lower().replace(" ", ""): r for r in suffix_by_region}
    region = next((by_norm[t.lower()] for t in tags if t.lower() in by_norm), None)
    code = next((t.lower() for t in tags if t.lower() not in by_norm), "")
    m = re.search(r"(?:HyperOS|MIUI)[^\n:]*:\s*([A-Z][A-Za-z0-9.]+)", text)
    ver = m.group(1) if m else ""
    if not (code and re.fullmatch(r"[A-Z0-9.]{6,}", ver) and "." in ver):
        return _no("إصدار/رمز غير مفهوم", text)
    if region is None:
        cc = re.search(r"([A-Z]{2})XM$", ver)
        region = VER_CC.get(cc.group(1)) if cc else None
    if region is None or region not in suffix_by_region:
        return _no("منطقة غير معروفة", text)
    st = re.search(r"Status:\s*(.+)", text)
    branch = _branch(st.group(1)) if st else ""
    if not branch:
        print("  [early] Status =", repr(st.group(1)[:60]) if st else "لا يوجد سطر Status")
        return _no("نوع الإصدار غير معروف", text)
    an = re.search(r"Android:\s*([\d.]+)", text)
    date = post_date
    d = re.search(r"Release:\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})", text)
    if d and d.group(2)[:3].lower() in MONTHS:
        date = f"{int(d.group(3)):04d}-{MONTHS[d.group(2)[:3].lower()]:02d}-{int(d.group(1)):02d}"
    sz = re.search(r"size:\s*([\d.]+)\s*([KMG]B)", text, re.I)
    size = f"{sz.group(1)} {sz.group(2).upper()}" if sz else ""
    link = ""
    for kind in ("Recovery",):
        lm = re.search(kind + r"[^\n]*\n\s*(https?://\S+)", text)
        if lm:
            link = lm.group(1).strip()
    ok = bool(link) and ver in link and code in link.lower()
    cl = ""
    c = re.search(r"Changelog:?\s*\n(.*?)(?:\n\s*[🔗📢🐦]|\Z)", text, re.S)
    if c:
        lines = [ln.strip() for ln in c.group(1).splitlines()
                 if ln.strip() and not re.search(r"@|t\.me|twitter|https?://", ln, re.I)]
        cl = "\n".join(lines)[:2500]
    return {"codename": code + suffix_by_region[region], "name": "", "branch": branch, "method": "Recovery",
            "version": ver, "android": an.group(1) if an else "", "date": date, "size": size, "md5": "",
            "link": link if ok else "", "pending": not ok, "changelog": cl, "known_only": True}


def fetch_entries(suffix_by_region, pages=4, names=None):
    entries, url = [], URL
    for _ in range(pages):
        html = _get(url)
        if not html:
            break
        soup = BeautifulSoup(html, "html.parser")
        ids = []
        for msg in soup.select(".tgme_widget_message"):
            try:
                ids.append(int(msg.get("data-post", "").rsplit("/", 1)[1]))
            except (IndexError, ValueError):
                continue
            box = msg.select_one(".tgme_widget_message_text")
            if box is None:
                continue
            for br in box.find_all("br"):
                br.replace_with("\n")
            t = msg.select_one("a.tgme_widget_message_date time")
            pd = t["datetime"][:10] if t is not None and t.has_attr("datetime") else datetime.now(timezone.utc).strftime("%Y-%m-%d")
            e = parse_text(box.get_text(""), suffix_by_region, pd, names)
            if e:
                entries.append(e)
        if not ids:
            break
        url = f"{URL}?before={min(ids)}"
    print("  [early] مقبول:", len(entries), "| متخطّى:", SKIP)
    return entries
