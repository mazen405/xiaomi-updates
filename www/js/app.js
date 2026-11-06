"use strict";
/* واجهة التطبيق. تعتمد على XU_DATA فقط ولا تتصل بالشبكة مباشرة. */
(function () {
  const C = window.XU_CONFIG, X = window.XU_DATA, D = X.D;
  const $ = s => document.querySelector(s);
  const viewEl = $("#view"), sov = $("#sov"), sres = $("#sres"), qEl = $("#q"), clearEl = $("#clear"), chipsEl = $("#chips"), toastEl = $("#toast"), dockEl = $("#dock"), badgeEl = $("#favbadge");

  const S = { tab: "home", family: "all", q: "", shown: 40, relShown: 20, branch: "all", region: null, dev: null, code: null, pushed: false, y: {}, sync: "", busy: false, lastSync: 0, ready: false, notified: {}, stack: ["#/"] };

  /* ---------- نصوص ثابتة ---------- */
  const FAMILIES = [["all", "الكل"], ["xiaomi", "شاومي"], ["redmi", "ريدمي"], ["poco", "بوكو"], ["pad", "الأجهزة اللوحية"], ["mix", "ميكس"]];
  const MARK = { xiaomi: "Mi", redmi: "Rd", poco: "Po", pad: "Pd", mix: "Mx" };
  const REGION_AR = { Global: "عالمية", China: "الصين", EEA: "أوروبا (EEA)", India: "الهند", Indonesia: "إندونيسيا", Russia: "روسيا", Turkey: "تركيا", Taiwan: "تايوان", Japan: "اليابان",
    "Latin America": "أمريكا اللاتينية", Singapore: "سنغافورة", Korea: "كوريا", "Saudi Arabia": "السعودية", Mexico: "المكسيك", Brazil: "البرازيل", Ukraine: "أوكرانيا",
    Vietnam: "فيتنام", Thailand: "تايلاند", Malaysia: "ماليزيا", Philippines: "الفلبين", Pakistan: "باكستان", Bangladesh: "بنغلاديش", Israel: "إسرائيل", UAE: "الإمارات" };
  const BRANCH = { "Stable": ["مستقر", "s"], "Stable Beta": ["مستقر تجريبي", "b"], "Weekly": ["أسبوعي للمطوّرين", "w"], "Public Beta": ["تجريبي عام", "p"] };
  const SRC_AR = { bundled: "مضمّنة في التطبيق", cached: "محفوظة من آخر مزامنة", remote: "محدّثة من الإنترنت" };
  const ICON = {
    navhome: '<svg viewBox="0 0 24 24"><path class="d" d="M4.5 10.6 12 4l7.5 6.6V19a1.2 1.2 0 0 1-1.2 1.2H5.7A1.2 1.2 0 0 1 4.5 19z"/><path d="M3 11.2 12 3.5l9 7.7"/><path d="M4.5 10.6 12 4l7.5 6.6V19a1.2 1.2 0 0 1-1.2 1.2H5.7A1.2 1.2 0 0 1 4.5 19z"/><path d="M10 20.2v-4.4a2 2 0 0 1 4 0v4.4"/></svg>',
    navsearch: '<svg viewBox="0 0 24 24"><circle class="d" cx="11" cy="11" r="7"/><circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.6-4.6"/><path d="M8 9.6a3.4 3.4 0 0 1 2.2-1.9"/></svg>',
    navstar: '<svg viewBox="0 0 24 24"><path class="d" d="m12 3.5 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.3 6.6 20.3l1.1-6.1L3.2 9.9l6.1-.8z"/><path d="m12 3.5 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.3 6.6 20.3l1.1-6.1L3.2 9.9l6.1-.8z"/></svg>',
    navset: '<svg viewBox="0 0 24 24"><path class="d" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    go: '<svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 3.5 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.3 6.6 20.3l1.1-6.1L3.2 9.9l6.1-.8z"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/></svg>',
    dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/></svg>',
    cp: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    text: '<svg viewBox="0 0 24 24"><path d="M6 4h9l4 4v12H6z"/><path d="M9 12h7M9 16h7"/></svg>',
    sync: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.5-4M4 13a8 8 0 0 0 14.5 4M5 3v4h4M19 21v-4h-4"/></svg>'
  };
  function icons(root) { (root || document).querySelectorAll("i[data-ico]").forEach(el => { if (!el.firstChild) el.innerHTML = ICON[el.dataset.ico] || ""; }); }

  /* ---------- أدوات ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = n => n.toLocaleString("en-US");
  function plural(n, f) { return n === 1 ? f[0] : n === 2 ? f[1] : n >= 3 && n <= 10 ? n + " " + f[2] : num(n) + " " + f[3]; }
  const P_REGION = ["منطقة واحدة", "منطقتان", "مناطق", "منطقة"];
  const P_REL = ["إصدار واحد", "إصداران", "إصدارات", "إصداراً"];
  const SCOPE = { cn: "النسخة الصينية", gl: "النسخ العالمية" };
  const P_DEV = ["جهاز واحد", "جهازان", "أجهزة", "جهازاً"];
  const parse = d => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  let fmt = null;
  try { fmt = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { fmt = null; }
  function dateAr(d) { const t = parse(d); return t ? (fmt ? fmt.format(t) : d) : "تاريخ غير مسجّل"; }
  function ago(d) {
    const t = parse(d); if (!t) return "";
    const days = Math.floor((Date.now() - t.getTime()) / 864e5);
    if (days <= 0) return "اليوم"; if (days === 1) return "أمس"; if (days === 2) return "قبل يومين";
    if (days <= 10) return "قبل " + days + " أيام"; if (days < 30) return "قبل " + days + " يوماً";
    const mo = Math.floor(days / 30);
    if (mo < 12) return mo === 1 ? "قبل شهر" : mo === 2 ? "قبل شهرين" : mo <= 10 ? "قبل " + mo + " أشهر" : "قبل " + mo + " شهراً";
    const y = Math.floor(days / 365);
    return y === 1 ? "قبل سنة" : y === 2 ? "قبل سنتين" : y <= 10 ? "قبل " + y + " سنوات" : "قبل " + y + " سنة";
  }
  let toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("on"), 2800); }
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- الإعدادات والتخزين ---------- */
  const DEF = { theme: "auto", size: "m", region: "Global", notify: true };
  const settings = () => Object.assign({}, DEF, X.store.get("settings") || {});
  function setSetting(k, v) { const s = settings(); s[k] = v; X.store.set("settings", s); applySettings(); }
  function applyInsets() {
    try {
      const b = window.EhapInsets; if (!b) return;
      const r = document.documentElement.style;
      r.setProperty("--sat", b.top() + "px"); r.setProperty("--sab", b.bottom() + "px");
    } catch (e) { /* خارج التطبيق الأصلي */ }
  }
  function applyBars() {
    try {
      const b = window.EhapInsets; if (!b) return;
      const t = document.documentElement.getAttribute("data-theme");
      b.light(t === "light" || (t !== "dark" && !(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)));
    } catch (e) { /* خارج التطبيق الأصلي */ }
  }
  applyInsets(); window.addEventListener("resize", applyInsets);
  function applySettings() {
    const s = settings(), r = document.documentElement;
    if (s.theme === "light" || s.theme === "dark") r.setAttribute("data-theme", s.theme); else r.removeAttribute("data-theme");
    if (s.size === "s" || s.size === "l") r.setAttribute("data-size", s.size); else r.removeAttribute("data-size");
    applyBars();
  }
  const favs = () => { const f = X.store.get("favs"); return Array.isArray(f) ? f : []; };
  const seen = () => X.store.get("seen") || {};
  const recents = () => { const f = X.store.get("recent"); return Array.isArray(f) ? f : []; };
  const stamp = e => e.d + "|" + (e.lv || "");
  function isFresh(e) {
    const sn = seen()[e.c]; if (!sn) return false;
    return sn.indexOf("|") < 0 ? e.d > sn : sn !== stamp(e);
  }
  function freshFavs() { return favs().map(c => D.byCode.get(c)).filter(e => e && isFresh(e)); }
  function toggleFav(code) {
    const f = favs(), i = f.indexOf(code);
    if (i < 0) { f.push(code); const e = D.byCode.get(code), s = seen(); if (e) { s[code] = stamp(e); X.store.set("seen", s); } } else f.splice(i, 1);
    X.store.set("favs", f); updateBadge();
  }
  function markSeen(code) { const e = D.byCode.get(code); if (!e) return; const s = seen(); s[code] = stamp(e); X.store.set("seen", s); }
  function pushRecent(code) { const r = recents().filter(c => c !== code); r.unshift(code); X.store.set("recent", r.slice(0, 6)); }
  function updateBadge() { const n = freshFavs().length; badgeEl.hidden = n === 0; badgeEl.textContent = n; }

  /* ---------- مكوّنات مشتركة ---------- */
  const fam = e => (e.f && e.f[0]) || "xiaomi";
  function row(e) {
    const isFav = favs().includes(e.c), f = fam(e), br = BRANCH[e.b] || [e.b || "", ""];
    return `<li class="row" data-open="${esc(e.c)}" tabindex="0" role="link">
      <span class="mk ${esc(f)}">${esc(MARK[f] || "Mi")}</span>
      <div class="main">
        <div class="nm"><bdi>${esc(e.n[0] || e.c)}</bdi>${isFresh(e) ? '<span class="fresh" title="إصدار جديد"></span>' : ""}</div>
        <div class="sub"><span class="code">${esc(e.bc || e.c)}</span>${e.s ? `<span class="tag sc ${esc(e.s)}">${SCOPE[e.s]}</span>` : ""}${e.b ? `<span class="tag ${br[1]}">${esc(br[0])}</span>` : ""}<span>${plural(e.r.length, P_REGION)}</span></div>
      </div>
      <div class="when">${esc(ago(e.d) || "")}</div>
      <button class="fav" type="button" data-fav="${esc(e.c)}" aria-pressed="${isFav}" aria-label="${isFav ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}">${ICON.star}</button>
    </li>`;
  }
  const byDate = () => D.index.slice().sort((a, b) => (b.d || "").localeCompare(a.d || ""));
  const totalRoms = () => D.index.reduce((a, e) => a + (e.k || 0), 0);

  /* ---------- الرئيسية ---------- */
  function liveBadge() {
    if (S.sync === "rejected") return '<span class="live bad"><i></i>تعذّر التحقق من البيانات الجديدة</span>';
    if (S.sync === "offline") return '<span class="live off"><i></i>غير متصل: تُعرض البيانات المحفوظة</span>';
    if (S.sync === "updated" || S.sync === "same") return '<span class="live"><i></i>البيانات محدّثة الآن</span>';
    return '<span class="live off"><i></i>جارٍ التحقق من آخر التحديثات…</span>';
  }
  function card(e) {
    const f = fam(e), br = BRANCH[e.b] || [e.b || "", ""];
    return `<button class="hcard ${esc(f)}" type="button" data-open="${esc(e.c)}"><span class="mk ${esc(f)}">${esc(MARK[f] || "Mi")}</span>
      <span class="hn"><bdi>${esc(e.n[0] || e.c)}</bdi></span><span class="hv">${esc(e.lv || e.bc || e.c)}</span>
      <span class="hf">${e.s === "cn" ? `<span class="tag sc cn">الصين</span>` : e.b ? `<span class="tag ${br[1]}">${esc(br[0])}</span>` : ""}<span>${esc(ago(e.d))}</span></span></button>`;
  }
  function renderHome() {
    const cnt = k => D.index.filter(e => (e.f || []).includes(k)).length;
    const all = byDate(), fv = freshFavs();
    let h = `<header class="hhead"><i class="orb o1"></i><i class="orb o2"></i>
      <div class="hrow"><div><p class="hi">أحدث الرومات الرسمية</p><h1>Ehap TV</h1></div>
        <button class="circ glass" type="button" data-refresh aria-label="تحديث البيانات الآن" id="refresh">${ICON.sync}</button></div>
      <button class="hsearch" type="button" data-opensearch>${ICON.search}<span>ابحث عن جهازك… مثل POCO F6</span></button>
      <div class="hstats"><div><b class="cu" data-n="${D.index.length}">${num(D.index.length)}</b><span>جهاز</span></div>
        <div><b class="cu" data-n="${totalRoms()}">${num(totalRoms())}</b><span>إصدار</span></div>${liveBadge()}</div></header>`;
    if (fv.length) h += `<h2 class="sec">جديد في مفضلتك <small>${plural(fv.length, P_DEV)}</small></h2><ul class="list">${fv.map(row).join("")}</ul>`;
    h += `<h2 class="sec">وصل حديثاً <small>الأحدث أولاً</small></h2><div class="rail">${all.slice(0, 10).map(card).join("")}</div>`;
    h += `<h2 class="sec">تصفّح حسب العلامة</h2><div class="brands">${FAMILIES.filter(f => f[0] !== "all").map(([k, l]) =>
      `<button class="brand" type="button" data-brand="${k}"><span class="mk ${k}">${MARK[k]}</span><span><b>${l}</b><span>${plural(cnt(k), P_DEV)}</span></span></button>`).join("")}</div>`;
    h += `<h2 class="sec">آخر التحديثات</h2><ul class="list">${all.slice(10, 20).map(row).join("")}</ul>
      <button class="more" type="button" data-opensearch>تصفّح كل الأجهزة</button>
      <p class="foot">روابط التنزيل من خوادم شاومي الرسمية فقط، والتطبيق لا يستضيف أي ملفات، وهو غير تابع لشركة شاومي.</p>`;
    viewEl.innerHTML = h;
  }

  /* ---------- المفضلة ---------- */
  function renderFav() {
    const list = favs().map(c => D.byCode.get(c)).filter(Boolean);
    let h = `<div class="title"><div><h1>المفضلة</h1><p>أجهزتك التي تتابع تحديثاتها</p></div><button class="circ" type="button" data-opensearch aria-label="بحث">${ICON.search}</button></div>`;
    h += list.length ? `<ul class="list">${list.map(row).join("")}</ul><p class="foot">تظهر نقطة برتقالية عند صدور إصدار جديد لأحد أجهزتك المفضلة.</p>`
      : `<div class="empty"><b>لا توجد أجهزة مفضلة بعد</b>اضغط على النجمة بجانب أي جهاز لتتابع تحديثاته من هنا.<br><button class="btn" type="button" data-opensearch>ابحث عن جهازك</button></div>`;
    viewEl.innerHTML = h;
  }

  /* ---------- الإعدادات ---------- */
  function seg(key, cur, opts) {
    return `<div class="seg" role="group">${opts.map(([v, l]) => `<button type="button" data-set="${key}" data-val="${v}" aria-pressed="${cur === v}">${l}</button>`).join("")}</div>`;
  }
  function renderSettings() {
    const s = settings();
    const regions = Object.keys(REGION_AR);
    const synced = S.lastSync ? "قبل لحظات" : "لم تتم بعد";
    viewEl.innerHTML = `<div class="title"><div><h1>الإعدادات</h1><p>خصّص التطبيق كما يناسبك</p></div></div>
      <div class="grp"><h3>المظهر</h3><div class="card">
        <div class="item"><div class="l"><b>السمة</b></div>${seg("theme", s.theme, [["auto", "تلقائي"], ["light", "فاتح"], ["dark", "داكن"]])}</div>
        <div class="item"><div class="l"><b>حجم الخط</b></div>${seg("size", s.size, [["s", "صغير"], ["m", "متوسط"], ["l", "كبير"]])}</div>
      </div></div>
      <div class="grp"><h3>التصفّح</h3><div class="card">
        <div class="item"><div class="l"><b>المنطقة المفضّلة</b><span>تُفتح هذه المنطقة أولاً عند دخول أي جهاز إن كانت متوفرة له</span></div>
          <select data-setsel="region" aria-label="المنطقة المفضّلة">${regions.map(r => `<option value="${esc(r)}"${s.region === r ? " selected" : ""}>${esc(REGION_AR[r])}</option>`).join("")}</select></div>
        <div class="item"><div class="l"><b>التنبيه بالإصدارات الجديدة</b><span>إشعار داخل التطبيق عند صدور إصدار لأحد أجهزتك المفضلة</span></div>
          <button class="sw" type="button" role="switch" data-toggle="notify" aria-checked="${s.notify}" aria-label="التنبيه بالإصدارات الجديدة"></button></div>
      </div></div>
      <div class="grp"><h3>البيانات</h3><div class="card">
        <div class="item"><div class="l"><b>المحتوى</b></div><div class="r">${plural(D.index.length, P_DEV)}<br>${plural(totalRoms(), P_REL)}</div></div>
        <div class="item"><div class="l"><b>آخر مزامنة</b><span>يتحقق التطبيق تلقائياً كل 10 دقائق أثناء فتحه، وعند العودة إليه</span></div><div class="r">${esc(synced)}</div></div>
        <button class="item act" type="button" data-refresh><span>مزامنة الآن</span></button>
      </div></div>
      <div class="grp"><h3>الخصوصية</h3><div class="card">
        <button class="item act" type="button" data-clear="recent"><span>مسح سجل التصفّح الأخير</span></button>
        <button class="item act danger" type="button" data-clear="favs"><span>حذف كل المفضلة</span></button>
      </div></div>
      <div class="about">Ehap TV — الإصدار ${esc(C.appVersion)}<br>روابط التنزيل من خوادم شاومي الرسمية فقط. التطبيق لا يجمع أي بيانات عنك، وغير تابع لشركة شاومي.</div>`;
  }

  /* ---------- البحث ---------- */
  function renderChips() {
    chipsEl.innerHTML = FAMILIES.map(([k, l]) => `<button class="chip" type="button" data-fam="${k}" aria-pressed="${S.family === k}">${l}</button>`).join("");
  }
  function renderSearch() {
    const searching = S.q.trim() !== "" || S.family !== "all";
    let h = "";
    if (!searching) {
      const rc = recents().map(c => D.byCode.get(c)).filter(Boolean);
      h += `<p class="hint">اكتب اسم جهازك مثل «ريدمي نوت 13» أو «POCO F6»، أو رمزه الداخلي مثل <span class="code">aurora</span>.</p>`;
      if (rc.length) h += `<h2 class="sec">آخر ما تصفّحته</h2><ul class="list">${rc.map(row).join("")}</ul>`;
      h += `<h2 class="sec">أحدث الإصدارات</h2><ul class="list">${byDate().slice(0, 8).map(row).join("")}</ul>`;
    } else {
      const list = X.search(S.q, S.family);
      h += `<h2 class="sec">النتائج <small>${plural(list.length, P_DEV)}</small></h2>`;
      if (!list.length) h += `<div class="empty"><b>لا توجد أجهزة مطابقة</b>جرّب اسماً أقصر، أو اكتب الرمز الداخلي للجهاز.</div>`;
      else {
        h += `<ul class="list">${list.slice(0, S.shown).map(row).join("")}</ul>`;
        if (list.length > S.shown) h += `<button class="more" type="button" data-more>عرض المزيد (${num(list.length - S.shown)} متبقياً)</button>`;
      }
    }
    sres.innerHTML = h;
  }
  function openSearchUI() {
    renderChips(); renderSearch();
    sov.hidden = false; dockEl.hidden = true; setTab("search");
    qEl.value = S.q; clearEl.hidden = !S.q;
    try { qEl.focus(); } catch (e) { /* لا شيء */ }
  }
  function closeSearchUI() { sov.hidden = true; dockEl.hidden = false; qEl.blur(); setTab(S.tab === "dev" ? (S.lastTab || "home") : S.tab); }

  /* ---------- صفحة الجهاز ---------- */
  const cleanName = (n, rg) => n.endsWith(" " + rg) ? n.slice(0, -rg.length - 1) : n;
  function slot(kind, r) {
    const rec = kind === "R";
    const title = rec ? "حزمة الاسترداد" : "حزمة الفلاش";
    if (!r) return `<div class="slot empty-slot"><h4>${title}</h4><span>غير متوفرة لهذا الإصدار</span></div>`;
    if (r.pd && !r.u) return `<div class="slot"><h4>${title}</h4><span class="en">${rec ? "Recovery" : "Fastboot"}</span><span class="sz">${r.sz ? `الحجم: <bdi>${esc(r.sz)}</bdi>` : "الحجم غير معروف"}</span><span class="dl off">بانتظار الرابط الرسمي</span></div>`;
    const link = r.u ? `<a class="dl" href="${esc(r.u)}" target="_blank" rel="noopener noreferrer">${ICON.dl}<span>تنزيل</span></a>` : `<span class="dl off">الرابط غير موثوق</span>`;
    const md5 = r.md5 ? `<button class="cp" type="button" data-md5="${esc(r.md5)}">${ICON.cp}<span>نسخ بصمة MD5</span></button>` : "";
    return `<div class="slot"><h4>${title}</h4><span class="en">${rec ? "Recovery" : "Fastboot"}</span><span class="sz">${r.sz ? `الحجم: <bdi>${esc(r.sz)}</bdi>` : "الحجم غير معروف"}</span>${link}${md5}</div>`;
  }
  function relCard(g, i) {
    const [label, tone] = BRANCH[g.br] || [g.br, ""];
    return `<article class="rel" id="r${i}">
      <div class="head"><div class="ver"><bdi>${esc(g.v)}</bdi></div><span class="tag ${tone}">${esc(label)}</span></div>
      <p class="when"><span>${esc(dateAr(g.d))}</span>${g.d ? `<span>${esc(ago(g.d))}</span>` : ""}${g.an ? `<span>أندرويد <bdi>${esc(g.an)}</bdi></span>` : ""}</p>
      <div class="slots">${slot("R", g.recovery)}${slot("F", g.fastboot)}</div>
      ${g.cl ? `<details class="cl"><summary>${ICON.text}<span>ملاحظات الإصدار (بالإنجليزية)</span></summary><pre>${esc(g.cl)}</pre></details>` : ""}
    </article>`;
  }
  function hbtn(r, ar, en, alt) {
    if (!r || !r.u) return `<span class="hb ${alt ? "alt " : ""}off"><span class="t">${ICON.dl}${ar}</span><small>${en} · ${r && r.pd ? "بانتظار الرابط الرسمي" : "غير متوفرة"}</small></span>`;
    return `<a class="hb ${alt ? "alt" : ""}" href="${esc(r.u)}" target="_blank" rel="noopener noreferrer"><span class="t">${ICON.dl}${ar}</span><small>${en}${r.sz ? " · " + esc(r.sz) : ""}</small></a>`;
  }
  function renderDevice() {
    const dev = S.dev; if (!dev) return;
    const regs = X.regionsWithRoms(dev);
    const name = dev.names[0] || dev.codename;
    const isFav = favs().includes(dev.codename);
    const all = regs.length ? X.groupReleases(dev, S.region) : [];
    const shown = all.map((g, i) => [g, i]).filter(([g]) => S.branch === "all" || (S.branch === "stable" ? g.br === "Stable" : g.br !== "Stable"));
    const iStable = all.findIndex(g => g.br === "Stable"), iBeta = all.findIndex(g => g.br !== "Stable");
    const reg = regs.find(x => x.id === S.region);
    const aka = dev.names.slice(1, 4).map(n => `<bdi>${esc(n)}</bdi>`).join("، ");

    let h = `<div class="dbar"><button class="circ back" type="button" data-back aria-label="رجوع">${ICON.back}</button>
      <button class="circ fav" type="button" data-fav="${esc(dev.codename)}" aria-pressed="${isFav}" aria-label="${isFav ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}">${ICON.star}</button></div>`;
    const hi = iStable >= 0 ? iStable : iBeta;
    const hg = hi >= 0 ? all[hi] : null;
    h += `<section class="hero"><h2 class="dn"><bdi>${esc(name)}</bdi></h2>${aka ? `<p class="aka">ويُعرف أيضاً: ${aka}</p>` : ""}`;
    if (hg) {
      const [bl, bt] = BRANCH[hg.br] || [hg.br, ""];
      h += `<div class="hk"><span>${iStable >= 0 ? "أحدث إصدار مستقر" : "أحدث إصدار متاح"}</span><span class="tag ${bt}">${esc(bl)}</span></div>
        <p class="hv"><bdi>${esc(hg.v)}</bdi></p>
        <p class="hm"><span>${esc(dateAr(hg.d))}</span>${hg.d ? `<span>${esc(ago(hg.d))}</span>` : ""}${hg.an ? `<span>أندرويد <bdi>${esc(hg.an)}</bdi></span>` : ""}</p>
        <div class="hbtns">${hbtn(hg.recovery, "الاسترداد", "Recovery", false)}${hbtn(hg.fastboot, "الفلاش", "Fastboot", true)}</div>`;
    } else h += `<p class="hm">لا توجد إصدارات مسجّلة بعد.</p>`;
    h += `</section><p class="hmeta"><span class="code">${esc(dev.base || dev.codename)}</span>${dev.scope ? `<span class="tag sc ${esc(dev.scope)}">${SCOPE[dev.scope]}</span>` : ""}<span>${plural(regs.length, P_REGION)}</span><span>${plural(dev.roms.length, P_REL)}</span></p>`;
    if (dev._stale) h += `<p class="note">تعذّر جلب أحدث بيانات هذا الجهاز. قد لا تتضمن القائمة آخر الإصدارات، وستُعاد المحاولة تلقائياً.</p>`;

    if (!regs.length) {
      h += `<div class="empty"><b>لا توجد إصدارات مسجّلة</b>لم تنشر شاومي أي رومات رسمية لهذا الجهاز حتى الآن.</div>`;
    } else {
      h += `<div class="tabs" role="tablist" aria-label="المنطقة">${regs.map(r => `<button class="tab" type="button" role="tab" data-region="${esc(r.id)}" aria-selected="${r.id === S.region}">${esc(REGION_AR[r.id] || r.id)}</button>`).join("")}</div>`;
      if (reg && reg.name) h += `<p class="regname">الاسم التجاري في هذه المنطقة: <bdi>${esc(cleanName(reg.name, reg.id))}</bdi></p>`;
      if (iStable >= 0 && iBeta >= 0) {
        const b = all[iBeta];
        h += `<button class="beta" type="button" data-jump="${iBeta}"><span class="main"><span class="k">أحدث إصدار تجريبي · ${esc(dateAr(b.d))}</span><br><span class="v">${esc(b.v)}</span></span>${ICON.go}</button>`;
      }
      h += `<details class="help"><summary>${ICON.info}<span>ما الفرق بين الحزمتين وأنواع الإصدارات؟</span></summary><div class="body">
          <p><b>حزمة الاسترداد (Recovery):</b> ملف ZIP للتحديث على الجهاز نفسه، يُثبَّت من «التحديث المحلي» في إعدادات النظام أو من وضع الاسترداد.</p>
          <p><b>حزمة الفلاش (Fastboot):</b> حزمة كاملة تُثبَّت من الحاسوب بأداة Mi Flash، وتتطلب محمّل إقلاع (Bootloader) مفتوحاً، وقد تمسح بيانات الجهاز.</p>
          <p><b>مستقر:</b> إصدار عام. <b>مستقر تجريبي (Stable Beta):</b> نسخة تجريبية من الإصدار المستقر تُجرَّب قبل طرحه للجميع، وقد تحتوي أخطاء بسيطة. <b>أسبوعي وتجريبي عام:</b> للمطوّرين والتجربة وقد تظهر فيهما أخطاء.</p>
          <p>تأكد أن الرمز <span class="code">${esc(dev.base || dev.codename)}</span> يطابق جهازك، وخذ نسخة احتياطية قبل أي تثبيت.</p></div></details>`;
      h += `<div class="filters"><h3>سجل الإصدارات</h3><div class="seg" role="group" aria-label="نوع الإصدار">
          ${[["all", "الكل"], ["stable", "مستقر"], ["beta", "تجريبي"]].map(([k, l]) => `<button type="button" data-branch="${k}" aria-pressed="${S.branch === k}">${l}</button>`).join("")}</div></div>`;
      h += shown.length ? shown.slice(0, S.relShown).map(([g, i]) => relCard(g, i)).join("")
        : `<div class="empty"><b>لا توجد إصدارات بهذا الفلتر</b>اختر «الكل» لعرض كل الإصدارات في هذه المنطقة.</div>`;
      if (shown.length > S.relShown) h += `<button class="more" type="button" data-relmore>عرض إصدارات أقدم (${num(shown.length - S.relShown)} متبقياً)</button>`;
    }
    const oldTabs = viewEl.querySelector(".tabs"), keep = oldTabs ? oldTabs.scrollLeft : null;
    viewEl.innerHTML = h;
    const tb = viewEl.querySelector(".tabs"), act = tb && tb.querySelector('[aria-selected="true"]');
    if (tb && act) {
      if (keep !== null) tb.scrollLeft = keep;
      const target = act.offsetLeft - (tb.clientWidth - act.offsetWidth) / 2;
      try { tb.scrollTo({ left: target, behavior: keep !== null && !reduce ? "smooth" : "auto" }); } catch (e) { tb.scrollLeft = target; }
    }
  }

  async function openDevice(code, region) {
    S.code = code; S.dev = null; S.tab = "dev";
    viewEl.innerHTML = '<div class="dbar"><button class="circ back" type="button" data-back aria-label="رجوع">' + ICON.back + '</button></div>';
    window.scrollTo(0, 0); setTab("");
    /* لا نعرض الهياكل الرمادية إلا إذا تأخّر التحميل، فلا يومض شيء عند الدخول السريع */
    const skelT = setTimeout(() => { if (S.code === code && !S.dev) viewEl.insertAdjacentHTML("beforeend", '<div class="skel s1"></div><div class="skel s2"></div><div class="skel s3"></div>'); }, 160);
    try {
      const dev = await X.getDevice(code);
      clearTimeout(skelT);
      if (S.code !== code) return;
      S.dev = dev;
      const regs = X.regionsWithRoms(dev), pref = settings().region;
      const want = regs.find(r => r.id === region) || regs.find(r => r.id === pref) || regs.find(r => r.id === "Global") || regs[0];
      S.region = want ? want.id : null; S.branch = "all"; S.relShown = 20;
      markSeen(code); pushRecent(code); updateBadge();
      renderDevice(); enter("dev");
    } catch (err) {
      viewEl.innerHTML = `<div class="dbar"><button class="circ back" type="button" data-back aria-label="رجوع">${ICON.back}</button></div>
        <div class="state"><b>تعذّر تحميل بيانات هذا الجهاز</b><br>تحقق من الاتصال ثم أعد المحاولة.<br><button type="button" data-retry="${esc(code)}">إعادة المحاولة</button></div>`;
    }
  }

  /* ---------- التوجيه ---------- */
  const VIEWS = ["home", "fav", "set"], N = VIEWS.length, HASH = { home: "#/", fav: "#/fav", set: "#/set" };
  const navIn = dockEl.querySelector(".nav-in"), pill = dockEl.querySelector(".pill");
  let curView = "home";
  const isRtl = () => document.documentElement.dir === "rtl";
  function snapPct(v) { const i = Math.max(0, VIEWS.indexOf(v)); pill.style.transform = "translate3d(" + ((isRtl() ? -1 : 1) * i * 100) + "%,0,0)"; }
  function setTab(t) {
    dockEl.querySelectorAll("button[data-tab]").forEach(a => { if (a.dataset.tab === t) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    if (VIEWS.indexOf(t) >= 0) {
      const changed = t !== curView; curView = t; snapPct(t);
      if (changed) { const b = dockEl.querySelector('button[data-tab="' + t + '"]'); if (b) { b.classList.remove("nav-pop"); void b.offsetWidth; b.classList.add("nav-pop"); } }
    }
  }
  function goView(v) { if (v === "search") go("#/s"); else navTab(HASH[v] || "#/"); }
  let enterT;
  function enter(kind) {
    viewEl.classList.remove("enter", "dev"); void viewEl.offsetWidth;
    viewEl.classList.add("enter"); if (kind) viewEl.classList.add(kind);
    clearTimeout(enterT); enterT = setTimeout(() => viewEl.classList.remove("enter", "dev"), 1400);
  }
  function countUp(root) {
    root.querySelectorAll(".cu").forEach(el => {
      const n = +el.dataset.n; if (reduce || !n) return;
      const t0 = performance.now(), d = 1000;
      (function step(t) { const k = Math.min(1, (t - t0) / d), e = 1 - Math.pow(1 - k, 3); el.textContent = num(Math.round(n * e)); if (k < 1) requestAnimationFrame(step); })(t0);
    });
  }
  function showTab(t) {
    S.tab = t; S.lastTab = t; S.dev = null; S.code = null; setTab(t);
    if (t === "fav") renderFav(); else if (t === "set") renderSettings(); else { renderHome(); if (!S.counted) { S.counted = true; countUp(viewEl); } }
    window.scrollTo(0, S.y[t] || 0); enter();
  }
  function route(h) {
    h = h || "#/";
    const m = /^#\/d\/([^/]+)(?:\/(.+))?$/.exec(h);
    if (m) {
      closeSearchUI();
      const code = decodeURIComponent(m[1]);
      if (S.tab === "dev" && S.code === code && S.dev) return;
      if (S.tab !== "dev") S.y[S.tab] = window.scrollY;
      openDevice(code, m[2] ? decodeURIComponent(m[2]) : null);
      return;
    }
    if (h === "#/s") {
      if (!S.ready || !viewEl.firstElementChild) showTab(S.tab === "dev" ? "home" : S.tab);
      openSearchUI(); return;
    }
    closeSearchUI();
    showTab(h === "#/fav" ? "fav" : h === "#/set" ? "set" : "home");
  }
  /* التنقّل لا يعتمد على تغيّر الرابط (قد تمنعه بعض البيئات)، بل على مكدّس داخلي */
  function setHash(h, replace) { try { if (replace) history.replaceState(null, "", h); else history.pushState(null, "", h); } catch (e) { /* مسموح */ } }
  function go(h) { S.stack.push(h); S.pushed = true; setHash(h, false); route(h); }
  function navTab(h) { S.stack = [h]; S.pushed = false; setHash(h, true); route(h); }
  function back() {
    if (S.stack.length > 1) { S.stack.pop(); route(S.stack[S.stack.length - 1]); try { history.back(); } catch (e) { /* مسموح */ } }
    else navTab("#/");
  }
  window.addEventListener("popstate", () => {
    const h = location.hash || "#/";
    if (S.stack.length > 1 && S.stack[S.stack.length - 2] === h) { S.stack.pop(); route(h); }
    else if (S.stack.length > 1 && S.stack[S.stack.length - 1] !== h && /^#\//.test(h)) { S.stack = [h]; route(h); }
  });

  /* زر/إيماءة الرجوع في أندرويد: يرجع خطوة داخل التطبيق ولا يخرج إلا من الرئيسية */
  window.__ehapBack = function () {
    if (!sov.hidden || S.stack.length > 1) { back(); return true; }
    if (S.tab !== "home") { navTab("#/"); return true; }
    return false;
  };

  /* ---------- الأحداث ---------- */
  let qT;
  qEl.addEventListener("input", () => {
    clearTimeout(qT);
    qT = setTimeout(() => { S.q = qEl.value; S.shown = 40; clearEl.hidden = !S.q; renderSearch(); sres.scrollTop = 0; }, 60);
  });
  clearEl.addEventListener("click", () => { qEl.value = ""; S.q = ""; clearEl.hidden = true; S.shown = 40; renderSearch(); qEl.focus(); });

  function copy(text) {
    const done = () => toast("تم نسخ بصمة MD5");
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done, fallback); } else fallback();
    function fallback() {
      const t = document.createElement("textarea"); t.value = text; t.setAttribute("readonly", ""); t.className = "sr"; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast("تعذّر النسخ"); } t.remove();
    }
  }
  function rerender() {
    if (S.tab === "dev") renderDevice(); else if (S.tab === "fav") renderFav(); else if (S.tab === "set") renderSettings(); else renderHome();
    if (!sov.hidden) renderSearch();
  }
  document.addEventListener("click", ev => {
    const t = ev.target.closest("[data-fav],[data-open],[data-fam],[data-more],[data-region],[data-branch],[data-jump],[data-md5],[data-back],[data-retry],[data-refresh],[data-reload],[data-relmore],[data-brand],[data-opensearch],[data-closesearch],[data-set],[data-toggle],[data-clear],[data-nav]");
    if (!t) return;
    const d = t.dataset;
    if (d.nav) { if (d.nav === "#/s") go("#/s"); else navTab(d.nav); return; }
    if (d.fav) { ev.stopPropagation(); toggleFav(d.fav); rerender(); const nb = document.querySelector('[data-fav="' + d.fav + '"]'); if (nb && !reduce) { nb.classList.add("pop"); setTimeout(() => nb.classList.remove("pop"), 600); } return; }
    if (d.open) { go("#/d/" + encodeURIComponent(d.open)); return; }
    if (d.opensearch !== undefined) { go("#/s"); return; }
    if (d.brand) { S.family = d.brand; S.q = ""; S.shown = 40; go("#/s"); return; }
    if (d.closesearch !== undefined) { back(); return; }
    if (d.fam) { S.family = d.fam; S.shown = 40; renderChips(); renderSearch(); return; }
    if (d.relmore !== undefined) { S.relShown += 20; renderDevice(); return; }
    if (d.more !== undefined) { S.shown += 40; renderSearch(); return; }
    if (d.region) {
      S.region = d.region; S.branch = "all"; S.relShown = 20;
      const nh = "#/d/" + encodeURIComponent(S.code) + "/" + encodeURIComponent(S.region); S.stack[S.stack.length - 1] = nh; setHash(nh, true);
      const y = window.scrollY; renderDevice(); window.scrollTo(0, y); return;
    }
    if (d.branch) { S.branch = d.branch; S.relShown = 20; renderDevice(); return; }
    if (d.jump !== undefined) {
      S.branch = "all"; S.relShown = Math.max(S.relShown, +d.jump + 1); renderDevice();
      const el = document.getElementById("r" + d.jump); if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); return;
    }
    if (d.md5) { copy(d.md5); return; }
    if (d.back !== undefined) { back(); return; }
    if (d.retry) { openDevice(d.retry, null); return; }
    if (d.refresh !== undefined) { sync(true); return; }
    if (d.reload !== undefined) { location.reload(); return; }
    if (d.set) { setSetting(d.set, d.val); renderSettings(); return; }
    if (d.toggle) { const s = settings(); setSetting(d.toggle, !s[d.toggle]); renderSettings(); return; }
    if (d.clear === "recent") { X.store.set("recent", []); toast("تم مسح السجل"); return; }
    if (d.clear === "favs") {
      let ok = true; try { ok = window.confirm("حذف كل الأجهزة من المفضلة؟"); } catch (e) { ok = true; }
      if (ok) { X.store.set("favs", []); updateBadge(); renderSettings(); toast("تم حذف المفضلة"); } return;
    }
  });
  document.addEventListener("change", ev => {
    const t = ev.target; if (t && t.dataset && t.dataset.setsel) { setSetting(t.dataset.setsel, t.value); toast("تم الحفظ"); }
  });
  document.addEventListener("keydown", ev => {
    if (ev.key === "Enter" && ev.target.matches && ev.target.matches(".row")) ev.target.click();
    if (ev.key === "Escape" && !sov.hidden) back();
  });

  /* ---------- المزامنة ---------- */
  async function sync(manual) {
    if (S.busy) return; S.busy = true;
    const btn = $("#refresh"); if (btn) btn.disabled = true;
    const r = await X.refreshRemote();
    S.sync = r; S.busy = false; if (r !== "offline") S.lastSync = Date.now();
    const b2 = $("#refresh"); if (b2) b2.disabled = false;
    if (r === "updated") {
      const fresh = freshFavs().filter(e => S.notified[e.c] !== stamp(e));
      if (fresh.length && settings().notify) {
        fresh.forEach(e => { S.notified[e.c] = stamp(e); });
        toast("إصدار جديد: " + fresh.slice(0, 2).map(e => e.n[0] || e.c).join("، ") + (fresh.length > 2 ? " وغيرها" : ""));
      } else if (manual) toast("تم تحديث قائمة الإصدارات");
      if (S.tab === "dev" && S.code) { try { S.dev = await X.getDevice(S.code); renderDevice(); } catch (e) { /* يبقى المعروض */ } } else rerender();
    } else {
      if (manual) toast(r === "same" ? "البيانات محدّثة" : r === "rejected" ? "تعذّر التحقق من البيانات الجديدة" : "لا يوجد اتصال بالإنترنت");
      if (S.tab === "home" || S.tab === "set") rerender();
    }
    updateBadge();
  }

  /* الشريط السفلي: الضغط المطوّل أو السحب يكبّر العدسة وتتبع إصبعك، والرفع يفتح التبويب. النقرة السريعة تفتحه مباشرة. */
  (function () {
    const nav = navIn, btns = Array.from(dockEl.querySelectorAll("button[data-view]")), de = document.documentElement;
    let down = false, on = false, pid = null, sx = 0, last = -1, hold = 0, blockT = 0;
    let px = 0, pv = 0, tgt = 0, raf = 0, tprev = 0, settling = false, G = null;
    let bx = 0, bsx = 1, bsy = 1, tbx = 0, tbsx = 1, tbsy = 1;
    const geo = () => { const r = nav.getBoundingClientRect(), w = nav.offsetWidth; return { l: (r.left + r.right) / 2 - bx - w / 2, w: w, slot: (w - 10) / N }; };
    const base = g => isRtl() ? (g.w - 10 - g.slot) : 0;
    const idxAt = (x, g) => { const k = Math.max(0, Math.min(N - 1, Math.floor((x - g.l - 5) / g.slot))); return isRtl() ? N - 1 - k : k; };
    const fingerTx = (x, g) => Math.max(0, Math.min((N - 1) * g.slot, x - g.l - 5 - g.slot / 2)) - base(g);
    const viewTx = (v, g) => { const vi = Math.max(0, VIEWS.indexOf(v)); return (isRtl() ? N - 1 - vi : vi) * g.slot - base(g); };
    const lens = i => btns.forEach((b, j) => b.classList.toggle("lens", j === i));
    function frame(t) {
      const dt = Math.min(.034, (t - tprev) / 1000 || .016); tprev = t;
      pv += (380 * (tgt - px) - 27 * pv) * dt; px += pv * dt;
      const sp = Math.abs(pv), st = Math.min(.12, sp / 3600);
      pill.style.transform = "translate3d(" + px.toFixed(2) + "px,0,0) scale(" + (1 + st).toFixed(3) + "," + (1 - st * .5).toFixed(3) + ")";
      if (on) {
        const lean = G ? Math.max(-1, Math.min(1, ((G.l + G.w / 2) - (G.l + 5 + G.slot / 2 + (px + base(G)))) / (G.w / 2))) * -1 : 0;
        tbx = lean * 7; tbsx = 1.025 + st * .3; tbsy = 1.05 - st * .2;
      } else { tbx = 0; tbsx = 1; tbsy = 1; }
      const f = Math.min(1, dt * 14); bx += (tbx - bx) * f; bsx += (tbsx - bsx) * f; bsy += (tbsy - bsy) * f;
      nav.style.transform = "translate3d(" + bx.toFixed(2) + "px,0,0) scale(" + bsx.toFixed(4) + "," + bsy.toFixed(4) + ")";
      if (settling && !on && Math.abs(tgt - px) < .35 && sp < 6 && Math.abs(bx) < .15 && Math.abs(bsx - 1) < .002 && Math.abs(bsy - 1) < .002) {
        settling = false; raf = 0; pill.classList.remove("drag"); nav.style.transform = ""; bx = 0; bsx = 1; bsy = 1; snapPct(curView); return;
      }
      raf = requestAnimationFrame(frame);
    }
    const run = () => { if (!raf) { tprev = performance.now(); raf = requestAnimationFrame(frame); } };
    function activate(x) {
      if (on || !down) return; on = true; clearTimeout(hold); settling = false;
      try { nav.setPointerCapture(pid); } catch (e) { /* مسموح */ }
      G = geo();
      if (!raf) { const m = /translate3d\(([-\d.]+)px/.exec(pill.style.transform); px = m ? parseFloat(m[1]) : viewTx(curView, G); pv = 0; }
      nav.classList.add("hold"); pill.classList.add("drag"); tgt = fingerTx(x, G); last = idxAt(x, G); lens(last); run();
    }
    nav.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse" && e.button > 0) return;
      down = true; on = false; pid = e.pointerId; sx = e.clientX; clearTimeout(hold); hold = setTimeout(() => activate(sx), 140);
    });
    nav.addEventListener("pointermove", e => {
      if (!down || e.pointerId !== pid) return;
      if (!on) { if (Math.abs(e.clientX - sx) > 8) activate(e.clientX); return; }
      tgt = fingerTx(e.clientX, G); const i = idxAt(e.clientX, G); if (i !== last) { last = i; lens(i); }
    });
    function end(e, cancel) {
      if (!down || e.pointerId !== pid) return; down = false; clearTimeout(hold);
      if (!on) return; on = false;
      try { nav.releasePointerCapture(pid); } catch (x) { /* مسموح */ }
      nav.classList.remove("hold"); lens(-1);
      const v = (!cancel && last >= 0) ? VIEWS[last] : curView;
      if (!cancel && last >= 0) blockT = Date.now();
      if (v !== curView) goView(v);
      tgt = viewTx(curView, G); settling = true; run();
    }
    nav.addEventListener("pointerup", e => end(e, false));
    nav.addEventListener("pointercancel", e => end(e, true));
    nav.addEventListener("contextmenu", e => e.preventDefault());
    nav.addEventListener("click", e => { if (e.detail > 0 && Date.now() - blockT < 350) { e.stopPropagation(); e.preventDefault(); } }, true);
  })();

  /* ---------- التشغيل ---------- */
  function hideSplash() {
    const sp = $("#splash"); if (!sp) return;
    setTimeout(() => { sp.classList.add("out"); setTimeout(() => sp.remove(), 600); }, Math.max(0, (reduce ? 500 : 1700) - performance.now()));
  }
  async function boot() {
    hideSplash(); applySettings(); icons();
    try { await X.loadBundled(); }
    catch (e) {
      viewEl.innerHTML = `<div class="state"><b>تعذّر تحميل بيانات التطبيق</b><br>أعد تشغيل التطبيق، وإن استمرت المشكلة فأعد تثبيته.<br><button type="button" data-reload>إعادة المحاولة</button></div>`;
      return;
    }
    S.ready = true; updateBadge();
    S.stack = [location.hash || "#/"]; route(S.stack[0]);
    sync(false);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(false); });
    setInterval(() => { if (!document.hidden) sync(false); }, 10 * 60 * 1000);
  }
  boot();
})();
