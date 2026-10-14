/* 관리자 데모 — SVG 차트(일별 막대 · 가로 막대 · 추세선 · 100% 누적 막대 · 작은 추세선)
   - 차트 칸의 실제 폭으로 그려 글자 크기가 그대로다(창 크기가 바뀌면 다시 그림).
   - 차트 하나가 Tab 한 번: 화살표로 막대·점을 옮기면 툴팁과 화면 낭독기 안내가 따라간다. 마우스는 가장 가까운 항목.
   - 값은 툴팁에만 숨기지 않는다: 강조한 막대·끝점은 직접 표시하고, 모든 값은 '표로 보기'에 있다.
   - 색: 잉크 한 색(--viz-1) + 강조 하나(--viz-accent). 순서가 있는 단계는 잉크 4단계(--ord-1~4, 검증 통과). */
(function () {
  'use strict';
  var w = window;
  var d = document;
  var AA = w.AA = w.AA || {};
  var esc = function (s) { return AA.esc(s); };
  var css = function (name, fb) { var v = getComputedStyle(d.documentElement).getPropertyValue(name); return (v && v.trim()) || fb; };
  var C = {};
  function colors() {
    C = {
      v1: css('--viz-1', '#2D4155'), accent: css('--viz-accent', '#0A78B0'), muted: css('--viz-muted', '#B4BCC6'),
      ord: [css('--ord-1', '#9AA6B4'), css('--ord-2', '#6A7C92'), css('--ord-3', '#40556D'), css('--ord-4', '#132538')],
      surface: css('--sheet', '#FCFAF6'), ink: css('--ink', '#132538'),
      fs: parseFloat(css('--fs-xs', '13.5')) || 13.5, // 차트 글자 크기(PC 13.5px · 1099px 이하 14px) — 글자 폭 어림에도 쓴다
    };
  }
  var seq = 0;
  var specs = {};
  var mounted = [];

  // 깔끔한 눈금
  function nice(max, count) {
    if (!(max > 0)) return { max: 1, step: 1 };
    var raw = max / (count || 4);
    var p = Math.pow(10, Math.floor(Math.log10(raw)));
    var f = raw / p;
    var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
    if (step < 1 && max >= 1) step = 1;
    return { max: Math.ceil(max / step) * step, step: step };
  }
  var fmtN = function (v) { return (Math.round(v * 10) / 10).toLocaleString('ko-KR'); };
  // 위쪽만 둥근 막대(바닥은 각지게)
  function colPath(x, y, wd, h) {
    if (h <= 0) return '';
    var r = Math.min(4, wd / 2, h);
    return 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + wd - r) + 'Q' + (x + wd) + ' ' + y + ' ' + (x + wd) + ' ' + (y + r) + 'V' + (y + h) + 'Z';
  }
  // 오른쪽만 둥근 가로 막대
  function barPath(x, y, wd, h) {
    if (wd <= 0) return '';
    var r = Math.min(4, h / 2, wd);
    return 'M' + x + ' ' + y + 'H' + (x + wd - r) + 'Q' + (x + wd) + ' ' + y + ' ' + (x + wd) + ' ' + (y + r) + 'V' + (y + h - r) + 'Q' + (x + wd) + ' ' + (y + h) + ' ' + (x + wd - r) + ' ' + (y + h) + 'H' + x + 'Z';
  }
  var textW = function (s, px) { // 대략 글자 폭(한글 ≈ 0.95em, 그 밖 ≈ 0.56em)
    var n = 0; String(s || '').split('').forEach(function (ch) { n += /[ㄱ-힝]/.test(ch) ? 0.95 : /[0-9.,%·]/.test(ch) ? 0.58 : 0.6; });
    return n * (px || C.fs || 13.5);
  };

  // ── 종류별 그리기: (spec, width) → { svg, marks:[{x,y,tip,label}] } ───────────────────────
  var TYPES = {};

  /** 일별 세로 막대. spec: { data:[{label, value, tip}], height, unit, hot:'last'|index[], valueLabel:'hot'|'max'|'none', ariaLabel } */
  TYPES.columns = function (s, W) {
    var data = s.data || [];
    var H = s.height || 180;
    var m = { l: 34, r: 8, t: 20, b: 28 };
    var pw = Math.max(10, W - m.l - m.r);
    var ph = H - m.t - m.b;
    var max = Math.max.apply(null, data.map(function (x) { return x.value; }).concat([0]));
    var sc = nice(max, s.ticks || 3);
    var band = pw / Math.max(1, data.length);
    var bw = Math.max(2, Math.min(24, band * 0.64, band - 2));
    var hot = s.hot === 'last' ? [data.length - 1] : Array.isArray(s.hot) ? s.hot : [];
    var parts = [];
    for (var v = 0; v <= sc.max + 1e-9; v += sc.step) {
      var y = m.t + ph - (v / sc.max) * ph;
      parts.push('<line class="' + (v === 0 ? 'axis' : 'grid') + '" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>');
      parts.push('<text x="' + (m.l - 8) + '" y="' + (y + 4.5).toFixed(1) + '" text-anchor="end">' + fmtN(v) + '</text>');
    }
    var every = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(pw / 46))));
    var marks = [];
    var bars = [];
    var labels = [];
    data.forEach(function (x, i) {
      var cx = m.l + band * i + band / 2;
      var h = sc.max ? (x.value / sc.max) * ph : 0;
      var y0 = m.t + ph - h;
      var isHot = hot.indexOf(i) > -1;
      bars.push('<path class="m" data-i="' + i + '" fill="' + (isHot ? C.accent : C.v1) + '" d="' + colPath(+(cx - bw / 2).toFixed(1), +y0.toFixed(1), +bw.toFixed(1), +h.toFixed(1)) + '"/>');
      var showX = (data.length - 1 - i) % every === 0;
      if (showX) labels.push('<text x="' + cx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle"' + (isHot ? ' class="t-strong"' : '') + '>' + esc(x.label) + '</text>');
      var showV = s.valueLabel === 'all' || (s.valueLabel !== 'none' && isHot);
      if (showV && x.value > 0) labels.push('<text class="t-value" x="' + cx.toFixed(1) + '" y="' + (y0 - 6).toFixed(1) + '" text-anchor="middle">' + fmtN(x.value) + '</text>');
      marks.push({ x: cx, y: y0, tip: x.tip || [x.label, fmtN(x.value) + (s.unit || '')], hit: { x: m.l + band * i, y: m.t, w: band, h: ph } });
    });
    return { h: H, svg: parts.join('') + bars.join('') + labels.join(''), marks: marks };
  };

  /** 가로 막대. spec: { data:[{label, value, color, hot, tip, valueText}], max, unit, rowH, labelW } */
  TYPES.hbars = function (s, W) {
    var data = s.data || [];
    var rowH = s.rowH || 34;
    var thick = Math.min(16, rowH - 14);
    var maxLabel = Math.max.apply(null, data.map(function (x) { return textW(x.label, 14); }).concat([40]));
    var narrow = W < 420 || maxLabel + 14 > W * 0.42; // 이름이 길면 막대 위로 올린다(왼쪽으로 잘리지 않게)
    var lw = narrow ? 0 : Math.min(Math.round(W * 0.42), Math.ceil(maxLabel) + 14, s.labelW || 999);
    var vw = Math.ceil(Math.max.apply(null, data.map(function (x) { return textW(x.valueText != null ? x.valueText : fmtN(x.value) + (s.unit || ''), 14); }).concat([24]))) + 14;
    var rh = narrow ? rowH + 18 : rowH;
    var H = data.length * rh + 6;
    var pw = Math.max(20, W - lw - vw);
    var max = s.max || Math.max.apply(null, data.map(function (x) { return x.value; }).concat([1]));
    var parts = [];
    var marks = [];
    data.forEach(function (x, i) {
      var y = i * rh;
      var by = y + (narrow ? 20 : (rh - thick) / 2);
      var wd = max ? (x.value / max) * pw : 0;
      var col = x.color || (x.hot ? C.accent : C.v1);
      var ly = narrow ? y + 14 : y + rh / 2 + 5;
      parts.push('<text x="' + (narrow ? 0 : lw - 12) + '" y="' + ly.toFixed(1) + '" text-anchor="' + (narrow ? 'start' : 'end') + '" class="' + (x.hot ? 't-strong' : '') + '">' + esc(x.label) + '</text>');
      parts.push('<line class="grid" x1="' + lw + '" x2="' + (lw + pw) + '" y1="' + (by + thick / 2).toFixed(1) + '" y2="' + (by + thick / 2).toFixed(1) + '"/>');
      parts.push('<path class="m" data-i="' + i + '" fill="' + col + '" d="' + barPath(lw, +by.toFixed(1), Math.max(x.value > 0 ? 2 : 0, +wd.toFixed(1)), thick) + '"/>');
      parts.push('<text class="t-value" x="' + (lw + wd + 8).toFixed(1) + '" y="' + (by + thick / 2 + 5).toFixed(1) + '">' + esc(x.valueText != null ? x.valueText : fmtN(x.value) + (s.unit || '')) + '</text>');
      marks.push({ x: lw + wd, y: by, tip: x.tip || [x.label, (x.valueText != null ? x.valueText : fmtN(x.value) + (s.unit || ''))], hit: { x: 0, y: y, w: W, h: rh } });
    });
    return { h: H, svg: parts.join(''), marks: marks };
  };

  /** 추세선(한 줄). spec: { data:[{label, value, tip}], height, yMax, unit, ticks } */
  TYPES.line = function (s, W) {
    var data = s.data || [];
    var H = s.height || 170;
    var m = { l: 34, r: 40, t: 18, b: 28 };
    var pw = Math.max(10, W - m.l - m.r);
    var ph = H - m.t - m.b;
    var max = s.yMax || Math.max.apply(null, data.map(function (x) { return x.value; }).concat([1]));
    var sc = s.yMax ? { max: s.yMax, step: s.yStep || s.yMax / 4 } : nice(max, s.ticks || 3);
    var parts = [];
    for (var v = 0; v <= sc.max + 1e-9; v += sc.step) {
      var gy = m.t + ph - (v / sc.max) * ph;
      parts.push('<line class="' + (v === 0 ? 'axis' : 'grid') + '" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + gy.toFixed(1) + '" y2="' + gy.toFixed(1) + '"/>');
      parts.push('<text x="' + (m.l - 8) + '" y="' + (gy + 4.5).toFixed(1) + '" text-anchor="end">' + fmtN(v) + '</text>');
    }
    var n = data.length;
    var px = function (i) { return m.l + (n <= 1 ? pw / 2 : (pw * i) / (n - 1)); };
    var py = function (val) { return m.t + ph - (val / sc.max) * ph; };
    var pts = data.map(function (x, i) { return [px(i), py(x.value)]; });
    if (pts.length) {
      var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join('');
      parts.push('<path d="' + line + 'L' + pts[n - 1][0].toFixed(1) + ' ' + (m.t + ph) + 'L' + pts[0][0].toFixed(1) + ' ' + (m.t + ph) + 'Z" fill="' + C.v1 + '" fill-opacity=".1"/>');
      parts.push('<path d="' + line + '" fill="none" stroke="' + C.v1 + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>');
    }
    var every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(pw / 52))));
    var marks = [];
    data.forEach(function (x, i) {
      if ((n - 1 - i) % every === 0 || i === 0) parts.push('<text x="' + px(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(x.label) + '</text>');
      marks.push({ x: px(i), y: py(x.value), tip: x.tip || [x.label, fmtN(x.value) + (s.unit || '')], hit: { x: px(i) - (pw / Math.max(1, n - 1)) / 2, y: m.t, w: pw / Math.max(1, n - 1), h: ph } });
    });
    if (n) {
      var e = pts[n - 1];
      parts.push('<circle class="m" data-i="' + (n - 1) + '" cx="' + e[0].toFixed(1) + '" cy="' + e[1].toFixed(1) + '" r="5" fill="' + C.v1 + '" stroke="' + C.surface + '" stroke-width="2"/>');
      parts.push('<text class="t-value" x="' + (e[0] + 10).toFixed(1) + '" y="' + (e[1] + 5).toFixed(1) + '">' + fmtN(data[n - 1].value) + (s.unit || '') + '</text>');
    }
    parts.push('<line class="cross" data-cross x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ph) + '" visibility="hidden"/>');
    parts.push('<circle data-dot r="5" cx="0" cy="0" fill="' + C.v1 + '" stroke="' + C.surface + '" stroke-width="2" visibility="hidden"/>');
    return { h: H, svg: parts.join(''), marks: marks, cross: true };
  };

  /** 100% 누적 가로 막대(순서 있는 단계). spec: { rows:[{label, parts:[...]}], colors, names, totalUnit } */
  TYPES.stack = function (s, W) {
    var rows = s.rows || [];
    var cols = s.colors || C.ord;
    var maxLabel = Math.max.apply(null, rows.map(function (x) { return textW(x.label, 14); }).concat([30]));
    var narrow = W < 460 || maxLabel + 14 > W * 0.4;
    var lw = narrow ? 0 : Math.min(Math.round(W * 0.38), Math.ceil(maxLabel) + 14);
    var tw = 52;
    var rowH = narrow ? 56 : 38;
    var thick = 20;
    var pw = Math.max(20, W - lw - tw);
    var parts = [];
    var marks = [];
    rows.forEach(function (r, i) {
      var y = i * rowH;
      var by = narrow ? y + 24 : y + (rowH - thick) / 2;
      var total = AA.sum(r.parts);
      parts.push('<text x="' + (narrow ? 0 : lw - 12) + '" y="' + (narrow ? y + 16 : y + rowH / 2 + 5) + '" text-anchor="' + (narrow ? 'start' : 'end') + '">' + esc(r.label) + '</text>');
      var x = lw;
      var tip = [r.label + ' · ' + fmtN(total) + (s.totalUnit || '')];
      r.parts.forEach(function (v, k) {
        var wd = total ? (v / total) * pw : 0;
        var gap = k > 0 && wd > 0 ? 2 : 0;
        if (wd - gap > 0) {
          parts.push('<rect class="m" data-i="' + i + '" x="' + (x + gap).toFixed(1) + '" y="' + by + '" width="' + Math.max(0, wd - gap).toFixed(1) + '" height="' + thick + '" fill="' + cols[k] + '"/>');
          var pct = total ? Math.round((v / total) * 100) : 0;
          var label = pct + '%';
          if (wd - gap > textW(label) + 10) parts.push('<text x="' + (x + gap + (wd - gap) / 2).toFixed(1) + '" y="' + (by + thick / 2 + 5) + '" text-anchor="middle" class="' + (k >= 2 ? 't-on' : 't-strong') + '">' + label + '</text>');
        }
        tip.push((s.names ? s.names[k] : '') + ' ' + fmtN(v) + (s.totalUnit || '') + ' (' + (total ? Math.round((v / total) * 100) : 0) + '%)');
        x += wd;
      });
      parts.push('<text class="t-value" x="' + (W - 2) + '" y="' + (by + thick / 2 + 5) + '" text-anchor="end">' + fmtN(total) + '</text>');
      marks.push({ x: lw + pw / 2, y: by, tip: tip, hit: { x: 0, y: y, w: W, h: rowH } });
    });
    return { h: rows.length * rowH + 4, svg: parts.join(''), marks: marks };
  };

  /** 작은 추세선(핵심 숫자 판). spec: { data:[n], height } — 마지막 점만 강조 */
  TYPES.spark = function (s, W) {
    var data = s.data || [];
    var H = s.height || 34;
    var max = Math.max.apply(null, data.concat([1]));
    var n = data.length;
    var px = function (i) { return 3 + (n <= 1 ? 0 : ((W - 8) * i) / (n - 1)); };
    var py = function (v) { return 3 + (H - 8) - (v / max) * (H - 8); };
    var col = s.onInk ? 'rgba(243,239,230,.7)' : C.muted;
    var line = data.map(function (v, i) { return (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(v).toFixed(1); }).join('');
    var lc = s.onInk ? '#F3EFE6' : C.accent;
    var svg = '<path d="' + line + '" fill="none" stroke="' + col + '" stroke-width="1.5" stroke-linejoin="round"/>' +
      (n ? '<circle cx="' + px(n - 1).toFixed(1) + '" cy="' + py(data[n - 1]).toFixed(1) + '" r="3.5" fill="' + lc + '" stroke="' + (s.onInk ? '#132538' : C.surface) + '" stroke-width="2"/>' : '');
    return { h: H, svg: svg, marks: [], decorative: true };
  };

  // ── 툴팁·키보드 ─────────────────────────────────────────────────────────────
  function tipEl() { return d.getElementById('ad-tip'); }
  function showTip(svg, mark) {
    var el = tipEl();
    if (!el || !mark) return;
    el.textContent = '';
    var t = mark.tip || [];
    var head = d.createElement('span'); head.className = 'ad-tip__t'; head.textContent = t[0] || ''; el.appendChild(head);
    t.slice(1).forEach(function (row, k) {
      var r = d.createElement('span'); r.className = 'ad-tip__row';
      if (k === 0) { var key = d.createElement('span'); key.className = 'ad-tip__key'; r.appendChild(key); }
      var v = d.createElement('span'); v.className = k === 0 ? 'ad-tip__v' : ''; v.textContent = row; r.appendChild(v);
      el.appendChild(r);
    });
    el.hidden = false;
    var b = svg.getBoundingClientRect();
    var x = b.left + mark.x;
    var y = b.top + mark.y;
    var tw = el.offsetWidth; var th = el.offsetHeight;
    var left = Math.min(w.innerWidth - tw - 8, Math.max(8, x - tw / 2));
    var top = y - th - 12;
    if (top < 8) top = y + 16;
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }
  function hideTip() { var el = tipEl(); if (el) el.hidden = true; }
  function setHot(svg, i, mk) {
    svg.classList.toggle('is-dim', i != null);
    Array.prototype.forEach.call(svg.querySelectorAll('.m'), function (p) { p.classList.toggle('is-hot', i != null && +p.getAttribute('data-i') === i); });
    var cross = svg.querySelector('[data-cross]');
    var dot = svg.querySelector('[data-dot]');
    if (cross && dot) {
      if (i == null || !mk) { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); }
      else {
        cross.setAttribute('x1', mk.x); cross.setAttribute('x2', mk.x); cross.setAttribute('visibility', 'visible');
        dot.setAttribute('cx', mk.x); dot.setAttribute('cy', mk.y); dot.setAttribute('visibility', 'visible');
      }
    }
  }
  function bind(el, svg, res, spec) {
    var marks = res.marks || [];
    if (!marks.length || res.decorative) return;
    var cur = null;
    var pick = function (i, announce) {
      if (i == null || i < 0 || i >= marks.length) { cur = null; setHot(svg, null); hideTip(); return; }
      cur = i;
      setHot(svg, i, marks[i]);
      showTip(svg, marks[i]);
      if (announce) AA.say((marks[i].tip || []).join(', '));
    };
    var horizontal = spec.type === 'hbars' || spec.type === 'stack';
    svg.addEventListener('pointermove', function (e) {
      var b = svg.getBoundingClientRect();
      var x = e.clientX - b.left; var y = e.clientY - b.top;
      var best = null;
      for (var i = 0; i < marks.length; i++) {
        var h = marks[i].hit;
        if (h && x >= h.x && x <= h.x + h.w && y >= h.y - 4 && y <= h.y + h.h + 4) { best = i; break; }
      }
      if (best === null && !horizontal) { // 가장 가까운 x
        var dmin = 1e9;
        marks.forEach(function (mk, i) { var dd = Math.abs(mk.x - x); if (dd < dmin) { dmin = dd; best = i; } });
      }
      if (best !== cur) pick(best);
    });
    svg.addEventListener('pointerleave', function () { pick(null); });
    svg.addEventListener('focus', function () { pick(cur == null ? (horizontal ? 0 : marks.length - 1) : cur, true); });
    svg.addEventListener('blur', function () { pick(null); });
    svg.addEventListener('keydown', function (e) {
      var k = e.key;
      var next = cur == null ? 0 : cur;
      if (k === 'ArrowRight' || k === 'ArrowDown') next = Math.min(marks.length - 1, next + 1);
      else if (k === 'ArrowLeft' || k === 'ArrowUp') next = Math.max(0, next - 1);
      else if (k === 'Home') next = 0;
      else if (k === 'End') next = marks.length - 1;
      else if (k === 'Escape') { pick(null); return; }
      else return;
      e.preventDefault();
      pick(next, true);
    });
  }
  function draw(el) {
    var id = el.getAttribute('data-chart');
    var spec = specs[id];
    if (!spec || !TYPES[spec.type]) return;
    var W = Math.max(120, Math.round(el.clientWidth || el.getBoundingClientRect().width || 600));
    el.setAttribute('data-w', W);
    var res = TYPES[spec.type](spec, W);
    var label = spec.ariaLabel || spec.title || '차트';
    var interactive = !res.decorative && (res.marks || []).length;
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + res.h + '" width="' + W + '" height="' + res.h + '"' +
      (interactive ? ' role="group" tabindex="0" aria-label="' + esc(label + ' — 화살표 키로 값을 하나씩 볼 수 있습니다') + '"' : ' aria-hidden="true" focusable="false"') + '>' + res.svg + '</svg>';
    var svg = el.querySelector('svg');
    if (interactive) bind(el, svg, res, spec);
  }

  // ── 내보내기 ─────────────────────────────────────────────────────────────────
  AA.chart = {
    reset: function () { specs = {}; mounted = []; hideTip(); colors(); },
    /** 자리표시자 HTML. spec.type = columns|hbars|line|stack|spark */
    html: function (spec) {
      if (!C.v1) colors();
      var id = 'ch' + (++seq);
      specs[id] = spec;
      return '<div class="ad-chart" data-chart="' + id + '"' + (spec.minH ? ' style="min-height:' + spec.minH + 'px"' : '') + '></div>';
    },
    mountAll: function (root) {
      colors();
      Array.prototype.forEach.call((root || d).querySelectorAll('[data-chart]'), function (el) {
        draw(el);
        if (mounted.indexOf(el) < 0) mounted.push(el);
      });
    },
    /** 범례. items: [{label, color, line}] */
    legend: function (items) {
      return '<p class="ad-legend">' + items.map(function (x) {
        return '<span class="ad-legend__i"><span class="' + (x.line ? 'ad-legend__line' : 'ad-legend__sw') + '" style="background:' + esc(x.color) + '" aria-hidden="true"></span>' + esc(x.label) + '</span>';
      }).join('') + '</p>';
    },
    /** 표로 보기. head: ['날짜','신청'], rows: [['10.1', '3건']], numCols: [1] */
    table: function (caption, head, rows, numCols) {
      numCols = numCols || [];
      return '<details class="ad-tbl"><summary>표로 보기</summary><div class="ad-tbl-wrap"><table><caption class="ad-sr">' + esc(caption) + '</caption><thead><tr>' +
        head.map(function (h, i) { return '<th scope="col"' + (numCols.indexOf(i) > -1 ? ' class="num"' : '') + '>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return i === 0 ? '<th scope="row">' + esc(c) + '</th>' : '<td' + (numCols.indexOf(i) > -1 ? ' class="num"' : '') + '>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div></details>';
    },
    colors: function () { if (!C.v1) colors(); return C; },
  };
  var rt = 0;
  w.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      mounted = mounted.filter(function (el) { return d.body.contains(el); });
      mounted.forEach(function (el) { var W = Math.round(el.clientWidth); if (String(W) !== el.getAttribute('data-w')) draw(el); });
    }, 160);
  });
  w.addEventListener('scroll', function () { var t = tipEl(); if (t && !t.hidden) hideTip(); }, { passive: true });
})();
