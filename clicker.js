/* clicker.js: Kiwi Clicker. Tap the kiwi, buy helpers, unlock upgrades, earn trophies, catch golden kiwis,
   collect a daily basket, unlock skins, and plant Love Seeds (start over for permanent bonuses).
   Saved on this device every few seconds and to the cloud (follows her between phone and laptop).
   Chengxuan can watch it and send kiwis / boosts from admin. */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, $ = K.$, esc = K.esc;
  if (!DB.user || !$('#ck-kiwi')) return;
  var isHer = DB.user.role === 'livina';

  // ================================================================ game data
  var HELPERS = [
    { id: 'bird', em: '🐦', name: 'Baby kiwi bird', cost: 15, kps: 0.1, desc: 'Pecks out a kiwi now and then' },
    { id: 'tree', em: '🌳', name: 'Kiwi tree', cost: 100, kps: 1, desc: 'Grows kiwis all day long' },
    { id: 'farm', em: '🚜', name: 'Kiwi farm', cost: 1100, kps: 8, desc: 'A whole field of kiwis' },
    { id: 'bakery', em: '🧁', name: 'Kiwi bakery', cost: 12000, kps: 47, desc: 'Kiwi tarts, kiwi cakes, kiwi everything' },
    { id: 'factory', em: '🏭', name: 'Kiwi factory', cost: 130000, kps: 260, desc: 'Mass-produced cuteness' },
    { id: 'island', em: '🏝️', name: 'Kiwi island', cost: 1.4e6, kps: 1400, desc: 'An island where only kiwis live' },
    { id: 'rocket', em: '🚀', name: 'Kiwi rocket', cost: 2e7, kps: 7800, desc: 'Brings kiwis back from space' },
    { id: 'portal', em: '🌀', name: 'Kiwi portal', cost: 3.3e8, kps: 44000, desc: 'Opens a door to the kiwi dimension' },
    { id: 'love', em: '💚', name: 'Chengxuan\'s love', cost: 5.1e9, kps: 260000, desc: 'Infinite. Makes kiwis out of nothing' },
    { id: 'kingdom', em: '🏰', name: 'Kiwi kingdom', cost: 7.5e10, kps: 1.6e6, desc: 'Queen Livina rules the kiwi lands' },
    { id: 'galaxy', em: '🌌', name: 'Kiwi galaxy', cost: 1e12, kps: 1e7, desc: 'Billions of kiwi stars' },
    { id: 'time', em: '⏳', name: 'Kiwi time machine', cost: 1.4e13, kps: 6.5e7, desc: 'Grows tomorrow\'s kiwis today' },
    { id: 'forever', em: '💍', name: 'Forever us', cost: 1.7e14, kps: 4.3e8, desc: 'The strongest thing in the universe' }
  ];
  var UPGRADES = [
    { id: 'c1', em: '👆', name: 'Stronger finger', cost: 100, desc: 'Taps give 2× kiwis', click: 2 },
    { id: 'c2', em: '🧤', name: 'Kiwi gloves', cost: 600, desc: 'Taps give 2× kiwis', click: 2, req: { up: 'c1' } },
    { id: 'c3', em: '✨', name: 'Golden touch', cost: 12000, desc: 'Taps give 2× kiwis', click: 2, req: { up: 'c2' } },
    { id: 'c4', em: '💋', name: 'Love taps', cost: 60000, desc: 'Each tap also gives 2% of your kiwis per second', clickPct: 0.02, req: { up: 'c3' } },
    { id: 'c5', em: '💞', name: 'Super love taps', cost: 6e6, desc: 'Each tap gives another 4% of your kiwis per second', clickPct: 0.04, req: { up: 'c4' } },
    { id: 'c6', em: '💘', name: 'Cupid taps', cost: 6e8, desc: 'Each tap gives another 6% of your kiwis per second', clickPct: 0.06, req: { up: 'c5' } },
    { id: 'c7', em: '💖', name: 'Heartbeat taps', cost: 6e10, desc: 'Each tap gives another 8% of your kiwis per second', clickPct: 0.08, req: { up: 'c6' } },
    { id: 'c8', em: '🤞', name: 'Pinky promise', cost: 6e12, desc: 'Taps give 10× kiwis', click: 10, req: { up: 'c7' } },
    { id: 'g1', em: '🧃', name: 'Kiwi juice', cost: 15000, desc: 'All helpers +10%', all: 1.1, req: { total: 5000 } },
    { id: 'g2', em: '🥤', name: 'Kiwi smoothie', cost: 1.5e6, desc: 'All helpers +25%', all: 1.25, req: { total: 5e5 } },
    { id: 'g3', em: '😘', name: 'Kiwi kisses', cost: 1.5e8, desc: 'All helpers +50%', all: 1.5, req: { total: 5e7 } },
    { id: 'g4', em: '💍', name: 'Kiwi forever', cost: 1.5e10, desc: 'All helpers ×2', all: 2, req: { total: 5e9 } },
    { id: 'g5', em: '🎂', name: 'Kiwi birthday cake', cost: 1.5e12, desc: 'All helpers ×2', all: 2, req: { total: 5e11 } },
    { id: 'g6', em: '🌈', name: 'Kiwi rainbow', cost: 1.5e14, desc: 'All helpers ×3', all: 3, req: { total: 5e13 } },
    { id: 'lk', em: '🍀', name: 'Lucky kiwis', cost: 77777, desc: 'Golden kiwis show up twice as often', luck: 2, req: { golden: 3 } },
    { id: 'lk2', em: '🌟', name: 'Golden days', cost: 7.7e7, desc: 'Golden kiwi effects last twice as long', longer: 2, req: { golden: 15 } },
    { id: 'tr', em: '🏆', name: 'Trophy cabinet', cost: 1e6, desc: 'Each trophy gives +1% more (2% total)', trophy: 1, req: { ach: 15 } },
    { id: 'tr2', em: '🥇', name: 'Hall of fame', cost: 1e10, desc: 'Each trophy gives +1% more (3% total)', trophy: 1, req: { ach: 40 } },
    // synergies: one helper boosts another
    { id: 's1', em: '🐦🌳', name: 'Birds love trees', cost: 50000, desc: 'Kiwi trees +2% for every baby kiwi bird', syn: ['tree', 'bird', 0.02], req: { own: ['bird', 25], own2: ['tree', 10] } },
    { id: 's2', em: '🚜🧁', name: 'Farm to bakery', cost: 5e6, desc: 'Bakeries +1% for every farm', syn: ['bakery', 'farm', 0.01], req: { own: ['farm', 25], own2: ['bakery', 10] } },
    { id: 's3', em: '🏭🚀', name: 'Rocket factory', cost: 5e9, desc: 'Rockets +1% for every factory', syn: ['rocket', 'factory', 0.01], req: { own: ['factory', 25], own2: ['rocket', 10] } },
    { id: 's4', em: '💚🏰', name: 'Royal love', cost: 5e12, desc: 'Kingdoms +1% for every bit of Chengxuan\'s love', syn: ['kingdom', 'love', 0.01], req: { own: ['love', 25], own2: ['kingdom', 10] } }
  ];
  // Each helper: seven ×2 upgrades at 1, 10, 25, 50, 100, 150 and 200 owned.
  var TIERS = [[1, 10, ''], [10, 50, ' II'], [25, 500, ' III'], [50, 5e4, ' IV'], [100, 5e6, ' V'], [150, 5e8, ' VI'], [200, 5e10, ' VII']];
  var ADJ = ['Happier', 'Bouncier', 'Sparkly', 'Dreamy', 'Legendary', 'Cosmic', 'Infinite'];
  HELPERS.forEach(function (h) {
    TIERS.forEach(function (t, i) {
      UPGRADES.push({ id: h.id + (i + 1), em: h.em, name: ADJ[i] + ' ' + h.name.toLowerCase() + 's', cost: h.cost * t[1], desc: h.name + 's make 2× kiwis', helper: h.id, mult: 2, req: { own: [h.id, t[0]] } });
    });
  });
  var MILESTONES = [
    [100, 'Your first 100 kiwis! 🥝 He\'s proud of you already'], [1000, '1,000 kiwis! Kiwi farmer in training 👩‍🌾'],
    [10000, '10K kiwis! Chengxuan would like one please 🥺'], [100000, '100K kiwis!! Kiwi tycoon 💼🥝'],
    [1e6, 'A MILLION kiwis 😱 He loves you a million times more'], [1e7, '10 million kiwis! Kiwi empress 👑'],
    [1e8, '100 million kiwis. The kiwi birds are starting a fan club 🐦'], [1e9, 'A BILLION kiwis 🌍 You own every kiwi on Earth'],
    [1e10, '10 billion! Even the moon is made of kiwi now 🌕'], [1e12, 'A trillion kiwis. You win the universe 💚🌌'],
    [1e15, 'A quadrillion. Science can\'t explain how cute this is 🔬💚']
  ];
  // Trophies: each one makes everything grow a little faster
  var ACH = [];
  [[1e2, 'Snack'], [1e3, 'Lunchbox'], [1e4, 'Fruit bowl'], [1e5, 'Market stall'], [1e6, 'Millionaire'], [1e7, 'Kiwi baron'], [1e8, 'Kiwi duchess'], [1e9, 'Billionaire'], [1e10, 'Kiwi empress'], [1e11, 'Kiwi goddess'], [1e12, 'Trillionaire'], [1e13, 'Kiwi multiverse'], [1e14, 'Beyond kiwi'], [1e15, 'Kiwi infinity']]
    .forEach(function (x, i) { ACH.push({ id: 'k' + i, em: '🥝', name: x[1], desc: 'Grow ' + fmtShort(x[0]) + ' kiwis in total', test: function () { return c.totalEver >= x[0]; } }); });
  [[100, 'Tapper'], [1000, 'Speedy fingers'], [5000, 'Tap queen'], [20000, 'Tap legend'], [100000, 'Unstoppable']]
    .forEach(function (x, i) { ACH.push({ id: 't' + i, em: '👆', name: x[1], desc: 'Tap ' + fmtShort(x[0]) + ' times', test: function () { return c.clicksEver >= x[0]; } }); });
  HELPERS.forEach(function (h) {
    [[1, ''], [50, ' fan'], [100, ' lover'], [200, ' master']].forEach(function (x, i) {
      ACH.push({ id: 'h' + h.id + i, em: h.em, name: (i ? h.name + x[1] : 'First ' + h.name.toLowerCase()), desc: 'Own ' + x[0] + ' ' + h.name.toLowerCase() + (x[0] > 1 ? 's' : ''), test: function () { return owned(h.id) >= x[0]; } });
    });
  });
  [[1, 'Shiny!'], [10, 'Gold digger'], [50, 'Golden girl'], [200, 'Midas']].forEach(function (x, i) { ACH.push({ id: 'g' + i, em: '🌟', name: x[1], desc: 'Catch ' + x[0] + ' golden kiwi' + (x[0] > 1 ? 's' : ''), test: function () { return c.goldenEver >= x[0]; } }); });
  [[10, 'Upgraded'], [40, 'Fancy farm'], [80, 'Kiwi tech'], [120, 'Fully loaded']].forEach(function (x, i) { ACH.push({ id: 'u' + i, em: '✨', name: x[1], desc: 'Buy ' + x[0] + ' upgrades', test: function () { return Object.keys(c.up).length >= x[0]; } }); });
  [[10, 'Growing'], [1000, 'Blooming'], [1e6, 'Kiwi machine'], [1e9, 'Kiwi storm']].forEach(function (x, i) { ACH.push({ id: 'p' + i, em: '⚡', name: x[1], desc: 'Make ' + fmtShort(x[0]) + ' kiwis per second', test: function () { return kps(true) >= x[0]; } }); });
  [[1, 'New beginning'], [3, 'Seed collector'], [10, 'Love gardener']].forEach(function (x, i) { ACH.push({ id: 'r' + i, em: '🌱', name: x[1], desc: 'Plant Love Seeds ' + x[0] + ' time' + (x[0] > 1 ? 's' : ''), test: function () { return (c.rebirths || 0) >= x[0]; } }); });
  [[1, 'Basket'], [7, 'Weekly basket'], [30, 'Basket queen']].forEach(function (x, i) { ACH.push({ id: 'd' + i, em: '🧺', name: x[1], desc: 'Collect ' + x[0] + ' daily basket' + (x[0] > 1 ? 's' : ''), test: function () { return (c.baskets || 0) >= x[0]; } }); });
  ACH.push({ id: 'st', em: '⛈️', name: 'Storm chaser', desc: 'Tap 15 kiwis in one kiwi storm', test: function () { return (c.bestStorm || 0) >= 15; } });
  ACH.push({ id: 'nt', em: '🌙', name: 'Night owl', desc: 'Play after midnight (her time)', test: function () { var h = window.KiwiTime.parts(Date.now(), K.HZ).h; return h < 4 && c.clicks > 0; } });

  // Love Seeds (prestige): start over, keep seeds. Every seed = +3% forever. Spend seeds on perks.
  var PERKS = [
    { id: 'head', em: '🐣', name: 'Head start', cost: 1, desc: 'Start every new farm with 10 birds and 5 trees' },
    { id: 'strong', em: '💪', name: 'Strong love', cost: 2, desc: 'Taps give 5× kiwis' },
    { id: 'owl', em: '🌙', name: 'While you sleep', cost: 2, desc: 'Earn 100% while away (instead of 50%), for up to 24 hours' },
    { id: 'charm', em: '🍀', name: 'Lucky charm', cost: 3, desc: 'Golden kiwis show up twice as often' },
    { id: 'memory', em: '🧠', name: 'Good memory', cost: 4, desc: 'Keep your tap upgrades when you start over' },
    { id: 'bargain', em: '🏷️', name: 'Kiwi coupons', cost: 5, desc: 'Helpers cost 10% less' },
    { id: 'basket', em: '🧺', name: 'Bigger basket', cost: 3, desc: 'Daily basket is 3× bigger' },
    { id: 'storm', em: '⛈️', name: 'Storm season', cost: 6, desc: 'Kiwi storms happen more and last longer' }
  ];
  var SKINS = [
    { id: 'classic', name: 'Classic', cls: '', test: function () { return true; }, how: '' },
    { id: 'gold', name: 'Golden', cls: 'skin-gold', test: function () { return c.goldenEver >= 10; }, how: 'Catch 10 golden kiwis' },
    { id: 'pink', name: 'Strawberry', cls: 'skin-pink', test: function () { return c.totalEver >= 1e6; }, how: 'Grow 1M kiwis' },
    { id: 'blue', name: 'Blueberry', cls: 'skin-blue', test: function () { return c.clicksEver >= 5000; }, how: 'Tap 5,000 times' },
    { id: 'night', name: 'Midnight', cls: 'skin-night', test: function () { return achCount() >= 30; }, how: 'Earn 30 trophies' },
    { id: 'rainbow', name: 'Rainbow', cls: 'skin-rainbow', test: function () { return (c.rebirths || 0) >= 1; }, how: 'Plant Love Seeds once' }
  ];

  // ================================================================ save / load
  var LS = 'kiwi-clicker';
  // gifts sent before she started (or before a reset) don't count
  function blank() {
    return { k: 0, total: 0, clicks: 0, owned: {}, up: {}, golden: 0, gifts: (DB.state.clickerGifts || []).concat(K.scheduledKiwis()).map(function (g) { return g.id; }),
      ms: 0, savedAt: 0, started: Date.now(), totalEver: 0, clicksEver: 0, goldenEver: 0, ach: {}, seeds: 0, spent: 0, perks: {}, rebirths: 0, baskets: 0, lastBasket: '', skin: 'classic', bestStorm: 0 };
  }
  function norm(x) {
    var b = blank(); if (x) Object.keys(x).forEach(function (k) { if (x[k] !== undefined) b[k] = x[k]; });
    // older saves: carry over lifetime numbers
    if (!b.totalEver) b.totalEver = b.total || 0; if (!b.clicksEver) b.clicksEver = b.clicks || 0; if (!b.goldenEver) b.goldenEver = b.golden || 0;
    return b;
  }
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
    var snap = JSON.parse(JSON.stringify(c)); snap.kps = kps(); snap.perTap = perTap(); snap.trophies = achCount();
    DB.setLive({ clicker: snap }).catch(function (e) { console.warn(e); dirty = true; });
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) saveCloud(true); });
  window.addEventListener('pagehide', function () { saveCloud(true); });

  function checkReset() {
    var r = DB.state.clickerReset || 0;
    if (isHer && r && (c.started || 0) < r && (c.resetSeen || 0) < r) {
      var keep = c.gifts; c = blank(); c.gifts = keep; c.resetSeen = r; saveCloud(true); K.toast('Your kiwi farm got a fresh start 🌱'); draw(true);
    }
  }

  // ================================================================ math
  function owned(id) { return c.owned[id] || 0; }
  function has(id) { return !!c.up[id]; }
  function perk(id) { return !!c.perks[id]; }
  function achCount() { return Object.keys(c.ach || {}).length; }
  function costOf(h, n) { var o = owned(h.id), r = 1.15, base = h.cost * (perk('bargain') ? 0.9 : 1); return Math.ceil(base * Math.pow(r, o) * (Math.pow(r, n) - 1) / (r - 1)); }
  function maxBuy(h) { var n = 0; while (n < 1000 && costOf(h, n + 1) <= c.k) n++; return n; }
  var fx = { frenzy: 0, tapFrenzy: 0, storm: 0 };
  function boost() { var b = DB.state.clickerBoost; return b && b.until > Date.now() ? Math.max(1, +b.mult || 1) : 1; }
  function helperKps(h) {
    var m = 1;
    UPGRADES.forEach(function (u) {
      if (!has(u.id)) return;
      if (u.helper === h.id) m *= u.mult;
      if (u.syn && u.syn[0] === h.id) m *= 1 + u.syn[2] * owned(u.syn[1]);
    });
    return h.kps * m;
  }
  function trophyBonus() { var per = 0.01; UPGRADES.forEach(function (u) { if (has(u.id) && u.trophy) per += 0.01 * u.trophy; }); return 1 + achCount() * per; }
  function seedBonus() { return 1 + (c.seeds || 0) * 0.03; }
  function allMult() { var m = 1; UPGRADES.forEach(function (u) { if (has(u.id) && u.all) m *= u.all; }); return m * trophyBonus() * seedBonus(); }
  function kps(base) {
    var s = 0; HELPERS.forEach(function (h) { s += helperKps(h) * owned(h.id); });
    s *= allMult() * boost();
    if (!base && Date.now() < fx.frenzy) s *= 7;
    return s;
  }
  function perTap() {
    var m = 1, pct = 0; UPGRADES.forEach(function (u) { if (has(u.id)) { if (u.click) m *= u.click; if (u.clickPct) pct += u.clickPct; } });
    if (perk('strong')) m *= 5;
    var v = m * boost() * seedBonus() + kps() * pct;
    if (Date.now() < fx.tapFrenzy) v *= 77;
    return v;
  }
  function earn(n) { c.k += n; if (n > 0) { c.total += n; c.totalEver += n; } dirty = true; }
  function fmtShort(n) { return fmt(n); }
  function fmt(n, dec) {
    n = Math.max(0, n || 0);
    if (n < 1000) return dec && n < 100 && n % 1 ? n.toFixed(1) : Math.floor(n).toLocaleString('en-US');
    var u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc'], i = -1;
    while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i];
  }
  K.fmtKiwis = fmt;
  function seedsFor(total) { return Math.floor(Math.cbrt(total / 1e7)); }   // first seed at 10M kiwis in one farm

  // ================================================================ offline earnings + gifts from him + daily basket
  if (isHer && c.savedAt) {
    var maxAway = perk('owl') ? 24 : 12, share = perk('owl') ? 1 : 0.5;
    var away = Math.min(Date.now() - c.savedAt, maxAway * 3600e3) / 1000, made = kps(true) * away * share;
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
      var amt = +g.amount || 0; c.k = Math.max(0, c.k + amt); if (amt > 0) { c.total += amt; c.totalEver += amt; }
      saveCloud(true);
      K.queueModal('<div class="em">' + (amt >= 0 ? '🎁🥝' : '🙈') + '</div><h3>' + (amt >= 0 ? 'Chengxuan sent you ' + fmt(amt) + ' kiwis!' : 'Chengxuan took ' + fmt(-amt) + ' kiwis 😝') + '</h3>' +
        (g.note ? '<p class="desc">"' + esc(g.note) + '"</p>' : ''), 'call', function () { if (amt > 0) K.confetti({ count: 100 }); });
      K.logEvent && K.logEvent('🎁', 'Got your ' + fmt(amt) + ' clicker kiwis');
      draw(true);
    });
  }
  function basketReady() { return isHer && c.lastBasket !== K.todayKey(); }
  function basketSize() { return Math.max(100, kps(true) * 900, perTap() * 50) * (perk('basket') ? 3 : 1); }
  function claimBasket() {
    if (!basketReady()) return;
    var amt = basketSize(); earn(amt); c.lastBasket = K.todayKey(); c.baskets = (c.baskets || 0) + 1;
    K.confetti({ count: 80 }); K.toast('🧺 Daily basket: +' + fmt(amt) + ' kiwis!'); saveCloud(true); draw(true);
  }

  // ================================================================ tapping
  var kiwiBtn = $('#ck-kiwi'), fxBox = $('#ck-fx');
  function floatText(x, y, txt, cls) {
    var f = document.createElement('span'); f.className = 'ck-float' + (cls ? ' ' + cls : ''); f.textContent = txt;
    f.style.left = x + 'px'; f.style.top = y + 'px'; fxBox.appendChild(f); setTimeout(function () { f.remove(); }, 900);
  }
  kiwiBtn.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (!isHer) { K.toast('This is her game 🥝 You\'re just watching'); return; }
    var n = perTap(); earn(n); c.clicks++; c.clicksEver++;
    kiwiBtn.classList.remove('pop'); void kiwiBtn.offsetWidth; kiwiBtn.classList.add('pop');
    var r = kiwiBtn.parentNode.getBoundingClientRect();
    floatText(e.clientX - r.left, e.clientY - r.top, '+' + fmt(n, true), Date.now() < fx.tapFrenzy ? 'hot' : '');
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (x) { /* */ }
    draw();
  });
  kiwiBtn.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); kiwiBtn.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0 })); } });

  // ================================================================ golden kiwis: lucky, frenzy, tap frenzy, kiwi storm
  var gold = $('#ck-golden');
  function luck() { return (has('lk') ? 2 : 1) * (perk('charm') ? 2 : 1); }
  function dur(s) { return s * 1000 * (has('lk2') ? 2 : 1); }
  function scheduleGold() { setTimeout(showGold, (60 + Math.random() * 120) * 1000 / luck()); }
  function showGold() {
    if (document.hidden || !isHer) return scheduleGold();
    gold.style.left = (10 + Math.random() * 70) + '%'; gold.style.top = (10 + Math.random() * 60) + '%';
    gold.hidden = false;
    setTimeout(function () { gold.hidden = true; }, 13000);
    scheduleGold();
  }
  gold.addEventListener('click', function () {
    gold.hidden = true; c.golden++; c.goldenEver++;
    var r = Math.random(), stormOdds = perk('storm') ? 0.3 : 0.18;
    if (r < stormOdds) startStorm();
    else if (r < stormOdds + 0.27) { fx.frenzy = Date.now() + dur(30); K.toast('✨ Kiwi frenzy! 7× kiwis for ' + dur(30) / 1000 + ' seconds'); }
    else if (r < stormOdds + 0.45) { fx.tapFrenzy = Date.now() + dur(13); K.toast('👆 Tap frenzy! Taps give 77× for ' + dur(13) / 1000 + ' seconds. TAP TAP TAP'); }
    else { var bonus = Math.max(13, Math.min(c.k * 0.15, kps(true) * 900) + 13); earn(bonus); K.toast('🍀 Lucky! +' + fmt(bonus) + ' kiwis'); }
    var gr = gold.getBoundingClientRect(); K.confetti({ x: gr.left + 20, y: gr.top + 20, count: 40 });
    dirty = true; draw(true);
  });
  // Kiwi storm: little kiwis rain down; tap as many as you can
  function startStorm() {
    var stage = $('#ck-stage-wrap') || kiwiBtn.parentNode, caught = 0, n = perk('storm') ? 30 : 20, len = dur(perk('storm') ? 10 : 7);
    fx.storm = Date.now() + len; K.toast('⛈️ Kiwi storm! Tap the falling kiwis!');
    for (var i = 0; i < n; i++) (function (i) {
      setTimeout(function () {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ck-drop'; b.textContent = '🥝';
        b.style.left = (5 + Math.random() * 85) + '%'; b.style.animationDuration = (2 + Math.random() * 1.5) + 's';
        b.addEventListener('pointerdown', function (e) {
          e.stopPropagation(); caught++; var v = Math.max(5, kps(true) * 6 + perTap() * 3); earn(v);
          var r = stage.getBoundingClientRect(); floatText(e.clientX - r.left, e.clientY - r.top, '+' + fmt(v), 'hot'); b.remove();
        });
        stage.appendChild(b); setTimeout(function () { b.remove(); }, 3600);
      }, Math.random() * (len - 2000));
    })(i);
    setTimeout(function () {
      c.bestStorm = Math.max(c.bestStorm || 0, caught); K.toast('⛈️ Storm over! You caught ' + caught + ' kiwis'); draw(true);
    }, len + 1600);
  }
  scheduleGold();

  // ================================================================ shop
  var shop = 'helpers', qty = 1;
  function unlocked(u) {
    var q = u.req || {};
    if (q.up && !has(q.up)) return false;
    if (q.total && c.totalEver < q.total) return false;
    if (q.golden && c.goldenEver < q.golden) return false;
    if (q.ach && achCount() < q.ach) return false;
    if (q.own && owned(q.own[0]) < q.own[1]) return false;
    if (q.own2 && owned(q.own2[0]) < q.own2[1]) return false;
    return true;
  }
  function visibleUpgrades() { return UPGRADES.filter(function (u) { return !has(u.id) && unlocked(u); }).sort(function (a, b) { return a.cost - b.cost; }); }
  function qtyFor(h) { return qty === 'max' ? Math.max(1, maxBuy(h)) : qty; }
  function drawShop() {
    var html = '';
    if (shop === 'helpers') {
      var shown = 0;
      html = HELPERS.map(function (h, i) {
        if (!owned(h.id) && i > 0 && !owned(HELPERS[i - 1].id) && shown >= 2) return '';
        if (!owned(h.id)) shown++;
        var n = qtyFor(h), cost = costOf(h, n), can = c.k >= cost && isHer;
        return '<button type="button" class="ck-item' + (can ? ' can' : '') + '" data-buy="' + h.id + '"' + (can ? '' : ' aria-disabled="true"') + '>' +
          '<span class="ck-em">' + h.em + '</span><span class="ck-info"><b>' + esc(h.name) + '</b><small>' + esc(h.desc) + ' · ' + fmt(helperKps(h) * allMult(), true) + '/s each' +
          (owned(h.id) ? ' · ' + fmt(helperKps(h) * allMult() * owned(h.id), true) + '/s total' : '') + '</small>' +
          '<span class="ck-cost">🥝 ' + fmt(cost) + (n > 1 ? ' for ' + n : '') + '</span></span><span class="ck-own">' + owned(h.id) + '</span></button>';
      }).join('');
    } else if (shop === 'upgrades') {
      var ups = visibleUpgrades();
      html = ups.length ? ups.slice(0, 30).map(function (u) {
        var can = c.k >= u.cost && isHer;
        return '<button type="button" class="ck-item up' + (can ? ' can' : '') + '" data-up="' + u.id + '"' + (can ? '' : ' aria-disabled="true"') + '>' +
          '<span class="ck-em">' + u.em + '</span><span class="ck-info"><b>' + esc(u.name) + '</b><small>' + esc(u.desc) + '</small><span class="ck-cost">🥝 ' + fmt(u.cost) + '</span></span></button>';
      }).join('') : '<p class="muted" style="text-align:center">No upgrades right now. Keep growing kiwis to unlock more ✨</p>';
      var bought = UPGRADES.filter(function (u) { return has(u.id); });
      if (bought.length) html += '<div class="ck-bought">Bought (' + bought.length + '/' + UPGRADES.length + '): ' + bought.map(function (u) { return '<span title="' + esc(u.name + ': ' + u.desc) + '">' + u.em + '</span>'; }).join('') + '</div>';
    } else if (shop === 'trophies') {
      var per = (trophyBonus() - 1) / Math.max(1, achCount()) * 100;
      html = '<p class="help" style="margin:0 0 8px">' + achCount() + ' of ' + ACH.length + ' trophies · each gives +' + (achCount() ? per.toFixed(0) : '1') + '% to everything (now +' + Math.round((trophyBonus() - 1) * 100) + '%)</p><div class="ck-ach">' +
        ACH.map(function (a) { var got = (c.ach || {})[a.id]; return '<div class="ck-a' + (got ? ' got' : '') + '" title="' + esc(a.name + ': ' + a.desc) + '"><span>' + (got ? a.em : '🔒') + '</span><b>' + esc(a.name) + '</b><small>' + esc(a.desc) + '</small></div>'; }).join('') + '</div>';
    } else if (shop === 'seeds') {
      var gain = seedsFor(c.total), free = (c.seeds || 0) - (c.spent || 0);
      html = '<div class="ck-seedbox"><div class="em">🌱</div><b>' + (c.seeds || 0) + ' Love Seeds</b><small>Each seed makes everything +3% faster, forever (now +' + Math.round((seedBonus() - 1) * 100) + '%). ' + free + ' to spend on perks.</small>' +
          '<p class="help">Start over with a fresh farm and plant <b>' + gain + ' new seed' + (gain === 1 ? '' : 's') + '</b>. ' + (gain ? '' : 'You need ' + fmt(1e7 * Math.pow(seedsFor(c.total) + 1, 3)) + ' kiwis in this farm for the next one.') + '</p>' +
          '<button type="button" class="btn ' + (gain ? 'pink' : 'ghost') + '" id="ck-rebirth"' + (gain && isHer ? '' : ' disabled') + '>🌱 Start over (+' + gain + ' seeds)</button></div>' +
        '<h3 style="margin:14px 0 6px">Perks</h3>' + PERKS.map(function (p) {
          var got = perk(p.id), can = !got && free >= p.cost && isHer;
          return '<button type="button" class="ck-item up' + (can || got ? ' can' : '') + '" data-perk="' + p.id + '"' + (can ? '' : ' aria-disabled="true"') + '><span class="ck-em">' + p.em + '</span><span class="ck-info"><b>' + esc(p.name) + (got ? ' ✓' : '') + '</b><small>' + esc(p.desc) + '</small>' + (got ? '' : '<span class="ck-cost">🌱 ' + p.cost + '</span>') + '</span></button>';
        }).join('');
    } else if (shop === 'skins') {
      html = '<div class="ck-skins">' + SKINS.map(function (s) {
        var ok = s.test(), on = (c.skin || 'classic') === s.id;
        return '<button type="button" class="ck-skin' + (on ? ' on' : '') + '" data-skin="' + s.id + '"' + (ok ? '' : ' disabled') + '><span class="ck-skin-k ' + s.cls + '">' + K.sliceSVG() + '</span><b>' + esc(s.name) + '</b><small>' + (ok ? (on ? 'Using ✓' : 'Tap to use') : '🔒 ' + esc(s.how)) + '</small></button>';
      }).join('') + '</div>';
    }
    $('#ck-shop').innerHTML = html;
  }
  $('#ck-shop').addEventListener('click', function (e) {
    var b = e.target.closest('[data-buy],[data-up],[data-perk],[data-skin],#ck-rebirth'); if (!b || !isHer) return;
    if (b.dataset.buy) {
      var h = HELPERS.find(function (x) { return x.id === b.dataset.buy; }), n = qtyFor(h), cost = costOf(h, n);
      if (c.k < cost) return;
      c.k -= cost; c.owned[h.id] = owned(h.id) + n;
      if (owned(h.id) === n && K.logEvent) K.logEvent(h.em, 'Clicker: bought her first ' + h.name.toLowerCase());
    } else if (b.dataset.up) {
      var u = UPGRADES.find(function (x) { return x.id === b.dataset.up; });
      if (!u || c.k < u.cost) return;
      c.k -= u.cost; c.up[u.id] = true;
    } else if (b.dataset.perk) {
      var p = PERKS.find(function (x) { return x.id === b.dataset.perk; });
      if (!p || perk(p.id) || (c.seeds - c.spent) < p.cost) return;
      c.spent += p.cost; c.perks[p.id] = true; K.toast(p.em + ' ' + p.name + ' unlocked!'); K.confetti({ count: 50 });
    } else if (b.dataset.skin) {
      c.skin = b.dataset.skin; applySkin();
    } else if (b.id === 'ck-rebirth') {
      rebirth(); return;
    }
    dirty = true; b.classList.add('bought'); draw(true);
    clearTimeout(drawShop.t); drawShop.t = setTimeout(function () { saveCloud(); }, 5000);
  });
  function rebirth() {
    var gain = seedsFor(c.total); if (!gain) return;
    K.confirm({ emoji: '🌱', title: 'Plant ' + gain + ' Love Seed' + (gain === 1 ? '' : 's') + '?', text: 'Your kiwis, helpers and upgrades start over. Seeds, perks, trophies, skins and lifetime stats stay. Each seed = +3% forever.', yes: 'Start over 🌱' }).then(function (ok) {
      if (!ok) return;
      var keepUp = {};
      if (perk('memory')) Object.keys(c.up).forEach(function (k) { if (/^c\d/.test(k)) keepUp[k] = true; });
      c.seeds += gain; c.rebirths = (c.rebirths || 0) + 1;
      c.k = 0; c.total = 0; c.clicks = 0; c.golden = 0; c.owned = {}; c.up = keepUp; c.ms = 0;
      if (perk('head')) c.owned = { bird: 10, tree: 5 };
      K.confetti({ count: 150 }); K.toast('🌱 +' + gain + ' Love Seeds! Everything is now +' + Math.round((seedBonus() - 1) * 100) + '% faster');
      if (K.logEvent) K.logEvent('🌱', 'Clicker: planted ' + gain + ' Love Seeds (rebirth #' + c.rebirths + ')');
      dirty = true; saveCloud(true); draw(true);
    });
  }
  function setTabs() {
    document.querySelectorAll('[data-shop]').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.shop === shop); });
    $('#ck-qty').hidden = shop !== 'helpers';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-shop]'); if (b) { shop = b.dataset.shop; setTabs(); draw(true); return; }
    var q = e.target.closest('[data-qty]'); if (q) { qty = q.dataset.qty === 'max' ? 'max' : +q.dataset.qty; document.querySelectorAll('[data-qty]').forEach(function (x) { x.setAttribute('aria-pressed', x === q); }); draw(true); }
  });
  $('#ck-basket').addEventListener('click', claimBasket);

  function applySkin() { var s = SKINS.find(function (x) { return x.id === c.skin; }) || SKINS[0]; kiwiBtn.className = 'ck-kiwi ' + (s.test() ? s.cls : ''); }

  // ================================================================ milestones + trophies
  function checkProgress() {
    while (c.ms < MILESTONES.length && c.totalEver >= MILESTONES[c.ms][0]) {
      var m = MILESTONES[c.ms]; c.ms++;
      if (isHer) { K.toast(m[1]); K.confetti({ count: 70 }); if (K.logEvent) K.logEvent('🥝', 'Clicker: reached ' + fmt(m[0]) + ' kiwis'); saveCloud(true); }
    }
    if (!isHer) return;
    var fresh = ACH.filter(function (a) { return !(c.ach || {})[a.id] && a.test(); });
    if (fresh.length) {
      fresh.forEach(function (a) { c.ach[a.id] = Date.now(); });
      var a0 = fresh[0];
      showTrophy(a0.em + ' Trophy: ' + a0.name + (fresh.length > 1 ? ' (+' + (fresh.length - 1) + ' more)' : ''));
      dirty = true;
    }
  }
  function showTrophy(txt) {
    var t = document.createElement('div'); t.className = 'ck-trophy'; t.textContent = '🏆 ' + txt;
    document.body.appendChild(t); setTimeout(function () { t.classList.add('show'); }, 20);
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, 3000);
  }

  // ================================================================ drawing
  var lastShopSig = '';
  function draw(full) {
    $('#ck-kiwis').textContent = fmt(c.k);
    $('#ck-kps').textContent = fmt(kps(), true);
    $('#ck-per').textContent = fmt(perTap(), true);
    var b = DB.state.clickerBoost, now = Date.now(), parts = [];
    if (now < fx.frenzy) parts.push('✨ Frenzy 7× · ' + Math.ceil((fx.frenzy - now) / 1000) + 's');
    if (now < fx.tapFrenzy) parts.push('👆 Tap frenzy 77× · ' + Math.ceil((fx.tapFrenzy - now) / 1000) + 's');
    if (now < fx.storm) parts.push('⛈️ Kiwi storm!');
    if (b && b.until > now && b.mult > 1) parts.push('💚 ' + (b.label || 'Boost from Chengxuan') + ': ' + b.mult + '× until ' + K.herTime(b.until));
    $('#ck-boost').hidden = !parts.length; $('#ck-boost').textContent = parts.join('  ·  ');
    $('#ck-basket').hidden = !basketReady();
    if (basketReady()) $('#ck-basket-n').textContent = '+' + fmt(basketSize());
    var ups = visibleUpgrades(), affordable = ups.filter(function (u) { return c.k >= u.cost; }).length;
    $('#ck-upn').textContent = affordable ? affordable : '';
    $('#ck-seedn').textContent = seedsFor(c.total) ? '+' + seedsFor(c.total) : '';
    var sig = shop + qty + JSON.stringify(c.owned) + Object.keys(c.up).length + achCount() + c.seeds + c.spent + c.skin + '|' +
      (shop === 'helpers' ? HELPERS.map(function (h) { return c.k >= costOf(h, qtyFor(h)) ? qtyFor(h) : 0; }).join(',') : shop === 'upgrades' ? ups.map(function (u) { return c.k >= u.cost ? 1 : 0; }).join('') : shop === 'seeds' ? seedsFor(c.total) : '');
    if (full || sig !== lastShopSig) { lastShopSig = sig; drawShop(); }
    if (full) { drawStats(); applySkin(); }
    checkProgress();
  }
  function drawStats() {
    var helpers = HELPERS.reduce(function (a, h) { return a + owned(h.id); }, 0);
    $('#ck-stats').innerHTML = [
      ['🥝 Kiwis this farm', fmt(c.total)], ['🌍 Kiwis ever', fmt(c.totalEver)], ['👆 Taps ever', fmt(c.clicksEver)], ['🐦 Helpers', helpers],
      ['✨ Upgrades', Object.keys(c.up).length + ' / ' + UPGRADES.length], ['🏆 Trophies', achCount() + ' / ' + ACH.length], ['🌟 Golden kiwis', c.goldenEver],
      ['🌱 Love Seeds', (c.seeds || 0) + ' (' + (c.rebirths || 0) + ' restarts)'], ['🧺 Baskets', c.baskets || 0], ['⛈️ Best storm', (c.bestStorm || 0) + ' kiwis'],
      ['📅 Playing since', K.herDay(c.started || Date.now())]
    ].map(function (r) { return '<li><span>' + r[0] + '</span><span class="amt">' + r[1] + '</span></li>'; }).join('');
    var next = MILESTONES[c.ms];
    $('#ck-ms').innerHTML = next ? '<div class="help">Next milestone: ' + fmt(next[0]) + ' kiwis</div><div class="bar"><i style="width:' + Math.min(100, c.totalEver / next[0] * 100) + '%"></i></div>' : '<div class="help">Every milestone done 👑</div>';
  }

  // ================================================================ main loop (10× a second)
  var last = Date.now();
  setInterval(function () {
    var now = Date.now(), dt = Math.min(5, (now - last) / 1000); last = now;
    if (isHer) { var g = kps() * dt; if (g) earn(g); }
    draw();
  }, 100);
  setInterval(function () { if (isHer) { saveLocal(); saveCloud(); } else { c = norm(DB.live.clicker); } if (!document.hidden) drawStats(); }, 3000);
  DB.subscribe(function () { checkReset(); applyGifts(); if (!isHer) c = norm(DB.live.clicker); });
  setInterval(applyGifts, 20000);
  setTabs(); checkReset(); applyGifts(); draw(true);
  if (!isHer) K.toast('You\'re watching her game 👀');
  if (isHer && !c.savedAt && K.logEvent) K.logEvent('🥝', 'Started playing Kiwi Clicker');
});
