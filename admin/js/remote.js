/* 관리자 — 사이트 운영 서버 연결: 로그인 · 상담 신청(목록·상태·메모·열람 기록)
   서버 주소와 사이트 번호는 빌드가 만드는 js/config.js(window.AA_OPS = {url, site}) 에서 읽는다(site.config.json → ops).
   규약: POST(text/plain JSON) {a:'login'|'admin', site, …} → JSON. 로그인하면 서버가 서명한 열쇠(12시간)를 주고,
   그 열쇠는 이 창(탭)에만 둔다(sessionStorage) — 비밀번호는 어디에도 저장하지 않는다. */
(function () {
  'use strict';
  var w = window;
  var AA = w.AA = w.AA || {};
  var C = w.AA_OPS || {};
  var URL_ = String(C.url || '');
  var SITE = String(C.site || '');

  var TOK = 'apple_admin_token';
  var WHO = 'apple_admin_login';
  var mem = { t: '', who: '' }; // sessionStorage 를 못 쓰는 브라우저용

  function timeout(p, ms) {
    return new Promise(function (ok, no) {
      var t = setTimeout(function () { no(new Error('timeout')); }, ms);
      p.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); no(e); });
    });
  }
  function post(body, ms) {
    if (!URL_ || !SITE) return Promise.reject(new Error('no-server'));
    body.site = SITE;
    return timeout(w.fetch(URL_, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' }, credentials: 'omit' })
      .then(function (r) { return r.json(); }), ms || 20000);
  }
  function tokenExp(t) { var n = Number(String(t || '').split('.')[0]); return n > 0 ? n : 0; }
  function token() {
    var t = mem.t;
    try { t = w.sessionStorage.getItem(TOK) || t; } catch (e) { /* 메모리 값 */ }
    return tokenExp(t) > Date.now() ? t : '';
  }
  function who() { var v = mem.who; try { v = w.sessionStorage.getItem(WHO) || v; } catch (e) { /* 메모리 값 */ } return v || ''; }
  function clearToken() {
    mem = { t: '', who: '' };
    try { w.sessionStorage.removeItem(TOK); w.sessionStorage.removeItem(WHO); } catch (e) { /* 무시 */ }
  }

  AA.remote = {
    on: !!(URL_ && SITE),
    site: SITE,
    token: token,
    who: who,
    clearToken: clearToken,
    /** 로그인 → {ok:true} | {ok:false, err:'wrong'|'locked'|'closed'|'origin'|'site'|…}. 연결 실패는 reject */
    login: function (id, pw) {
      return post({ a: 'login', id: id, pw: pw }, 20000).then(function (r) {
        if (r && r.ok && r.token) {
          mem = { t: r.token, who: id };
          try { w.sessionStorage.setItem(TOK, r.token); w.sessionStorage.setItem(WHO, id); } catch (e) { /* 메모리로만 */ }
        }
        return r || { ok: false, err: 'fail' };
      });
    },
    /** 관리자 요청. 열쇠가 없거나 서버가 다시 로그인하라고 하면 Error('login') 로 거절한다 */
    admin: function (op, x, ms) {
      var t = token();
      if (!t) return Promise.reject(new Error('login'));
      return post(Object.assign({ a: 'admin', token: t, op: op }, x || {}), ms || 30000).then(function (r) {
        if (r && r.err === 'login') { clearToken(); throw new Error('login'); }
        if (!r || !r.ok) throw new Error((r && r.err) || 'fail');
        return r;
      });
    },
  };
})();
