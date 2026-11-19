/* movie.js: Movie night together. Hidden until Chengxuan starts one; she gets a pop-up to join.
   Both screens share: who's here, a synced 3-2-1 "press play" countdown, pause/resume together, the movie clock,
   floating reactions and a little chat. State lives in kiwi/dm → movie. */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, $ = K.$, esc = K.esc;
  if (!DB.user) { location.replace('login.html?next=movie.html'); return; }
  var me = DB.user.role === 'admin' ? 'him' : 'her', other = me === 'him' ? 'her' : 'him';
  var NAME = { him: 'Chengxuan', her: 'Livina' }, AVA = { him: '🥝', her: '🌸' };
  $('#mv-back').href = me === 'him' ? 'admin.html' : 'index.html';
  var stage = $('#mv-stage');

  function mv() { return (DB.dmMeta || {}).movie || {}; }
  function set(p) { return DB.dmMetaSet({ movie: p }); }
  function here(who) { var j = (mv().joined || {})[who]; return j && Date.now() - j < 25000; }
  function elapsed() { var m = mv(); var e = +m.elapsed || 0; if (m.state === 'playing' && m.playAt && Date.now() > m.playAt) e += Date.now() - m.playAt; return e; }
  function clock(ms) { var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), mi = Math.floor(s % 3600 / 60); return (h ? h + ':' + ('0' + mi).slice(-2) : mi) + ':' + ('0' + s % 60).slice(-2); }

  // ---- starting one (him only). Pick from your movie list or type a title.
  function startPicker() {
    var list = (Array.isArray(DB.her.movies) ? DB.her.movies : []).filter(function (x) { return !x.watched; });
    stage.innerHTML = '<div class="mv-card"><div class="mv-big">🍿</div><h2>Start a movie night</h2><p class="muted">She gets a pop-up (and a notification) to join you.</p>' +
      (list.length ? '<div class="mv-pick">' + list.map(function (x) { return '<button type="button" class="btn ghost" data-pick="' + esc(x.title) + '">🎬 ' + esc(x.title) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="row2" style="margin-top:10px"><input class="field" id="mv-title" placeholder="…or type a movie"><button type="button" class="btn pink" id="mv-go">Start 🍿</button></div></div>';
  }
  function start(title) {
    if (!title) return K.toast('Pick or type a movie');
    var j = {}; j[me] = Date.now();
    DB.dmMetaSet({ movie: { active: true, id: 'mv' + Date.now().toString(36), title: title, by: me, startedAt: Date.now(), joined: j, state: 'lobby', playAt: 0, elapsed: 0, reacts: [] } });
    K.confetti({ count: 60 });
  }

  // ---- drawing
  var lastSig = '';
  function draw() {
    var m = mv(), now = Date.now();
    if (!m.active) {
      if (me === 'him') { if (lastSig !== 'pick') { lastSig = 'pick'; startPicker(); } }
      else if (lastSig !== 'none') { lastSig = 'none'; stage.innerHTML = '<div class="mv-card"><div class="mv-big">🍿</div><h2>No movie night right now</h2><p class="muted">When Chengxuan starts one, you\'ll get a pop-up to join 💚</p><a class="btn" href="index.html" style="text-decoration:none">Back home</a></div>'; }
      $('#mv-clock').textContent = ''; return;
    }
    var people = '<div class="mv-people">' + ['him', 'her'].map(function (w) { return '<div class="mv-p' + (here(w) ? ' on' : '') + '"><span>' + AVA[w] + '</span><b>' + NAME[w] + (w === me ? ' (you)' : '') + '</b><small>' + (here(w) ? 'here ✓' : 'waiting…') + '</small></div>'; }).join('<div class="mv-heart">💚</div>') + '</div>';
    var body = '', count = m.playAt ? Math.ceil((m.playAt - now) / 1000) : 0;
    if (m.state === 'lobby' || m.state === 'paused') {
      body = (m.state === 'paused' ? '<p class="mv-state">⏸ Paused at <b>' + clock(m.elapsed) + '</b></p>' : '<p class="mv-state">Get your movie ready at the very start, then press the button together.</p>') +
        '<button type="button" class="btn big pink mv-321" data-act="count">' + (m.state === 'paused' ? '▶ Resume together (3-2-1)' : '▶ Start the 3-2-1 countdown') + '</button>' +
        (!here(other) ? '<p class="help">' + NAME[other] + ' isn\'t here yet. You can still start.</p>' : '');
    } else if (m.state === 'playing' && now < m.playAt) {
      body = '<div class="mv-count">' + Math.max(1, count) + '</div><p class="mv-state">Get your finger on play…</p>';
    } else if (m.state === 'playing' && now - m.playAt < 2500) {
      body = '<div class="mv-count go">▶ PLAY!</div>';
      if (!draw.buzzed || draw.buzzed !== m.playAt) { draw.buzzed = m.playAt; if (navigator.vibrate) try { navigator.vibrate([80, 40, 80]); } catch (x) { /* */ } }
    } else {
      body = '<p class="mv-state">🎬 Watching together · <b class="mv-time">' + clock(elapsed()) + '</b></p><div class="btns" style="justify-content:center"><button type="button" class="btn ghost" data-act="pause">⏸ Pause together</button><button type="button" class="btn ghost" data-act="sync">🔄 Re-sync (3-2-1)</button></div>';
    }
    var sig = JSON.stringify([m.id, m.state, m.playAt, here('him'), here('her'), m.elapsed, m.state === 'playing' ? Math.min(3, Math.max(-1, count)) + (now - m.playAt < 2500) : 0]);
    if (sig !== lastSig) {
      lastSig = sig;
      stage.innerHTML = '<div class="mv-card"><div class="mv-title">' + esc(m.title || 'Movie night') + '</div>' + people + body +
        (me === 'him' ? '<button type="button" class="link-btn" data-act="end" style="margin-top:12px">End movie night</button>' : '') + '</div>';
    } else { var t = stage.querySelector('.mv-time'); if (t) t.textContent = clock(elapsed()); }
    $('#mv-clock').textContent = m.state === 'playing' && now > m.playAt ? clock(elapsed()) : '';
    floatReacts();
  }
  stage.addEventListener('click', function (e) {
    var p = e.target.closest('[data-pick]'); if (p) return start(p.dataset.pick);
    if (e.target.closest('#mv-go')) return start($('#mv-title').value.trim());
    var a = e.target.closest('[data-act]'); if (!a) return;
    var act = a.dataset.act, m = mv();
    if (act === 'count' || act === 'sync') {
      var el = act === 'sync' ? elapsed() : (+m.elapsed || 0);
      set({ state: 'playing', playAt: Date.now() + 2990, elapsed: el });
      if (act === 'sync') K.toast('Pause your movie, wait for the countdown, then press play together');
    }
    if (act === 'pause') { set({ state: 'paused', elapsed: elapsed(), playAt: 0 }); K.toast('⏸ Paused for both of you'); }
    if (act === 'end') {
      K.confirm({ emoji: '🍿', title: 'End movie night?', yes: 'End it' }).then(function (ok) {
        if (!ok) return;
        var title = m.title;
        set({ active: false, endedAt: Date.now() });
        var ms = Array.isArray(DB.her.movies) ? DB.her.movies : [];
        if (ms.some(function (x) { return !x.watched && x.title === title; })) DB.setHer({ movies: ms.map(function (x) { return x.title === title && !x.watched ? Object.assign({}, x, { watched: true, watchedAt: Date.now() }) : x; }) });
        K.toast('Movie night ended 💚');
      });
    }
  });

  // ---- reactions float up on both screens
  var seenRx = {};
  (mv().reacts || []).forEach(function (r) { seenRx[r.id] = 1; });
  $('#mv-reacts').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rx]'); if (!b || !mv().active) return;
    var r = { id: Math.random().toString(36).slice(2, 9), e: b.dataset.rx, who: me, at: Date.now() };
    set({ reacts: (mv().reacts || []).concat([r]).slice(-25) });
  });
  function floatReacts() {
    (mv().reacts || []).forEach(function (r) {
      if (seenRx[r.id]) return; seenRx[r.id] = 1;
      if (Date.now() - r.at > 15000) return;
      var s = document.createElement('span'); s.className = 'mv-float ' + (r.who === me ? 'mine' : 'theirs'); s.textContent = r.e;
      s.style.left = (r.who === me ? 55 + Math.random() * 35 : 10 + Math.random() * 35) + '%';
      $('#mv-fx').appendChild(s); setTimeout(function () { s.remove(); }, 2600);
    });
  }

  // ---- mini chat (the same messages as the real chat)
  var msgs = [];
  DB.dmListen(12, function (l) {
    msgs = l;
    $('#mv-msgs').innerHTML = msgs.slice(-8).map(function (m) {
      return '<div class="mv-m ' + (m.from === me ? 'me' : 'them') + '">' + (m.unsent ? '<i>unsent</i>' : m.audio ? '🎙️ Voice message' : m.img ? '📷 Photo' : esc(m.text)) + '</div>';
    }).join('');
    $('#mv-msgs').scrollTop = 1e6;
  });
  $('#mv-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = $('#mv-text').value.trim(); if (!t) return;
    var m = { id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), from: me, text: t, at: Date.now() };
    DB.dmSend(m); var p = { last: { at: m.at, from: me, text: t } }; DB.dmMetaSet(p, other);
    $('#mv-text').value = '';
  });

  // ---- "I'm here" every 10 s while the page is open
  function beat() { if (!document.hidden && mv().active) { var j = {}; j[me] = Date.now(); set({ joined: j }); } }
  var firstJoin = true;
  DB.subscribe(function () {
    if (firstJoin && mv().active) { firstJoin = false; beat(); if (me === 'her') K.logEvent('🍿', 'Joined movie night: ' + (mv().title || '')); }
    draw();
  });
  setInterval(beat, 10000); setInterval(draw, 250);
  draw();
  // started from the movie list: movie.html#Title
  if (me === 'him' && location.hash.length > 1) { var t0 = decodeURIComponent(location.hash.slice(1)); history.replaceState(null, '', 'movie.html'); setTimeout(function () { if (!mv().active) start(t0); }, 600); }
});
