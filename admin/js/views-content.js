/* 관리자 데모 — 콘텐츠: 의료진 · 진료 페이지 · 질문 답 페이지 · 건강정보·칼럼 · 소식 게시판 · 리뷰 */
(function () {
  'use strict';
  var w = window;
  var d = document;
  var AA = w.AA;
  var esc = AA.esc;
  var icon = AA.icon;
  var HOSP_RE = /사과나무치과/;

  // ── 공통: 목록 편집(한 줄씩) · 자주 묻는 질문 편집 ──────────────────────────────────────
  function listEd(id, items, ph) {
    return '<div class="ad-list-ed" id="' + esc(id) + '">' + items.map(function (t, i) {
      return '<div class="ad-list-ed__row"><input class="ad-input" type="text" value="' + esc(t) + '" data-input="ed-list" data-list="' + esc(id) + '" data-i="' + i + '" aria-label="' + esc(ph + ' ' + (i + 1)) + '">' +
        '<span class="ad-mini-btns"><button class="ad-ibtn" type="button" data-act="ed-list-move" data-list="' + esc(id) + '" data-i="' + i + '" data-dir="-1"' + (i ? '' : ' disabled') + ' aria-label="위로">' + icon('up') + '</button>' +
        '<button class="ad-ibtn" type="button" data-act="ed-list-del" data-list="' + esc(id) + '" data-i="' + i + '" aria-label="지우기">' + icon('trash') + '</button></span></div>';
    }).join('') + '<p><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="ed-list-add" data-list="' + esc(id) + '">' + icon('plus') + '줄 더하기</button></p></div>';
  }
  function faqEd(faq) {
    return '<div class="ad-faq-ed" id="ed-faq">' + faq.map(function (x, i) {
      return '<div class="ad-faq-ed__item"><div class="ad-faq-ed__head"><span class="ad-faq-ed__no">Q' + (i + 1) + '</span><span class="ad-mini-btns">' +
        '<button class="ad-ibtn" type="button" data-act="ed-faq-move" data-i="' + i + '" data-dir="-1"' + (i ? '' : ' disabled') + ' aria-label="질문 ' + (i + 1) + ' 위로">' + icon('up') + '</button>' +
        '<button class="ad-ibtn" type="button" data-act="ed-faq-move" data-i="' + i + '" data-dir="1"' + (i < faq.length - 1 ? '' : ' disabled') + ' aria-label="질문 ' + (i + 1) + ' 아래로">' + icon('down') + '</button>' +
        '<button class="ad-ibtn" type="button" data-act="ed-faq-del" data-i="' + i + '" aria-label="질문 ' + (i + 1) + ' 지우기">' + icon('trash') + '</button></span></div>' +
        '<label class="ad-field"><span class="ad-sr">질문 ' + (i + 1) + '</span><input class="ad-input" type="text" value="' + esc(x.q) + '" data-input="ed-faq" data-i="' + i + '" data-k="q" placeholder="질문(화면에 보이는 그대로 구조화 데이터로 나갑니다)"></label>' +
        '<label class="ad-field"><span class="ad-sr">답 ' + (i + 1) + '</span><textarea class="ad-textarea" rows="3" data-input="ed-faq" data-i="' + i + '" data-k="a" placeholder="답(첫 문장에 바로 답하기)">' + esc(x.a) + '</textarea></label></div>';
    }).join('') + '<p style="margin-top:10px"><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="ed-faq-add">' + icon('plus') + '질문 더하기</button></p></div>';
  }
  /** AI 인용 미리보기 카드 */
  function citeCard(q, a, path) {
    var S = AA.seed.site || {};
    return '<div class="ad-cite"><p class="ad-cite__k">' + icon('search') + 'AI 답변이 이 문단을 인용할 때</p><p class="ad-cite__q">' + esc(q) + '</p><p class="ad-cite__a">' + AA.rules.highlight(a) + '</p><p class="ad-cite__src">출처: ' + esc((S.demoOrigin || '') + (S.base || '/') + String(path || '').replace(/^\//, '')) + '</p></div>';
  }
  function checkList(items) {
    var ok = items.filter(function (x) { return x.ok; }).length;
    return '<div class="ad-score"><span class="ad-score__n">' + ok + '</span><span class="muted">/ ' + items.length + ' 통과</span></div><ul class="ad-aeo">' + items.map(function (x) {
      return '<li class="' + (x.ok ? 'is-ok' : 'is-no') + '">' + icon(x.ok ? 'check' : 'warn') + '<span>' + esc(x.t) + (x.s ? '<small>' + esc(x.s) + '</small>' : '') + '</span></li>';
    }).join('') + '</ul>';
  }

  // ════════════════════════════════════════════════════════════════════════
  // 의료진
  // ════════════════════════════════════════════════════════════════════════
  AA.doctors = {
    list: function () {
      var ov = AA.store.get(AA.KEYS.doctors, {}) || {};
      var order = Array.isArray(ov._order) ? ov._order : [];
      var list = (AA.seed.doctors || []).map(function (x) { var o = ov[x.id] || {}; return Object.assign({}, x, o, { edited: !!ov[x.id] }); });
      if (order.length) list.sort(function (a, b) { var ia = order.indexOf(a.id); var ib = order.indexOf(b.id); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
      return list;
    },
  };
  var du = { dept: '' };
  function docCard(x, i, n) {
    var checks = AA.checks.forDoctor(x.id);
    return '<li class="ad-doc' + (x.hidden ? ' is-hidden' : '') + '"><div class="ad-doc__ph">' + (x.photo ? '<img src="../' + esc(x.photo) + '" alt="" loading="lazy" decoding="async" width="76" height="92">' : '') + '</div>' +
      '<div><p class="ad-doc__name">' + esc(x.name) + '</p><p class="ad-doc__role">' + esc(x.title && x.deptName && String(x.title).indexOf(String(x.deptName).replace(/과$/, '')) < 0 ? x.title + ' · ' + x.deptName : x.title || x.deptName) + '</p>' +
      (x.specialist ? '<p class="ad-doc__spec">' + esc(String(x.specialist).replace(/^보건복지부\s*인증\s*/, '')) + '</p>' : '') +
      '<p class="ad-doc__tags">' + (x.hidden ? '<span class="ad-badge ad-badge--spam">숨김</span>' : '') + (x.edited ? '<span class="ad-badge ad-badge--plain">고침</span>' : '') + (checks.length ? '<a class="ad-badge ad-badge--warn" href="#/dashboard" data-act="go-check" data-id="' + esc(checks[0].id) + '">병원 확인 ' + checks.length + '</a>' : '') + '</p></div>' +
      '<div class="ad-doc__btns"><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="doc-edit" data-id="' + esc(x.id) + '">' + icon('edit') + '고치기</button>' +
      '<button class="ad-ibtn" type="button" data-act="doc-move" data-id="' + esc(x.id) + '" data-dir="-1"' + (i ? '' : ' disabled') + ' aria-label="' + esc(x.name) + ' 앞으로">' + icon('up') + '</button>' +
      '<button class="ad-ibtn" type="button" data-act="doc-move" data-id="' + esc(x.id) + '" data-dir="1"' + (i < n - 1 ? '' : ' disabled') + ' aria-label="' + esc(x.name) + ' 뒤로">' + icon('down') + '</button>' +
      '<span style="margin-left:auto">' + AA.siteLink('/doctors/', '보기') + '</span></div></li>';
  }
  AA.views.doctors = {
    render: function () {
      var H = AA.seed.hospital;
      var list = AA.doctors.list();
      var shown = list.filter(function (x) { return !du.dept || x.dept === du.dept; });
      var spec = list.filter(function (x) { return x.specialist && !x.hidden; }).length;
      var visible = list.filter(function (x) { return !x.hidden; }).length;
      var depts = (H.departments || []).filter(function (dp) { return list.some(function (x) { return x.dept === dp.id; }); });
      return AA.head({ no: AA.no('doctors'), eyebrow: '콘텐츠', title: '의료진',
        lead: '의료진 소개 페이지와 진료 페이지의 담당 의료진 카드에 나가는 내용입니다. 약력은 원본 그대로 두고, 한 줄 약력은 경력에서만 씁니다.' }) +
        '<div class="ad-grid ad-grid--4" style="margin-bottom:16px">' + stat('치과의사', visible + '명') + stat('보건복지부 인증 전문의', spec + '명') + stat('진료과', (H.numbers || {}).departments + '개') + stat('병원 확인 중', AA.checks.list().filter(function (c) { return (c.doctors || []).length && c.status !== 'applied'; }).length + '건') + '</div>' +
        (spec !== (H.numbers || {}).specialists ? '<p class="ad-note ad-note--warn" style="margin-bottom:14px"><span>' + icon('warn') + '</span><span>전문의 표시가 ' + spec + '명으로 바뀌었습니다. 홈·병원소개·질문 답의 ‘전문의 ' + esc((H.numbers || {}).specialists) + '명’도 함께 고쳐야 합니다.</span></p>' : '') +
        '<div class="ad-chips" role="group" aria-label="진료과로 거르기" style="margin-bottom:14px">' + [{ id: '', name: '전체' }].concat(depts).map(function (dp) {
          var n = dp.id ? list.filter(function (x) { return x.dept === dp.id; }).length : list.length;
          return '<button class="ad-chip" type="button" aria-pressed="' + (du.dept === dp.id) + '" data-act="doc-dept" data-dept="' + esc(dp.id) + '">' + esc(dp.name) + ' <span class="ad-chip__n">' + n + '</span></button>';
        }).join('') + '</div>' +
        '<ul class="ad-docs">' + shown.map(function (x) { return docCard(x, list.indexOf(x), list.length); }).join('') + '</ul>' +
        '<p class="ad-field__hint" style="margin-top:14px">순서를 바꾸면 의료진 소개 페이지의 기본 순서가 됩니다(데모는 이 브라우저에만 저장). 사진 교체는 실서비스 단계에서 병원 실사로만 합니다.</p>';
    },
    on: {
      'doc-dept': function (el) { du.dept = el.getAttribute('data-dept'); AA.rerender(); },
      'doc-move': function (el) {
        var id = el.getAttribute('data-id'); var dir = +el.getAttribute('data-dir');
        var ids = AA.doctors.list().map(function (x) { return x.id; });
        var i = ids.indexOf(id); var j = i + dir;
        if (i < 0 || j < 0 || j >= ids.length) return;
        ids.splice(j, 0, ids.splice(i, 1)[0]);
        var ov = AA.store.get(AA.KEYS.doctors, {}) || {}; ov._order = ids; AA.store.set(AA.KEYS.doctors, ov);
        AA.rerender();
      },
      'doc-edit': function (el) { openDoc(el.getAttribute('data-id')); },
      'go-check': function (el) { AA.go('#/dashboard'); setTimeout(function () { var c = d.getElementById('chk-' + el.getAttribute('data-id')); if (c) c.scrollIntoView({ block: 'center' }); }, 120); },
      'doc-save': function (el) {
        var id = el.getAttribute('data-id');
        var g = function (k) { var x = d.getElementById('doc-' + k); return x ? x.value : ''; };
        var lines = function (k) { return g(k).split('\n').map(function (s) { return s.trim(); }).filter(Boolean); };
        var sum = g('summary').trim();
        if (AA.rules.count(sum)) { AA.toast('한 줄 약력의 금칙어를 고친 뒤 저장할 수 있습니다'); return; }
        var ov = AA.store.get(AA.KEYS.doctors, {}) || {};
        ov[id] = Object.assign({}, ov[id] || {}, { title: g('title').trim(), specialist: g('spec').trim(), summary: sum, education: lines('edu'), career: lines('career'), societies: lines('soc'), hidden: !(d.getElementById('doc-show') || {}).checked, updatedAt: new Date().toISOString() });
        AA.store.set(AA.KEYS.doctors, ov);
        AA.drawer.close(true);
        AA.toast('의료진 정보를 저장했습니다');
        AA.rerender();
      },
      'doc-reset': function (el) {
        var id = el.getAttribute('data-id');
        var ov = AA.store.get(AA.KEYS.doctors, {}) || {}; delete ov[id]; AA.store.set(AA.KEYS.doctors, ov);
        AA.drawer.close(true); AA.toast('원래 정보로 되돌렸습니다'); AA.rerender();
      },
      'doc-live': function (el) { var r = d.getElementById('doc-rules'); if (r) r.innerHTML = AA.rules.report(el.value); var c = d.getElementById('doc-count'); if (c) c.innerHTML = AA.counter(AA.textLen(el.value), 0, 90); },
    },
  };
  function stat(k, v) { return '<div class="ad-card" style="padding:12px 14px"><p class="ad-kpi__label" style="font-size:13.5px">' + esc(k) + '</p><p style="font-size:24px;font-weight:700;letter-spacing:-.02em">' + esc(v) + '</p></div>'; }
  AA.statCard = stat;
  function openDoc(id) {
    var x = AA.doctors.list().filter(function (y) { return y.id === id; })[0];
    if (!x) return;
    var checks = AA.checks.forDoctor(id);
    var pages = (x.pages || []).map(function (p) { return AA.siteLink(p); }).join(' ');
    AA.drawer.open({
      eyebrow: '의료진 · ' + x.deptName, title: x.name + ' ' + x.title, wide: true, focus: '#doc-title',
      html: '<div class="ad-doc-photo">' + (x.photo ? '<img src="../' + esc(x.photo) + '" alt="' + esc(x.name + ' ' + x.title + ' 사진') + '" width="120" height="146">' : '<span></span>') +
        '<div><p class="ad-field__hint">사진은 병원 실사(의료진 개인 사진)만 씁니다. 교체는 실서비스 단계에서 병원이 보내 주신 사진으로 합니다.</p>' + AA.switchHtml({ id: 'doc-show', label: '의료진 소개에 보이기', checked: !x.hidden }) + '</div></div>' +
        (checks.length ? checks.map(function (c) { return '<p class="ad-note ad-note--warn"><span>' + icon('warn') + '</span><span><span class="ad-note__t">병원 확인 중 · ' + esc(c.title) + '</span><br>' + esc(c.text) + '</span></p>'; }).join('') : '') +
        '<div class="ad-form"><div class="ad-form-row"><label class="ad-field"><span class="ad-field__label">직함</span><input class="ad-input" id="doc-title" value="' + esc(x.title) + '"></label>' +
        '<label class="ad-field"><span class="ad-field__label">전문의 표시 <small>경력에 적힌 그대로</small></span><input class="ad-input" id="doc-spec" value="' + esc(x.specialist) + '" placeholder="예: 보건복지부 인증 치과보철과 전문의"></label></div>' +
        '<label class="ad-field"><span class="ad-field__label"><span>한 줄 약력</span><span id="doc-count">' + AA.counter(AA.textLen(x.summary), 0, 90) + '</span></span><textarea class="ad-textarea" id="doc-summary" rows="3" data-input="doc-live">' + esc(x.summary) + '</textarea><span class="ad-field__hint">경력에서만 씁니다. 최상급·비교 표현(최고·명의 등)은 쓸 수 없습니다.</span></label>' +
        '<div id="doc-rules">' + AA.rules.report(x.summary) + '</div>' +
        '<div class="ad-form-row ad-form-row--3"><label class="ad-field"><span class="ad-field__label">학력 <small>한 줄에 하나</small></span><textarea class="ad-textarea" id="doc-edu" rows="5">' + esc((x.education || []).join('\n')) + '</textarea></label>' +
        '<label class="ad-field"><span class="ad-field__label">경력</span><textarea class="ad-textarea" id="doc-career" rows="5">' + esc((x.career || []).join('\n')) + '</textarea></label>' +
        '<label class="ad-field"><span class="ad-field__label">학회</span><textarea class="ad-textarea" id="doc-soc" rows="5">' + esc((x.societies || []).join('\n')) + '</textarea></label></div>' +
        '<div class="ad-field"><span class="ad-field__label">담당 진료 페이지</span><p class="ad-checks__pages" style="margin:0">' + (pages || '<span class="muted">없음</span>') + '</p></div></div>',
      foot: '<span class="ad-savebar__msg">이 브라우저에만 저장됩니다</span>' + (x.edited ? '<button class="ad-btn ad-btn--ghost ad-btn--sm" type="button" data-act="doc-reset" data-id="' + esc(id) + '">' + icon('undo') + '원래대로</button>' : '') +
        '<button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="drawer-close">취소</button><button class="ad-btn ad-btn--ink ad-btn--sm" type="button" data-act="doc-save" data-id="' + esc(id) + '">저장</button>',
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // 진료 페이지 · 질문 답 페이지 — 같은 편집기
  // ════════════════════════════════════════════════════════════════════════
  var ed = null; // { kind, key, base, cur }
  function clinicPages() {
    var ov = AA.store.get(AA.KEYS.clinics, {}) || {};
    var out = [];
    (AA.seed.clinics || []).forEach(function (g) { g.pages.forEach(function (p) { out.push(Object.assign({}, p, ov[p.path] || {}, { edited: !!ov[p.path], group: g.name, groupId: g.id })); }); });
    return out;
  }
  function answerList() {
    var ov = AA.store.get(AA.KEYS.answers, {}) || {};
    var base = (AA.seed.answers || []).map(function (a) { return Object.assign({}, a, ov[a.slug] || {}, { edited: !!ov[a.slug] }); });
    var added = Array.isArray(ov._added) ? ov._added.map(function (a) { return Object.assign({}, a, { isNew: true, edited: true }); }) : [];
    return added.concat(base);
  }
  function clinicChecks(p) {
    var lead = p.lead || '';
    var all = [p.title, p.description, p.h1, lead].concat((p.faq || []).map(function (x) { return x.q + ' ' + x.a; })).join('\n');
    var n = AA.sentences(lead);
    var dl = AA.textLen(p.description);
    var fq = (p.faq || []).filter(function (x) { return x.q && x.a; }).length;
    var hits = AA.rules.count(all);
    return [
      { ok: HOSP_RE.test(lead), t: '첫 문단에 병원 이름이 있다', s: '떼어 인용해도 누구 이야기인지 알 수 있게' },
      { ok: n >= 2 && n <= 4, t: '첫 문단이 2~3문장이다', s: '지금 ' + n + '문장' },
      { ok: /\d/.test(lead) || !!p.basis, t: '숫자·기준이 함께 있다', s: p.basis ? '기준: ' + p.basis : '기준 표기 없음' },
      { ok: dl >= 50 && dl <= 160, t: '검색 설명이 50~160자다', s: '지금 ' + dl + '자' },
      { ok: fq >= 3 && fq <= 6, t: '자주 묻는 질문 3~6개', s: '지금 ' + fq + '개 — 화면에 보이는 질문만 구조화 데이터로 나갑니다' },
      { ok: !hits, t: '의료광고 금칙어 0건', s: hits ? hits + '건 — 아래에서 고치세요' : '' },
    ];
  }
  function answerChecks(a) {
    var lead = a.lead || '';
    var n = AA.sentences(lead);
    var also = (a.alsoAsked || []).filter(Boolean).length;
    var hits = AA.rules.count([a.q, lead].concat(a.body || []).concat(a.alsoAsked || []).join('\n'));
    return [
      { ok: /[?？]$/.test(String(a.q || '').trim()), t: '제목이 질문 그대로다', s: 'H1 = 사람들이 묻는 문장' },
      { ok: HOSP_RE.test(lead), t: '첫 문단에 병원 이름이 있다', s: '' },
      { ok: n >= 2 && n <= 4, t: '첫 문단이 2~3문장의 답이다', s: '지금 ' + n + '문장' },
      { ok: !!String(a.basis || '').trim(), t: '‘(기준: …)’ 한 줄이 있다', s: a.basis || '기준 없음' },
      { ok: also >= 2 && also <= 4, t: '이렇게도 묻습니다 2~3개', s: '지금 ' + also + '개' },
      { ok: !hits, t: '의료광고 금칙어 0건', s: hits ? hits + '건' : '' },
    ];
  }
  function meter(items) {
    var ok = items.filter(function (x) { return x.ok; }).length;
    return '<span class="ad-meter' + (ok === items.length ? ' is-full' : '') + '"><span class="ad-meter__bar"><span class="ad-meter__fill" style="width:' + Math.round((ok / items.length) * 100) + '%"></span></span><span class="tnum">' + ok + '/' + items.length + '</span></span>';
  }
  function sideHtml() {
    var c = ed.cur;
    var isA = ed.kind === 'answer';
    var checks = isA ? answerChecks(c) : clinicChecks(c);
    var all = isA ? [c.q, c.lead].concat(c.body || []).concat(c.alsoAsked || []).join('\n') : [c.title, c.description, c.h1, c.lead].concat((c.faq || []).map(function (x) { return x.q + '\n' + x.a; })).join('\n');
    return '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:10px">AI 인용 점검</h2>' + checkList(checks) + '</section>' +
      citeCard(isA ? c.q : c.h1 || c.title, c.lead, isA ? '/answers/' + c.slug + '/' : c.path) +
      '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:10px">의료광고 금칙어</h2>' + AA.rules.report(all) + '</section>';
  }
  function dirtyCount() {
    var n = 0;
    Object.keys(ed.cur).forEach(function (k) { if (JSON.stringify(ed.cur[k]) !== JSON.stringify(ed.base[k])) n++; });
    return n;
  }
  function liveSide() {
    var s = d.getElementById('ed-side'); if (s) s.innerHTML = sideHtml();
    var m = d.getElementById('ed-msg'); if (m) { var n = dirtyCount(); m.textContent = n ? '고친 항목 ' + n + '개 — 저장하지 않았습니다' : '바뀐 내용 없음'; m.classList.toggle('is-dirty', !!n); }
    Array.prototype.forEach.call(d.querySelectorAll('[data-count-for]'), function (el) {
      var k = el.getAttribute('data-count-for');
      el.innerHTML = AA.counter(AA.textLen(ed.cur[k]), +el.getAttribute('data-min') || 0, +el.getAttribute('data-max') || 0);
    });
  }
  function fld(key, label, opts) {
    opts = opts || {};
    var v = ed.cur[key] || '';
    var counter = opts.max ? '<span data-count-for="' + key + '" data-min="' + (opts.min || 0) + '" data-max="' + opts.max + '">' + AA.counter(AA.textLen(v), opts.min || 0, opts.max) + '</span>' : '';
    var input = opts.rows
      ? '<textarea class="ad-textarea" id="ed-' + key + '" rows="' + opts.rows + '" data-input="ed-f" data-k="' + key + '">' + esc(v) + '</textarea>'
      : '<input class="ad-input" id="ed-' + key + '" value="' + esc(v) + '" data-input="ed-f" data-k="' + key + '">';
    return '<label class="ad-field"><span class="ad-field__label"><span>' + esc(label) + '</span>' + counter + '</span>' + input + (opts.hint ? '<span class="ad-field__hint">' + esc(opts.hint) + '</span>' : '') + '</label>';
  }
  var edActions = {
    'ed-f': function (el) { ed.cur[el.getAttribute('data-k')] = el.value; liveSide(); },
    'ed-faq': function (el) { var i = +el.getAttribute('data-i'); ed.cur.faq[i][el.getAttribute('data-k')] = el.value; liveSide(); },
    'ed-list': function (el) { ed.cur[el.getAttribute('data-list')][+el.getAttribute('data-i')] = el.value; liveSide(); },
  };
  function redrawFaq() { var box = d.getElementById('ed-faq'); if (box) box.outerHTML = faqEd(ed.cur.faq); liveSide(); }
  function redrawList(k, ph) { var box = d.getElementById(k); if (box) box.outerHTML = listEd(k, ed.cur[k], ph); liveSide(); }
  var edClicks = {
    'ed-faq-add': function () { ed.cur.faq.push({ q: '', a: '' }); redrawFaq(); var ins = d.querySelectorAll('#ed-faq input'); if (ins.length) ins[ins.length - 1].focus(); },
    'ed-faq-del': function (el) { ed.cur.faq.splice(+el.getAttribute('data-i'), 1); redrawFaq(); },
    'ed-faq-move': function (el) { var i = +el.getAttribute('data-i'); var j = i + (+el.getAttribute('data-dir')); var f = ed.cur.faq; if (j < 0 || j >= f.length) return; f.splice(j, 0, f.splice(i, 1)[0]); redrawFaq(); },
    'ed-list-add': function (el) { var k = el.getAttribute('data-list'); ed.cur[k].push(''); redrawList(k, k === 'alsoAsked' ? '같은 뜻 다른 질문' : '보충 문단'); var ins = d.querySelectorAll('#' + k + ' input'); if (ins.length) ins[ins.length - 1].focus(); },
    'ed-list-del': function (el) { var k = el.getAttribute('data-list'); ed.cur[k].splice(+el.getAttribute('data-i'), 1); redrawList(k, k === 'alsoAsked' ? '같은 뜻 다른 질문' : '보충 문단'); },
    'ed-list-move': function (el) { var k = el.getAttribute('data-list'); var i = +el.getAttribute('data-i'); if (i < 1) return; var a = ed.cur[k]; a.splice(i - 1, 0, a.splice(i, 1)[0]); redrawList(k, k === 'alsoAsked' ? '같은 뜻 다른 질문' : '보충 문단'); },
    'ed-save': function () {
      var c = ed.cur;
      if (ed.kind === 'clinic') {
        var all = clinicPages();
        var ov = AA.store.get(AA.KEYS.clinics, {}) || {};
        c.faq = (c.faq || []).filter(function (x) { return String(x.q).trim() || String(x.a).trim(); });
        ov[c.path] = { title: c.title, description: c.description, h1: c.h1, lead: c.lead, basis: c.basis, faq: c.faq, updatedAt: new Date().toISOString() };
        AA.store.set(AA.KEYS.clinics, ov);
        ed.base = AA.clone(c);
        AA.toast('‘' + (c.navLabel || c.title) + '’ 문구를 저장했습니다' + (all.length ? '' : ''));
      } else {
        var ova = AA.store.get(AA.KEYS.answers, {}) || {};
        var rec = { q: c.q, lead: c.lead, body: (c.body || []).filter(Boolean), basis: c.basis, alsoAsked: (c.alsoAsked || []).filter(Boolean), updatedAt: new Date().toISOString() };
        if (c.isNew) {
          ova._added = (ova._added || []).map(function (a) { return a.slug === c.slug ? Object.assign({}, a, rec) : a; });
        } else ova[c.slug] = rec;
        AA.store.set(AA.KEYS.answers, ova);
        ed.base = AA.clone(c);
        AA.toast('질문 답을 저장했습니다');
      }
      liveSide();
    },
    'ed-reset': function () {
      AA.confirm({ title: '원래 문구로 되돌릴까요?', msg: '이 페이지에서 저장한 고친 내용을 지우고 사이트 데이터의 원래 문구로 돌아갑니다.', ok: '되돌리기', danger: true }).then(function (yes) {
        if (!yes) return;
        if (ed.kind === 'clinic') { var ov = AA.store.get(AA.KEYS.clinics, {}) || {}; delete ov[ed.key]; AA.store.set(AA.KEYS.clinics, ov); }
        else { var ova = AA.store.get(AA.KEYS.answers, {}) || {}; delete ova[ed.key]; AA.store.set(AA.KEYS.answers, ova); }
        ed = null;
        AA.toast('원래 문구로 되돌렸습니다');
        AA.rerender();
      });
    },
  };

  AA.views.clinics = {
    render: function (r) {
      var pages = clinicPages();
      if (r.param) {
        var path = '/' + r.param.replace(/^\/+/, '');
        var p = pages.filter(function (x) { return x.path === path; })[0];
        if (!p) return AA.head({ title: '진료 페이지', back: { href: '#/clinics', label: '진료 페이지 목록' } }) + AA.emptyHtml('페이지를 찾을 수 없습니다');
        if (!ed || ed.kind !== 'clinic' || ed.key !== path) {
          var cur = { path: p.path, navLabel: p.navLabel, title: p.title, description: p.description, h1: p.h1, lead: p.lead, basis: p.basis, faq: AA.clone(p.faq || []) };
          ed = { kind: 'clinic', key: path, base: AA.clone(cur), cur: cur };
        }
        var docs = (p.doctors || []).map(function (id) { return (AA.seed.doctors || []).filter(function (x) { return x.id === id; })[0]; }).filter(Boolean);
        return AA.head({ back: { href: '#/clinics', label: '진료 페이지 목록' }, eyebrow: p.group + ' · ' + p.path, title: p.navLabel || p.title,
          actions: AA.siteLink(p.path, '사이트에서 보기') }) +
          AA.localNote('화면 오른쪽의 AI 인용 점검은 고치는 즉시 다시 셉니다') +
          '<div class="ad-editor" style="margin-top:16px"><div class="ad-stack">' +
          '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:14px">검색·첫 문단</h2><div class="ad-form">' +
          fld('title', '페이지 제목(<title> 앞부분)', { max: 45, hint: '뒤에 ‘| 부천 사과나무치과병원’이 자동으로 붙습니다.' }) +
          fld('description', '검색 설명', { rows: 3, min: 50, max: 160, hint: '첫 문단 요약. 검색 결과와 공유 미리보기에 나갑니다.' }) +
          fld('h1', '큰 제목(H1)', { max: 60 }) +
          fld('lead', '첫 문단 — 질문에 바로 답하기', { rows: 5, max: 300, hint: '주어는 병원 또는 진료 이름, 숫자에는 단위. 이 문단만 떼어 인용해도 뜻이 통하게 씁니다.' }) +
          fld('basis', '기준', { hint: '예: 2026년 10월 병원 안내 기준' }) + '</div></section>' +
          ((p.glance || []).length ? '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:10px">한눈에 보기 <span class="muted" style="font-family:var(--sans);font-size:14px;font-weight:500">읽기 전용</span></h2><dl class="ad-dl">' + p.glance.map(function (g) { return '<div><dt>' + esc(g.label) + '</dt><dd>' + esc(g.value) + '</dd></div>'; }).join('') + '</dl></section>' : '') +
          '<section class="ad-card"><div class="ad-card__head"><h2 class="ad-card__title">자주 묻는 질문</h2><span class="muted">화면에 보이는 질문만 구조화 데이터(FAQPage)로 나갑니다</span></div>' + faqEd(ed.cur.faq) + '</section>' +
          '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:10px">본문 소제목 <span class="muted" style="font-family:var(--sans);font-size:14px;font-weight:500">' + (p.sections || []).length + '개 · 읽기 전용</span></h2><ol class="ad-aeo">' + (p.sections || []).map(function (s, i) { return '<li><span class="ad-faq-ed__no">' + String(i + 1).padStart(2, '0') + '</span><span>' + esc(s.h2) + '</span></li>'; }).join('') + '</ol>' +
          (docs.length ? '<p class="ad-field__hint" style="margin-top:12px">담당 의료진: ' + docs.map(function (x) { return esc(x.name + ' ' + x.title); }).join(', ') + '</p>' : '') + '</section>' +
          '</div><aside class="ad-editor__side" id="ed-side" aria-label="점검">' + sideHtml() + '</aside></div>' +
          '<div class="ad-savebar"><p class="ad-savebar__msg" id="ed-msg" aria-live="polite">바뀐 내용 없음</p>' + (p.edited ? '<button class="ad-btn ad-btn--ghost ad-btn--sm" type="button" data-act="ed-reset">' + icon('undo') + '원래 문구로</button>' : '') + '<button class="ad-btn ad-btn--ink" type="button" data-act="ed-save">저장</button></div>';
      }
      ed = null;
      var groups = AA.seed.clinics || [];
      var totalOk = 0;
      return AA.head({ no: AA.no('clinics'), eyebrow: '콘텐츠', title: '진료 페이지',
        lead: '진료 페이지의 제목·검색 설명·첫 문단·자주 묻는 질문을 고칩니다. 오른쪽 점수는 AI 답변 엔진이 인용하기 좋은 형식인지(첫 문단 직답·기준 표기·질문 수·금칙어)를 셉니다.' }) +
        groups.map(function (g) {
          var rows = pages.filter(function (x) { return x.groupId === g.id; });
          return '<section class="ad-group" aria-labelledby="cg-' + esc(g.id) + '"><div class="ad-group__head"><h2 class="ad-group__t" id="cg-' + esc(g.id) + '">' + esc(g.name) + '</h2><span class="ad-group__s">' + esc([g.dept, g.floor].filter(Boolean).join(' · ')) + ' · ' + rows.length + '쪽</span></div>' +
            '<div class="ad-table-wrap"><table class="ad-table ad-table--cards"><thead><tr><th>페이지</th><th>첫 문단</th><th>검색 설명</th><th>자주 묻는 질문</th><th>AI 인용 점검</th><th><span class="ad-sr">동작</span></th></tr></thead><tbody>' +
            rows.map(function (p) {
              var ch = clinicChecks(p);
              if (ch.every(function (x) { return x.ok; })) totalOk++;
              var dl = AA.textLen(p.description);
              return '<tr class="no-check"><td class="cell-head" data-label="페이지"><a class="ad-rowbtn" href="#/clinics/' + esc(p.path.replace(/^\//, '')) + '">' + esc(p.navLabel || p.title) + '</a> ' + (p.edited ? '<span class="ad-badge ad-badge--plain">고침</span>' : '') + '<br><span class="t-cell-sm">' + esc(p.path) + '</span></td>' +
                '<td data-label="첫 문단" class="tnum">' + AA.textLen(p.lead) + '자 · ' + AA.sentences(p.lead) + '문장</td>' +
                '<td data-label="검색 설명">' + AA.counter(dl, 50, 160) + '</td>' +
                '<td data-label="자주 묻는 질문" class="tnum">' + (p.faq || []).length + '개</td>' +
                '<td data-label="AI 인용 점검">' + meter(ch) + '</td>' +
                '<td data-label="" class="nw"><a class="ad-btn ad-btn--line ad-btn--sm" href="#/clinics/' + esc(p.path.replace(/^\//, '')) + '">고치기</a> ' + AA.siteLink(p.path, '보기') + '</td></tr>';
            }).join('') + '</tbody></table></div></section>';
        }).join('') + '<p class="ad-field__hint" style="margin-top:16px">점검 6개를 모두 통과한 페이지 ' + totalOk + '쪽 / ' + pages.length + '쪽</p>';
    },
    on: Object.assign({}, edActions, edClicks),
  };

  AA.views.answers = {
    render: function (r) {
      var list = answerList();
      if (r.param) {
        var a = list.filter(function (x) { return x.slug === r.param; })[0];
        if (!a) return AA.head({ title: '질문 답 페이지', back: { href: '#/answers', label: '질문 답 목록' } }) + AA.emptyHtml('질문 답을 찾을 수 없습니다');
        if (!ed || ed.kind !== 'answer' || ed.key !== a.slug) {
          var cur = { slug: a.slug, isNew: !!a.isNew, q: a.q, lead: a.lead, body: AA.clone(a.body || []), basis: a.basis, alsoAsked: AA.clone(a.alsoAsked || []) };
          ed = { kind: 'answer', key: a.slug, base: AA.clone(cur), cur: cur };
        }
        return AA.head({ back: { href: '#/answers', label: '질문 답 목록' }, eyebrow: (a.category || '질문 답') + ' · /answers/' + a.slug + '/', title: a.isNew ? '새 질문 답' : '질문 답 고치기',
          actions: a.isNew ? '<span class="ad-badge ad-badge--plain">새로 만든 초안 — 사이트에 아직 없음</span>' : AA.siteLink('/answers/' + a.slug + '/', '사이트에서 보기') }) +
          AA.localNote() +
          '<div class="ad-editor" style="margin-top:16px"><div class="ad-stack">' +
          '<section class="ad-card"><div class="ad-form">' +
          fld('q', '질문(H1 — 사람들이 묻는 문장 그대로)', { max: 60 }) +
          fld('lead', '답 — 첫 문단 2~3문장', { rows: 5, max: 300, hint: '첫 문장에서 바로 답하고, 숫자에는 단위와 기준을 붙입니다. 끝에 ‘(기준: …)’ 한 줄이 따로 붙습니다.' }) +
          fld('basis', '기준', { hint: '예: 2026년 10월 병원 진료안내 기준' }) + '</div></section>' +
          '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:10px">보충 문단</h2>' + listEd('body', ed.cur.body, '보충 문단') + '</section>' +
          '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:4px">이렇게도 묻습니다</h2><p class="ad-field__hint" style="margin-bottom:10px">같은 뜻의 다른 질문 2~3개. AI 검색에서 사람마다 다르게 묻는 말을 잡습니다.</p>' + listEd('alsoAsked', ed.cur.alsoAsked, '같은 뜻 다른 질문') + '</section>' +
          ((a.related || []).length ? '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:10px">함께 찾는 답 · 관련 페이지 <span class="muted" style="font-family:var(--sans);font-size:14px;font-weight:500">읽기 전용</span></h2><p class="ad-checks__pages" style="margin:0">' + a.related.map(function (p) { return AA.siteLink(p); }).join('') + '</p></section>' : '') +
          '</div><aside class="ad-editor__side" id="ed-side" aria-label="점검">' + sideHtml() + '</aside></div>' +
          '<div class="ad-savebar"><p class="ad-savebar__msg" id="ed-msg" aria-live="polite">바뀐 내용 없음</p>' + (a.edited && !a.isNew ? '<button class="ad-btn ad-btn--ghost ad-btn--sm" type="button" data-act="ed-reset">' + icon('undo') + '원래 문구로</button>' : '') + '<button class="ad-btn ad-btn--ink" type="button" data-act="ed-save">저장</button></div>';
      }
      ed = null;
      var cats = [];
      list.forEach(function (a) { var c = a.category || '기타'; if (cats.indexOf(c) < 0) cats.push(c); });
      return AA.head({ no: AA.no('answers'), eyebrow: '콘텐츠', title: '질문 답 페이지',
        lead: '‘부천 사과나무치과병원 야간진료는 무슨 요일에 하나요?’처럼 질문 하나에 답 하나를 두는 페이지입니다. AI 답변 엔진이 그대로 인용하기 좋게 첫 문단에서 바로 답합니다.',
        actions: '<button class="ad-btn ad-btn--ink ad-btn--sm" type="button" data-act="ans-new">' + icon('plus') + '새 질문 답</button>' }) +
        cats.map(function (c) {
          var rows = list.filter(function (a) { return (a.category || '기타') === c; });
          return '<section class="ad-group"><div class="ad-group__head"><h2 class="ad-group__t">' + esc(c) + '</h2><span class="ad-group__s">' + rows.length + '개</span></div>' +
            '<div class="ad-table-wrap"><table class="ad-table ad-table--cards"><thead><tr><th>질문</th><th>첫 문단</th><th>이렇게도 묻습니다</th><th>AI 인용 점검</th><th><span class="ad-sr">동작</span></th></tr></thead><tbody>' +
            rows.map(function (a) {
              return '<tr class="no-check"><td class="cell-head t-wrap" data-label="질문"><a class="ad-rowbtn" href="#/answers/' + esc(a.slug) + '">' + esc(a.q) + '</a> ' + (a.isNew ? '<span class="ad-badge ad-badge--warn">초안</span>' : a.edited ? '<span class="ad-badge ad-badge--plain">고침</span>' : '') + '</td>' +
                '<td data-label="첫 문단" class="tnum nw">' + AA.textLen(a.lead) + '자 · ' + AA.sentences(a.lead) + '문장</td>' +
                '<td data-label="이렇게도" class="tnum">' + (a.alsoAsked || []).length + '개</td>' +
                '<td data-label="AI 인용 점검">' + meter(answerChecks(a)) + '</td>' +
                '<td data-label="" class="nw"><a class="ad-btn ad-btn--line ad-btn--sm" href="#/answers/' + esc(a.slug) + '">고치기</a> ' + (a.isNew ? '' : AA.siteLink('/answers/' + a.slug + '/', '보기')) + '</td></tr>';
            }).join('') + '</tbody></table></div></section>';
        }).join('');
    },
    on: Object.assign({
      'ans-new': function () {
        var ova = AA.store.get(AA.KEYS.answers, {}) || {};
        var slug = 'new-' + Date.now().toString(36);
        var H = AA.seed.hospital;
        ova._added = [{ slug: slug, q: H.name + '은 ○○을 하나요?', lead: H.name + '은 ', body: [], basis: (AA.seed.site || {}).basisLabel || '', alsoAsked: [], category: '새 질문', related: [] }].concat(ova._added || []);
        AA.store.set(AA.KEYS.answers, ova);
        ed = null;
        AA.go('#/answers/' + slug);
      },
    }, edActions, edClicks),
  };

  // ════════════════════════════════════════════════════════════════════════
  // 건강정보·칼럼 — 매일 자동 초안 → 검수 → 승인 → 게시(금칙어가 남으면 승인 불가)
  // ════════════════════════════════════════════════════════════════════════
  var COL_STATUS = { review: '검수 대기', changes: '수정 요청', approved: '승인', published: '게시됨', rejected: '반려' };
  var COL_ORDER = ['review', 'changes', 'approved', 'published', 'rejected'];
  AA.columns = {
    list: function () {
      var ov = AA.store.get(AA.KEYS.columns, {}) || {};
      var drafts = ((AA.seed.forbiddenCheck || {}).drafts || []).map(function (x) {
        var o = ov[x.id] || {};
        var y = AA.clone(x);
        ['title', 'area', 'body', 'status', 'memo'].forEach(function (k) { if (o[k] != null) y[k] = o[k]; });
        if (Array.isArray(o.history)) y.history = y.history.concat(o.history);
        y.edited = !!(o.title || o.body);
        return y;
      });
      return drafts.sort(function (a, b) { return b.date.localeCompare(a.date); });
    },
    set: function (id, patch, histStatus) {
      var ov = AA.store.get(AA.KEYS.columns, {}) || {};
      var o = Object.assign({}, ov[id] || {}, patch);
      if (histStatus) o.history = (o.history || []).concat([{ at: new Date().toISOString(), status: histStatus, by: '데모 관리자' }]);
      ov[id] = o;
      AA.store.set(AA.KEYS.columns, ov);
    },
  };
  AA.badges.columns = function () { return AA.columns.list().filter(function (c) { return c.status === 'review' || c.status === 'changes'; }).length; };
  var cu = { status: '' };
  function colBadge(s) {
    var cls = { review: 'contacted', changes: 'warn', approved: 'ink', published: 'done', rejected: 'spam' }[s] || 'plain';
    return '<span class="ad-badge ad-badge--' + cls + '">' + (s === 'published' ? icon('check') : '') + esc(COL_STATUS[s] || s) + '</span>';
  }
  function colText(c) { return [c.title].concat(c.body || []).join('\n'); }
  AA.views.columns = {
    render: function (r) {
      var all = AA.columns.list();
      if (r.param) return colEditor(all.filter(function (c) { return c.id === r.param; })[0]);
      var list = all.filter(function (c) { return !cu.status || c.status === cu.status; });
      return AA.head({ no: AA.no('columns'), eyebrow: '콘텐츠', title: '건강정보·칼럼',
        lead: '사이트 진료 안내와 질문 답을 바탕으로 매일 오전 6시에 칼럼 초안이 자동으로 올라옵니다. 의료진이 검수하고 승인해야 게시되며, 의료광고 금칙어가 남은 초안은 승인할 수 없습니다.' }) +
        '<p class="ad-flow" style="margin-bottom:14px" aria-label="처리 순서"><span class="ad-flow__s">' + icon('clock') + '매일 06:00 자동 초안</span><span class="ad-flow__s">금칙어 자동 표시</span><span class="ad-flow__s">의료진 검수</span><span class="ad-flow__s">승인</span><span class="ad-flow__s">게시</span></p>' +
        AA.exampleNote('자동 초안은 예시입니다. 실제 연결 시 그로스메이트가 사이트 데이터에서 초안을 만들고, 게시는 승인한 글만 합니다. 데모에서는 게시해도 사이트에 실리지 않습니다.') +
        '<div class="ad-pipe" role="group" aria-label="상태로 거르기" style="margin-top:14px">' + COL_ORDER.map(function (s) {
          var n = all.filter(function (c) { return c.status === s; }).length;
          return '<button class="ad-pipe__s" type="button" aria-pressed="' + (cu.status === s) + '" data-act="col-filter" data-s="' + s + '"><span class="ad-pipe__k">' + esc(COL_STATUS[s]) + '</span><span class="ad-pipe__n">' + n + '</span></button>';
        }).join('') + '</div>' +
        (cu.status ? '<p style="margin:-6px 0 10px"><button class="ad-link" type="button" data-act="col-filter" data-s="">모든 상태 보기</button></p>' : '') +
        '<div class="ad-table-wrap"><table class="ad-table ad-table--cards"><thead><tr><th>날짜</th><th>제목</th><th>분야</th><th>금칙어</th><th>상태</th><th><span class="ad-sr">동작</span></th></tr></thead><tbody>' +
        list.map(function (c) {
          var n = AA.rules.count(colText(c));
          return '<tr class="no-check' + (c.status === 'review' ? ' is-new' : '') + '"><td data-label="날짜" class="tnum nw">' + esc(AA.fmt.date(c.date)) + '</td>' +
            '<td class="cell-head t-wrap" data-label="제목"><a class="ad-rowbtn" href="#/columns/' + esc(c.id) + '">' + esc(c.title) + '</a>' + (c.auto ? ' <span class="ad-badge ad-badge--example">자동 초안</span>' : '') + '</td>' +
            '<td data-label="분야">' + esc(c.area) + '</td>' +
            '<td data-label="금칙어">' + (n ? '<span class="ad-badge ad-badge--flag">' + icon('warn') + n + '곳</span>' : '<span class="ad-rules__ok" style="font-size:14px">' + icon('check') + '없음</span>') + '</td>' +
            '<td data-label="상태">' + colBadge(c.status) + '</td>' +
            '<td data-label="" class="nw"><a class="ad-btn ad-btn--line ad-btn--sm" href="#/columns/' + esc(c.id) + '">' + (c.status === 'review' || c.status === 'changes' ? '검수하기' : '열기') + '</a></td></tr>';
        }).join('') + '</tbody></table></div>';
    },
    on: {
      'col-filter': function (el) { cu.status = cu.status === el.getAttribute('data-s') ? '' : el.getAttribute('data-s'); AA.rerender(); },
      'col-live': function () {
        var t = d.getElementById('col-title'); var b = d.getElementById('col-body');
        var title = t ? t.value : ''; var body = b ? b.value : '';
        var paras = body.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        var pv = d.getElementById('col-pv'); if (pv) pv.innerHTML = '<p class="ad-preview__t">' + AA.rules.highlight(title) + '</p>' + paras.map(function (p) { return '<p>' + AA.rules.highlight(p) + '</p>'; }).join('');
        var rp = d.getElementById('col-rules'); if (rp) rp.innerHTML = AA.rules.report(title + '\n' + body, '의료광고 금칙어 없음 — 승인할 수 있습니다');
        var n = AA.rules.count(title + '\n' + body);
        var ap = d.getElementById('col-approve'); if (ap) { ap.disabled = n > 0; ap.title = n ? '금칙어를 고친 뒤 승인할 수 있습니다' : ''; }
        var m = d.getElementById('col-msg'); if (m) { m.textContent = '고친 내용이 있습니다 — 저장하거나 바로 승인하세요'; m.classList.add('is-dirty'); }
      },
      'col-save': function (el) { saveCol(el.getAttribute('data-id'), null); AA.toast('고친 내용을 저장했습니다'); AA.rerender(); },
      'col-approve': function (el) {
        var id = el.getAttribute('data-id');
        if (!saveCol(id, null)) return;
        var c = AA.columns.list().filter(function (x) { return x.id === id; })[0];
        if (AA.rules.count(colText(c))) { AA.toast('금칙어를 고친 뒤 승인할 수 있습니다'); return; }
        AA.columns.set(id, { status: 'approved' }, 'approved'); AA.toast('승인했습니다 — 게시를 누르면 공개됩니다'); AA.rerender();
      },
      'col-changes': function (el) {
        var id = el.getAttribute('data-id'); var memo = (d.getElementById('col-memo') || {}).value || '';
        if (!memo.trim()) { AA.toast('수정 요청 내용을 검수 의견에 적어 주세요'); var m = d.getElementById('col-memo'); if (m) m.focus(); return; }
        saveCol(id, null); AA.columns.set(id, { status: 'changes', memo: memo.trim() }, 'changes'); AA.toast('수정 요청을 남겼습니다'); AA.rerender();
      },
      'col-reject': function (el) {
        var id = el.getAttribute('data-id');
        AA.confirm({ title: '이 초안을 반려할까요?', msg: '반려한 초안은 게시되지 않습니다. 나중에 검수로 되돌릴 수 있습니다.', ok: '반려', danger: true }).then(function (y) {
          if (!y) return; var memo = (d.getElementById('col-memo') || {}).value || '';
          AA.columns.set(id, { status: 'rejected', memo: memo.trim() }, 'rejected'); AA.toast('반려했습니다'); AA.rerender();
        });
      },
      'col-publish': function (el) { var id = el.getAttribute('data-id'); AA.columns.set(id, { status: 'published' }, 'published'); AA.toast('게시했습니다(데모 — 사이트에는 실리지 않습니다)'); AA.rerender(); },
      'col-back': function (el) { var id = el.getAttribute('data-id'); AA.columns.set(id, { status: 'review' }, 'review'); AA.toast('검수 대기로 되돌렸습니다'); AA.rerender(); },
      'col-unpublish': function (el) { var id = el.getAttribute('data-id'); AA.columns.set(id, { status: 'approved' }, 'approved'); AA.toast('게시를 내렸습니다'); AA.rerender(); },
      'col-fix': function (el) {
        var b = d.getElementById('col-body'); var t = d.getElementById('col-title'); if (!b) return;
        var fix = function (s) {
          return s.replace(/최고의\s*의료진이\s*정밀하게\s*진단하므로\s*통증\s*없는\s*임플란트\s*치료가\s*가능합니다\.?/g, '마취 방법은 진찰 후 미리 상의하며, 회복 과정은 개인 상태에 따라 다를 수 있습니다.')
            .replace(/[^.\n]*(할인|이벤트|특가|쿠폰|선착순|사은품|프로모션)[^.\n]*\.\s*/g, '')
            .replace(/최고의\s*의료진/g, '보건복지부 인증 전문의를 포함한 의료진').replace(/통증\s*없는/g, '마취 방법을 미리 상의하는');
        };
        b.value = fix(b.value); if (t) t.value = fix(t.value);
        b.dispatchEvent(new Event('input', { bubbles: true }));
        AA.toast('추천 문장으로 바꿨습니다 — 내용을 확인하고 저장하세요');
      },
    },
  };
  function saveCol(id, status) {
    var t = d.getElementById('col-title'); var b = d.getElementById('col-body'); var a = d.getElementById('col-area'); var m = d.getElementById('col-memo');
    if (!t || !b) return true;
    var body = b.value.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!t.value.trim() || !body.length) { AA.toast('제목과 본문을 비울 수 없습니다'); return false; }
    var patch = { title: t.value.trim(), body: body, area: a ? a.value : undefined, memo: m ? m.value.trim() : undefined };
    if (status) patch.status = status;
    AA.columns.set(id, patch, null);
    return true;
  }
  function colEditor(c) {
    if (!c) return AA.head({ title: '건강정보·칼럼', back: { href: '#/columns', label: '칼럼 목록' } }) + AA.emptyHtml('초안을 찾을 수 없습니다');
    var text = colText(c);
    var n = AA.rules.count(text);
    var editable = c.status === 'review' || c.status === 'changes';
    var areas = ['임플란트', '치아교정', '예방관리', '구강내과', '구강외과', '일반진료', '충치·보철', '심미', '병원 이용'];
    if (areas.indexOf(c.area) < 0) areas.push(c.area);
    var btns = '';
    if (editable) btns = '<button class="ad-btn ad-btn--line" type="button" data-act="col-save" data-id="' + esc(c.id) + '">고친 내용 저장</button><button class="ad-btn ad-btn--line" type="button" data-act="col-changes" data-id="' + esc(c.id) + '">수정 요청</button><button class="ad-btn ad-btn--danger" type="button" data-act="col-reject" data-id="' + esc(c.id) + '">반려</button><button class="ad-btn ad-btn--ink" type="button" id="col-approve" data-act="col-approve" data-id="' + esc(c.id) + '"' + (n ? ' disabled title="금칙어를 고친 뒤 승인할 수 있습니다"' : '') + '>' + icon('check') + '승인</button>';
    else if (c.status === 'approved') btns = '<button class="ad-btn ad-btn--line" type="button" data-act="col-back" data-id="' + esc(c.id) + '">검수로 되돌리기</button><button class="ad-btn ad-btn--ink" type="button" data-act="col-publish" data-id="' + esc(c.id) + '">게시</button>';
    else if (c.status === 'published') btns = '<button class="ad-btn ad-btn--line" type="button" data-act="col-unpublish" data-id="' + esc(c.id) + '">게시 내리기</button>';
    else btns = '<button class="ad-btn ad-btn--line" type="button" data-act="col-back" data-id="' + esc(c.id) + '">검수로 되돌리기</button>';
    var hist = (c.history || []).slice().sort(function (a, b) { return Date.parse(a.at) - Date.parse(b.at); });
    return AA.head({ back: { href: '#/columns', label: '칼럼 목록' }, eyebrow: AA.fmt.date(c.date) + ' · ' + c.area + (c.auto ? ' · 자동 초안' : ''), title: c.title, actions: colBadge(c.status) }) +
      (n && editable ? '<p class="ad-note ad-note--warn" style="margin-bottom:14px"><span>' + icon('warn') + '</span><span><span class="ad-note__t">의료광고 금칙어 ' + n + '곳</span> — 고친 뒤에 승인할 수 있습니다. <button class="ad-link" type="button" data-act="col-fix">추천 문장으로 바꾸기</button></span></p>' : '') +
      (c.memo ? '<p class="ad-note" style="margin-bottom:14px"><span>' + icon('info') + '</span><span><span class="ad-note__t">검수 의견</span> ' + esc(c.memo) + '</span></p>' : '') +
      '<div class="ad-editor"><div class="ad-stack">' +
      '<section class="ad-card"><div class="ad-form">' +
      '<label class="ad-field"><span class="ad-field__label">제목</span><input class="ad-input" id="col-title" value="' + esc(c.title) + '" data-input="col-live"' + (editable ? '' : ' readonly') + '></label>' +
      '<label class="ad-field"><span class="ad-field__label">분야</span><select class="ad-select" id="col-area"' + (editable ? '' : ' disabled') + '>' + areas.map(function (a) { return '<option' + (a === c.area ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('') + '</select></label>' +
      '<label class="ad-field"><span class="ad-field__label"><span>본문</span><small>문단 사이는 빈 줄</small></span><textarea class="ad-textarea ad-textarea--tall" id="col-body" rows="10" data-input="col-live"' + (editable ? '' : ' readonly') + '>' + esc((c.body || []).join('\n\n')) + '</textarea></label>' +
      '<div class="ad-field"><span class="ad-field__label">근거 페이지 <small>초안이 사실을 가져온 곳</small></span><p class="ad-checks__pages" style="margin:0">' + (c.basis || []).map(function (p) { return AA.siteLink(p); }).join('') + '</p></div>' +
      (editable ? '<label class="ad-field"><span class="ad-field__label">검수 의견 <small>수정 요청·반려할 때</small></span><textarea class="ad-textarea" id="col-memo" rows="2" placeholder="예: 환자를 끄는 표현을 지워 주세요">' + esc(c.memo || '') + '</textarea></label>' : '') +
      '</div></section>' +
      '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:10px">처리 기록</h2><ol class="ad-timeline">' + hist.map(function (h) { return '<li><time datetime="' + esc(h.at) + '">' + esc(AA.fmt.dt(h.at)) + '</time>' + esc((h.status === 'review' && h.by === '자동 초안' ? '자동 초안 생성' : COL_STATUS[h.status] || h.status) + ' · ' + h.by) + '</li>'; }).join('') + '</ol></section>' +
      '</div><aside class="ad-editor__side" aria-label="미리보기와 금칙어">' +
      '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:10px">미리보기</h2><div class="ad-preview" id="col-pv"><p class="ad-preview__t">' + AA.rules.highlight(c.title) + '</p>' + (c.body || []).map(function (p) { return '<p>' + AA.rules.highlight(p) + '</p>'; }).join('') + '</div></section>' +
      '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:10px">의료광고 금칙어</h2><div id="col-rules">' + AA.rules.report(text, '의료광고 금칙어 없음 — 승인할 수 있습니다') + '</div><p class="ad-field__hint" style="margin-top:10px">규칙은 의료법 제56조 요약과 같습니다(효과 보장·최상급·환자 유인·치료 경험담·과장 표현).</p></section>' +
      '</aside></div>' +
      '<div class="ad-savebar"><p class="ad-savebar__msg" id="col-msg" aria-live="polite">' + (editable ? '검수 중' : esc(COL_STATUS[c.status])) + '</p>' + btns + '</div>';
  }

  // ════════════════════════════════════════════════════════════════════════
  // 소식 게시판
  // ════════════════════════════════════════════════════════════════════════
  function newsList() {
    var ov = AA.store.get(AA.KEYS.news, {}) || {};
    var base = ((AA.seed.news || {}).items || []).map(function (x) { var o = ov[x.id] || {}; return Object.assign({}, x, { home: o.home != null ? o.home : x.home, hidden: !!o.hidden }); });
    var added = Array.isArray(ov._added) ? ov._added.map(function (x) { var o = ov[x.id] || {}; return Object.assign({}, x, { added: true, home: o.home != null ? o.home : x.home, hidden: !!o.hidden }); }) : [];
    return added.concat(base).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }
  var nu = { board: '' };
  AA.views.news = {
    render: function () {
      var boards = (AA.seed.news || {}).boards || [];
      var all = newsList();
      var list = all.filter(function (x) { return !nu.board || x.board === nu.board; });
      var bname = function (id) { return (boards.filter(function (b) { return b.id === id; })[0] || {}).name || id; };
      return AA.head({ no: AA.no('news'), eyebrow: '콘텐츠', title: '소식 게시판',
        lead: '병원 소식·언론보도·학술행사·사회공헌·의료칼럼 게시판입니다. 홈 ‘병원 소식’ 칸에는 표시한 글 가운데 최신 글이 나가며, 전체회의·채용 같은 내부 글은 홈에 내보내지 않습니다.',
        actions: '<button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="news-monthly">' + icon('clock') + '진료안내 글 만들기</button><button class="ad-btn ad-btn--ink ad-btn--sm" type="button" data-act="news-new">' + icon('plus') + '새 글</button>' }) +
        '<div class="ad-tabs" role="group" aria-label="게시판으로 거르기">' + [{ id: '', name: '전체' }].concat(boards).map(function (b) {
          var n = b.id ? all.filter(function (x) { return x.board === b.id; }).length : all.length;
          return '<button class="ad-tab" type="button" aria-pressed="' + (nu.board === b.id) + '" data-act="news-board" data-b="' + esc(b.id) + '">' + esc(b.name) + ' <span class="ad-tab__n">' + n + '</span></button>';
        }).join('') + '</div>' +
        '<div class="ad-table-wrap"><table class="ad-table ad-table--cards"><thead><tr><th>날짜</th><th>게시판</th><th>제목</th><th>홈 노출</th><th>공개</th><th><span class="ad-sr">원문</span></th></tr></thead><tbody>' +
        list.map(function (x) {
          return '<tr class="no-check"><td data-label="날짜" class="tnum nw">' + esc(AA.fmt.dot(x.date)) + '</td><td data-label="게시판" class="nw">' + esc(bname(x.board)) + '</td>' +
            '<td class="cell-head t-wrap" data-label="제목"><span class="t-strong">' + esc(x.title) + '</span>' + (x.added ? ' <span class="ad-badge ad-badge--plain">새 글</span>' : '') + (x.internal ? ' <span class="ad-badge ad-badge--spam">내부 글</span>' : '') + (x.summary ? '<br><span class="t-cell-sm">' + esc(x.summary.length > 70 ? x.summary.slice(0, 69) + '…' : x.summary) + '</span>' : '') + '</td>' +
            '<td data-label="홈 노출">' + (x.internal ? '<span class="muted" title="내부 글은 홈에 나가지 않습니다">—</span>' : AA.switchHtml({ label: x.home ? '노출' : '안 함', checked: x.home, change: 'news-home', data: ' data-id="' + esc(x.id) + '" aria-label="' + esc(x.title) + ' 홈 노출"' })) + '</td>' +
            '<td data-label="공개">' + AA.switchHtml({ label: x.hidden ? '숨김' : '공개', checked: !x.hidden, change: 'news-show', data: ' data-id="' + esc(x.id) + '" aria-label="' + esc(x.title) + ' 공개"' }) + '</td>' +
            '<td data-label="원문" class="nw">' + (x.url ? '<a class="ad-ext" href="' + esc(x.url) + '" target="_blank" rel="noopener">원문<span class="ad-sr"> (새 창)</span>' + icon('ext', 'ad-ico--sm') + '</a>' : '<span class="muted">이 브라우저</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    },
    on: {
      'news-board': function (el) { nu.board = el.getAttribute('data-b'); AA.rerender(); },
      'news-home': function (el) { AA.patch(AA.KEYS.news, el.getAttribute('data-id'), { home: el.checked }); AA.rerender(); },
      'news-show': function (el) { AA.patch(AA.KEYS.news, el.getAttribute('data-id'), { hidden: !el.checked }); AA.rerender(); },
      'news-new': function () { openNews({}); },
      'news-monthly': function () { openNews(monthlyDraft()); },
      'news-live': function () { var b = d.getElementById('nw-body'); var t = d.getElementById('nw-title'); var r = d.getElementById('nw-rules'); if (r) r.innerHTML = AA.rules.report((t ? t.value : '') + '\n' + (b ? b.value : '')); },
      'news-save': function () {
        var g = function (id) { var x = d.getElementById(id); return x ? x.value.trim() : ''; };
        var title = g('nw-title'); var body = g('nw-body');
        if (!title) { AA.toast('제목을 적어 주세요'); d.getElementById('nw-title').focus(); return; }
        if (AA.rules.count(title + '\n' + body)) { AA.toast('금칙어를 고친 뒤 올릴 수 있습니다'); return; }
        var ov = AA.store.get(AA.KEYS.news, {}) || {};
        var item = { id: 'local-' + Date.now().toString(36), board: g('nw-board') || 'news', title: title, date: g('nw-date') || AA.kst().ymd, summary: body.replace(/\s+/g, ' ').slice(0, 120), body: body, url: '', home: !!(d.getElementById('nw-home') || {}).checked, internal: /전체회의|채용|신입/.test(title), status: 'published' };
        ov._added = [item].concat(ov._added || []);
        AA.store.set(AA.KEYS.news, ov);
        AA.drawer.close(true); AA.toast('글을 올렸습니다(이 브라우저)'); AA.rerender();
      },
    },
  };
  function monthlyDraft() {
    var Hs = AA.hours.get();
    var now = AA.kst();
    var y = now.m === 12 ? now.y + 1 : now.y; var m = now.m === 12 ? 1 : now.m + 1;
    var mm = AA.pad(m);
    var groups = AA.hours.groups(Hs.days);
    var lines = groups.map(function (g) { return g.label + ' ' + AA.korTime(g.o, true) + '~' + AA.korTime(g.c, true) + (g.night ? ' (야간진료)' : ''); });
    var sp = (Hs.special || []).filter(function (s) { return s.date.slice(0, 7) === y + '-' + mm; }).map(function (s) {
      var p = s.date.split('-'); return (+p[1]) + '월 ' + (+p[2]) + '일(' + AA.DOW[AA.dowOf(s.date)] + ') ' + (s.type === 'closed' ? '휴진' : AA.korTime(s.o, true) + '~' + AA.korTime(s.c, true) + ' 진료') + (s.label ? ' — ' + s.label : '');
    });
    var H = AA.seed.hospital;
    return { board: 'news', title: '사과나무치과병원 ' + m + '월 진료안내', date: AA.kst().ymd, home: true,
      body: m + '월 진료 일정을 안내해 드립니다.\n\n' + lines.join('\n') + '\n' + (Hs.closedText || '') + '\n\n' + (sp.length ? '달라지는 날\n' + sp.join('\n') : '달라지는 날이 생기면 이 글에 덧붙여 알려 드립니다.') + '\n\n예약·문의 ' + H.phone };
  }
  function openNews(x) {
    var boards = (AA.seed.news || {}).boards || [];
    AA.drawer.open({
      eyebrow: '소식 게시판', title: x.title ? '진료안내 글' : '새 글', focus: '#nw-title',
      html: '<div class="ad-form"><div class="ad-form-row"><label class="ad-field"><span class="ad-field__label">게시판</span><select class="ad-select" id="nw-board">' + boards.map(function (b) { return '<option value="' + esc(b.id) + '"' + (b.id === (x.board || 'news') ? ' selected' : '') + '>' + esc(b.name) + '</option>'; }).join('') + '</select></label>' +
        '<label class="ad-field"><span class="ad-field__label">게시일</span><input class="ad-input" id="nw-date" type="date" value="' + esc(x.date || AA.kst().ymd) + '"></label></div>' +
        '<label class="ad-field"><span class="ad-field__label">제목</span><input class="ad-input" id="nw-title" value="' + esc(x.title || '') + '" data-input="news-live"></label>' +
        '<label class="ad-field"><span class="ad-field__label">내용</span><textarea class="ad-textarea ad-textarea--tall" id="nw-body" rows="10" data-input="news-live">' + esc(x.body || '') + '</textarea></label>' +
        '<div id="nw-rules">' + AA.rules.report((x.title || '') + '\n' + (x.body || '')) + '</div>' +
        AA.switchHtml({ id: 'nw-home', label: '홈 ‘병원 소식’에 노출', checked: x.home !== false }) +
        (x.title ? '<p class="ad-field__hint">진료시간·휴진 설정(사이트 설정 › 진료시간·휴진)에서 자동으로 채웠습니다. 내용을 확인하고 올리세요.</p>' : '') + '</div>',
      foot: '<span class="ad-savebar__msg">이 브라우저에만 저장됩니다</span><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="drawer-close">취소</button><button class="ad-btn ad-btn--ink ad-btn--sm" type="button" data-act="news-save">올리기</button>',
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // 리뷰(네이버 플레이스 옮겨 적기 · 내용은 로그인한 회원만)
  // ════════════════════════════════════════════════════════════════════════
  var KW = ['친절해요', '설명을 잘해줘요', '주차하기 편해요', '대기 시간이 짧아요', '시설이 깔끔해요', '예약이 편해요'];
  function reviewList() {
    var ov = AA.store.get(AA.KEYS.reviews, {}) || {};
    var base = (AA.seed.reviews || []).map(function (r) { return Object.assign({}, r, ov[r.id] || {}); });
    var added = Array.isArray(ov._added) ? ov._added.map(function (r) { return Object.assign({ added: true }, r, ov[r.id] || {}); }) : [];
    return added.concat(base).filter(function (r) { return !r.deleted; }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }
  AA.views.reviews = {
    render: function () {
      var list = reviewList();
      var mem = list.filter(function (r) { return r.status === 'members'; }).length;
      var H = AA.seed.hospital;
      return AA.head({ no: AA.no('reviews'), eyebrow: '콘텐츠', title: '리뷰',
        lead: '네이버 플레이스에 남은 리뷰를 옮겨 적습니다. 의료광고 규정상 환자가 쓴 글은 누구나 보는 화면에 그대로 싣지 않으므로, 리뷰 내용은 로그인한 회원에게만 보입니다.',
        actions: '<a class="ad-btn ad-btn--line ad-btn--sm" href="' + esc(H.links.naverPlace) + '" target="_blank" rel="noopener">네이버 플레이스 열기<span class="ad-sr"> (새 창)</span></a><button class="ad-btn ad-btn--ink ad-btn--sm" type="button" data-act="rv-new">' + icon('plus') + '리뷰 옮겨 적기</button>' }) +
        '<div class="ad-grid ad-grid--4" style="margin-bottom:16px">' + stat('옮겨 적은 리뷰', list.length + '개') + stat('회원에게 공개', mem + '개') + stat('숨김', (list.length - mem) + '개') + stat('공개 범위', '로그인 회원') + '</div>' +
        '<div class="ad-grid ad-grid--2"><div class="ad-reviews">' + (list.length ? list.map(function (r) {
          return '<article class="ad-review' + (r.status === 'hidden' ? ' is-hidden' : '') + '"><p class="ad-review__meta"><span class="t-strong" style="color:var(--ink)">' + esc(r.author) + '</span><span class="tnum">' + esc(AA.fmt.dot(r.date)) + '</span><span>' + esc(r.subject) + '</span><span>네이버 플레이스</span>' +
            (r.status === 'members' ? '<span class="ad-badge ad-badge--contacted">' + icon('lock') + '회원 공개</span>' : '<span class="ad-badge ad-badge--spam">숨김</span>') + (r.example ? '<span class="ad-badge ad-badge--example">예시</span>' : '') + '</p>' +
            '<p class="ad-review__text">' + AA.rules.highlight(r.text) + '</p>' +
            ((r.keywords || []).length ? '<p class="ad-review__kw">' + r.keywords.map(function (k) { return '<span class="ad-badge ad-badge--plain">' + esc(k) + '</span>'; }).join('') + '</p>' : '') +
            (AA.rules.count(r.text) ? '<div style="margin-top:8px">' + AA.rules.report(r.text) + '</div>' : '') +
            '<p class="ad-review__btns"><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="rv-toggle" data-id="' + esc(r.id) + '">' + (r.status === 'members' ? '숨기기' : '회원에게 공개') + '</button><button class="ad-btn ad-btn--ghost ad-btn--sm" type="button" data-act="rv-edit" data-id="' + esc(r.id) + '">' + icon('edit') + '고치기</button>' + (r.added ? '<button class="ad-btn ad-btn--ghost ad-btn--sm" type="button" data-act="rv-del" data-id="' + esc(r.id) + '">' + icon('trash') + '지우기</button>' : '') + '</p></article>';
        }).join('') : AA.emptyHtml('옮겨 적은 리뷰가 없습니다')) + '</div>' +
        '<aside class="ad-stack"><section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:10px">사이트에서 보이는 모습</h2><p class="ad-pv-label">로그인한 회원</p>' +
        (list[0] ? '<div class="ad-review"><p class="ad-review__meta"><span>' + esc(list[0].author) + '</span><span>' + esc(AA.fmt.dot(list[0].date)) + '</span></p><p class="ad-review__text">' + esc(list[0].text) + '</p></div>' : '') +
        '<p class="ad-pv-label">로그인하지 않은 방문자</p><div class="ad-gate"><p class="ad-gate__blur" aria-hidden="true">' + esc(list[0] ? list[0].text : '리뷰 내용') + '</p><p class="ad-gate__msg">' + icon('lock') + ' 로그인하면 리뷰 내용을 볼 수 있습니다</p></div></section>' +
        '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:8px">옮겨 적을 때 지킬 것</h2><ul class="ad-aeo">' +
        ['작성자 이름은 가립니다(예: 김**)', '원문 날짜와 출처(네이버 플레이스)를 함께 적습니다', '치료 결과를 장담하는 표현이 있으면 싣지 않습니다', '사진은 옮기지 않습니다(치료 전후 사진 금지)'].map(function (t) { return '<li class="is-ok">' + icon('check') + '<span>' + esc(t) + '</span></li>'; }).join('') + '</ul></section></aside></div>';
    },
    on: {
      'rv-new': function () { openReview(null); },
      'rv-edit': function (el) { openReview(reviewList().filter(function (r) { return r.id === el.getAttribute('data-id'); })[0]); },
      'rv-toggle': function (el) { var id = el.getAttribute('data-id'); var r = reviewList().filter(function (x) { return x.id === id; })[0]; if (!r) return; AA.patch(AA.KEYS.reviews, id, { status: r.status === 'members' ? 'hidden' : 'members' }); AA.rerender(); },
      'rv-del': function (el) {
        var id = el.getAttribute('data-id');
        AA.confirm({ title: '이 리뷰를 지울까요?', msg: '옮겨 적은 내용만 지워지고 네이버 플레이스 원문은 그대로입니다.', ok: '지우기', danger: true }).then(function (y) {
          if (!y) return; var ov = AA.store.get(AA.KEYS.reviews, {}) || {}; ov._added = (ov._added || []).filter(function (r) { return r.id !== id; }); AA.store.set(AA.KEYS.reviews, ov); AA.rerender();
        });
      },
      'rv-kw': function (el) { el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); },
      'rv-live': function (el) { var r = d.getElementById('rv-rules'); if (r) r.innerHTML = AA.rules.report(el.value); },
      'rv-save': function (el) {
        var id = el.getAttribute('data-id');
        var g = function (k) { var x = d.getElementById(k); return x ? x.value.trim() : ''; };
        var text = g('rv-text');
        if (AA.textLen(text) < 5) { AA.toast('리뷰 내용을 옮겨 적어 주세요'); return; }
        var author = g('rv-author').replace(/^(\S)\S*/, function (m0, c) { return c + '**'; }) || '네이버 사용자';
        var rec = { date: g('rv-date') || AA.kst().ymd, author: author, subject: g('rv-subject'), text: text, keywords: Array.prototype.filter.call(d.querySelectorAll('[data-act="rv-kw"][aria-pressed="true"]'), function () { return true; }).map(function (b) { return b.textContent; }), status: (d.getElementById('rv-show') || {}).checked ? 'members' : 'hidden' };
        var ov = AA.store.get(AA.KEYS.reviews, {}) || {};
        if (id) { ov[id] = Object.assign({}, ov[id] || {}, rec); if (ov._added) ov._added = ov._added.map(function (r) { return r.id === id ? Object.assign({}, r, rec) : r; }); }
        else ov._added = [Object.assign({ id: 'RV-' + Date.now().toString(36), source: AA.seed.hospital.links.naverPlace }, rec)].concat(ov._added || []);
        AA.store.set(AA.KEYS.reviews, ov);
        AA.drawer.close(true); AA.toast('리뷰를 저장했습니다'); AA.rerender();
      },
    },
  };
  function openReview(r) {
    r = r || {};
    var subjects = ['임플란트', '치아교정', '예방관리', '구강내과', '구강외과', '일반진료', '심미치료'];
    AA.drawer.open({
      eyebrow: '리뷰 · 네이버 플레이스', title: r.id ? '리뷰 고치기' : '리뷰 옮겨 적기', focus: '#rv-text',
      html: '<div class="ad-form"><div class="ad-form-row ad-form-row--3"><label class="ad-field"><span class="ad-field__label">원문 날짜</span><input class="ad-input" id="rv-date" type="date" value="' + esc(r.date || AA.kst().ymd) + '"></label>' +
        '<label class="ad-field"><span class="ad-field__label">작성자 <small>자동으로 가림</small></span><input class="ad-input" id="rv-author" value="' + esc(r.author || '') + '" placeholder="예: 김민지 → 김**"></label>' +
        '<label class="ad-field"><span class="ad-field__label">방문 진료</span><select class="ad-select" id="rv-subject">' + subjects.map(function (s) { return '<option' + (s === r.subject ? ' selected' : '') + '>' + esc(s) + '</option>'; }).join('') + '</select></label></div>' +
        '<label class="ad-field"><span class="ad-field__label">리뷰 내용 <small>원문 그대로</small></span><textarea class="ad-textarea" id="rv-text" rows="6" data-input="rv-live">' + esc(r.text || '') + '</textarea></label>' +
        '<div id="rv-rules">' + AA.rules.report(r.text || '', '의료광고 금칙어 없음') + '</div>' +
        '<div class="ad-field"><span class="ad-field__label">키워드 리뷰 <small>네이버 플레이스에서 고른 것</small></span><div class="ad-chips">' + KW.map(function (k) { return '<button type="button" class="ad-chip" data-act="rv-kw" aria-pressed="' + ((r.keywords || []).indexOf(k) > -1) + '">' + esc(k) + '</button>'; }).join('') + '</div></div>' +
        AA.switchHtml({ id: 'rv-show', label: '로그인한 회원에게 공개', checked: r.status !== 'hidden' }) + '</div>',
      foot: '<span class="ad-savebar__msg">이 브라우저에만 저장됩니다</span><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="drawer-close">취소</button><button class="ad-btn ad-btn--ink ad-btn--sm" type="button" data-act="rv-save" data-id="' + esc(r.id || '') + '">저장</button>',
    });
  }
})();
