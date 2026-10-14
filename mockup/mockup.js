/* mockup.js — 원장 보고용 목업 소개 페이지(docs/mockup/)
   1) 노트북·휴대폰 틀 안 데모 화면(iframe)을 1440px·390px 그대로 그린 뒤 틀 폭에 맞춰 줄인다(--s).
   2) 탭(링크 target=iframe 이름 — 스크립트가 없어도 동작) → 주소 막대·'새 창에서 열기'·탭 표시를 맞춘다.
      화면 안에서 다른 페이지로 옮겨 가도 따라간다.
   3) 화면은 처음엔 잠가 둔다(마우스 휠·손가락 스크롤을 화면이 빼앗지 않게). 누르면 직접 둘러보기,
      마우스가 화면 밖으로 나가거나 화면이 시야에서 사라지면 다시 잠근다.
   4) 자동 스크롤 켜기/끄기 — 사람이 화면을 만지면 멈추고, 화면이 시야 밖이면 쉰다.
   5) ../assets/data/compare.json → 비교표 + 그로스메이트 AEO 점검 칸(null 이면 '측정 예정').
   6) 새 사이트 페이지 수 = ../sitemap.xml 의 주소 수.
   그로스메이트: 데모 화면은 ?gm=off 로 불러 운영 광고주(34)에 시험 신호(특히 자동 스크롤)가 섞이지 않게 한다.
   ?gm=off 는 이 브라우저에 '끔' 표시를 남기므로, 목업을 열기 전에 꺼져 있지 않았다면 목업을 떠날 때 원래대로 돌린다. */
(function () {
  'use strict';
  var d = document;
  d.documentElement.classList.add('mk-js');

  var mq = function (q) { return !!(window.matchMedia && window.matchMedia(q).matches); };
  var REDUCE = mq('(prefers-reduced-motion: reduce)');
  var HOVER = mq('(hover: hover) and (pointer: fine)');
  var SHOW_HOST = 'kkwon91.github.io/appledental-demo/';
  // 이 페이지 주소 /appledental-demo/mockup/ → 데모 사이트 기준 경로 /appledental-demo/
  var BASE = location.pathname.replace(/mockup\/(index\.html)?$/, '');

  // ── 그로스메이트 '끔' 표시 되돌리기 ─────────────────────────────────────────
  var GM_KEY = 'apple_gm_off';
  var gmBefore = null;
  try { gmBefore = window.localStorage.getItem(GM_KEY); } catch (e) { /* 저장소를 못 쓰면 그대로 */ }
  window.addEventListener('pagehide', function () {
    if (gmBefore === '1') return;
    try { window.localStorage.removeItem(GM_KEY); } catch (e) { /* 무시 */ }
  });
  window.addEventListener('pageshow', function (ev) {
    // 뒤로 가기로 돌아오면 화면(iframe)이 그대로 살아 있으므로 다시 꺼 둔다
    if (!ev.persisted || gmBefore === '1') return;
    try { window.localStorage.setItem(GM_KEY, '1'); } catch (e) { /* 무시 */ }
  });

  // ── 1~4) 기기 화면 ───────────────────────────────────────────────────────
  [].forEach.call(d.querySelectorAll('[data-device]'), setupDevice);

  function setupDevice(box) {
    var targetId = box.getAttribute('data-target');
    var stage = targetId ? d.getElementById(targetId) : box;
    if (!stage) return;
    var frame = stage.querySelector('[data-frame]');
    var view = stage.querySelector('[data-view]');
    var veil = stage.querySelector('[data-veil]');
    var urlEl = stage.querySelector('[data-url]');
    var openEl = box.querySelector('[data-open]');
    var autoBtn = box.querySelector('[data-auto]');
    var lockBtn = stage.querySelector('[data-lock]') || box.querySelector('[data-lock]'); // 기기 바로 아래(조작 중에도 손이 닿게)
    var tabs = [].slice.call(box.querySelectorAll('.mk-tab'));
    var label = box.getAttribute('data-label') || '';
    var speed = Number(box.getAttribute('data-speed')) || 120; // 화면 속 px / 초
    if (!frame || !view) return;

    // 1) 줄이기
    var W = Number(view.getAttribute('data-w')) || 1440;
    var fit = function () {
      var s = view.clientWidth / W;
      if (s > 0 && isFinite(s)) view.style.setProperty('--s', String(Math.round(s * 100000) / 100000));
    };
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(view);
    else window.addEventListener('resize', fit);

    var win = function () { try { return frame.contentWindow; } catch (e) { return null; } };

    // 3) 잠금 막
    var live = false;
    var setLive = function (on) {
      live = !!on;
      view.classList.toggle('is-live', live);
      if (veil) veil.hidden = live;
      if (lockBtn) lockBtn.hidden = !live || HOVER; // 마우스가 있으면 화면 밖으로 나갈 때 저절로 잠긴다
    };
    if (veil) {
      veil.hidden = false;
      veil.addEventListener('click', function (ev) {
        setLive(true);
        // 키보드로 눌렀을 때만 화면 안으로 초점을 옮긴다(마우스·손가락은 그대로 — 페이지가 움직이지 않게)
        if (ev.detail === 0) {
          try { frame.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
        }
      });
    }
    if (lockBtn) {
      lockBtn.addEventListener('click', function () {
        setLive(false);
        if (veil) { try { veil.focus({ preventScroll: true }); } catch (e) { /* 무시 */ } }
      });
    }
    if (HOVER) view.addEventListener('mouseleave', function () { if (live) setLive(false); });

    var visible = true;
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          visible = en.isIntersecting;
          if (!visible && live) setLive(false);
        });
      }, { threshold: 0 }).observe(view);
    }
    setLive(false);

    // 2) 탭·주소 막대·새 창 링크
    var relPath = function () {
      var w = win();
      if (!w) return null;
      try {
        var l = w.location;
        if (!l || l.href === 'about:blank') return null;
        var p = l.pathname;
        if (p.indexOf(BASE) === 0) p = p.slice(BASE.length);
        p = p.replace(/index\.html$/, '');
        var q = l.search.replace(/([?&])gm=(off|on)(&|$)/, function (m, a, v, b) { return b ? a : ''; });
        if (q === '?') q = '';
        return p + q;
      } catch (e) { return null; }
    };
    var markTab = function (rel) {
      var path = rel.split('?')[0];
      var best = null;
      var bestLen = -1;
      tabs.forEach(function (t) {
        var p = t.getAttribute('data-path') || '';
        var hit = p === '' ? path === '' : path.indexOf(p) === 0;
        if (hit && p.length > bestLen) { best = t; bestLen = p.length; }
      });
      tabs.forEach(function (t) {
        if (t === best) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
      });
      return best;
    };
    var showPath = function (rel) {
      if (urlEl) urlEl.textContent = SHOW_HOST + rel;
      if (openEl) openEl.setAttribute('href', '../' + rel);
    };
    var sync = function () {
      var rel = relPath();
      if (rel == null) return;
      showPath(rel);
      var t = markTab(rel);
      var name = t ? t.textContent.replace(/\s+/g, ' ').trim() : '';
      frame.setAttribute('title', '새 홈페이지 ' + label + ' 화면 미리보기' + (name ? ' — ' + name : ''));
    };
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { x.removeAttribute('aria-current'); });
        t.setAttribute('aria-current', 'true');
        showPath(t.getAttribute('data-path') || '');
      });
    });

    // 4) 자동 스크롤
    var auto = { on: false, raf: 0, y: 0, last: 0, wait: 0, end: false };
    var setAuto = function (on) {
      auto.on = !!on;
      if (autoBtn) {
        autoBtn.textContent = auto.on ? '자동 스크롤 끄기' : '자동 스크롤 켜기';
        autoBtn.classList.toggle('is-on', auto.on);
      }
      window.cancelAnimationFrame(auto.raf);
      if (!auto.on) return;
      var w = win();
      try { auto.y = w ? (w.scrollY || 0) : 0; } catch (e) { auto.y = 0; }
      auto.last = 0;
      auto.wait = 0;
      auto.end = false;
      auto.raf = window.requestAnimationFrame(step);
    };
    var step = function (ts) {
      if (!auto.on) return;
      auto.raf = window.requestAnimationFrame(step);
      var dt = auto.last ? Math.min(64, ts - auto.last) : 16;
      auto.last = ts;
      if (!visible || d.hidden || ts < auto.wait) return;
      var w = win();
      var de;
      try { de = w && w.document && w.document.documentElement; } catch (e) { return; }
      if (!de) return;
      var max = Math.max(0, de.scrollHeight - w.innerHeight);
      if (auto.end) { // 끝에서 잠깐 쉬었다가 맨 위로
        try { w.scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' }); } catch (e) { w.scrollTo(0, 0); }
        auto.y = 0;
        auto.end = false;
        auto.wait = ts + 1800;
        return;
      }
      auto.y += (speed * dt) / 1000;
      if (auto.y >= max) { auto.y = max; auto.end = true; auto.wait = ts + 2000; }
      try { w.scrollTo(0, Math.round(auto.y)); } catch (e) { /* 무시 */ }
    };
    if (autoBtn) {
      autoBtn.hidden = false;
      autoBtn.addEventListener('click', function () { setAuto(!auto.on); });
    }

    // 화면이 (다시) 열릴 때마다: 스크롤 막대 숨기기 · 사람 손이 닿으면 자동 스크롤 멈춤 · 주소 맞추기
    frame.addEventListener('load', function () {
      var w = win();
      var doc2;
      try { doc2 = w && w.document; } catch (e) { doc2 = null; }
      if (doc2 && doc2.documentElement) {
        try {
          var st = doc2.createElement('style');
          st.setAttribute('data-mockup', '');
          st.textContent = 'html{scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none;width:0;height:0}';
          (doc2.head || doc2.documentElement).appendChild(st);
        } catch (e) { /* 무시 */ }
        var stop = function () { if (auto.on) setAuto(false); };
        ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
          try { doc2.addEventListener(ev, stop, { passive: true }); } catch (e) { /* 무시 */ }
        });
        if (HOVER) {
          try { doc2.addEventListener('mouseout', function (e) { if (!e.relatedTarget && live) setLive(false); }); } catch (e) { /* 무시 */ }
        }
      }
      sync();
      if (auto.on) { auto.y = 0; auto.end = false; auto.wait = window.performance.now() + 900; }
    });
    sync();
  }

  // ── 5) 비교표 · AEO 점검 칸 ───────────────────────────────────────────────
  var cmpBox = d.querySelector('[data-compare]');
  var auditBox = d.querySelector('[data-audit]');
  var el = function (tag, cls, text) {
    var e = d.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  var txt = function (v) { return v == null ? '' : String(v).trim(); };
  var num = function (v) {
    if (typeof v === 'number' && isFinite(v)) return v;
    if (typeof v === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(v)) return Number(v);
    return null;
  };
  var fmtDate = function (v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(txt(v));
    return m ? m[1] + '년 ' + Number(m[2]) + '월 ' + Number(m[3]) + '일' : txt(v);
  };

  function renderCompare(data) {
    if (!cmpBox) return;
    var rows = Array.isArray(data.rows) ? data.rows.filter(function (r) { return r && typeof r === 'object'; }) : [];
    cmpBox.textContent = '';
    if (!rows.length) { cmpBox.appendChild(el('p', 'mk-loading', '비교 항목을 준비하고 있습니다.')); return; }
    var table = el('table');
    table.appendChild(el('caption', 'sr-only', '원본 appledental.kr 과 새 사이트 비교'));
    var thead = el('thead');
    var hr = el('tr');
    ['항목', '원본 appledental.kr', '새 사이트(시안)', '비고'].forEach(function (h) {
      var th = el('th', null, h);
      th.setAttribute('scope', 'col');
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tb = el('tbody');
    rows.forEach(function (r) {
      var tr = el('tr');
      var th = el('th', 'mk-col-label', txt(r.label) || '—');
      th.setAttribute('scope', 'row');
      th.setAttribute('data-label', '');
      tr.appendChild(th);
      [['before', '원본'], ['after', '새 사이트'], ['note', '비고']].forEach(function (c) {
        var v = txt(r[c[0]]);
        var td = el('td', 'mk-col-' + c[0]);
        td.setAttribute('data-label', c[1]);
        if (v) td.textContent = v;
        else {
          td.classList.add('is-empty');
          td.appendChild(el('span', 'mk-dash', '—'));
          td.appendChild(el('span', 'sr-only', '없음'));
        }
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    cmpBox.appendChild(table);
    var basis = d.querySelector('[data-compare-basis]');
    if (basis && txt(data.generatedAt)) {
      basis.textContent = '비교표 기준: ' + fmtDate(data.generatedAt);
      basis.hidden = false;
    }
  }

  // 점검 값: null(측정 전) · 숫자(점수) · 문자열 · { score|total|value, max|outOf, grade, label|text, summary|note, measuredAt|date|at, items|checks|metrics:[{label|name, value|score|status|result|pass}] }
  function auditInfo(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number' || typeof v === 'string') {
      var n = num(v);
      return n != null ? { score: n, max: null, grade: '', text: '', date: '', summary: '', items: [] } : { score: null, max: null, grade: '', text: txt(v), date: '', summary: '', items: [] };
    }
    if (typeof v !== 'object') return null;
    var pick = function () { for (var i = 0; i < arguments.length; i++) if (v[arguments[i]] != null) return v[arguments[i]]; return null; };
    var items = pick('items', 'checks', 'metrics');
    var o = {
      score: num(pick('score', 'total', 'value')),
      max: num(pick('max', 'outOf')),
      grade: txt(pick('grade')),
      text: txt(pick('label', 'text')),
      date: txt(pick('measuredAt', 'date', 'at', 'checkedAt')),
      summary: txt(pick('summary', 'note')),
      items: Array.isArray(items) ? items : [],
    };
    if (o.score == null && !o.text && !o.grade && !o.summary && !o.items.length) return null;
    return o;
  }

  function renderAudit(data) {
    if (!auditBox) return;
    var A = data.audit && typeof data.audit === 'object' ? data.audit : {};
    var info = { before: auditInfo(A.before), after: auditInfo(A.after) };
    ['before', 'after'].forEach(function (k) {
      var col = auditBox.querySelector('[data-audit-col="' + k + '"]');
      if (!col) return;
      var vEl = col.querySelector('[data-audit-v]');
      var more = col.querySelector('[data-audit-more]');
      var o = info[k];
      if (more) more.textContent = '';
      if (!vEl) return;
      if (!o) { vEl.className = 'mk-audit__v is-empty'; vEl.textContent = '측정 예정'; return; }
      vEl.textContent = '';
      if (o.score != null) {
        vEl.className = 'mk-audit__v';
        vEl.appendChild(d.createTextNode(String(o.score)));
        vEl.appendChild(el('small', null, o.max != null ? '/ ' + o.max + '점' : '점'));
      } else {
        vEl.className = 'mk-audit__v is-text';
        vEl.textContent = o.text || o.grade || '측정 완료';
      }
      if (!more) return;
      if (o.grade && o.score != null) more.appendChild(el('p', 'mk-audit__grade', '등급 ' + o.grade));
      if (o.text && o.score != null) more.appendChild(el('p', null, o.text));
      if (o.summary) more.appendChild(el('p', 'mk-audit__sum', o.summary));
      if (o.items.length) {
        var dl = el('dl', 'mk-audit__items');
        o.items.slice(0, 12).forEach(function (it) {
          if (it == null) return;
          var lab = typeof it === 'object' ? txt(it.label || it.name || it.title) : txt(it);
          if (!lab) return;
          var val = '';
          if (typeof it === 'object') {
            if (it.value != null) val = it.value;
            else if (it.score != null) val = it.score;
            else if (it.status != null) val = it.status;
            else if (it.result != null) val = it.result;
            else if (it.pass === true) val = '통과';
            else if (it.pass === false) val = '보완 필요';
          }
          var row = el('div');
          row.appendChild(el('dt', null, lab));
          row.appendChild(el('dd', null, txt(val) || '—'));
          dl.appendChild(row);
        });
        if (dl.childNodes.length) more.appendChild(dl);
      }
      if (o.date) more.appendChild(el('p', 'mk-audit__date', '측정일 ' + fmtDate(o.date)));
    });
    var basis = auditBox.querySelector('[data-audit-basis]');
    if (!basis) return;
    var b = info.before;
    var a = info.after;
    var when = txt(data.generatedAt) ? '(기준: ' + fmtDate(data.generatedAt) + ')' : '';
    if (b && a && b.score != null && a.score != null && (b.max == null || a.max == null || b.max === a.max)) {
      var diff = Math.round((a.score - b.score) * 10) / 10;
      basis.textContent = (diff === 0 ? '두 사이트의 점수가 같습니다' : '새 사이트가 원본보다 ' + Math.abs(diff) + '점 ' + (diff > 0 ? '높습니다' : '낮습니다')) + when + '.';
    } else if (b || a) {
      basis.textContent = '한쪽만 측정했습니다. 나머지는 측정한 뒤 채웁니다' + when + '.';
    } else {
      basis.textContent = '아직 측정 전입니다. 실서비스 전환 전후로 재서 채웁니다.';
    }
  }

  if ((cmpBox || auditBox) && window.fetch) {
    window.fetch('../assets/data/compare.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        data = data && typeof data === 'object' ? data : {};
        try { renderCompare(data); } catch (e) { if (cmpBox) { cmpBox.textContent = ''; cmpBox.appendChild(el('p', 'mk-loading', '비교표를 그리지 못했습니다.')); } }
        try { renderAudit(data); } catch (e) { /* 자리표시 그대로 */ }
      })
      .catch(function () {
        if (!cmpBox) return;
        cmpBox.textContent = '';
        var p = el('p', 'mk-loading', '비교표를 불러오지 못했습니다. 잠시 뒤 새로 고침해 주세요. ');
        var a = el('a', 'u-link', '원본 자료(compare.json)');
        a.href = '../assets/data/compare.json';
        p.appendChild(a);
        cmpBox.appendChild(p);
      });
  }

  // ── 6) 새 사이트 페이지 수(사이트맵) ────────────────────────────────────────
  var cntItem = d.querySelector('[data-sitemap-item]');
  var cnt = d.querySelector('[data-sitemap-count]');
  if (cntItem && cnt && window.fetch) {
    window.fetch('../sitemap.xml', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (t) {
        var n = (t.match(/<loc>/g) || []).length;
        if (!n) throw new Error('empty');
        cnt.textContent = String(n);
        cntItem.classList.remove('is-pending');
      })
      .catch(function () { cntItem.hidden = true; });
  } else if (cntItem) {
    cntItem.hidden = true;
  }
})();
