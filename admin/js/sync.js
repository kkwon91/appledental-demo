/* 관리자 — 사이트 내용 저장(2단계): 콘텐츠·사이트 설정 화면이 고친 값을 이 브라우저가 아니라 사이트 운영 서버에 둔다.
   - AA.store.get/set/del 을 그대로 쓰되, 아래 이름의 키는 서버 값(AA.sync.docs)을 읽고 쓴다 → 어느 컴퓨터로 들어와도 같은 내용.
   - 서버가 키마다 반영 방식을 정한다(kinds):
       live  = 저장하면 홈페이지가 바로 읽어 간다(공지 띠배너 · 진료시간·휴진일)
       build = 운영 담당자가 확인하고 홈페이지를 다시 만들 때 반영(본문·구조화 데이터가 함께 바뀌는 것) — '반영 대기' → '반영 요청'
       note  = 관리자 화면끼리만 나누는 값
   - 저장은 화면을 막지 않고 뒤에서 보낸다. 실패하면 알리고 15초 뒤 다시 보낸다. 다른 창에서 먼저 고쳤으면(판 번호가 다름) 새로 불러온다.
   규약(js/remote.js → 서버 admin op): cfgGet · cfgSet {key, value|null, base(알고 있던 판)} · cfgRequest {memo} */
(function () {
  'use strict';
  var w = window;
  var d = document;
  var AA = w.AA;
  var esc = AA.esc;

  var NAMES = ['doctors', 'clinics', 'answers', 'news', 'pricing', 'hours', 'notice', 'main', 'hospital', 'checks'];
  var LABEL = { notice: '공지 띠배너', hours: '진료시간·휴진', doctors: '의료진', clinics: '진료 페이지', answers: '질문 답 페이지', news: '소식 게시판', pricing: '비급여 진료비', main: '메인 화면', hospital: '병원 정보' };
  var ROUTE = { notice: 'notice', hours: 'hours', doctors: 'doctors', clinics: 'clinics', answers: 'answers', news: 'news', pricing: 'pricing', main: 'main', hospital: 'hospital' };
  var KIND = { notice: 'live', hours: 'live', checks: 'note' };
  var byStoreKey = {};
  NAMES.forEach(function (n) { byStoreKey[AA.KEYS[n]] = n; });

  var S = AA.sync = { docs: {}, kinds: null, request: null, loaded: false, busy: 0, failed: {}, label: LABEL };
  var seq = {};   // 키마다 고친 횟수
  var sent = {};  // 서버에 보낸 횟수
  var chain = {}; // 키마다 차례로 보내기
  var retryT = 0;

  var local = { get: AA.store.get, set: AA.store.set, del: AA.store.del };
  AA.store.get = function (k, def) {
    var n = byStoreKey[k];
    if (!n) return local.get(k, def);
    var x = S.docs[n];
    return x && x.v != null ? AA.clone(x.v) : def;
  };
  AA.store.set = function (k, v) {
    var n = byStoreKey[k];
    if (!n) return local.set(k, v);
    put(n, v);
    return true;
  };
  AA.store.del = function (k) {
    var n = byStoreKey[k];
    if (!n) return local.del(k);
    if (S.docs[n] && S.docs[n].v != null) put(n, null);
  };

  function kind(n) { return (S.kinds && S.kinds[n]) || KIND[n] || 'build'; }
  function put(n, v) {
    var x = S.docs[n] || (S.docs[n] = { v: null, rev: '', by: '', pub: '' });
    x.v = v == null ? null : AA.clone(v);
    x.by = AA.who();
    x.at = new Date().toISOString();
    x.dirty = true;
    seq[n] = (seq[n] || 0) + 1;
    queue(n);
    paint();
  }
  function queue(n) { chain[n] = (chain[n] || Promise.resolve()).then(function () { return send(n); }); }
  function send(n) {
    var x = S.docs[n];
    var mine = seq[n];
    if (!x || sent[n] === mine) return null;
    S.busy++; paint();
    return AA.remote.admin('cfgSet', { key: n, value: x.v, base: x.rev || '' }).then(function (r) {
      S.busy--;
      x.rev = r.rev; sent[n] = mine; delete S.failed[n];
      if (seq[n] === mine) x.dirty = false;
      paint();
    }, function (e) {
      S.busy--;
      var m = e && e.message;
      if (m === 'login') { paint(); if (AA.sessionExpired) AA.sessionExpired(); return null; }
      if (m === 'conflict') {
        AA.toast('다른 창에서 먼저 고친 내용이 있어 새로 불러왔습니다. 고친 곳을 다시 확인해 주세요');
        return S.load().then(function () { if (AA.rerender) AA.rerender(); }, function () { paint(); });
      }
      if (m === 'big') { delete S.failed[n]; x.dirty = false; paint(); AA.toast('내용이 너무 길어 저장하지 못했습니다. 글을 줄여 다시 저장해 주세요'); return null; }
      S.failed[n] = true; paint();
      AA.toast('저장하지 못했습니다. 인터넷 연결을 확인해 주세요 — 잠시 뒤 다시 보냅니다');
      if (!retryT) retryT = w.setTimeout(function () { retryT = 0; Object.keys(S.failed).forEach(queue); }, 15000);
      return null;
    });
  }

  /** 서버 값 불러오기(로그인 직후·판이 어긋났을 때) */
  S.load = function () {
    return AA.remote.admin('cfgGet').then(function (r) {
      var docs = {};
      Object.keys(r.docs || {}).forEach(function (n) { var x = r.docs[n]; docs[n] = { v: x.v == null ? null : x.v, rev: x.rev || '', by: x.by || '', pub: x.pub || '' }; });
      S.docs = docs; S.kinds = r.kinds || null; S.request = r.request || null; S.loaded = true; S.failed = {};
      seq = {}; sent = {}; chain = {};
      paint();
      return S;
    });
  };
  S.clear = function () { S.docs = {}; S.request = null; S.loaded = false; S.failed = {}; seq = {}; sent = {}; chain = {}; paint(); };
  S.dirty = function () { return NAMES.some(function (n) { return S.docs[n] && S.docs[n].dirty; }); };
  /** 홈페이지 반영을 기다리는 메뉴(이름표) */
  S.pending = function () {
    return NAMES.filter(function (n) {
      var x = S.docs[n];
      if (!x || kind(n) !== 'build') return false;
      if (x.dirty) return true;
      return x.rev !== x.pub && !(x.v == null && !x.pub); // 한 번도 반영한 적 없는 값을 되돌린 것은 반영할 것이 없다
    });
  };
  function requested(n) {
    var q = S.request; var x = S.docs[n];
    return !!(q && x && !x.dirty && (q.keys || []).indexOf(n) > -1 && String(q.at) >= String(x.rev));
  }
  function when(iso) { try { return AA.fmt.dt(iso); } catch (e) { return String(iso || '').slice(0, 16).replace('T', ' '); } }

  /** 화면 위쪽 안내 띠 — 이 화면에서 저장한 값이 홈페이지에 어떻게 나가는지 */
  function noteInner(n, extra) {
    var x = S.docs[n];
    var tail = extra ? ' ' + esc(extra) : '';
    if (kind(n) === 'live') return '이 화면에서 저장하면 <b>홈페이지에 바로 반영</b>됩니다(길어도 1분).' + tail;
    if (S.pending().indexOf(n) > -1) {
      return '<b>홈페이지 반영 대기</b> — 저장한 내용은 운영 담당자가 확인한 뒤 홈페이지에 반영합니다. ' +
        (requested(n) ? '반영 요청을 보냈습니다(' + esc(when(S.request.at)) + ').' : '<button class="ad-linkbtn" type="button" data-act="pub-open">반영 요청 보내기</button>') + tail;
    }
    if (x && x.v != null) return '여기서 고친 내용이 홈페이지에 반영되어 있습니다.' + tail;
    return '이 화면에서 저장한 내용은 운영 담당자가 확인한 뒤 홈페이지에 반영합니다. 다 고친 뒤 ‘반영 요청 보내기’를 눌러 주세요.' + tail;
  }
  AA.pubNote = function (n, extra) {
    return '<p class="ad-note" data-pub-note="' + esc(n) + '"' + (extra ? ' data-pub-extra="' + esc(extra) + '"' : '') + '><span>' + AA.icon('info') + '</span><span data-pub-text>' + noteInner(n, extra) + '</span></p>';
  };

  /** 위쪽 막대의 저장·반영 상태 + 화면에 떠 있는 안내 띠 다시 그리기 */
  function paint() {
    var b = d.getElementById('ad-pub');
    if (b) {
      var fails = Object.keys(S.failed).length;
      var pend = S.loaded ? S.pending() : [];
      var txt = ''; var cls = '';
      if (S.busy) txt = '저장하는 중…';
      else if (fails) { txt = '저장 실패 — 다시 보내는 중'; cls = 'is-warn'; }
      else if (pend.length) { txt = '홈페이지 반영 대기 ' + pend.length; cls = 'is-pend'; }
      b.hidden = !txt;
      b.textContent = txt;
      b.className = 'ad-top__pub' + (cls ? ' ' + cls : '');
    }
    Array.prototype.forEach.call(d.querySelectorAll('[data-pub-note]'), function (p) {
      var t = p.querySelector('[data-pub-text]');
      if (t) t.innerHTML = noteInner(p.getAttribute('data-pub-note'), p.getAttribute('data-pub-extra') || '');
    });
  }
  S.paint = paint;

  // ── 반영 요청 서랍 ─────────────────────────────────────────────────────────────
  function drawerHtml() {
    var pend = S.pending();
    var q = S.request;
    var rows = pend.map(function (n) {
      var x = S.docs[n];
      return '<li><a href="#/' + esc(ROUTE[n] || n) + '" data-act="drawer-close"><b>' + esc(LABEL[n] || n) + '</b></a><span class="t-cell-sm">' + (x.v == null ? '원래대로 되돌림 · ' : '') + esc(when(x.dirty ? x.at : x.rev)) + (x.by ? ' · ' + esc(x.by) : '') + (requested(n) ? ' · 요청함' : '') + '</span></li>';
    }).join('');
    return '<p class="ad-note"><span>' + AA.icon('info') + '</span><span>공지 띠배너와 진료시간·휴진일은 저장하면 홈페이지에 바로 반영됩니다. 아래 메뉴는 검색과 AI가 읽는 본문·구조화 데이터까지 함께 바뀌어야 해서, 운영 담당자가 내용을 확인한 뒤 홈페이지를 다시 만들어 반영합니다.</span></p>' +
      (pend.length ? '<ul class="ad-publist">' + rows + '</ul>' : '<p class="muted" style="margin:14px 0">반영을 기다리는 변경이 없습니다.</p>') +
      (q ? '<p class="ad-field__hint" style="margin-top:10px">마지막 반영 요청: ' + esc(when(q.at)) + ' · ' + esc(q.by || '') + (q.memo ? ' · “' + esc(q.memo) + '”' : '') + '</p>' : '') +
      (pend.length ? '<label class="ad-field" style="margin-top:14px"><span class="ad-field__label">운영 담당자에게 남길 말 <small>선택</small></span><textarea class="ad-textarea" id="pub-memo" rows="3" maxlength="500" placeholder="예: 11월 20일부터 적용해 주세요"></textarea></label>' : '');
  }
  AA.actions['pub-open'] = function () {
    AA.drawer.open({
      eyebrow: '홈페이지 반영', title: '반영을 기다리는 변경', html: drawerHtml(),
      foot: S.pending().length ? '<button class="ad-btn ad-btn--line" type="button" data-act="drawer-close">닫기</button><button class="ad-btn ad-btn--ink" type="button" data-act="pub-send">반영 요청 보내기</button>' : '<button class="ad-btn ad-btn--line" type="button" data-act="drawer-close">닫기</button>',
    });
  };
  AA.actions['pub-send'] = function (el) {
    var memo = (d.getElementById('pub-memo') || {}).value || '';
    if (el) el.disabled = true;
    var wait = NAMES.map(function (n) { return chain[n] || null; }).filter(Boolean);
    Promise.all(wait).then(function () {
      if (S.dirty() || Object.keys(S.failed).length) throw new Error('unsaved');
      return AA.remote.admin('cfgRequest', { memo: memo });
    }).then(function (r) {
      S.request = r.request || null;
      AA.drawer.close(true);
      AA.toast('반영 요청을 보냈습니다');
      paint();
    }, function (e) {
      if (el) el.disabled = false;
      var m = e && e.message;
      if (m === 'login') { if (AA.sessionExpired) AA.sessionExpired(); return; }
      AA.toast(m === 'unsaved' ? '아직 저장되지 않은 내용이 있습니다. 잠시 뒤 다시 눌러 주세요' : m === 'none' ? '반영을 기다리는 변경이 없습니다' : '요청을 보내지 못했습니다. 잠시 뒤 다시 해 주세요');
    });
  };

  // 저장이 끝나기 전에 창을 닫으려 하면 한 번 묻는다
  w.addEventListener('beforeunload', function (e) { if (S.dirty()) { e.preventDefault(); e.returnValue = ''; } });
})();
