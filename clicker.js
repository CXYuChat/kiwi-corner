/* clicker.js: Kiwi Clicker. Tap the kiwi, buy helpers that grow kiwis for you, unlock upgrades.
   Progress is saved on this device every few seconds and to the cloud (so it follows her between phone and laptop).
   Chengxuan can see it and send kiwis or boosts from the admin page. */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, $ = K.$, esc = K.esc;
  if (!DB.user || !$('#ck-kiwi')) return;
  var isHer = DB.user.role === 'livina';

  // ---------------------------------------------------------------- game data
  var HELPERS = [
    { id: 'bird', em: '🐦', name: 'Baby kiwi bird', cost: 15, kps: 0.1, desc: 'Pecks out a kiwi now and then' },
    { id: 'tree', em: '🌳', name: 'Kiwi tree', cost: 100, kps: 1, desc: 'Grows kiwis all day long' },
    { id: 'farm', em: '🚜', name: 'Kiwi farm', cost: 1100, kps: 8, desc: 'A whole field of kiwis' },
    { id: 'bakery', em: '🧁', name: 'Kiwi bakery', cost: 12000, kps: 47, desc: 'Kiwi tarts, kiwi cakes, kiwi everything' },
    { id: 'factory', em: '🏭', name: 'Kiwi factory', cost: 130000, kps: 260, desc: 'Mass-produced cuteness' },
    { id: 'island', em: '🏝️', name: 'Kiwi island', cost: 1.4e6, kps: 1400, desc: 'An island where only kiwis live' },
    { id: 'rocket', em: '🚀', name: 'Kiwi rocket', cost: 2e7, kps: 7800, desc: 'Brings kiwis back from space' },
    { id: 'portal', em: '🌀', name: 'Kiwi portal', cost: 3.3e8, kps: 44000, desc: 'Opens a door to the kiwi dimension' },
    { id: 'love', em: '💚', name: 'Chengxuan\'s love', cost: 5.1e9, kps: 260000, desc: 'Infinite. Makes kiwis out of nothing' }
  ];
  var UPGRADES = [
    { id: 'c1', em: '👆', name: 'Stronger finger', cost: 100, desc: 'Taps give 2× kiwis', click: 2 },
    { id: 'c2', em: '🧤', name: 'Kiwi gloves', cost: 600, desc: 'Taps give 2× kiwis', click: 2, req: { up: 'c1' } },
    { id: 'c3', em: '✨', name: 'Golden touch', cost: 12000, desc: 'Taps give 2× kiwis', click: 2, req: { up: 'c2' } },
    { id: 'c4', em: '💋', name: 'Love taps', cost: 60000, desc: 'Each tap also gives 2% of your kiwis per second', clickPct: 0.02, req: { up: 'c3' } },
    { id: 'c5', em: '💞', name: 'Super love taps', cost: 6e6, desc: 'Each tap gives another 4% of your kiwis per second', clickPct: 0.04, req: { up: 'c4' } },
    { id: 'g1', em: '🧃', name: 'Kiwi juice', cost: 15000, desc: 'All helpers +10%', all: 1.1, req: { total: 5000 } },
    { id: 'g2', em: '🥤', name: 'Kiwi smoothie', cost: 1.5e6, desc: 'All helpers +25%', all: 1.25, req: { total: 5e5 } },
    { id: 'g3', em: '😘', name: 'Kiwi kisses', cost: 1.5e8, desc: 'All helpers +50%', all: 1.5, req: { total: 5e7 } },
    { id: 'g4', em: '💍', name: 'Kiwi forever', cost: 1.5e10, desc: 'All helpers ×2', all: 2, req: { total: 5e9 } },
    { id: 'lk', em: '🍀', name: 'Lucky kiwis', cost: 77777, desc: 'Golden kiwis show up twice as often', luck: 2, req: { golden: 3 } }
  ];
  // Every helper gets three ×2 upgrades: at 1, 10 and 25 owned.
  HELPERS.forEach(function (h) {
    [[1, 10, ''], [10, 50, ' II'], [25, 500, ' III']].forEach(function (t, i) {
      UPGRADES.push({ id: h.id + (i + 1), em: h.em, name: 'Happier ' + h.name.toLowerCase() + t[2], cost: h.cost * t[1], desc: h.name + 's make 2× kiwis', helper: h.id, mult: 2, req: { own: [h.id, t[0]] } });
    });
  });
  var MILESTONES = [
    [100, 'Your first 100 kiwis! 🥝 He\'s proud of you already'],
    [1000, '1,000 kiwis! Kiwi farmer in training 👩‍🌾'],
    [10000, '10K kiwis! Chengxuan would like one please 🥺'],
    [100000, '100K kiwis!! Kiwi tycoon 💼🥝'],
    [1e6, 'A MILLION kiwis 😱 He loves you a million times more'],
    [1e7, '10 million kiwis! Kiwi empress 👑'],
    [1e8, '100 million kiwis. The kiwi birds are starting a fan club 🐦'],
    [1e9, 'A BILLION kiwis 🌍 You own every kiwi on Earth'],
    [1e10, '10 billion! Even the moon is made of kiwi now 🌕'],
    [1e12, 'A trillion kiwis. You win the universe 💚🌌']
  ];

  // ---------------------------------------------------------------- save / load
  var LS = 'kiwi-clicker';
  // gifts sent before she started (or before a reset) don't count
  function blank() { return { k: 0, total: 0, clicks: 0, owned: {}, up: {}, golden: 0, gifts: (DB.state.clickerGifts || []).concat(K.scheduledKiwis()).map(function (g) { return g.id; }), ms: 0, savedAt: 0, started: Date.now() }; }
  function norm(c) { var b = blank(); if (c) Object.keys(c).forEach(function (x) { if (c[x] !== undefined) b[x] = c[x]; }); return b; }
  var local = null; try { local = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { /* */ }
  var cloud = DB.live && DB.live.clicker;
  var c = norm((cloud && (!local || (cloud.savedAt || 0) > (local.savedAt || 0))) ? cloud : local);
  if (!isHer) c = norm(cloud);   // Chengxuan just watches her game (his taps don't count)

  var dirty = false, lastCloud = 0;
  function saveLocal() { if (!isHer) return; c.savedAt = Date.now(); try { localStorage.setItem(LS, JSON.stringify(c)); } catch (e) { /* */ } }
  function saveCloud(force) {
    if (!isHer) return;
    if (!force && (!dirty || Date.now() - lastCloud < 30000)) return;
    dirty = false; lastCloud = Date.now(); saveLocal();
    var snap = JSON.parse(JSON.stringify(c)); snap.kps = kps(); snap.perTap = perTap();
    DB.setLive({ clicker: snap }).catch(function (e) { console.warn(e); dirty = true; });
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveCloud(true); });
  window.addEventListener('pagehide', function () { saveCloud(true); });

  // Admin resets her game
  function checkReset() {
    var r = DB.state.clickerReset || 0;
    if (isHer && r && (c.started || 0) < r) { c = blank(); c.started = Date.now(); saveCloud(true); K.toast('Your kiwi farm got a fresh start 🌱'); draw(true); }
  }

  // ---------------------------------------------------------------- math
  function owned(id) { return c.owned[id] || 0; }
  function has(id) { return !!c.up[id]; }
  function costOf(h, n) { var o = owned(h.id), r = 1.15; return Math.ceil(h.cost * Math.pow(r, o) * (Math.pow(r, n) - 1) / (r - 1)); }
  var frenzyUntil = 0, frenzyMult = 1;
  function boost() { var b = DB.state.clickerBoost; return b && b.until > Date.now() ? Math.max(1, +b.mult || 1) : 1; }
  function helperKps(h) {
    var m = 1; UPGRADES.forEach(function (u) { if (has(u.id) && u.helper === h.id) m *= u.mult; });
    return h.kps * m;
  }
  function allMult() { var m = 1; UPGRADES.forEach(function (u) { if (has(u.id) && u.all) m *= u.all; }); return m; }
  function kps() {
    var s = 0; HELPERS.forEach(function (h) { s += helperKps(h) * owned(h.id); });
    return s * allMult() * boost() * (Date.now() < frenzyUntil ? frenzyMult : 1);
  }
  function perTap() {
    var m = 1, pct = 0; UPGRADES.forEach(function (u) { if (has(u.id)) { if (u.click) m *= u.click; if (u.clickPct) pct += u.clickPct; } });
    return m * boost() + kps() * pct;
  }
  function earn(n) { c.k += n; if (n > 0) c.total += n; dirty = true; }
  function fmt(n, dec) {
    n = Math.max(0, n || 0);
    if (n < 1000) return dec && n < 100 && n % 1 ? n.toFixed(1) : Math.floor(n).toLocaleString('en-US');
    var u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx'], i = -1;
    while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i];
  }
  K.fmtKiwis = fmt;

  // ---------------------------------------------------------------- offline earnings + gifts from him
  if (isHer && c.savedAt) {
    var away = Math.min(Date.now() - c.savedAt, 12 * 3600e3) / 1000, made = kps() * away * 0.5;
    if (made >= 1 && away > 60) {
      earn(made);
      K.queueModal('<div class="em">🐦💤</div><h3>Welcome back!</h3><p class="desc">While you were away, your helpers grew <b>' + fmt(made) + ' kiwis</b> 🥝</p>', 'call');
    }
  }
  function applyGifts() {
    if (!isHer) return;
    (DB.state.clickerGifts || []).filter(function (g) { return !g.at || g.at <= Date.now(); }).concat(K.scheduledKiwis()).forEach(function (g) {
      if (c.gifts.indexOf(g.id) !== -1) return;
      c.gifts.push(g.id); c.gifts = c.gifts.slice(-100);
      var amt = +g.amount || 0; c.k = Math.max(0, c.k + amt); if (amt > 0) c.total += amt;
      saveCloud(true);
      K.queueModal('<div class="em">' + (amt >= 0 ? '🎁🥝' : '🙈') + '</div><h3>' + (amt >= 0 ? 'Chengxuan sent you ' + fmt(amt) + ' kiwis!' : 'Chengxuan took ' + fmt(-amt) + ' kiwis 😝') + '</h3>' +
        (g.note ? '<p class="desc">"' + esc(g.note) + '"</p>' : ''), 'call', function () { if (amt > 0) K.confetti({ count: 100 }); });
      K.logEvent && K.logEvent('🎁', 'Got your ' + fmt(amt) + ' clicker kiwis');
      draw(true);
    });
  }

  // ---------------------------------------------------------------- tapping
  var kiwiBtn = $('#ck-kiwi'), fx = $('#ck-fx');
  kiwiBtn.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (!isHer) { K.toast('This is her game 🥝 You\'re just watching'); return; }
    var n = perTap(); earn(n); c.clicks++;
    kiwiBtn.classList.remove('pop'); void kiwiBtn.offsetWidth; kiwiBtn.classList.add('pop');
    var r = kiwiBtn.parentNode.getBoundingClientRect(), f = document.createElement('span');
    f.className = 'ck-float'; f.textContent = '+' + fmt(n, true);
    f.style.left = (e.clientX - r.left) + 'px'; f.style.top = (e.clientY - r.top) + 'px';
    fx.appendChild(f); setTimeout(function () { f.remove(); }, 900);
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (x) { /* */ }
    draw();
  });
  kiwiBtn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kiwiBtn.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0 })); } });

  // ---------------------------------------------------------------- golden kiwi
  var gold = $('#ck-golden'), goldTimer = null;
  function scheduleGold() {
    var luck = has('lk') ? 2 : 1;
    goldTimer = setTimeout(showGold, (60 + Math.random() * 120) * 1000 / luck);
  }
  function showGold() {
    if (document.hidden || !isHer) return scheduleGold();
    gold.style.left = (10 + Math.random() * 70) + '%'; gold.style.top = (10 + Math.random() * 60) + '%';
    gold.hidden = false; gold.classList.add('show');
    setTimeout(function () { gold.hidden = true; gold.classList.remove('show'); }, 12000);
    scheduleGold();
  }
  gold.addEventListener('click', function () {
    gold.hidden = true; c.golden++;
    if (Math.random() < 0.5) {
      frenzyMult = 7; frenzyUntil = Date.now() + 30000;
      K.toast('✨ Kiwi frenzy! 7× kiwis for 30 seconds');
    } else {
      var bonus = Math.max(13, Math.min(c.k * 0.15, kps() * 900) + 13);
      earn(bonus); K.toast('🍀 Lucky! +' + fmt(bonus) + ' kiwis');
    }
    var r = gold.getBoundingClientRect(); K.confetti({ x: r.left + 20, y: r.top + 20, count: 40 });
    dirty = true; draw(true);
  });
  scheduleGold();

  // ---------------------------------------------------------------- shop
  var shop = 'helpers', qty = 1;
  function unlocked(u) {
    var q = u.req || {};
    if (q.up && !has(q.up)) return false;
    if (q.total && c.total < q.total) return false;
    if (q.golden && c.golden < q.golden) return false;
    if (q.own && owned(q.own[0]) < q.own[1]) return false;
    return true;
  }
  function visibleUpgrades() { return UPGRADES.filter(function (u) { return !has(u.id) && unlocked(u); }).sort(function (a, b) { return a.cost - b.cost; }); }
  function drawShop() {
    var html = '';
    if (shop === 'helpers') {
      var shown = 0;
      html = HELPERS.map(function (h, i) {
        // show helpers you own, plus the next two you could save up for
        if (!owned(h.id) && i > 0 && !owned(HELPERS[i - 1].id) && shown >= 2) return '';
        if (!owned(h.id)) shown++;
        var cost = costOf(h, qty), can = c.k >= cost && isHer;
        return '<button type="button" class="ck-item' + (can ? ' can' : '') + '" data-buy="' + h.id + '"' + (can ? '' : ' aria-disabled="true"') + '>' +
          '<span class="ck-em">' + h.em + '</span><span class="ck-info"><b>' + esc(h.name) + '</b><small>' + esc(h.desc) + ' · ' + fmt(helperKps(h) * allMult(), true) + '/s each</small>' +
          '<span class="ck-cost">🥝 ' + fmt(cost) + (qty > 1 ? ' for ' + qty : '') + '</span></span><span class="ck-own">' + owned(h.id) + '</span></button>';
      }).join('');
    } else {
      var ups = visibleUpgrades();
      html = ups.length ? ups.map(function (u) {
        var can = c.k >= u.cost && isHer;
        return '<button type="button" class="ck-item up' + (can ? ' can' : '') + '" data-up="' + u.id + '"' + (can ? '' : ' aria-disabled="true"') + '>' +
          '<span class="ck-em">' + u.em + '</span><span class="ck-info"><b>' + esc(u.name) + '</b><small>' + esc(u.desc) + '</small><span class="ck-cost">🥝 ' + fmt(u.cost) + '</span></span></button>';
      }).join('') : '<p class="muted" style="text-align:center">No upgrades right now. Keep growing kiwis to unlock more ✨</p>';
      var bought = UPGRADES.filter(function (u) { return has(u.id); });
      if (bought.length) html += '<div class="ck-bought">Bought: ' + bought.map(function (u) { return '<span title="' + esc(u.name + ': ' + u.desc) + '">' + u.em + '</span>'; }).join('') + '</div>';
    }
    $('#ck-shop').innerHTML = html;
  }
  $('#ck-shop').addEventListener('click', function (e) {
    var b = e.target.closest('[data-buy],[data-up]'); if (!b || !isHer) return;
    if (b.dataset.buy) {
      var h = HELPERS.find(function (x) { return x.id === b.dataset.buy; }), cost = costOf(h, qty);
      if (c.k < cost) return;
      c.k -= cost; c.owned[h.id] = owned(h.id) + qty;
      if (owned(h.id) === qty && K.logEvent) K.logEvent(h.em, 'Clicker: bought her first ' + h.name.toLowerCase());
    } else {
      var u = UPGRADES.find(function (x) { return x.id === b.dataset.up; });
      if (!u || c.k < u.cost) return;
      c.k -= u.cost; c.up[u.id] = true;
    }
    dirty = true; b.classList.add('bought'); draw(true);
    clearTimeout(drawShop.t); drawShop.t = setTimeout(function () { saveCloud(); }, 5000);
  });
  document.querySelectorAll('[data-shop]').forEach(function (b) {
    b.addEventListener('click', function () {
      shop = b.dataset.shop;
      document.querySelectorAll('[data-shop]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      $('#ck-qty').hidden = shop !== 'helpers'; draw(true);
    });
  });
  document.querySelectorAll('[data-qty]').forEach(function (b) {
    b.addEventListener('click', function () {
      qty = +b.dataset.qty; document.querySelectorAll('[data-qty]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); draw(true);
    });
  });

  // ---------------------------------------------------------------- milestones
  function checkMilestones() {
    while (c.ms < MILESTONES.length && c.total >= MILESTONES[c.ms][0]) {
      var m = MILESTONES[c.ms]; c.ms++;
      if (isHer) {
        K.toast(m[1]); K.confetti({ count: 70 });
        if (K.logEvent) K.logEvent('🥝', 'Clicker: reached ' + fmt(m[0]) + ' kiwis');
        saveCloud(true);
      }
    }
  }

  // ---------------------------------------------------------------- drawing
  var lastShopSig = '';
  function draw(full) {
    $('#ck-kiwis').textContent = fmt(c.k);
    $('#ck-kps').textContent = fmt(kps(), true);
    $('#ck-per').textContent = fmt(perTap(), true);
    var b = DB.state.clickerBoost, fr = Date.now() < frenzyUntil;
    var boostOn = b && b.until > Date.now() && b.mult > 1;
    $('#ck-boost').hidden = !boostOn && !fr;
    if (boostOn || fr) {
      $('#ck-boost').textContent = (fr ? '✨ Frenzy 7× · ' + Math.ceil((frenzyUntil - Date.now()) / 1000) + 's' : '') + (fr && boostOn ? '  ·  ' : '') +
        (boostOn ? '💚 ' + (b.label || 'Boost from Chengxuan') + ': ' + b.mult + '× until ' + K.herTime(b.until) : '');
    }
    var ups = visibleUpgrades(), affordable = ups.filter(function (u) { return c.k >= u.cost; }).length;
    $('#ck-upn').textContent = affordable ? affordable : '';
    // the shop only re-renders when something you can afford changes
    var sig = shop + qty + JSON.stringify(c.owned) + Object.keys(c.up).length + '|' +
      (shop === 'helpers' ? HELPERS.map(function (h) { return c.k >= costOf(h, qty) ? 1 : 0; }).join('') : ups.map(function (u) { return c.k >= u.cost ? 1 : 0; }).join(''));
    if (full || sig !== lastShopSig) { lastShopSig = sig; drawShop(); }
    if (full) drawStats();
    checkMilestones();
  }
  function drawStats() {
    var helpers = HELPERS.reduce(function (a, h) { return a + owned(h.id); }, 0);
    $('#ck-stats').innerHTML = [
      ['🥝 Kiwis ever grown', fmt(c.total)], ['👆 Taps', fmt(c.clicks)], ['🐦 Helpers', helpers],
      ['✨ Upgrades', Object.keys(c.up).length + ' / ' + UPGRADES.length], ['🌟 Golden kiwis caught', c.golden],
      ['📅 Playing since', K.herDay(c.started || Date.now())]
    ].map(function (r) { return '<li><span>' + r[0] + '</span><span class="amt">' + r[1] + '</span></li>'; }).join('');
    var next = MILESTONES[c.ms];
    $('#ck-ms').innerHTML = next ? '<div class="help">Next milestone: ' + fmt(next[0]) + ' kiwis</div><div class="bar"><i style="width:' + Math.min(100, c.total / next[0] * 100) + '%"></i></div>' : '<div class="help">Every milestone done 👑</div>';
  }

  // ---------------------------------------------------------------- main loop (10 times a second)
  var last = Date.now();
  setInterval(function () {
    var now = Date.now(), dt = Math.min(5, (now - last) / 1000); last = now;
    if (isHer) { var g = kps() * dt; if (g) { c.k += g; c.total += g; dirty = true; } }
    draw();
  }, 100);
  setInterval(function () { if (isHer) { saveLocal(); saveCloud(); } else { c = norm(DB.live.clicker); } if (!document.hidden) drawStats(); }, 3000);
  DB.subscribe(function () { checkReset(); applyGifts(); if (!isHer) c = norm(DB.live.clicker); });
  setInterval(applyGifts, 20000);   // scheduled kiwi gifts arrive on time
  checkReset(); applyGifts(); draw(true);
  if (!isHer) K.toast('You\'re watching her game 👀');
  if (isHer && !c.savedAt && K.logEvent) K.logEvent('🥝', 'Started playing Kiwi Clicker');
});
