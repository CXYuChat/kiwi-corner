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
  if (DB.user && $('#msg-form')) {
    var drawMsgs = function () {
      var list = (DB.her.messages || []).slice().reverse();
      $('#msg-list').innerHTML = list.length ? list.map(function (m) {
        return '<div class="bubble-me">' + K.esc(m.text) + '<small>' + K.herDateTime(m.at) + (m.read ? ' · seen ✓' : '') + '</small></div>' +
          (m.reply ? '<div class="bubble-him"><b>Chengxuan 🥝</b>' + K.esc(m.reply) + '</div>' : '');
      }).join('') : '<p class="muted" style="text-align:center">No messages yet 💭</p>';
    };
    drawMsgs(); DB.subscribe(drawMsgs);
    $('#msg-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var t = $('#msg-text').value.trim(); if (!t) return;
      DB.setHer({ messages: (DB.her.messages || []).concat([{ id: Math.random().toString(36).slice(2, 9), text: t, at: Date.now() }]).slice(-200) });
      $('#msg-text').value = '';
      K.confetti({ count: 40 });
    });
  }

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
