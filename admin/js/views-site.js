/* 관리자 데모 — 사이트 설정: 비급여 진료비 · 진료시간·휴진 · 공지 띠배너 · 메인 화면 · 병원 정보(+네이버 플레이스 글자 일치 점검)
   진료시간('apple_admin_hours')과 띠배너('apple_admin_notice')는 저장하면 이 브라우저의 데모 사이트에 바로 반영된다
   (사이트 쪽 assets/js/05-admin-bridge.js 가 읽는다). 나머지는 이 브라우저에만 남는다. */
(function () {
  'use strict';
  var w = window;
  var d = document;
  var AA = w.AA;
  var esc = AA.esc;
  var icon = AA.icon;

  // ════════════════════════════════════════════════════════════════════════
  // 비급여 진료비
  // ════════════════════════════════════════════════════════════════════════
  function priceData() {
    var ov = AA.store.get(AA.KEYS.pricing, null);
    var base = AA.seed.pricing || {};
    return { unit: base.unit, unitNote: base.unitNote, basis: base.basis, notes: base.notes || [], categories: ov && Array.isArray(ov.categories) ? ov.categories : AA.clone(base.categories || []), log: ov && Array.isArray(ov.log) ? ov.log : [], edited: !!ov };
  }
  var pu = { cat: '', editing: '', q: '', work: null };
  function priceRows(c, editing) {
    return c.items.map(function (x, i) {
      if (!editing) {
        return '<tr class="no-check"><th scope="row" data-label="항목" class="t-strong">' + esc(x.name) + '</th><td data-label="종류">' + esc(x.spec || '—') + '</td><td data-label="기준">' + esc(x.unit || '—') + '</td>' +
          '<td data-label="금액(만원)" class="num" style="font-family:var(--serif);font-size:16.5px;font-weight:600;color:var(--ink)">' + esc(x.price) + '</td><td data-label="비고" class="t-cell-sm">' + esc([x.note, x.vatSeparate && !/부가세/.test(x.note || '') ? '부가세 별도' : ''].filter(Boolean).join(' · ') || '—') + '</td></tr>';
      }
      var inp = function (k, lab, wide) { return '<input class="ad-input ad-input--sm" value="' + esc(x[k] || '') + '" data-input="pr-cell" data-i="' + i + '" data-k="' + k + '" aria-label="' + esc((x.name || '새 항목') + ' ' + lab) + '"' + (wide ? '' : ' style="max-width:12em"') + '>'; };
      return '<tr class="no-check"><td data-label="항목">' + inp('name', '항목', true) + '</td><td data-label="종류">' + inp('spec', '종류', true) + '</td><td data-label="기준">' + inp('unit', '기준') + '</td>' +
        '<td data-label="금액(만원)">' + inp('price', '금액') + '</td><td data-label="비고">' + inp('note', '비고', true) + '</td>' +
        '<td data-label="부가세"><label class="ad-switch" style="min-height:38px"><input type="checkbox" data-change="pr-vat" data-i="' + i + '"' + (x.vatSeparate ? ' checked' : '') + '><span class="ad-switch__ui" aria-hidden="true"></span><span class="ad-switch__t">별도</span></label></td>' +
        '<td data-label=""><button class="ad-ibtn" type="button" data-act="pr-del" data-i="' + i + '" aria-label="' + esc((x.name || '새 항목') + ' 지우기') + '">' + icon('trash') + '</button></td></tr>';
    }).join('');
  }
  AA.views.pricing = {
    render: function () {
      var P = priceData();
      var cats = P.categories;
      var q = pu.q.trim();
      var shown = cats.filter(function (c) { return !pu.cat || c.id === pu.cat; });
      var nItems = AA.sum(cats, function (c) { return c.items.length; });
      return AA.head({ no: AA.no('pricing'), eyebrow: '사이트 설정', title: '비급여 진료비',
        lead: '건강보험이 적용되지 않는 진료의 정가 표입니다. 비급여 진료비는 환자가 쉽게 볼 수 있게 공개해야 하며(의료법 제45조), 할인·행사 가격은 싣지 않습니다.' }) +
        '<p class="ad-note ad-note--warn" style="margin-bottom:8px"><span>' + icon('warn') + '</span><span><span class="ad-note__t">병원 확인 중</span> ' + esc(P.unitNote || '') + ' · ' + esc(P.basis || '') + '</span></p>' +
        AA.localNote() +
        '<div class="ad-grid ad-grid--4" style="margin:14px 0">' + AA.statCard('분류', cats.length + '개') + AA.statCard('항목', nItems + '개') + AA.statCard('부가세 별도', AA.sum(cats, function (c) { return c.items.filter(function (x) { return x.vatSeparate; }).length; }) + '개') + AA.statCard('고친 기록', P.log.length + '건') + '</div>' +
        '<div class="ad-filters"><div class="ad-field ad-field--grow" style="flex-basis:100%"><span class="ad-field__label">분류</span><div class="ad-chips" role="group" aria-label="분류로 거르기">' +
        [{ id: '', name: '전체' }].concat(cats).map(function (c) { return '<button class="ad-chip" type="button" aria-pressed="' + (pu.cat === c.id) + '" data-act="pr-cat" data-id="' + esc(c.id) + '">' + esc(c.name) + (c.items ? ' <span class="ad-chip__n">' + c.items.length + '</span>' : '') + '</button>'; }).join('') + '</div></div>' +
        '<label class="ad-field ad-field--grow"><span class="ad-field__label">항목 찾기</span><input class="ad-input" type="search" id="pr-q" value="' + esc(pu.q) + '" placeholder="예: 크라운, 스케일링, 교정" data-input="pr-q"></label></div>' +
        shown.map(function (c) {
          var editing = pu.editing === c.id;
          var cc = editing ? pu.work : c;
          var items = q && !editing ? cc.items.filter(function (x) { return [x.name, x.spec, x.note].join(' ').indexOf(q) > -1; }) : cc.items;
          if (q && !editing && !items.length) return '';
          var view = Object.assign({}, cc, { items: items });
          return '<section class="ad-card ad-sec" id="pr-' + esc(c.id) + '"><div class="ad-card__head"><div><h2 class="ad-card__title">' + esc(c.name) + ' <span class="muted tnum" style="font-family:var(--sans);font-size:14px;font-weight:500">' + c.items.length + '개</span></h2>' + (c.note ? '<p class="ad-card__sub">' + esc(c.note) + '</p>' : '') + '</div>' +
            '<div class="ad-actions">' + ((c.related || []).length ? c.related.slice(0, 2).map(function (p) { return AA.siteLink(p); }).join(' ') : '') +
            (editing ? '<button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="pr-cancel">취소</button><button class="ad-btn ad-btn--ink ad-btn--sm" type="button" data-act="pr-save">이 분류 저장</button>' : '<button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="pr-edit" data-id="' + esc(c.id) + '"' + (pu.editing ? ' disabled' : '') + '>' + icon('edit') + '고치기</button>') + '</div></div>' +
            '<div class="ad-table-wrap"><table class="ad-table ad-table--cards"><caption class="ad-sr">' + esc(c.name) + ' 비급여 진료비(단위 ' + esc(P.unit) + ')</caption><thead><tr><th>항목</th><th>종류</th><th>기준</th><th class="num">금액(' + esc(P.unit) + ')</th><th>비고</th>' + (editing ? '<th>부가세</th><th><span class="ad-sr">지우기</span></th>' : '') + '</tr></thead><tbody>' + priceRows(view, editing) + '</tbody></table></div>' +
            (editing ? '<p style="margin-top:10px"><button class="ad-btn ad-btn--line ad-btn--sm" type="button" data-act="pr-add">' + icon('plus') + '항목 더하기</button> <span class="ad-field__hint">금액은 정가만 적습니다(할인가·행사가 금지).</span></p><div id="pr-rules" style="margin-top:10px">' + AA.rules.report(cc.items.map(function (x) { return [x.name, x.spec, x.note].join(' '); }).join('\n')) + '</div>' : '') +
            '</section>';
        }).join('') +
        '<section class="ad-card ad-sec"><div class="ad-card__head"><h2 class="ad-card__title">고친 기록</h2>' + (P.edited ? '<button class="ad-btn ad-btn--ghost ad-btn--sm" type="button" data-act="pr-reset">' + icon('undo') + '원래 표로</button>' : '') + '</div>' +
        (P.log.length ? '<ol class="ad-timeline">' + P.log.slice().reverse().slice(0, 12).map(function (l) { return '<li><time>' + esc(AA.fmt.dt(l.at)) + '</time>' + esc(l.t) + '</li>'; }).join('') + '</ol>' : '<p class="muted">아직 고친 내용이 없습니다. 실서비스에서는 고친 사람·시각이 남고, 바뀐 금액은 사이트 표와 질문 답의 금액에 함께 반영됩니다.</p>') + '</section>';
    },
    on: {
      'pr-cat': function (el) { pu.cat = el.getAttribute('data-id'); AA.rerender(); },
      'pr-q': function (el) { pu.q = el.value; clearTimeout(pu.t); pu.t = setTimeout(function () { AA.rerender(); }, 250); },
      'pr-edit': function (el) { var id = el.getAttribute('data-id'); var c = priceData().categories.filter(function (x) { return x.id === id; })[0]; if (!c) return; pu.editing = id; pu.work = AA.clone(c); AA.rerender(); },
      'pr-cancel': function () { pu.editing = ''; pu.work = null; AA.rerender(); },
      'pr-cell': function (el) { pu.work.items[+el.getAttribute('data-i')][el.getAttribute('data-k')] = el.value; var r = d.getElementById('pr-rules'); if (r) r.innerHTML = AA.rules.report(pu.work.items.map(function (x) { return [x.name, x.spec, x.note].join(' '); }).join('\n')); },
      'pr-vat': function (el) { pu.work.items[+el.getAttribute('data-i')].vatSeparate = el.checked; },
      'pr-add': function () { pu.work.items.push({ name: '', spec: '', unit: '', price: '', note: '', vatSeparate: false }); AA.rerender(); var ins = d.querySelectorAll('#pr-' + pu.editing + ' tbody tr:last-child input'); if (ins[0]) ins[0].focus(); },
      'pr-del': function (el) { pu.work.items.splice(+el.getAttribute('data-i'), 1); AA.rerender(); },
      'pr-save': function () {
        var P = priceData();
        var items = pu.work.items.filter(function (x) { return String(x.name).trim() || String(x.price).trim(); });
        if (AA.rules.count(items.map(function (x) { return [x.name, x.spec, x.note].join(' '); }).join('\n'))) { AA.toast('금칙어(할인·이벤트 등)를 지운 뒤 저장할 수 있습니다'); return; }
        var old = P.categories.filter(function (c) { return c.id === pu.editing; })[0];
        var log = P.log.slice();
        var at = new Date().toISOString();
        items.forEach(function (x, i) {
          var o = old.items[i];
          if (!o) log.push({ at: at, t: old.name + ' · 새 항목 ‘' + x.name + '’ ' + x.price });
          else if (o.price !== x.price || o.name !== x.name || o.spec !== x.spec) log.push({ at: at, t: old.name + ' · ' + (o.name + (o.spec ? ' ' + o.spec : '')) + ' ' + o.price + ' → ' + (x.name + (x.spec ? ' ' + x.spec : '')) + ' ' + x.price });
        });
        if (old.items.length > items.length) log.push({ at: at, t: old.name + ' · 항목 ' + (old.items.length - items.length) + '개 지움' });
        var cats = P.categories.map(function (c) { return c.id === pu.editing ? Object.assign({}, c, { items: items }) : c; });
        AA.store.set(AA.KEYS.pricing, { categories: cats, log: log.slice(-200), updatedAt: at });
        pu.editing = ''; pu.work = null;
        AA.toast('비급여 진료비를 저장했습니다');
        AA.rerender();
      },
      'pr-reset': function () {
        AA.confirm({ title: '원래 표로 되돌릴까요?', msg: '이 브라우저에서 고친 금액과 기록을 모두 지웁니다.', ok: '되돌리기', danger: true }).then(function (y) { if (!y) return; AA.store.del(AA.KEYS.pricing); pu.editing = ''; AA.toast('원래 표로 되돌렸습니다'); AA.rerender(); });
      },
    },
  };

  // ════════════════════════════════════════════════════════════════════════
  // 진료시간·휴진
  // ════════════════════════════════════════════════════════════════════════
  var hu = { work: null };
  var DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
  function bandDefault(H) {
    var groups = AA.hours.groups(H.days);
    var night = groups.filter(function (g) { return g.night; })[0];
    var sat = H.days[6] && H.days[6].on ? H.days[6] : null;
    var key = night ? night.label + ' ' + AA.korTime(night.c) + '까지 야간진료' : groups.map(function (g) { return g.label + ' ' + AA.korTime(g.o, true) + '~' + AA.korTime(g.c, true); }).join(' · ');
    var more = (sat ? ' · 토요일 ' + AA.korTime(sat.o, true) + '~' + AA.korTime(sat.c, true) : '') + (H.closedText ? ' · ' + H.closedText : '') + (H.holidayText ? ' · ' + H.holidayText : '');
    return { key: key, more: more };
  }
  AA.bandDefault = bandDefault;
  function bandPv(o, mobile) {
    return '<div class="ad-band-pv' + (mobile ? ' ad-band-pv--mo' : '') + (o.off ? ' is-off' : '') + '" aria-hidden="true"><div class="ad-band-pv__in"><p class="ad-band-pv__text"><span class="ad-band-pv__key">' + esc(o.key) + '</span><span class="ad-band-pv__more">' + esc(o.more || '') + '</span></p>' +
      (o.link ? '<span class="ad-band-pv__link">' + esc(o.linkLabel || '자세히 보기') + '</span>' : '') + '<span class="ad-band-pv__x">' + (mobile ? '×' : '× 오늘 하루 닫기') + '</span></div></div>';
  }
  function hoursPreview(H) {
    var st = AA.hours.status(H);
    var b = bandDefault(H);
    var notice = AA.store.get(AA.KEYS.notice, null);
    return '<p class="ad-pv-label">지금 사이트에 보이는 ‘진료 상태’</p><p class="ad-status-pv"><span class="ad-dot ' + (st.state === 'open' ? 'ad-dot--green' : 'ad-dot--off') + '" aria-hidden="true"></span>' + esc(st.long) + '</p>' +
      '<p class="ad-pv-label">기본 띠배너' + (notice && notice.enabled !== false && notice.text ? ' (지금은 공지 띠배너가 대신 보입니다)' : '') + '</p>' + bandPv({ key: b.key, more: b.more, link: true, linkLabel: '진료시간 보기' });
  }
  AA.views.hours = {
    render: function () {
      if (!hu.work) hu.work = AA.clone(AA.hours.get());
      var H = hu.work;
      var today = AA.kst();
      var stored = AA.store.get(AA.KEYS.hours, null);
      var sp = (H.special || []).slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
      var upcoming = sp.filter(function (s) { return s.date >= today.ymd; });
      var past = sp.filter(function (s) { return s.date < today.ymd; }).reverse();
      var spRow = function (s, isPast) {
        var i = (H.special || []).indexOf(s);
        return '<li class="' + (isPast ? 'is-past' : '') + '"><span class="ad-special__d">' + esc(AA.fmt.dot(s.date)) + '(' + AA.DOW[AA.dowOf(s.date)] + ')</span><span>' + (s.type === 'closed' ? '<span class="ad-badge ad-badge--new">휴진</span> ' : '<span class="ad-badge ad-badge--contacted">' + esc(AA.korTime(s.o, true) + '~' + AA.korTime(s.c, true)) + '</span> ') + esc(s.label || '') + (s.from ? ' <span class="t-cell-sm">· ' + esc(s.from) + '</span>' : '') + '</span>' +
          '<button class="ad-ibtn" type="button" data-act="hr-sp-del" data-i="' + i + '" aria-label="' + esc(s.date + ' 일정 지우기') + '">' + icon('trash') + '</button></li>';
      };
      return AA.head({ no: AA.no('hours'), eyebrow: '사이트 설정', title: '진료시간·휴진',
        lead: '요일별 진료시간과 휴진·특별 진료일을 정합니다. 저장하면 이 브라우저의 데모 사이트에서 헤더의 ‘지금 진료 중’, 띠배너, 진료시간 그래프와 요일별 표, 점심시간, 푸터 진료시간이 바로 바뀝니다. 본문 문장(첫 문단 등)은 데모에서 바뀌지 않아, 바뀐 페이지에는 그렇다는 안내가 함께 보입니다.',
        actions: '<a class="ad-btn ad-btn--line ad-btn--sm" href="../visit/" target="_blank" rel="noopener">사이트에서 확인<span class="ad-sr"> (새 창)</span></a>' }) +
        (stored ? '<p class="ad-note ad-note--ok" style="margin-bottom:14px"><span>' + icon('check') + '</span><span>관리자에서 정한 진료시간을 사이트에 쓰고 있습니다(' + esc(AA.fmt.dt(stored.updatedAt || new Date().toISOString())) + ' 저장 · 이 브라우저).</span></p>' : '') +
        '<section class="ad-card" id="hr-pv" style="margin-bottom:16px">' + hoursPreview(H) + '</section>' +
        '<div class="ad-grid ad-grid--2"><div class="ad-stack">' +
        '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:12px">요일별 진료시간</h2><div class="ad-hours" role="group" aria-label="요일별 진료시간">' + DAY_ORDER.map(function (n) {
          var x = H.days[n];
          var dn = AA.DOW[n];
          return '<div class="ad-hours__row' + (x.on ? '' : ' is-off') + (today.day === n ? ' is-today' : '') + '"><span class="ad-hours__day">' + dn + '</span>' +
            AA.switchHtml({ label: x.on ? '진료' : '휴진', checked: x.on, change: 'hr-on', data: ' data-n="' + n + '" aria-label="' + dn + '요일 진료"' }) +
            '<label class="ad-field"><span class="ad-sr">' + dn + '요일 시작</span><input class="ad-input ad-input--sm" type="time" step="600" value="' + esc(x.o) + '" data-change="hr-time" data-n="' + n + '" data-k="o"' + (x.on ? '' : ' disabled') + '></label>' +
            '<label class="ad-field"><span class="ad-sr">' + dn + '요일 끝</span><input class="ad-input ad-input--sm" type="time" step="600" value="' + esc(x.c) + '" data-change="hr-time" data-n="' + n + '" data-k="c"' + (x.on ? '' : ' disabled') + '></label>' +
            '<label class="ad-switch ad-hours__night" style="min-height:38px"><input type="checkbox" data-change="hr-night" data-n="' + n + '"' + (x.night ? ' checked' : '') + (x.on ? '' : ' disabled') + '><span class="ad-switch__ui" aria-hidden="true"></span><span class="ad-switch__t">야간</span></label></div>';
        }).join('') + '</div>' +
        '<div class="ad-form-row" style="margin-top:14px"><label class="ad-field"><span class="ad-field__label">휴진 안내</span><input class="ad-input" value="' + esc(H.closedText) + '" data-input="hr-text" data-k="closedText"></label>' +
        '<label class="ad-field"><span class="ad-field__label">공휴일 안내</span><input class="ad-input" value="' + esc(H.holidayText) + '" data-input="hr-text" data-k="holidayText"></label></div>' +
        '<p class="ad-field__hint" style="margin-top:8px">‘공휴일 정상 진료’와 명절 휴진 원칙은 병원 확인 중입니다(대시보드 › 병원 확인 필요).</p></section>' +
        '<section class="ad-card"><div class="ad-card__head"><h2 class="ad-card__title">점심시간</h2><span class="muted">층마다 다릅니다</span></div><div class="ad-list-ed">' + (H.lunch || []).map(function (l, i) {
          return '<div class="ad-form-row ad-form-row--lunch" style="align-items:end"><label class="ad-field"><span class="ad-field__label">층·진료부</span><input class="ad-input ad-input--sm" value="' + esc(l.floors) + '" data-input="hr-lunch" data-i="' + i + '" data-k="floors"></label>' +
            '<label class="ad-field"><span class="ad-field__label">시작</span><input class="ad-input ad-input--sm" type="time" step="600" value="' + esc(l.start) + '" data-input="hr-lunch" data-i="' + i + '" data-k="start"></label>' +
            '<label class="ad-field"><span class="ad-field__label">끝</span><input class="ad-input ad-input--sm" type="time" step="600" value="' + esc(l.end) + '" data-input="hr-lunch" data-i="' + i + '" data-k="end"></label></div>';
        }).join('') + '</div></section>' +
        '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:12px">휴진·특별 진료일</h2>' +
        '<form class="ad-form-row ad-form-row--3" data-submit="hr-sp-add" style="align-items:end"><label class="ad-field"><span class="ad-field__label">날짜</span><input class="ad-input ad-input--sm" type="date" name="date" required></label>' +
        '<label class="ad-field"><span class="ad-field__label">종류</span><select class="ad-select ad-input--sm" name="type"><option value="closed">휴진</option><option value="hours">시간 변경</option></select></label>' +
        '<label class="ad-field"><span class="ad-field__label">이름 <small>예: 추석 연휴</small></span><input class="ad-input ad-input--sm" name="label" maxlength="30"></label>' +
        '<label class="ad-field"><span class="ad-field__label">시작 <small>시간 변경일 때</small></span><input class="ad-input ad-input--sm" type="time" step="600" name="o" value="09:30"></label>' +
        '<label class="ad-field"><span class="ad-field__label">끝</span><input class="ad-input ad-input--sm" type="time" step="600" name="c" value="18:30"></label>' +
        '<button class="ad-btn ad-btn--line ad-btn--sm" type="submit">' + icon('plus') + '일정 더하기</button></form>' +
        '<p class="ad-pv-label">다가오는 일정</p>' + (upcoming.length ? '<ul class="ad-special">' + upcoming.map(function (s) { return spRow(s, false); }).join('') + '</ul>' : '<p class="muted">없습니다. 명절 연휴가 정해지면 여기에 더하세요.</p>') +
        (past.length ? '<details class="ad-tbl" style="margin-top:12px"><summary>지난 일정 ' + past.length + '개(원본 월별 진료안내)</summary><ul class="ad-special">' + past.map(function (s) { return spRow(s, true); }).join('') + '</ul></details>' : '') + '</section>' +
        '</div><aside class="ad-stack">' +
        '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:8px">같은 시간끼리 묶으면</h2><ul class="ad-aeo">' + AA.hours.groups(H.days).map(function (g) { return '<li class="is-ok">' + icon('clock') + '<span><b>' + esc(g.label) + '</b> ' + esc(AA.korTime(g.o, true) + ' – ' + AA.korTime(g.c, true)) + (g.night ? ' · 야간진료' : '') + '</span></li>'; }).join('') +
        '<li class="is-ok">' + icon('x') + '<span><b>' + esc(AA.hours.offDays(H.days).join('·') || '없음') + '</b> 휴진</span></li></ul>' +
        '<p class="ad-field__hint" style="margin-top:10px">구조화 데이터(AI가 읽는 진료시간)도 이 묶음으로 나갑니다.</p></section></aside></div>' +
        '<div class="ad-savebar"><p class="ad-savebar__msg" id="hr-msg">저장하면 이 브라우저의 데모 사이트에 바로 반영됩니다</p>' + (stored ? '<button class="ad-btn ad-btn--ghost ad-btn--sm" type="button" data-act="hr-reset">' + icon('undo') + '원래 진료시간으로</button>' : '') + '<button class="ad-btn ad-btn--ink" type="button" data-act="hr-save">저장</button></div>';
    },
    on: {
      'hr-on': function (el) { var n = +el.getAttribute('data-n'); hu.work.days[n].on = el.checked; dirty(); AA.rerender(); },
      'hr-time': function (el) { var n = +el.getAttribute('data-n'); hu.work.days[n][el.getAttribute('data-k')] = el.value; dirty(); refreshPv(); },
      'hr-night': function (el) { hu.work.days[+el.getAttribute('data-n')].night = el.checked; dirty(); refreshPv(); },
      'hr-text': function (el) { hu.work[el.getAttribute('data-k')] = el.value; dirty(); refreshPv(); },
      'hr-lunch': function (el) { hu.work.lunch[+el.getAttribute('data-i')][el.getAttribute('data-k')] = el.value; dirty(); },
      'hr-sp-add': function (f) {
        var g = function (k) { return f.elements[k] ? f.elements[k].value : ''; };
        if (!g('date')) { AA.toast('날짜를 고르세요'); return; }
        var s = { date: g('date'), type: g('type'), label: g('label').trim() };
        if (s.type === 'hours') { s.o = g('o'); s.c = g('c'); if (AA.toMin(s.c) <= AA.toMin(s.o)) { AA.toast('끝 시간이 시작보다 늦어야 합니다'); return; } }
        hu.work.special = (hu.work.special || []).filter(function (x) { return x.date !== s.date; }).concat([s]);
        dirty(); AA.rerender(); AA.toast(AA.fmt.date(s.date) + ' 일정을 더했습니다 — 저장해야 사이트에 반영됩니다');
      },
      'hr-sp-del': function (el) { hu.work.special.splice(+el.getAttribute('data-i'), 1); dirty(); AA.rerender(); },
      'hr-save': function () {
        var bad = hu.work.days.filter(function (x) { return x.on && AA.toMin(x.c) <= AA.toMin(x.o); });
        if (bad.length) { AA.toast(bad.map(function (x) { return AA.DOW[x.dow]; }).join('·') + '요일 끝 시간이 시작보다 늦어야 합니다'); return; }
        var rec = { v: 1, days: hu.work.days, special: hu.work.special || [], lunch: hu.work.lunch || [], closedText: hu.work.closedText, holidayText: hu.work.holidayText, updatedAt: new Date().toISOString() };
        if (AA.store.set(AA.KEYS.hours, rec)) { AA.toast('저장했습니다 — 이 브라우저의 데모 사이트에 반영됩니다'); hu.work = null; AA.rerender(); }
      },
      'hr-reset': function () {
        AA.confirm({ title: '원래 진료시간으로 되돌릴까요?', msg: '관리자에서 정한 진료시간·휴진일을 지우고 병원 기본 진료시간으로 돌아갑니다.', ok: '되돌리기', danger: true }).then(function (y) { if (!y) return; AA.store.del(AA.KEYS.hours); hu.work = null; AA.toast('원래 진료시간으로 되돌렸습니다'); AA.rerender(); });
      },
    },
  };
  function dirty() { var m = d.getElementById('hr-msg'); if (m) { m.textContent = '고친 내용이 있습니다 — 저장하면 사이트에 반영됩니다'; m.classList.add('is-dirty'); } }
  function refreshPv() { var p = d.getElementById('hr-pv'); if (p && hu.work) p.innerHTML = hoursPreview(hu.work); }

  // ════════════════════════════════════════════════════════════════════════
  // 공지 띠배너
  // ════════════════════════════════════════════════════════════════════════
  var LINKS = [['/visit/', '진료시간 보기'], ['/news/', '소식 보기'], ['/consult/', '상담 신청'], ['/self-check/', '2분 자가진단'], ['/pricing/', '비급여 진료비'], ['', '링크 없음']];
  var nu = { work: null };
  function noticeGet() {
    var s = AA.store.get(AA.KEYS.notice, null);
    return s ? Object.assign({ enabled: true, text: '', more: '', link: '/visit/', linkLabel: '진료시간 보기', start: '', end: '' }, s) : { enabled: true, text: '', more: '', link: '/visit/', linkLabel: '진료시간 보기', start: '', end: '', isDefault: true };
  }
  function noticePv(n) {
    var b = bandDefault(AA.hours.get());
    var useText = !!String(n.text || '').trim();
    var o = { key: useText ? n.text : b.key, more: useText ? (n.more ? ' · ' + n.more : '') : b.more, link: n.link !== '' && !!n.link, linkLabel: n.linkLabel, off: n.enabled === false };
    var today = AA.kst().ymd;
    var inRange = (!n.start || today >= n.start) && (!n.end || today <= n.end);
    return '<p class="ad-pv-label">PC</p>' + bandPv(o) + '<p class="ad-pv-label">모바일(390px — 앞부분만 보입니다)</p>' + bandPv(o, true) +
      '<p class="ad-field__hint" style="margin-top:10px">' + (n.enabled === false ? '띠배너를 숨깁니다.' : useText ? (inRange ? '오늘 사이트에 이 공지가 보입니다.' : '기간 밖이라 오늘은 기본 띠배너가 보입니다.') : '문구를 비우면 진료시간 기본 띠배너가 보입니다.') + ' ‘오늘 하루 닫기’를 누른 방문자에게는 그날 다시 보이지 않습니다.</p>';
  }
  AA.views.notice = {
    render: function () {
      if (!nu.work) nu.work = noticeGet();
      var n = nu.work;
      var stored = AA.store.get(AA.KEYS.notice, null);
      var tpl = [
        ['명절 휴진', '추석 연휴 ○월 ○일(○)~○일(○) 휴진합니다'],
        ['진료시간 변경', '○월 ○일(○)은 오후 ○시까지 진료합니다'],
        ['새 의료진', '○○과 ○○○ 과장이 ○월 ○일부터 진료합니다'],
        ['야간진료', bandDefault(AA.hours.get()).key],
      ];
      var upcoming = (AA.hours.get().special || []).filter(function (s) { return s.date >= AA.kst().ymd; }).sort(function (a, b) { return a.date.localeCompare(b.date); })[0];
      if (upcoming) tpl.unshift(['다가오는 일정', AA.fmt.date(upcoming.date) + ' ' + (upcoming.type === 'closed' ? (upcoming.label ? upcoming.label + ' ' : '') + '휴진합니다' : AA.korTime(upcoming.o) + '~' + AA.korTime(upcoming.c) + ' 진료합니다')]);
      var len = AA.textLen(n.text);
      return AA.head({ no: AA.no('notice'), eyebrow: '사이트 설정', title: '공지 띠배너',
        lead: '모든 페이지 맨 위의 어두운 띠에 들어가는 공지입니다. 명절 휴진·진료시간 변경처럼 모든 방문자가 알아야 할 것만 짧게 씁니다. 저장하면 이 브라우저의 데모 사이트에 바로 보입니다.',
        actions: '<a class="ad-btn ad-btn--line ad-btn--sm" href="../" target="_blank" rel="noopener">사이트에서 확인<span class="ad-sr"> (새 창)</span></a>' }) +
        (stored ? '<p class="ad-note ad-note--ok" style="margin-bottom:14px"><span>' + icon('check') + '</span><span>공지 띠배너를 사이트에 쓰고 있습니다(이 브라우저).</span></p>' : '') +
        '<section class="ad-card" id="nt-pv" style="margin-bottom:16px">' + noticePv(n) + '</section>' +
        '<div class="ad-grid ad-grid--2"><section class="ad-card"><div class="ad-form">' +
        AA.switchHtml({ id: 'nt-on', label: '띠배너 보이기', checked: n.enabled !== false, change: 'nt-on' }) +
        '<label class="ad-field"><span class="ad-field__label"><span>공지 문구</span><span id="nt-count">' + AA.counter(len, 0, 40) + '</span></span><input class="ad-input" id="nt-text" maxlength="60" value="' + esc(n.text) + '" placeholder="비우면 진료시간 기본 문구" data-input="nt-f" data-k="text"><span class="ad-field__hint">40자 안쪽을 권합니다. 모바일에서는 앞부분만 보이므로 날짜·요일을 앞에 둡니다.</span></label>' +
        '<label class="ad-field"><span class="ad-field__label">덧붙일 말 <small>PC에서만 보임</small></span><input class="ad-input" maxlength="60" value="' + esc(n.more) + '" data-input="nt-f" data-k="more" placeholder="예: 진료 예약은 전화로 확인해 주세요"></label>' +
        '<div class="ad-form-row"><label class="ad-field"><span class="ad-field__label">링크</span><select class="ad-select" data-change="nt-link">' + LINKS.map(function (l) { return '<option value="' + esc(l[0]) + '"' + (l[0] === (n.link || '') ? ' selected' : '') + '>' + esc(l[1] + (l[0] ? ' (' + l[0] + ')' : '')) + '</option>'; }).join('') + '</select></label>' +
        '<label class="ad-field"><span class="ad-field__label">링크 글자</span><input class="ad-input" maxlength="12" value="' + esc(n.linkLabel) + '" data-input="nt-f" data-k="linkLabel"' + (n.link ? '' : ' disabled') + '></label></div>' +
        '<div class="ad-form-row"><label class="ad-field"><span class="ad-field__label">보이기 시작</span><input class="ad-input" type="date" value="' + esc(n.start) + '" data-change="nt-date" data-k="start"></label><label class="ad-field"><span class="ad-field__label">보이기 끝</span><input class="ad-input" type="date" value="' + esc(n.end) + '" data-change="nt-date" data-k="end"></label></div>' +
        '<div id="nt-rules">' + AA.rules.report(n.text + '\n' + n.more) + '</div></div></section>' +
        '<aside class="ad-card"><h2 class="ad-card__title" style="margin-bottom:10px">문구 틀</h2><p class="ad-field__hint" style="margin-bottom:10px">누르면 공지 문구에 들어갑니다. ○는 고쳐 쓰세요.</p><div class="ad-chips" style="display:grid;gap:8px">' +
        tpl.map(function (t, i) { return '<button class="ad-chip" type="button" data-act="nt-tpl" data-i="' + i + '" style="justify-content:flex-start;white-space:normal;text-align:left;min-height:52px;padding:8px 12px"><span><b>' + esc(t[0]) + '</b><br><span class="muted">' + esc(t[1]) + '</span></span></button>'; }).join('') + '</div>' +
        '<p class="ad-field__hint" style="margin-top:12px">할인·이벤트 같은 환자 유인 문구는 쓸 수 없습니다.</p></aside></div>' +
        '<div class="ad-savebar"><p class="ad-savebar__msg" id="nt-msg">저장하면 이 브라우저의 데모 사이트에 바로 반영됩니다</p>' + (stored ? '<button class="ad-btn ad-btn--ghost ad-btn--sm" type="button" data-act="nt-reset">' + icon('undo') + '기본 띠배너로</button>' : '') + '<button class="ad-btn ad-btn--ink" type="button" data-act="nt-save">저장</button></div>';
      // 문구 틀은 렌더 때마다 같은 순서로 다시 만든다(nt-tpl 에서 같은 계산)
    },
    on: {
      'nt-on': function (el) { nu.work.enabled = el.checked; ntLive(); },
      'nt-f': function (el) { nu.work[el.getAttribute('data-k')] = el.value; ntLive(); },
      'nt-link': function (el) { nu.work.link = el.value; var l = LINKS.filter(function (x) { return x[0] === el.value; })[0]; nu.work.linkLabel = el.value ? (l ? l[1] : '자세히 보기') : ''; AA.rerender(); },
      'nt-date': function (el) { nu.work[el.getAttribute('data-k')] = el.value; ntLive(); },
      'nt-tpl': function (el) {
        var i = +el.getAttribute('data-i');
        var btns = d.querySelectorAll('[data-act="nt-tpl"]');
        var b = btns[i]; if (!b) return;
        var text = b.querySelector('.muted').textContent;
        nu.work.text = text; AA.rerender();
        var inp = d.getElementById('nt-text'); if (inp) { inp.focus(); var k = text.indexOf('○'); if (k > -1) inp.setSelectionRange(k, k + 1); }
      },
      'nt-save': function () {
        var n = nu.work;
        if (AA.rules.count(n.text + '\n' + n.more)) { AA.toast('금칙어를 고친 뒤 저장할 수 있습니다'); return; }
        if (/○/.test(n.text)) { AA.toast('○ 자리를 실제 날짜·이름으로 바꿔 주세요'); var inp = d.getElementById('nt-text'); if (inp) inp.focus(); return; }
        if (n.start && n.end && n.end < n.start) { AA.toast('끝 날짜가 시작보다 늦어야 합니다'); return; }
        var rec = { enabled: n.enabled !== false, text: String(n.text || '').trim(), more: String(n.more || '').trim(), link: n.link || '', linkLabel: n.link ? String(n.linkLabel || '').trim() || '자세히 보기' : '', start: n.start || '', end: n.end || '', updatedAt: new Date().toISOString() };
        if (AA.store.set(AA.KEYS.notice, rec)) { nu.work = null; AA.toast('저장했습니다 — 이 브라우저의 데모 사이트 띠배너에 반영됩니다'); AA.rerender(); }
      },
      'nt-reset': function () { AA.store.del(AA.KEYS.notice); nu.work = null; AA.toast('기본 띠배너로 되돌렸습니다'); AA.rerender(); },
    },
  };
  function ntLive() {
    var p = d.getElementById('nt-pv'); if (p) p.innerHTML = noticePv(nu.work);
    var c = d.getElementById('nt-count'); if (c) c.innerHTML = AA.counter(AA.textLen(nu.work.text), 0, 40);
    var r = d.getElementById('nt-rules'); if (r) r.innerHTML = AA.rules.report(nu.work.text + '\n' + nu.work.more);
    var m = d.getElementById('nt-msg'); if (m) { m.textContent = '고친 내용이 있습니다 — 저장하면 사이트에 반영됩니다'; m.classList.add('is-dirty'); }
  }

  // ════════════════════════════════════════════════════════════════════════
  // 메인 화면
  // ════════════════════════════════════════════════════════════════════════
  var mu = { work: null };
  function mainGet() {
    var s = AA.store.get(AA.KEYS.main, null);
    var secs = (AA.seed.home || {}).sections || [];
    var base = { hero: 'a4_3.webp', sections: secs.map(function (x) { return { id: x.id, show: true }; }), popup: { enabled: false, title: '', text: '', link: '', start: '', end: '' } };
    if (!s) return base;
    var order = Array.isArray(s.sections) ? s.sections.filter(function (x) { return secs.some(function (y) { return y.id === x.id; }); }) : base.sections;
    secs.forEach(function (x) { if (!order.some(function (y) { return y.id === x.id; })) order.push({ id: x.id, show: true }); });
    return { hero: s.hero || base.hero, sections: order, popup: Object.assign({}, base.popup, s.popup || {}) };
  }
  AA.views.main = {
    render: function () {
      if (!mu.work) mu.work = mainGet();
      var m = mu.work;
      var Hm = AA.seed.home || {};
      var photos = Hm.heroPhotos || [];
      var cur = photos.filter(function (p) { return p.name === m.hero; })[0] || photos[0] || {};
      var reach = {};
      ((AA.seed.conversion || {}).sections || []).forEach(function (s) { reach[s.id] = s.all; });
      var label = {};
      (Hm.sections || []).forEach(function (s) { label[s.id] = s.label; });
      var H = AA.seed.hospital;
      return AA.head({ no: AA.no('main'), eyebrow: '사이트 설정', title: '메인 화면',
        lead: '홈 첫 화면 사진과 구간 순서·보이기를 정합니다. 구간마다 방문자가 얼마나 내려오는지(전환 개선 예시)를 함께 보면서 순서를 바꿀 수 있습니다.',
        actions: '<a class="ad-btn ad-btn--line ad-btn--sm" href="../" target="_blank" rel="noopener">홈 보기<span class="ad-sr"> (새 창)</span></a>' }) +
        AA.localNote('홈은 미리 만들어진 페이지라 데모에서는 저장해도 바뀌지 않습니다(띠배너·진료시간만 바로 반영)') +
        '<div class="ad-grid ad-grid--even ad-sec"><section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:12px">첫 화면 미리보기</h2>' +
        '<div class="ad-hero-pv">' + (cur.file ? '<img src="../' + esc(cur.file) + '" alt="' + esc(cur.alt || cur.caption || '') + '">' : '') + '<div class="ad-hero-pv__panel"><p class="ad-hero-pv__t">' + esc(H.name) + '<br>' + esc(H.founded) + '년부터, 부천에서<br>진료해 왔습니다</p></div></div>' +
        '<p class="ad-field__hint" style="margin-top:8px">사진 설명: ' + esc(cur.caption || '') + '. 제목과 첫 문단은 병원 데이터(개원 연도·진료과·의료진 수·야간진료)에서 자동으로 만듭니다.</p></section>' +
        '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:4px">첫 화면 사진</h2><p class="ad-field__hint" style="margin-bottom:12px">병원 실사만 고를 수 있습니다(연출 모델 사진·치료 전후 사진은 쓰지 않습니다).</p><div class="ad-photos" role="radiogroup" aria-label="첫 화면 사진">' +
        photos.map(function (p) { return '<label class="ad-photo"><input type="radio" name="hero" value="' + esc(p.name) + '"' + (p.name === m.hero ? ' checked' : '') + ' data-change="mn-hero"><span class="ad-photo__img"><img src="../' + esc(p.file) + '" alt="" decoding="async"></span><span class="ad-photo__on">사용 중</span><span class="ad-photo__cap">' + esc(p.caption) + '</span></label>'; }).join('') + '</div></section></div>' +
        '<div class="ad-grid ad-grid--2 ad-sec"><section class="ad-card"><div class="ad-card__head"><div><h2 class="ad-card__title">구간 순서·보이기</h2><p class="ad-card__sub">기승전결 순서 · 오른쪽 숫자는 그 구간까지 내려온 방문 비율(예시)</p></div></div><ol class="ad-order">' +
        m.sections.map(function (s, i) {
          var first = s.id === 'hero';
          return '<li class="' + (s.show ? '' : 'is-hidden') + '"><span class="ad-order__no">' + String(i + 1).padStart(2, '0') + '</span><span class="ad-order__name">' + esc(label[s.id] || s.id) + '<code>' + esc(s.id) + '</code></span>' +
            '<span class="ad-order__reach">' + (reach[s.id] != null ? '<span class="ad-meter"><span class="ad-meter__bar"><span class="ad-meter__fill" style="width:' + reach[s.id] + '%"></span></span><span class="tnum">' + reach[s.id] + '%</span></span>' : '') + '</span>' +
            (first ? '<span class="muted" style="font-size:var(--fs-xs)">늘 맨 위</span><span></span>' : AA.switchHtml({ label: s.show ? '보임' : '숨김', checked: s.show, change: 'mn-show', data: ' data-i="' + i + '" aria-label="' + esc((label[s.id] || s.id) + ' 보이기') + '"' }) +
              '<span class="ad-mini-btns"><button class="ad-ibtn" type="button" data-act="mn-move" data-i="' + i + '" data-dir="-1"' + (i > 1 ? '' : ' disabled') + ' aria-label="' + esc(label[s.id]) + ' 위로">' + icon('up') + '</button><button class="ad-ibtn" type="button" data-act="mn-move" data-i="' + i + '" data-dir="1"' + (i < m.sections.length - 1 ? '' : ' disabled') + ' aria-label="' + esc(label[s.id]) + ' 아래로">' + icon('down') + '</button></span>') + '</li>';
        }).join('') + '</ol><p class="ad-field__hint" style="margin-top:10px">구간 이름표(code)는 그로스메이트 구간 분석에 그대로 쓰입니다. 숨긴 구간은 도달 통계에서도 빠집니다.</p></section>' +
        '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:10px">알림 팝업 <span class="muted" style="font-family:var(--sans);font-size:14px;font-weight:500">선택</span></h2><div class="ad-form">' +
        AA.switchHtml({ label: '홈에 알림 팝업 띄우기', checked: m.popup.enabled, change: 'mn-pop-on' }) +
        '<label class="ad-field"><span class="ad-field__label">제목</span><input class="ad-input" value="' + esc(m.popup.title) + '" data-input="mn-pop" data-k="title"' + (m.popup.enabled ? '' : ' disabled') + '></label>' +
        '<label class="ad-field"><span class="ad-field__label">내용</span><textarea class="ad-textarea" rows="3" data-input="mn-pop" data-k="text"' + (m.popup.enabled ? '' : ' disabled') + '>' + esc(m.popup.text) + '</textarea></label>' +
        '<div id="mn-rules">' + AA.rules.report(m.popup.title + '\n' + m.popup.text) + '</div>' +
        '<p class="ad-field__hint">팝업은 첫 화면을 가려 이탈이 늘 수 있어 꼭 필요할 때만 씁니다. 대부분은 공지 띠배너로 충분합니다. 팝업 글자는 그림이 아닌 글자로만 넣습니다.</p></div></section></div>' +
        '<div class="ad-savebar"><p class="ad-savebar__msg" id="mn-msg">바뀐 내용 없음</p><button class="ad-btn ad-btn--ghost ad-btn--sm" type="button" data-act="mn-reset">' + icon('undo') + '처음 구성으로</button><button class="ad-btn ad-btn--ink" type="button" data-act="mn-save">저장</button></div>';
    },
    on: {
      'mn-hero': function (el) { mu.work.hero = el.value; mnDirty(); AA.rerender(); },
      'mn-show': function (el) { mu.work.sections[+el.getAttribute('data-i')].show = el.checked; mnDirty(); AA.rerender(); },
      'mn-move': function (el) { var i = +el.getAttribute('data-i'); var j = i + (+el.getAttribute('data-dir')); var s = mu.work.sections; if (j < 1 || j >= s.length) return; s.splice(j, 0, s.splice(i, 1)[0]); mnDirty(); AA.rerender(); var b = d.querySelector('[data-act="mn-move"][data-i="' + j + '"][data-dir="' + el.getAttribute('data-dir') + '"]'); if (b && !b.disabled) b.focus(); },
      'mn-pop-on': function (el) { mu.work.popup.enabled = el.checked; mnDirty(); AA.rerender(); },
      'mn-pop': function (el) { mu.work.popup[el.getAttribute('data-k')] = el.value; mnDirty(); var r = d.getElementById('mn-rules'); if (r) r.innerHTML = AA.rules.report(mu.work.popup.title + '\n' + mu.work.popup.text); },
      'mn-save': function () {
        if (AA.rules.count(mu.work.popup.title + '\n' + mu.work.popup.text)) { AA.toast('팝업 문구의 금칙어를 고친 뒤 저장할 수 있습니다'); return; }
        AA.store.set(AA.KEYS.main, Object.assign({}, mu.work, { updatedAt: new Date().toISOString() })); mu.dirty = false; AA.toast('메인 화면 구성을 저장했습니다(이 브라우저)'); AA.rerender();
      },
      'mn-reset': function () { AA.store.del(AA.KEYS.main); mu.work = null; mu.dirty = false; AA.toast('처음 구성으로 되돌렸습니다'); AA.rerender(); },
    },
    after: function () { var m = d.getElementById('mn-msg'); if (m && mu.dirty) { m.textContent = '고친 내용이 있습니다 — 저장하세요'; m.classList.add('is-dirty'); } },
  };
  function mnDirty() { mu.dirty = true; }

  // ════════════════════════════════════════════════════════════════════════
  // 병원 정보(+네이버 플레이스와 글자 일치 점검)
  // ════════════════════════════════════════════════════════════════════════
  var hp = { work: null, naver: null };
  var HF = [
    ['name', '병원 이름'], ['nameEn', '영문 이름'], ['phone', '대표전화'], ['address', '주소(표시)'], ['postalCode', '우편번호'],
    ['ceo', '대표자'], ['bizNo', '사업자등록번호'], ['privacyName', '개인정보 보호책임자'], ['privacyPhone', '보호책임자 연락처'],
    ['subway', '지하철'], ['busCity', '시내버스'], ['busTrunk', '간선버스'],
    ['naverBooking', '네이버 예약 주소'], ['naverPlace', '네이버 플레이스 주소'], ['kakaoChannel', '카카오톡 채널'], ['blog', '네이버 블로그'], ['youtube', '유튜브'],
  ];
  function hospBase() {
    var H = AA.seed.hospital;
    return { name: H.name, nameEn: H.nameEn, phone: H.phone, address: H.address.display, postalCode: H.address.postalCode, ceo: H.ceo, bizNo: H.bizNo,
      privacyName: H.privacyOfficer.name, privacyPhone: H.privacyOfficer.phone, subway: H.transit.subway, busCity: (H.transit.busCity || []).join(', '), busTrunk: (H.transit.busTrunk || []).join(', '),
      naverBooking: H.links.naverBooking, naverPlace: H.links.naverPlace, kakaoChannel: H.links.kakaoChannel, blog: H.links.blog, youtube: H.links.youtube };
  }
  function hospGet() { var s = AA.store.get(AA.KEYS.hospital, null); return Object.assign(hospBase(), (s && s.info) || {}); }
  function naverGet() { var s = AA.store.get(AA.KEYS.hospital, null); var ex = AA.seed.naverPlaceExample || {}; return Object.assign({ name: ex.name, phone: ex.phone, address: ex.address, hours: ex.hours, homepage: ex.homepage, closed: ex.closed }, (s && s.naver) || {}); }
  function siteHoursText() {
    var H = AA.hours.get();
    return [1, 2, 3, 4, 5, 6, 0].map(function (n) { var x = H.days[n]; return AA.DOW[n] + ' ' + (x && x.on ? x.o + ' - ' + x.c : '휴무'); }).join('\n');
  }
  var normNap = function (s) { return String(s || '').toLowerCase().replace(/https?:\/\//g, '').replace(/^www\./, '').replace(/\/+$/, '').replace(/[\s\-–~·.,()]/g, '').replace(/휴진/g, '휴무').replace(/(경기도|경기)/g, '경기'); };
  function diffHtml(a, b) {
    a = String(a || ''); b = String(b || '');
    var i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    var j = 0; while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
    return '<span class="ad-diff">' + esc(b.slice(0, i)) + (a.slice(i, a.length - j) ? '<del title="홈페이지에만 있음">' + esc(a.slice(i, a.length - j)) + '</del>' : '') + (b.slice(i, b.length - j) ? '<ins title="네이버 플레이스에만 있음">' + esc(b.slice(i, b.length - j)) + '</ins>' : '') + esc(b.slice(b.length - j)) + '</span>';
  }
  function napRows(info, nv) {
    var site = (AA.seed.site || {});
    var hp1 = (site.productionOrigin || 'https://appledental.kr');
    return [
      ['name', '상호명', info.name, nv.name, '지역명을 붙여 쓰는지까지 맞추면 AI가 같은 병원으로 묶기 쉽습니다'],
      ['phone', '전화', info.phone, nv.phone, ''],
      ['address', '주소', info.address, nv.address, '건물 이름 표기(사과나무치과병원 / 선영프라자)를 하나로 맞추세요'],
      ['hours', '영업시간', siteHoursText(), nv.hours, '진료시간·휴진 화면의 요일별 시간과 비교합니다'],
      ['homepage', '홈페이지', hp1, nv.homepage, '실서비스 주소로 바꿀 때 함께 고칩니다'],
      ['closed', '휴무', (AA.hours.get().closedText || ''), nv.closed, ''],
    ];
  }
  AA.views.hospital = {
    render: function () {
      if (!hp.work) hp.work = hospGet();
      if (!hp.naver) hp.naver = naverGet();
      var info = hp.work;
      var nv = hp.naver;
      var rows = napRows(info, nv);
      var diff = rows.filter(function (r) { return normNap(r[2]) !== normNap(r[3]); }).length;
      var H = AA.seed.hospital;
      var Hs = AA.hours.get();
      var groups = AA.hours.groups(Hs.days);
      var ld = { '@type': ['Dentist', 'MedicalClinic'], name: info.name, telephone: info.phone, address: { '@type': 'PostalAddress', streetAddress: info.address, postalCode: info.postalCode, addressRegion: H.address.region },
        openingHoursSpecification: groups.map(function (g) { return { '@type': 'OpeningHoursSpecification', dayOfWeek: g.days.map(function (n) { return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][n]; }), opens: g.o, closes: g.c }; }),
        sameAs: [info.naverPlace, info.kakaoChannel, info.blog, info.youtube].filter(Boolean) };
      var field = function (k, label, full) { return '<label class="ad-field"' + (full ? ' style="grid-column:1/-1"' : '') + '><span class="ad-field__label">' + esc(label) + '</span><input class="ad-input" value="' + esc(info[k]) + '" data-input="hp-f" data-k="' + k + '"></label>'; };
      return AA.head({ no: AA.no('hospital'), eyebrow: '사이트 설정', title: '병원 정보',
        lead: '푸터·병원소개·진료시간 페이지와 AI가 읽는 구조화 데이터에 들어가는 병원 기본 정보입니다. 네이버 플레이스와 글자가 다르면 AI 답변이 서로 다른 병원처럼 다룰 수 있어 함께 점검합니다.' }) +
        AA.localNote() +
        '<section class="ad-card ad-sec" aria-labelledby="nap-t"><div class="ad-card__head"><div><h2 class="ad-card__title" id="nap-t">네이버 플레이스와 글자 일치 점검</h2><p class="ad-card__sub">상호명·전화·주소·영업시간을 한 글자까지 맞추면 AI 답변과 지도 검색이 같은 병원으로 묶습니다</p></div>' +
        '<span id="nap-badge" class="ad-badge ' + (diff ? 'ad-badge--flag' : 'ad-badge--done') + '" aria-live="polite">' + (diff ? icon('warn') + '다른 곳 ' + diff + '개' : icon('check') + '모두 일치') + '</span></div>' +
        AA.exampleNote(esc((AA.seed.naverPlaceExample || {}).note || '') + ' 띄어쓰기·하이픈·주소 앞머리(https://, www.) 차이는 같은 것으로 봅니다.') +
        '<div class="ad-table-wrap" style="margin-top:12px"><table class="ad-nap"><colgroup><col class="c-k"><col><col><col class="c-res"></colgroup><thead><tr><th scope="col">항목</th><th scope="col">홈페이지</th><th scope="col">네이버 플레이스(붙여 넣기)</th><th scope="col">결과</th></tr></thead><tbody>' +
        rows.map(function (r) {
          var same = normNap(r[2]) === normNap(r[3]);
          var nRows = r[0] === 'hours' ? 7 : r[0] === 'address' ? 2 : 1;
          return '<tr><th scope="row">' + esc(r[1]) + '</th><td class="v-site">' + esc(r[2]) + '</td><td><label class="ad-sr" for="nv-' + r[0] + '">' + esc(r[1]) + ' 네이버 플레이스 값</label><textarea class="ad-textarea" id="nv-' + r[0] + '" rows="' + nRows + '" data-input="hp-nv" data-k="' + r[0] + '"' + (nRows === 1 ? ' style="resize:none"' : '') + '>' + esc(r[3]) + '</textarea></td>' +
            '<td class="res ' + (same ? 'is-ok' : 'is-diff') + '" id="nr-' + r[0] + '">' + napRes(r) + '</td></tr>';
        }).join('') + '</tbody></table></div><p class="ad-field__hint" style="margin-top:8px"><del style="background:#F6DED7">빨강</del> = 홈페이지에만 있는 글자 · <ins style="background:#E4EFD3;text-decoration:none">초록</ins> = 네이버 플레이스에만 있는 글자</p></section>' +
        '<div class="ad-grid ad-grid--2 ad-sec"><div class="ad-stack"><section class="ad-card"><fieldset class="ad-fieldset"><legend>기본 정보</legend><div class="ad-form-row">' +
        field('name', '병원 이름') + field('nameEn', '영문 이름') + field('phone', '대표전화') + field('postalCode', '우편번호') + field('address', '주소(표시)', true) + field('ceo', '대표자') + field('bizNo', '사업자등록번호') + field('privacyName', '개인정보 보호책임자') + field('privacyPhone', '보호책임자 연락처') +
        '</div></fieldset></section>' +
        '<section class="ad-card"><fieldset class="ad-fieldset"><legend>오시는 길</legend><div class="ad-form-row">' + field('subway', '지하철', true) + field('busCity', '시내버스') + field('busTrunk', '간선버스') + '</div>' +
        '<p class="ad-pv-label">주차장 ' + (H.parking || []).length + '곳</p><ul class="ad-special">' + (H.parking || []).map(function (p) { return '<li><span class="ad-special__d">' + esc(p.code) + '</span><span><b>' + esc(p.name) + '</b><br><span class="t-cell-sm">' + esc(p.address) + '</span></span><span></span></li>'; }).join('') + '</ul>' +
        '<p class="ad-field__hint" style="margin-top:8px">주차 요금·무료 시간은 병원 확인 전이라 사이트에 쓰지 않았습니다.</p></fieldset></section>' +
        '<section class="ad-card"><fieldset class="ad-fieldset"><legend>바깥 링크</legend><div class="ad-form-row">' + field('naverBooking', '네이버 예약 주소', true) + field('naverPlace', '네이버 플레이스 주소', true) + field('kakaoChannel', '카카오톡 채널') + field('blog', '네이버 블로그') + field('youtube', '유튜브', true) + '</div></fieldset></section></div>' +
        '<aside class="ad-stack"><section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:6px">AI가 읽는 병원 정보</h2><p class="ad-field__hint" style="margin-bottom:10px">홈·병원소개·진료시간 페이지에 들어가는 구조화 데이터(Dentist·MedicalClinic)의 핵심 칸입니다.</p><pre class="ad-ld" id="hp-ld" tabindex="0" role="region" aria-label="구조화 데이터 미리보기(JSON-LD)">' + esc(JSON.stringify(ld, null, 2)) + '</pre></section>' +
        '<section class="ad-card"><h2 class="ad-card__title" style="margin-bottom:8px">숫자 표기(병원 안내 기준)</h2><dl class="ad-dl">' +
        [['진료과', H.numbers.departments + '개'], ['치과의사', H.numbers.dentists + '명'], ['보건복지부 인증 전문의', H.numbers.specialists + '명'], ['스태프', H.numbers.staff], ['전용면적', H.numbers.area], ['진료 의자', H.numbers.chairs + '대']].map(function (x) { return '<div><dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') +
        '</dl><p class="ad-field__hint" style="margin-top:8px">숫자는 기준(' + esc((AA.seed.site || {}).basisLabel || '') + ')과 함께 씁니다. 스태프 수는 병원 확인 중입니다.</p></section></aside></div>' +
        '<div class="ad-savebar"><p class="ad-savebar__msg" id="hp-msg">바뀐 내용 없음</p><button class="ad-btn ad-btn--ghost ad-btn--sm" type="button" data-act="hp-reset">' + icon('undo') + '처음 값으로</button><button class="ad-btn ad-btn--ink" type="button" data-act="hp-save">저장</button></div>';
    },
    on: {
      'hp-f': function (el) { hp.work[el.getAttribute('data-k')] = el.value; hpDirty(); hpLd(); if (['name', 'phone', 'address'].indexOf(el.getAttribute('data-k')) > -1) hpNap(); },
      'hp-nv': function (el) { hp.naver[el.getAttribute('data-k')] = el.value; hpDirty(); hpNap(); },
      'hp-save': function () {
        var base = hospBase();
        var info = {}; Object.keys(hp.work).forEach(function (k) { if (hp.work[k] !== base[k]) info[k] = hp.work[k]; });
        AA.store.set(AA.KEYS.hospital, { info: info, naver: hp.naver, updatedAt: new Date().toISOString() });
        AA.toast('병원 정보를 저장했습니다(이 브라우저)');
        var m = d.getElementById('hp-msg'); if (m) { m.textContent = '저장했습니다'; m.classList.remove('is-dirty'); }
      },
      'hp-reset': function () { AA.store.del(AA.KEYS.hospital); hp.work = null; hp.naver = null; AA.toast('처음 값으로 되돌렸습니다'); AA.rerender(); },
    },
  };
  function hpDirty() { var m = d.getElementById('hp-msg'); if (m) { m.textContent = '고친 내용이 있습니다 — 저장하세요'; m.classList.add('is-dirty'); } }
  function napRes(r) {
    if (normNap(r[2]) === normNap(r[3])) return icon('check') + '일치';
    return icon('warn') + '다름<span class="res__d">' + diffHtml(r[2], r[3]) + '</span>' + (r[4] ? '<span class="res__tip">' + esc(r[4]) + '</span>' : '');
  }
  function hpNap() {
    var rows = napRows(hp.work, hp.naver);
    rows.forEach(function (r) {
      var c = d.getElementById('nr-' + r[0]);
      if (!c) return;
      c.className = 'res ' + (normNap(r[2]) === normNap(r[3]) ? 'is-ok' : 'is-diff');
      c.innerHTML = napRes(r);
    });
    var diff = rows.filter(function (r) { return normNap(r[2]) !== normNap(r[3]); }).length;
    var b = d.getElementById('nap-badge');
    if (b) { b.className = 'ad-badge ' + (diff ? 'ad-badge--flag' : 'ad-badge--done'); b.innerHTML = diff ? icon('warn') + '다른 곳 ' + diff + '개' : icon('check') + '모두 일치'; }
  }
  function hpLd() {
    var el = d.getElementById('hp-ld'); if (!el) return;
    try { var o = JSON.parse(el.textContent); o.name = hp.work.name; o.telephone = hp.work.phone; o.address.streetAddress = hp.work.address; o.address.postalCode = hp.work.postalCode; o.sameAs = [hp.work.naverPlace, hp.work.kakaoChannel, hp.work.blog, hp.work.youtube].filter(Boolean); el.textContent = JSON.stringify(o, null, 2); } catch (e) { /* 무시 */ }
  }
})();
