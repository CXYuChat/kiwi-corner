/* fun.js: love note jar, miss-you button, catch-the-kiwis game. Counts are shared so Chengxuan can see them. */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, $ = K.$;

  // ---------------------------------------------------------------- love notes
  var mascot = $('#mascot'), bubble = $('#bubble');
  function tap() { K.sayNote(bubble); K.hop(mascot); }
  mascot.addEventListener('click', tap);
  mascot.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });

  K.missButton();

  // ---------------------------------------------------------------- messages for him
  // All messages live in one database record (Firebase caps a record at ~1 MB).
  // If they ever get close, drop the oldest archived ones first, then the oldest overall.
  function fitMessages(list) {
    var LIMIT = 700000;
    list = list.slice();
    while (list.length > 1 && JSON.stringify(list).length > LIMIT) {
      var i = list.findIndex(function (m) { return m.archived || m.reply; });
      list.splice(i === -1 ? 0 : i, 1);
    }
    return list;
  }
  function words(s) { var m = String(s).trim().match(/\S+/g); return m ? m.length : 0; }
  function showCount() {
    var el = $('#msg-count'), t = $('#msg-text'); if (!el || !t) return;
    var w = words(t.value), left = 30000 - t.value.length;
    el.textContent = w ? w + (w === 1 ? ' word' : ' words') + (left < 2000 ? ' · ' + left + ' characters left' : '') : '';
  }
  if ($('#msg-text')) $('#msg-text').addEventListener('input', showCount);

  if (DB.user && $('#msg-form')) {
    // Newest first, grouped by day. Only the latest few are open; older ones fold away.
    var SHOW = 4;
    var drawMsgs = function () {
      var list = (DB.her.messages || []).slice().reverse();
      function one(m) {
        var txt = m.text.length > 700
          ? '<details class="msg-long"><summary><span>' + K.esc(m.text.slice(0, 600)) + '…</span><span class="more">Read all</span></summary>' + K.esc(m.text) + '</details>'
          : K.esc(m.text);
        var state = m.reply ? '💚 replied' : m.read ? 'seen ✓' : 'sent';
        return '<div class="bubble-me">' + txt + '<small>' + window.KiwiTime.fmtTime(m.at, K.HZ) + ' · ' + state + '</small></div>' +
          (m.reply ? '<div class="bubble-him"><b>Chengxuan 🥝</b>' + K.esc(m.reply) + '</div>' : '');
      }
      function group(ms) {
        var out = '', day = '';
        ms.forEach(function (m) {
          var d = K.herDay(m.at);
          if (d !== day) { day = d; out += '<div class="day-sep"><span>' + K.esc(d) + '</span></div>'; }
          out += one(m);
        });
        return out;
      }
      var replies = list.filter(function (m) { return m.reply; }).length;
      $('#msg-stats').textContent = list.length ? list.length + (list.length === 1 ? ' message' : ' messages') + ' sent · ' + replies + ' answered 💚' : '';
      if (!list.length) { $('#msg-list').innerHTML = '<p class="muted" style="text-align:center">No messages yet 💭</p>'; return; }
      var open = $('#msg-older') && $('#msg-older').open;
      $('#msg-list').innerHTML = group(list.slice(0, SHOW)) +
        (list.length > SHOW ? '<details class="older" id="msg-older"' + (open ? ' open' : '') + '><summary>Older messages (' + (list.length - SHOW) + ')</summary>' + group(list.slice(SHOW)) + '</details>' : '');
    };
    drawMsgs(); DB.subscribe(drawMsgs);
    $('#msg-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var t = $('#msg-text').value.trim(); if (!t) return;
      DB.setHer({ messages: fitMessages((DB.her.messages || []).concat([{ id: Math.random().toString(36).slice(2, 9), text: t, at: Date.now() }])) });
      $('#msg-text').value = '';
      showCount();
      K.confetti({ count: 40 });
    });
  }

  // ---------------------------------------------------------------- movies to watch together
  (function () {
    if (!DB.user || !$('#mv-list')) return;
    var SEED = [{ id: 'm10things', title: '10 Things I Hate About You', by: 'admin', at: Date.UTC(2026, 10, 13, 6), watched: false }];
    var view = 'to';
    function movies() { var m = DB.her.movies; return Array.isArray(m) ? m : SEED; }
    function save(list) { return DB.setHer({ movies: list.slice(-300) }); }
    function who(m) { return m.by === 'admin' ? 'Chengxuan' : 'You'; }
    function me() { return DB.user.role === 'admin' ? 'admin' : 'livina'; }
    function draw() {
      var all = movies(), to = all.filter(function (m) { return !m.watched; }), done = all.filter(function (m) { return m.watched; });
      document.querySelectorAll('[data-mvview]').forEach(function (b) {
        var v = b.dataset.mvview; b.setAttribute('aria-pressed', v === view);
        b.textContent = (v === 'to' ? '🎬 To watch' : '✅ Watched') + ' (' + (v === 'to' ? to : done).length + ')';
      });
      $('#mv-pick').hidden = view !== 'to' || to.length < 2;
      var list = view === 'to' ? to.slice().reverse() : done.slice().sort(function (a, b) { return (b.watchedAt || 0) - (a.watchedAt || 0); });
      $('#mv-list').innerHTML = list.length ? list.map(function (m) {
        return '<li class="mv-item' + (m.watched ? ' done' : '') + '" data-mvid="' + K.esc(m.id) + '">' +
          '<button type="button" class="mv-check" data-mvtoggle="' + K.esc(m.id) + '" aria-label="' + (m.watched ? 'Mark as not watched' : 'Mark as watched') + '">' + (m.watched ? '✓' : '') + '</button>' +
          '<span class="mv-body"><b>' + K.esc(m.title) + '</b><small>' + (m.watched ? 'Watched ' + K.herDay(m.watchedAt || m.at) : 'Added by ' + who(m) + ' · ' + K.herDay(m.at)) + '</small></span>' +
          '<button type="button" class="mv-del" data-mvdel="' + K.esc(m.id) + '" aria-label="Remove">✕</button></li>';
      }).join('') : '<li class="muted mv-empty">' + (view === 'to' ? 'Nothing on the list yet. Add one! 🍿' : 'No movie nights yet 🥺') + '</li>';
    }
    $('#mv-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var t = $('#mv-title').value.trim(); if (!t) return;
      if (movies().some(function (m) { return !m.watched && m.title.toLowerCase() === t.toLowerCase(); })) { K.toast('That one\'s already on the list 🍿'); return; }
      save(movies().concat([{ id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title: t, by: me(), at: Date.now(), watched: false }]));
      $('#mv-title').value = ''; view = 'to'; draw();
      K.toast('Added to the list 🍿');
    });
    document.addEventListener('click', function (e) {
      var v = e.target.closest('[data-mvview]'), tg = e.target.closest('[data-mvtoggle]'), dl = e.target.closest('[data-mvdel]');
      if (v) { view = v.dataset.mvview; draw(); return; }
      if (tg) {
        var id = tg.dataset.mvtoggle, r = tg.getBoundingClientRect(), nowWatched = false;
        save(movies().map(function (m) {
          if (m.id !== id) return m;
          var y = Object.assign({}, m); y.watched = !m.watched; nowWatched = y.watched; if (y.watched) y.watchedAt = Date.now(); else delete y.watchedAt; return y;
        }));
        if (nowWatched) { K.confetti({ x: r.left + r.width / 2, y: r.top, count: 50 }); K.toast('Movie night ✓ 💚'); }
        return;
      }
      if (dl) {
        var m0 = movies().find(function (m) { return m.id === dl.dataset.mvdel; }); if (!m0) return;
        K.confirm({ emoji: '🍿', title: 'Remove "' + m0.title + '"?', yes: 'Remove', danger: true }).then(function (ok) {
          if (ok) save(movies().filter(function (m) { return m.id !== m0.id; }));
        });
      }
    });
    $('#mv-pick').addEventListener('click', function () {
      var to = movies().filter(function (m) { return !m.watched; }); if (!to.length) return;
      var pick = to[Math.floor(Math.random() * to.length)];
      K.modal('<div class="em">🎲🍿</div><h3>Tonight\'s movie:</h3><p class="desc" style="font-size:1.25rem;font-weight:600;color:var(--brown)">' + K.esc(pick.title) + '</p><p class="muted">Grab snacks and call him 📞💚</p>', 'call');
      K.confetti({ count: 70 });
    });
    draw(); DB.subscribe(draw);
  })();

  // ---------------------------------------------------------------- catch the kiwis
  var cv = $('#game'), ctx = cv.getContext('2d'), overlay = $('#game-overlay');
  var W = 300, H = 380, DURATION = 30;
  var items = [], pops = [], bx = 150, score = 0, left = DURATION, running = false, last = 0, spawnT = 0, keys = {};
  function best() { return DB.her.gameBest || 0; }
  function showBest() { $('#best').textContent = best(); }
  showBest(); DB.subscribe(showBest);
  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth || 300; H = cv.clientHeight || 380;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bx = Math.min(Math.max(bx, 40), W - 40);
    if (!running) draw();
  }
  function bw() { return Math.max(76, Math.min(120, W * 0.24)); }
  function by() { return H - 40; }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    var slice = K.sliceCanvas(false), gold = K.sliceCanvas(true);
    items.forEach(function (it) {
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
      ctx.drawImage(it.gold ? gold : slice, -it.r, -it.r, it.r * 2, it.r * 2); ctx.restore();
    });
    var w = bw(), y = by();
    ctx.fillStyle = '#7A5230'; ctx.beginPath(); ctx.ellipse(bx, y, w / 2, 30, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#5a3b20'; ctx.beginPath(); ctx.ellipse(bx, y, w / 2, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#B5E26B'; ctx.beginPath(); ctx.ellipse(bx, y, w / 2 - 5, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1410';
    [[-0.25, 12], [0.05, 18], [0.3, 11]].forEach(function (s) { ctx.beginPath(); ctx.ellipse(bx + s[0] * w, y + s[1], 2, 3.5, 0, 0, Math.PI * 2); ctx.fill(); });
    pops.forEach(function (p) {
      ctx.globalAlpha = 1 - p.t / 0.8; ctx.fillStyle = p.gold ? '#c99700' : '#5f9a00';
      ctx.font = '600 22px Fredoka, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.txt, p.x, p.y - p.t * 50); ctx.globalAlpha = 1;
    });
  }
  function loop(t) {
    var dt = Math.max(0, Math.min(50, t - last)) / 1000; last = t;
    if (running) {
      left -= dt;
      if (keys.ArrowLeft) bx -= 420 * dt;
      if (keys.ArrowRight) bx += 420 * dt;
      bx = Math.min(Math.max(bx, bw() / 2), W - bw() / 2);
      var prog = 1 - left / DURATION;
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = 0.7 - prog * 0.38 + Math.random() * 0.2;
        var r = 17 + Math.random() * 6;
        items.push({ x: r + Math.random() * (W - 2 * r), y: -r, vy: 130 + prog * 190 + Math.random() * 60, r: r, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 4, gold: Math.random() < 0.1 });
      }
      var y = by(), half = bw() / 2;
      items.forEach(function (it) {
        it.y += it.vy * dt; it.rot += it.vr * dt;
        if (!it.done && it.y + it.r * 0.5 >= y - 8 && it.y - it.r < y + 10 && Math.abs(it.x - bx) < half + it.r * 0.3) {
          it.done = true; var pts = it.gold ? 3 : 1; score += pts;
          pops.push({ x: it.x, y: y - 24, t: 0, txt: '+' + pts, gold: it.gold });
        }
      });
      items = items.filter(function (it) { return !it.done && it.y < H + 40; });
      $('#score').textContent = score; $('#timer').textContent = Math.ceil(Math.max(left, 0));
      if (left <= 0) end();
    }
    pops.forEach(function (p) { p.t += dt; });
    pops = pops.filter(function (p) { return p.t < 0.8; });
    draw();
    if (running || pops.length) requestAnimationFrame(loop);
  }
  function start() {
    items = []; pops = []; score = 0; left = DURATION; spawnT = 0; running = true; last = performance.now();
    overlay.classList.remove('show'); $('#score').textContent = 0;
    requestAnimationFrame(loop);
  }
  function end() {
    running = false; items = [];
    var msg;
    if (score === 0) msg = 'Oops, the kiwis escaped! Try again? 🥲';
    else if (score < 10) msg = 'Cute start! The kiwis believe in you 🥝';
    else if (score < 25) msg = 'Kiwi catcher in training! 💪';
    else if (score < 40) msg = 'Wow! Professional kiwi catcher 🏆';
    else msg = 'Kiwi QUEEN 👑🥝 He\'s so proud of you';
    if (DB.user && score > best()) { DB.setHer({ gameBest: score }); msg = '🎉 New high score! ' + msg; K.confetti({ count: 80 }); }
    $('#game-score').hidden = false; $('#game-score').textContent = score + ' 🥝';
    $('#game-msg').textContent = msg;
    $('#game-start').textContent = 'Play again 🥝';
    overlay.classList.add('show');
  }
  function move(e) { var r = cv.getBoundingClientRect(); bx = e.clientX - r.left; if (!running) draw(); }
  cv.addEventListener('pointerdown', move);
  cv.addEventListener('pointermove', function (e) { if (running && (e.pointerType === 'mouse' || e.buttons || e.pressure)) move(e); });
  window.addEventListener('keydown', function (e) { if (running && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { keys[e.key] = true; e.preventDefault(); } });
  window.addEventListener('keyup', function (e) { keys[e.key] = false; });
  $('#game-start').addEventListener('click', start);
  window.addEventListener('resize', size);
  size();
});
