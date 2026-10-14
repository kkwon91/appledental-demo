/* 부천 사과나무치과병원 — 빌드 2026-10-14 */
window.SITE_BASE="/appledental-demo/";
/* ── 00-core.js ── */
/* 00-core — 모든 페이지 공통: 띠배너 하루 닫기 · 헤더 · 메가메뉴 · 모바일 메뉴 · 지금 진료 중(한국 시간)·오늘 표시·진료시간 그래프
   · 등장 효과 · 숫자 올라가기 · 같은 페이지 안 이동 · 데모 표시 · 진료과별 의료진 보기 · 정보 페이지 목차 */
(function () {
  'use strict';
  var d = document;
  var w = window;
  var root = d.documentElement;
  var mm = function (q) { return w.matchMedia ? w.matchMedia(q) : { matches: false, addListener: function () {} }; };
  var onMq = function (q, fn) { if (q.addEventListener) q.addEventListener('change', fn); else if (q.addListener) q.addListener(fn); };
  var reduce = mm('(prefers-reduced-motion: reduce)').matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  function store(key, val) {
    try {
      if (val === undefined) return w.localStorage.getItem(key);
      w.localStorage.setItem(key, val);
    } catch (e) { /* 저장소를 못 쓰는 브라우저 — 무시 */ }
    return null;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  /** 지금 한국 시각(기기 시간대와 상관없이) */
  function kst() {
    var t = new Date(Date.now() + 9 * 3600000);
    return { day: t.getUTCDay(), min: t.getUTCHours() * 60 + t.getUTCMinutes(), ymd: t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()) };
  }

  /* ── 1. 띠배너: 오늘 하루 닫기 ─────────────────────────────── */
  var band = d.querySelector('[data-band]');
  if (band) {
    if (store('apple_band_hide') === kst().ymd) root.classList.add('band-off');
    var bx = band.querySelector('[data-band-close]');
    if (bx) bx.addEventListener('click', function () {
      store('apple_band_hide', kst().ymd);
      root.classList.add('band-off');
      var logo = d.querySelector('.site-logo');
      if (logo) logo.focus();
    });
  }

  /* ── 2. 헤더: 스크롤하면 아래 선 ────────────────────────────── */
  var header = d.getElementById('site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', (w.scrollY || w.pageYOffset) > 4); };
    onScroll();
    w.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── 3. 메가메뉴: Esc 로 닫기 · 올린 메뉴의 칸 강조 ─────────────── */
  var mega = d.querySelector('[data-mega]');
  if (mega) {
    var cols = mega.querySelectorAll('[data-mega-col]');
    var hot = function (id) { each(cols, function (c) { c.classList.toggle('is-hot', c.getAttribute('data-mega-col') === id); }); };
    each(mega.querySelectorAll('[data-mega-id]'), function (a) {
      var on = function () { hot(a.getAttribute('data-mega-id')); };
      a.addEventListener('mouseenter', on);
      a.addEventListener('focus', on);
    });
    each(cols, function (c) { c.addEventListener('mouseenter', function () { hot(c.getAttribute('data-mega-col')); }); });
    mega.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      mega.classList.add('is-suppressed');
      var cur = d.activeElement;
      var col = cur && cur.closest ? cur.closest('[data-mega-col]') : null;
      var top = col ? mega.querySelector('[data-mega-id="' + col.getAttribute('data-mega-col') + '"]') : null;
      if (top) top.focus();
    });
    mega.addEventListener('mouseleave', function () { mega.classList.remove('is-suppressed'); hot(''); });
    mega.addEventListener('focusout', function (e) { if (!mega.contains(e.relatedTarget)) { mega.classList.remove('is-suppressed'); hot(''); } });
    mega.addEventListener('mouseenter', function () { mega.classList.remove('is-suppressed'); });
  }

  /* ── 4. 모바일 전체 메뉴 ────────────────────────────────────── */
  var mbtn = d.querySelector('[data-menu-open]');
  var menu = d.getElementById('m-menu');
  if (mbtn && menu) {
    var closeBtn = menu.querySelector('[data-menu-close]');
    var sheet = menu.querySelector('.m-menu__sheet');
    var lastFocus = null;
    var openMenu = function () {
      lastFocus = d.activeElement;
      menu.hidden = false;
      w.requestAnimationFrame(function () { w.requestAnimationFrame(function () { menu.classList.add('is-open'); }); });
      mbtn.setAttribute('aria-expanded', 'true');
      root.classList.add('menu-open');
      if (closeBtn) closeBtn.focus();
    };
    var closeMenu = function () {
      menu.classList.remove('is-open');
      mbtn.setAttribute('aria-expanded', 'false');
      root.classList.remove('menu-open');
      w.setTimeout(function () { menu.hidden = true; }, reduce ? 0 : 280);
      (lastFocus && lastFocus.focus ? lastFocus : mbtn).focus();
    };
    mbtn.addEventListener('click', function () { if (menu.hidden) openMenu(); else closeMenu(); });
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    menu.addEventListener('click', function (e) {
      if (e.target === menu) closeMenu();
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (a) closeMenu();
    });
    d.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { closeMenu(); return; }
      if (e.key !== 'Tab' || !sheet) return;
      var f = Array.prototype.filter.call(sheet.querySelectorAll('a[href], button, summary, input, select, textarea'), function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    w.addEventListener('resize', function () { if (!menu.hidden && w.innerWidth >= 1100) closeMenu(); });
  }

  /* ── 5. 지금 진료 중 / 진료 종료 (한국 시간) · 오늘 표시 · 진료시간 그래프의 '지금' 선 ─── */
  var DAYN = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  function hm(s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function korTime(m) {
    var h = Math.floor(m / 60);
    var mi = m % 60;
    return (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + '시' + (mi ? ' ' + mi + '분' : '');
  }
  function find(hours, day) {
    for (var i = 0; i < hours.length; i++) if ((hours[i].d || []).indexOf(day) > -1) return hours[i];
    return null;
  }
  function statusOf(hours, now) {
    var today = find(hours, now.day);
    if (today) {
      var o = hm(today.o);
      var c = hm(today.c);
      if (now.min >= o && now.min < c) return { state: 'open', short: '지금 진료 중', long: '지금 진료 중입니다 · 오늘은 ' + korTime(c) + '까지 진료합니다' };
      if (now.min < o) return { state: 'before', short: '진료 전', long: '오늘은 ' + korTime(o) + '에 진료를 시작합니다' };
    }
    for (var i = 1; i <= 7; i++) {
      var dd = (now.day + i) % 7;
      var nx = find(hours, dd);
      if (nx) {
        var when = i === 1 ? '내일' : DAYN[dd];
        return { state: 'closed', short: '진료 종료', long: (today ? '오늘 진료는 끝났습니다' : '오늘은 휴진입니다') + ' · ' + when + ' ' + korTime(hm(nx.o)) + '에 시작합니다' };
      }
    }
    return { state: 'closed', short: '진료 종료', long: '진료 종료' };
  }
  var stEls = d.querySelectorAll('[data-open-status]');
  var dayEls = d.querySelectorAll('[data-days]');
  var charts = d.querySelectorAll('[data-hours-chart]');
  var A0 = 9 * 60;
  var A1 = 21 * 60;
  function paint() {
    var now = kst();
    each(stEls, function (el) {
      var hours;
      try { hours = JSON.parse(el.getAttribute('data-hours') || '[]'); } catch (e) { return; }
      if (!hours.length) return;
      var s = statusOf(hours, now);
      el.setAttribute('data-state', s.state);
      var t = el.querySelector('[data-status-text]') || el;
      t.textContent = el.getAttribute('data-open-status') === 'long' ? s.long : s.short;
    });
    each(dayEls, function (el) {
      var days = String(el.getAttribute('data-days')).split(',').map(Number);
      el.classList.toggle('is-today', days.indexOf(now.day) > -1);
    });
    each(charts, function (ch) {
      each(ch.querySelectorAll('[data-hc-now]'), function (n) {
        var row = n.closest('[data-days]');
        var x = (now.min - A0) / (A1 - A0);
        var show = !!row && row.classList.contains('is-today') && x >= 0 && x <= 1;
        n.hidden = !show;
        if (show) n.style.setProperty('--x', x.toFixed(4));
      });
    });
  }
  if (stEls.length || dayEls.length) { paint(); w.setInterval(paint, 60000); }

  /* ── 6. 등장 효과 — 처음부터 보이는 상태, 아래에서 살짝 올라오기만 ─────── */
  var canIO = 'IntersectionObserver' in w;
  if (!reduce && canIO) {
    var rv = d.querySelectorAll('[data-reveal]');
    if (rv.length) {
      root.classList.add('rv');
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
      each(rv, function (el) {
        if (el.getBoundingClientRect().top < w.innerHeight) el.classList.add('is-in');
        else io.observe(el);
      });
    }
  }

  /* ── 7. 숫자 올라가기 — 화면 아래에 있던 숫자만(처음 보이는 숫자는 그대로) ─── */
  var nums = d.querySelectorAll('[data-count]');
  if (nums.length && !reduce && canIO) {
    var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
    var run = function (el) {
      var to = parseInt(el.getAttribute('data-count'), 10);
      if (!(to > 0)) return;
      var final = el.textContent;
      var dur = 900;
      var t0 = 0;
      var step = function (t) {
        if (!t0) t0 = t;
        var p = Math.min(1, (t - t0) / dur);
        el.textContent = p < 1 ? fmt(Math.round(to * (1 - Math.pow(1 - p, 3)))) : final;
        if (p < 1) w.requestAnimationFrame(step);
      };
      w.requestAnimationFrame(step);
    };
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io2.unobserve(e.target); run(e.target); } });
    }, { threshold: 0.5 });
    each(nums, function (el) { if (el.getBoundingClientRect().top > w.innerHeight) io2.observe(el); });
  }

  /* ── 8. 같은 페이지 안 이동(#상담 신청·목차 등): 부드럽게 — CSS scroll-behavior 대신(화면 촬영 도구와 충돌하지 않게) ── */
  d.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    var t = id ? d.getElementById(id) : null;
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (w.history && w.history.replaceState) w.history.replaceState(null, '', '#' + id);
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
    try { t.focus({ preventScroll: true }); } catch (err) { t.focus(); }
  });

  /* ── 9. 데모 표시: 바깥 누르기·Esc 로 닫기 ──────────────────────── */
  var demo = d.querySelector('details[data-demo-badge]');
  if (demo) {
    d.addEventListener('click', function (e) { if (demo.open && !demo.contains(e.target)) demo.open = false; });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && demo.open) { demo.open = false; var s = demo.querySelector('summary'); if (s) s.focus(); }
    });
  }

  /* ── 10. 진료과별 의료진 보기(doctorFilter 부품) ──────────────────── */
  each(d.querySelectorAll('[data-doc-filter]'), function (flt) {
    var grid = d.getElementById(flt.getAttribute('data-doc-filter'));
    if (!grid) return;
    var cards = grid.querySelectorAll('.doc[data-dept]');
    var live = flt.nextElementSibling && flt.nextElementSibling.hasAttribute('data-doc-live') ? flt.nextElementSibling : null;
    flt.hidden = false;
    flt.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-dept]') : null;
      if (!b) return;
      var dept = b.getAttribute('data-dept');
      each(flt.querySelectorAll('button[data-dept]'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var n = 0;
      each(cards, function (c) {
        var show = !dept || c.getAttribute('data-dept') === dept;
        c.hidden = !show;
        if (show) n++;
      });
      if (live) live.textContent = (b.getAttribute('data-name') || '전체') + ' 의료진 ' + n + '명을 보여 줍니다.';
    });
  });

  /* ── 11. 정보 페이지 목차(articleLayout): 큰 화면은 늘 펼침, 좁은 화면은 접어 두기 · 지금 읽는 소제목 표시 ─── */
  each(d.querySelectorAll('[data-toc]'), function (toc) {
    var box = toc.querySelector('[data-toc-box]');
    var narrow = mm('(max-width: 960px)');
    var sync = function () { if (box) box.open = !narrow.matches; };
    sync();
    onMq(narrow, sync);
    if (box) {
      var sum = box.querySelector('summary');
      if (sum) sum.addEventListener('click', function (e) { if (!narrow.matches) e.preventDefault(); });
    }
    var map = [];
    each(toc.querySelectorAll('.toc__link'), function (a) {
      var el = d.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
      if (el) map.push({ a: a, el: el });
      a.addEventListener('click', function () { if (narrow.matches && box) box.open = false; });
    });
    if (!map.length) return;
    var ticking = false;
    var spy = function () {
      ticking = false;
      var y = w.innerHeight * 0.32;
      var cur = null;
      for (var i = 0; i < map.length; i++) if (map[i].el.getBoundingClientRect().top <= y) cur = map[i];
      map.forEach(function (m) { if (m === cur) m.a.setAttribute('aria-current', 'true'); else m.a.removeAttribute('aria-current'); });
    };
    spy();
    w.addEventListener('scroll', function () { if (!ticking) { ticking = true; w.requestAnimationFrame(spy); } }, { passive: true });
  });
})();


/* ── 05-admin-bridge.js ── */
/* 05-admin-bridge — 관리자 데모(admin/)에서 저장한 설정을 이 브라우저의 사이트 화면에 반영한다(데모 전용).
   - localStorage['apple_admin_notice'] { enabled, text, more, link, linkLabel, start, end }
       → 띠배너([data-band])의 문구(.site-band__key·__more)·링크(.site-band__link)·보이기(html.band-off)
   - localStorage['apple_admin_hours']  { days:[7칸 {dow,on,o,c,night}], special:[{date,type:'closed'|'hours',o,c,label}], lunch, closedText, holidayText }
       → '지금 진료 중'([data-open-status] 의 data-hours — 앞으로 7일을 날짜별로 펼쳐 넣어 휴진일까지 맞춘다)
         · 진료시간 그래프([data-hours-chart] .hc__row) · 점심시간(.lunch__list) · 푸터 진료시간(.ft-hours·.ft-lunch) · 모바일 메뉴(.m-menu__hours) · 기본 띠배너 문구
   레이아웃(_layout.mjs)·공용 부품·00-core.js 가 만든 마크업과 속성을 읽어 같은 모양으로 바꿀 뿐, 그 파일들은 고치지 않는다.
   00-core.js 가 먼저 한 번 그린 뒤 이 파일이 값을 바꾸고 바로 다시 그린다(같은 문구 규칙). 1분마다 00-core 가 바뀐 data-hours 로 다시 그린다.
   데모 화면(body.is-demo)에서만, 저장된 값이 있을 때만 움직인다. */
(function () {
  'use strict';
  var d = document;
  var w = window;
  if (!d.body || !d.body.classList.contains('is-demo')) return;
  function read(k) { try { var v = w.localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  var NOTICE = read('apple_admin_notice');
  var HOURS = read('apple_admin_hours');
  if (!NOTICE && !HOURS) return;

  var root = d.documentElement;
  var BASE = w.SITE_BASE || '/';
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  var DAYN = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function kst() {
    var t = new Date(Date.now() + 9 * 3600000);
    return { day: t.getUTCDay(), min: t.getUTCHours() * 60 + t.getUTCMinutes(), ymd: t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()) };
  }
  function addDays(ymd, n) { return new Date(Date.parse(ymd + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10); }
  function hm(s) { var p = String(s || '0:0').split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  /** 분 → '오후 8시 30분'(00-core 와 같은 꼴) */
  function korTime(m) { var h = Math.floor(m / 60); var mi = m % 60; return (h < 12 ? '오전 ' : '오후 ') + (h % 12 || 12) + '시' + (mi ? ' ' + mi + '분' : ''); }
  /** '09:30' → '오전 9:30'(공용 부품 korClock 과 같은 꼴) */
  function korClock(s) { var m = hm(s); var h = Math.floor(m / 60); return (h < 12 ? '오전' : '오후') + ' ' + (h % 12 || 12) + ':' + pad(m % 60); }
  var t = function (el, s) { if (el) el.textContent = s; };

  // ── 진료시간 ────────────────────────────────────────────────────────────────
  var H = HOURS && Array.isArray(HOURS.days) && HOURS.days.length === 7 ? HOURS : null;
  var special = H && Array.isArray(H.special) ? H.special : [];
  function forDate(ymd, dow) {
    for (var i = 0; i < special.length; i++) {
      var s = special[i];
      if (s && s.date === ymd) return s.type === 'closed' ? null : { o: s.o, c: s.c };
    }
    var x = H.days[dow];
    return x && x.on ? { o: x.o, c: x.c } : null;
  }
  /** 오늘부터 7일을 요일 번호로 펼친 진료시간(00-core 가 읽는 data-hours 모양) */
  function rolling() {
    var now = kst();
    var out = [];
    for (var i = 0; i < 7; i++) {
      var h = forDate(addDays(now.ymd, i), (now.day + i) % 7);
      if (h) out.push({ d: [(now.day + i) % 7], o: h.o, c: h.c });
    }
    return out;
  }
  // 00-core.js statusOf 와 같은 문구
  function statusOf(hours, now) {
    var find = function (day) { for (var i = 0; i < hours.length; i++) if ((hours[i].d || []).indexOf(day) > -1) return hours[i]; return null; };
    var today = find(now.day);
    if (today) {
      var o = hm(today.o); var c = hm(today.c);
      if (now.min >= o && now.min < c) return { state: 'open', short: '지금 진료 중', long: '지금 진료 중입니다 · 오늘은 ' + korTime(c) + '까지 진료합니다' };
      if (now.min < o) return { state: 'before', short: '진료 전', long: '오늘은 ' + korTime(o) + '에 진료를 시작합니다' };
    }
    for (var i = 1; i <= 7; i++) {
      var dd = (now.day + i) % 7;
      var nx = find(dd);
      if (nx) return { state: 'closed', short: '진료 종료', long: (today ? '오늘 진료는 끝났습니다' : '오늘은 휴진입니다') + ' · ' + (i === 1 ? '내일' : DAYN[dd]) + ' ' + korTime(hm(nx.o)) + '에 시작합니다' };
    }
    return { state: 'closed', short: '진료 종료', long: '진료 종료' };
  }
  function applyStatus() {
    var hours = rolling();
    var json = JSON.stringify(hours);
    var now = kst();
    each(d.querySelectorAll('[data-open-status]'), function (el) {
      el.setAttribute('data-hours', json);
      var s = statusOf(hours, now);
      el.setAttribute('data-state', s.state);
      t(el.querySelector('[data-status-text]') || el, el.getAttribute('data-open-status') === 'long' ? s.long : s.short);
    });
  }
  /** 같은 시간끼리 묶은 줄(월·금 / 화·수·목 / 토) */
  function groups() {
    var out = [];
    [1, 2, 3, 4, 5, 6, 0].forEach(function (n) {
      var x = H.days[n];
      if (!x || !x.on) return;
      var g = out.filter(function (y) { return y.o === x.o && y.c === x.c && y.night === !!x.night; })[0];
      if (g) g.days.push(n); else out.push({ o: x.o, c: x.c, night: !!x.night, days: [n] });
    });
    out.forEach(function (g) { g.label = g.days.map(function (n) { return DOW[n]; }).join('·'); });
    return out;
  }
  var offDays = function () { return [1, 2, 3, 4, 5, 6, 0].filter(function (n) { return !H.days[n] || !H.days[n].on; }); };
  function el(tag, cls, text) { var x = d.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }

  function applyChart() {
    var A0 = 9 * 60; var A1 = 21 * 60;
    var pos = function (s) { return Math.min(1, Math.max(0, (hm(s) - A0) / (A1 - A0))).toFixed(4); };
    var plain = [1, 2, 3, 4, 5].map(function (n) { return H.days[n]; }).filter(function (x) { return x && x.on && !x.night; })[0];
    var nightFrom = plain ? plain.c : '18:30';
    each(d.querySelectorAll('[data-hours-chart] .hc__row[data-days]'), function (row) {
      var n = +row.getAttribute('data-days');
      var x = H.days[n];
      var night = !!(x && x.on && x.night && hm(x.c) > hm(nightFrom));
      row.classList.toggle('is-off', !(x && x.on));
      row.classList.toggle('is-night', night);
      var day = el('span', 'hc__day', DOW[n]);
      var today = el('span', 'hc__today'); today.setAttribute('aria-hidden', 'true'); day.appendChild(today); // '오늘' 글자는 CSS(::before)가 그린다
      var track = el('span', 'hc__track'); track.setAttribute('aria-hidden', 'true');
      var time = el('span', 'hc__time');
      if (x && x.on) {
        row.setAttribute('data-open', x.o); row.setAttribute('data-close', x.c);
        var bar = el('span', 'hc__bar'); bar.setAttribute('style', '--a:' + pos(x.o) + ';--b:' + pos(night ? nightFrom : x.c)); track.appendChild(bar);
        if (night) { var nb = el('span', 'hc__night'); nb.setAttribute('style', '--a:' + pos(nightFrom) + ';--b:' + pos(x.c)); track.appendChild(nb); }
        var now = el('span', 'hc__now'); now.setAttribute('data-hc-now', ''); now.hidden = true; now.appendChild(el('span')); track.appendChild(now); // '지금' 글자는 CSS(::before)
        time.appendChild(el('span', 'tnum', korClock(x.o) + ' – ' + korClock(x.c)));
        if (night) time.appendChild(el('span', 'tag tag--line', '야간진료'));
      } else {
        row.removeAttribute('data-open'); row.removeAttribute('data-close');
        time.textContent = '휴진';
      }
      row.textContent = '';
      row.appendChild(day); row.appendChild(track); row.appendChild(time);
    });
    placeNow();
  }
  /** 다시 만든 줄에 '지금' 선을 바로 놓는다(00-core 는 1분 뒤부터 같은 방식으로 옮긴다) */
  function placeNow() {
    var now = kst();
    var x = (now.min - 9 * 60) / (12 * 60);
    each(d.querySelectorAll('[data-hours-chart] [data-hc-now]'), function (n) {
      var row = n.closest ? n.closest('[data-days]') : null;
      var days = row ? String(row.getAttribute('data-days')).split(',').map(Number) : [];
      var show = days.indexOf(now.day) > -1 && x >= 0 && x <= 1;
      n.hidden = !show;
      if (show) n.style.setProperty('--x', x.toFixed(4));
    });
  }
  function applyLunch() {
    var L = Array.isArray(H.lunch) ? H.lunch.filter(function (x) { return x && x.floors; }) : null;
    if (!L || !L.length) return;
    each(d.querySelectorAll('.lunch__list'), function (ul) {
      ul.textContent = '';
      L.forEach(function (x) { var li = el('li'); li.appendChild(el('span', 'lunch__fl', x.floors)); li.appendChild(el('span', 'lunch__t tnum', korClock(x.start) + ' – ' + korClock(x.end))); ul.appendChild(li); });
    });
    each(d.querySelectorAll('.ft-lunch'), function (ul) {
      ul.textContent = '';
      L.forEach(function (x) { var li = el('li', '', x.floors.replace(/\s*·\s*/g, '·') + ' '); li.appendChild(el('span', 'tnum', x.start + '–' + x.end)); ul.appendChild(li); });
    });
  }
  function applyFooter() {
    var G = groups();
    var off = offDays();
    each(d.querySelectorAll('.ft-hours tbody'), function (tb) {
      tb.textContent = '';
      G.forEach(function (g) {
        var tr = el('tr'); var th = el('th', '', g.label); th.setAttribute('scope', 'row'); tr.appendChild(th);
        var td = el('td', 'tnum', g.o + ' – ' + g.c); if (g.night) { td.appendChild(d.createTextNode(' ')); td.appendChild(el('span', 'ft-note', '야간진료')); } tr.appendChild(td); tb.appendChild(tr);
      });
      if (off.length) { var tr = el('tr'); var th = el('th', '', off.map(function (n) { return DOW[n]; }).join('·')); th.setAttribute('scope', 'row'); tr.appendChild(th); tr.appendChild(el('td', '', '휴진')); tb.appendChild(tr); }
      var col = tb.closest ? tb.closest('.ft-col') : null;
      var subs = col ? col.querySelectorAll('.ft-sub') : [];
      var last = subs.length ? subs[subs.length - 1] : null;
      if (last && /휴진|공휴일/.test(last.textContent)) t(last, [H.closedText, H.holidayText].filter(Boolean).join(' · '));
    });
    each(d.querySelectorAll('.m-menu__hours'), function (p) {
      t(p, G.map(function (g) { return g.label + ' ' + g.o + '–' + g.c; }).join(' · ') + (H.closedText ? ' · ' + H.closedText : ''));
    });
  }
  function bandDefault() {
    var G = groups();
    var night = G.filter(function (g) { return g.night; })[0];
    var sat = H.days[6] && H.days[6].on ? H.days[6] : null;
    return {
      key: night ? night.label + ' ' + korTime(hm(night.c)) + '까지 야간진료' : G.map(function (g) { return g.label + ' ' + korClock(g.o) + '~' + korClock(g.c); }).join(' · '),
      more: (sat ? ' · 토요일 ' + korClock(sat.o) + '~' + korClock(sat.c) : '') + (H.closedText ? ' · ' + H.closedText : '') + (H.holidayText ? ' · ' + H.holidayText : ''),
    };
  }

  // ── 띠배너 ──────────────────────────────────────────────────────────────────
  var band = d.querySelector('[data-band]');
  var noticeOn = false;
  if (band && NOTICE) {
    var today = kst().ymd;
    var inRange = (!NOTICE.start || today >= NOTICE.start) && (!NOTICE.end || today <= NOTICE.end);
    if (NOTICE.enabled === false) {
      root.classList.add('band-off');
      band.setAttribute('data-admin-notice', 'off');
      noticeOn = true;
    } else if (NOTICE.text && inRange) {
      t(band.querySelector('.site-band__key'), String(NOTICE.text).slice(0, 80));
      t(band.querySelector('.site-band__more'), NOTICE.more ? ' · ' + String(NOTICE.more).slice(0, 80) : '');
      var link = band.querySelector('.site-band__link');
      if (link) {
        if (NOTICE.link) { link.setAttribute('href', BASE + String(NOTICE.link).replace(/^\/+/, '')); t(link, NOTICE.linkLabel || '자세히 보기'); link.hidden = false; }
        else link.hidden = true;
      }
      band.setAttribute('aria-label', '공지');
      band.setAttribute('data-admin-notice', 'on');
      noticeOn = true;
    }
  }

  if (H) {
    applyStatus();
    w.setInterval(applyStatus, 60000);
    applyChart();
    applyLunch();
    applyFooter();
    if (band && !noticeOn) {
      var b = bandDefault();
      t(band.querySelector('.site-band__key'), b.key);
      t(band.querySelector('.site-band__more'), b.more);
    }
    root.setAttribute('data-admin-hours', '1');
  }
})();


/* ── 10-consult.js ── */
/* 10-consult — 상담 신청 폼(form#consult-form) 검증·저장·완료 화면·그로스메이트 신호
   데모: 신청은 병원에 가지 않는다. localStorage['apple_demo_leads'] 에 쌓아 관리자 데모에서 보이게 하고,
   완료 화면에 "데모 화면이라 병원에 전달되지 않습니다" 를 분명히 쓴다(CONTEXT §10).
   성공 → window.gmLeadSuccess(), 실패 → window.gmLeadFail('사유').
   미리 채우기: ?subject=임플란트(또는 topic·dept) · ?selfcheck=… / sessionStorage['apple_selfcheck_result'](글 또는 JSON {summary}) */
(function () {
  'use strict';
  var d = document;
  var w = window;
  var form = d.getElementById('consult-form');
  if (!form) return;

  var KEY = 'apple_demo_leads';
  var phoneNo = form.getAttribute('data-phone') || '';
  var $ = function (name) { return form.elements[name]; };
  var params = {};
  try { params = Object.fromEntries(new URLSearchParams(w.location.search)); } catch (e) { params = {}; }

  function getStore(k, session) {
    try { return (session ? w.sessionStorage : w.localStorage).getItem(k); } catch (e) { return null; }
  }
  function signal(ok, reason) {
    try {
      if (ok) { if (typeof w.gmLeadSuccess === 'function') w.gmLeadSuccess(); }
      else if (typeof w.gmLeadFail === 'function') w.gmLeadFail(reason || 'unknown');
    } catch (e) { /* 추적 코드 오류가 폼을 막지 않게 */ }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* 미리 채우기 — 진료 분야 */
  var subj = params.subject || params.topic || params.dept || '';
  if (subj && $('subject')) {
    var opts = $('subject').options;
    for (var i = 0; i < opts.length; i++) if (opts[i].value === subj) { $('subject').selectedIndex = i; break; }
  }
  /* 미리 채우기 — 2분 자가진단 결과(글 또는 {summary, …} JSON) */
  var raw = params.selfcheck || params.selfcheck_result || getStore('apple_selfcheck_result', true) || getStore('apple_selfcheck_result') || '';
  var scText = '';
  if (raw) {
    scText = String(raw);
    try {
      var o = JSON.parse(raw);
      if (o && typeof o === 'object') scText = o.summary || o.text || [o.areaLabel || o.area, o.levelLabel || o.level].filter(Boolean).join(' · ') || scText;
    } catch (e) { /* 글 그대로 */ }
    scText = scText.slice(0, 2000);
    if ($('selfcheck_result')) $('selfcheck_result').value = scText;
    var note = form.querySelector('[data-selfcheck-note]');
    if (note && scText) {
      note.textContent = '2분 치아 자가진단 결과가 신청서에 함께 담깁니다: ' + (scText.length > 90 ? scText.slice(0, 90) + '…' : scText);
      note.hidden = false;
    }
  }

  /* 연락처: 숫자만 받아 하이픈 넣기 */
  var phone = $('phone');
  if (phone) {
    phone.addEventListener('input', function () {
      var v = phone.value.replace(/[^0-9]/g, '').slice(0, 11);
      var out = v;
      if (/^02/.test(v)) out = v.length > 9 ? v.replace(/^(02)(\d{4})(\d+)/, '$1-$2-$3') : v.replace(/^(02)(\d{3})(\d*)/, '$1-$2-$3');
      else if (v.length > 10) out = v.replace(/^(\d{3})(\d{4})(\d+)/, '$1-$2-$3');
      else if (v.length > 6) out = v.replace(/^(\d{3})(\d{3})(\d*)/, '$1-$2-$3');
      else if (v.length > 3) out = v.replace(/^(\d{3})(\d*)/, '$1-$2');
      phone.value = out.replace(/-$/, '');
    });
  }

  function setErr(el, msgId, msg) {
    var m = d.getElementById(msgId);
    if (el) el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (m) { m.textContent = msg || ''; m.hidden = !msg; }
  }
  var CHECKS = {
    name: function () { return ($('name').value || '').trim().length < 2 ? '성함을 2자 이상 적어 주세요.' : ''; },
    phone: function () { return /^0\d{8,10}$/.test(($('phone').value || '').replace(/[^0-9]/g, '')) ? '' : '연락받으실 전화번호를 적어 주세요.'; },
    agree: function () { return $('agree').checked ? '' : '개인정보 수집·이용에 동의해 주셔야 신청할 수 있습니다.'; },
  };
  var ERR_ID = { name: 'cf-name-err', phone: 'cf-phone-err', agree: 'cf-agree-err' };
  var REASON = { name: 'name_missing', phone: 'phone_invalid', agree: 'consent_missing' };
  function validate() {
    var errs = [];
    ['name', 'phone', 'agree'].forEach(function (n) {
      var msg = CHECKS[n]();
      setErr($(n), ERR_ID[n], msg);
      if (msg) errs.push([n, REASON[n]]);
    });
    return errs;
  }
  // 오류가 난 칸은 고치는 즉시(입력 중에) 오류를 지운다. 칸을 떠날 때(blur) 지우면 그 순간 화면이 밀려
  // 다음에 누른 곳(동의 체크 등)이 빗나간다.
  ['name', 'phone'].forEach(function (n) {
    var el = $(n);
    if (el) el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true' && !CHECKS[n]()) setErr(el, ERR_ID[n], ''); });
  });
  if ($('agree')) $('agree').addEventListener('change', function () { if ($('agree').checked) setErr($('agree'), ERR_ID.agree, ''); });

  function save(lead) {
    try {
      var list = JSON.parse(w.localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(list)) list = [];
      list.push(lead);
      w.localStorage.setItem(KEY, JSON.stringify(list.slice(-200)));
      return true;
    } catch (e) { return false; }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var errs = validate();
    if (errs.length) {
      var first = $(errs[0][0]);
      if (first && first.focus) first.focus();
      signal(false, errs.map(function (x) { return x[1]; }).join(','));
      return;
    }
    var digits = $('phone').value.replace(/[^0-9]/g, '');
    var demo = form.getAttribute('data-demo') !== '0';
    var lead = {
      id: 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
      name: $('name').value.trim(),
      phone: $('phone').value.trim(),
      phoneDigits: digits,
      subject: $('subject') ? $('subject').value : '',
      contactTime: $('contact_time') ? $('contact_time').value : '',
      message: $('message') ? $('message').value.trim() : '',
      selfcheckResult: $('selfcheck_result') ? $('selfcheck_result').value : '',
      source: form.getAttribute('data-source') || '',
      page: w.location.pathname,
      referrer: d.referrer || '',
      status: 'new',
      demo: demo,
    };
    var stored = save(lead);
    form.classList.add('is-sent');
    var done = form.querySelector('.consult__done');
    var telHref = 'tel:' + esc(phoneNo.replace(/[^0-9+]/g, ''));
    if (done) {
      done.innerHTML = (demo
        ? '<h3 class="consult__done-t">' + esc(lead.name) + '님, 신청서 작성을 마쳤습니다</h3>' +
          '<p class="consult__done-demo">데모 화면이라 병원에 전달되지 않습니다. ' + (stored ? '신청 내용은 이 브라우저에만 저장되어 관리자 데모 화면에서 볼 수 있습니다.' : '이 브라우저는 저장소를 쓸 수 없어 기록도 남지 않았습니다.') + '</p>' +
          '<p>실제 상담·예약은 전화 <a href="' + telHref + '" data-gm-event="lead_call">' + esc(phoneNo) + '</a> 또는 네이버 예약을 이용해 주세요.</p>'
        : '<h3 class="consult__done-t">' + esc(lead.name) + '님, 상담 신청을 받았습니다</h3>' +
          '<p>병원에서 확인한 뒤 남겨 주신 연락처로 전화드리겠습니다. 급하신 경우 전화 <a href="' + telHref + '" data-gm-event="lead_call">' + esc(phoneNo) + '</a>로 연락 주세요.</p>') +
        '<div class="consult__done-actions"><button type="button" class="btn btn--line btn--sm" data-consult-again>다시 쓰기</button></div>';
      done.hidden = false;
      done.focus();
      var again = done.querySelector('[data-consult-again]');
      if (again) again.addEventListener('click', function () {
        form.reset();
        if ($('selfcheck_result')) $('selfcheck_result').value = scText;
        form.classList.remove('is-sent');
        done.hidden = true;
        done.innerHTML = '';
        $('name').focus();
      });
    }
    signal(true);
  });
})();


/* ── 20-home.js ── */
/* 20-home — 홈 상호작용: 층별 안내(1100px 이상은 늘 한 층이 열린 탭, 좁으면 그 층 아래로 펼침) · 나이테(물결·연혁 줄과 강조 연동) */
(function () {
  'use strict';
  var d = document;
  var w = window;
  if (!d.body || !d.body.classList.contains('page-home')) return;
  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ── 1. 층별 안내 ─────────────────────────────────────────────── */
  var bldg = d.querySelector('[data-floors]');
  if (bldg) {
    var btns = Array.prototype.slice.call(bldg.querySelectorAll('[data-floor-btn]'));
    var panels = btns.map(function (b) { return d.getElementById(b.getAttribute('aria-controls')); });
    var wide = w.matchMedia ? w.matchMedia('(min-width: 1100px)') : { matches: true };
    var defFloor = bldg.getAttribute('data-default') || '';
    var defIdx = Math.max(0, btns.findIndex(function (b) { return b.closest('[data-floor]').getAttribute('data-floor') === defFloor; }));
    var current = -1;
    // 판은 class 로 보이고 숨긴다(is-shown). 큰 화면은 모든 판이 한 칸에 겹쳐 있고 안 고른 판은 visibility:hidden 이라
    // 칸 높이가 늘 같다 — 층을 바꿔도 목록이 움직이지 않는다. 좁은 화면은 안 고른 판을 display:none 으로 접는다.
    var set = function (i) {
      current = i;
      btns.forEach(function (b, k) {
        var on = k === i;
        b.setAttribute('aria-expanded', on ? 'true' : 'false');
        b.closest('.hx-fl').classList.toggle('is-open', on);
        if (panels[k]) panels[k].classList.toggle('is-shown', on);
      });
    };
    var openAt = function (i) { if (i !== current) set(i); };
    // 처음: 큰 화면은 기본 층(2층 접수) 하나를 연다. 좁은 화면은 모두 접는다.
    set(wide.matches ? defIdx : -1);
    bldg.classList.add('is-ready');
    var onWide = function () { if (wide.matches && current < 0) set(defIdx); };
    if (wide.addEventListener) wide.addEventListener('change', onWide); else if (wide.addListener) wide.addListener(onWide);

    var timer = 0;
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () {
        if (wide.matches) openAt(i);
        else set(current === i ? -1 : i);
      });
      // 큰 화면: 마우스를 잠깐 올려 두면 그 층으로(지나가는 마우스에 흔들리지 않게 조금 기다린다)
      b.addEventListener('mouseenter', function () {
        if (!wide.matches) return;
        w.clearTimeout(timer);
        timer = w.setTimeout(function () { openAt(i); }, 140);
      });
      b.addEventListener('mouseleave', function () { w.clearTimeout(timer); });
      // ↑↓ Home End 로 층 사이를 옮긴다(큰 화면은 옮긴 층이 바로 열린다)
      b.addEventListener('keydown', function (e) {
        var j = -1;
        if (e.key === 'ArrowDown') j = (i + 1) % btns.length;
        else if (e.key === 'ArrowUp') j = (i - 1 + btns.length) % btns.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = btns.length - 1;
        if (j < 0) return;
        e.preventDefault();
        btns[j].focus();
        if (wide.matches) openAt(j);
      });
    });
  }

  /* ── 2. 나이테: 화면에 들어오면 속심부터 바깥으로 물결 한 번 · 연혁 줄에 마우스·포커스를 두면 그 해 겹 강조 ─── */
  var rings = d.querySelector('[data-rings] svg');
  if (rings) {
    var mark = function (year, on) {
      each(rings.querySelectorAll('[data-year="' + year + '"]'), function (n) { n.classList.toggle('is-hot', on); });
      each(d.querySelectorAll('.hx-ms__item[data-year="' + year + '"]'), function (n) { n.classList.toggle('is-hot', on); });
    };
    each(d.querySelectorAll('.hx-ms__item[data-year]'), function (li) {
      var y = li.getAttribute('data-year');
      li.addEventListener('mouseenter', function () { mark(y, true); });
      li.addEventListener('mouseleave', function () { mark(y, false); });
      li.addEventListener('focus', function () { mark(y, true); });
      li.addEventListener('blur', function () { mark(y, false); });
    });
    if (!reduce && 'IntersectionObserver' in w) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          rings.classList.add('is-wave');
          io.disconnect();
          w.setTimeout(function () { rings.classList.remove('is-wave'); }, 3200);
        });
      }, { threshold: 0.35 });
      io.observe(rings);
    }
  }
})();


/* ── 30-clinic.js ── */
/* 30-clinic — 진료 페이지 하위 메뉴 탭(clinic.mjs 의 [data-cl-tabs])
   좁은 화면에서 탭이 옆으로 넘칠 때: 지금 페이지 탭이 보이게 처음 위치를 맞추고, 옆에 더 있으면 가장자리를 흐리게 한다.
   다른 페이지에는 [data-cl-tabs] 가 없어 아무 일도 하지 않는다. */
(function () {
  'use strict';
  var d = document;
  var w = window;
  var boxes = d.querySelectorAll('[data-cl-tabs]');
  if (!boxes.length) return;

  function edges(box) {
    var max = box.scrollWidth - box.clientWidth;
    var x = box.scrollLeft;
    box.classList.toggle('is-more-l', max > 2 && x > 2);
    box.classList.toggle('is-more-r', max > 2 && x < max - 2);
  }

  Array.prototype.forEach.call(boxes, function (box) {
    var cur = box.querySelector('[aria-current="page"]');
    if (cur && box.scrollWidth > box.clientWidth) {
      // 지금 탭을 가운데쯤으로(첫 탭이면 0 그대로)
      var at = cur.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft;
      box.scrollLeft = Math.max(0, at - (box.clientWidth - cur.offsetWidth) / 2);
    }
    edges(box);
    var ticking = false;
    box.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      w.requestAnimationFrame(function () { ticking = false; edges(box); });
    }, { passive: true });
  });

  var t = null;
  w.addEventListener('resize', function () {
    if (t) w.clearTimeout(t);
    t = w.setTimeout(function () { Array.prototype.forEach.call(boxes, edges); }, 120);
  });
})();


/* ── 31-doctors.js ── */
/* 31-doctors — 의료진 목록(/doctors/)의 진료과 필터를 주소와 잇는다(필터 동작 자체는 00-core 의 doctorFilter).
   - 주소 ?dept=<진료과 id>(예: /doctors/?dept=orthodontics#all)로 들어오면 그 진료과를 미리 고른다.
   - 진료과를 고르면 주소의 ?dept= 를 바꿔 둔다(공유·새로고침해도 같은 진료과). 스크립트가 없으면 17명이 모두 보인다. */
(function () {
  'use strict';
  var d = document;
  var w = window;
  var flt = d.querySelector('.page-doctors [data-doc-filter]');
  if (!flt) return;

  function chip(dept) {
    var list = flt.querySelectorAll('button[data-dept]');
    for (var i = 0; i < list.length; i++) if (list[i].getAttribute('data-dept') === dept) return list[i];
    return null;
  }

  var m = /[?&]dept=([^&#]*)/.exec(w.location.search);
  if (m) {
    var want = '';
    try { want = decodeURIComponent(m[1]); } catch (e) { want = ''; }
    var b = want ? chip(want) : null;
    if (b && b.getAttribute('aria-pressed') !== 'true') b.click();
  }

  flt.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button[data-dept]') : null;
    if (!b || !w.history || !w.history.replaceState) return;
    var dept = b.getAttribute('data-dept') || '';
    var q = w.location.search.replace(/^\?/, '').split('&').filter(function (p) { return p && p.indexOf('dept=') !== 0; });
    if (dept) q.push('dept=' + encodeURIComponent(dept));
    try { w.history.replaceState(null, '', w.location.pathname + (q.length ? '?' + q.join('&') : '') + w.location.hash); } catch (err) { /* 주소를 못 바꾸는 환경 — 무시 */ }
  });
})();


/* ── 33-pricing.js ── */
/* 33-pricing — 비급여 진료비(/pricing/) 분야 탭 · 항목 이름 찾기 · 보증(/warranty/) 임플란트 종류 고르기
   - 도구는 html.js 일 때만 CSS 로 보인다(스크립트가 없으면 표가 전부 보이고 도구만 숨는다).
   - 다른 파일과 전역을 나누지 않는다(이 파일 안에서 닫힌 IIFE). 해당 요소가 없는 페이지에서는 아무것도 하지 않는다. */
(function () {
  'use strict';
  var d = document;
  var w = window;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var reduce = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  /** 찾기용 글자 맞추기: 소문자로, 띄어쓰기·문장부호는 뺀다('E-max' = 'emax', '투명 교정' = '투명교정') */
  function norm(s) { return String(s || '').toLowerCase().replace(/[\s·・.,:;()[\]{}\/\\\-–—_'"‘’“”~+*!?|]+/g, ''); }
  function headerH() { var hd = d.getElementById('site-header'); return hd ? hd.getBoundingClientRect().height : 0; }
  function scrollY() { return w.scrollY || w.pageYOffset || 0; }

  var root = d.querySelector('[data-pr]');
  if (root) pricing(root);
  var pick = d.querySelector('[data-wr-pick]');
  if (pick) picker(pick);

  /* ── 1. 비급여 진료비: 분야 탭 + 항목 이름 찾기 ───────────────────────────── */
  function pricing(root) {
    var input = root.querySelector('[data-pr-q]');
    var clearBtn = root.querySelector('[data-pr-clear]');
    var cats = root.querySelector('[data-pr-cats]');
    var countEl = root.querySelector('[data-pr-count]');
    var empty = root.querySelector('[data-pr-empty]');
    var emptyT = root.querySelector('[data-pr-empty-t]');
    var allBtn = root.querySelector('[data-pr-all]');
    var resetBtn = root.querySelector('[data-pr-reset]');
    var anchor = root.querySelector('[data-pr-anchor]') || root;
    if (!input || !cats) return;

    // 쉬운 말 짝(구치↔어금니 …): 표 글자에 앞의 말이 있으면 뒤의 말로도 찾히게
    var syn = [];
    try { syn = JSON.parse(root.getAttribute('data-pr-syn') || '[]'); } catch (e) { syn = []; }
    syn = syn.map(function (p) { return [norm(p && p[0]), norm(p && p[1])]; }).filter(function (p) { return p[0] && p[1]; });

    var secs = [];
    var names = {};
    each(root.querySelectorAll('.price-cat'), function (sec) {
      var id = String(sec.id || '').replace(/^price-/, '');
      var t = sec.querySelector('.price-cat__title');
      var name = t ? t.textContent.trim() : id;
      names[id] = name;
      var rows = [];
      var prev = null;
      var g = -1;
      each(sec.querySelectorAll('tbody tr'), function (tr) {
        var th = tr.querySelector('th');
        var nm = th ? th.textContent.trim() : '';
        if (nm !== prev) { g++; prev = nm; }
        var bits = [nm, name];
        each(tr.querySelectorAll('td[data-label="종류"], td[data-label="기준"]'), function (td) { bits.push(td.textContent); });
        var text = norm(bits.join(' '));
        syn.forEach(function (p) { if (text.indexOf(p[0]) > -1 && text.indexOf(p[1]) < 0) text += '|' + p[1]; });
        rows.push({ tr: tr, th: th, text: text, g: g });
      });
      if (rows.length) secs.push({ el: sec, id: id, name: name, rows: rows });
    });
    if (!secs.length) return;
    var state = { cat: '', q: '' };

    // 같은 항목 이름이 이어지는 줄(rowspan)을 보이는 줄에 맞춰 다시 묶는다 — 가운데 줄이 숨어도 표가 어긋나지 않게
    function respan(s) {
      var groups = {};
      s.rows.forEach(function (r) { if (!r.tr.hidden && r.th) (groups[r.g] = groups[r.g] || []).push(r); });
      Object.keys(groups).forEach(function (k) {
        var list = groups[k];
        list.forEach(function (r, i) {
          if (i === 0) {
            r.th.classList.remove('is-merged');
            if (list.length > 1) r.th.setAttribute('rowspan', String(list.length)); else r.th.removeAttribute('rowspan');
          } else {
            r.th.classList.add('is-merged');
            r.th.removeAttribute('rowspan');
          }
        });
      });
    }

    function render() {
      var q = norm(state.q);
      var label = String(state.q || '').trim();
      var n = 0;
      var nSecs = 0;
      var elsewhere = 0;
      secs.forEach(function (s) {
        var inCat = !state.cat || s.id === state.cat;
        var k = 0;
        s.rows.forEach(function (r) {
          var hit = !q || r.text.indexOf(q) > -1;
          if (hit && !inCat) elsewhere++;
          var ok = inCat && hit;
          r.tr.hidden = !ok;
          if (ok) k++;
        });
        s.el.hidden = !k;
        if (k) { nSecs++; respan(s); }
        n += k;
      });
      var catName = state.cat ? names[state.cat] : '';
      var msg;
      if (!n) msg = '맞는 항목이 없습니다';
      else if (!label && !catName) msg = nSecs + '개 분야 ' + n + '개 항목';
      else if (!label) msg = catName + ' ' + n + '개 항목';
      else msg = (catName ? catName + '에서 ' : '') + '‘' + label + '’ ' + n + '개 항목';
      if (countEl && countEl.textContent !== msg) countEl.textContent = msg;
      root.classList.toggle('is-filtered', !!(q || state.cat));
      if (empty) {
        empty.hidden = n > 0;
        if (!n) {
          if (emptyT) emptyT.textContent = label ? '‘' + label + '’에 맞는 항목이 없습니다.' : '맞는 항목이 없습니다.';
          if (allBtn) {
            allBtn.hidden = !(state.cat && elsewhere);
            allBtn.textContent = '전체 분야에서 ' + elsewhere + '개 항목 보기';
          }
        }
      }
    }

    function setQ(v) {
      input.value = v;
      if (clearBtn) clearBtn.hidden = !v;
      state.q = v;
      render();
    }
    function setCat(id, user) {
      if (id && !Object.prototype.hasOwnProperty.call(names, id)) id = '';
      state.cat = id;
      var onBtn = null;
      each(cats.querySelectorAll('button[data-cat]'), function (x) {
        var on = (x.getAttribute('data-cat') || '') === id;
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) onBtn = x;
      });
      // 좁은 화면(옆으로 미는 버튼 줄)에서는 고른 버튼이 줄 안에 보이게 민다 — 페이지는 움직이지 않는다
      if (onBtn && cats.scrollWidth > cats.clientWidth + 2) {
        var left = Math.max(0, onBtn.offsetLeft - (cats.clientWidth - onBtn.offsetWidth) / 2);
        if (cats.scrollTo) cats.scrollTo({ left: left, behavior: reduce || !user ? 'auto' : 'smooth' }); else cats.scrollLeft = left;
      }
      render();
      // 고른 분야를 주소에 남긴다(#price-<분야>) — 다시 열거나 보낼 때 그 분야로 열린다
      if (w.history && w.history.replaceState) {
        try { w.history.replaceState(null, '', id ? '#price-' + id : w.location.pathname + w.location.search); } catch (e) { /* 무시 */ }
      }
      if (user) toResults(false);
    }
    // 표 머리가 헤더 위로 올라가 있으면(표를 읽다가 분야를 바꾸면) 표 머리로 돌아간다
    function toResults(force) {
      var top = anchor.getBoundingClientRect().top;
      var hh = headerH();
      if (force || top < hh) w.scrollTo({ top: Math.max(0, scrollY() + top - hh - 16), behavior: reduce || force ? 'auto' : 'smooth' });
    }

    var timer = 0;
    input.addEventListener('input', function () {
      if (clearBtn) clearBtn.hidden = !input.value;
      w.clearTimeout(timer);
      timer = w.setTimeout(function () { state.q = input.value; render(); }, 160);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && input.value) { e.preventDefault(); w.clearTimeout(timer); setQ(''); }
      if (e.key === 'Enter') { e.preventDefault(); w.clearTimeout(timer); state.q = input.value; render(); }
    });
    if (clearBtn) clearBtn.addEventListener('click', function () { w.clearTimeout(timer); setQ(''); input.focus(); });
    cats.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-cat]') : null;
      if (b) setCat(b.getAttribute('data-cat') || '', true);
    });
    if (allBtn) allBtn.addEventListener('click', function () { setCat('', false); input.focus(); });
    if (resetBtn) resetBtn.addEventListener('click', function () { w.clearTimeout(timer); setQ(''); setCat('', false); input.focus(); });

    // 처음: 주소가 #price-<분야> 면 그 분야를 골라 표 머리로
    var m = /^#price-(.+)$/.exec(w.location.hash || '');
    var first = m ? decodeURIComponent(m[1]) : '';
    if (first && Object.prototype.hasOwnProperty.call(names, first)) {
      setCat(first, false);
      w.requestAnimationFrame(function () { toResults(true); });
    } else {
      if (input.value) { state.q = input.value; if (clearBtn) clearBtn.hidden = false; } // 뒤로 가기로 돌아와 입력칸이 채워져 있을 때
      render();
    }
  }

  /* ── 2. 보증: 임플란트 종류 고르기 — 그림·표의 그 줄을 강조하고 한 줄로 알려 준다 ─── */
  function picker(box) {
    var out = box.querySelector('[data-wr-out]');
    var def = out ? out.textContent : '';
    var rows = d.querySelectorAll('[data-wr-row]');
    box.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-wr-target]') : null;
      if (!b) return;
      var on = b.getAttribute('aria-pressed') !== 'true';
      each(box.querySelectorAll('button[data-wr-target]'), function (x) { x.setAttribute('aria-pressed', on && x === b ? 'true' : 'false'); });
      var t = on ? b.getAttribute('data-wr-target') : null;
      each(rows, function (r) {
        var me = t !== null && r.getAttribute('data-wr-row') === t;
        r.classList.toggle('is-picked', me);
        r.classList.toggle('is-dim', t !== null && !me);
      });
      if (out) {
        out.textContent = on ? (b.getAttribute('data-wr-say') || def) : def;
        out.classList.toggle('is-on', on);
      }
    });
  }
})();


/* ── 35-about.js ── */
/* 35-about — 병원소개·오시는 길 페이지 동작(src/templates/about.mjs 와 짝). 해당 요소가 없는 페이지에서는 아무것도 하지 않는다.
   1. 사진 크게 보기: [data-ab-lightbox] 안의 a[data-ab-lb-item] → dialog[data-ab-lb-dialog]
      Enter·누르기로 열기 · Esc·닫기·바깥 누르기로 닫기 · ←/→(Home/End) 넘기기 · 밀어서 넘기기 · Tab 은 창 안에서만 돈다
      · 닫으면 연 사진으로 포커스가 돌아간다 · 큰 사진은 열 때 불러오고 앞뒤 한 장씩 미리 받는다.
      dialog.showModal 이 없는 브라우저에서는 링크가 사진 파일을 그대로 연다.
   2. 주소 복사: button[data-ab-copy] — 스크립트가 있을 때만 보인다. 결과는 [data-ab-copy-msg](role=status)로 알린다. */
(function () {
  'use strict';
  var d = document;
  var w = window;
  var root = d.documentElement;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ── 1. 사진 크게 보기 ─────────────────────────────────────────── */
  var dlg = d.querySelector('[data-ab-lb-dialog]');
  var groups = d.querySelectorAll('[data-ab-lightbox]');
  if (dlg && groups.length && typeof dlg.showModal === 'function') {
    var stage = dlg.querySelector('[data-ab-lb-stage]');
    var capEl = dlg.querySelector('[data-ab-lb-out-cap]');
    var grpEl = dlg.querySelector('[data-ab-lb-out-grp]');
    var cntEl = dlg.querySelector('[data-ab-lb-out-count]');
    var live = dlg.querySelector('[data-ab-lb-live]');
    var btnClose = dlg.querySelector('[data-ab-lb-close]');
    var btnPrev = dlg.querySelector('[data-ab-lb-prev]');
    var btnNext = dlg.querySelector('[data-ab-lb-next]');
    var img = d.createElement('img');
    img.className = 'ab-lb__img';
    img.alt = '';
    img.decoding = 'async';
    stage.appendChild(img);
    var list = [];
    var cur = 0;
    var opener = null;
    var loaded = {};

    var hrefOf = function (a) { return a.getAttribute('href'); };
    var preload = function (i) {
      var n = list.length;
      if (n < 2) return;
      var u = hrefOf(list[(i + n) % n]);
      if (loaded[u]) return;
      loaded[u] = true;
      var im = new Image();
      im.decoding = 'async';
      im.src = u;
    };
    var show = function (i) {
      var n = list.length;
      if (!n) return;
      cur = (i + n) % n;
      var a = list[cur];
      var t = a.querySelector('img');
      var cap = a.getAttribute('data-ab-lb-cap') || '';
      var grp = a.getAttribute('data-ab-lb-grp') || '';
      if (t && t.getAttribute('width')) { img.width = +t.getAttribute('width'); img.height = +t.getAttribute('height'); }
      img.alt = t ? t.alt : cap;
      img.src = hrefOf(a);
      loaded[hrefOf(a)] = true;
      capEl.textContent = cap;
      grpEl.textContent = grp;
      cntEl.textContent = (cur + 1) + ' / ' + n;
      live.textContent = n + '장 중 ' + (cur + 1) + '번째 · ' + (grp ? grp + ' · ' : '') + cap;
      btnPrev.hidden = btnNext.hidden = n < 2;
      preload(cur + 1);
      preload(cur - 1);
    };
    var open = function (group, a) {
      list = Array.prototype.slice.call(group.querySelectorAll('a[data-ab-lb-item]'));
      opener = a;
      show(Math.max(0, list.indexOf(a)));
      root.classList.add('ab-lb-open');
      dlg.showModal();
      btnClose.focus();
    };
    var close = function () { if (dlg.open) dlg.close(); };

    each(groups, function (g) {
      g.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var a = e.target.closest ? e.target.closest('a[data-ab-lb-item]') : null;
        if (!a || !g.contains(a)) return;
        e.preventDefault();
        open(g, a);
      });
    });
    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { show(cur - 1); });
    btnNext.addEventListener('click', function () { show(cur + 1); });
    // 바깥(사진·버튼·글자가 아닌 곳)을 누르면 닫는다
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target === stage) close(); });
    dlg.addEventListener('close', function () {
      root.classList.remove('ab-lb-open');
      if (opener && opener.focus) { try { opener.focus({ preventScroll: true }); } catch (err) { opener.focus(); } }
    });
    dlg.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'Left') { e.preventDefault(); show(cur - 1); }
      else if (k === 'ArrowRight' || k === 'Right') { e.preventDefault(); show(cur + 1); }
      else if (k === 'Home') { e.preventDefault(); show(0); }
      else if (k === 'End') { e.preventDefault(); show(list.length - 1); }
      else if (k === 'Tab') {
        // 포커스 가둠: 창 안의 버튼(닫기·이전·다음)만 돈다
        var f = Array.prototype.filter.call(dlg.querySelectorAll('button'), function (b) { return !b.hidden && b.offsetParent !== null; });
        if (!f.length) return;
        var i = f.indexOf(d.activeElement);
        e.preventDefault();
        var nx = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === -1 || i >= f.length - 1 ? 0 : i + 1);
        f[nx].focus();
      }
    });
    // 밀어서 넘기기(터치)
    var tx = 0;
    var ty = 0;
    stage.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      var t = e.changedTouches[0];
      var dx = t.clientX - tx;
      var dy = t.clientY - ty;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.3) show(cur + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* ── 2. 주소 복사 ─────────────────────────────────────────────── */
  var legacyCopy = function (text) {
    var ta = d.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    d.body.appendChild(ta);
    var ok = false;
    try { ta.select(); ta.setSelectionRange(0, text.length); ok = d.execCommand('copy'); } catch (e) { ok = false; }
    d.body.removeChild(ta);
    return !!ok;
  };
  each(d.querySelectorAll('button[data-ab-copy]'), function (btn) {
    var scope = btn.closest ? btn.closest('[data-ab-copy-scope]') : null;
    var msg = scope ? scope.querySelector('[data-ab-copy-msg]') : null;
    var label = btn.querySelector('[data-ab-copy-label]');
    var orig = label ? label.textContent : btn.textContent;
    var timer = 0;
    btn.hidden = false;
    var done = function (ok, text) {
      if (label) label.textContent = ok ? '복사했습니다' : orig;
      btn.classList.toggle('is-done', ok);
      if (msg) msg.textContent = ok ? '주소를 복사했습니다: ' + text : '복사하지 못했습니다. 위 주소를 길게 눌러 복사해 주세요.';
      w.clearTimeout(timer);
      timer = w.setTimeout(function () {
        if (label) label.textContent = orig;
        btn.classList.remove('is-done');
        if (msg) msg.textContent = '';
      }, 4000);
    };
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-ab-copy') || '';
      if (!text) return;
      var fallback = function () { var ok = legacyCopy(text); btn.focus(); done(ok, text); };
      if (w.navigator.clipboard && w.navigator.clipboard.writeText) {
        w.navigator.clipboard.writeText(text).then(function () { done(true, text); }, fallback);
      } else fallback();
    });
  });
})();


/* ── 57-news.js ── */
/* 57-news — 소식(/news/) 게시판 탭: 전체·병원 소식·언론보도·학술행사·사회공헌·의료칼럼
   [data-news-filter] 버튼 묶음이 있는 페이지에서만 움직인다(스크립트가 없으면 탭은 숨은 채 다섯 게시판이 모두 보인다).
   고른 게시판은 주소 ?board=<id> 로 남겨, 그 주소로 다시 들어오면 같은 게시판이 열린다. */
(function () {
  'use strict';
  var d = document;
  var w = window;
  var bar = d.querySelector('[data-news-filter]');
  if (!bar) return;
  var boards = d.querySelectorAll('[data-news-board]');
  if (!boards.length) return;
  var live = d.querySelector('[data-news-live]');
  var buttons = bar.querySelectorAll('button[data-board]');
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  var ids = [];
  each(boards, function (b) { ids.push(b.getAttribute('data-news-board')); });

  function apply(id, announce) {
    if (id && ids.indexOf(id) < 0) id = '';
    var shown = 0;
    var label = '전체';
    each(buttons, function (btn) {
      var on = btn.getAttribute('data-board') === id;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) label = btn.getAttribute('data-name') || label;
    });
    each(boards, function (b) {
      var show = !id || b.getAttribute('data-news-board') === id;
      b.hidden = !show;
      if (show) shown += b.querySelectorAll('.news-list__item').length;
    });
    if (announce && live) live.textContent = label + ' 글 ' + shown + '건을 보여 줍니다.';
    try {
      var u = new URL(w.location.href);
      if (id) u.searchParams.set('board', id); else u.searchParams.delete('board');
      if (w.history && w.history.replaceState) w.history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) { /* 오래된 브라우저 — 주소만 그대로 */ }
  }

  bar.hidden = false;
  bar.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('button[data-board]') : null;
    if (!btn) return;
    apply(btn.getAttribute('data-board') || '', true);
  });

  var start = '';
  try { start = new URLSearchParams(w.location.search).get('board') || ''; } catch (e) { start = ''; }
  if (start) apply(start, false);
})();
