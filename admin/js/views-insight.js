/* 관리자 데모 — 성과: 자가진단 통계 · 전환 개선(그로스메이트) · AI 검색 노출(그로스메이트 AEO)
   자가진단 = 예시(seed.selfcheck.example.daily) + 이 브라우저 기록(localStorage 'apple_selfcheck_stats', 자가진단 앱이 남김).
   전환·AI 노출 = 예시 숫자. 화면마다 '예시 데이터 — 실제 연결 시 그로스메이트(광고주 34·추적 설치 32)'를 분명히 쓴다. */
(function () {
  'use strict';
  var w = window;
  var d = document;
  var AA = w.AA;
  var esc = AA.esc;
  var icon = AA.icon;
  var LV = ['normal', 'mild', 'caution', 'urgent'];
  var LV_KO = { normal: '정상 범위', mild: '경미', caution: '주의', urgent: '진료 권장' };

  // ════════════════════════════════════════════════════════════════════════
  // 자가진단 집계
  // ════════════════════════════════════════════════════════════════════════
  function levelIdOf(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return '';
    if (LV.indexOf(s) > -1) return s;
    for (var k in LV_KO) if (s.indexOf(LV_KO[k]) > -1) return k;
    if (/^[0-3]$/.test(s)) return LV[+s];
    return '';
  }
  function toIso(t) {
    if (t == null || t === '') return '';
    if (typeof t === 'number') return new Date(t < 1e12 ? t * 1000 : t).toISOString();
    var p = Date.parse(t);
    return isNaN(p) ? '' : new Date(p).toISOString();
  }
  /** 이 브라우저의 자가진단 기록(모양이 달라도 읽는다: 배열 · {events|list|log|items} · 집계 객체) */
  function readBrowser() {
    var raw = AA.store.get('apple_selfcheck_stats', null);
    var out = { events: [], counters: null, raw: raw };
    if (!raw) return out;
    var arr = Array.isArray(raw) ? raw : ['events', 'list', 'log', 'items', 'history', 'records'].map(function (k) { return raw[k]; }).filter(Array.isArray)[0];
    if (arr) {
      out.events = arr.map(function (e) {
        if (!e || typeof e !== 'object') return null;
        var at = toIso(e.at || e.time || e.ts || e.createdAt || e.date || e.t || e.finishedAt || e.startedAt);
        if (!at) return null;
        var type = String(e.type || e.event || e.kind || e.step || e.action || '').toLowerCase();
        var lvl = levelIdOf(e.level || e.result || e.levelId || e.levelLabel || (e.outcome && e.outcome.level));
        var reds = [].concat(e.redFlags || e.redflags || e.red || e.urgentFlags || []).filter(Boolean).map(function (r) { return typeof r === 'object' ? r.id || r.label : r; });
        return { at: at, type: type, area: String(e.area || e.areaId || ''), age: String(e.age || e.ageId || ''), level: lvl, red: reds,
          isStart: /start|begin|open|시작/.test(type), isDone: e.completed === true || /complete|result|done|finish|완료|결과/.test(type) || (!!lvl && !/start|begin|open/.test(type)) };
      }).filter(Boolean);
    } else if (typeof raw === 'object') out.counters = raw;
    return out;
  }
  function emptyDay(date) {
    var al = {}; ((AA.seed.selfcheck || {}).areas || []).forEach(function (a) { al[a.id] = [0, 0, 0, 0]; });
    return { date: date, starts: 0, completes: 0, al: al, age: {}, red: {}, browser: 0 };
  }
  AA.sc = {
    browser: readBrowser,
    /** 기준일까지 n일(예시 + 이 브라우저). source: '' | 'example' | 'browser' */
    daily: function (n, source) {
      var S = AA.seed.selfcheck || {};
      var ex = (S.example && S.example.daily) || [];
      var br = source === 'example' ? { events: [], counters: null } : readBrowser();
      var hasStartEv = br.events.some(function (e) { return e.isStart; });
      var days = [];
      for (var i = n - 1; i >= 0; i--) {
        var date = AA.addDays(AA.REF, -i);
        var row = emptyDay(date);
        var e = source === 'browser' ? null : ex.filter(function (x) { return x.date === date; })[0];
        if (e) {
          row.starts += e.starts; row.completes += e.completes;
          Object.keys(e.al || {}).forEach(function (k) { row.al[k] = (row.al[k] || [0, 0, 0, 0]).map(function (v, j) { return v + (e.al[k][j] || 0); }); });
          Object.keys(e.age || {}).forEach(function (k) { row.age[k] = (row.age[k] || 0) + e.age[k]; });
          Object.keys(e.red || {}).forEach(function (k) { row.red[k] = (row.red[k] || 0) + e.red[k]; });
        }
        br.events.forEach(function (ev) {
          var y = AA.ymdOf(ev.at);
          if (y !== date && !(i === 0 && y > date)) return;
          row.browser++;
          if (hasStartEv ? ev.isStart : true) row.starts++;
          if (ev.isDone) {
            row.completes++;
            var li = LV.indexOf(ev.level);
            if (ev.area && li > -1) { row.al[ev.area] = row.al[ev.area] || [0, 0, 0, 0]; row.al[ev.area][li]++; }
            if (ev.age) row.age[ev.age] = (row.age[ev.age] || 0) + 1;
            ev.red.forEach(function (r) { row.red[r] = (row.red[r] || 0) + 1; });
          }
        });
        days.push(row);
      }
      if (br.counters && source !== 'example') { // 집계 객체만 남기는 앱이면 기준일에 더한다
        var c = br.counters; var last = days[days.length - 1];
        if (+c.starts) last.starts += +c.starts;
        if (+c.completes) last.completes += +c.completes;
        last.browser += (+c.completes || 0);
      }
      return days;
    },
    summary: function (n, source) {
      var days = this.daily(n, source);
      var leads = AA.leads.all().filter(function (l) { return l.status !== 'spam' && l.selfcheckResult && AA.inLast(l.createdAt, n) && (source === 'browser' ? !l.example : source === 'example' ? l.example : true); });
      var red = {}; days.forEach(function (x) { Object.keys(x.red).forEach(function (k) { red[k] = (red[k] || 0) + x.red[k]; }); });
      return { starts: AA.sum(days, function (x) { return x.starts; }), completes: AA.sum(days, function (x) { return x.completes; }), consults: leads.length, red: red, redTotal: AA.sum(Object.keys(red).map(function (k) { return red[k]; })), browser: AA.sum(days, function (x) { return x.browser; }), urgentLeads: leads.filter(function (l) { var s = AA.leads.sc(l.selfcheckResult); return s && s.level === 'urgent'; }).length };
    },
    levelTotals: function (n, source) {
      var days = this.daily(n, source);
      return LV.map(function (id, j) { return { id: id, label: LV_KO[id], n: AA.sum(days, function (x) { return AA.sum(Object.keys(x.al).map(function (k) { return x.al[k][j] || 0; })); }) }; });
    },
    areaRows: function (n, source) {
      var days = this.daily(n, source);
      return ((AA.seed.selfcheck || {}).areas || []).map(function (a) {
        return { id: a.id, label: a.label, parts: [0, 1, 2, 3].map(function (j) { return AA.sum(days, function (x) { return (x.al[a.id] || [])[j] || 0; }); }) };
      });
    },
  };

  var su = { n: 30, source: '' };
  AA.views.selfcheck = {
    render: function () {
      var S = AA.seed.selfcheck || {};
      var n = su.n;
      var days = AA.sc.daily(n, su.source);
      var sm = AA.sc.summary(n, su.source);
      var lv = AA.sc.levelTotals(n, su.source);
      var areas = AA.sc.areaRows(n, su.source).sort(function (a, b) { return AA.sum(b.parts) - AA.sum(a.parts); });
      var ages = (S.ages || []).map(function (a) { return { label: a.label, value: AA.sum(days, function (x) { return x.age[a.id] || 0; }) }; });
      var reds = (S.redFlags || []).map(function (r) { return { label: r.label, value: sm.red[r.id] || 0 }; }).sort(function (a, b) { return b.value - a.value; });
      var br = AA.sc.browser();
      var ord = AA.chart.colors().ord;
      var range = AA.fmt.dot(AA.addDays(AA.REF, -(n - 1))) + ' ~ ' + AA.fmt.dot(AA.REF);
      var seg = function (k, v, label, cur) { return '<button class="ad-seg__b" type="button" aria-pressed="' + (cur === v) + '" data-act="sc-f" data-k="' + k + '" data-v="' + v + '">' + esc(label) + '</button>'; };
      return AA.head({ no: AA.no('selfcheck'), eyebrow: '성과', title: '자가진단 통계',
        lead: '2분 치아 자가진단을 몇 명이 시작하고 마쳤는지, 어떤 결과가 나왔고 상담 신청까지 이어졌는지 봅니다. 자가진단은 이름·연락처를 받지 않습니다.',
        actions: AA.siteLink('/self-check/', '자가진단 해 보기') }) +
        AA.exampleNote('<span class="ad-note__t">예시 데이터 + 이 브라우저 기록</span> — 숫자는 예시입니다. 이 브라우저에서 자가진단을 마치면 ' + (br.events.length || br.counters ? '<b>이 브라우저 기록 ' + (br.events.length || '집계') + '건</b>이 함께 셈해집니다.' : '그 기록이 여기에 더해집니다(아직 없음).') + ' 응답 내용은 병원으로 보내지 않습니다.') +
        '<div class="ad-filters" style="margin-top:14px"><div class="ad-field ad-field--auto"><span class="ad-field__label">기간</span><div class="ad-seg" role="group" aria-label="기간">' + seg('n', '7', '최근 7일', String(n)) + seg('n', '30', '최근 30일', String(n)) + '</div></div>' +
        '<div class="ad-field ad-field--auto"><span class="ad-field__label">데이터</span><div class="ad-seg" role="group" aria-label="데이터">' + seg('source', '', '전체', su.source) + seg('source', 'example', '예시만', su.source) + seg('source', 'browser', '이 브라우저만', su.source) + '</div></div>' +
        '<p class="ad-count" style="margin-left:auto;align-self:center">' + esc(range) + '</p></div>' +
        '<div class="ad-grid ad-grid--4">' +
        kpi('시작', AA.num(sm.starts), '회', '불편한 곳을 고른 횟수') +
        kpi('완료', AA.num(sm.completes), '회', '완료율 ' + AA.pct(sm.completes, sm.starts)) +
        kpi('상담 신청으로 이어짐', AA.num(sm.consults), '건', '완료 대비 ' + AA.pct(sm.consults, sm.completes, 1) + ' · 결과를 신청서에 담아 보냄') +
        kpi('‘기다리지 마세요’ 증상', AA.num(sm.redTotal), '회', '하나라도 있으면 결과가 ‘진료 권장’') + '</div>' +
        '<div class="ad-grid ad-grid--2 ad-sec"><section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">하루 완료 수</h2><p class="ad-card__sub">막대에 마우스를 올리거나 화살표 키로 그날의 시작·완료를 봅니다</p></div></div>' +
        AA.chart.html({ type: 'columns', data: days.map(function (x) { return { label: AA.fmt.short(x.date), value: x.completes, tip: [AA.fmt.date(x.date), '완료 ' + x.completes + '회', '시작 ' + x.starts + '회'] }; }), hot: 'last', unit: '회', height: 200, ariaLabel: '하루 자가진단 완료 수' }) +
        AA.chart.table('하루 자가진단', ['날짜', '시작', '완료'], days.map(function (x) { return [AA.fmt.date(x.date), x.starts + '회', x.completes + '회']; }), [1, 2]) + '</section>' +
        '<section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">결과 4단계</h2><p class="ad-card__sub">완료 ' + AA.num(AA.sum(lv, function (x) { return x.n; })) + '회 · 단계가 높을수록 진한 색</p></div></div>' +
        AA.chart.html({ type: 'hbars', data: lv.map(function (x, i) { return { label: x.label, value: x.n, color: ord[i], valueText: AA.num(x.n) + '회 · ' + AA.pct(x.n, AA.sum(lv, function (y) { return y.n; })) }; }), rowH: 40, ariaLabel: '자가진단 결과 단계별 횟수' }) +
        AA.chart.table('결과 4단계', ['결과', '횟수'], lv.map(function (x) { return [x.label, x.n + '회']; }), [1]) +
        '<p class="ad-card__foot">‘진료 권장’이 나온 뒤 상담 신청까지 이어진 건 ' + sm.urgentLeads + '건 · 결과 화면에서 맞는 진료 페이지·의료진·상담 신청으로 안내합니다</p></section></div>' +
        '<section class="ad-card ad-sec"><div class="ad-card__head"><div><h2 class="ad-card__title">불편한 곳별 결과</h2><p class="ad-card__sub">고른 곳마다 결과 단계 비율 · 오른쪽 숫자는 완료 수</p></div></div>' +
        AA.chart.html({ type: 'stack', rows: areas.map(function (a) { return { label: a.label, parts: a.parts }; }), names: LV.map(function (k) { return LV_KO[k]; }), totalUnit: '회', ariaLabel: '불편한 곳별 결과 단계 비율' }) +
        AA.chart.legend(LV.map(function (k, i) { return { label: LV_KO[k], color: ord[i] }; })) +
        AA.chart.table('불편한 곳별 결과', ['불편한 곳', '정상 범위', '경미', '주의', '진료 권장', '합계'], areas.map(function (a) { return [a.label].concat(a.parts.map(function (v) { return v + '회'; })).concat([AA.sum(a.parts) + '회']); }), [1, 2, 3, 4, 5]) + '</section>' +
        '<div class="ad-grid ad-grid--even ad-sec"><section class="ad-card"><div class="ad-card__head"><h2 class="ad-card__title">연령대</h2></div>' +
        AA.chart.html({ type: 'hbars', data: ages, unit: '회', ariaLabel: '연령대별 자가진단 완료' }) + AA.chart.table('연령대', ['연령대', '완료'], ages.map(function (x) { return [x.label, x.value + '회']; }), [1]) + '</section>' +
        '<section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">‘기다리지 마세요’ 증상</h2><p class="ad-card__sub">고른 사람에게는 점수와 상관없이 바로 연락하라는 안내가 먼저 보입니다</p></div></div>' +
        AA.chart.html({ type: 'hbars', data: reds, unit: '회', ariaLabel: '기다리지 마세요 증상 선택 횟수' }) + AA.chart.table('기다리지 마세요 증상', ['증상', '선택'], reds.map(function (x) { return [x.label, x.value + '회']; }), [1]) + '</section></div>' +
        (br.events.length ? '<section class="ad-card ad-sec"><div class="ad-card__head"><h2 class="ad-card__title">이 브라우저 기록</h2><span class="muted">최근 ' + Math.min(10, br.events.length) + '건</span></div><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>시각</th><th>단계</th><th>불편한 곳</th><th>연령대</th><th>결과</th></tr></thead><tbody>' +
          br.events.slice(-10).reverse().map(function (e) {
            var area = ((S.areas || []).filter(function (a) { return a.id === e.area; })[0] || {}).label || e.area || '—';
            var age = ((S.ages || []).filter(function (a) { return a.id === e.age; })[0] || {}).label || e.age || '—';
            return '<tr><td class="tnum">' + esc(AA.fmt.dt(e.at)) + '</td><td>' + (e.isDone ? '완료' : '시작') + '</td><td>' + esc(area) + '</td><td>' + esc(age) + '</td><td>' + (e.level ? '<span class="ad-lvl ad-lvl--' + esc(e.level) + '">' + esc(LV_KO[e.level]) + '</span>' : '—') + '</td></tr>';
          }).join('') + '</tbody></table></div></section>' : '') +
        '<p class="ad-field__hint ad-sec">' + esc(S.reviewNote || '') + (S.reviewNote ? ' · ' : '') + '이 자가진단은 진단이 아닙니다. 문항·채점은 의료진 검수 뒤 바뀔 수 있습니다.</p>';
    },
    on: { 'sc-f': function (el) { var k = el.getAttribute('data-k'); var v = el.getAttribute('data-v'); su[k] = k === 'n' ? +v : v; AA.rerender(); } },
  };
  function kpi(label, v, unit, sub, isText) { return '<div class="ad-kpi"><p class="ad-kpi__label">' + esc(label) + '</p><p class="ad-kpi__value' + (isText ? ' ad-kpi__value--text' : '') + '">' + esc(v) + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</p><p class="ad-kpi__sub">' + esc(sub) + '</p></div>'; }

  // ════════════════════════════════════════════════════════════════════════
  // 전환 개선(그로스메이트 예시)
  // ════════════════════════════════════════════════════════════════════════
  AA.conv = {
    rows: function (n) { return ((AA.seed.conversion || {}).daily || []).filter(function (x) { return AA.inLast(x.date, n); }); },
    totals: function (n) {
      var r = this.rows(n);
      var t = { days: r.length };
      ['visits', 'mobile', 'consultOpen', 'nameStart', 'completes', 'calls', 'naver', 'kakao'].forEach(function (k) { t[k] = AA.sum(r, function (x) { return x[k]; }); });
      return t;
    },
    /** 퍼널(방문 → 상담 창 열기 → 이름 쓰기 시작 → 신청 완료). 막대 = 앞 단계에서 넘어온 비율(단계마다 같은 잣대) */
    funnelHtml: function (t, compact) {
      var ord = AA.chart.colors().ord;
      var steps = [
        { k: '방문', s: '사이트 방문', v: t.visits, c: ord[0] },
        { k: '상담 창 열기', s: '상담 신청 버튼·폼까지 온 방문', v: t.consultOpen, c: ord[1] },
        { k: '이름 쓰기 시작', s: '성함 칸에 글자를 넣음', v: t.nameStart, c: ord[2] },
        { k: '신청 완료', s: '폼 제출 성공(gmLeadSuccess)', v: t.completes, c: ord[3] },
      ];
      return '<div class="ad-funnel" role="list">' + steps.map(function (s, i) {
        var prev = i ? steps[i - 1].v : s.v;
        var rate = prev ? s.v / prev : 0;
        return '<div class="ad-funnel__row" role="listitem"><span class="ad-funnel__k">' + esc(s.k) + (compact ? '' : '<small>' + esc(s.s) + '</small>') + '</span>' +
          '<span class="ad-funnel__track" aria-hidden="true"><span class="ad-funnel__fill" style="width:' + Math.max(1.5, rate * 100).toFixed(1) + '%;background:' + s.c + '"></span></span>' +
          '<span class="ad-funnel__v">' + AA.num(s.v) + '<small>' + (i ? '앞 단계의 ' + AA.pct(s.v, prev) : '기준') + '</small></span></div>';
      }).join('') + '</div><p class="ad-field__hint" style="margin-top:10px">막대 = 앞 단계에서 넘어온 비율 · 방문 대비 신청 ' + AA.pct(t.completes, t.visits, 2) + '</p>';
    },
  };
  AA.views.conversion = {
    render: function () {
      var C = AA.seed.conversion || {};
      var t = AA.conv.totals(30);
      var rows = AA.conv.rows(30);
      var secs = C.sections || [];
      var drops = secs.map(function (s, i) { return { s: s, drop: i ? secs[i - 1].all - s.all : 0, from: i ? secs[i - 1] : null }; });
      var big = drops.slice(2).sort(function (a, b) { return b.drop - a.drop; })[0];
      var reach = secs.map(function (s) { return { label: s.label + ' · ' + s.id, value: s.all, hot: big && s.id === big.s.id, valueText: s.all + '%', tip: [s.label + ' (data-fb-section="' + s.id + '")', '전체 ' + s.all + '%', 'PC ' + s.pc + '% · 모바일 ' + s.mo + '%'] }; });
      var tries = t.calls + t.naver + t.kakao + t.consultOpen;
      var channels = [
        { label: '전화 버튼', value: t.calls }, { label: '네이버 예약', value: t.naver }, { label: '카카오톡 채널', value: t.kakao }, { label: '상담 신청 창', value: t.consultOpen },
      ].sort(function (a, b) { return b.value - a.value; });
      channels[0].hot = true;
      var last = secs[secs.length - 1] || { pc: 0, mo: 0 };
      var aiLeads = AA.leads.all().filter(function (l) { return l.status !== 'spam' && AA.inLast(l.createdAt, 30) && AA.leads.from(l).ai; }).length;
      var range = AA.fmt.dot(AA.addDays(AA.REF, -29)) + ' ~ ' + AA.fmt.dot(AA.REF);
      var sugs = [];
      if (big) sugs.push({ t: '‘' + big.from.label + '’ 다음 ‘' + big.s.label + '’에서 ' + big.drop + '%p가 빠집니다', d: '홈에서 가장 많이 내려가지 않는 구간입니다. 이 구간의 첫 문장을 짧게 하고 사진을 먼저 보여 주거나, 아래쪽의 ‘예약’ 구간을 위로 올린 뒤 도달률이 어떻게 바뀌는지 비교해 볼 수 있습니다.', links: ['/'] });
      sugs.push({ t: '이름을 쓰기 시작한 ' + AA.num(t.nameStart) + '명 중 ' + AA.pct(t.completes, t.nameStart) + '만 신청을 마쳤습니다', d: '연락처 칸에서 멈추는 경우가 많습니다. 연락처 자동 하이픈과 ‘연락받으실 번호’ 안내는 이미 넣었고, 다음으로 희망 연락 시간·문의 내용을 선택 칸으로 둔 채 필수 칸을 2개로 유지합니다.', links: ['/consult/'] });
      sugs.push({ t: '모바일은 상담 신청 구간까지 ' + last.mo + '%, PC는 ' + last.pc + '%가 내려옵니다', d: '모바일 방문이 ' + AA.pct(t.mobile, t.visits) + '입니다. 모바일에서는 화면 아래 고정 바(네이버 예약·자가진단·상담 신청·전화)가 실제 신청 경로가 됩니다.', links: ['/'] });
      if (aiLeads) sugs.push({ t: 'AI 검색(ChatGPT·Perplexity)을 거쳐 온 신청 ' + aiLeads + '건', d: 'AI 답변이 인용한 페이지에서 바로 상담으로 이어졌습니다. AI 검색 노출 화면에서 어떤 질문에 병원이 언급되는지 함께 보세요.', links: [] });
      return AA.head({ no: AA.no('conversion'), eyebrow: '성과 · 그로스메이트', title: '전환 개선',
        lead: '방문자가 홈의 어느 구간까지 내려오는지, 상담 신청 폼의 어느 단계에서 멈추는지 봅니다. 구간 이름표(data-fb-section)와 상담 폼 신호(gmLeadSuccess)를 그로스메이트가 자동으로 모읍니다.' }) +
        AA.gmNote() +
        '<p class="ad-count" style="margin:12px 0">' + esc(range) + ' · 최근 30일</p>' +
        '<div class="ad-grid ad-grid--4">' + kpi('방문', AA.num(t.visits), '회', '모바일 ' + AA.pct(t.mobile, t.visits)) + kpi('상담 시도', AA.num(tries), '회', '전화·네이버 예약·카카오톡·상담 창') + kpi('상담 신청 완료', AA.num(t.completes), '건', '상담 신청 목록과 같은 수') + kpi('방문 대비 신청', AA.pct(t.completes, t.visits, 2), '', '상담 시도까지는 ' + AA.pct(tries, t.visits, 1)) + '</div>' +
        '<div class="ad-grid ad-grid--2 ad-sec"><section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">홈 구간 도달</h2><p class="ad-card__sub">방문자 가운데 그 구간까지 내려온 비율 · 가장 크게 빠지는 구간을 파란색으로</p></div></div>' +
        AA.chart.html({ type: 'hbars', data: reach, max: 100, rowH: 32, ariaLabel: '홈 구간별 도달 비율' }) +
        AA.chart.table('홈 구간 도달', ['구간', '이름표', '전체', 'PC', '모바일'], secs.map(function (s) { return [s.label, s.id, s.all + '%', s.pc + '%', s.mo + '%']; }), [2, 3, 4]) + '</section>' +
        '<div class="ad-stack"><section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">상담 신청 퍼널</h2><p class="ad-card__sub">방문 → 상담 창 열기 → 이름 쓰기 시작 → 신청 완료</p></div></div>' + AA.conv.funnelHtml(t) + '</section>' +
        '<section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">상담 시도 경로</h2><p class="ad-card__sub">버튼 글자·링크로 자동 수집(전화·카카오·네이버 예약)</p></div></div>' +
        AA.chart.html({ type: 'hbars', data: channels, unit: '회', rowH: 32, ariaLabel: '상담 시도 경로별 횟수' }) + AA.chart.table('상담 시도 경로', ['경로', '횟수'], channels.map(function (x) { return [x.label, x.value + '회']; }), [1]) + '</section></div></div>' +
        '<section class="ad-card ad-sec"><div class="ad-card__head"><div><h2 class="ad-card__title">하루 방문</h2><p class="ad-card__sub">최근 30일 · 주말은 방문이 줄어듭니다</p></div></div>' +
        AA.chart.html({ type: 'columns', data: rows.map(function (x) { return { label: AA.fmt.short(x.date), value: x.visits, tip: [AA.fmt.date(x.date), '방문 ' + AA.num(x.visits) + '회', '상담 창 ' + x.consultOpen + ' · 신청 ' + x.completes] }; }), hot: 'last', unit: '회', height: 180, ariaLabel: '하루 방문 수' }) +
        AA.chart.table('하루 방문', ['날짜', '방문', '상담 창', '이름 쓰기', '신청'], rows.map(function (x) { return [AA.fmt.date(x.date), AA.num(x.visits), x.consultOpen, x.nameStart, x.completes]; }), [1, 2, 3, 4]) + '</section>' +
        '<section class="ad-sec"><h2 class="ad-sec__t">개선 제안 <span class="ad-badge ad-badge--example">예시 데이터 기준</span></h2><div class="ad-sugs">' + sugs.map(function (s) {
          return '<article class="ad-sug"><p class="ad-sug__t">' + esc(s.t) + '</p><p class="ad-sug__d">' + esc(s.d) + '</p>' + (s.links.length ? '<p class="ad-sug__links">' + s.links.map(function (p) { return AA.siteLink(p); }).join('') + '</p>' : '') + '</article>';
        }).join('') + '</div></section>' +
        '<section class="ad-card ad-sec"><div class="ad-card__head"><div><h2 class="ad-card__title">추적 중인 버튼·신호</h2><p class="ad-card__sub">사이트 버튼에 붙은 그로스메이트 이벤트 이름</p></div></div><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>신호</th><th>뜻</th><th>붙은 곳</th></tr></thead><tbody>' +
        (C.events || []).map(function (e) { return '<tr><td><code>' + esc(e.name) + '</code></td><td>' + esc(e.label) + '</td><td class="t-cell-sm">' + esc(e.where) + '</td></tr>'; }).join('') +
        '</tbody></table></div><p class="ad-card__foot">데모 사이트를 이 PC에서 미리 볼 때(127.0.0.1)는 추적 코드를 부르지 않아 시험 방문이 그로스메이트 운영 데이터에 섞이지 않습니다.</p></section>';
    },
  };

  // ════════════════════════════════════════════════════════════════════════
  // AI 검색 노출(그로스메이트 AEO 예시)
  // ════════════════════════════════════════════════════════════════════════
  var SHORT = { 'ChatGPT': 'ChatGPT', 'Gemini': 'Gemini', 'Claude': 'Claude', 'Perplexity': 'Perplexity', '네이버 AI 브리핑': '네이버 AI' };
  AA.aeoData = function () {
    var A = AA.seed.aeo || {};
    var qs = A.queries || [];
    var latest = AA.sum(qs, function (q) { return q.latest.filter(function (c) { return c.mentioned; }).length; });
    var prev = AA.sum(qs, function (q) { return q.prev.filter(function (c) { return c.mentioned; }).length; });
    var m = A.measures || [];
    return { engines: A.engines || [], queries: qs, latest: latest, prev: prev, cells: qs.length * (A.engines || []).length, date: m[m.length - 1] || AA.REF,
      trend: m.map(function (dt, i) { return { date: dt, n: (A.totals || [])[i] || 0 }; }) };
  };
  AA.aeoMatrixMini = function (a) {
    return '<div class="ad-table-wrap"><table class="ad-matrix" style="font-size:13.5px"><thead><tr><th scope="col"><span class="ad-sr">질문</span></th>' + a.engines.map(function (e) { return '<th scope="col">' + esc(SHORT[e] || e) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      a.queries.map(function (q) {
        return '<tr><th scope="row">' + esc(q.q.replace(/^부천역?\s*/, '')) + '</th>' + q.latest.map(function (c, i) {
          return '<td data-label="' + esc(a.engines[i]) + '"' + (c.mentioned ? ' class="is-on"' : '') + '>' + (c.mentioned ? '<span class="ad-cell__mark" title="' + esc(c.rank + '번째로 언급') + '">' + esc(c.rank) + '</span>' : '<span class="ad-cell__no">—</span>') + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div><p class="ad-field__hint" style="margin-top:8px">숫자 = 답에서 몇 번째로 언급됐는지 · — = 언급 없음</p>';
  };
  AA.views.aeo = {
    render: function () {
      var a = AA.aeoData();
      var byEngine = a.engines.map(function (e, i) { return { label: e, value: a.queries.filter(function (q) { return q.latest[i].mentioned; }).length }; });
      var best = byEngine.slice().sort(function (x, y) { return y.value - x.value; })[0] || { label: '', value: 0 };
      var cited = {};
      a.queries.forEach(function (q) { q.latest.forEach(function (c) { if (c.mentioned && c.page) cited[c.page] = (cited[c.page] || 0) + 1; }); });
      var citedRows = Object.keys(cited).map(function (p) { return { p: p, n: cited[p] }; }).sort(function (x, y) { return y.n - x.n; });
      var quotes = [];
      a.queries.forEach(function (q) { q.latest.forEach(function (c, i) { if (c.quote) quotes.push({ q: q.q, e: a.engines[i], text: c.quote, page: c.page }); }); });
      var weak = a.queries.map(function (q) { return { q: q, n: q.latest.filter(function (c) { return c.mentioned; }).length, miss: a.engines.filter(function (e, i) { return !q.latest[i].mentioned; }) }; }).filter(function (x) { return x.n <= 2; });
      var advice = {
        '부천 치아교정 추천': '‘추천’ 질문에는 기준을 가진 답이 인용됩니다. 교정 첫 문단의 ‘보건복지부 인증 치과교정과 전문의 2명’에 교정 기간·내원 주기 기준(병원 확인 뒤)을 더하고, ‘이렇게도 묻습니다’에 ‘부천에서 치아교정은 어디서 받나요?’ 같은 표현을 넣어 봅니다.',
        '부천 사랑니 발치': '사랑니 페이지 첫 문단이 ‘누가·어떻게’를 이미 답합니다. 질문 답 ‘사랑니는 누가 뽑나요?’ 첫 문장에 ‘부천역 3번 출구 도보 8분’ 위치를 함께 쓰면 지역 질문에 더 잘 걸립니다.',
        '부천 턱관절 치과': '턱관절 페이지와 질문 답 ‘턱에서 소리가 나면 어느 과에 가야 하나요?’를 서로 잇고, 첫 문단에 ‘부천’과 ‘구강내과 전문의 진료’를 함께 둡니다.',
        '부천 임플란트 치과': '임플란트 첫 문단에 진료 위치·진단 장비·보철 제작 기간이 있습니다. 비용 질문에 정가를 바로 답할 수 있도록 비급여 금액 단위 확인(병원 확인 필요)이 먼저입니다.',
      };
      return AA.head({ no: AA.no('aeo'), eyebrow: '성과 · 그로스메이트 AEO', title: 'AI 검색 노출',
        lead: '환자가 AI에게 묻는 질문 5개를 AI 답변 엔진 5곳에 매주 같은 방식으로 묻고, 답에 병원이 나오는지·몇 번째인지·어느 페이지를 인용했는지 기록합니다.' }) +
        AA.gmNote() +
        '<p class="ad-count" style="margin:12px 0">최근 측정 ' + esc(AA.fmt.date(a.date)) + ' · 매주 같은 요일에 측정</p>' +
        '<div class="ad-grid ad-grid--4">' + kpi('병원이 언급된 칸', a.latest + ' / ' + a.cells, '', '질문 5개 × AI 5곳') + kpi('지난 측정과 비교', (a.latest - a.prev >= 0 ? '+' : '') + (a.latest - a.prev), '칸', '지난번 ' + a.prev + '칸') + kpi('가장 자주 언급한 AI', best.label, '', best.value + '개 질문에서 언급', true) + kpi('인용된 페이지', citedRows.length, '쪽', '답의 출처로 링크된 사이트 페이지') + '</div>' +
        '<section class="ad-card ad-sec"><div class="ad-card__head"><div><h2 class="ad-card__title">질문 × AI 답변 엔진</h2><p class="ad-card__sub">● 숫자 = 답에서 몇 번째로 언급 · 아래 줄 = 인용한 페이지 · ‘새로’ = 지난번엔 없던 언급</p></div></div>' +
        '<div class="ad-table-wrap"><table class="ad-matrix"><caption class="ad-sr">측정 질문별 AI 답변 엔진 언급 표</caption><thead><tr><th scope="col">측정 질문</th>' + a.engines.map(function (e) { return '<th scope="col">' + esc(e) + '</th>'; }).join('') + '<th scope="col">언급</th></tr></thead><tbody>' +
        a.queries.map(function (q) {
          var n = q.latest.filter(function (c) { return c.mentioned; }).length;
          return '<tr><th scope="row">' + esc(q.q) + '</th>' + q.latest.map(function (c, i) {
            var was = q.prev[i] && q.prev[i].mentioned;
            if (c.mentioned) return '<td class="is-on" data-label="' + esc(a.engines[i]) + '"><span class="ad-cell"><span class="ad-cell__mark' + (was ? '' : ' is-new') + '">' + esc(c.rank) + '번째</span><span class="ad-cell__pg">' + esc(c.page) + '</span></span></td>';
            return '<td data-label="' + esc(a.engines[i]) + '"><span class="ad-cell__no' + (was ? ' is-lost' : '') + '">' + (was ? '빠짐' : '—') + '</span></td>';
          }).join('') + '<td class="sum" data-label="언급">' + n + '/5</td></tr>';
        }).join('') + '</tbody></table></div></section>' +
        '<div class="ad-grid ad-grid--even ad-sec"><section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">언급된 칸 추이</h2><p class="ad-card__sub">25칸 가운데 병원이 언급된 칸 수</p></div></div>' +
        AA.chart.html({ type: 'line', data: a.trend.map(function (x) { return { label: AA.fmt.short(x.date), value: x.n, tip: [AA.fmt.date(x.date) + ' 측정', x.n + '칸 / ' + a.cells + '칸'] }; }), yMax: a.cells, yStep: 5, unit: '칸', height: 190, ariaLabel: '주별 AI 답변 언급 칸 수 추이' }) +
        AA.chart.table('언급된 칸 추이', ['측정일', '언급 칸'], a.trend.map(function (x) { return [AA.fmt.date(x.date), x.n + '칸']; }), [1]) + '</section>' +
        '<section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">AI별 언급</h2><p class="ad-card__sub">질문 5개 중 몇 개에서 병원이 나왔나</p></div></div>' +
        AA.chart.html({ type: 'hbars', data: byEngine.map(function (x) { return { label: x.label, value: x.value, hot: x.label === best.label, valueText: x.value + ' / 5' }; }), max: 5, rowH: 36, ariaLabel: 'AI 답변 엔진별 언급 질문 수' }) +
        AA.chart.table('AI별 언급', ['AI', '언급 질문'], byEngine.map(function (x) { return [x.label, x.value + '/5']; }), [1]) + '</section></div>' +
        '<div class="ad-grid ad-grid--even ad-sec"><section class="ad-card"><div class="ad-card__head"><h2 class="ad-card__title">AI가 인용한 문장</h2></div>' +
        (quotes.length ? quotes.map(function (x) { return '<div class="ad-cite" style="margin-bottom:10px"><p class="ad-cite__k">' + icon('search') + esc(x.e) + ' · “' + esc(x.q) + '”</p><p class="ad-cite__a">' + esc(x.text) + '</p><p class="ad-cite__src">' + esc(x.page) + '</p></div>'; }).join('') : AA.emptyHtml('인용 문장이 없습니다')) +
        '<p class="ad-field__hint">사이트 질문 답 페이지의 첫 문단이 그대로 인용됩니다. 그래서 첫 문단은 질문에 바로 답하고 숫자에 기준을 붙입니다.</p></section>' +
        '<section class="ad-card"><div class="ad-card__head"><h2 class="ad-card__title">인용된 페이지</h2></div><ul class="ad-mini-list">' + citedRows.map(function (x) { return '<li><span class="ad-mini" style="cursor:default"><span><span class="ad-mini__t">' + esc(AA.pageLabel(x.p)) + '</span><span class="ad-mini__s">' + esc(x.p) + '</span></span><span class="tnum t-strong">' + x.n + '칸</span></span></li>'; }).join('') + '</ul></section></div>' +
        '<section class="ad-sec"><h2 class="ad-sec__t">다음에 고칠 것 <span class="ad-badge ad-badge--example">예시 데이터 기준</span></h2><div class="ad-sugs">' + weak.map(function (x) {
          return '<article class="ad-sug"><p class="ad-sug__t">“' + esc(x.q.q) + '” — 5곳 중 ' + x.n + '곳에서만 언급</p><p class="ad-sug__d">언급하지 않은 곳: ' + esc(x.miss.join(', ')) + '. ' + esc(advice[x.q.q] || '관련 페이지 첫 문단에 질문의 낱말과 병원 이름·위치를 함께 둡니다.') + '</p><p class="ad-sug__links">' + (x.q.pages || []).map(function (p) { return '<a class="ad-arrow" href="#/' + (p.indexOf('/answers/') === 0 ? 'answers/' + p.split('/')[2] : 'clinics/' + p.replace(/^\//, '')) + '">' + esc(AA.pageLabel(p).length > 26 ? AA.pageLabel(p).slice(0, 25) + '…' : AA.pageLabel(p)) + ' 고치기</a>'; }).join('') + '</p></article>';
        }).join('') + '</div></section>';
    },
  };
})();
