/* schedule-page.js: live status, featured countdown, clocks and the interactive calendar (Livina's POV). */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, T = window.KiwiTime, S = window.SCHEDULE, DB = window.KiwiDB;
  var M = K.model;
  var HZ = S.livina.zone, MZ = S.zone, HOUR = T.HOUR;
  var $ = function (s) { return document.querySelector(s); };
  var esc = K.esc;

  var state = { mode: 'her', expandAll: false, expanded: new Set(), day: null };
  function zone() { return state.mode === 'her' ? HZ : MZ; }

  $('#mode-me').textContent = "🥝 His time (" + S.city + ')';

  // ---------------------------------------------------------------- mascot
  var mascot = $('#status-mascot');
  function tapMascot() { K.sayNote($('#bubble')); K.hop(mascot); }
  mascot.addEventListener('click', tapMascot);
  mascot.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapMascot(); } });

  // ---------------------------------------------------------------- status card
  function renderStatus() {
    var r = K.status(), now = T.now();
    $('#status-card').className = 'card status-card ' + r.cls;
    $('#status-head').textContent = r.head;
    $('#status-sub').textContent = r.sub;
    var c = $('#status-chip'); c.hidden = !r.chip; c.textContent = r.chip; c.className = 'chip ' + r.chipCls;
    mascot.classList.toggle('mun', r.mun);
    if (r.bothFree) {   // confetti once per both-free window
      var w = M.windows.find(function (x) { return x.start <= now && now < x.end; });
      if (w && K.store.get('kiwi-celebrated') !== String(w.start)) {
        K.store.set('kiwi-celebrated', String(w.start));
        setTimeout(function () { K.confetti(); }, 600);
      }
    }
  }

  // ---------------------------------------------------------------- clocks (no seconds)
  function renderTicks() {
    var now = T.now(), loc = M.locationAt(now);
    $('#clock-her').textContent = T.fmtTime(now, HZ);
    $('#clock-her-day').textContent = T.fmtDay(now, HZ);
    $('#clock-me-label').textContent = "Chengxuan's time (" + loc.city + ')';
    $('#clock-me').textContent = T.fmtTime(now, loc.zone);
    $('#clock-me-day').textContent = T.fmtDay(now, loc.zone);
  }

  // ---------------------------------------------------------------- calendar
  var H = 48;
  var grid = $('#cal-grid'), scroller = $('#cal-scroll');
  var leafById = {}, groupById = {};
  M.me.concat(M.her).forEach(function (g) { groupById[g.id] = g; leafById[g.id] = g; g.children.forEach(function (c) { leafById[c.id] = c; }); });

  function dayList() {
    var Z = zone();
    var first = Math.min.apply(null, M.me.map(function (g) { return g.start; }));
    var last = Math.max.apply(null, M.me.map(function (g) { return g.end; }));
    var out = [];
    for (var d = T.startOfDay(first, Z); d < last; d = T.addDays(d, 1, Z)) out.push(d);
    return out;
  }
  function pickDay(prevKey) {
    var Z = zone(), days = dayList(), now = T.now();
    if (prevKey) { var m = days.find(function (d) { return T.dayKey(d, Z) === prevKey; }); if (m) return m; }
    var today = days.find(function (d) { return now >= d && now < T.addDays(d, 1, Z); });
    if (today) return today;
    return now < days[0] ? days[0] : days[days.length - 1];
  }

  function renderDays() {
    var Z = zone(), todayKey = T.dayKey(T.now(), Z);
    $('#days').innerHTML = dayList().map(function (d) {
      var k = T.dayKey(d, Z), mid = d + 12 * HOUR, label = T.fmtDayShort(mid, Z).split(' ');
      return '<button type="button" data-day="' + d + '" aria-pressed="' + (d === state.day) + '"><small>' + label[0] + '</small><b>' + label[1] + '</b>' +
        (k === todayKey ? '<span class="today-dot" title="today"></span>' : '') + '</button>';
    }).join('');
    var sel = $('#days [aria-pressed="true"]');
    if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function range(s, e, Z, est) {
    var t = (est ? '~' : '') + T.fmtTime(s, Z) + ' – ' + T.fmtTime(e, Z);
    return t.replace(/ (AM|PM) – (.+) \1$/, ' – $2 $1');
  }
  function sizeCls(h) { return h < 30 ? ' tiny' : h < 62 ? ' small' : ''; }

  function blockHTML(x, top, height, extraCls, i, off, ds, de, Z, isKid) {
    var cls = 'blk ' + extraCls + (x.estimated ? ' est' : '') + sizeCls(height) +
      (x.start < ds ? ' cont-top' : '') + (x.end > de ? ' cont-bottom' : '');
    var style = 'top:' + top + 'px;height:' + height + 'px' + (isKid ? ';--i:' + i + ';--off:' + off + 'px' : '');
    return '<button type="button" class="' + cls + '" style="' + style + '" data-leaf="' + esc(x.id) + '">' +
      '<span class="t">' + esc(x.emoji) + ' ' + esc(x.title) + '</span>' +
      '<span class="tm">' + (x.start < ds ? '↑ ' : '') + range(x.start, x.end, Z, x.estimated) + (x.end > de ? ' ↓' : '') + '</span></button>';
  }

  function groupHTML(g, ds, de, Z) {
    var y = function (t) { return (t - ds) / HOUR * H; };
    var s = Math.max(g.start, ds), e = Math.min(g.end, de);
    var top = y(s), h = y(e) - top;
    if (!g.children.length) {
      return '<div class="grp ' + g.who + '" style="top:' + top + 'px;height:' + h + 'px">' +
        blockHTML(g, 0, h, 'solo ' + g.status, 0, 0, ds, de, Z).replace('</button>', '<span class="hint">' + esc(g.desc) + '</span></button>') + '</div>';
    }
    var open = state.expandAll || state.expanded.has(g.id);
    var face = '<button type="button" class="blk face' + (g.estimated ? ' est' : '') + sizeCls(h) + (g.start < ds ? ' cont-top' : '') + (g.end > de ? ' cont-bottom' : '') +
      '" style="top:0;height:100%" data-group="' + esc(g.id) + '" aria-expanded="' + open + '">' +
      '<span class="t">' + esc(g.title) + '</span>' +
      '<span class="tm">' + (g.start < ds ? '↑ ' : '') + range(g.start, g.end, Z, g.estimated) + (g.end > de ? ' ↓' : '') + '</span>' +
      '<span class="hint">tap to peek inside ✨</span>' +
      (h > 80 ? '<span class="big-emoji">' + esc(g.emoji) + '</span>' : '') + '</button>';
    var kids = '', i = 0;
    g.children.forEach(function (c) {
      var cs = Math.max(c.start, ds), ce = Math.min(c.end, de);
      if (ce <= cs) return;
      var kt = y(cs) - top, kh = y(ce) - y(cs);
      kids += blockHTML(c, kt + 1, Math.max(kh - 2, 14), 'kid ' + c.status, i++, kt, ds, de, Z, true);
    });
    return '<div class="grp ' + g.who + (open ? ' expanded' : '') + '" data-gid="' + esc(g.id) + '" style="top:' + top + 'px;height:' + h + 'px">' +
      face + kids + '<button type="button" class="collapse" data-collapse="' + esc(g.id) + '" aria-label="Back to simple view">✕</button></div>';
  }

  function renderCal(scrollMode) {
    var Z = zone(), ds = state.day, de = T.addDays(ds, 1, Z);
    var hours = Math.round((de - ds) / HOUR);
    var y = function (t) { return (t - ds) / HOUR * H; };
    var inDay = function (g) { return g.end > ds && g.start < de; };

    var labels = '';
    for (var i = 1; i < hours; i++) labels += '<div class="hour-label" style="top:' + (i * H) + 'px">' + T.fmtHour(ds + i * HOUR, Z) + '</div>';

    var me = M.me.filter(inDay).map(function (g) { return groupHTML(g, ds, de, Z); }).join('');
    var her = M.her.filter(inDay).map(function (g) { return groupHTML(g, ds, de, Z); }).join('');
    if (!me) me = '<div class="empty-note" style="top:' + (hours * H / 2) + 'px">nothing planned 🌙</div>';
    if (!her) her = '<div class="empty-note" style="top:' + (9 * H) + 'px">no school! 🎉</div>';

    var now = T.now();
    var bands = M.windows.map(function (w, idx) {
      if (!(w.end > ds && w.start < de)) return '';
      var s = Math.max(w.start, ds), e = Math.min(w.end, de), h = y(e) - y(s);
      var live = w.start <= now && now < w.end;
      return '<button type="button" class="band' + (live ? ' live' : '') + '" data-band="' + idx + '" style="top:' + (y(s) + 1) + 'px;height:' + (h - 2) + 'px">' +
        (h >= 24 ? '<span><b>💚 both free' + (h >= 90 ? ' · ' + T.dur(w.end - w.start) : '') + '</b></span>' : '') + '</button>';
    }).join('');

    var nowLine = (now >= ds && now < de) ? '<div class="now-line" id="now-line" style="top:' + y(now) + 'px"></div>' : '';

    grid.style.height = (hours * H) + 'px';
    grid.innerHTML = '<div class="hours">' + labels + '</div><div class="lane me">' + me + '</div><div class="lane her">' + her + '</div>' +
      '<div class="band-layer">' + bands + '</div>' + nowLine;
    updateBackbar();

    if (scrollMode) {
      var target;
      if (now >= ds && now < de) {
        target = y(now) - 120;
        // keep the top (title) of the block we're in visible when it fits on screen
        var cur = M.me.concat(M.her).filter(function (g) { return g.start <= now && now < g.end && g.start >= ds; })
          .map(function (g) { return y(g.start); });
        var view = scroller.clientHeight || 500;
        cur.forEach(function (top) { if (top - 20 < target && y(now) - top < view - 120) target = top - 20; });
      } else {
        var firsts = M.me.filter(inDay).map(function (g) { return Math.max(g.start, ds); });
        target = firsts.length ? y(Math.min.apply(null, firsts)) - 60 : 7 * H;
      }
      scroller.scrollTo({ top: Math.max(0, target), behavior: scrollMode === 'smooth' ? 'smooth' : 'auto' });
    }
  }

  function moveNowLine() {
    var el = $('#now-line'), Z = zone(), ds = state.day, de = T.addDays(ds, 1, Z), now = T.now();
    var shouldShow = now >= ds && now < de;
    if (!!el !== shouldShow) return renderCal(false);
    if (el) el.style.top = ((now - ds) / HOUR * H) + 'px';
  }

  function setExpanded(gid, open) {
    if (open) state.expanded.add(gid); else state.expanded.delete(gid);
    var el = grid.querySelector('[data-gid="' + gid + '"]');
    if (el) { el.classList.toggle('expanded', open); el.querySelector('.face').setAttribute('aria-expanded', open); }
    updateBackbar();
  }
  function collapseAll() {
    state.expanded.clear(); state.expandAll = false; syncViewButtons();
    grid.querySelectorAll('.grp.expanded').forEach(function (el) { el.classList.remove('expanded'); });
    updateBackbar();
  }
  function updateBackbar() { $('#backbar').classList.toggle('show', !!grid.querySelector('.grp.expanded')); }
  function syncViewButtons() {
    document.querySelectorAll('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', String((b.dataset.view === 'all') === state.expandAll)); });
  }

  grid.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-collapse]'))) {
      var gid = t.dataset.collapse;
      if (state.expandAll) { state.expandAll = false; syncViewButtons(); grid.querySelectorAll('.grp.expanded').forEach(function (el) { if (el.dataset.gid !== gid) state.expanded.add(el.dataset.gid); }); }
      setExpanded(gid, false); return;
    }
    if ((t = e.target.closest('[data-group]'))) { setExpanded(t.dataset.group, true); return; }
    if ((t = e.target.closest('[data-leaf]'))) { openLeaf(leafById[t.dataset.leaf]); return; }
    if ((t = e.target.closest('[data-band]'))) { openBand(M.windows[+t.dataset.band]); }
  });
  $('#backbar').addEventListener('click', collapseAll);

  $('#days').addEventListener('click', function (e) {
    var b = e.target.closest('[data-day]'); if (!b) return;
    state.day = +b.dataset.day; renderDays(); renderCal('smooth');
  });
  document.querySelectorAll('[data-mode]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (state.mode === b.dataset.mode) return;
      var prevKey = T.dayKey(state.day, zone());
      state.mode = b.dataset.mode;
      document.querySelectorAll('[data-mode]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      state.day = pickDay(prevKey); renderDays(); renderCal('smooth');
    });
  });
  document.querySelectorAll('[data-view]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.view === 'all') {
        state.expandAll = true; syncViewButtons();
        grid.querySelectorAll('.grp[data-gid]').forEach(function (el) { el.classList.add('expanded'); });
        updateBackbar();
      } else collapseAll();
    });
  });

  // ---------------------------------------------------------------- detail cards
  function bothZones(s, e, est) {
    var t = est ? '~' : '';
    function line(z) {
      var sameDay = T.dayKey(s, z) === T.dayKey(e, z);
      return T.fmtDay(s, z) + ', ' + t + T.fmtTime(s, z) + ' – ' + (sameDay ? '' : T.fmtDay(e, z) + ', ') + t + T.fmtTime(e, z);
    }
    return '<div class="times"><div><b>🌸 My time (' + esc(S.livina.city) + ')</b>' + line(HZ) + '</div>' +
      '<div><b>🥝 Chengxuan\'s time (' + esc(S.city) + ')</b>' + line(MZ) + '</div></div>';
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !K.isModalOpen() && grid.querySelector('.grp.expanded')) collapseAll(); });

  var CAN = {
    busy: ['busy', "Can't text: he'll reply after 💭"],
    text: ['text', 'Yes, text him! 💬'],
    free: ['free', 'Free: text or call him! 💚'],
    unknown: ['busy', 'Schedule coming soon 🥝']
  };
  function openLeaf(x) {
    if (!x) return;
    var can = x.who === 'her' ? ['busy', "You're busy here. He'll wait for you 💗"] : CAN[x.status] || CAN.busy;
    K.modal('<div class="em">' + esc(x.emoji || '🥝') + '</div><h3>' + esc(x.title) + '</h3>' +
      (x.desc ? '<p class="desc">' + esc(x.desc) + '</p>' : '') +
      bothZones(x.start, x.end, x.estimated) +
      '<span class="can ' + can[0] + '">' + can[1] + '</span>' +
      (x.estimated ? '<p class="est-note">〰️ These times are an estimate.</p>' : ''), '');
  }
  function openBand(w) {
    if (!w) return;
    var sh = K.modal('<div class="em">💚📞</div><h3>You can call! 💚</h3>' +
      '<p class="desc">You\'re both free for <b>' + T.dur(w.end - w.start) + '</b>.</p>' +
      bothZones(w.start, w.end, false) + '<div class="band-cd"></div>', 'call', function () {
      var el = sh && sh.querySelector('.band-cd'); if (!el) return;
      var now = T.now();
      if (now < w.start) el.innerHTML = '<div class="muted">Starts in</div><div class="cd-big">' + T.countdown(w.start - now) + '</div>';
      else if (now < w.end) el.innerHTML = '<div class="muted">Happening now! Time left</div><div class="cd-big">' + T.countdown(w.end - now) + '</div>';
      else el.innerHTML = '<div class="muted">This one\'s in the past. Hope you called 🥰</div>';
    });
  }

  // ---------------------------------------------------------------- boot
  K.bigCountdown($('#big-cd'));
  state.day = pickDay();
  renderDays(); renderCal(true); renderStatus(); renderTicks();
  DB.subscribe(renderStatus);
  setInterval(renderTicks, 15000);
  setInterval(function () { renderStatus(); moveNowLine(); }, 20000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { renderStatus(); renderTicks(); moveNowLine(); } });
});
