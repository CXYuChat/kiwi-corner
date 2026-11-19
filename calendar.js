/* calendar.js: our shared calendar. Plans for her, for him, or both — with times shown in Barcelona AND Singapore.
   Stored in her record: her.cal = [{ id, date, time, zone, title, emoji, who, by, at }]. */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, T = window.KiwiTime, $ = K.$, esc = K.esc;
  if (!DB.user) return;
  var me = DB.user.role === 'admin' ? 'him' : 'her';
  var MYZ = me === 'him' ? 'Asia/Singapore' : 'Europe/Madrid', OTHERZ = me === 'him' ? 'Europe/Madrid' : 'Asia/Singapore';
  var ZNAME = { 'Europe/Madrid': 'Barcelona', 'Asia/Singapore': 'Singapore' };
  var today = T.dayKey(Date.now(), MYZ), view = today.slice(0, 7), sel = today, editing = null;
  $('#cf-zone').textContent = ZNAME[MYZ] + ' time';

  function evs() { return (DB.her.cal || []).slice(); }
  function epoch(e) { try { return e.time ? T.parse(e.date + 'T' + e.time, e.zone) : null; } catch (x) { return null; } }
  // the day an event falls on in MY time zone (a 9pm Barcelona plan can be tomorrow morning in Singapore)
  function myDay(e) { var t = epoch(e); return t ? T.dayKey(t, MYZ) : e.date; }
  function when(e) {
    var t = epoch(e); if (!t) return 'All day';
    var a = T.fmtTime(t, MYZ) + ' ' + ZNAME[MYZ], bDay = T.dayKey(t, OTHERZ) !== T.dayKey(t, MYZ) ? ' (' + T.fmtDay(t, OTHERZ).split(' ')[0] + ')' : '';
    return a + ' · ' + T.fmtTime(t, OTHERZ) + bDay + ' ' + ZNAME[OTHERZ];
  }
  function niceDay(k) { var p = k.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); }
  function row(e) {
    return '<div class="cal-ev ' + esc(e.who || 'both') + '"><span class="em">' + esc(e.emoji || '📌') + '</span><div><b>' + esc(e.title) + '</b><small>' + esc(when(e)) + ' · ' + ({ her: 'Livina', him: 'Chengxuan', both: 'Both of us' }[e.who] || '') + '</small></div>' +
      '<button type="button" class="link-btn" data-cedit="' + esc(e.id) + '">edit</button><button type="button" class="link-btn" data-cdel="' + esc(e.id) + '">✕</button></div>';
  }
  function draw() {
    var p = view.split('-').map(Number), first = new Date(Date.UTC(p[0], p[1] - 1, 1)), days = new Date(Date.UTC(p[0], p[1], 0)).getUTCDate(), lead = (first.getUTCDay() + 6) % 7;
    $('#cal-title').textContent = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    var byDay = {}; evs().forEach(function (e) { var d = myDay(e); (byDay[d] = byDay[d] || []).push(e); });
    var cells = ''; for (var i = 0; i < lead; i++) cells += '<span></span>';
    for (var d = 1; d <= days; d++) {
      var k = view + '-' + ('0' + d).slice(-2), list = byDay[k] || [];
      cells += '<button type="button" class="cal-d' + (k === today ? ' today' : '') + (k === sel ? ' sel' : '') + '" data-day="' + k + '"><b>' + d + '</b><span class="dots">' + list.slice(0, 4).map(function (e) { return '<i class="' + esc(e.who || 'both') + '"></i>'; }).join('') + '</span></button>';
    }
    $('#cal-grid').innerHTML = cells;
    var dl = (byDay[sel] || []).sort(function (a, b) { return (epoch(a) || 0) - (epoch(b) || 0); });
    $('#cal-day-title').textContent = sel === today ? 'Today' : niceDay(sel);
    $('#cal-day').innerHTML = dl.length ? dl.map(row).join('') : '<p class="muted" style="margin:0">Nothing planned. Tap ＋ Add.</p>';
    var now = Date.now(), up = evs().filter(function (e) { var t = epoch(e); return t ? t > now - 3600e3 : myDay(e) >= today; })
      .sort(function (a, b) { return (epoch(a) || T.parse(myDay(a) + 'T00:00', MYZ)) - (epoch(b) || T.parse(myDay(b) + 'T00:00', MYZ)); }).slice(0, 8);
    $('#cal-next-list').innerHTML = up.length ? up.map(function (e) { return '<div class="cal-up"><span class="cal-up-d">' + esc(myDay(e) === today ? 'Today' : niceDay(myDay(e)).split(',')[0] + ' ' + myDay(e).slice(8)) + '</span>' + row(e) + '</div>'; }).join('') : '<p class="muted" style="margin:0">No plans yet</p>';
  }
  $('#cal-prev').addEventListener('click', function () { var p = view.split('-').map(Number); view = new Date(Date.UTC(p[0], p[1] - 2, 1)).toISOString().slice(0, 7); draw(); });
  $('#cal-next').addEventListener('click', function () { var p = view.split('-').map(Number); view = new Date(Date.UTC(p[0], p[1], 1)).toISOString().slice(0, 7); draw(); });
  $('#cal-grid').addEventListener('click', function (e) { var b = e.target.closest('[data-day]'); if (b) { sel = b.dataset.day; draw(); } });
  function openForm(ev) {
    editing = ev || null; $('#cal-form').hidden = false;
    var t = ev && epoch(ev);
    $('#cf-date').value = ev ? (t ? T.dayKey(t, MYZ) : ev.date) : sel;
    $('#cf-time').value = t ? (function () { var p = T.parts(t, MYZ); return ('0' + p.h).slice(-2) + ':' + ('0' + p.mi).slice(-2); })() : '';
    $('#cf-emoji').value = ev ? ev.emoji || '📌' : '📌'; $('#cf-who').value = ev ? ev.who || 'both' : (me === 'him' ? 'him' : 'her');
    $('#cf-title').value = ev ? ev.title : '';
    $('#cal-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  $('#cal-add-btn').addEventListener('click', function () { openForm(null); });
  $('#cf-cancel').addEventListener('click', function () { $('#cal-form').hidden = true; });
  $('#cf-save').addEventListener('click', function () {
    var title = $('#cf-title').value.trim(), date = $('#cf-date').value; if (!title || !date) return K.toast('Add a date and what it is');
    var e = Object.assign({}, editing || { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), by: me, at: Date.now() },
      { date: date, time: $('#cf-time').value || '', zone: MYZ, title: title, emoji: $('#cf-emoji').value.trim() || '📌', who: $('#cf-who').value });
    var list = evs().filter(function (x) { return x.id !== e.id; }).concat([e]).slice(-400);
    DB.setHer({ cal: list }); $('#cal-form').hidden = true; sel = myDay(e); view = sel.slice(0, 7);
    K.toast('Saved 🗓️'); if (me === 'her') K.logEvent('🗓️', 'Added to our calendar: ' + title + ' (' + date + ')');
  });
  document.addEventListener('click', function (e) {
    var ed = e.target.closest('[data-cedit]'), dl = e.target.closest('[data-cdel]');
    if (ed) openForm(evs().find(function (x) { return x.id === ed.dataset.cedit; }));
    if (dl) K.confirm({ emoji: '🗑️', title: 'Delete this plan?', yes: 'Delete', danger: true }).then(function (ok) { if (ok) DB.setHer({ cal: evs().filter(function (x) { return x.id !== dl.dataset.cdel; }) }); });
  });
  DB.subscribe(draw); draw();
});
