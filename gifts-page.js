/* gifts-page.js: points, presents (unlock by points or date), points history. */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, T = window.KiwiTime, DB = window.KiwiDB, $ = K.$, esc = K.esc;

  function pointsCard() {
    var pts = K.balance(), g = K.nextGift();
    $('#pts-big').textContent = pts;
    if (g && g.cost) {
      $('#pts-bar').style.width = Math.min(100, pts / g.cost * 100) + '%';
      $('#pts-next').textContent = pts >= g.cost ? 'You can unlock present #' + g.n + ' now! 🎁' : (g.cost - pts) + ' more points to unlock present #' + g.n + ' 🎁';
    } else if (g) {
      $('#pts-bar').style.width = '0%';
      $('#pts-next').textContent = 'Present #' + g.n + ' unwraps on ' + K.herDateTime(g.at) + ' 🎁';
    } else { $('#pts-bar').style.width = '100%'; $('#pts-next').textContent = 'All presents unlocked! 🎉'; }
    var num = {}; K.gifts().forEach(function (x) { num[x.id] = x.n; });
    var spentRows = Object.keys(DB.her.bought || {}).map(function (id) { return { amt: -DB.her.bought[id], reason: 'Unlocked present #' + (num[id] || '?') + ' 🎁', at: (DB.her.opened || {})[id] || 0 }; });
    var log = K.pointsLog().concat(spentRows).sort(function (a, b) { return a.at - b.at; }).slice(-30).reverse();
    $('#pts-log').innerHTML = log.length ? log.map(function (l) {
      return '<li><span>' + esc(l.reason || 'Because you\'re you') + '<br><small class="muted">' + K.herDateTime(l.at) + '</small></span>' +
        '<span class="amt' + (l.amt < 0 ? ' neg' : '') + '">' + (l.amt > 0 ? '+' : '') + l.amt + ' ⭐</span></li>';
    }).join('') : '<li><span class="muted">No points yet. Chengxuan will be handing them out soon 😉</span></li>';
  }

  function lockText(g) {
    var bits = [];
    if (g.cost) bits.push(g.cost + ' ⭐');
    if (g.at) bits.push(T.fmtDay(g.at, K.HZ));
    return '🔒 ' + (bits.join(' or ') || 'a surprise');
  }
  function giftHTML(g) {
    var st = !g.unlocked ? 'locked' : g.opened ? 'opened' : 'ready', body;
    if (!DB.user) {   // visitors: hints and countdowns only, never what's inside
      return '<div class="gift locked" style="--wrap:' + esc(g.color || '#8EE000') + ';--ribbon:' + esc(g.ribbon || '#7A5230') + '">' +
        '<div class="present"><div class="box"></div><div class="lid"></div><div class="reveal"></div></div><div class="gift-body">' +
        '<p class="gift-hint">' + esc(g.hint || '') + '</p>' + (g.unlocked ? '<div class="lock">💚 Unlocked for Livina</div>' : g.at ? '<div class="gift-count" data-at="' + g.at + '"></div>' : '<div class="lock">🔒 A surprise</div>') + '</div></div>';
    }
    var pts = K.balance();
    if (st === 'locked') {
      body = '<p class="gift-hint">' + esc(g.hint || '') + '</p><div class="lock">' + lockText(g) + '</div>' +
        (g.canBuy ? '<button type="button" class="btn sm" data-buy="' + esc(g.id) + '">Unlock for ' + g.cost + ' ⭐</button>' :
          g.cost ? '<div class="mini-bar"><i style="width:' + Math.min(100, pts / g.cost * 100) + '%"></i></div>' : '') +
        (g.at ? '<div class="gift-count" data-at="' + g.at + '"></div>' : '') +
        (hasKey() ? '<button type="button" class="btn sm key-btn" data-key="' + esc(g.id) + '">🔑 Use Santa\'s Golden Key</button>' : '');
    } else if (st === 'ready') {
      body = '<span class="gift-tap">Tap to unwrap, ' + K.petName() + '! 🎁</span><p class="gift-hint">' + esc(g.hint || '') + '</p>';
    } else {
      body = '<h3>' + esc(g.name) + '</h3><p class="msg">' + esc(g.message || '') + '</p>';
    }
    return '<div class="gift ' + st + '" data-id="' + esc(g.id) + '" style="--wrap:' + esc(g.color || '#8EE000') + ';--ribbon:' + esc(g.ribbon || '#7A5230') + '"' +
      (st === 'ready' ? ' role="button" tabindex="0" aria-label="Unwrap this present"' : '') + '>' +
      '<div class="present"><div class="box"></div><div class="lid"></div><div class="reveal">' + (st === 'locked' ? '' : esc(g.emoji || '🎁')) + '</div></div>' +
      '<div class="gift-body">' + body + '</div></div>';
  }
  var sig = '', busy = false;
  // Christmas theme: presents piled by the fireplace, under the tree
  function scene() {
    var box = $('#xmas-scene'); if (!box) return;
    var th = K.theme ? K.theme() : 'kiwi', html0 = K.giftScene ? K.giftScene(th, []) : '';
    var on = !!html0;
    box.hidden = !on; if (!on) { box.innerHTML = ''; box.dataset.sig = ''; return; }
    var sig = th + JSON.stringify(K.gifts().map(function (g) { return [g.id, g.opened, g.unlocked, g.color, g.ribbon]; }));
    if (box.dataset.sig === sig) return; box.dataset.sig = sig;
    var sound = { christmas: 'fire' }[th];
    box.innerHTML = K.giftScene(th, K.gifts()) + (sound ? '<button type="button" class="scene-sound" data-sound="' + sound + '" aria-label="Play sound">🔊 ' + (sound === 'fire' ? 'Crackling fire' : 'Waves') + '</button>' : '');
  }
  $('#xmas-scene') && $('#xmas-scene').addEventListener('click', function (e) {
    var snd = e.target.closest('[data-sound]');
    if (snd) { var on2 = K.ambient(snd.dataset.sound); snd.classList.toggle('on', on2); snd.textContent = (on2 ? '🔇 Stop' : '🔊 ' + (snd.dataset.sound === 'fire' ? 'Crackling fire' : 'Waves')); return; }
    var b = e.target.closest('[data-gift]'); if (!b) return;
    var el = document.querySelector('.gift[data-id="' + b.dataset.gift + '"]') || $('#gifts');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 1400);
  });
  document.addEventListener('kiwi:theme', function () { var b = $('#xmas-scene'); if (b) b.dataset.sig = ''; scene(); });
  DB.subscribe(scene);
  function render(force) {
    scene();
    var kbn = $('#key-banner'); if (kbn) kbn.hidden = !hasKey();
    if (busy) return;
    var gs = K.gifts();
    var s = JSON.stringify(gs.map(function (g) { return [g.id, g.unlocked, g.opened, g.canBuy, g.name, g.hint, g.cost, g.at, g.color]; })) + K.balance() + hasKey();
    if (!force && s === sig) return;
    sig = s;
    $('#gifts').innerHTML = gs.map(giftHTML).join('');
    tick();
  }
  function hasKey() { var k = DB.her.xmasKey || {}; return DB.user && k.got && !k.used; }
  function tick() {
    document.querySelectorAll('[data-at]').forEach(function (el) { el.textContent = '⏳ ' + T.countdown(+el.dataset.at - T.now()); });
  }
  function unwrap(el) {
    var g = K.gifts().find(function (x) { return x.id === el.dataset.id; });
    if (!DB.user || !g || !el.classList.contains('ready')) return;
    busy = true;
    el.classList.remove('ready'); el.classList.add('opening');
    var r = el.querySelector('.present').getBoundingClientRect();
    setTimeout(function () { K.confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, count: 110 }); }, 250);
    setTimeout(function () {
      el.querySelector('.gift-body').innerHTML = '<h3>' + esc(g.name) + '</h3><p class="msg">' + esc(g.message || '') + '</p>';
      el.classList.remove('opening'); el.classList.add('opened');
      var opened = Object.assign({}, DB.her.opened); opened[g.id] = Date.now();
      busy = false;
      DB.setHer({ opened: opened });
      K.logEvent('🎁', 'Opened present: ' + (g.name || g.id));
    }, 900);
  }
  $('#gifts').addEventListener('click', function (e) {
    var kb = e.target.closest('[data-key]');
    if (kb) {
      var gk = K.gifts().find(function (x) { return x.id === kb.dataset.key; }); if (!gk || !hasKey()) return;
      K.confirm({ emoji: '🔑', title: 'Use Santa\'s Golden Key on present #' + gk.n + '?', text: 'It unlocks this present for free, right now. You only have one key!', yes: 'Use my key 🔑' }).then(function (ok) {
        if (!ok) return;
        DB.setHer({ xmasKey: Object.assign({}, DB.her.xmasKey, { used: gk.id, usedAt: Date.now() }) });
        K.logEvent('🔑', 'Used Santa\'s Golden Key on present #' + gk.n);
        render(true);
        var el3 = document.querySelector('.gift[data-id="' + gk.id + '"]'); if (el3) unwrap(el3);
      });
      return;
    }
    var buy = e.target.closest('[data-buy]');
    if (buy) {
      var g = K.gifts().find(function (x) { return x.id === buy.dataset.buy; });
      if (!g || !g.canBuy) return;
      K.confirm({ emoji: '🎁', title: 'Unlock present #' + g.n + '?', text: 'This spends ' + g.cost + ' ⭐ of your ' + K.balance() + ' points.', yes: 'Spend ' + g.cost + ' ⭐' }).then(function (ok) {
        if (!ok) return;
        var b = Object.assign({}, DB.her.bought); b[g.id] = g.cost;
        DB.setHer({ bought: b });
        K.logEvent('⭐', 'Spent ' + g.cost + ' points to unlock present #' + g.n);
        render(true);
        var el2 = document.querySelector('.gift[data-id="' + g.id + '"]'); if (el2) unwrap(el2);
      });
      return;
    }
    var el = e.target.closest('.gift'); if (el) unwrap(el);
  });
  $('#gifts').addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { var el = e.target.closest('.gift'); if (el) { e.preventDefault(); unwrap(el); } } });

  pointsCard(); render(true);
  DB.subscribe(function () { pointsCard(); render(false); });
  setInterval(function () { render(false); tick(); }, 1000);
});
