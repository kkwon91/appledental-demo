/* 관리자 데모 — 운영: 대시보드 · 상담 신청 · 온라인 상담(1:1) · 병원 확인 필요 */
(function () {
  'use strict';
  var w = window;
  var d = document;
  var AA = w.AA;
  var esc = AA.esc;
  var icon = AA.icon;

  // ════════════════════════════════════════════════════════════════════════
  // 상담 신청 모델 — 사이트 폼(localStorage 'apple_demo_leads', 10-consult.js 모양) + 예시(seed.leads)
  //   상태·메모·처리 기록은 'apple_admin_leads' 에 덧씌운다(원본 신청 기록은 건드리지 않음).
  // ════════════════════════════════════════════════════════════════════════
  var STATUS = { new: '신규', contacted: '연락함', done: '완료', spam: '스팸' };
  var STATUS_ORDER = ['new', 'contacted', 'done', 'spam'];
  var REF_NAMES = [
    [/m\.search\.naver\.com/, '네이버 검색(모바일)'], [/search\.naver\.com/, '네이버 검색'], [/(^|\.)naver\.com/, '네이버'],
    [/google\./, '구글 검색'], [/chatgpt\.com|chat\.openai\.com/, 'ChatGPT'], [/perplexity\.ai/, 'Perplexity'],
    [/gemini\.google\.com/, 'Gemini'], [/claude\.ai/, 'Claude'], [/pf\.kakao\.com|kakao\.com/, '카카오톡'], [/daum\.net/, '다음 검색'],
  ];
  var AI_REF = /chatgpt\.com|chat\.openai\.com|perplexity\.ai|gemini\.google\.com|claude\.ai/;
  function siteBase() {
    var s = AA.seed && AA.seed.site;
    var fromLoc = String(w.location.pathname).replace(/admin\/(index\.html)?$/, '');
    return fromLoc && fromLoc !== w.location.pathname ? fromLoc : (s && s.base) || '/';
  }
  function sitePath(p) {
    var base = siteBase();
    var s = String(p || '');
    if (s.indexOf(base) === 0) s = '/' + s.slice(base.length);
    if (!s) s = '/';
    return s;
  }
  function norm(l, example) {
    var at = l.createdAt && !isNaN(Date.parse(l.createdAt)) ? l.createdAt : new Date().toISOString();
    return {
      id: String(l.id || ('L' + Date.parse(at))), example: !!example, createdAt: at,
      name: String(l.name || '(이름 없음)').slice(0, 40), phone: String(l.phone || ''), phoneDigits: String(l.phoneDigits || '').replace(/\D/g, ''),
      subject: String(l.subject || ''), contactTime: String(l.contactTime || ''), message: String(l.message || '').slice(0, 2000),
      selfcheckResult: String(l.selfcheckResult || '').slice(0, 2000), source: String(l.source || ''), page: String(l.page || ''),
      referrer: String(l.referrer || ''), status: STATUS[l.status] ? l.status : 'new',
      history: Array.isArray(l.history) && l.history.length ? l.history.slice() : [{ at: at, status: 'new', by: '홈페이지' }],
      memo: String(l.memo || ''),
    };
  }
  /** 글 t 에서 가장 먼저 나오는 항목(list 가운데 name(x) 가 글에 든 것) — 같은 자리에서 시작하면 더 긴 이름
      (앞부분이 같은 이름끼리 짧은 쪽이 이기지 않게), 그래도 같으면 목록 순서. 없으면 null */
  function firstIn(t, list, name) {
    var best = null;
    var at = -1;
    var len = 0;
    (list || []).forEach(function (x) {
      var nm = String((x && name(x)) || '');
      var i = nm ? t.indexOf(nm) : -1;
      if (i < 0) return;
      if (!best || i < at || (i === at && nm.length > len)) { best = x; at = i; len = nm.length; }
    });
    return best;
  }
  AA.leads = {
    STATUS: STATUS,
    site: function () { var arr = AA.store.get('apple_demo_leads', []); return Array.isArray(arr) ? arr.filter(function (x) { return x && typeof x === 'object'; }) : []; },
    all: function () {
      var ov = AA.store.get(AA.KEYS.leads, {}) || {};
      var list = this.site().map(function (l) { return norm(l, false); }).concat((AA.seed.leads || []).map(function (l) { return norm(l, true); }));
      var seen = {};
      list = list.filter(function (l) { if (seen[l.id]) return false; seen[l.id] = 1; return true; });
      list.forEach(function (l) {
        var o = ov[l.id];
        if (!o) return;
        if (o.status && STATUS[o.status]) l.status = o.status;
        if (o.memo != null) l.memo = o.memo;
        if (Array.isArray(o.history)) l.history = l.history.concat(o.history);
      });
      return list.sort(function (a, b) { return Date.parse(b.createdAt) - Date.parse(a.createdAt); });
    },
    get: function (id) { return this.all().filter(function (l) { return l.id === id; })[0] || null; },
    setStatus: function (id, status) {
      var ov = AA.store.get(AA.KEYS.leads, {}) || {};
      var o = ov[id] || {};
      var prev = this.get(id);
      if (!prev || prev.status === status) return;
      o.status = status;
      o.history = (o.history || []).concat([{ at: new Date().toISOString(), status: status, by: '데모 관리자' }]);
      ov[id] = o;
      AA.store.set(AA.KEYS.leads, ov);
    },
    setMemo: function (id, memo) { var ov = AA.store.get(AA.KEYS.leads, {}) || {}; var o = ov[id] || {}; o.memo = memo; ov[id] = o; AA.store.set(AA.KEYS.leads, ov); },
    where: function (l) { return AA.pageLabel(sitePath(l.page)) || '홈'; },
    whereShort: function (l) { var p = sitePath(l.page); return p === '/' ? '홈' : AA.pageLabel(p); },
    from: function (l) {
      var r = l.referrer;
      if (!r) return { label: '직접 방문', ai: false };
      try {
        var u = new URL(r, w.location.href);
        var demo = AA.seed.site || {};
        var same = u.origin === w.location.origin || u.origin === demo.demoOrigin || u.origin === demo.productionOrigin;
        if (same) { var p = sitePath(u.pathname); return { label: (p === '/' ? '홈' : AA.pageLabel(p)) + '에서 이동', internal: true, ai: false }; }
        for (var i = 0; i < REF_NAMES.length; i++) if (REF_NAMES[i][0].test(u.hostname)) return { label: REF_NAMES[i][1], ai: AI_REF.test(u.hostname) };
        return { label: u.hostname, ai: false };
      } catch (e) { return { label: r.slice(0, 40), ai: false }; }
    },
    /** 자가진단 결과 글 → { area, areaId, level, levelLabel, age, text }.
        이름은 글에서 '가장 먼저 나오는 것'을 고른다(firstIn) — 앱이 넘기는 summary 는 '영역 · 연령대 · 결과 단계(제목) · 증상 · 해당 답'
        순서라, 뒤쪽 질문·증상 글에 다른 영역·연령대·단계 이름이 들어 있어도 앞 칸의 이름이 이긴다.
        영역은 이름(label)으로 먼저 찾고, 이름이 없을 때만 id 로 찾는다. 단계는 '결과 ' 바로 뒤 이름을 먼저 찾고, 없으면
        (예시 데이터처럼 '영역 · 단계 · 연령대' 모양의 글) 가장 먼저 나오는 단계 이름 */
    sc: function (text) {
      var t = String(text || '');
      if (!t) return null;
      var S = AA.seed.selfcheck || {};
      var LVS = [{ id: 'urgent', label: '진료 권장' }, { id: 'caution', label: '주의' }, { id: 'mild', label: '경미' }, { id: 'normal', label: '정상 범위' }];
      var lv = firstIn(t, LVS, function (x) { return '결과 ' + x.label; }) || firstIn(t, LVS, function (x) { return x.label; });
      var area = firstIn(t, S.areas, function (a) { return a.label; }) || firstIn(t, S.areas, function (a) { return a.id; });
      var age = firstIn(t, S.ages, function (a) { return a.label; });
      return { area: area ? area.label : '', areaId: area ? area.id : '', level: lv ? lv.id : '', levelLabel: lv ? lv.label : '', age: age ? age.label : '', text: t };
    },
  };
  AA.badges.leads = function () { return AA.leads.all().filter(function (l) { return l.status === 'new'; }).length; };
  function statusBadge(s) {
    var ic = s === 'done' ? icon('check') : '';
    return '<span class="ad-badge ad-badge--' + esc(s) + '">' + ic + esc(STATUS[s] || s) + '</span>';
  }
  AA.statusBadge = statusBadge;
  function lvlHtml(sc) {
    if (!sc || !sc.level) return sc ? '<span class="ad-badge ad-badge--plain">결과 첨부</span>' : '<span class="muted">—</span>';
    return '<span class="ad-lvl ad-lvl--' + esc(sc.level) + '">' + esc(sc.levelLabel) + '</span>';
  }

  // ════════════════════════════════════════════════════════════════════════
  // 병원 확인 필요(내부 원문 141건 → 주제 25건, seed.checks)
  //   공개 데모 파일에는 주제(분야·제목·관련 페이지)만 싣는다 — 자세한 질문은 병원에 따로 보내는 확인 질문지(비공개)에 있다.
  // ════════════════════════════════════════════════════════════════════════
  var CHECK_STATUS = [['ask', '확인 요청'], ['answered', '답변 받음'], ['applied', '반영 완료'], ['hold', '보류']];
  AA.checks = {
    STATUS: CHECK_STATUS,
    list: function () {
      var ov = AA.store.get(AA.KEYS.checks, {}) || {};
      return (AA.seed.checks || []).map(function (c) { var o = ov[c.id]; return Object.assign({}, c, { status: (o && o.status) || c.status || 'ask', note: (o && o.note) || '' }); });
    },
    open: function () { return this.list().filter(function (c) { return c.status !== 'applied'; }); },
    forDoctor: function (id) { return this.list().filter(function (c) { return (c.doctors || []).indexOf(id) > -1 && c.status !== 'applied'; }); },
  };
  var checkUi = { area: '', all: false };
  function checksPanel(opts) {
    opts = opts || {};
    var list = AA.checks.list();
    var areas = [];
    list.forEach(function (c) { if (areas.indexOf(c.area) < 0) areas.push(c.area); });
    var shown = list.filter(function (c) { return !checkUi.area || c.area === checkUi.area; });
    shown.sort(function (a, b) { var r = (a.status === 'applied') - (b.status === 'applied'); if (r) return r; return (b.priority === 'high') - (a.priority === 'high'); });
    var limit = checkUi.all || checkUi.area ? shown.length : 8;
    var applied = list.filter(function (c) { return c.status === 'applied'; }).length;
    var answered = list.filter(function (c) { return c.status === 'answered'; }).length;
    var high = list.filter(function (c) { return c.priority === 'high' && c.status !== 'applied'; }).length;
    var items = shown.slice(0, limit).map(function (c) {
      var opts2 = CHECK_STATUS.map(function (s) { return '<option value="' + s[0] + '"' + (c.status === s[0] ? ' selected' : '') + '>' + esc(s[1]) + '</option>'; }).join('');
      return '<li class="ad-checks__item' + (c.status === 'applied' ? ' is-done' : '') + '" id="chk-' + esc(c.id) + '">' +
        '<div><p class="ad-checks__meta"><span class="ad-checks__area">' + esc(c.area) + '</span>' + (c.priority === 'high' ? '<span class="ad-badge ad-badge--ink">중요</span>' : '') +
        (c.status === 'answered' ? '<span class="ad-badge ad-badge--contacted">답변 받음</span>' : c.status === 'applied' ? '<span class="ad-badge ad-badge--done">' + icon('check') + '반영 완료</span>' : c.status === 'hold' ? '<span class="ad-badge ad-badge--spam">보류</span>' : '') + '</p>' +
        '<h3 class="ad-checks__t">' + esc(c.title) + '</h3>' + (c.text ? '<p class="ad-checks__text">' + esc(c.text) + '</p>' : '') +
        '<p class="ad-checks__pages">' + (c.pages || []).slice(0, 4).map(function (p) { return AA.siteLink(p); }).join('') + '<span class="muted">비슷한 확인 ' + esc(c.merged) + '건을 합쳤습니다</span></p></div>' +
        '<div class="ad-checks__ctl"><label class="ad-field"><span class="ad-field__label">진행</span><select class="ad-select ad-input--sm" data-change="check-status" data-id="' + esc(c.id) + '" aria-label="' + esc(c.title) + ' 진행 상태">' + opts2 + '</select></label></div></li>';
    }).join('');
    return '<section class="ad-card" id="dash-checks" aria-labelledby="dash-checks-t">' +
      '<div class="ad-card__head"><div><h2 class="ad-card__title" id="dash-checks-t">병원 확인 필요 <span class="muted tnum">' + (list.length - applied) + '건</span></h2>' +
      '<p class="ad-card__sub">새 홈페이지를 만들며 원본끼리 엇갈리거나 근거가 필요한 내용을 주제별로 모았습니다. 병원에서 알려 주시면 모든 페이지를 같은 값으로 맞춥니다. 공개 데모에는 주제만 싣고, 자세한 질문은 병원에 따로 보내 드리는 확인 질문지에 있습니다.</p></div>' +
      '<div class="ad-actions"><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="check-copy">' + icon('copy') + '확인 주제 목록 복사</button></div></div>' +
      '<div class="ad-grid ad-grid--4" style="margin-bottom:14px">' +
      miniStat('남은 확인', (list.length - applied) + '건') + miniStat('중요', high + '건') + miniStat('답변 받음', answered + '건') + miniStat('반영 완료', applied + '건') + '</div>' +
      '<div class="ad-chips" role="group" aria-label="분야로 거르기" style="margin-bottom:12px">' +
      ['전체'].concat(areas).map(function (a) {
        var on = a === '전체' ? !checkUi.area : checkUi.area === a;
        var n = a === '전체' ? list.length : list.filter(function (c) { return c.area === a; }).length;
        return '<button type="button" class="ad-chip" aria-pressed="' + on + '" data-act="check-area" data-area="' + esc(a === '전체' ? '' : a) + '">' + esc(a) + ' <span class="ad-chip__n">' + n + '</span></button>';
      }).join('') + '</div>' +
      '<ul class="ad-checks">' + items + '</ul>' +
      (shown.length > limit ? '<p style="margin-top:12px"><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="check-all">모두 보기 (' + shown.length + '건)</button></p>' : '') +
      '</section>';
  }
  function miniStat(k, v) { return '<div class="ad-card" style="padding:12px 14px"><p class="ad-kpi__label" style="font-size:var(--fs-xs)">' + esc(k) + '</p><p style="font-size:24px;font-weight:700;letter-spacing:-.02em">' + esc(v) + '</p></div>'; }
  var checkActions = {
    'check-area': function (el) { checkUi.area = el.getAttribute('data-area') || ''; AA.rerender(); },
    'check-all': function () { checkUi.all = true; AA.rerender(); },
    'check-copy': function () {
      var open = AA.checks.open();
      var H = AA.seed.hospital || {};
      var text = H.name + ' 홈페이지 리뉴얼 — 병원 확인 주제 ' + open.length + '건(자세한 질문은 확인 질문지)\n\n' + open.map(function (c, i) {
        return (i + 1) + '. [' + c.area + '] ' + c.title + (c.text ? '\n' + c.text : '') + '\n관련 페이지: ' + (c.pages || []).map(function (p) { return AA.pageLabel(p); }).join(', ');
      }).join('\n\n');
      var done = function () { AA.toast('확인 주제 ' + open.length + '건을 복사했습니다'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { AA.download('병원확인요청.txt', text); });
      else AA.download('병원확인요청.txt', text);
    },
  };
  var checkChange = {
    'check-status': function (el) {
      var id = el.getAttribute('data-id');
      AA.patch(AA.KEYS.checks, id, { status: el.value });
      var name = CHECK_STATUS.filter(function (s) { return s[0] === el.value; })[0];
      AA.toast('‘' + (AA.checks.list().filter(function (c) { return c.id === id; })[0] || {}).title + '’ → ' + (name ? name[1] : el.value));
      AA.rerender();
    },
  };

  // ════════════════════════════════════════════════════════════════════════
  // 대시보드
  // ════════════════════════════════════════════════════════════════════════
  function dayCounts(list, n, pick) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var day = AA.addDays(AA.REF, -i);
      out.push({ day: day, n: list.filter(function (x) { return AA.ymdOf(pick(x)) === day || (i === 0 && AA.ymdOf(pick(x)) > day); }).length });
    }
    return out;
  }
  AA.dayCounts = dayCounts;
  AA.views.dashboard = {
    render: function () {
      var S = AA.seed;
      var H = S.hospital;
      var leads = AA.leads.all();
      var real = leads.filter(function (l) { return l.status !== 'spam'; });
      var waiting = leads.filter(function (l) { return l.status === 'new'; }).sort(function (a, b) { return Date.parse(a.createdAt) - Date.parse(b.createdAt); });
      var week = real.filter(function (l) { return AA.inLast(l.createdAt, 7); });
      var prev = real.filter(function (l) { return AA.inPrev(l.createdAt, 7); });
      var delta = week.length - prev.length;
      var sc7 = AA.sc.summary(7);
      var aeo = AA.aeoData();
      var checks = AA.checks.list();
      var openChecks = checks.filter(function (c) { return c.status !== 'applied'; });
      var onlineWait = AA.badges.online();
      var cols = AA.columns.list();
      var colReview = cols.filter(function (c) { return c.status === 'review' || c.status === 'changes'; });
      var colFlag = colReview.filter(function (c) { return AA.rules.count(c.title + '\n' + c.body.join('\n')) > 0; }).length;
      var aiLeads = real.filter(function (l) { return AA.inLast(l.createdAt, 30) && AA.leads.from(l).ai; }).length;
      var st = AA.hours.status();
      var now = AA.kst();

      var days30 = dayCounts(real, 30, function (l) { return l.createdAt; });
      var spark14 = days30.slice(-14).map(function (x) { return x.n; });
      var scDays = AA.sc.daily(14).map(function (x) { return x.completes; });

      var kpi = '<div class="ad-grid ad-grid--kpi">' +
        '<a class="ad-kpi ad-kpi--lead" href="#/leads?status=new"><p class="ad-kpi__label">' + icon('clock') + '연락 기다리는 상담</p>' +
        '<p class="ad-kpi__value">' + waiting.length + '<small>건</small></p>' +
        '<p class="ad-kpi__sub">' + (waiting.length ? '가장 오래 기다린 신청 ' + esc(AA.fmt.rel(waiting[0].createdAt)) + ' · ' + esc(waiting[0].subject || '분야 미선택') : '모든 신청에 연락했습니다') + '</p>' +
        '<p class="ad-kpi__foot"><span class="ad-kpi__go">상담 신청 열기 →</span></p></a>' +
        '<a class="ad-kpi" href="#/leads?period=7"><p class="ad-kpi__label">이번 주 상담 신청</p>' +
        '<p class="ad-kpi__value">' + week.length + '<small>건</small></p>' +
        '<p class="ad-kpi__sub">지난주 ' + prev.length + '건 · <span class="ad-delta ' + (delta >= 0 ? 'ad-delta--up' : 'ad-delta--down') + '">' + (delta >= 0 ? '▲ ' : '▼ ') + Math.abs(delta) + '건</span></p>' +
        AA.chart.html({ type: 'spark', data: spark14, height: 32 }) + '</a>' +
        '<a class="ad-kpi" href="#/selfcheck"><p class="ad-kpi__label">2분 자가진단(7일)</p>' +
        '<p class="ad-kpi__value">' + AA.num(sc7.completes) + '<small>회</small></p>' +
        '<p class="ad-kpi__sub">완료율 ' + AA.pct(sc7.completes, sc7.starts) + ' · 상담 신청으로 이어짐 ' + sc7.consults + '건</p>' +
        AA.chart.html({ type: 'spark', data: scDays, height: 32 }) + '</a>' +
        '<a class="ad-kpi" href="#/aeo"><p class="ad-kpi__label">AI 답변 속 언급</p>' +
        '<p class="ad-kpi__value">' + aeo.latest + '<small>/ ' + aeo.cells + '칸</small></p>' +
        '<p class="ad-kpi__sub">질문 5개 × AI 5곳 · 지난번보다 <span class="ad-delta ad-delta--up">+' + (aeo.latest - aeo.prev) + '칸</span> · <span class="ad-dot ad-dot--blue" aria-hidden="true"></span> 예시</p>' +
        '<div class="ad-kpi__foot">' + miniMatrix(aeo) + '</div></a>' +
        '<a class="ad-kpi" href="#dash-checks" data-act="go-checks"><p class="ad-kpi__label">병원 확인 필요</p>' +
        '<p class="ad-kpi__value">' + openChecks.length + '<small>건</small></p>' +
        '<p class="ad-kpi__sub">중요 ' + openChecks.filter(function (c) { return c.priority === 'high'; }).length + '건 · 반영 완료 ' + (checks.length - openChecks.length) + '건</p>' +
        '<div class="ad-kpi__foot" style="display:block"><div class="ad-progress" role="img" aria-label="확인 ' + checks.length + '건 중 ' + (checks.length - openChecks.length) + '건 반영"><span class="ad-progress__fill" style="width:' + Math.round(((checks.length - openChecks.length) / Math.max(1, checks.length)) * 100) + '%"></span></div></div></a>' +
        '</div>';

      var todo = [
        { n: waiting.length, t: '새 상담 신청에 연락하기', s: '신청 순서대로 전화하고 상태를 ‘연락함’으로 바꿉니다', href: '#/leads?status=new' },
        { n: onlineWait, t: '온라인 상담 답변하기', s: '답변에 금칙어가 없는지 자동으로 살핍니다', href: '#/online' },
        { n: colReview.length, t: '칼럼 초안 검수하기', s: colFlag ? '금칙어가 걸린 초안 ' + colFlag + '건 — 고친 뒤 승인할 수 있습니다' : '매일 오전 6시에 자동 초안이 올라옵니다', href: '#/columns' },
        { n: openChecks.length, t: '병원 확인 요청에 답하기', s: '진료 안내·가격·의료진 표기를 한 값으로 맞춥니다', href: '#dash-checks', act: 'go-checks' },
      ];
      var todoHtml = '<section class="ad-card" aria-labelledby="dash-todo-t"><div class="ad-card__head"><h2 class="ad-card__title" id="dash-todo-t">오늘 할 일</h2><span class="muted">' + esc(AA.fmt.date(now.ymd)) + '</span></div>' +
        '<ul class="ad-todo">' + todo.map(function (x) {
          return '<li><a class="ad-todo__a' + (x.n ? '' : ' is-zero') + '" href="' + x.href + '"' + (x.act ? ' data-act="' + x.act + '"' : '') + '><span class="ad-todo__n">' + x.n + '</span><span class="ad-todo__t">' + esc(x.t) + '<span class="ad-todo__s">' + esc(x.s) + '</span></span><span class="ad-todo__go" aria-hidden="true">' + icon('arrow') + '</span></a></li>';
        }).join('') + '</ul></section>';

      var chart30 = '<section class="ad-card" aria-labelledby="dash-30-t"><div class="ad-card__head"><div><h2 class="ad-card__title" id="dash-30-t">최근 30일 상담 신청</h2><p class="ad-card__sub">하루 신청 수(스팸 제외) · 오늘은 파란 막대</p></div><a class="ad-arrow ad-card__more" href="#/leads?period=30">신청 목록</a></div>' +
        AA.chart.html({ type: 'columns', data: days30.map(function (x) { return { label: AA.fmt.short(x.day), value: x.n, tip: [AA.fmt.date(x.day), x.n + '건'] }; }), hot: 'last', unit: '건', height: 190, ariaLabel: '최근 30일 하루 상담 신청 수 막대 그래프' }) +
        AA.chart.table('최근 30일 상담 신청', ['날짜', '신청'], days30.map(function (x) { return [AA.fmt.date(x.day), x.n + '건']; }), [1]) +
        '<p class="ad-card__foot">30일 합계 ' + AA.sum(days30, function (x) { return x.n; }) + '건' + (aiLeads ? ' · AI 검색(ChatGPT·Perplexity 등)을 거쳐 온 신청 ' + aiLeads + '건' : '') + ' · 예시 신청과 이 브라우저에서 넣은 신청을 함께 셉니다</p></section>';

      var bySubj = {};
      real.filter(function (l) { return AA.inLast(l.createdAt, 30); }).forEach(function (l) { var k = l.subject || '미선택'; bySubj[k] = (bySubj[k] || 0) + 1; });
      var subjRows = Object.keys(bySubj).map(function (k) { return { label: k === '미정' ? '잘 모르겠어요' : k, value: bySubj[k] }; }).sort(function (a, b) { return b.value - a.value; });
      if (subjRows.length) subjRows[0].hot = true;
      var subj = '<section class="ad-card" aria-labelledby="dash-subj-t"><div class="ad-card__head"><div><h2 class="ad-card__title" id="dash-subj-t">진료 분야별 신청</h2><p class="ad-card__sub">최근 30일 · 가장 많은 분야를 강조</p></div></div>' +
        AA.chart.html({ type: 'hbars', data: subjRows, unit: '건', ariaLabel: '최근 30일 진료 분야별 상담 신청 가로 막대 그래프' }) +
        AA.chart.table('진료 분야별 신청', ['진료 분야', '신청'], subjRows.map(function (x) { return [x.label, x.value + '건']; }), [1]) + '</section>';

      var waitList = '<section class="ad-card" aria-labelledby="dash-wait-t"><div class="ad-card__head"><div><h2 class="ad-card__title" id="dash-wait-t">연락 기다리는 신청</h2><p class="ad-card__sub">오래 기다린 순서 · 누르면 바로 처리 화면이 열립니다</p></div><a class="ad-arrow ad-card__more" href="#/leads?status=new">모두 보기</a></div>' +
        (waiting.length ? '<ul class="ad-mini-list">' + waiting.slice(0, 6).map(function (l) {
          var sc = AA.leads.sc(l.selfcheckResult);
          return '<li><button class="ad-mini" type="button" data-act="lead-open" data-id="' + esc(l.id) + '"><span><span class="ad-mini__t">' + esc(l.name) + ' · ' + esc(l.subject || '분야 미선택') + '</span><span class="ad-mini__s">' + esc(AA.fmt.dt(l.createdAt)) + ' · ' + esc(AA.leads.whereShort(l)) + (l.contactTime ? ' · ' + esc(l.contactTime) : '') + '</span></span>' +
            '<span>' + (sc && sc.level ? lvlHtml(sc) : statusBadge(l.status)) + '</span></button></li>';
        }).join('') + '</ul>' : AA.emptyHtml('연락을 기다리는 신청이 없습니다')) +
        (waiting.length > 6 ? '<p class="ad-card__foot">그 밖에 ' + (waiting.length - 6) + '건 더 있습니다</p>' : '') + '</section>';

      var levels = AA.sc.levelTotals(7);
      var scCard = '<section class="ad-card" aria-labelledby="dash-sc-t"><div class="ad-card__head"><div><h2 class="ad-card__title" id="dash-sc-t">자가진단 결과(7일)</h2><p class="ad-card__sub">완료 ' + AA.num(sc7.completes) + '회 · 결과 4단계</p></div><a class="ad-arrow ad-card__more" href="#/selfcheck">통계</a></div>' +
        AA.chart.html({ type: 'hbars', data: levels.map(function (x, i) { return { label: x.label, value: x.n, color: AA.chart.colors().ord[i] }; }), unit: '회', rowH: 32, ariaLabel: '최근 7일 자가진단 결과 단계별 횟수' }) +
        AA.chart.table('자가진단 결과(7일)', ['결과', '횟수'], levels.map(function (x) { return [x.label, x.n + '회']; }), [1]) +
        '<p class="ad-card__foot">‘진료 권장’ 결과 뒤 상담 신청 버튼이 함께 보입니다</p></section>';

      var conv = AA.conv.totals(30);
      var funnelCard = '<section class="ad-card" aria-labelledby="dash-cv-t"><div class="ad-card__head"><div><h2 class="ad-card__title" id="dash-cv-t">상담 신청까지(30일)</h2><p class="ad-card__sub">방문 → 상담 창 → 이름 쓰기 → 완료</p></div><span class="ad-badge ad-badge--example">예시</span></div>' +
        AA.conv.funnelHtml(conv, true) + '<p class="ad-card__foot"><a class="ad-arrow" href="#/conversion">전환 개선 보기</a></p></section>';

      var aeoCard = '<section class="ad-card" aria-labelledby="dash-aeo-t"><div class="ad-card__head"><div><h2 class="ad-card__title" id="dash-aeo-t">AI 검색 노출</h2><p class="ad-card__sub">' + esc(AA.fmt.date(aeo.date)) + ' 측정 · 질문마다 AI 5곳 중 몇 곳이 병원을 언급했나</p></div><span class="ad-badge ad-badge--example">예시</span></div>' +
        '<ul class="ad-qbars">' + aeo.queries.map(function (q) {
          var n = q.latest.filter(function (c) { return c.mentioned; }).length;
          return '<li><span class="ad-qbars__q">' + esc(q.q) + '</span><span class="ad-qbars__cells" role="img" aria-label="' + esc(aeo.engines.filter(function (e, i) { return q.latest[i].mentioned; }).join(', ') || '언급 없음') + '">' +
            q.latest.map(function (c, i) { return '<span class="' + (c.mentioned ? 'is-on' : '') + '" title="' + esc(aeo.engines[i] + (c.mentioned ? ' · ' + c.rank + '번째로 언급' : ' · 언급 없음')) + '"></span>'; }).join('') + '</span><span class="ad-qbars__n">' + n + '/5</span></li>';
        }).join('') + '</ul><p class="ad-field__hint" style="margin-top:8px">칸 순서: ' + esc(aeo.engines.join(' · ')) + '</p>' +
        '<p class="ad-card__foot"><a class="ad-arrow" href="#/aeo">질문별·AI별 보기</a></p></section>';

      var lead = '<b>이번 주 상담 신청 ' + week.length + '건</b>(지난주 ' + prev.length + '건), 그중 <b>' + waiting.length + '건</b>이 연락을 기다립니다. 2분 자가진단은 7일 동안 ' + AA.num(sc7.completes) + '번 완료됐고, AI 답변 엔진 25칸 가운데 ' + aeo.latest + '칸에서 병원이 언급됐습니다(예시).';
      return '<section class="ad-hello"><div><p class="ad-hello__date">' + esc(AA.fmt.full(now.ymd)) + ' · <span class="ad-dot ' + (st.state === 'open' ? 'ad-dot--green' : 'ad-dot--off') + '" aria-hidden="true"></span> ' + esc(st.long) + '</p>' +
        '<h1 class="ad-hello__title" id="ad-h1">' + esc(H.nameShort) + ' 홈페이지 관리</h1>' +
        '<p class="ad-hello__lead">' + lead + '</p></div>' +
        '<div class="ad-actions"><a class="ad-btn ad-btn--ink" href="#/leads?status=new">새 신청 처리하기</a><a class="ad-btn ad-btn--line" href="../" target="_blank" rel="noopener">사이트 보기<span class="ad-sr"> (새 창)</span></a></div></section>' +
        kpi +
        '<div class="ad-grid ad-grid--2 ad-sec">' + chart30 + todoHtml + '</div>' +
        '<div class="ad-grid ad-grid--2 ad-sec">' + waitList + subj + '</div>' +
        '<div class="ad-grid ad-grid--3 ad-sec">' + scCard + funnelCard + aeoCard + '</div>' +
        '<div class="ad-sec">' + checksPanel() + '</div>';
    },
    on: Object.assign({
      'go-checks': function () { var el = d.getElementById('dash-checks'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); var t = el.querySelector('h2'); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); } } },
      'lead-open': function (el) { openLead(el.getAttribute('data-id')); },
    }, checkActions, checkChange),
  };
  function miniMatrix(aeo) {
    return '<span class="ad-matrix-mini" aria-hidden="true">' + aeo.queries.map(function (q) { return q.latest.map(function (c) { return '<span class="' + (c.mentioned ? 'is-on' : '') + '"></span>'; }).join(''); }).join('') + '</span>';
  }

  // ════════════════════════════════════════════════════════════════════════
  // 상담 신청
  // ════════════════════════════════════════════════════════════════════════
  var lf = { status: 'all', subject: '', where: '', sc: '', period: 'all', q: '', origin: '' };
  var sel = {};
  function filtered(all) {
    return all.filter(function (l) {
      if (lf.status !== 'all' && l.status !== lf.status) return false;
      if (lf.subject && (l.subject || '미선택') !== lf.subject) return false;
      if (lf.where && AA.leads.whereShort(l) !== lf.where) return false;
      if (lf.sc === 'yes' && !l.selfcheckResult) return false;
      if (lf.sc === 'no' && l.selfcheckResult) return false;
      if (lf.sc && lf.sc !== 'yes' && lf.sc !== 'no') { var sc = AA.leads.sc(l.selfcheckResult); if (!sc || sc.level !== lf.sc) return false; }
      if (lf.period !== 'all' && !AA.inLast(l.createdAt, +lf.period)) return false;
      if (lf.origin === 'site' && l.example) return false;
      if (lf.origin === 'example' && !l.example) return false;
      if (lf.q) {
        var q = lf.q.trim();
        var hay = [l.name, l.subject, l.message, l.phone, l.phoneDigits.slice(-4), l.selfcheckResult].join(' ');
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }
  function leadRow(l) {
    var sc = AA.leads.sc(l.selfcheckResult);
    var from = AA.leads.from(l);
    return '<tr class="' + (l.status === 'new' ? 'is-new' : '') + (sel[l.id] ? ' is-sel' : '') + '">' +
      '<td class="cell-check"><label class="ad-check-hit"><input class="ad-check" type="checkbox" data-change="lead-sel" data-id="' + esc(l.id) + '"' + (sel[l.id] ? ' checked' : '') + ' aria-label="' + esc(l.name + ' ' + AA.fmt.dt(l.createdAt) + ' 신청 선택') + '"></label></td>' +
      '<td class="cell-head" data-label="이름"><button class="ad-rowbtn" type="button" data-act="lead-open" data-id="' + esc(l.id) + '">' + esc(l.name) + '</button> ' + (l.example ? '<span class="ad-badge ad-badge--example">예시</span>' : '<span class="ad-badge ad-badge--plain">이 브라우저</span>') + '</td>' +
      '<td data-label="신청일시" class="tnum nw">' + esc(AA.fmt.dt(l.createdAt)) + '<br><span class="t-cell-sm">' + esc(AA.fmt.rel(l.createdAt)) + '</span></td>' +
      '<td data-label="연락처" class="tnum nw">' + esc(AA.maskPhone(l.phone || l.phoneDigits)) + '</td>' +
      '<td data-label="진료 분야">' + esc(l.subject === '미정' ? '잘 모르겠어요' : l.subject || '—') + '</td>' +
      '<td data-label="신청 위치">' + esc(AA.leads.whereShort(l)) + '<br><span class="t-cell-sm">' + esc(from.label) + (from.ai ? ' · AI 검색' : '') + '</span></td>' +
      '<td data-label="자가진단">' + lvlHtml(sc) + (sc && sc.area ? '<br><span class="t-cell-sm">' + esc(sc.area) + '</span>' : '') + '</td>' +
      '<td data-label="희망 연락" class="t-cell-sm">' + esc(l.contactTime || '—') + '</td>' +
      '<td data-label="상태">' + statusBadge(l.status) + '</td></tr>';
  }
  AA.views.leads = {
    render: function (r) {
      if (r && r.query) {
        if (r.query.status && (STATUS[r.query.status] || r.query.status === 'all')) lf.status = r.query.status;
        if (r.query.period) lf.period = r.query.period;
      }
      var all = AA.leads.all();
      var list = filtered(all);
      var cnt = function (s) { return all.filter(function (l) { return s === 'all' || l.status === s; }).length; };
      var subjects = []; all.forEach(function (l) { var k = l.subject || '미선택'; if (subjects.indexOf(k) < 0) subjects.push(k); });
      var wheres = []; all.forEach(function (l) { var k = AA.leads.whereShort(l); if (wheres.indexOf(k) < 0) wheres.push(k); });
      var siteN = all.filter(function (l) { return !l.example; }).length;
      var selIds = Object.keys(sel).filter(function (k) { return sel[k]; });
      var opt = function (v, label, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>'; };
      return AA.head({ no: AA.no('leads'), eyebrow: '운영', title: '상담 신청',
        lead: '홈페이지 상담 폼으로 들어온 신청입니다. 연락처는 가려서 보이고, 번호를 열어 보면 기록이 남습니다. 연락한 뒤 상태를 바꿔 두면 대시보드의 ‘연락 기다리는 상담’이 줄어듭니다.',
        actions: '<button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="lead-csv">' + icon('download') + '목록 내려받기(CSV)</button><a class="ad-btn ad-btn--line ad-btn--sm" href="../consult/" target="_blank" rel="noopener">사이트 상담 폼 열기<span class="ad-sr"> (새 창)</span></a>' }) +
        (siteN ? '' : '<p class="ad-note" style="margin-bottom:14px"><span>' + icon('info') + '</span><span>사이트의 상담 신청 폼에 직접 신청을 넣어 보면(데모라 병원에 가지 않습니다) 이 목록 맨 위에 ‘이 브라우저’ 표시와 함께 바로 나타납니다.</span></p>') +
        '<div class="ad-tabs" role="group" aria-label="상태로 거르기">' + ['all'].concat(STATUS_ORDER).map(function (s) {
          var n = cnt(s);
          return '<button class="ad-tab" type="button" aria-pressed="' + (lf.status === s) + '" data-act="lead-status-tab" data-s="' + s + '">' + esc(s === 'all' ? '전체' : STATUS[s]) + ' <span class="ad-tab__n' + (s === 'new' && n ? ' is-hot' : '') + '">' + n + '</span></button>';
        }).join('') + '</div>' +
        '<div class="ad-filters">' +
        '<label class="ad-field"><span class="ad-field__label">진료 분야</span><select class="ad-select" data-change="lead-f" data-k="subject">' + opt('', '전체', lf.subject) + subjects.map(function (s) { return opt(s, s === '미정' ? '잘 모르겠어요' : s, lf.subject); }).join('') + '</select></label>' +
        '<label class="ad-field"><span class="ad-field__label">신청 위치</span><select class="ad-select" data-change="lead-f" data-k="where">' + opt('', '전체', lf.where) + wheres.map(function (s) { return opt(s, s, lf.where); }).join('') + '</select></label>' +
        '<label class="ad-field"><span class="ad-field__label">자가진단 결과</span><select class="ad-select" data-change="lead-f" data-k="sc">' + opt('', '전체', lf.sc) + opt('yes', '결과 첨부됨', lf.sc) + opt('urgent', '진료 권장', lf.sc) + opt('caution', '주의', lf.sc) + opt('mild', '경미', lf.sc) + opt('normal', '정상 범위', lf.sc) + opt('no', '첨부 없음', lf.sc) + '</select></label>' +
        '<label class="ad-field"><span class="ad-field__label">기간</span><select class="ad-select" data-change="lead-f" data-k="period">' + opt('all', '전체', lf.period) + opt('7', '최근 7일', lf.period) + opt('30', '최근 30일', lf.period) + '</select></label>' +
        '<label class="ad-field"><span class="ad-field__label">신청 출처</span><select class="ad-select" data-change="lead-f" data-k="origin">' + opt('', '전체', lf.origin) + opt('site', '이 브라우저(사이트 폼)', lf.origin) + opt('example', '예시 데이터', lf.origin) + '</select></label>' +
        '<label class="ad-field ad-field--grow"><span class="ad-field__label">찾기</span><input class="ad-input" type="search" id="lead-q" value="' + esc(lf.q) + '" placeholder="이름·내용·번호 끝 4자리" data-input="lead-q"></label>' +
        '</div>' +
        (selIds.length ? '<div class="ad-bulk" role="group" aria-label="선택한 신청 처리"><span>선택 ' + selIds.length + '건</span><button class="ad-btn ad-btn--sm" type="button" data-act="lead-bulk" data-s="contacted">연락함으로</button><button class="ad-btn ad-btn--sm" type="button" data-act="lead-bulk" data-s="done">완료로</button><button class="ad-btn ad-btn--sm" type="button" data-act="lead-bulk" data-s="spam">스팸으로</button><button class="ad-btn ad-btn--sm ad-btn--ghost" type="button" data-act="lead-unsel" style="color:inherit">선택 해제</button></div>' : '') +
        '<p class="ad-count" aria-live="polite">' + list.length + '건' + (list.length !== all.length ? ' (전체 ' + all.length + '건 중)' : '') + '</p>' +
        '<div class="ad-table-wrap"><table class="ad-table ad-table--cards"><caption class="ad-sr">상담 신청 목록</caption><thead><tr><th class="ad-th-check"><label class="ad-check-hit"><input class="ad-check" type="checkbox" data-change="lead-sel-all" aria-label="보이는 신청 모두 선택"' + (list.length && list.every(function (l) { return sel[l.id]; }) ? ' checked' : '') + '></label></th><th>이름</th><th>신청일시</th><th>연락처</th><th>진료 분야</th><th>신청 위치</th><th>자가진단</th><th>희망 연락</th><th>상태</th></tr></thead><tbody>' +
        (list.length ? list.map(leadRow).join('') : '<tr class="no-check"><td colspan="9">' + AA.emptyHtml('조건에 맞는 신청이 없습니다', '거르기 조건을 바꿔 보세요') + '</td></tr>') +
        '</tbody></table></div>';
    },
    after: function (main, r) {
      if (r.param) setTimeout(function () { openLead(r.param); }, 30);
    },
    on: {
      'lead-status-tab': function (el) { lf.status = el.getAttribute('data-s'); sel = {}; AA.rerender(); },
      'lead-open': function (el) { openLead(el.getAttribute('data-id')); },
      'lead-f': function (el) { lf[el.getAttribute('data-k')] = el.value; sel = {}; AA.rerender(); },
      'lead-q': function (el) { lf.q = el.value; clearTimeout(qT); qT = setTimeout(function () { AA.rerender(); }, 250); },
      'lead-sel': function (el) { sel[el.getAttribute('data-id')] = el.checked; AA.rerender(); },
      'lead-sel-all': function (el) { filtered(AA.leads.all()).forEach(function (l) { sel[l.id] = el.checked; }); AA.rerender(); },
      'lead-unsel': function () { sel = {}; AA.rerender(); },
      'lead-bulk': function (el) {
        var s = el.getAttribute('data-s');
        var ids = Object.keys(sel).filter(function (k) { return sel[k]; });
        ids.forEach(function (id) { AA.leads.setStatus(id, s); });
        sel = {};
        AA.toast(ids.length + '건을 ‘' + STATUS[s] + '’(으)로 바꿨습니다');
        AA.rerender();
      },
      'lead-csv': function () {
        var list = filtered(AA.leads.all());
        var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
        var rows = [['신청일시', '이름', '연락처(가림)', '진료 분야', '희망 연락 시간', '신청 위치', '유입', '자가진단 결과', '상태', '문의 내용', '구분']].concat(list.map(function (l) {
          return [AA.fmt.dt(l.createdAt), l.name, AA.maskPhone(l.phone || l.phoneDigits), l.subject, l.contactTime, AA.leads.whereShort(l), AA.leads.from(l).label, l.selfcheckResult, STATUS[l.status], l.message, l.example ? '예시' : '이 브라우저'];
        }));
        AA.audit('상담 신청 목록 내려받기', list.length + '건');
        AA.download('상담신청_' + AA.kst().ymd + '.csv', '﻿' + rows.map(function (r) { return r.map(q).join(','); }).join('\r\n'), 'text/csv;charset=utf-8');
        AA.toast('상담 신청 ' + list.length + '건을 내려받았습니다(연락처는 가림)');
      },
      // 서랍 안
      // 서랍 본문을 다시 그려도 포커스는 누른 버튼(같은 동작·같은 값)에 남는다(core.js AA.drawer.setBody)
      'lead-set': function (el) { var id = el.getAttribute('data-id'); var s = el.getAttribute('data-s'); AA.leads.setStatus(id, s); AA.toast('‘' + STATUS[s] + '’(으)로 바꿨습니다'); refreshLead(id); },
      'lead-phone': function (el) { var id = el.getAttribute('data-id'); AA.audit('연락처 열람', id); revealed[id] = true; refreshLead(id, '.ad-phone a'); },
      'lead-memo': function (el) { var id = el.getAttribute('data-id'); var ta = d.getElementById('lead-memo'); AA.leads.setMemo(id, ta ? ta.value.slice(0, 1000) : ''); AA.toast('메모를 저장했습니다'); refreshLead(id); },
      'lead-nav': function (el) { openLead(el.getAttribute('data-id')); },
    },
  };
  var qT = 0;
  var revealed = {};
  function leadBody(l) {
    var sc = AA.leads.sc(l.selfcheckResult);
    var from = AA.leads.from(l);
    var canReveal = !l.example && l.phoneDigits.length >= 9;
    var shown = revealed[l.id] && canReveal;
    var phoneStr = shown ? (l.phone || l.phoneDigits) : AA.maskPhone(l.phone || l.phoneDigits);
    var audits = (AA.store.get(AA.KEYS.audit, []) || []).filter(function (a) { return a.target === l.id; });
    var hist = l.history.map(function (h) { return { at: h.at, t: (h.status === 'new' ? '신청 접수' : '‘' + (STATUS[h.status] || h.status) + '’(으)로 바꿈') + ' · ' + (h.by || '') }; })
      .concat(audits.map(function (a) { return { at: a.at, t: a.what + ' · ' + a.by }; }))
      .sort(function (a, b) { return Date.parse(a.at) - Date.parse(b.at); });
    return '<div class="ad-lead__top">' + statusBadge(l.status) + (l.example ? '<span class="ad-badge ad-badge--example">예시 데이터</span>' : '<span class="ad-badge ad-badge--plain">이 브라우저에서 넣은 신청</span>') +
      '<span class="muted tnum">' + esc(AA.fmt.dt(l.createdAt)) + ' · ' + esc(AA.fmt.rel(l.createdAt)) + '</span></div>' +
      '<div><p class="ad-block-t">연락처</p><p class="ad-phone"><span class="ad-phone__no">' + esc(phoneStr || '—') + '</span>' +
      (canReveal && !shown ? '<button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="lead-phone" data-id="' + esc(l.id) + '">' + icon('eye') + '번호 보기</button>' : '') +
      (shown ? '<a class="ad-btn ad-btn--ink ad-btn--sm" href="tel:' + esc(l.phoneDigits) + '">' + icon('phone') + '전화 걸기</a>' : '') + '</p>' +
      '<p class="ad-field__hint">' + (l.example ? '예시 번호라 열 수 없습니다.' : shown ? '번호를 열어 본 기록이 남았습니다.' : '번호를 열면 열람 기록이 남습니다.') + (l.contactTime ? ' 희망 연락 시간: ' + esc(l.contactTime) : '') + '</p></div>' +
      '<div><p class="ad-block-t">상태 바꾸기</p><div class="ad-statusbar" role="group" aria-label="처리 상태">' + STATUS_ORDER.map(function (s) {
        return '<button type="button" aria-pressed="' + (l.status === s) + '" data-act="lead-set" data-id="' + esc(l.id) + '" data-s="' + s + '">' + esc(STATUS[s]) + '</button>';
      }).join('') + '</div></div>' +
      '<dl class="ad-dl"><div><dt>이름</dt><dd>' + esc(l.name) + '</dd></div><div><dt>진료 분야</dt><dd>' + esc(l.subject === '미정' ? '잘 모르겠어요' : l.subject || '선택 안 함') + '</dd></div>' +
      '<div><dt>신청 위치</dt><dd>' + esc(AA.leads.where(l)) + '</dd></div><div><dt>들어온 길</dt><dd>' + esc(from.label) + (from.ai ? ' <span class="ad-badge ad-badge--ink">AI 검색</span>' : '') + '</dd></div>' +
      '<div><dt>신청 번호</dt><dd class="tnum">' + esc(l.id) + '</dd></div></dl>' +
      '<div><p class="ad-block-t">문의 내용</p>' + (l.message ? '<p class="ad-quote">' + esc(l.message) + '</p>' : '<p class="muted">적지 않았습니다.</p>') + '</div>' +
      (sc ? '<div><p class="ad-block-t">2분 자가진단 결과</p><div class="ad-sc-card"><p class="ad-sc-card__head">' + (sc.area ? '<span class="ad-sc-card__area">' + esc(sc.area) + '</span>' : '') + lvlHtml(sc) + (sc.age ? '<span class="muted">' + esc(sc.age) + '</span>' : '') + '</p><p class="muted" style="font-size:14px">' + esc(sc.text) + '</p>' +
        '<p class="ad-field__hint" style="margin-top:6px">자가진단은 진단이 아닙니다. 통화할 때 불편한 곳을 먼저 여쭤보는 데 참고하세요.</p></div></div>' : '') +
      '<div><label class="ad-block-t" for="lead-memo" style="display:block">병원 메모</label><textarea class="ad-textarea" id="lead-memo" rows="3" maxlength="1000" placeholder="통화 내용·예약 날짜 등(환자에게 보이지 않습니다)">' + esc(l.memo) + '</textarea>' +
      '<p style="margin-top:8px"><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="lead-memo" data-id="' + esc(l.id) + '">메모 저장</button></p></div>' +
      '<div><p class="ad-block-t">처리 기록</p><ol class="ad-timeline">' + hist.map(function (h) { return '<li><time datetime="' + esc(h.at) + '">' + esc(AA.fmt.dt(h.at)) + '</time>' + esc(h.t) + '</li>'; }).join('') + '</ol></div>';
  }
  function leadFoot(l) {
    var list = filtered(AA.leads.all());
    var i = list.map(function (x) { return x.id; }).indexOf(l.id);
    var prev = i > 0 ? list[i - 1] : null;
    var next = i > -1 && i < list.length - 1 ? list[i + 1] : null;
    return '<span class="ad-savebar__msg">' + (i > -1 ? (i + 1) + ' / ' + list.length : '') + '</span>' +
      '<button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="lead-nav" data-id="' + esc(prev ? prev.id : '') + '"' + (prev ? '' : ' disabled') + '>이전 신청</button>' +
      '<button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="lead-nav" data-id="' + esc(next ? next.id : '') + '"' + (next ? '' : ' disabled') + '>다음 신청</button>' +
      '<button class="ad-btn ad-btn--ink ad-btn--sm" type="button" data-act="drawer-close">닫기</button>';
  }
  function openLead(id) {
    var l = AA.leads.get(id);
    if (!l) { AA.toast('신청을 찾을 수 없습니다'); return; }
    AA.drawer.open({ eyebrow: '상담 신청 · ' + AA.fmt.date(l.createdAt), title: l.name + ' · ' + (l.subject === '미정' ? '잘 모르겠어요' : l.subject || '분야 미선택'), html: leadBody(l), foot: leadFoot(l), onClose: function () { AA.rerender(); } });
  }
  AA.openLead = openLead;
  /** 열린 서랍만 새로 그린다. focusSel = 누른 버튼이 사라질 때(번호 보기 → 전화 걸기) 대신 포커스를 줄 곳 */
  function refreshLead(id, focusSel) {
    var l = AA.leads.get(id);
    if (!l || !AA.drawer.el) return;
    AA.drawer.setBody(leadBody(l), focusSel);
    AA.drawer.setFoot(leadFoot(l));
    AA.refreshBadges();
  }

  // ════════════════════════════════════════════════════════════════════════
  // 온라인 상담(1:1 답변)
  // ════════════════════════════════════════════════════════════════════════
  AA.online = {
    list: function () {
      var ov = AA.store.get(AA.KEYS.online, {}) || {};
      return (AA.seed.online || []).map(function (q) {
        var o = ov[q.id] || {};
        var x = AA.clone(q);
        if (o.answer) { x.answer = o.answer; x.status = 'answered'; }
        if (o.draft != null) x.draft = o.draft;
        if (o.hidden != null) x.hidden = o.hidden;
        return x;
      }).sort(function (a, b) { return Date.parse(b.createdAt) - Date.parse(a.createdAt); });
    },
  };
  AA.badges.online = function () { return AA.online.list().filter(function (q) { return q.status === 'waiting'; }).length; };
  var ou = { tab: 'waiting', editing: false };
  function phrases() {
    var H = AA.seed.hospital;
    var night = (H.hours || []).filter(function (x) { return x.note; })[0];
    return [
      '진찰 후 정확한 상태와 치료 방법을 안내해 드립니다.',
      '개인 상태에 따라 다를 수 있습니다.',
      '예약은 전화(' + H.phone + ')나 네이버 예약으로 하실 수 있습니다.',
      night ? night.label + '요일은 ' + AA.korTime(night.close) + '까지 진료합니다.' : '',
      '급하시면 진료시간에 전화로 연락 주세요.',
    ].filter(Boolean);
  }
  function threadHtml(q) {
    var S = AA.seed;
    var docs = S.doctors || [];
    var refs = (q.related || []).map(function (slug) { return (S.answers || []).filter(function (a) { return a.slug === slug; })[0]; }).filter(Boolean);
    var editing = q.status === 'waiting' || ou.editing;
    var text = q.draft != null ? q.draft : q.answer ? q.answer.text : '';
    var byOpts = ['상담실'].concat(docs.map(function (dd) { return dd.name + ' ' + dd.title; }));
    var cur = q.answer ? q.answer.by : '상담실';
    return '<article class="ad-thread" aria-labelledby="th-t"><div class="ad-thread__q"><p class="ad-thread-a__meta">' + (q.status === 'waiting' ? '<span class="ad-badge ad-badge--new">답변 대기</span>' : '<span class="ad-badge ad-badge--done">' + icon('check') + '답변 완료</span>') +
      '<span>' + esc(q.subject) + '</span><span>' + esc(q.author) + '</span><span class="tnum">' + esc(AA.fmt.dt(q.createdAt)) + '</span>' + (q.private ? '<span>' + icon('lock', 'ad-ico--sm') + ' 비공개 글</span>' : '<span>공개 글</span>') + (q.example ? '<span class="ad-badge ad-badge--example">예시</span>' : '') + '</p>' +
      '<h2 class="ad-thread__t" id="th-t">' + esc(q.title) + '</h2><p class="ad-thread__body">' + esc(q.body) + '</p></div>' +
      '<div class="ad-thread__a">' +
      (q.answer && !editing ? '<div class="ad-answer"><p class="ad-answer__by">' + esc(q.answer.by) + ' 답변 · ' + esc(AA.fmt.dt(q.answer.at)) + '</p><p style="white-space:pre-line">' + AA.rules.highlight(q.answer.text) + '</p></div>' +
        '<p style="margin-top:10px"><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="on-edit">' + icon('edit') + '답변 고치기</button></p>' :
        '<div class="ad-form"><div class="ad-form-row"><label class="ad-field"><span class="ad-field__label">답변하는 사람</span><select class="ad-select" id="on-by">' + byOpts.map(function (b) { return '<option' + (b === cur ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + '</select></label><div></div></div>' +
        '<div class="ad-field"><span class="ad-field__label"><span>자주 쓰는 문장</span><small>누르면 답변 끝에 붙습니다</small></span><div class="ad-phr">' + phrases().map(function (p, i) { return '<button type="button" class="ad-chip" data-act="on-phrase" data-i="' + i + '">' + esc(p.length > 24 ? p.slice(0, 23) + '…' : p) + '</button>'; }).join('') + '</div></div>' +
        (refs.length ? '<div class="ad-field"><span class="ad-field__label">참고할 질문 답 페이지</span>' + refs.map(function (a) { return '<div class="ad-ref"><p class="ad-ref__q">' + esc(a.q) + '</p><p class="ad-ref__lead">' + esc(a.lead) + '</p><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="on-ref" data-slug="' + esc(a.slug) + '">답변에 넣기</button> ' + AA.siteLink('/answers/' + a.slug + '/', '페이지 보기') + '</div>'; }).join('') + '</div>' : '') +
        '<label class="ad-field"><span class="ad-field__label"><span>답변</span><span id="on-count">' + AA.counter(AA.textLen(text), 0, 1000) + '</span></span><textarea class="ad-textarea ad-textarea--tall" id="on-text" maxlength="1500" data-input="on-input" placeholder="질문에 바로 답하는 문장으로 시작해 주세요.">' + esc(text) + '</textarea></label>' +
        '<div id="on-rules">' + AA.rules.report(text, '의료광고 금칙어 없음 — 답변을 등록할 수 있습니다') + '</div>' +
        '<div class="ad-actions"><button class="ad-btn ad-btn--ink" type="button" data-act="on-submit"' + (AA.rules.count(text) ? ' disabled' : '') + ' id="on-submit">' + icon('send') + (q.answer ? '답변 고쳐 등록' : '답변 등록') + '</button><button class="ad-btn ad-btn--line" type="button" data-act="on-draft">임시 저장</button>' + (q.answer ? '<button class="ad-btn ad-btn--ghost" type="button" data-act="on-cancel">취소</button>' : '') + '</div>' +
        '<p class="ad-field__hint">데모: 등록해도 환자에게 알림이 가지 않고 이 브라우저에만 저장됩니다. 실서비스에서는 답변 등록 때 문자 알림을 보낼 수 있습니다.</p></div>') +
      '</div></article>';
  }
  AA.views.online = {
    render: function (r) {
      var all = AA.online.list();
      var list = all.filter(function (q) { return ou.tab === 'all' || q.status === ou.tab; });
      var curId = r.param || (list[0] && list[0].id) || (all[0] && all[0].id);
      var cur = all.filter(function (q) { return q.id === curId; })[0];
      var n = function (s) { return all.filter(function (q) { return s === 'all' || q.status === s; }).length; };
      return AA.head({ no: AA.no('online'), eyebrow: '운영', title: '온라인 상담',
        lead: '홈페이지 온라인 상담 게시판의 1:1 질문에 답합니다. 답변을 쓰는 동안 의료광고 금칙어를 바로 표시하고, 금칙어가 남아 있으면 등록할 수 없습니다.' }) +
        '<div class="ad-tabs" role="group" aria-label="답변 상태로 거르기">' + [['waiting', '답변 대기'], ['answered', '답변 완료'], ['all', '전체']].map(function (t) {
          return '<button class="ad-tab" type="button" aria-pressed="' + (ou.tab === t[0]) + '" data-act="on-tab" data-t="' + t[0] + '">' + t[1] + ' <span class="ad-tab__n' + (t[0] === 'waiting' && n('waiting') ? ' is-hot' : '') + '">' + n(t[0]) + '</span></button>';
        }).join('') + '</div>' +
        '<div class="ad-split"><nav class="ad-split__list" aria-label="질문 목록">' + (list.length ? list.map(function (q) {
          return '<a class="ad-thread-a" href="#/online/' + esc(q.id) + '"' + (cur && q.id === cur.id ? ' aria-current="true"' : '') + '><span class="ad-thread-a__meta">' + (q.status === 'waiting' ? '<span class="ad-badge ad-badge--new">대기</span>' : '<span class="ad-badge ad-badge--done">' + icon('check') + '완료</span>') + '<span>' + esc(q.subject) + '</span><span class="tnum">' + esc(AA.fmt.rel(q.createdAt)) + '</span></span><span class="ad-thread-a__t">' + esc(q.title) + '</span><span class="ad-thread-a__meta">' + esc(q.author) + (q.private ? ' · 비공개' : '') + '</span></a>';
        }).join('') : AA.emptyHtml('이 상태의 질문이 없습니다')) + '</nav>' +
        '<div id="on-thread">' + (cur ? threadHtml(cur) : AA.emptyHtml('질문을 고르세요')) + '</div></div>';
    },
    after: function (main, r) {
      // 좁은 화면은 목록 아래에 답변 칸이 있어, 질문을 고르면 그 자리로 내려간다
      if (r.param && w.innerWidth < 960) { var t = d.getElementById('on-thread'); if (t) setTimeout(function () { t.scrollIntoView({ block: 'start' }); }, 30); }
    },
    on: {
      'on-tab': function (el) { ou.tab = el.getAttribute('data-t'); ou.editing = false; AA.go('#/online'); },
      'on-edit': function () { ou.editing = true; AA.rerender(); var t = d.getElementById('on-text'); if (t) t.focus(); },
      'on-cancel': function () { ou.editing = false; AA.rerender(); },
      'on-input': function (el) {
        var c = d.getElementById('on-count'); if (c) c.innerHTML = AA.counter(AA.textLen(el.value), 0, 1000);
        var r = d.getElementById('on-rules'); if (r) r.innerHTML = AA.rules.report(el.value, '의료광고 금칙어 없음 — 답변을 등록할 수 있습니다');
        var b = d.getElementById('on-submit'); if (b) b.disabled = AA.rules.count(el.value) > 0;
      },
      'on-phrase': function (el) {
        var t = d.getElementById('on-text'); if (!t) return;
        var p = phrases()[+el.getAttribute('data-i')] || '';
        t.value = (t.value.trim() ? t.value.replace(/\s+$/, '') + ' ' : '') + p;
        t.dispatchEvent(new Event('input', { bubbles: true })); t.focus();
      },
      'on-ref': function (el) {
        var a = (AA.seed.answers || []).filter(function (x) { return x.slug === el.getAttribute('data-slug'); })[0];
        var t = d.getElementById('on-text'); if (!a || !t) return;
        t.value = (t.value.trim() ? t.value.replace(/\s+$/, '') + '\n\n' : '') + a.lead;
        t.dispatchEvent(new Event('input', { bubbles: true })); t.focus();
      },
      'on-draft': function () {
        var id = AA.parseHash().param || (AA.online.list().filter(function (q) { return ou.tab === 'all' || q.status === ou.tab; })[0] || {}).id;
        var t = d.getElementById('on-text'); if (!id || !t) return;
        var ov = AA.store.get(AA.KEYS.online, {}) || {}; ov[id] = Object.assign({}, ov[id] || {}, { draft: t.value }); AA.store.set(AA.KEYS.online, ov);
        AA.toast('임시 저장했습니다');
      },
      'on-submit': function () {
        var all = AA.online.list();
        var id = AA.parseHash().param || (all.filter(function (q) { return ou.tab === 'all' || q.status === ou.tab; })[0] || {}).id;
        var t = d.getElementById('on-text'); var by = d.getElementById('on-by');
        if (!id || !t) return;
        var text = t.value.trim();
        if (AA.textLen(text) < 10) { AA.toast('답변을 10자 이상 써 주세요'); t.focus(); return; }
        if (AA.rules.count(text)) { AA.toast('금칙어를 고친 뒤 등록할 수 있습니다'); return; }
        var ov = AA.store.get(AA.KEYS.online, {}) || {};
        ov[id] = Object.assign({}, ov[id] || {}, { answer: { at: new Date().toISOString(), by: by ? by.value : '상담실', text: text }, draft: null });
        AA.store.set(AA.KEYS.online, ov);
        ou.editing = false;
        AA.toast('답변을 등록했습니다');
        AA.rerender();
      },
    },
  };
})();
