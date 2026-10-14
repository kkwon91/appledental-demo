/* 관리자 데모 — 시작: 로그인(데모 계정, sessionStorage 플래그만) · 데이터 불러오기 · 라우팅 시작 · 진료 상태 시계 · 다른 탭의 새 신청 반영 */
(function () {
  'use strict';
  var w = window;
  var d = document;
  var AA = w.AA;
  var esc = AA.esc;
  var started = false;
  var ACC = { id: 'apple', pw: 'demo1234' }; // 데모용 — 실제 관리자 로그인은 실서비스 단계에서 서버 인증으로 바꾼다

  function $(id) { return d.getElementById(id); }
  function showLogin() {
    $('ad-app').hidden = true;
    $('ad-login').hidden = false;
    d.title = '관리자 로그인 | 부천 사과나무치과병원';
    setTimeout(function () { var i = $('ad-login-id'); if (i) i.focus(); }, 30);
  }
  function tick() {
    var el = $('ad-status');
    if (!el || !AA.seed) return;
    var st = AA.hours.status();
    el.innerHTML = '<span class="ad-dot ' + (st.state === 'open' ? 'ad-dot--green' : 'ad-dot--off') + '" aria-hidden="true"></span>' + esc(st.short) + (st.state === 'open' ? ' · ' + esc(st.long.split(' · ')[1] || '') : '');
  }
  function start() {
    $('ad-login').hidden = true;
    $('ad-app').hidden = false;
    if (AA.seed) { AA.render({ top: true }); tick(); return; }
    var main = $('ad-main');
    main.innerHTML = '<p class="ad-loading">데이터를 불러오는 중…</p>';
    fetch('../assets/data/admin-seed.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (seed) {
        AA.seed = AA.prepareSeed(seed);
        AA.rules.init((seed.forbiddenCheck || {}).rules);
        if (!started) {
          started = true;
          w.addEventListener('hashchange', function () { AA.drawer.close(true); AA.render(); });
          w.setInterval(tick, 60000);
          // 다른 탭(데모 사이트)에서 상담 신청·자가진단을 하면 바로 반영
          w.addEventListener('storage', function (e) {
            if (!AA.seed || !e.key) return;
            if (e.key === 'apple_demo_leads') { AA.toast('새 상담 신청이 들어왔습니다'); if (!AA.drawer.el) AA.rerender(); else AA.refreshBadges(); }
            else if (e.key === 'apple_selfcheck_stats' && AA.route && (AA.route.name === 'selfcheck' || AA.route.name === 'dashboard') && !AA.drawer.el) AA.rerender();
          });
        }
        AA.render({ top: true });
        tick();
        var h = $('ad-h1'); if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } }
      })
      .catch(function (e) {
        main.innerHTML = '<div class="ad-note ad-note--warn"><span>' + AA.icon('warn') + '</span><span><span class="ad-note__t">관리자 데이터를 불러오지 못했습니다.</span> 사이트를 빌드한 뒤(node src/build.mjs) 웹 서버로 열어 주세요. (' + esc(e && e.message) + ')</span></div>';
      });
  }

  AA.actions.logout = function () {
    AA.session.set(false);
    AA.drawer.close(true);
    try { w.history.replaceState(null, '', w.location.pathname); } catch (e) { w.location.hash = ''; }
    showLogin();
    AA.toast('로그아웃했습니다');
  };
  AA.actions['reset-demo'] = function () {
    AA.confirm({ title: '데모 데이터를 처음으로 돌릴까요?', msg: '이 브라우저에 저장된 관리자 설정(상태·메모·답변·고친 문구·진료시간·띠배너 등)을 모두 지웁니다. 사이트 상담 폼으로 넣은 신청은 그대로 둡니다.', ok: '처음으로', danger: true }).then(function (yes) {
      if (!yes) return;
      AA.store.adminKeys().forEach(function (k) { AA.store.del(k); });
      AA.toast('관리자 데모 데이터를 처음으로 돌렸습니다');
      AA.render({ keep: true });
      tick();
    });
  };

  function boot() {
    var form = $('ad-login-form');
    var err = $('ad-login-err');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = (form.elements.id.value || '').trim();
      var pw = form.elements.pw.value || '';
      if (id === ACC.id && pw === ACC.pw) {
        err.hidden = true;
        form.reset();
        AA.session.set(true);
        start();
      } else {
        err.textContent = !id || !pw ? '아이디와 비밀번호를 모두 넣어 주세요.' : '아이디 또는 비밀번호가 맞지 않습니다. 아래 데모 계정을 확인해 주세요.';
        err.hidden = false;
        (id ? form.elements.pw : form.elements.id).focus();
      }
    });
    var fill = d.querySelector('[data-fill-demo]');
    if (fill) fill.addEventListener('click', function () { form.elements.id.value = ACC.id; form.elements.pw.value = ACC.pw; err.hidden = true; form.querySelector('[type="submit"]').focus(); });
    if (AA.session.on()) start(); else showLogin();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
})();
