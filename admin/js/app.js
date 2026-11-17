/* 관리자 — 시작: 로그인(사이트 운영 서버가 확인) · 자료 불러오기 · 라우팅 시작 · 진료 상태 시계 · 상담 신청 1분마다 새로 확인 */
(function () {
  'use strict';
  var w = window;
  var d = document;
  var AA = w.AA;
  var esc = AA.esc;
  var started = false;
  var VER = 'ops-20261118'; // 시안 때 이 브라우저에 남긴 관리자 저장값(예시 신청의 상태·메모 등)을 한 번 비우는 표식
  var POLL = 60000;

  function $(id) { return d.getElementById(id); }
  // 시안(데모) 때 이 브라우저에 쌓인 값 정리 — 예시 신청에 덧씌운 상태·메모, 예시 온라인 상담·칼럼 초안의 저장값, 사이트 폼이 쌓던 신청, 옛 로그인 표식
  (function cleanOld() {
    try {
      if (w.localStorage.getItem('apple_admin_ver') === VER) return;
      ['apple_admin_leads', 'apple_admin_online', 'apple_admin_columns', 'apple_admin_audit', 'apple_demo_leads',
        // 2단계(11-18): 콘텐츠·사이트 설정은 서버에 둔다 — 시안 때 이 브라우저에 남긴 값은 버린다
        'apple_admin_doctors', 'apple_admin_clinics', 'apple_admin_answers', 'apple_admin_news', 'apple_admin_pricing', 'apple_admin_hours', 'apple_admin_notice', 'apple_admin_main', 'apple_admin_hospital', 'apple_admin_checks'].forEach(function (k) { w.localStorage.removeItem(k); });
      w.sessionStorage.removeItem('apple_admin_session');
      w.localStorage.setItem('apple_admin_ver', VER);
    } catch (e) { /* 저장소를 못 쓰는 브라우저 */ }
  })();

  // 로그인 화면과 관리자 화면은 한쪽만 문서에 둔다 — 숨긴 쪽의 H1·main 이 남아 문서에 H1·main 이 둘이 되지 않게.
  //   로그인 뒤에는 로그인 화면(#ad-login)을 떼어 두었다가(이벤트는 그대로) 로그아웃하면 다시 붙인다.
  var loginEl = null;
  function skipTo(id) { var s = d.querySelector('.ad-skip'); if (s) s.setAttribute('href', '#' + id); }
  function focusH1() { var h = $('ad-h1'); if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) { h.focus(); } } }
  function showLogin(msg) {
    var app = $('ad-app');
    if (loginEl && !loginEl.parentNode) app.parentNode.insertBefore(loginEl, app);
    app.hidden = true;
    var main = $('ad-main');
    if (main) { main.hidden = true; main.innerHTML = '<p class="ad-loading">불러오는 중…</p>'; }
    $('ad-login').hidden = false;
    skipTo('ad-login-main');
    d.title = '관리자 로그인 | 부천 사과나무치과병원';
    var err = $('ad-login-err');
    if (err) { err.textContent = msg || ''; err.hidden = !msg; }
    var off = $('ad-login-off');
    var on = !!(AA.remote && AA.remote.on);
    if (off) off.hidden = on;
    var btn = d.querySelector('#ad-login-form [type="submit"]');
    if (btn) btn.disabled = !on;
    setTimeout(function () { var i = $('ad-login-id'); if (i) i.focus(); }, 30);
  }
  function tick() {
    var el = $('ad-status');
    if (!el || !AA.seed) return;
    var st = AA.hours.status();
    el.innerHTML = '<span class="ad-dot ' + (st.state === 'open' ? 'ad-dot--green' : 'ad-dot--off') + '" aria-hidden="true"></span>' + esc(st.short) + (st.state === 'open' ? ' · ' + esc(st.long.split(' · ')[1] || '') : '');
  }
  function showUser() {
    var n = d.querySelector('.ad-top__name');
    var a = d.querySelector('.ad-top__avatar');
    var who = AA.who();
    if (n) n.textContent = who;
    if (a) a.textContent = who.charAt(0).toUpperCase() || '관';
  }
  function start() {
    var lg = $('ad-login');
    if (lg) { loginEl = lg; lg.hidden = true; lg.remove(); }
    $('ad-app').hidden = false;
    var main = $('ad-main');
    main.hidden = false;
    skipTo('ad-main');
    showUser();
    var open = function () { AA.render({ top: true }); tick(); focusH1(); AA.leads.load(); };
    // 고친 내용(콘텐츠·사이트 설정)은 서버에 있다 — 화면을 그리기 전에 먼저 불러온다(js/sync.js)
    var withSync = function () {
      main.innerHTML = '<p class="ad-loading">저장된 내용을 불러오는 중…</p>';
      AA.sync.load().then(open, function (e) {
        if (e && e.message === 'login') { AA.sessionExpired(); return; }
        main.innerHTML = '<div class="ad-note ad-note--warn"><span>' + AA.icon('warn') + '</span><span><span class="ad-note__t">저장된 내용을 불러오지 못했습니다.</span> 인터넷 연결을 확인한 뒤 <button class="ad-linkbtn" type="button" id="ad-sync-retry">다시 불러오기</button>를 눌러 주세요.</span></div>';
        var b = $('ad-sync-retry'); if (b) b.addEventListener('click', withSync);
      });
    };
    if (AA.seed) { withSync(); return; }
    main.innerHTML = '<p class="ad-loading">자료를 불러오는 중…</p>';
    fetch('../assets/data/admin-seed.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (seed) {
        AA.seed = AA.prepareSeed(seed);
        AA.rules.init((seed.forbiddenCheck || {}).rules);
        if (!started) {
          started = true;
          w.addEventListener('hashchange', function () { if (!AA.session.on()) return; AA.drawer.close(true); AA.render(); });
          w.setInterval(tick, 60000);
          // 새 상담 신청 확인: 1분마다(창을 보고 있을 때만), 다른 창에 다녀왔을 때도 한 번
          w.setInterval(function () { if (AA.session.on() && !d.hidden) AA.leads.load(true); }, POLL);
          d.addEventListener('visibilitychange', function () { if (!d.hidden && AA.session.on() && Date.now() - AA.leads.loadedAt > POLL / 2) AA.leads.load(true); });
        }
        withSync();
      })
      .catch(function (e) {
        main.innerHTML = '<div class="ad-note ad-note--warn"><span>' + AA.icon('warn') + '</span><span><span class="ad-note__t">관리자 자료를 불러오지 못했습니다.</span> 인터넷 연결을 확인한 뒤 새로 고쳐 주세요. (' + esc(e && e.message) + ')</span></div>';
      });
  }
  function leave(msg) {
    AA.session.set(false);
    AA.leads.cache = []; AA.leads.audits = {}; AA.leads.loadedAt = 0; AA.leads.state = 'idle'; // 개인정보를 화면 밖에도 남기지 않는다
    if (AA.sync) AA.sync.clear();
    AA.drawer.close(true);
    AA.navClose(true);
    try { w.history.replaceState(null, '', w.location.pathname + w.location.search); } catch (e) { w.location.hash = ''; }
    showLogin(msg);
  }

  AA.actions.logout = function () { leave(); AA.toast('로그아웃했습니다'); };
  /** 서버가 열쇠를 받지 않을 때(12시간이 지났거나 비밀번호가 바뀜) — 로그인 화면으로 */
  AA.sessionExpired = function () {
    if ($('ad-app').hidden) return;
    if (AA.sync && AA.sync.dirty()) AA.toast('저장하지 못한 내용이 있습니다. 다시 로그인한 뒤 한 번 더 저장해 주세요');
    leave('로그인한 지 오래되어 다시 로그인해야 합니다.');
  };

  var LOGIN_ERR = {
    wrong: '아이디 또는 비밀번호가 맞지 않습니다.',
    locked: '여러 번 틀려 잠시 잠겼습니다. 15분 뒤에 다시 해 주세요.',
    closed: '지금은 관리자 화면을 쓸 수 없습니다(운영 정지). 운영 담당자에게 문의해 주세요.',
  };
  function boot() {
    var form = $('ad-login-form');
    var err = $('ad-login-err');
    var busy = false;
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      var id = (form.elements.id.value || '').trim();
      var pw = form.elements.pw.value || '';
      var say = function (m, focusPw) { err.textContent = m; err.hidden = false; (focusPw ? form.elements.pw : form.elements.id).focus(); };
      if (!AA.remote || !AA.remote.on) return say('운영 서버 연결 전이라 로그인할 수 없습니다.');
      if (!id || !pw) return say('아이디와 비밀번호를 모두 넣어 주세요.', !!id);
      var btn = form.querySelector('[type="submit"]');
      busy = true; btn.disabled = true; btn.textContent = '확인하는 중…';
      var done = function () { busy = false; btn.disabled = false; btn.textContent = '로그인'; };
      AA.remote.login(id, pw).then(function (r) {
        done();
        if (r && r.ok) { err.hidden = true; form.reset(); start(); return; }
        form.elements.pw.value = '';
        say(LOGIN_ERR[r && r.err] || '로그인하지 못했습니다. 잠시 뒤 다시 해 주세요.', true);
      }, function () {
        done();
        say('운영 서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 해 주세요.', true);
      });
    });
    if (AA.session.on()) start(); else showLogin();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
})();
