"""المسار السريع: قراءة آخر منشورات قناة @MIUIUpdatesTracker (نسخة الويب العامة)
وتحويلها إلى نفس شكل إدخالات latest.yml، فتظهر الإصدارات الجديدة خلال دقائق
بدل انتظار مزامنة المستودع. أي خطأ هنا لا يوقف البناء الأساسي."""
import re
import time

import requests
from bs4 import BeautifulSoup

URL = "https://t.me/s/MIUIUpdatesTracker"
HEADERS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
           "Accept-Language": "en"}


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


def _field(name, text):
    m = re.search(name + r":\s*(.+)", text)
    return m.group(1).strip() if m else ""


def parse_message(msg, suffix_by_region):
    """returns (entry, changelog) or None"""
    box = msg.select_one(".tgme_widget_message_text")
    if box is None:
        return None
    for br in box.find_all("br"):
        br.replace_with("\n")
    text = box.get_text("")
    if "New update available" not in text:
        return None
    base = _field("Codename", text).lstrip("#").strip()
    device = _field("Device", text)
    ver = re.search(r"Version:\s*([^\s|]+)(?:\s*\|\s*([\d.]+))?", text)
    typ = _field("Type", text).split()
    if not (base and device and ver and len(typ) >= 2 and typ[-1] in ("Recovery", "Fastboot")):
        return None
    region = next((r for r in suffix_by_region if device.endswith(" " + r)), None)
    if region is None:
        return None
    link = ""
    for a in msg.select("a.tgme_widget_message_inline_button"):
        if a.get_text(" ", strip=True) == "Full ROM":
            link = a.get("href", "")
    if not link:
        return None
    t = msg.select_one("a.tgme_widget_message_date time")
    date = t["datetime"][:10] if t is not None and t.has_attr("datetime") else ""
    md5 = re.search(r"MD5:\s*([0-9a-fA-F]{32})", text)
    cl = re.search(r"Changelog:?\s*(.*?)\s*@MIUIUpdatesTracker", text, re.S)
    entry = {"codename": base + suffix_by_region[region], "name": device, "branch": " ".join(typ[:-1]),
             "method": typ[-1], "version": ver.group(1), "android": ver.group(2) or "", "date": date,
             "size": _field("Size", text), "md5": md5.group(1) if md5 else "", "link": link}
    return entry, (cl.group(1).strip() if cl else "")


def fetch_entries(suffix_by_region, pages=3):
    entries, changelogs = [], {}
    url = URL
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
            got = parse_message(msg, suffix_by_region)
            if got:
                entries.append(got[0])
                if got[1]:
                    changelogs[got[0]["link"]] = got[1][:2500]
        if not ids:
            break
        url = f"{URL}?before={min(ids)}"
    return entries, changelogs
