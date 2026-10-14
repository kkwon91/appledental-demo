/* 기존 vs 새 홈페이지 비교 — 화면 종류(PC·휴대폰) 전환, 막대 밀어 비교, 같이 내리기, 링크 복사·공유, 점검 수치 불러오기 */
(function () {
  'use strict';
  var body = document.body;
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } } };

  // ── 화면 종류 ──
  var SIZE = { pc: [1440, 900], mo: [390, 844] };
  function setView(v) {
    if (v !== 'pc' && v !== 'mo') v = 'pc';
    body.setAttribute('data-view', v);
    document.querySelectorAll('[data-view-btn]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-view-btn') === v)); });
    document.querySelectorAll('img[data-pc][data-mo]').forEach(function (img) {
      var src = img.getAttribute('data-' + v);
      if (img.getAttribute('src') !== src) img.setAttribute('src', src);
      if (img.closest('.pair__stage')) { img.setAttribute('width', SIZE[v][0]); img.setAttribute('height', SIZE[v][1]); }
    });
    document.querySelectorAll('[data-pane]').forEach(function (p) { p.scrollTop = 0; });
    store.set('apple_compare_view', v);
  }
  document.querySelectorAll('[data-view-btn]').forEach(function (b) {
    b.addEventListener('click', function () { setView(b.getAttribute('data-view-btn')); });
  });
  var saved = store.get('apple_compare_view');
  setView(saved || (window.matchMedia('(max-width: 859px)').matches ? 'mo' : 'pc'));

  // ── 막대 밀어 비교(좁은 화면) ──
  document.querySelectorAll('[data-stage]').forEach(function (stage) {
    var cut = stage.querySelector('[data-cut]');
    if (!cut) return;
    var handle = document.createElement('span');
    handle.className = 'handle'; handle.setAttribute('aria-hidden', 'true');
    cut.insertAdjacentElement('afterend', handle);
    function upd() { stage.style.setProperty('--cut', cut.value + '%'); }
    cut.addEventListener('input', upd);
    upd();
  });

  // ── 홈 전체: 같이 내리기 ──
  var panes = Array.prototype.slice.call(document.querySelectorAll('[data-pane]'));
  var sync = document.querySelector('[data-sync]');
  var lock = false;
  panes.forEach(function (p, i) {
    p.addEventListener('scroll', function () {
      if (!sync || !sync.checked || lock) return;
      var other = panes[1 - i];
      if (!other) return;
      var max = p.scrollHeight - p.clientHeight, omax = other.scrollHeight - other.clientHeight;
      if (max <= 0 || omax <= 0) return;
      lock = true;
      other.scrollTop = (p.scrollTop / max) * omax;
      window.requestAnimationFrame(function () { lock = false; });
    }, { passive: true });
  });

  // ── 링크 복사·공유 ──
  var toastEl = document.querySelector('[data-toast]');
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }
  var pageUrl = location.href.split('#')[0].split('?')[0];
  var copyBtn = document.querySelector('[data-copy]');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    function fallback() {
      var t = document.createElement('textarea');
      t.value = pageUrl; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { }
      document.body.removeChild(t);
      toast(ok ? '링크를 복사했습니다' : '주소창의 링크를 복사해 주세요');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(pageUrl).then(function () { toast('링크를 복사했습니다'); }, fallback);
    } else fallback();
  });
  var shareBtn = document.querySelector('[data-share]');
  if (shareBtn && navigator.share) {
    shareBtn.hidden = false;
    shareBtn.addEventListener('click', function () {
      navigator.share({ title: document.title, text: '부천 사과나무치과병원 기존 홈페이지와 새 홈페이지 비교', url: pageUrl }).catch(function () { });
    });
  }

  // ── 점검 수치(그로스메이트 AEO 점검 결과) ──
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  fetch('../assets/data/compare.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) return;
    var a = d.audit || {}, b4 = a.before || null, af = a.after || null;
    if (b4 && b4.score != null) document.querySelectorAll('[data-score-before]').forEach(function (e) { e.textContent = b4.score; });
    if (af && af.score != null) document.querySelectorAll('[data-score-after],[data-score-after2]').forEach(function (e) { e.textContent = af.score; });
    // 항목별 점수: 두 쪽 items 를 이름으로 맞춰 표로
    if (b4 && af && Array.isArray(b4.items) && Array.isArray(af.items)) {
      var map = {};
      b4.items.forEach(function (it) { map[it.label] = { label: it.label, before: it.value }; });
      af.items.forEach(function (it) { (map[it.label] = map[it.label] || { label: it.label }).after = it.value; });
      var tb = document.querySelector('[data-items] tbody');
      if (tb) tb.innerHTML = Object.keys(map).map(function (k) {
        var m = map[k];
        return '<tr><th scope="row">' + esc(m.label) + '</th><td>' + esc(m.before || '—') + '</td><td>' + esc(m.after || '—') + '</td></tr>';
      }).join('');
    }
    if (Array.isArray(d.rows) && d.rows.length) {
      var rb = document.querySelector('[data-rows] tbody');
      if (rb) rb.innerHTML = d.rows.map(function (r) {
        return '<tr><th scope="row">' + esc(r.label) + '</th><td>' + esc(r.before || '—') + '</td><td>' + esc(r.after || '—') + '</td></tr>';
      }).join('');
    }
  }).catch(function () { });
})();
