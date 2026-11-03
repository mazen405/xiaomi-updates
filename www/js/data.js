"use strict";
/* طبقة البيانات: تحميل، تحقق من التوقيع والبصمة، بحث، وتجميع الإصدارات.
   لا تلمس الواجهة. أي تغيير في شكل البيانات يُعالَج هنا فقط. */
(function () {
  const C = window.XU_CONFIG;
  const dec = new TextDecoder();
  const D = { index: [], byCode: new Map(), bundledHash: new Map(), source: "bundled", meta: null, devCache: new Map() };

  /* ---------- أدوات ---------- */
  const store = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* المساحة ممتلئة أو التخزين معطّل */ } }
  };
  const b64 = s => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  async function sha16(buf) {
    const d = new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
    return Array.from(d.slice(0, 8), x => x.toString(16).padStart(2, "0")).join("");
  }
  let keyP;
  const pubKey = () => keyP || (keyP = crypto.subtle.importKey("spki", b64(C.publicKey), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]));
  async function verify(buf, sigText) {
    try { return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, await pubKey(), b64(sigText.trim()), buf); }
    catch (e) { return false; }
  }
  async function getBuf(url, ms) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms || 12000);
    try {
      const r = await fetch(url, { cache: "no-store", signal: ctl.signal, credentials: "omit", referrerPolicy: "no-referrer" });
      if (!r.ok) throw new Error("http " + r.status);
      return await r.arrayBuffer();
    } finally { clearTimeout(t); }
  }
  function safeLink(u) {
    try {
      const p = new URL(u);
      return p.protocol === "https:" && C.linkHost.test(p.hostname) ? p.href : "";
    } catch (e) { return ""; }
  }
  const sane = idx => Array.isArray(idx) && idx.length > 0 && idx.every(e => e && typeof e.c === "string" && Array.isArray(e.n) && Array.isArray(e.r) && typeof e.h === "string");
  const sumK = idx => idx.reduce((a, e) => a + (e.k || 0), 0);

  function setIndex(idx, source) {
    D.index = idx; D.source = source;
    D.byCode = new Map(idx.map(e => [e.c, e]));
    D.devCache.clear();
  }

  /* ---------- التحميل ---------- */
  async function loadBundled() {
    const buf = await getBuf("data/index.json");
    const idx = JSON.parse(dec.decode(buf));
    if (!sane(idx)) throw new Error("bundled index invalid");
    D.bundledHash = new Map(idx.map(e => [e.c, e.h]));
    setIndex(idx, "bundled");
    try { D.meta = JSON.parse(dec.decode(await getBuf("data/meta.json"))); } catch (e) { D.meta = null; }
    /* فهرس محدّث سبق التحقق منه وحفظه في تشغيل سابق */
    const cached = store.get("idx2");
    if (cached && sane(cached.idx) && sumK(cached.idx) > sumK(idx)) { setIndex(cached.idx, "cached"); D.meta = cached.meta || D.meta; }
  }

  /* يعيد: updated | same | offline | rejected */
  async function refreshRemote() {
    try {
      const [ib, sb] = await Promise.all([getBuf(C.remoteBase + "/index.json"), getBuf(C.remoteBase + "/index.sig")]);
      if (!(await verify(ib, dec.decode(sb)))) return "rejected";
      const idx = JSON.parse(dec.decode(ib));
      if (!sane(idx)) return "rejected";
      const sig = e => e.c + ":" + e.h;
      const changed = idx.map(sig).join("|") !== D.index.map(sig).join("|");
      let meta = D.meta;
      try { meta = JSON.parse(dec.decode(await getBuf(C.remoteBase + "/meta.json", 8000))); } catch (e) { /* اختياري */ }
      if (changed || D.source === "bundled") { setIndex(idx, "remote"); D.meta = meta; store.set("idx2", { idx, meta }); }
      return changed ? "updated" : "same";
    } catch (e) { return "offline"; }
  }

  async function getDevice(code) {
    if (D.devCache.has(code)) return D.devCache.get(code);
    const e = D.byCode.get(code);
    let dev = null, stale = false;
    if (e && D.bundledHash.get(code) !== e.h) {
      /* الجهاز أحدث من النسخة المضمّنة في التطبيق: نجلبه ونتحقق من بصمته */
      try {
        const buf = await getBuf(C.remoteBase + "/devices/" + encodeURIComponent(code) + ".json");
        if ((await sha16(buf)) === e.h) dev = JSON.parse(dec.decode(buf)); else stale = true;
      } catch (err) { stale = true; }
    }
    if (!dev) dev = JSON.parse(dec.decode(await getBuf("data/devices/" + encodeURIComponent(code) + ".json")));
    if (!dev || dev.schema !== C.schema || !Array.isArray(dev.roms)) throw new Error("schema");
    dev.roms = dev.roms.map(r => Object.assign({}, r, { u: safeLink(r.u) }));
    dev._stale = stale;
    D.devCache.set(code, dev);
    return dev;
  }

  /* ---------- البحث ---------- */
  const AR_WORDS = {
    "ريدمي": "redmi", "ردمي": "redmi", "بوكو": "poco", "شاومي": "xiaomi", "شاؤمي": "xiaomi", "مي": "mi", "ميكس": "mix",
    "نوت": "note", "برو": "pro", "بلس": "plus", "الترا": "ultra", "ألترا": "ultra", "ماكس": "max", "لايت": "lite",
    "باد": "pad", "فولد": "fold", "فليب": "flip", "تيربو": "turbo", "ثري": "3", "سي": "c", "اكس": "x", "إكس": "x", "ام": "m", "اف": "f", "كي": "k"
  };
  const DIGITS = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
  const norm = s => String(s).toLowerCase().replace(/[٠-٩]/g, d => DIGITS[d]).replace(/\+/g, " plus ")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const compact = s => norm(s).replace(/ /g, "");
  function tokens(q) { return norm(q).split(" ").filter(Boolean).map(t => AR_WORDS[t] || t); }

  function search(q, family) {
    const toks = tokens(q);
    let list = D.index;
    if (family && family !== "all") list = list.filter(e => (e.f || []).includes(family));
    if (!toks.length) return list;
    const joined = toks.join("");
    const out = [];
    for (const e of list) {
      const code = e.bc || e.c;
      const hay = e._h || (e._h = norm(e.n.join(" ") + " " + code + (e.s === "cn" ? " china الصين" : "")));
      const hayC = e._hc || (e._hc = hay.replace(/ /g, ""));
      if (!toks.every(t => hay.includes(t)) && !hayC.includes(joined)) continue;
      let score = hayC.includes(joined) ? 300 : 0;
      if (compact(code) === joined) score += 1000;
      if (e.n.some(n => compact(n) === joined)) score += 500;
      if (e.n.some(n => compact(n).startsWith(joined))) score += 100;
      score -= Math.min(e.n[0] ? e.n[0].length : 0, 60) / 10;
      out.push([score, e]);
    }
    out.sort((a, b) => b[0] - a[0] || (a[1].d < b[1].d ? 1 : -1));
    return out.map(x => x[1]);
  }

  /* ---------- تجميع الإصدارات: إصدار واحد = حزمة استرداد وحزمة فلاش ---------- */
  function regionsWithRoms(dev) {
    const have = new Set(dev.roms.map(r => r.rg));
    const known = dev.regions.filter(x => have.has(x.id));
    const extra = [...have].filter(id => !known.some(x => x.id === id)).map(id => ({ id, cn: "", name: dev.names[0] || dev.codename }));
    return known.concat(extra);
  }
  function groupReleases(dev, regionId) {
    const map = new Map();
    for (const r of dev.roms) {
      if (r.rg !== regionId) continue;
      const k = r.v + "|" + r.br;
      let g = map.get(k);
      if (!g) { g = { v: r.v, br: r.br, an: r.an, d: r.d, recovery: null, fastboot: null, cl: "" }; map.set(k, g); }
      if (r.m === "Recovery") g.recovery = r; else if (r.m === "Fastboot") g.fastboot = r;
      if (r.d && (!g.d || r.d < g.d)) g.d = r.d;
      if (!g.an && r.an) g.an = r.an;
      if (!g.cl && r.cl) g.cl = r.cl;
    }
    return [...map.values()].sort((a, b) => (b.d || "").localeCompare(a.d || "") || b.v.localeCompare(a.v));
  }

  window.XU_DATA = { D, loadBundled, refreshRemote, getDevice, search, regionsWithRoms, groupReleases, safeLink, store };
})();
