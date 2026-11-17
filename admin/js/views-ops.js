/* 관리자 — 운영: 대시보드 · 상담 신청 · 병원 확인 필요
   상담 신청은 사이트 운영 서버에서 읽고(목록), 상태·메모·연락처 열람 기록·지우기도 서버에 남긴다(js/remote.js). */
(function () {
  'use strict';
  var w = window;
  var d = document;
  var AA = w.AA;
  var esc = AA.esc;
  var icon = AA.icon;

  // ════════════════════════════════════════════════════════════════════════
  // 상담 신청 모델 — 서버(사이트 운영 서버)의 문의 기록. 홈페이지 신청서(10-consult.js)가 보낸 그대로다.
  //   서버 상태 글자(신규·연락함·완료·스팸) ↔ 화면 열쇠(new·contacted·done·spam)
  // ════════════════════════════════════════════════════════════════════════
  var STATUS = { new: '신규', contacted: '연락함', done: '완료', spam: '스팸' };
  var STATUS_ORDER = ['new', 'contacted', 'done', 'spam'];
  var ST_IN = { '신규': 'new', '연락함': 'contacted', '완료': 'done', '스팸': 'spam' };
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
  function fmtPhone(digits) {
    var v = String(digits || '').replace(/\D/g, '');
    if (/^02/.test(v)) return v.length > 9 ? v.replace(/^(02)(\d{4})(\d+)/, '$1-$2-$3') : v.replace(/^(02)(\d{3})(\d+)/, '$1-$2-$3');
    if (v.length > 10) return v.replace(/^(\d{3})(\d{4})(\d+)/, '$1-$2-$3');
    if (v.length > 6) return v.replace(/^(\d{3})(\d{3})(\d+)/, '$1-$2-$3');
    return v;
  }
  /** 서버 문의 기록 → 화면용 */
  function norm(r) {
    var at = r.at && !isNaN(Date.parse(r.at)) ? r.at : new Date().toISOString();
    var digits = String(r.phone || '').replace(/\D/g, '');
    return {
      id: String(r.id || ''), test: !!r.test, createdAt: at,
      name: String(r.name || '(이름 없음)').slice(0, 40), phone: fmtPhone(digits), phoneDigits: digits,
      subject: String(r.subject || ''), contactTime: String(r.time || ''), message: String(r.msg || '').slice(0, 2000),
      selfcheckResult: String(r.selfcheck || '').slice(0, 2000), source: String(r.src || ''), page: String(r.page || ''),
      referrer: String(r.ref || ''), utm: r.utm && typeof r.utm === 'object' ? r.utm : {}, adConsent: !!r.mkt,
      status: ST_IN[r.status] || 'new', memo: String(r.memo || ''),
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
  /** 서버 요청 실패 공통 처리 — 로그인이 풀렸으면 로그인 화면으로, 아니면 알림 */
  function fail(e) {
    if (e && e.message === 'login') { if (AA.sessionExpired) AA.sessionExpired(); return; }
    AA.toast('서버에 저장하지 못했습니다. 잠시 뒤 다시 해 주세요');
  }
  AA.leads = {
    STATUS: STATUS,
    cache: [],        // 서버에서 읽어 온 신청(화면용)
    state: 'idle',    // idle | loading | ok | error
    loadedAt: 0,
    audits: {},       // 신청 번호 → 처리 기록(서버)
    /** 서버에서 목록을 다시 읽는다. quiet = 1분마다 도는 새로 고침(실패해도 화면을 바꾸지 않는다) */
    load: function (quiet) {
      var self = this;
      if (!AA.remote || !AA.remote.on) { self.state = 'error'; return Promise.resolve(false); }
      if (!quiet) self.state = 'loading';
      return AA.remote.admin('inqList').then(function (r) {
        var before = self.loadedAt ? self.cache.filter(function (l) { return l.status === 'new'; }).length : -1;
        self.cache = (r.inquiries || []).map(norm).sort(function (a, b) { return Date.parse(b.createdAt) - Date.parse(a.createdAt); });
        self.state = 'ok';
        self.loadedAt = Date.now();
        var now = self.cache.filter(function (l) { return l.status === 'new'; }).length;
        if (quiet && before > -1 && now > before) AA.toast('새 상담 신청이 들어왔습니다');
        return true;
      }, function (e) {
        if (e && e.message === 'login') { if (AA.sessionExpired) AA.sessionExpired(); return false; }
        if (!quiet || !self.loadedAt) self.state = 'error';
        return false;
      }).then(function (ok) {
        if (!AA.session.on()) return ok;
        AA.refreshBadges();
        var on = AA.route && (AA.route.name === 'dashboard' || AA.route.name === 'leads');
        if (on && !AA.drawer.el && !d.querySelector('.ad-dialog')) {
          var typing = d.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(d.activeElement.tagName) && d.activeElement.type !== 'checkbox';
          if (!quiet || !typing) AA.rerender();
        }
        return ok;
      });
    },
    all: function () { return this.cache; },
    get: function (id) { return this.cache.filter(function (l) { return l.id === id; })[0] || null; },
    /** 상태 바꾸기 — 화면을 먼저 바꾸고, 서버가 거절하면 되돌린다 */
    setStatus: function (id, status) {
      var l = this.get(id);
      if (!l || l.status === status || !STATUS[status]) return Promise.resolve(false);
      var prev = l.status;
      l.status = status;
      return AA.remote.admin('inqStatus', { id: id, status: STATUS[status] }).then(function () { return true; }, function (e) { l.status = prev; throw e; });
    },
    setMemo: function (id, memo) {
      var l = this.get(id);
      if (!l) return Promise.resolve(false);
      return AA.remote.admin('inqMemo', { id: id, memo: memo }).then(function () { l.memo = memo; return true; });
    },
    remove: function (id) {
      var self = this;
      return AA.remote.admin('inqDelete', { id: id }).then(function () { self.cache = self.cache.filter(function (l) { return l.id !== id; }); delete self.audits[id]; return true; });
    },
    loadAudits: function (id) {
      var self = this;
      return AA.remote.admin('inqAudit', { id: id }).then(function (r) { self.audits[id] = r.audits || []; return self.audits[id]; });
    },
    where: function (l) { return AA.pageLabel(sitePath(l.page)) || '홈'; },
    whereShort: function (l) { var p = sitePath(l.page); return p === '/' ? '홈' : AA.pageLabel(p); },
    from: function (l) {
      var r = l.referrer;
      if (!r) return { label: l.utm && l.utm.utm_source ? '광고·링크(' + l.utm.utm_source + ')' : '직접 방문', ai: false };
      try {
        var u = new URL(r, w.location.href);
        var site = AA.seed.site || {};
        var same = u.origin === w.location.origin || u.origin === site.demoOrigin || u.origin === site.productionOrigin;
        if (same) { var p = sitePath(u.pathname); return { label: (p === '/' ? '홈' : AA.pageLabel(p)) + '에서 이동', internal: true, ai: false }; }
        for (var i = 0; i < REF_NAMES.length; i++) if (REF_NAMES[i][0].test(u.hostname)) return { label: REF_NAMES[i][1], ai: AI_REF.test(u.hostname) };
        return { label: u.hostname, ai: false };
      } catch (e) { return { label: r.slice(0, 40), ai: false }; }
    },
    /** 자가진단 결과 글 → { area, areaId, level, levelLabel, age, text }.
        이름은 글에서 '가장 먼저 나오는 것'을 고른다(firstIn) — 앱이 넘기는 summary 는 '영역 · 연령대 · 결과 단계(제목) · 증상 · 해당 답'
        순서라, 뒤쪽 질문·증상 글에 다른 영역·연령대·단계 이름이 들어 있어도 앞 칸의 이름이 이긴다.
        영역은 이름(label)으로 먼저 찾고, 이름이 없을 때만 id 로 찾는다. 단계는 '결과 ' 바로 뒤 이름을 먼저 찾고, 없으면 가장 먼저 나오는 단계 이름 */
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
  AA.actions['lead-reload'] = function () { AA.leads.load().then(function (ok) { if (ok) AA.toast('상담 신청을 새로 불러왔습니다'); }); };
  function statusBadge(s) {
    var ic = s === 'done' ? icon('check') : '';
    return '<span class="ad-badge ad-badge--' + esc(s) + '">' + ic + esc(STATUS[s] || s) + '</span>';
  }
  AA.statusBadge = statusBadge;
  var TEST_BADGE = '<span class="ad-badge ad-badge--example">시험</span>';
  function lvlHtml(sc) {
    if (!sc || !sc.level) return sc ? '<span class="ad-badge ad-badge--plain">결과 첨부</span>' : '<span class="muted">—</span>';
    return '<span class="ad-lvl ad-lvl--' + esc(sc.level) + '">' + esc(sc.levelLabel) + '</span>';
  }
  /** 서버 연결·불러오기 상태 안내(정상일 땐 빈 글) */
  function stateNote() {
    var L = AA.leads;
    if (!AA.remote || !AA.remote.on) return '<p class="ad-note ad-note--warn" style="margin-bottom:14px"><span>' + icon('warn') + '</span><span><span class="ad-note__t">운영 서버 연결 전입니다.</span> 상담 신청을 받을 서버 주소가 아직 설정되지 않았습니다.</span></p>';
    if (L.state === 'error') return '<p class="ad-note ad-note--warn" style="margin-bottom:14px"><span>' + icon('warn') + '</span><span><span class="ad-note__t">상담 신청을 불러오지 못했습니다.</span> 인터넷 연결을 확인한 뒤 다시 불러와 주세요. <button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="lead-reload">다시 불러오기</button></span></p>';
    if (!L.loadedAt) return '<p class="ad-note" style="margin-bottom:14px"><span>' + icon('info') + '</span><span>상담 신청을 불러오는 중입니다…</span></p>';
    return '';
  }

  // ════════════════════════════════════════════════════════════════════════
  // 병원 확인 필요(내부 원문 141건 → 주제 25건, seed.checks)
  //   공개되는 파일에는 주제(분야·제목·관련 페이지)만 싣는다 — 자세한 질문은 병원에 따로 보내는 확인 질문지(비공개)에 있다.
  //   홈페이지를 여는 동안 쓰는 목록이라 실서비스 빌드에는 싣지 않는다(목록이 비면 대시보드에서 이 칸이 사라진다).
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
      '<p class="ad-card__sub">새 홈페이지를 만들며 원본끼리 엇갈리거나 근거가 필요한 내용을 주제별로 모았습니다. 병원에서 알려 주시면 모든 페이지를 같은 값으로 맞춥니다. 이 화면에는 주제만 싣고, 자세한 질문은 병원에 따로 보내 드리는 확인 질문지에 있습니다. 진행 표시는 아직 이 브라우저에만 남습니다.</p></div>' +
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
  // 대시보드 — 실제 기록만(상담 신청 = 서버, 병원 확인 = 홈페이지를 만들며 모은 확인 주제)
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
      var real = leads.filter(function (l) { return l.status !== 'spam' && !l.test; }); // 통계는 스팸·시험 신청을 뺀다
      var waiting = leads.filter(function (l) { return l.status === 'new'; }).sort(function (a, b) { return Date.parse(a.createdAt) - Date.parse(b.createdAt); });
      var week = real.filter(function (l) { return AA.inLast(l.createdAt, 7); });
      var prev = real.filter(function (l) { return AA.inPrev(l.createdAt, 7); });
      var delta = week.length - prev.length;
      var month = real.filter(function (l) { return AA.inLast(l.createdAt, 30); });
      var aiLeads = month.filter(function (l) { return AA.leads.from(l).ai; }).length;
      var scLeads = month.filter(function (l) { return !!l.selfcheckResult; });
      var scUrgent = scLeads.filter(function (l) { var sc = AA.leads.sc(l.selfcheckResult); return sc && sc.level === 'urgent'; }).length;
      var checks = AA.checks.list();
      var openChecks = checks.filter(function (c) { return c.status !== 'applied'; });
      var st = AA.hours.status();
      var now = AA.kst();

      var days30 = dayCounts(real, 30, function (l) { return l.createdAt; });
      var spark14 = days30.slice(-14).map(function (x) { return x.n; });

      var kpi = '<div class="ad-grid ad-grid--kpi">' +
        '<a class="ad-kpi ad-kpi--lead" href="#/leads?status=new"><p class="ad-kpi__label">' + icon('clock') + '연락 기다리는 상담</p>' +
        '<p class="ad-kpi__value">' + waiting.length + '<small>건</small></p>' +
        '<p class="ad-kpi__sub">' + (waiting.length ? '가장 오래 기다린 신청 ' + esc(AA.fmt.rel(waiting[0].createdAt)) + ' · ' + esc(waiting[0].subject || '분야 미선택') : '모든 신청에 연락했습니다') + '</p>' +
        '<p class="ad-kpi__foot"><span class="ad-kpi__go">상담 신청 열기 →</span></p></a>' +
        '<a class="ad-kpi" href="#/leads?period=7"><p class="ad-kpi__label">이번 주 상담 신청</p>' +
        '<p class="ad-kpi__value">' + week.length + '<small>건</small></p>' +
        '<p class="ad-kpi__sub">지난주 ' + prev.length + '건 · <span class="ad-delta ' + (delta >= 0 ? 'ad-delta--up' : 'ad-delta--down') + '">' + (delta >= 0 ? '▲ ' : '▼ ') + Math.abs(delta) + '건</span></p>' +
        AA.chart.html({ type: 'spark', data: spark14, height: 32 }) + '</a>' +
        '<a class="ad-kpi" href="#/leads?period=30"><p class="ad-kpi__label">최근 30일 상담 신청</p>' +
        '<p class="ad-kpi__value">' + month.length + '<small>건</small></p>' +
        '<p class="ad-kpi__sub">' + (aiLeads ? 'AI 검색(ChatGPT·Perplexity 등)을 거쳐 온 신청 ' + aiLeads + '건' : '스팸·시험 신청은 세지 않습니다') + '</p></a>' +
        '<a class="ad-kpi" href="#/leads?period=30"><p class="ad-kpi__label">자가진단 결과가 붙은 신청(30일)</p>' +
        '<p class="ad-kpi__value">' + scLeads.length + '<small>건</small></p>' +
        '<p class="ad-kpi__sub">그중 ‘진료 권장’ 결과 ' + scUrgent + '건</p></a>' +
        (checks.length ? '<a class="ad-kpi" href="#dash-checks" data-act="go-checks"><p class="ad-kpi__label">병원 확인 필요</p>' +
        '<p class="ad-kpi__value">' + openChecks.length + '<small>건</small></p>' +
        '<p class="ad-kpi__sub">중요 ' + openChecks.filter(function (c) { return c.priority === 'high'; }).length + '건 · 반영 완료 ' + (checks.length - openChecks.length) + '건</p>' +
        '<div class="ad-kpi__foot" style="display:block"><div class="ad-progress" role="img" aria-label="확인 ' + checks.length + '건 중 ' + (checks.length - openChecks.length) + '건 반영"><span class="ad-progress__fill" style="width:' + Math.round(((checks.length - openChecks.length) / Math.max(1, checks.length)) * 100) + '%"></span></div></div></a>' : '') +
        '</div>';

      var todo = [
        { n: waiting.length, t: '새 상담 신청에 연락하기', s: '신청 순서대로 전화하고 상태를 ‘연락함’으로 바꿉니다', href: '#/leads?status=new' },
      ];
      if (checks.length) todo.push({ n: openChecks.length, t: '병원 확인 요청에 답하기', s: '진료 안내·가격·의료진 표기를 한 값으로 맞춥니다', href: '#dash-checks', act: 'go-checks' });
      var todoHtml = '<section class="ad-card" aria-labelledby="dash-todo-t"><div class="ad-card__head"><h2 class="ad-card__title" id="dash-todo-t">오늘 할 일</h2><span class="muted">' + esc(AA.fmt.date(now.ymd)) + '</span></div>' +
        '<ul class="ad-todo">' + todo.map(function (x) {
          return '<li><a class="ad-todo__a' + (x.n ? '' : ' is-zero') + '" href="' + x.href + '"' + (x.act ? ' data-act="' + x.act + '"' : '') + '><span class="ad-todo__n">' + x.n + '</span><span class="ad-todo__t">' + esc(x.t) + '<span class="ad-todo__s">' + esc(x.s) + '</span></span><span class="ad-todo__go" aria-hidden="true">' + icon('arrow') + '</span></a></li>';
        }).join('') + '</ul></section>';

      var chart30 = '<section class="ad-card" aria-labelledby="dash-30-t"><div class="ad-card__head"><div><h2 class="ad-card__title" id="dash-30-t">최근 30일 상담 신청</h2><p class="ad-card__sub">하루 신청 수(스팸·시험 신청 제외) · 오늘은 파란 막대</p></div><a class="ad-arrow ad-card__more" href="#/leads?period=30">신청 목록</a></div>' +
        AA.chart.html({ type: 'columns', data: days30.map(function (x) { return { label: AA.fmt.short(x.day), value: x.n, tip: [AA.fmt.date(x.day), x.n + '건'] }; }), hot: 'last', unit: '건', height: 190, ariaLabel: '최근 30일 하루 상담 신청 수 막대 그래프' }) +
        AA.chart.table('최근 30일 상담 신청', ['날짜', '신청'], days30.map(function (x) { return [AA.fmt.date(x.day), x.n + '건']; }), [1]) +
        '<p class="ad-card__foot">30일 합계 ' + AA.sum(days30, function (x) { return x.n; }) + '건 · 홈페이지 상담 신청서로 들어와 서버에 저장된 신청만 셉니다</p></section>';

      var bySubj = {};
      month.forEach(function (l) { var k = l.subject || '미선택'; bySubj[k] = (bySubj[k] || 0) + 1; });
      var subjRows = Object.keys(bySubj).map(function (k) { return { label: k === '미정' ? '잘 모르겠어요' : k, value: bySubj[k] }; }).sort(function (a, b) { return b.value - a.value; });
      if (subjRows.length) subjRows[0].hot = true;
      var subj = '<section class="ad-card" aria-labelledby="dash-subj-t"><div class="ad-card__head"><div><h2 class="ad-card__title" id="dash-subj-t">진료 분야별 신청</h2><p class="ad-card__sub">최근 30일 · 가장 많은 분야를 강조</p></div></div>' +
        (subjRows.length ? AA.chart.html({ type: 'hbars', data: subjRows, unit: '건', ariaLabel: '최근 30일 진료 분야별 상담 신청 가로 막대 그래프' }) +
          AA.chart.table('진료 분야별 신청', ['진료 분야', '신청'], subjRows.map(function (x) { return [x.label, x.value + '건']; }), [1])
          : AA.emptyHtml('최근 30일 신청이 아직 없습니다')) + '</section>';

      var waitList = '<section class="ad-card" aria-labelledby="dash-wait-t"><div class="ad-card__head"><div><h2 class="ad-card__title" id="dash-wait-t">연락 기다리는 신청</h2><p class="ad-card__sub">오래 기다린 순서 · 누르면 바로 처리 화면이 열립니다</p></div><a class="ad-arrow ad-card__more" href="#/leads?status=new">모두 보기</a></div>' +
        (waiting.length ? '<ul class="ad-mini-list">' + waiting.slice(0, 6).map(function (l) {
          var sc = AA.leads.sc(l.selfcheckResult);
          return '<li><button class="ad-mini" type="button" data-act="lead-open" data-id="' + esc(l.id) + '"><span><span class="ad-mini__t">' + esc(l.name) + ' · ' + esc(l.subject || '분야 미선택') + (l.test ? ' ' + TEST_BADGE : '') + '</span><span class="ad-mini__s">' + esc(AA.fmt.dt(l.createdAt)) + ' · ' + esc(AA.leads.whereShort(l)) + (l.contactTime ? ' · ' + esc(l.contactTime) : '') + '</span></span>' +
            '<span>' + (sc && sc.level ? lvlHtml(sc) : statusBadge(l.status)) + '</span></button></li>';
        }).join('') + '</ul>' : AA.emptyHtml('연락을 기다리는 신청이 없습니다')) +
        (waiting.length > 6 ? '<p class="ad-card__foot">그 밖에 ' + (waiting.length - 6) + '건 더 있습니다</p>' : '') + '</section>';

      var lead = AA.leads.loadedAt
        ? '<b>이번 주 상담 신청 ' + week.length + '건</b>(지난주 ' + prev.length + '건). 연락을 기다리는 신청은 <b>' + waiting.length + '건</b>입니다.'
        : '홈페이지로 들어온 상담 신청을 확인하고 연락 상태를 남기는 화면입니다.';
      return '<section class="ad-hello"><div><p class="ad-hello__date">' + esc(AA.fmt.full(now.ymd)) + ' · <span class="ad-dot ' + (st.state === 'open' ? 'ad-dot--green' : 'ad-dot--off') + '" aria-hidden="true"></span> ' + esc(st.long) + '</p>' +
        '<h1 class="ad-hello__title" id="ad-h1">' + esc(H.nameShort) + ' 홈페이지 관리</h1>' +
        '<p class="ad-hello__lead">' + lead + '</p></div>' +
        '<div class="ad-actions"><a class="ad-btn ad-btn--ink" href="#/leads?status=new">새 신청 처리하기</a><a class="ad-btn ad-btn--line" href="../" target="_blank" rel="noopener">사이트 보기<span class="ad-sr"> (새 창)</span></a></div></section>' +
        stateNote() + kpi +
        '<div class="ad-grid ad-grid--2 ad-sec">' + chart30 + todoHtml + '</div>' +
        '<div class="ad-grid ad-grid--2 ad-sec">' + waitList + subj + '</div>' +
        (checks.length ? '<div class="ad-sec">' + checksPanel() + '</div>' : '');
    },
    on: Object.assign({
      'go-checks': function () { var el = d.getElementById('dash-checks'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); var t = el.querySelector('h2'); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); } } },
      'lead-open': function (el) { openLead(el.getAttribute('data-id')); },
    }, checkActions, checkChange),
  };

  // ════════════════════════════════════════════════════════════════════════
  // 상담 신청
  // ════════════════════════════════════════════════════════════════════════
  var lf = { status: 'all', subject: '', where: '', sc: '', period: 'all', q: '', kind: '' };
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
      if (lf.kind === 'real' && l.test) return false;
      if (lf.kind === 'test' && !l.test) return false;
      if (lf.q) {
        var q = lf.q.trim();
        var hay = [l.name, l.subject, l.message, l.phoneDigits.slice(-4), l.selfcheckResult, l.memo].join(' ');
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
      '<td class="cell-head" data-label="이름"><button class="ad-rowbtn" type="button" data-act="lead-open" data-id="' + esc(l.id) + '">' + esc(l.name) + '</button>' + (l.test ? ' ' + TEST_BADGE : '') + '</td>' +
      '<td data-label="신청일시" class="tnum nw">' + esc(AA.fmt.dt(l.createdAt)) + '<br><span class="t-cell-sm">' + esc(AA.fmt.rel(l.createdAt)) + '</span></td>' +
      '<td data-label="연락처" class="tnum nw">' + esc(AA.maskPhone(l.phoneDigits)) + '</td>' +
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
      var selIds = Object.keys(sel).filter(function (k) { return sel[k]; });
      var opt = function (v, label, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>'; };
      var loaded = AA.leads.loadedAt ? '<span class="muted" style="font-size:var(--fs-xs)">' + esc(AA.fmt.dt(new Date(AA.leads.loadedAt).toISOString())) + ' 기준 · 1분마다 새로 확인</span>' : '';
      return AA.head({ no: AA.no('leads'), eyebrow: '운영', title: '상담 신청',
        lead: '홈페이지 상담 신청서로 들어온 신청입니다. 연락처는 가려서 보이고, 번호를 열어 보면 기록이 남습니다. 연락한 뒤 상태를 바꿔 두면 대시보드의 ‘연락 기다리는 상담’이 줄어듭니다.',
        actions: '<button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="lead-reload">' + icon('undo') + '새로 불러오기</button><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="lead-csv">' + icon('download') + '목록 내려받기(CSV)</button><a class="ad-btn ad-btn--line ad-btn--sm" href="../consult/" target="_blank" rel="noopener">사이트 상담 신청서 열기<span class="ad-sr"> (새 창)</span></a>' }) +
        stateNote() +
        '<div class="ad-tabs" role="group" aria-label="상태로 거르기">' + ['all'].concat(STATUS_ORDER).map(function (s) {
          var n = cnt(s);
          return '<button class="ad-tab" type="button" aria-pressed="' + (lf.status === s) + '" data-act="lead-status-tab" data-s="' + s + '">' + esc(s === 'all' ? '전체' : STATUS[s]) + ' <span class="ad-tab__n' + (s === 'new' && n ? ' is-hot' : '') + '">' + n + '</span></button>';
        }).join('') + '</div>' +
        '<div class="ad-filters">' +
        '<label class="ad-field"><span class="ad-field__label">진료 분야</span><select class="ad-select" data-change="lead-f" data-k="subject">' + opt('', '전체', lf.subject) + subjects.map(function (s) { return opt(s, s === '미정' ? '잘 모르겠어요' : s, lf.subject); }).join('') + '</select></label>' +
        '<label class="ad-field"><span class="ad-field__label">신청 위치</span><select class="ad-select" data-change="lead-f" data-k="where">' + opt('', '전체', lf.where) + wheres.map(function (s) { return opt(s, s, lf.where); }).join('') + '</select></label>' +
        '<label class="ad-field"><span class="ad-field__label">자가진단 결과</span><select class="ad-select" data-change="lead-f" data-k="sc">' + opt('', '전체', lf.sc) + opt('yes', '결과 첨부됨', lf.sc) + opt('urgent', '진료 권장', lf.sc) + opt('caution', '주의', lf.sc) + opt('mild', '경미', lf.sc) + opt('normal', '정상 범위', lf.sc) + opt('no', '첨부 없음', lf.sc) + '</select></label>' +
        '<label class="ad-field"><span class="ad-field__label">기간</span><select class="ad-select" data-change="lead-f" data-k="period">' + opt('all', '전체', lf.period) + opt('7', '최근 7일', lf.period) + opt('30', '최근 30일', lf.period) + '</select></label>' +
        '<label class="ad-field"><span class="ad-field__label">구분</span><select class="ad-select" data-change="lead-f" data-k="kind">' + opt('', '전체', lf.kind) + opt('real', '실제 신청', lf.kind) + opt('test', '시험 신청', lf.kind) + '</select></label>' +
        '<label class="ad-field ad-field--grow"><span class="ad-field__label">찾기</span><input class="ad-input" type="search" id="lead-q" value="' + esc(lf.q) + '" placeholder="이름·내용·번호 끝 4자리" data-input="lead-q"></label>' +
        '</div>' +
        (selIds.length ? '<div class="ad-bulk" role="group" aria-label="선택한 신청 처리"><span>선택 ' + selIds.length + '건</span><button class="ad-btn ad-btn--sm" type="button" data-act="lead-bulk" data-s="contacted">연락함으로</button><button class="ad-btn ad-btn--sm" type="button" data-act="lead-bulk" data-s="done">완료로</button><button class="ad-btn ad-btn--sm" type="button" data-act="lead-bulk" data-s="spam">스팸으로</button><button class="ad-btn ad-btn--sm ad-btn--ghost" type="button" data-act="lead-unsel" style="color:inherit">선택 해제</button></div>' : '') +
        '<p class="ad-count" aria-live="polite">' + list.length + '건' + (list.length !== all.length ? ' (전체 ' + all.length + '건 중)' : '') + (loaded ? ' · ' + loaded : '') + '</p>' +
        '<div class="ad-table-wrap"><table class="ad-table ad-table--cards"><caption class="ad-sr">상담 신청 목록</caption><thead><tr><th class="ad-th-check"><label class="ad-check-hit"><input class="ad-check" type="checkbox" data-change="lead-sel-all" aria-label="보이는 신청 모두 선택"' + (list.length && list.every(function (l) { return sel[l.id]; }) ? ' checked' : '') + '></label></th><th>이름</th><th>신청일시</th><th>연락처</th><th>진료 분야</th><th>신청 위치</th><th>자가진단</th><th>희망 연락</th><th>상태</th></tr></thead><tbody>' +
        (list.length ? list.map(leadRow).join('') : '<tr class="no-check"><td colspan="9">' + (all.length ? AA.emptyHtml('조건에 맞는 신청이 없습니다', '거르기 조건을 바꿔 보세요') : AA.emptyHtml('아직 들어온 상담 신청이 없습니다', '홈페이지 상담 신청서로 신청이 들어오면 이 목록에 나타납니다')) + '</td></tr>') +
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
        Promise.all(ids.map(function (id) { return AA.leads.setStatus(id, s); })).then(function () {
          sel = {};
          AA.toast(ids.length + '건을 ‘' + STATUS[s] + '’(으)로 바꿨습니다');
          AA.rerender();
        }, function (e) { fail(e); AA.leads.load(true); });
      },
      'lead-csv': function () {
        var list = filtered(AA.leads.all());
        var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
        var rows = [['신청일시', '이름', '연락처(가림)', '진료 분야', '희망 연락 시간', '신청 위치', '유입', '자가진단 결과', '상태', '문의 내용', '병원 메모', '구분']].concat(list.map(function (l) {
          return [AA.fmt.dt(l.createdAt), l.name, AA.maskPhone(l.phoneDigits), l.subject, l.contactTime, AA.leads.whereShort(l), AA.leads.from(l).label, l.selfcheckResult, STATUS[l.status], l.message, l.memo, l.test ? '시험' : '실제'];
        }));
        AA.audit('상담 신청 목록 내려받기', list.length + '건');
        AA.download('상담신청_' + AA.kst().ymd + '.csv', '﻿' + rows.map(function (r) { return r.map(q).join(','); }).join('\r\n'), 'text/csv;charset=utf-8');
        AA.toast('상담 신청 ' + list.length + '건을 내려받았습니다(연락처는 가림)');
      },
      // 서랍 안
      // 서랍 본문을 다시 그려도 포커스는 누른 버튼(같은 동작·같은 값)에 남는다(core.js AA.drawer.setBody)
      'lead-set': function (el) {
        var id = el.getAttribute('data-id'); var s = el.getAttribute('data-s');
        AA.leads.setStatus(id, s).then(function (changed) {
          if (changed) AA.toast('‘' + STATUS[s] + '’(으)로 바꿨습니다');
          refreshLead(id);
          return AA.leads.loadAudits(id).then(function () { refreshLead(id); });
        }).catch(function (e) { fail(e); refreshLead(id); });
        refreshLead(id);
      },
      // 번호는 서버에 열람 기록을 남긴 뒤에만 보인다
      'lead-phone': function (el) {
        var id = el.getAttribute('data-id');
        AA.remote.admin('inqPhone', { id: id }).then(function () {
          revealed[id] = true;
          refreshLead(id, '.ad-phone a');
          return AA.leads.loadAudits(id).then(function () { refreshLead(id, '.ad-phone a'); });
        }).catch(fail);
      },
      'lead-memo': function (el) {
        var id = el.getAttribute('data-id'); var ta = d.getElementById('lead-memo');
        AA.leads.setMemo(id, ta ? ta.value.slice(0, 1000) : '').then(function () {
          AA.toast('메모를 저장했습니다');
          return AA.leads.loadAudits(id).then(function () { refreshLead(id); });
        }).catch(fail);
      },
      'lead-del': function (el) {
        var id = el.getAttribute('data-id'); var l = AA.leads.get(id);
        if (!l) return;
        AA.confirm({ title: '이 신청을 지울까요?', msg: l.name + ' · ' + AA.fmt.dt(l.createdAt) + ' 신청과 메모·처리 기록이 서버에서 지워집니다. 되돌릴 수 없습니다.', ok: '지우기', danger: true }).then(function (yes) {
          if (!yes) return;
          AA.leads.remove(id).then(function () { AA.drawer.close(true); AA.toast('신청을 지웠습니다'); AA.rerender(); }, fail);
        });
      },
      'lead-nav': function (el) { openLead(el.getAttribute('data-id')); },
    },
  };
  var qT = 0;
  var revealed = {};
  var AUDIT_T = {
    inqStatus: function (a) { return '‘' + String(a.note || '').split(' ').slice(1).join(' ') + '’(으)로 바꿈'; },
    inqMemo: function () { return '메모 저장'; },
    inqPhone: function () { return '연락처 열람'; },
  };
  function leadBody(l) {
    var sc = AA.leads.sc(l.selfcheckResult);
    var from = AA.leads.from(l);
    var canReveal = l.phoneDigits.length >= 9;
    var shown = revealed[l.id] && canReveal;
    var phoneStr = shown ? l.phone : AA.maskPhone(l.phoneDigits);
    var audits = AA.leads.audits[l.id];
    var hist = [{ at: l.createdAt, t: '신청 접수 · 홈페이지' + (l.test ? '(시험 접수 화면)' : '') }]
      .concat((audits || []).filter(function (a) { return AUDIT_T[a.action]; }).map(function (a) { return { at: a.at, t: AUDIT_T[a.action](a) + ' · ' + (a.actor || '') }; }))
      .sort(function (a, b) { return Date.parse(a.at) - Date.parse(b.at); });
    return '<div class="ad-lead__top">' + statusBadge(l.status) + (l.test ? '<span class="ad-badge ad-badge--example">시험 신청</span>' : '') +
      '<span class="muted tnum">' + esc(AA.fmt.dt(l.createdAt)) + ' · ' + esc(AA.fmt.rel(l.createdAt)) + '</span></div>' +
      '<div><p class="ad-block-t">연락처</p><p class="ad-phone"><span class="ad-phone__no">' + esc(phoneStr || '—') + '</span>' +
      (canReveal && !shown ? '<button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="lead-phone" data-id="' + esc(l.id) + '">' + icon('eye') + '번호 보기</button>' : '') +
      (shown ? '<a class="ad-btn ad-btn--ink ad-btn--sm" href="tel:' + esc(l.phoneDigits) + '">' + icon('phone') + '전화 걸기</a>' : '') + '</p>' +
      '<p class="ad-field__hint">' + (shown ? '번호를 열어 본 기록이 남았습니다.' : '번호를 열면 열람 기록이 남습니다.') + (l.contactTime ? ' 희망 연락 시간: ' + esc(l.contactTime) : '') + '</p></div>' +
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
      '<div><p class="ad-block-t">처리 기록</p><ol class="ad-timeline">' + hist.map(function (h) { return '<li><time datetime="' + esc(h.at) + '">' + esc(AA.fmt.dt(h.at)) + '</time>' + esc(h.t) + '</li>'; }).join('') + '</ol>' +
      (audits ? '' : '<p class="ad-field__hint">처리 기록을 불러오는 중…</p>') + '</div>' +
      '<div><p class="ad-block-t">신청 지우기</p><p class="ad-field__hint" style="margin-bottom:8px">' + (l.test ? '시험 신청은 확인한 뒤 지워 주세요.' : '보관 기간이 지났거나 신청인이 삭제를 요청한 경우에 지웁니다.') + ' 지우면 되돌릴 수 없습니다.</p>' +
      '<button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="lead-del" data-id="' + esc(l.id) + '">이 신청 지우기</button></div>';
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
    AA.leads.loadAudits(id).then(function () { refreshLead(id); }, function (e) { if (e && e.message === 'login') fail(e); });
  }
  AA.openLead = openLead;
  /** 열린 서랍만 새로 그린다. focusSel = 누른 버튼이 사라질 때(번호 보기 → 전화 걸기) 대신 포커스를 줄 곳 */
  function refreshLead(id, focusSel) {
    var l = AA.leads.get(id);
    if (!l || !AA.drawer.el) return;
    var ta = d.getElementById('lead-memo');
    var typed = ta && ta.value !== l.memo ? ta.value : null; // 쓰던 메모는 다시 그려도 지우지 않는다
    AA.drawer.setBody(leadBody(l), focusSel);
    if (typed != null) { var ta2 = d.getElementById('lead-memo'); if (ta2) ta2.value = typed; }
    AA.drawer.setFoot(leadFoot(l));
    AA.refreshBadges();
  }
})();
