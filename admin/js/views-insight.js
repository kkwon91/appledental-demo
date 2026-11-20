/* 관리자 — 성과: 자가진단 통계 · 전환 개선
   숫자는 모두 사이트 운영 서버가 세어 준 실제 기록이다(remote.admin('evStats') — 홈페이지의 06-ops-track.js 가 보낸 것).
   지어낸 예시 숫자는 쓰지 않는다. 기록이 없으면 0 과 '아직 기록이 없습니다'를 보여 준다.
   시안 주소에서는 홈페이지가 기록을 보내지 않는다 — 실제 주소로 옮긴 날부터 쌓인다(화면 위에 그렇게 적는다).
   이름·연락처는 이 통계에 없다. 자가진단 기록은 방문 번호 없이 따로 받아, 어느 방문·어느 신청과도 이어지지 않는다. */
(function () {
  'use strict';
  var w = window;
  var AA = w.AA;
  var esc = AA.esc;
  var LV = ['normal', 'mild', 'caution', 'urgent'];
  var LV_KO = { normal: '정상 범위', mild: '경미', caution: '주의', urgent: '진료 권장' };
  var DEMO = !!(w.AA_OPS && w.AA_OPS.demo);
  var DAYS = [7, 30, 90];

  // ── 서버 요약 불러오기(기간마다 1분 기억) ──────────────────────────────────────────
  AA.stats = {
    cache: {},      // 기간 → { t, v }
    state: {},      // 기간 → 'loading' | 'ok' | 'error'
    get: function (n) { var c = this.cache[n]; return c ? c.v : null; },
    load: function (n, force) {
      var self = this;
      var c = self.cache[n];
      if (!force && c && Date.now() - c.t < 60000) return;
      if (self.state[n] === 'loading' || (!force && self.state[n] === 'error')) return;
      self.state[n] = 'loading';
      AA.remote.admin('evStats', { days: n }).then(function (r) {
        self.cache[n] = { t: Date.now(), v: r };
        self.state[n] = 'ok';
      }, function (e) {
        if (e && e.message === 'login') { if (AA.sessionExpired) AA.sessionExpired(); return; }
        self.state[n] = 'error';
      }).then(function () {
        var on = AA.route && (AA.route.name === 'selfcheck' || AA.route.name === 'conversion');
        if (on && AA.session.on()) AA.rerender();
      });
    },
    clear: function () { this.cache = {}; this.state = {}; },
  };

  function dates(n) { var out = []; for (var i = n - 1; i >= 0; i--) out.push(AA.addDays(AA.REF, -i)); return out; }
  function kpi(label, v, unit, sub) { return '<div class="ad-kpi"><p class="ad-kpi__label">' + esc(label) + '</p><p class="ad-kpi__value">' + esc(v) + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</p><p class="ad-kpi__sub">' + esc(sub) + '</p></div>'; }
  function seg(act, n, cur) { return '<button class="ad-seg__b" type="button" aria-pressed="' + (cur === n) + '" data-act="' + act + '" data-v="' + n + '">최근 ' + n + '일</button>'; }
  function filters(act, n) {
    return '<div class="ad-filters" style="margin-top:14px"><div class="ad-field ad-field--auto"><span class="ad-field__label">기간</span><div class="ad-seg" role="group" aria-label="기간">' +
      DAYS.map(function (x) { return seg(act, x, n); }).join('') + '</div></div>' +
      '<p class="ad-count" style="margin-left:auto;align-self:center">' + esc(AA.fmt.dot(AA.addDays(AA.REF, -(n - 1))) + ' ~ ' + AA.fmt.dot(AA.REF)) + '</p></div>';
  }
  /** 화면 위 안내 — 시안 주소에서는 기록을 모으지 않는다는 것, 무엇을 모으는지 */
  function note(what) {
    return '<div class="ad-note ad-note--example" style="margin-top:14px"><span class="ad-dot" aria-hidden="true"></span><span>' +
      (DEMO ? '<span class="ad-note__t">지금은 시안 주소라 기록을 모으지 않습니다.</span> 홈페이지를 실제 주소로 옮긴 날부터 이 화면에 숫자가 쌓입니다. ' : '') +
      esc(what) + '</span></div>';
  }
  function waiting(n, name) {
    var st = AA.stats.state[n];
    if (st === 'error') return '<div class="ad-note ad-note--warn" style="margin-top:14px"><span>' + AA.icon('warn') + '</span><span><span class="ad-note__t">기록을 불러오지 못했습니다.</span> 인터넷 연결을 확인한 뒤 <button class="ad-linkbtn" type="button" data-act="' + name + '-reload">다시 불러오기</button>를 눌러 주세요.</span></div>';
    return '<p class="ad-loading">기록을 불러오는 중…</p>';
  }
  function emptyCard(title, t, s) {
    return '<section class="ad-card ad-sec"><div class="ad-card__head"><h2 class="ad-card__title">' + esc(title) + '</h2></div>' + AA.emptyHtml(t, s) + '</section>';
  }

  // ════════════════════════════════════════════════════════════════════════
  // 자가진단 통계
  // ════════════════════════════════════════════════════════════════════════
  var su = { n: 30 };
  AA.views.selfcheck = {
    render: function () {
      var S = AA.seed.selfcheck || {};
      var n = su.n;
      AA.stats.load(n);
      var head = AA.head({ no: AA.no('selfcheck'), eyebrow: '성과', title: '자가진단 통계',
        lead: '2분 치아 자가진단을 몇 번 시작하고 마쳤는지, 어떤 결과가 나왔고 상담 신청까지 이어졌는지 봅니다.',
        actions: AA.siteLink('/self-check/', '자가진단 해 보기') }) +
        note('자가진단은 이름·연락처를 받지 않습니다. 고른 곳·결과 단계·연령대만 횟수로 세며, 어느 방문자인지와 이어지지 않습니다.') + filters('sc-n', n);
      var R = AA.stats.get(n);
      if (!R) return head + waiting(n, 'sc');
      var sc = R.sc || {};
      var days = dates(n).map(function (date) { var x = (sc.daily || {})[date] || {}; return { date: date, starts: x.s || 0, completes: x.c || 0 }; });
      var starts = AA.sum(days, function (x) { return x.starts; });
      var completes = AA.sum(days, function (x) { return x.completes; });
      var al = sc.al || {};
      var lv = LV.map(function (id, j) { return { id: id, label: LV_KO[id], n: AA.sum(Object.keys(al), function (k) { return (al[k] || [])[j] || 0; }) }; });
      var areas = (S.areas || []).map(function (a) { var p = al[a.id] || [0, 0, 0, 0]; return { label: a.label, parts: [0, 1, 2, 3].map(function (j) { return p[j] || 0; }) }; })
        .sort(function (a, b) { return AA.sum(b.parts) - AA.sum(a.parts); });
      var ages = (S.ages || []).map(function (a) { return { label: a.label, value: (sc.age || {})[a.id] || 0 }; });
      var reds = (S.redFlags || []).map(function (r) { return { label: r.label, value: (sc.red || {})[r.id] || 0 }; }).sort(function (a, b) { return b.value - a.value; });
      var redTotal = AA.sum(reds, function (x) { return x.value; });
      var leads = AA.leads.all().filter(function (l) { return !l.test && l.status !== 'spam' && l.selfcheckResult && AA.inLast(l.createdAt, n); });
      var urgentLeads = leads.filter(function (l) { var s = AA.leads.sc(l.selfcheckResult); return s && s.level === 'urgent'; }).length;
      var ord = AA.chart.colors().ord;
      var html = head +
        '<div class="ad-grid ad-grid--4 ad-sec">' +
        kpi('시작', AA.num(starts), '회', '불편한 곳과 연령대를 고른 횟수') +
        kpi('완료', AA.num(completes), '회', '완료율 ' + AA.pct(completes, starts)) +
        kpi('상담 신청으로 이어짐', AA.num(leads.length), '건', '결과를 신청서에 담아 보낸 신청' + (urgentLeads ? ' · 진료 권장 ' + urgentLeads + '건' : '')) +
        kpi('‘기다리지 마세요’ 증상', AA.num(redTotal), '회', '하나라도 고르면 결과가 ‘진료 권장’') + '</div>';
      if (!starts && !completes) {
        return html + emptyCard('자가진단 기록', '아직 기록이 없습니다', DEMO ? '실제 주소로 옮긴 뒤 방문자가 자가진단을 시작하면 여기에 하루 완료 수·결과 단계·불편한 곳별 결과가 그려집니다.' : '방문자가 자가진단을 시작하면 여기에 하루 완료 수·결과 단계·불편한 곳별 결과가 그려집니다.');
      }
      var lvTotal = AA.sum(lv, function (x) { return x.n; });
      return html +
        '<div class="ad-grid ad-grid--2 ad-sec"><section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">하루 완료 수</h2><p class="ad-card__sub">막대에 마우스를 올리거나 화살표 키로 그날의 시작·완료를 봅니다</p></div></div>' +
        AA.chart.html({ type: 'columns', data: days.map(function (x) { return { label: AA.fmt.short(x.date), value: x.completes, tip: [AA.fmt.date(x.date), '완료 ' + x.completes + '회', '시작 ' + x.starts + '회'] }; }), hot: 'last', unit: '회', height: 200, ariaLabel: '하루 자가진단 완료 수' }) +
        AA.chart.table('하루 자가진단', ['날짜', '시작', '완료'], days.map(function (x) { return [AA.fmt.date(x.date), x.starts + '회', x.completes + '회']; }), [1, 2]) + '</section>' +
        '<section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">결과 4단계</h2><p class="ad-card__sub">완료 ' + AA.num(lvTotal) + '회 · 단계가 높을수록 진한 색</p></div></div>' +
        AA.chart.html({ type: 'hbars', data: lv.map(function (x, i) { return { label: x.label, value: x.n, color: ord[i], valueText: AA.num(x.n) + '회 · ' + AA.pct(x.n, lvTotal) }; }), rowH: 40, ariaLabel: '자가진단 결과 단계별 횟수' }) +
        AA.chart.table('결과 4단계', ['결과', '횟수'], lv.map(function (x) { return [x.label, x.n + '회']; }), [1]) + '</section></div>' +
        '<section class="ad-card ad-sec"><div class="ad-card__head"><div><h2 class="ad-card__title">불편한 곳별 결과</h2><p class="ad-card__sub">고른 곳마다 결과 단계 비율 · 오른쪽 숫자는 완료 수</p></div></div>' +
        AA.chart.html({ type: 'stack', rows: areas, names: LV.map(function (k) { return LV_KO[k]; }), totalUnit: '회', ariaLabel: '불편한 곳별 결과 단계 비율' }) +
        AA.chart.legend(LV.map(function (k, i) { return { label: LV_KO[k], color: ord[i] }; })) +
        AA.chart.table('불편한 곳별 결과', ['불편한 곳', '정상 범위', '경미', '주의', '진료 권장', '합계'], areas.map(function (a) { return [a.label].concat(a.parts.map(function (v) { return v + '회'; })).concat([AA.sum(a.parts) + '회']); }), [1, 2, 3, 4, 5]) + '</section>' +
        '<div class="ad-grid ad-grid--even ad-sec"><section class="ad-card"><div class="ad-card__head"><h2 class="ad-card__title">연령대</h2></div>' +
        AA.chart.html({ type: 'hbars', data: ages, unit: '회', ariaLabel: '연령대별 자가진단 완료' }) + AA.chart.table('연령대', ['연령대', '완료'], ages.map(function (x) { return [x.label, x.value + '회']; }), [1]) + '</section>' +
        '<section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">‘기다리지 마세요’ 증상</h2><p class="ad-card__sub">고른 사람에게는 점수와 상관없이 증상에 맞는 연락 안내가 먼저 보입니다</p></div></div>' +
        (redTotal ? AA.chart.html({ type: 'hbars', data: reds, unit: '회', ariaLabel: '기다리지 마세요 증상 선택 횟수' }) + AA.chart.table('기다리지 마세요 증상', ['증상', '선택'], reds.map(function (x) { return [x.label, x.value + '회']; }), [1]) : AA.emptyHtml('이 기간에 고른 증상이 없습니다')) + '</section></div>' +
        '<p class="ad-field__hint ad-sec">' + esc(S.reviewNote || '') + (S.reviewNote ? ' · ' : '') + '이 자가진단은 진단이 아닙니다. 문항·채점은 의료진 검수 뒤 바뀔 수 있습니다.</p>';
    },
    on: {
      'sc-n': function (el) { su.n = +el.getAttribute('data-v') || 30; AA.rerender(); },
      'sc-reload': function () { AA.stats.load(su.n, true); AA.rerender(); },
    },
  };

  // ════════════════════════════════════════════════════════════════════════
  // 전환 개선
  // ════════════════════════════════════════════════════════════════════════
  var SRC_KO = { direct: '직접 방문·즐겨찾기', naver: '네이버', google: '구글', daum: '다음', kakao: '카카오', meta: '인스타그램·페이스북', youtube: '유튜브', bing: '빙', ai: 'AI 검색(ChatGPT 등)', other: '다른 사이트' };
  var cu = { n: 30 };
  function funnelHtml(steps) {
    var ord = AA.chart.colors().ord;
    return '<div class="ad-funnel" role="list">' + steps.map(function (s, i) {
      var prev = i ? steps[i - 1].v : s.v;
      var rate = prev ? Math.min(1, s.v / prev) : 0;
      return '<div class="ad-funnel__row" role="listitem"><span class="ad-funnel__k">' + esc(s.k) + '<small>' + esc(s.s) + '</small></span>' +
        '<span class="ad-funnel__track" aria-hidden="true"><span class="ad-funnel__fill" style="width:' + Math.max(1.5, (i ? rate : (s.v ? 1 : 0)) * 100).toFixed(1) + '%;background:' + ord[Math.min(i, 3)] + '"></span></span>' +
        '<span class="ad-funnel__v">' + AA.num(s.v) + '<small>' + (i ? '앞 단계의 ' + AA.pct(s.v, prev) : '기준') + '</small></span></div>';
    }).join('') + '</div>';
  }
  AA.views.conversion = {
    render: function () {
      var n = cu.n;
      AA.stats.load(n);
      var head = AA.head({ no: AA.no('conversion'), eyebrow: '성과', title: '전환 개선',
        lead: '방문자가 홈의 어느 구간까지 내려오고, 전화·네이버 예약·상담 신청으로 얼마나 이어지는지 봅니다.' }) +
        note('방문 횟수와 누른 버튼만 셉니다. 이름·연락처와 신청서에 적은 내용은 이 통계에 들어오지 않습니다. 병원 직원의 방문을 빼려면 그 브라우저에서 홈페이지 주소 뒤에 ?gm=off 를 한 번 붙여 여세요.') + filters('cv-n', n);
      var R = AA.stats.get(n);
      if (!R) return head + waiting(n, 'cv');
      var D = R.daily || {};
      var rows = dates(n).map(function (date) { var x = D[date] || {}; return { date: date, visits: x.start || 0, mobile: x.start_m || 0, open: x.consult_open || 0, fstart: x.form_start || 0, done: x.form_submit || 0, call: x.call || 0, naver: x.naver || 0, kakao: x.kakao || 0 }; });
      var t = {};
      ['visits', 'mobile', 'open', 'fstart', 'done', 'call', 'naver', 'kakao'].forEach(function (k) { t[k] = AA.sum(rows, function (x) { return x[k]; }); });
      var tries = t.call + t.naver + t.kakao + t.open;
      var html = head +
        '<div class="ad-grid ad-grid--4 ad-sec">' +
        kpi('방문', AA.num(t.visits), '회', '모바일 ' + AA.pct(t.mobile, t.visits)) +
        kpi('상담 시도', AA.num(tries), '회', '전화·네이버 예약·카카오톡·상담 신청서') +
        kpi('상담 신청 완료', AA.num(t.done), '건', '서버에 저장된 신청(시험 신청 제외)') +
        kpi('방문 대비 신청', AA.pct(t.done, t.visits, 2), '', '상담 시도까지는 ' + AA.pct(tries, t.visits, 1)) + '</div>';
      if (!t.visits) {
        return html + emptyCard('방문 기록', '아직 기록이 없습니다', DEMO ? '실제 주소로 옮긴 뒤 방문이 생기면 여기에 홈 구간 도달·상담 신청 단계·들어온 곳·하루 방문이 그려집니다.' : '방문이 생기면 여기에 홈 구간 도달·상담 신청 단계·들어온 곳·하루 방문이 그려집니다.');
      }
      // 홈 구간 도달 — 첫 화면을 본 방문을 100 으로
      var S = R.sec || {};
      var base = S.hero || { p: 0, m: 0 };
      var secs = ((AA.seed.home || {}).sections || []).map(function (s) {
        var x = S[s.id] || { p: 0, m: 0 };
        var pc = function (a, b) { return b ? Math.min(100, Math.round((a / b) * 100)) : 0; };
        return { id: s.id, label: s.label, all: pc(x.p + x.m, base.p + base.m), pc: pc(x.p, base.p), mo: pc(x.m, base.m) };
      });
      var homeVisits = base.p + base.m;
      var drops = secs.map(function (s, i) { return { s: s, drop: i ? secs[i - 1].all - s.all : 0 }; });
      var big = drops.slice(2).sort(function (a, b) { return b.drop - a.drop; })[0];
      var reach = secs.map(function (s) { return { label: s.label, value: s.all, hot: !!(big && big.drop > 0 && s.id === big.s.id), valueText: s.all + '%', tip: [s.label, '전체 ' + s.all + '%', 'PC ' + s.pc + '% · 모바일 ' + s.mo + '%'] }; });
      var channels = [{ label: '전화 버튼', value: t.call }, { label: '네이버 예약·플레이스', value: t.naver }, { label: '카카오톡 채널', value: t.kakao }, { label: '상담 신청서 봄', value: t.open }]
        .sort(function (a, b) { return b.value - a.value; });
      if (channels[0].value) channels[0].hot = true;
      var src = Object.keys(R.src || {}).map(function (k) { return { label: SRC_KO[k] || '광고·링크(' + k + ')', value: R.src[k] }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8);
      if (src[0]) src[0].hot = true;
      return html +
        '<div class="ad-grid ad-grid--2 ad-sec"><section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">홈 구간 도달</h2><p class="ad-card__sub">홈 첫 화면을 본 방문 ' + AA.num(homeVisits) + '회 가운데 그 구간까지 내려온 비율' + (big && big.drop > 0 ? ' · 파란색은 첫 화면 다음부터 가장 크게 줄어드는 곳' : '') + '</p></div></div>' +
        (homeVisits ? AA.chart.html({ type: 'hbars', data: reach, max: 100, rowH: 32, ariaLabel: '홈 구간별 도달 비율' }) +
          AA.chart.table('홈 구간 도달', ['구간', '전체', 'PC', '모바일'], secs.map(function (s) { return [s.label, s.all + '%', s.pc + '%', s.mo + '%']; }), [1, 2, 3]) : AA.emptyHtml('이 기간에 홈을 본 방문이 없습니다')) + '</section>' +
        '<div class="ad-stack"><section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">상담 신청 단계</h2><p class="ad-card__sub">방문 → 신청서 봄 → 쓰기 시작 → 신청 완료</p></div></div>' +
        funnelHtml([{ k: '방문', s: '홈페이지에 들어온 방문', v: t.visits }, { k: '신청서 봄', s: '상담 신청서가 화면에 보인 방문', v: t.open }, { k: '쓰기 시작', s: '신청서에 글자를 넣기 시작', v: t.fstart }, { k: '신청 완료', s: '서버에 저장된 신청', v: t.done }]) +
        '<p class="ad-field__hint" style="margin-top:10px">막대 = 앞 단계에서 넘어온 비율 · 방문 대비 신청 ' + AA.pct(t.done, t.visits, 2) + '</p></section>' +
        '<section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">상담 시도 경로</h2><p class="ad-card__sub">누른 횟수</p></div></div>' +
        AA.chart.html({ type: 'hbars', data: channels, unit: '회', rowH: 32, ariaLabel: '상담 시도 경로별 횟수' }) + AA.chart.table('상담 시도 경로', ['경로', '횟수'], channels.map(function (x) { return [x.label, x.value + '회']; }), [1]) + '</section></div></div>' +
        '<div class="ad-grid ad-grid--2 ad-sec"><section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">하루 방문</h2><p class="ad-card__sub">막대에 마우스를 올리거나 화살표 키로 그날의 숫자를 봅니다</p></div></div>' +
        AA.chart.html({ type: 'columns', data: rows.map(function (x) { return { label: AA.fmt.short(x.date), value: x.visits, tip: [AA.fmt.date(x.date), '방문 ' + AA.num(x.visits) + '회', '신청서 봄 ' + x.open + ' · 신청 ' + x.done] }; }), hot: 'last', unit: '회', height: 200, ariaLabel: '하루 방문 수' }) +
        AA.chart.table('하루 방문', ['날짜', '방문', '신청서 봄', '쓰기 시작', '신청', '전화', '네이버', '카카오'], rows.map(function (x) { return [AA.fmt.date(x.date), AA.num(x.visits), x.open, x.fstart, x.done, x.call, x.naver, x.kakao]; }), [1, 2, 3, 4, 5, 6, 7]) + '</section>' +
        '<section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">들어온 곳</h2><p class="ad-card__sub">방문이 시작될 때의 앞 사이트 또는 광고 표시</p></div></div>' +
        AA.chart.html({ type: 'hbars', data: src, unit: '회', rowH: 32, ariaLabel: '들어온 곳별 방문 수' }) + AA.chart.table('들어온 곳', ['들어온 곳', '방문'], src.map(function (x) { return [x.label, x.value + '회']; }), [1]) + '</section></div>';
    },
    on: {
      'cv-n': function (el) { cu.n = +el.getAttribute('data-v') || 30; AA.rerender(); },
      'cv-reload': function () { AA.stats.load(cu.n, true); AA.rerender(); },
    },
  };
})();
