/* 관리자 데모 — 공통: 저장소 · 날짜 · 이스케이프 · 아이콘 · 화면 틀(라우터) · 서랍·대화상자 · 알림 · 진료시간 계산 · 금칙어 검사
   프레임워크 없이 해시 라우팅(#/leads, #/clinics/…). 모든 데이터 글자는 AA.esc 로 이스케이프한다.
   저장: localStorage 'apple_admin_*'(관리자 데모 전용) — 상담 신청 원본은 사이트 폼이 쓰는 'apple_demo_leads'. */
(function () {
  'use strict';
  var w = window;
  var d = document;
  var AA = w.AA = w.AA || {};
  AA.views = AA.views || {};
  AA.actions = AA.actions || {};
  AA.badges = AA.badges || {};

  // ── 이스케이프·숫자 ───────────────────────────────────────────────────────────
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  AA.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };
  var esc = AA.esc;
  AA.num = function (n) { return (Number(n) || 0).toLocaleString('ko-KR'); };
  AA.pct = function (a, b, digits) {
    if (!b) return '0%';
    var v = (a / b) * 100;
    return (digits == null ? (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10) : v.toFixed(digits)) + '%';
  };
  AA.sum = function (arr, f) { var s = 0; (arr || []).forEach(function (x, i) { s += f ? (Number(f(x, i)) || 0) : (Number(x) || 0); }); return s; };
  AA.uid = function (p) { return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  AA.clone = function (o) { return o == null ? o : JSON.parse(JSON.stringify(o)); };
  AA.textLen = function (s) { return String(s || '').replace(/\s+/g, ' ').trim().length; };
  /** 문장 수(마침표·물음표·느낌표로 끝나는 덩어리) */
  AA.sentences = function (s) { return String(s || '').split(/[.?!。]+(?:\s+|$)/).filter(function (x) { return x.trim().length > 1; }).length; };

  // ── 저장소 ──────────────────────────────────────────────────────────────────
  AA.KEYS = {
    leads: 'apple_admin_leads', online: 'apple_admin_online', doctors: 'apple_admin_doctors', clinics: 'apple_admin_clinics',
    answers: 'apple_admin_answers', columns: 'apple_admin_columns', news: 'apple_admin_news', pricing: 'apple_admin_pricing',
    hours: 'apple_admin_hours', notice: 'apple_admin_notice', main: 'apple_admin_main', reviews: 'apple_admin_reviews',
    hospital: 'apple_admin_hospital', checks: 'apple_admin_checks', audit: 'apple_admin_audit', ui: 'apple_admin_ui',
  };
  AA.store = {
    get: function (k, def) {
      try { var v = w.localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
    },
    set: function (k, v) {
      try { w.localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { AA.toast('이 브라우저는 저장소를 쓸 수 없어 저장하지 못했습니다'); return false; }
    },
    del: function (k) { try { w.localStorage.removeItem(k); } catch (e) { /* 무시 */ } },
    adminKeys: function () {
      var out = [];
      try { for (var i = 0; i < w.localStorage.length; i++) { var k = w.localStorage.key(i); if (k && k.indexOf('apple_admin_') === 0) out.push(k); } } catch (e) { /* 무시 */ }
      return out;
    },
  };
  AA.session = {
    KEY: 'apple_admin_session',
    on: function () { try { return w.sessionStorage.getItem(this.KEY) === '1'; } catch (e) { return !!AA._sessionMem; } },
    set: function (v) {
      AA._sessionMem = v;
      try { if (v) w.sessionStorage.setItem(this.KEY, '1'); else w.sessionStorage.removeItem(this.KEY); } catch (e) { /* 메모리로만 */ }
    },
  };
  /** 개인정보 열람 같은 기록(이 브라우저) */
  AA.audit = function (what, target) {
    var list = AA.store.get(AA.KEYS.audit, []);
    if (!Array.isArray(list)) list = [];
    list.push({ at: new Date().toISOString(), what: what, target: target || '', by: '데모 관리자' });
    AA.store.set(AA.KEYS.audit, list.slice(-300));
  };

  // ── 날짜(한국 시간) ──────────────────────────────────────────────────────────
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  AA.DOW = DOW;
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  AA.pad = pad;
  /** 시각 → 한국 시간 조각 */
  AA.kst = function (t) {
    var ms = t == null ? Date.now() : typeof t === 'number' ? t : Date.parse(t);
    var x = new Date(ms + 9 * 3600000);
    return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate(), day: x.getUTCDay(), hh: x.getUTCHours(), mm: x.getUTCMinutes(),
      min: x.getUTCHours() * 60 + x.getUTCMinutes(), ymd: x.getUTCFullYear() + '-' + pad(x.getUTCMonth() + 1) + '-' + pad(x.getUTCDate()) };
  };
  AA.ymdOf = function (t) { return /^\d{4}-\d{2}-\d{2}$/.test(String(t)) ? String(t) : AA.kst(t).ymd; };
  AA.addDays = function (ymd, n) { var t = Date.parse(ymd + 'T00:00:00Z') + n * 86400000; return new Date(t).toISOString().slice(0, 10); };
  AA.daysBetween = function (a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); };
  AA.dowOf = function (ymd) { return new Date(ymd + 'T00:00:00Z').getUTCDay(); };
  AA.REF = AA.kst().ymd; // 기준일(예시 데이터를 오늘에 맞춘 뒤 정해짐)
  /** 기준일 포함 최근 n일 안인가(기준일보다 뒤인 실제 신청도 포함) */
  AA.inLast = function (t, n) { return AA.ymdOf(t) >= AA.addDays(AA.REF, -(n - 1)); };
  AA.inPrev = function (t, n) { var y = AA.ymdOf(t); return y >= AA.addDays(AA.REF, -(2 * n - 1)) && y <= AA.addDays(AA.REF, -n); };
  AA.fmt = {
    md: function (t) { var k = AA.kst(t); return k.m + '월 ' + k.d + '일'; },
    date: function (t) { var y = AA.ymdOf(t); var p = y.split('-'); return (+p[1]) + '월 ' + (+p[2]) + '일(' + DOW[AA.dowOf(y)] + ')'; },
    dot: function (t) { var y = AA.ymdOf(t); return y.replace(/-/g, '.'); },
    short: function (t) { var y = AA.ymdOf(t); var p = y.split('-'); return (+p[1]) + '.' + (+p[2]); },
    dt: function (t) { var k = AA.kst(t); return k.m + '.' + k.d + '(' + DOW[k.day] + ') ' + pad(k.hh) + ':' + pad(k.mm); },
    full: function (t) { var k = AA.kst(t); return k.y + '년 ' + k.m + '월 ' + k.d + '일 ' + DOW[k.day] + '요일'; },
    time: function (t) { var k = AA.kst(t); return pad(k.hh) + ':' + pad(k.mm); },
    rel: function (t) {
      var ms = Date.now() - Date.parse(t);
      if (ms < 0) return AA.fmt.dt(t);
      var m = Math.floor(ms / 60000);
      if (m < 1) return '방금 전';
      if (m < 60) return m + '분 전';
      var h = Math.floor(m / 60);
      if (h < 24) return h + '시간 전';
      var dd = AA.daysBetween(AA.ymdOf(t), AA.kst().ymd);
      if (dd <= 1) return '어제';
      if (dd < 7) return dd + '일 전';
      return AA.fmt.md(t);
    },
  };
  /** '20:30' → '오후 8시 30분' · '09:30' → '오전 9:30'(짧게) */
  AA.korTime = function (hm, short) {
    var p = String(hm || '0:0').split(':'); var h = +p[0]; var mi = +p[1] || 0;
    var head = (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12);
    return short ? head + ':' + pad(mi) : head + '시' + (mi ? ' ' + mi + '분' : '');
  };
  AA.toMin = function (hm) { var p = String(hm || '0:0').split(':'); return (+p[0]) * 60 + (+p[1] || 0); };

  // ── 아이콘(선) ───────────────────────────────────────────────────────────────
  var ICONS = {
    check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    arrow: '<path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5"/>',
    back: '<path d="M20 12H5M10.5 6.5 5 12l5.5 5.5"/>',
    chevron: '<path d="m6 9.5 6 6 6-6"/>',
    ext: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5"/>',
    phone: '<path d="M7 3.6h2.9l1.4 4-1.9 1.3a11.2 11.2 0 0 0 5.7 5.7l1.3-1.9 4 1.4v2.9c0 .9-.8 1.6-1.7 1.6A16.2 16.2 0 0 1 5.4 5.3c0-.9.7-1.7 1.6-1.7z"/>',
    edit: '<path d="M15.5 4.5l4 4L9 19H5v-4z"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    up: '<path d="m6 14.5 6-6 6 6"/>',
    down: '<path d="m6 9.5 6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
    warn: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17v.4"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/>',
    undo: '<path d="M9 7 4.5 11.5 9 16"/><path d="M4.5 11.5H15a4.5 4.5 0 0 1 0 9h-2"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11"/><path d="M15.5 8.5V4.5h-11v11h4"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    send: '<path d="M4 12 20 4l-4 16-4.5-6.5z"/><path d="M11.5 13.5 20 4"/>',
  };
  AA.icon = function (name, cls) {
    return '<svg class="ad-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
  };

  // ── 마스킹 ──────────────────────────────────────────────────────────────────
  AA.maskPhone = function (p) {
    var s = String(p || '');
    if (s.indexOf('*') > -1) return s;
    var digits = s.replace(/[^0-9]/g, '');
    if (digits.length < 8) return s ? '****' : '';
    return digits.slice(0, 3) + '-****-' + digits.slice(-4);
  };

  // ── 알림·기록 ───────────────────────────────────────────────────────────────
  var toastTimer = 0;
  AA.toast = function (msg) {
    var el = d.getElementById('ad-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2600);
  };
  AA.say = function (msg) { var el = d.getElementById('ad-live'); if (el) { el.textContent = ''; setTimeout(function () { el.textContent = msg; }, 30); } };

  // ── 화면 조각 ───────────────────────────────────────────────────────────────
  /** 화면 머리. o: { no, eyebrow, title, lead(HTML 아님), leadHtml, actions(HTML), back:{href,label} } */
  AA.head = function (o) {
    return '<header class="ad-head"><div class="ad-head__text">' +
      (o.back ? '<a class="ad-back" href="' + esc(o.back.href) + '">' + esc(o.back.label) + '</a>' : '') +
      (o.eyebrow || o.no ? '<p class="ad-head__eyebrow">' + (o.no ? '<span class="ad-head__no">' + esc(o.no) + '</span>' : '') + (o.eyebrow ? '<span>' + esc(o.eyebrow) + '</span>' : '') + '</p>' : '') +
      '<h1 class="ad-head__title" id="ad-h1">' + esc(o.title) + '</h1>' +
      (o.leadHtml ? '<p class="ad-head__lead">' + o.leadHtml + '</p>' : o.lead ? '<p class="ad-head__lead">' + esc(o.lead) + '</p>' : '') +
      '</div>' + (o.actions ? '<div class="ad-head__actions">' + o.actions + '</div>' : '') + '</header>';
  };
  /** 예시 데이터 안내 띠 */
  AA.exampleNote = function (html) {
    return '<p class="ad-note ad-note--example"><span class="ad-dot ad-dot--blue" aria-hidden="true"></span><span>' + html + '</span></p>';
  };
  AA.gmNote = function () {
    var g = (AA.seed && AA.seed.growthmate) || {};
    return AA.exampleNote('<span class="ad-note__t">예시 데이터</span> — 실제 연결 시 그로스메이트(광고주 ' + esc(g.advertiserId || 34) + '·추적 설치 ' + esc(g.installRowId || 32) + ') 데이터가 이 자리에 들어옵니다. 지금 숫자는 화면 구성을 보여 드리기 위한 예시입니다.');
  };
  AA.localNote = function (extra) {
    return '<p class="ad-note"><span>' + AA.icon('info') + '</span><span>데모에서 저장한 내용은 <b>이 브라우저에만</b> 남고 사이트 페이지에는 반영되지 않습니다' + (extra ? '. ' + extra : '.') + '</span></p>';
  };
  /** 사이트 경로 → 관리자에서 여는 상대 주소(../implant/) */
  AA.siteHref = function (p) { return '..' + (String(p || '/').charAt(0) === '/' ? '' : '/') + String(p || '/'); };
  /** 사이트 경로의 메뉴 이름(질문 답은 앞의 병원 이름을 덜어 짧게) */
  AA.pageLabel = function (p) {
    var L = (AA.seed && AA.seed.pageLabels) || {};
    var s = L[p] || p;
    if (String(p).indexOf('/answers/') === 0 && L[p]) s = '질문 답 · ' + s.replace(/^부천\s*사과나무치과병원(은|의|에서|에)?\s*/, '');
    return s;
  };
  AA.siteLink = function (p, label) {
    return '<a class="ad-ext" href="' + esc(AA.siteHref(p)) + '" target="_blank" rel="noopener">' + esc(label || AA.pageLabel(p)) + '<span class="ad-sr"> (새 창)</span>' + AA.icon('ext', 'ad-ico--sm') + '</a>';
  };
  AA.counter = function (n, min, max) {
    var cls = n > max || (min && n < min) ? ' is-over' : n >= (min || 0) ? ' is-ok' : '';
    return '<span class="ad-counter' + cls + '">' + n + '자' + (max ? ' / ' + (min ? min + '~' : '') + max : '') + '</span>';
  };
  AA.switchHtml = function (o) {
    return '<label class="ad-switch"><input type="checkbox" role="switch"' + (o.id ? ' id="' + esc(o.id) + '"' : '') + (o.name ? ' name="' + esc(o.name) + '"' : '') + (o.checked ? ' checked' : '') + (o.change ? ' data-change="' + esc(o.change) + '"' : '') + (o.data || '') + '><span class="ad-switch__ui" aria-hidden="true"></span><span class="ad-switch__t">' + esc(o.label) + '</span></label>';
  };
  AA.emptyHtml = function (t, s) { return '<div class="ad-empty"><p class="ad-empty__t">' + esc(t) + '</p>' + (s ? '<p>' + esc(s) + '</p>' : '') + '</div>'; };
  AA.download = function (name, text, type) {
    try {
      var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
      var a = d.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      d.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
      return true;
    } catch (e) { AA.toast('이 브라우저에서는 파일을 내려받을 수 없습니다'); return false; }
  };
  /** 같은 이름의 변경 사항(저장소 덮어쓰기)을 합친다 */
  AA.patch = function (key, id, obj) {
    var all = AA.store.get(key, {});
    if (!all || typeof all !== 'object' || Array.isArray(all)) all = {};
    all[id] = Object.assign({}, all[id] || {}, obj, { updatedAt: new Date().toISOString() });
    AA.store.set(key, all);
    return all[id];
  };

  // ── 서랍(상세)·대화상자 ──────────────────────────────────────────────────────────
  var layer = function () { return d.getElementById('ad-layer'); };
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
  function trap(box, e) {
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(box.querySelectorAll(FOCUSABLE), function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    if (e.shiftKey && d.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && d.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
  AA.drawer = {
    el: null,
    last: null,
    onClose: null,
    /** o: { eyebrow, title, html, foot, wide, onClose, focus(selector) } */
    open: function (o) {
      this.close(true);
      var id = 'ad-dr-' + Date.now().toString(36);
      var el = d.createElement('div');
      el.className = 'ad-drawer' + (o.wide ? ' ad-drawer--wide' : '');
      el.innerHTML = '<div class="ad-drawer__panel" role="dialog" aria-modal="true" aria-labelledby="' + id + '">' +
        '<div class="ad-drawer__head"><div>' + (o.eyebrow ? '<p class="ad-drawer__eyebrow">' + esc(o.eyebrow) + '</p>' : '') + '<h2 class="ad-drawer__title" id="' + id + '">' + esc(o.title) + '</h2></div>' +
        '<button class="ad-drawer__x" type="button" data-act="drawer-close" aria-label="닫기">' + AA.icon('x') + '</button></div>' +
        '<div class="ad-drawer__body">' + (o.html || '') + '</div>' + (o.foot ? '<div class="ad-drawer__foot">' + o.foot + '</div>' : '') + '</div>';
      this.last = d.activeElement;
      // 닫은 뒤 목록을 다시 그리면 원래 버튼이 바뀌므로, 같은 동작·같은 id 의 새 버튼을 찾을 열쇠를 남긴다
      var la = this.last && this.last.getAttribute ? this.last.getAttribute('data-act') : '';
      var li = this.last && this.last.getAttribute ? this.last.getAttribute('data-id') : '';
      this.lastKey = la ? '[data-act="' + la + '"]' + (li ? '[data-id="' + String(li).replace(/"/g, '') + '"]' : '') : '';
      this.onClose = o.onClose || null;
      this.el = el;
      layer().appendChild(el);
      d.documentElement.style.overflow = 'hidden';
      el.addEventListener('mousedown', function (e) { if (e.target === el) AA.drawer.close(); });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); AA.drawer.close(); return; }
        trap(el, e);
      });
      var first = (o.focus && el.querySelector(o.focus)) || el.querySelector('.ad-drawer__x');
      setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }, 20);
      if (typeof o.after === 'function') o.after(el);
      return el;
    },
    body: function () { return this.el ? this.el.querySelector('.ad-drawer__body') : null; },
    setBody: function (html) { var b = this.body(); if (b) b.innerHTML = html; },
    setFoot: function (html) { var f = this.el && this.el.querySelector('.ad-drawer__foot'); if (f) f.innerHTML = html; },
    close: function (silent) {
      if (!this.el) return;
      var el = this.el;
      this.el = null;
      el.remove();
      d.documentElement.style.overflow = '';
      var cb = this.onClose;
      this.onClose = null;
      if (cb && !silent) cb();
      if (silent) return;
      var target = this.last && this.last.focus && d.body.contains(this.last) ? this.last : this.lastKey ? d.querySelector('#ad-main ' + this.lastKey) : null;
      if (target) { try { target.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }
    },
  };
  AA.actions['drawer-close'] = function () { AA.drawer.close(); };
  /** 확인 대화상자 → Promise<boolean> */
  AA.confirm = function (o) {
    return new Promise(function (resolve) {
      var id = 'ad-cf-' + Date.now().toString(36);
      var el = d.createElement('div');
      el.className = 'ad-dialog';
      el.innerHTML = '<div class="ad-dialog__box" role="alertdialog" aria-modal="true" aria-labelledby="' + id + '" aria-describedby="' + id + '-m">' +
        '<h2 class="ad-dialog__t" id="' + id + '">' + esc(o.title || '확인') + '</h2><p class="ad-dialog__msg" id="' + id + '-m">' + esc(o.msg || '') + '</p>' +
        '<div class="ad-dialog__btns"><button type="button" class="ad-btn ad-btn--line" data-v="0">' + esc(o.cancel || '취소') + '</button>' +
        '<button type="button" class="ad-btn ' + (o.danger ? 'ad-btn--danger' : 'ad-btn--ink') + '" data-v="1">' + esc(o.ok || '확인') + '</button></div></div>';
      var last = d.activeElement;
      layer().appendChild(el);
      var done = function (v) { el.remove(); if (last && last.focus) { try { last.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } } resolve(v); };
      el.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (b) done(b.getAttribute('data-v') === '1'); else if (e.target === el) done(false); });
      el.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); done(false); } trap(el, e); });
      setTimeout(function () { el.querySelector('[data-v="1"]').focus(); }, 20);
    });
  };

  // ── 진료시간(관리자 설정 'apple_admin_hours' → 없으면 병원 기본) ──────────────────────────
  var DAYCODE = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  AA.hours = {
    /** 병원 기본 진료시간 → 요일 7칸 */
    base: function () {
      var H = (AA.seed && AA.seed.hospital) || {};
      var days = [];
      for (var i = 0; i < 7; i++) days.push({ dow: i, on: false, o: '09:30', c: '18:30', night: false });
      (H.hours || []).forEach(function (x) {
        (x.dayCodes || []).forEach(function (code) {
          var n = DAYCODE[code];
          if (n == null) return;
          days[n] = { dow: n, on: true, o: x.open, c: x.close, night: !!x.note };
        });
      });
      return {
        v: 1, days: days, special: [],
        lunch: (H.lunch || []).map(function (l) { return { floors: (l.floors || []).join(' · '), start: l.start, end: l.end }; }),
        closedText: H.closed || '일요일 휴진', holidayText: H.holiday || '', custom: false,
      };
    },
    /** 지금 쓰는 진료시간(관리자에서 저장했으면 그 값) */
    get: function () {
      var s = AA.store.get(AA.KEYS.hours, null);
      var b = this.base();
      if (s && Array.isArray(s.days) && s.days.length === 7) {
        return { v: 1, days: s.days, special: Array.isArray(s.special) ? s.special : [], lunch: Array.isArray(s.lunch) ? s.lunch : b.lunch,
          closedText: s.closedText != null ? s.closedText : b.closedText, holidayText: s.holidayText != null ? s.holidayText : b.holidayText, custom: true, updatedAt: s.updatedAt };
      }
      var sp = (AA.seed && AA.seed.hoursSpecial) || [];
      b.special = sp.slice();
      return b;
    },
    /** 날짜 하나의 진료시간 {o,c,night,label} 또는 null(휴진) */
    forDate: function (H, ymd) {
      var sp = (H.special || []).filter(function (x) { return x.date === ymd; })[0];
      if (sp) return sp.type === 'closed' ? null : { o: sp.o, c: sp.c, night: AA.toMin(sp.c) > AA.toMin('18:30'), label: sp.label || '', special: true };
      var dd = H.days[AA.dowOf(ymd)];
      return dd && dd.on ? { o: dd.o, c: dd.c, night: !!dd.night } : null;
    },
    /** 지금 진료 중인지(사이트 00-core·05-admin-bridge 와 같은 문구) */
    status: function (H, at) {
      H = H || this.get();
      var now = AA.kst(at);
      var today = this.forDate(H, now.ymd);
      if (today) {
        var o = AA.toMin(today.o); var c = AA.toMin(today.c);
        if (now.min >= o && now.min < c) return { state: 'open', short: '지금 진료 중', long: '지금 진료 중입니다 · 오늘은 ' + AA.korTime(today.c) + '까지 진료합니다' };
        if (now.min < o) return { state: 'before', short: '진료 전', long: '오늘은 ' + AA.korTime(today.o) + '에 진료를 시작합니다' };
      }
      for (var i = 1; i <= 7; i++) {
        var ymd = AA.addDays(now.ymd, i);
        var nx = this.forDate(H, ymd);
        if (nx) {
          var when = i === 1 ? '내일' : DOW[AA.dowOf(ymd)] + '요일';
          var head = today ? '오늘 진료는 끝났습니다' : '오늘은 휴진입니다';
          return { state: 'closed', short: '진료 종료', long: head + ' · ' + when + ' ' + AA.korTime(nx.o) + '에 시작합니다' };
        }
      }
      return { state: 'closed', short: '진료 종료', long: '진료 종료' };
    },
    /** 같은 시간끼리 묶은 줄(월·금 / 화·수·목 / 토) */
    groups: function (days) {
      var order = [1, 2, 3, 4, 5, 6, 0];
      var out = [];
      order.forEach(function (n) {
        var x = days[n];
        if (!x || !x.on) return;
        var g = out.filter(function (y) { return y.o === x.o && y.c === x.c && y.night === !!x.night; })[0];
        if (g) g.days.push(n); else out.push({ o: x.o, c: x.c, night: !!x.night, days: [n] });
      });
      out.forEach(function (g) { g.label = g.days.map(function (n) { return DOW[n]; }).join('·'); });
      return out;
    },
    offDays: function (days) { return [1, 2, 3, 4, 5, 6, 0].filter(function (n) { return !days[n] || !days[n].on; }).map(function (n) { return DOW[n]; }); },
  };

  // ── 금칙어 검사(tools/forbidden.mjs 규칙 → seed.forbiddenCheck.rules) ───────────────────
  AA.rules = {
    list: [],
    init: function (rules) {
      this.list = (rules || []).map(function (r) {
        var re = null;
        try { re = new RegExp(r.source, 'g'); } catch (e) { re = null; }
        return re ? { re: re, why: r.why, instead: r.instead } : null;
      }).filter(Boolean);
    },
    /** 걸린 곳 전부 [{index, term, why, instead}] */
    scan: function (text) {
      var s = String(text || '');
      var out = [];
      this.list.forEach(function (r) {
        r.re.lastIndex = 0;
        var m;
        while ((m = r.re.exec(s))) {
          if (!m[0]) { r.re.lastIndex++; continue; }
          out.push({ index: m.index, term: m[0], why: r.why, instead: r.instead });
        }
      });
      out.sort(function (a, b) { return a.index - b.index; });
      // 겹치는 것은 앞의 것만
      var res = []; var end = -1;
      out.forEach(function (x) { if (x.index >= end) { res.push(x); end = x.index + x.term.length; } });
      return res;
    },
    /** 이스케이프한 글에 걸린 곳만 <mark> */
    highlight: function (text) {
      var s = String(text || '');
      var hits = this.scan(s);
      if (!hits.length) return esc(s);
      var html = ''; var at = 0;
      hits.forEach(function (h) {
        html += esc(s.slice(at, h.index)) + '<mark class="ad-flag" title="' + esc(h.why) + '">' + esc(h.term) + '</mark>';
        at = h.index + h.term.length;
      });
      return html + esc(s.slice(at));
    },
    /** 검사 결과 목록 HTML */
    report: function (text, okText) {
      var hits = this.scan(text);
      if (!hits.length) return '<p class="ad-rules__ok">' + AA.icon('check') + esc(okText || '의료광고 금칙어 없음') + '</p>';
      var seen = {};
      return '<div class="ad-rules">' + hits.filter(function (h) { var k = h.term + h.why; if (seen[k]) return false; seen[k] = 1; return true; }).map(function (h) {
        return '<div class="ad-rules__item"><span class="ad-rules__term">‘' + esc(h.term) + '’</span><span class="ad-rules__why">' + esc(h.why) + '</span><p class="ad-rules__fix"><b>대신</b> ' + esc(h.instead || '') + '</p></div>';
      }).join('') + '</div>';
    },
    count: function (text) { return this.scan(text).length; },
  };

  // ── 예시 데이터를 오늘에 맞추기(나중에 열어도 '이번 주'가 살아 있게) ──────────────────────
  AA.prepareSeed = function (seed) {
    var today = AA.kst().ymd;
    var off = Math.max(0, AA.daysBetween(seed.demo.today, today));
    AA.offset = off;
    AA.REF = off ? today : seed.demo.today;
    if (!off) return seed;
    var ms = off * 86400000;
    var iso = function (t) { return t ? new Date(Date.parse(t) + ms).toISOString() : t; };
    var ymd = function (t) { return t ? AA.addDays(t, off) : t; };
    (seed.leads || []).forEach(function (l) { l.createdAt = iso(l.createdAt); (l.history || []).forEach(function (h) { h.at = iso(h.at); }); });
    (seed.online || []).forEach(function (q) { q.createdAt = iso(q.createdAt); if (q.answer) q.answer.at = iso(q.answer.at); });
    (seed.reviews || []).forEach(function (r) { r.date = ymd(r.date); });
    var fc = seed.forbiddenCheck || {};
    (fc.drafts || []).forEach(function (x) { x.date = ymd(x.date); x.createdAt = iso(x.createdAt); (x.history || []).forEach(function (h) { h.at = iso(h.at); }); });
    ((seed.selfcheck && seed.selfcheck.example && seed.selfcheck.example.daily) || []).forEach(function (x) { x.date = ymd(x.date); });
    ((seed.conversion && seed.conversion.daily) || []).forEach(function (x) { x.date = ymd(x.date); });
    if (seed.aeo && seed.aeo.measures) seed.aeo.measures = seed.aeo.measures.map(ymd);
    seed.demo.start = ymd(seed.demo.start);
    seed.demo.today = today;
    return seed;
  };

  // ── 라우터·화면 틀 ────────────────────────────────────────────────────────────
  AA.TITLES = {
    dashboard: '대시보드', leads: '상담 신청', online: '온라인 상담', doctors: '의료진', clinics: '진료 페이지', answers: '질문 답 페이지',
    columns: '건강정보·칼럼', news: '소식 게시판', reviews: '리뷰', selfcheck: '자가진단 통계', conversion: '전환 개선', aeo: 'AI 검색 노출',
    pricing: '비급여 진료비', hours: '진료시간·휴진', notice: '공지 띠배너', main: '메인 화면', hospital: '병원 정보',
  };
  AA.ORDER = ['dashboard', 'leads', 'online', 'doctors', 'clinics', 'answers', 'columns', 'news', 'reviews', 'selfcheck', 'conversion', 'aeo', 'pricing', 'hours', 'notice', 'main', 'hospital'];
  AA.no = function (name) { var i = AA.ORDER.indexOf(name); return i < 0 ? '' : String(i + 1).padStart(2, '0'); };
  function parseQuery(q) {
    var o = {};
    String(q || '').split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); o[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); });
    return o;
  }
  AA.parseHash = function () {
    var h = String(w.location.hash || '').replace(/^#\/?/, '');
    var q = '';
    var i = h.indexOf('?');
    if (i > -1) { q = h.slice(i + 1); h = h.slice(0, i); }
    var parts = h.split('/');
    var name = parts[0] && AA.views[parts[0]] ? parts[0] : 'dashboard';
    return { name: name, param: decodeURIComponent(parts.slice(1).join('/') || ''), query: parseQuery(q) };
  };
  AA.go = function (hash) { if (w.location.hash === hash) AA.render(); else w.location.hash = hash; };
  AA.current = null;
  AA.route = null;
  var lastName = '';
  AA.render = function (opts) {
    opts = opts || {};
    var r = AA.parseHash();
    var v = AA.views[r.name];
    var main = d.getElementById('ad-main');
    if (!v || !main) return;
    var keepScroll = !!opts.keep;
    var y = w.scrollY;
    var focusId = keepScroll && d.activeElement && main.contains(d.activeElement) ? d.activeElement.id : '';
    AA.current = v;
    AA.route = r;
    if (AA.chart && AA.chart.reset) AA.chart.reset();
    try {
      main.innerHTML = v.render(r);
      if (typeof v.after === 'function') v.after(main, r);
      if (AA.chart && AA.chart.mountAll) AA.chart.mountAll(main);
    } catch (e) {
      main.innerHTML = '<div class="ad-note ad-note--warn"><span>화면을 그리지 못했습니다: ' + esc(e && e.message) + '</span></div>';
      if (w.console) w.console.error(e);
    }
    // 메뉴 표시
    Array.prototype.forEach.call(d.querySelectorAll('.ad-nav__a'), function (a) {
      if (a.getAttribute('data-route') === r.name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var title = AA.TITLES[r.name] || '';
    var where = d.getElementById('ad-where');
    if (where) where.innerHTML = '관리자 / <b>' + esc(title) + '</b>';
    d.title = title + ' | 관리자 | 부천 사과나무치과병원';
    AA.refreshBadges();
    AA.navClose(true);
    if (keepScroll) {
      w.scrollTo(0, y);
      if (focusId) { var f = d.getElementById(focusId); if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } } }
    } else if (!opts.silent) {
      if (lastName !== r.name || opts.top) w.scrollTo(0, 0);
      if (lastName && lastName !== r.name) { try { main.focus({ preventScroll: true }); } catch (e) { main.focus(); } }
    }
    lastName = r.name;
  };
  /** 같은 화면 다시 그리기(스크롤·포커스 유지) */
  AA.rerender = function () { AA.render({ keep: true }); };
  AA.refreshBadges = function () {
    Array.prototype.forEach.call(d.querySelectorAll('[data-count]'), function (el) {
      var fn = AA.badges[el.getAttribute('data-count')];
      var n = 0;
      try { n = fn ? fn() : 0; } catch (e) { n = 0; }
      el.textContent = n > 0 ? String(n) : '';
      el.classList.toggle('is-hot', n > 0 && el.getAttribute('data-count') === 'leads');
      if (n > 0) el.setAttribute('aria-label', n + '건'); else el.removeAttribute('aria-label');
    });
  };
  AA.navOpen = function () {
    var app = d.getElementById('ad-app');
    if (!app || app.classList.contains('nav-open')) return;
    AA._navLast = d.activeElement;
    app.classList.add('nav-open');
    d.getElementById('ad-scrim').hidden = false;
    var b = d.querySelector('.ad-top__menu'); if (b) b.setAttribute('aria-expanded', 'true');
    var c = d.querySelector('.ad-side__close'); if (c) setTimeout(function () { c.focus(); }, 30);
  };
  AA.navClose = function (silent) {
    var app = d.getElementById('ad-app');
    if (!app || !app.classList.contains('nav-open')) return;
    app.classList.remove('nav-open');
    d.getElementById('ad-scrim').hidden = true;
    var b = d.querySelector('.ad-top__menu'); if (b) b.setAttribute('aria-expanded', 'false');
    if (!silent && b) b.focus();
  };
  AA.actions['nav-open'] = function () { AA.navOpen(); };
  AA.actions['nav-close'] = function () { AA.navClose(); };

  // ── 이벤트 위임(data-act / data-input / data-change) ─────────────────────────────────
  function handler(kind, name) {
    var v = AA.current;
    if (v && v.on && typeof v.on[name] === 'function') return v.on[name];
    if (kind === 'act' && typeof AA.actions[name] === 'function') return AA.actions[name];
    return null;
  }
  d.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el || (el.disabled)) return;
    var fn = handler('act', el.getAttribute('data-act'));
    if (fn) { if (el.tagName === 'A' || el.tagName === 'BUTTON') e.preventDefault(); fn(el, e); }
  });
  d.addEventListener('input', function (e) {
    var el = e.target.closest ? e.target.closest('[data-input]') : null;
    if (!el) return;
    var fn = handler('input', el.getAttribute('data-input'));
    if (fn) fn(el, e);
  });
  d.addEventListener('change', function (e) {
    var el = e.target.closest ? e.target.closest('[data-change]') : null;
    if (!el) return;
    var fn = handler('change', el.getAttribute('data-change'));
    if (fn) fn(el, e);
  });
  d.addEventListener('submit', function (e) {
    var f = e.target;
    var name = f.getAttribute && f.getAttribute('data-submit');
    if (!name) return;
    e.preventDefault();
    var fn = handler('submit', name);
    if (fn) fn(f, e);
  });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var app = d.getElementById('ad-app'); if (app && app.classList.contains('nav-open')) AA.navClose(); }
  });
})();
