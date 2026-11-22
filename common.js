/* common.js: shared bits: login guard, tab bar, kiwi art, mascot, confetti, notes, status, gifts, countdowns. */
(function () {
  'use strict';
  var K = window.Kiwi = {};

  K.store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  K.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  // ------------------------------------------------------------ kiwi slice (SVG)
  K.sliceSVG = function (cls) {
    var seeds = '', rays = '';
    for (var i = 0; i < 16; i++) {
      var a = i / 16 * Math.PI * 2, r = 20 + (i % 2) * 4;
      var x = (Math.cos(a) * r).toFixed(1), y = (Math.sin(a) * r).toFixed(1);
      seeds += '<ellipse cx="' + x + '" cy="' + y + '" rx="1.9" ry="3.8" transform="rotate(' + Math.round(a * 180 / Math.PI + 90) + ' ' + x + ' ' + y + ')"/>';
    }
    for (var j = 0; j < 24; j++) {
      var b = j / 24 * Math.PI * 2;
      rays += '<line x1="' + (Math.cos(b) * 14).toFixed(1) + '" y1="' + (Math.sin(b) * 12).toFixed(1) + '" x2="' + (Math.cos(b) * 40).toFixed(1) + '" y2="' + (Math.sin(b) * 40).toFixed(1) + '"/>';
    }
    return '<svg class="slice ' + (cls || '') + '" viewBox="-50 -50 100 100" aria-hidden="true">' +
      '<circle r="49" fill="#7A5230"/><circle r="45.5" fill="#8EE000"/><circle r="33" fill="#B5E26B" opacity=".9"/>' +
      '<g stroke="#fff" stroke-opacity=".28" stroke-width="1.2">' + rays + '</g>' +
      '<ellipse rx="12" ry="10" fill="#FFF8E7"/><g fill="#1b1410">' + seeds + '</g></svg>';
  };

  // ------------------------------------------------------------ kiwi bird mascot (SVG)
  K.mascotSVG = function () {
    return '<svg class="mascot-svg" viewBox="0 0 220 200" aria-hidden="true">' +
      '<ellipse cx="105" cy="188" rx="60" ry="8" fill="rgba(122,82,48,.18)"/>' +
      '<g stroke="#E9B36B" stroke-width="6" stroke-linecap="round" fill="none">' +
        '<path d="M88 158 L84 183 M84 183 L72 186 M84 183 L84 190 M84 183 L96 187"/>' +
        '<path d="M124 158 L128 183 M128 183 L116 187 M128 183 L128 190 M128 183 L140 186"/></g>' +
      '<g class="m-bob">' +
        '<ellipse cx="105" cy="112" rx="72" ry="60" fill="#7A5230"/>' +
        '<ellipse cx="98" cy="134" rx="46" ry="30" fill="#8f6440"/>' +
        '<g stroke="#5c3c20" stroke-width="3" stroke-linecap="round" fill="none" opacity=".75">' +
          '<path d="M50 92 q5 -7 10 0"/><path d="M66 146 q5 -7 10 0"/><path d="M86 66 q5 -7 10 0"/><path d="M140 150 q5 -7 10 0"/>' +
          '<path d="M115 166 q5 -7 10 0"/><path d="M60 122 q5 -7 10 0"/><path d="M160 128 q5 -7 10 0"/></g>' +
        '<g class="m-wing"><ellipse cx="42" cy="116" rx="14" ry="24" fill="#664325" transform="rotate(22 42 116)"/></g>' +
        '<ellipse cx="110" cy="108" rx="9" ry="5.5" fill="#ff8fa3" opacity=".65"/>' +
        '<ellipse cx="160" cy="110" rx="7" ry="5" fill="#ff8fa3" opacity=".65"/>' +
        '<g class="m-eye"><circle cx="120" cy="88" r="10.5" fill="#fff"/><circle cx="122" cy="89" r="6.5" fill="#1b1410"/><circle cx="124.5" cy="86" r="2.2" fill="#fff"/></g>' +
        '<g class="m-eye"><circle cx="152" cy="91" r="8.5" fill="#fff"/><circle cx="154" cy="92" r="5.5" fill="#1b1410"/><circle cx="156" cy="89.5" r="1.9" fill="#fff"/></g>' +
        '<path d="M144 100 Q186 106 214 150 Q206 154 200 147 Q178 120 144 115 Z" fill="#EBC98A" stroke="#c9a05e" stroke-width="2" stroke-linejoin="round"/>' +
        '<g class="m-cap">' +
          '<path d="M94 50 L98 67 Q122 76 146 67 L150 50 Z" fill="#2a2a2a"/>' +
          '<path d="M66 45 L122 26 L178 45 L122 63 Z" fill="#383838"/>' +
          '<path d="M122 44 Q152 48 162 70" stroke="#8EE000" stroke-width="3.5" fill="none"/>' +
          '<circle cx="122" cy="44" r="4" fill="#8EE000"/><circle cx="162" cy="74" r="6" fill="#8EE000"/></g>' +
      '</g></svg>';
  };

  // ------------------------------------------------------------ kiwi slice on canvas (game + confetti)
  K.drawSlice = function (g, R, gold) {
    function circ(r, c) { g.fillStyle = c; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); }
    circ(R, gold ? '#b8860b' : '#7A5230');
    circ(R * 0.9, gold ? '#ffd34d' : '#8EE000');
    circ(R * 0.66, gold ? '#ffe58a' : '#B5E26B');
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1, R * 0.03);
    for (var i = 0; i < 14; i++) {
      var a = i / 14 * Math.PI * 2;
      g.beginPath(); g.moveTo(Math.cos(a) * R * 0.28, Math.sin(a) * R * 0.28); g.lineTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); g.stroke();
    }
    g.fillStyle = '#FFF8E7'; g.beginPath(); g.ellipse(0, 0, R * 0.25, R * 0.21, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1b1410';
    for (var j = 0; j < 14; j++) {
      var b = j / 14 * Math.PI * 2, rr = R * (0.42 + (j % 2) * 0.08);
      g.save(); g.translate(Math.cos(b) * rr, Math.sin(b) * rr); g.rotate(b + Math.PI / 2);
      g.beginPath(); g.ellipse(0, 0, R * 0.04, R * 0.085, 0, 0, Math.PI * 2); g.fill(); g.restore();
    }
  };
  var sliceCache = {};
  K.sliceCanvas = function (gold) {
    var key = gold ? 'g' : 'n';
    if (sliceCache[key]) return sliceCache[key];
    var c = document.createElement('canvas'); c.width = c.height = 96;
    var g = c.getContext('2d'); g.translate(48, 48); K.drawSlice(g, 46, gold);
    return (sliceCache[key] = c);
  };

  // ------------------------------------------------------------ kiwi confetti
  K.confetti = function (opts) {
    opts = opts || {};
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var n = reduce ? 18 : (opts.count || 90);
    var cv = document.createElement('canvas'); cv.className = 'confetti'; document.body.appendChild(cv);
    var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
    var ox = opts.x != null ? opts.x : W / 2, oy = opts.y != null ? opts.y : H * 0.4;
    var img = K.sliceCanvas(false), gold = K.sliceCanvas(true);
    var ps = [];
    for (var i = 0; i < n; i++) {
      var fromTop = i % 3 === 0;
      ps.push({
        x: fromTop ? Math.random() * W : ox + (Math.random() - 0.5) * 40,
        y: fromTop ? -30 - Math.random() * H * 0.5 : oy,
        vx: fromTop ? (Math.random() - 0.5) * 2 : (Math.random() - 0.5) * 16,
        vy: fromTop ? Math.random() * 2 : -Math.random() * 15 - 5,
        s: 14 + Math.random() * 20, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.25,
        flip: Math.random() * 6, vf: 0.05 + Math.random() * 0.1, gold: Math.random() < 0.08
      });
    }
    var t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, W, H);
      var alive = false;
      ps.forEach(function (p) {
        p.vy += 0.32; p.vx *= 0.985; p.vy = Math.min(p.vy, 7);
        p.x += p.vx; p.y += p.vy; p.r += p.vr; p.flip += p.vf;
        if (p.y < H + 40) alive = true;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(Math.cos(p.flip), 1);
        ctx.drawImage(p.gold ? gold : img, -p.s / 2, -p.s / 2, p.s, p.s); ctx.restore();
      });
      if (alive && t - t0 < 6000) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  };

  // ------------------------------------------------------------ love notes from the mascot
  var lastNote = -1;
  K.sayNote = function (bubble) {
    var notes = K.notes();
    var i;
    do { i = Math.floor(Math.random() * notes.length); } while (notes.length > 1 && i === lastNote);
    lastNote = i;
    bubble.textContent = notes[i];
    bubble.classList.remove('pop'); void bubble.offsetWidth; bubble.classList.add('pop', 'show');
  };
  K.hop = function (el) { el.classList.remove('hop'); void el.offsetWidth; el.classList.add('hop'); };


  var T = window.KiwiTime, DB = window.KiwiDB;
  // Android/Chrome "install app" prompt, saved so Home can offer a one-tap button
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); K.installPrompt = e; document.dispatchEvent(new Event('kiwi:installable')); });
  var HZ = 'Europe/Madrid';
  K.HZ = HZ;
  // Display zone: Barcelona for her and visitors; Singapore for Chengxuan in the chat and admin.
  // (Her days, streaks and points always use Barcelona days, whatever is displayed.)
  var VZ = HZ;
  K.VZ = VZ;
  K.zoneLabel = function () { return VZ === HZ ? 'Barcelona' : 'Singapore'; };
  K.$ = function (s, root) { return (root || document).querySelector(s); };
  K.notes = function () { var n = DB && DB.state.notes; return (n && n.length) ? n : (window.LOVE_NOTES || ['I love you 💚']); };
  K.model = window.SCHEDULE ? T.build(window.SCHEDULE) : null;

  // Pet names, most likely first. Change the numbers to make one show up more or less.
  var PET0 = [['baby', 40], ['dumpling', 22], ['Liv', 16], ['wifey', 12], ['my love', 10]];
  K.PET_DEFAULT = PET0;
  K.petName = function (cap) {
    var o = DB && DB.state.petNames;
    var PET = (o && o.length) ? o.filter(function (p) { return p[0] && +p[1] > 0; }) : PET0;
    if (!PET.length) PET = PET0;
    var total = PET.reduce(function (a, p) { return a + p[1]; }, 0), r = Math.random() * total, n = PET[0][0];
    for (var i = 0; i < PET.length; i++) { r -= PET[i][1]; if (r < 0) { n = PET[i][0]; break; } }
    return cap ? n.charAt(0).toUpperCase() + n.slice(1) : n;
  };
  // Pet name when logged in, plain "Livina" for visitors
  K.name = function (cap) { return DB.user ? K.petName(cap) : 'Livina'; };

  // "4:30 PM" if today (Barcelona), else "Fri 4:30 PM"
  K.herTime = function (e) {
    var same = T.dayKey(e, VZ) === T.dayKey(T.now(), VZ);
    return (same ? '' : T.fmtDay(e, VZ).split(' ')[0] + ' ') + T.fmtTime(e, VZ);
  };
  K.herDateTime = function (e) { return T.fmtDay(e, VZ) + ', ' + T.fmtTime(e, VZ); };
  // "Today" / "Yesterday" / "Wed 11 Nov" (in the display zone)
  K.herDay = function (e) {
    var k = T.dayKey(e, VZ), now = T.now();
    if (k === T.dayKey(now, VZ)) return 'Today';
    if (k === T.dayKey(now - 864e5, VZ)) return 'Yesterday';
    return T.fmtDay(e, VZ);
  };

  // ------------------------------------------------------------ live status (her POV, Barcelona times)
  K.status = function () {
    var M = K.model, S = window.SCHEDULE, now = T.now(), st = M.statusNow(now);
    var r = { head: '', sub: '', chip: '', chipCls: '', cls: '', kind: st.kind, mun: !!(st.group && st.group.tag === 'mun'), bothFree: !!st.bothFree, st: st };
    var ov = DB.state.statusOverride;
    if (ov && ov.text && (!ov.until || now < ov.until)) {
      r.head = ov.text; r.sub = 'A message from Chengxuan 💌'; r.cls = 'text'; r.chip = 'Live update'; r.chipCls = 'text'; r.override = true;
      return r;
    }
    if (st.kind === 'before') {
      r.head = S.messages.before.title; r.sub = S.messages.before.sub;
      if (M.leaveAt && now < M.leaveAt) r.chip = 'Leaving in ' + Math.ceil((M.leaveAt - now) / T.HOUR) + ' hours ✈️';
    } else if (st.kind === 'after' || st.kind === 'unknown') {
      r.head = S.messages.after.title; r.sub = S.messages.after.sub;
    } else if (st.kind === 'busy') {
      r.head = (st.leaf.emoji ? st.leaf.emoji + ' ' : '') + (st.leaf.now || st.leaf.title);
      if (st.until) r.sub = (st.nextStatus === 'text' ? 'Can text at ' : 'Back at ') + K.herTime(st.until);
      r.chip = "Can't text right now";
    } else if (st.kind === 'text') {
      r.head = (st.leaf.now || st.leaf.title) + ': text him, ' + K.name() + '! 💬';
      if (st.until) r.sub = 'Until ' + K.herTime(st.until);
      r.chip = 'Can text'; r.chipCls = 'text'; r.cls = 'text';
    } else {
      r.head = 'Free! Text him 💚'; r.cls = 'free';
      if (st.bothFree) { r.sub = "You're free too, " + K.name() + '. Call him? 📞'; r.chip = "You're both free!"; r.chipCls = 'go'; r.cls = 'both'; }
      else if (st.herLeaf) r.sub = "You're at " + st.herLeaf.title.toLowerCase() + ', so text him after 😘';
      if (st.until && st.nextStatus !== 'unknown') r.sub += (r.sub ? ' · ' : '') + 'Free until ' + K.herTime(st.until);
    }
    return r;
  };
  K.statusShort = function () {
    var r = K.status(), st = r.st;
    if (r.override) return { text: r.head, cls: 'text' };
    if (st.kind === 'busy') return { text: r.head.replace(/^\S+ /, '') + (st.until ? ' · back at ' + K.herTime(st.until) : ''), cls: 'busy' };
    if (st.kind === 'text') return { text: (st.leaf.now || st.leaf.title) + ' · text him! 💬', cls: 'text' };
    if (st.kind === 'free') return { text: st.bothFree ? "You're both free! Call him? 💚" : 'Free! Text him 💚', cls: 'free' };
    return { text: r.chip ? r.chip : r.head, cls: 'unknown' };
  };

  // ------------------------------------------------------------ gifts (points OR date, or a surprise unlock)
  // Nightly call points, worked out from the settings (no server needed). Each night counts once its time has passed.
  K.autoAwards = function () {
    var a = DB.state.autoPoints;
    if (!a || !a.on || !a.time) return [];
    var z = a.zone || 'Asia/Singapore', hm = String(a.time).split(':'), now = T.now(), since = +a.since || 0, skipped = a.skipped || [], out = [];
    var d = T.startOfDay(Math.max(since, now - 400 * T.DAY), z);
    for (var i = 0; i < 420 && d <= now; i++, d = T.addDays(d, 1, z)) {
      var p = T.parts(d + 12 * T.HOUR, z), at = T.wall(p.y, p.m, p.d, +hm[0], +hm[1], z), key = T.dayKey(at, z);
      if (at > since && at <= now && skipped.indexOf(key) === -1) out.push({ amt: +a.amount || 0, reason: a.reason || '', at: at, auto: true, key: key });
    }
    return out;
  };
  // ---- daily check-ins + streak (days are Barcelona days)
  K.todayKey = function () { return T.dayKey(T.now(), HZ); };
  K.checkinDays = function () {
    var seen = {}, out = [];
    (DB.her.checkins || []).forEach(function (c) { if (!seen[c.day]) { seen[c.day] = 1; out.push(c); } });
    return out.sort(function (a, b) { return a.day < b.day ? -1 : 1; });
  };
  K.checkedInToday = function () { var t = K.todayKey(); return K.checkinDays().some(function (c) { return c.day === t; }); };
  function prevDay(key) { var p = key.split('-').map(Number); var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] - 1)); return d.toISOString().slice(0, 10); }
  K.streak = function () {
    var set = {}; K.checkinDays().forEach(function (c) { set[c.day] = 1; });
    var d = K.todayKey(); if (!set[d]) d = prevDay(d);
    var n = 0; while (set[d]) { n++; d = prevDay(d); }
    return n;
  };
  K.bestStreak = function () {
    var best = 0, run = 0, last = null;
    K.checkinDays().forEach(function (c) { run = (last && prevDay(c.day) === last) ? run + 1 : 1; last = c.day; best = Math.max(best, run); });
    return best;
  };
  // Points she earns by checking in: perDay each day, plus weekBonus on every 7th day in a row
  K.checkinCfg = function () { return Object.assign({ on: true, perDay: 5, extra: 1, extraMax: 5, weekBonus: 10, since: 0 }, DB.state.checkinPoints || {}); };
  // How many extra check-ins (after the first) she has done today
  K.extrasToday = function () { var t = K.todayKey(); return Math.max(0, (DB.her.checkins || []).filter(function (c) { return c.day === t; }).length - 1); };
  K.checkinAwards = function () {
    var cfg = K.checkinCfg();
    if (!cfg.on) return [];
    var out = [], run = 0, last = null, extras = {};
    K.checkinDays().forEach(function (c) {          // first check-in of each day (+ streak bonus)
      run = (last && prevDay(c.day) === last) ? run + 1 : 1; last = c.day;
      if (c.at <= (+cfg.since || 0)) return;
      if (+cfg.perDay) out.push({ amt: +cfg.perDay, reason: 'Daily check-in ✅', at: c.at, self: true });
      if (+cfg.weekBonus && run % 7 === 0) out.push({ amt: +cfg.weekBonus, reason: run + '-day streak bonus 🔥', at: c.at + 1, self: true });
    });
    var firsts = {}; K.checkinDays().forEach(function (c) { firsts[c.day] = c.at; });
    (DB.her.checkins || []).slice().sort(function (a, b) { return a.at - b.at; }).forEach(function (c) {   // extra check-ins
      if (c.at === firsts[c.day] || c.at <= (+cfg.since || 0) || !+cfg.extra) return;
      extras[c.day] = (extras[c.day] || 0) + 1;
      if (extras[c.day] <= +cfg.extraMax) out.push({ amt: +cfg.extra, reason: 'Extra check-in 💚', at: c.at, self: true });
    });
    return out;
  };
  // Points she earns from things she does: finding every Christmas secret (30), catching things (max per day), Wordle wins
  K.catchCfg = function () { return Object.assign({ on: true, daily: 50, minGap: 120, maxGap: 240 }, DB.state.catchCfg || {}); };
  K.herAwards = function () {
    var her = DB.her, out = [];
    if ((her.xmasKey || {}).got) out.push({ amt: 30, reason: 'Found every Christmas secret 🔎🎄', at: her.xmasKey.got, self: true });
    var cap = +K.catchCfg().daily || 50, perDay = {};
    (her.catches || []).slice().sort(function (a, b) { return a.at - b.at; }).forEach(function (c) {
      var d = T.dayKey(c.at, HZ), left = cap - (perDay[d] || 0), amt = Math.max(0, Math.min(+c.amt || 0, left));
      if (!amt) return; perDay[d] = (perDay[d] || 0) + amt;
      out.push({ amt: amt, reason: 'Caught ' + (c.name || 'something'), at: c.at, self: true, catch: true });
    });
    (her.wordleHist || []).forEach(function (w) { if (w.won && +w.reward) out.push({ amt: +w.reward, reason: 'Solved the Wordle "' + String(w.word || '').toUpperCase() + '" 🟩', at: w.at, self: true }); });
    return out;
  };
  K.caughtToday = function () { var d = K.todayKey(); return K.herAwards().filter(function (a) { return a.catch && T.dayKey(a.at, HZ) === d; }).reduce(function (s, a) { return s + a.amt; }, 0); };
  K.pointsLog = function () {
    return (DB.state.pointsLog || []).concat(K.autoAwards(), K.checkinAwards(), K.scheduledPoints(), K.herAwards()).sort(function (x, y) { return x.at - y.at; });
  };
  K.earned = function () { return (DB.state.points || 0) + K.autoAwards().concat(K.checkinAwards(), K.scheduledPoints(), K.herAwards()).reduce(function (a, x) { return a + x.amt; }, 0); };
  // Points she can spend = points given (by hand + nightly) − points spent on presents
  K.spent = function () { var b = DB.her.bought || {}; return Object.keys(b).reduce(function (a, k) { return a + (+b[k] || 0); }, 0); };
  K.balance = function () { return Math.max(0, K.earned() - K.spent()); };
  // ------------------------------------------------------------ questions he asks her
  K.questions = function () {
    var q = DB && DB.state.questions; q = (q && q.length) ? q : (window.QUESTIONS || []);
    q = q.concat(K.scheduled ? K.scheduled('question').map(function (x) { return Object.assign({ id: x.id, at: x.at }, x.data); }) : []);
    return q.map(function (x) {
      var at = 0, until = 0;
      try { at = typeof x.at === 'number' ? x.at : x.at ? T.parse(x.at, HZ) : 0; } catch (e) { /* */ }
      try { until = typeof x.until === 'number' ? x.until : x.until ? T.parse(x.until, HZ) : 0; } catch (e) { /* */ }
      return Object.assign({}, x, { atMs: at, untilMs: until, answer: ((DB && DB.her.answers) || {})[x.id] || null });
    });
  };
  K.qText = function (q) { return String(q.text || '').replace(/\{name\}/g, K.petName ? K.petName() : 'baby'); };

  // ------------------------------------------------------------ question of the day (shared by Home and admin)
  var QBANK = [
    'What\'s one small thing that made you smile today?', 'Where should our first trip together be?', 'What\'s your favourite memory of us so far?',
    'If we could have dinner anywhere tonight, where would it be?', 'What song reminds you of me?', 'What\'s something you\'ve never told me?',
    'What do you want to do the first day we\'re together again?', 'What\'s the best thing that happened this week?', 'What are you looking forward to most this month?',
    'What\'s a habit of mine you secretly love?', 'If you could teleport for one hour, what would we do?', 'What made you laugh the hardest recently?',
    'What\'s your comfort food when you miss me?', 'Describe our dream home in three words.', 'What\'s one thing you\'re proud of today?',
    'Which movie should we watch next together?', 'What would your perfect lazy Sunday look like?', 'What\'s a goal you want us to do together?',
    'What\'s the cutest thing I\'ve ever done?', 'If today had a colour, what would it be and why?', 'What do you miss most about me right now?'
  ];
  K.QBANK = QBANK;
  K.qotdFor = function (day) {
    var q = DB.her.qotd || {}, d = (q.days || {})[day];
    if (d && d.q) return d.q;
    if ((q.plan || {})[day]) return q.plan[day];
    var p = day.split('-').map(Number), n = Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / 864e5);
    return QBANK[n % QBANK.length];
  };

  K.gifts = function () {
    var st = DB.state, her = DB.her, now = T.now(), bal = K.balance();
    var src = st.gifts ? Object.keys(st.gifts).map(function (k) { return Object.assign({ id: k }, st.gifts[k]); }) : (window.GIFTS || []).map(function (g, i) { return Object.assign({ order: i }, g); });
    var list = src.map(function (g) {
      var at = g.reveal ? T.parse(g.reveal, HZ) : null, cost = +g.points || 0;
      var byDate = !!(at && now >= at), byPts = !!(her.bought || {})[g.id], byKey = (her.xmasKey || {}).used === g.id;
      var wasOpened = !!(her.opened || {})[g.id];
      var unlocked = !!(g.forceOpen || byDate || byPts || byKey || wasOpened);
      return Object.assign({}, g, { at: at, cost: cost, unlocked: unlocked, canBuy: !unlocked && cost > 0 && bal >= cost, opened: unlocked && !!(her.opened || {})[g.id], why: g.forceOpen ? 'surprise' : byKey ? 'key' : byPts ? 'points' : byDate ? 'date' : '' });
    });
    list.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    list.forEach(function (g, i) { g.n = i + 1; });
    return list;
  };
  K.nextGift = function () {
    var locked = K.gifts().filter(function (g) { return !g.unlocked; });
    if (!locked.length) return null;
    var pts = K.balance();
    locked.sort(function (a, b) {
      var ka = a.cost ? a.cost - pts : Infinity, kb = b.cost ? b.cost - pts : Infinity;
      return ka !== kb ? ka - kb : (a.at || Infinity) - (b.at || Infinity);
    });
    return locked[0];
  };

  // ------------------------------------------------------------ countdowns
  K.countdowns = function () {
    var M = K.model, S = window.SCHEDULE, now = T.now(), out = [];
    if (M.leaveAt && now < M.leaveAt) out.push({ id: 'leave', emoji: '✈️', label: S.leaveLabel || 'Chengxuan leaves in', at: M.leaveAt, hours: true });
    var w = M.windows.find(function (x) { return x.end > now; });
    if (w) {
      if (w.start <= now) out.push({ id: 'both', emoji: '💚', label: "You're both free right now! Time left", at: w.end, live: true, sub: 'Until ' + K.herDateTime(w.end) });
      else out.push({ id: 'both', emoji: '💚', label: "Next time you're both free", at: w.start, sub: K.herDateTime(w.start) + ' · lasts ' + T.dur(w.end - w.start) });
    }
    if (now < M.homeAt) out.push({ id: 'home', emoji: '🏡', label: 'Chengxuan is home in', at: M.homeAt });
    (DB.state.countdowns || []).forEach(function (c) {
      var at = T.parse(c.at, HZ);
      if (at > now) out.push({ id: c.id, emoji: c.emoji || '⭐', label: c.label, at: at, custom: true });
    });
    K.gifts().forEach(function (g) {
      if (!g.unlocked && g.at && g.at > now) out.push({ id: 'gift-' + g.id, emoji: '🎁', label: 'Present #' + g.n + ' unwraps in', at: g.at, gift: true });
    });
    out.forEach(function (c) { if (!c.sub) c.sub = K.herDateTime(c.at); });
    out.sort(function (a, b) { return a.at - b.at; });
    return out;
  };
  K.featured = function () {
    var list = K.countdowns(), f = DB.state.featured || 'auto', now = T.now();
    var byId = function (id) { return list.find(function (c) { return c.id === id; }); };
    if (f === 'gift-next') { var g = list.find(function (c) { return c.gift; }); if (g) return g; }
    else if (f !== 'auto' && byId(f)) return byId(f);
    var both = byId('both');
    return byId('leave') || (both && (both.live || both.at - now < 6 * T.HOUR) ? both : null) || byId('home') ||
      list.find(function (c) { return c.custom; }) || list[0] || null;
  };
  K.fmtCountdown = function (c) { var ms = c.at - T.now(); return c.hours ? T.hoursLeft(ms) : T.countdown(ms); };
  K.bigCountdown = function (el) {
    function draw() {
      var c = K.featured();
      if (!c) { el.innerHTML = '<div class="big-cd"><div class="label">Nothing to count down right now 🥝</div><a class="all" href="countdowns.html">All countdowns →</a></div>'; return; }
      if (el.dataset.cid !== c.id) {
        el.dataset.cid = c.id;
        el.innerHTML = '<div class="big-cd' + (c.live ? ' live' : '') + '"><div class="label">' + K.esc(c.emoji + ' ' + c.label) + '</div>' +
          '<div class="digits"></div><div class="sub">' + K.esc(c.sub) + '</div><a class="all" href="countdowns.html">All countdowns →</a></div>';
      }
      el.querySelector('.digits').textContent = K.fmtCountdown(c);
    }
    draw(); setInterval(draw, 1000); DB.subscribe(function () { el.dataset.cid = ''; draw(); });
  };


  // ------------------------------------------------------------ "I miss you" button (Home + Fun)
  K.missButton = function () {
    var btn = K.$('#miss-btn'); if (!btn || !DB.user) return;
    var mh = K.$('#miss-h'); if (mh) mh.textContent = 'Missing him, ' + K.petName() + '? 🥺';
    var reactions = [
      'Aww, he misses you more 🥺💚', 'Sending a kiwi hug across ~11,000 km 🥝🤗', 'Boop! That one reached Singapore 📮',
      'The kiwi bird is blushing 😳', 'Counting down till he can hug you instead 🫂', "Okay that's so cute I can't 😭",
      'He misses you too, cutie. Text him! 📱', 'Kiwi courier dispatched with 1 (one) kiss 💋', 'Every tap = one more reason for him to come see you 💚',
      'His heart just did a little wiggle 💃', 'Noted. Filed under: things that make his day ⭐'
    ];
    function show() {
      var n = DB.her.missCount || 0;
      K.$('#miss-count').textContent = n;
      K.$('#miss-label').textContent = n === 1 ? "time you've missed him" : "times you've missed him";
    }
    show(); DB.subscribe(show);
    var lastR = -1;
    btn.addEventListener('click', function (e) {
      var n = (DB.her.missCount || 0) + 1;
      DB.setHer({ missCount: n });
      K.logEvent('🥺', 'Pressed "I miss you"', 'miss');
      var i; do { i = Math.floor(Math.random() * reactions.length); } while (i === lastR); lastR = i;
      K.$('#miss-react').textContent = n % 25 === 0 ? n + " times?! Okay, he's booking a flight 🛫💚" : reactions[i];
      var c = K.$('#miss-count'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake');
      var r = e.currentTarget.getBoundingClientRect();
      ['💚', '🥝', '💗', '🥝', '💚'].forEach(function (em, k) {
        var s = document.createElement('span'); s.className = 'floaty'; s.textContent = em;
        s.style.left = (r.left + r.width / 2 - 12 + (k - 2) * 14) + 'px'; s.style.top = (r.top - 10) + 'px';
        s.style.setProperty('--dx', ((Math.random() - 0.5) * 120) + 'px'); s.style.setProperty('--rot', ((Math.random() - 0.5) * 60) + 'deg');
        s.style.animationDelay = (k * 60) + 'ms';
        document.body.appendChild(s); setTimeout(function () { s.remove(); }, 1800);
      });
      if (n % 10 === 0) K.confetti({ count: 60 });
    });
  };

  // ------------------------------------------------------------ moods (check-in)
  K.MOODS = [
    ['amazing', '😍', 'Amazing'], ['happy', '😊', 'Happy'], ['okay', '😐', 'Okay'], ['tired', '😴', 'Tired'],
    ['stressed', '😤', 'Stressed'], ['sad', '😢', 'Sad'], ['sick', '🤒', 'Sick'], ['missing', '🥺', 'Missing you']
  ];
  K.moodInfo = function (id) { return K.MOODS.find(function (m) { return m[0] === id; }) || ['?', '💭', id]; };
  K.lastMood = function () { var m = DB.her.moods || []; return m.length ? m[m.length - 1] : null; };

  // ------------------------------------------------------------ check-in pop-up (Livina)
  K.checkinModal = function () {
    var done = K.checkedInToday(), st = K.streak(), hour = T.parts(T.now(), HZ).h;
    var greet = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    var cfg = K.checkinCfg();
    var nextRun = st + (done ? 0 : 1), bonusToday = !done && cfg.on && +cfg.weekBonus && nextRun % 7 === 0;
    var extrasLeft = Math.max(0, +cfg.extraMax - K.extrasToday()), extraPts = done && cfg.on && +cfg.extra && extrasLeft > 0;
    var sh = K.modal('<div class="em">' + (hour < 5 || hour >= 20 ? '🌙' : '☀️') + '</div>' +
      '<h3>' + greet + ', ' + K.esc(K.petName()) + '!</h3>' +
      '<p class="desc">' + (done ? (extraPts ? 'Checking in again? Tell him how you\'re doing 💚' : 'You\'ve done all your check-ins today ✓ You can still update how you\'re feeling.') : 'Check in for today. How\'s your day going?') + '</p>' +
      '<div class="ck-streak">' + (st ? '🔥 <b>' + st + '-day streak</b>' + (done ? '' : '. Keep it going!') : '🔥 Start a streak today!') + '</div>' +
      '<div class="moods">' + K.MOODS.map(function (m) { return '<button type="button" class="mood" data-mood="' + m[0] + '"><span class="e">' + m[1] + '</span><span>' + m[2] + '</span></button>'; }).join('') + '</div>' +
      '<input class="field" id="ck-note" maxlength="300" placeholder="Anything you want to tell him? (optional)" style="margin-top:10px;font-size:1rem">' +
      '<button type="button" class="btn big" id="ck-go" style="margin-top:12px">' + (done ? (extraPts ? 'Check in again ✅ (+' + cfg.extra + ' ⭐)' : 'Update my mood 💚') : 'Check in ✅' + (cfg.on && +cfg.perDay ? ' (+' + (+cfg.perDay + (bonusToday ? +cfg.weekBonus : 0)) + ' ⭐)' : '')) + '</button>' +
      (done && extraPts ? '<p class="help" style="text-align:center;margin-top:6px">' + extrasLeft + ' extra check-in' + (extrasLeft === 1 ? '' : 's') + ' with points left today</p>' : ''), 'checkin-sheet');
    var picked = null;
    sh.querySelector('.moods').addEventListener('click', function (e) {
      var b = e.target.closest('[data-mood]'); if (!b) return;
      picked = picked === b.dataset.mood ? null : b.dataset.mood;
      sh.querySelectorAll('.mood').forEach(function (x) { x.classList.toggle('picked', x.dataset.mood === picked); });
    });
    sh.querySelector('#ck-go').addEventListener('click', function () {
      var note = sh.querySelector('#ck-note').value.trim();
      if (done && !extraPts && !picked && !note) { K.closeModal(); return; }
      var patch = {}, now = Date.now();
      if (!done || extraPts) patch.checkins = (DB.her.checkins || []).concat([{ day: K.todayKey(), at: now }]).slice(-1500);
      if (picked || note) patch.moods = (DB.her.moods || []).concat([{ mood: picked || 'okay', note: note, at: now }]).slice(-60);
      DB.setHer(patch);
      var mi = picked ? K.moodInfo(picked) : null;
      K.logEvent('✅', (done ? 'Checked in again' : 'Daily check-in') + (mi ? ' · feeling ' + mi[1] + ' ' + mi[2] : '') + (note ? ' · "' + note + '"' : ''));
      K.closeModal();
      if (!done) {
        var ns = K.streak();
        K.toast(bonusToday ? '🔥 ' + ns + '-day streak! Bonus +' + cfg.weekBonus + ' ⭐' : 'Checked in! ' + (cfg.on && +cfg.perDay ? '+' + cfg.perDay + ' ⭐ · ' : '') + '🔥 ' + ns + '-day streak');
        K.confetti({ count: bonusToday ? 140 : 70 });
      } else if (extraPts) { K.toast('Checked in again! +' + cfg.extra + ' ⭐'); K.confetti({ count: 40 }); }
      else K.toast('Sent to Chengxuan 💚');
    });
  };

  // Shrink a photo so it fits in the database (max ~700 KB as JPEG)
  K.compressPhoto = function (file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1280, w = img.naturalWidth, h = img.naturalHeight, out = null;
        for (var tries = 0; tries < 6 && !out; tries++) {
          var k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas');
          c.width = Math.round(w * k); c.height = Math.round(h * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          for (var q = 0.85; q >= 0.45; q -= 0.1) { var d = c.toDataURL('image/jpeg', q); if (d.length < 700000) { out = d; break; } }
          max = Math.round(max * 0.75);
        }
        URL.revokeObjectURL(url);
        out ? resolve(out) : reject(new Error('too big'));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
      img.src = url;
    });
  };


  // ------------------------------------------------------------ modal (bottom sheet)
  var sheetBack = null, sheetTick = null;
  K.modal = function (html, cls, tick) {
    if (!sheetBack) {
      sheetBack = document.createElement('div');
      sheetBack.className = 'sheet-back';
      sheetBack.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"></div>';
      document.body.appendChild(sheetBack);
      sheetBack.addEventListener('click', function (e) { if (e.target === sheetBack || e.target.closest('.x')) K.closeModal(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') K.closeModal(); });
      setInterval(function () { if (sheetTick) sheetTick(); }, 1000);
    }
    var sh = sheetBack.firstChild;
    sh.className = 'sheet ' + (cls || '');
    sh.innerHTML = '<button type="button" class="x" aria-label="Close">✕</button>' + html;
    sheetBack.classList.add('open');
    sheetTick = tick || null; if (sheetTick) sheetTick();
    return sh;
  };
  // Styled "are you sure?" card. opts: { emoji, title, text, yes, danger, typeWord }. Resolves true/false.
  K.confirm = function (opts) {
    return new Promise(function (resolve) {
      var done = false;
      var finish = function (v) { if (done) return; done = true; K.closeModal(); resolve(v); };
      var sh = K.modal('<div class="em">' + K.esc(opts.emoji || '🤔') + '</div><h3>' + K.esc(opts.title || 'Are you sure?') + '</h3>' +
        (opts.text ? '<p class="desc">' + K.esc(opts.text) + '</p>' : '') +
        (opts.typeWord ? '<label class="help">Type <b>' + K.esc(opts.typeWord) + '</b> to confirm<input class="field" id="cf-word" autocomplete="off" autocapitalize="characters"></label>' : '') +
        '<div class="btns" style="margin-top:14px"><button type="button" class="btn ' + (opts.danger ? 'danger' : '') + '" id="cf-yes"' + (opts.typeWord ? ' disabled style="opacity:.5"' : '') + '>' + K.esc(opts.yes || 'Yes') + '</button>' +
        '<button type="button" class="btn ghost" id="cf-no">' + K.esc(opts.no || 'Cancel') + '</button></div>', 'confirm');
      var yes = sh.querySelector('#cf-yes');
      if (opts.typeWord) sh.querySelector('#cf-word').addEventListener('input', function (e) {
        var ok = e.target.value.trim().toUpperCase() === opts.typeWord.toUpperCase(); yes.disabled = !ok; yes.style.opacity = ok ? 1 : .5;
      });
      yes.addEventListener('click', function () { finish(true); });
      sh.querySelector('#cf-no').addEventListener('click', function () { finish(false); });
      sh.querySelector('.x').addEventListener('click', function () { finish(false); });
      sh.parentNode.addEventListener('click', function h(e) { if (e.target === sh.parentNode) { sh.parentNode.removeEventListener('click', h); finish(false); } });
    });
  };
  K.closeModal = function () { if (sheetBack) sheetBack.classList.remove('open'); sheetTick = null; };
  K.isModalOpen = function () { return !!(sheetBack && sheetBack.classList.contains('open')); };
  // Pop-ups that shouldn't cover each other: shown one at a time, after whatever is open closes.
  var mq = [], mqT = null;
  K.queueModal = function (html, cls, after) {
    mq.push([html, cls, after]);
    if (!mqT) mqT = setInterval(function () {
      if (K.isModalOpen() || !mq.length) { if (!mq.length) { clearInterval(mqT); mqT = null; } return; }
      var m = mq.shift(); K.modal(m[0], m[1]); if (m[2]) try { m[2](); } catch (e) { /* */ }
    }, 600);
  };

  // ------------------------------------------------------------ chrome: top bar + bottom tabs
  var TABS = [
    ['home', 'index.html', '🏠', 'Home'],
    ['timers', 'countdowns.html', '⏳', 'Timers'],
    ['week', 'schedule.html', '📅', 'Week'],
    ['gifts', 'gifts.html', '🎁', 'Gifts'],
    ['fun', 'fun.html', '🎮', 'Fun']
  ];
  function chrome(page) {
    var u = DB.user;
    var top = document.createElement('header');
    top.className = 'topbar';
    top.innerHTML = '<a class="brand" href="index.html"><span class="brand-slice">' + K.sliceSVG() + '</span><span class="brand-txt">Kiwi Corner</span></a>' +
      '<div class="top-right">' + (K.standalone() ? '<button type="button" class="pill acct" id="refresh-btn" aria-label="Refresh">🔄</button>' : '') + (!u
        ? '<a class="pill pts-pill" href="login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() || 'index.html') + '">🔑 Log in</a>'
        : (u.role === 'admin' ? '<a class="pill admin-pill" href="admin.html">🔧<span class="ap-txt"> Admin</span><b id="admin-unread"></b></a>' : '') +
          '<a class="pill chat-pill" href="chat.html" aria-label="Chat">💬<b id="chat-unread"></b></a>' +
          '<a class="pill pts-pill" href="gifts.html" title="Your points">⭐ <b id="pts-count">0</b></a>' +
          '<button type="button" class="pill acct" id="acct" aria-label="Account">' + (u.role === 'admin' ? '🥝' : '🌸') + '</button>') +
      '</div>';
    document.body.insertBefore(top, document.body.firstChild);
    if (u && u.role === 'admin' && page !== 'admin' && !/[?&]mirror=1/.test(location.search)) {
      var pv = document.createElement('div'); pv.className = 'preview-bar';
      pv.innerHTML = '👀 <b>Her view</b> · just looking: nothing you open or tap here counts for her' + (page === 'fun' ? ' (except the movie list)' : '');
      top.after(pv);
    }
    if (page !== 'admin' && page !== 'chat' && page !== 'movie') {
      var nav = document.createElement('nav');
      nav.className = 'tabbar';
      nav.innerHTML = TABS.map(function (t) {
        return '<a href="' + t[1] + '" class="tab' + (t[0] === 'week' ? ' main' : '') + '"' + (t[0] === page || (page === 'clicker' && t[0] === 'fun') ? ' aria-current="page"' : '') + '><span class="ic">' + t[2] + '</span><span>' + t[3] + '</span></a>';
      }).join('');
      document.body.appendChild(nav);
      document.body.classList.add('has-tabs');
    }
    var rb = K.$('#refresh-btn'); if (rb) rb.addEventListener('click', K.refresh);
    if (!u) return;
    K.$('#acct').addEventListener('click', function () {
      K.modal('<div class="em">' + (u.role === 'admin' ? '🥝' : '🌸') + '</div><h3>Hi ' + K.esc(u.role === 'admin' ? u.name : K.petName()) + '!</h3>' +
        '<p class="desc">You\'re logged in' + (DB.mode === 'demo' ? ' (demo mode: saved on this device only)' : '') + '.</p>' +
        (u.role === 'admin' ? '<p><a class="btn" href="admin.html" style="text-decoration:none;display:inline-block">🔧 Open admin</a></p>' : '') +
        '<div class="btns" style="flex-direction:column;align-items:stretch">' +
          (K.pushState() === 'off' ? '<button type="button" class="btn" id="m-push">🔔 Turn on notifications</button>' : '') +
          '<button type="button" class="btn" id="m-refresh">🔄 Refresh (get the latest)</button>' +
          (K.standalone() ? '' : '<button type="button" class="btn pink" id="m-install">📱 Add to home screen</button>') +
          '<button type="button" class="btn brown" id="logout">Log out</button></div>' +
        (u.role === 'livina' && DB.state.themeChoice ? '<h3 style="margin-top:18px">🎨 Pick a theme</h3><div class="theme-pick">' + K.THEMES.map(function (t) {
          return '<button type="button" data-theme-pick="' + t[0] + '" aria-pressed="' + (K.theme() === t[0]) + '">' + t[1] + '</button>';
        }).join('') + '</div>' : ''));
      document.querySelectorAll('[data-theme-pick]').forEach(function (b) {
        b.addEventListener('click', function () {
          DB.setHer({ theme: b.dataset.themePick }); K.applyTheme();
          document.querySelectorAll('[data-theme-pick]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
          K.logEvent('🎨', 'Picked the ' + b.textContent + ' theme');
        });
      });
      K.$('#m-refresh').addEventListener('click', K.refresh);
      var mp = K.$('#m-push'); if (mp) mp.addEventListener('click', function () { K.closeModal(); K.enablePush(); });
      var mi = K.$('#m-install'); if (mi) mi.addEventListener('click', K.installHelp);
      K.$('#logout').addEventListener('click', function () { DB.logout().then(function () { location.href = 'login.html'; }); });
    });
    var showPts = function () {
      var el = K.$('#pts-count'); if (el) el.textContent = K.balance();
      var un = K.$('#admin-unread'); if (un) { var h = DB.her, seen = DB.state.seenAnswers || {};
        var n = (h.messages || []).filter(function (m) { return !(m.archived === true || (m.archived !== false && m.reply)); }).length +
          (h.guesses || []).filter(function (x) { return !x.verdict; }).length + (h.wishes || []).filter(function (x) { return !x.status; }).length +
          K.questions().filter(function (q) { return q.answer && seen[q.id] !== q.answer.at; }).length +
          (DB.herPhotos || []).filter(function (p) { return (p.status || 'pending') === 'pending'; }).length;
        un.textContent = n ? ' ' + n + '📥' : ''; }
    };
    showPts(); DB.subscribe(showPts); setInterval(showPts, 60000);
  }

  // ------------------------------------------------------------ drafts: nothing she types is ever lost
  // Anything typed (and not sent yet) is saved on the device and put back after a refresh,
  // and the auto-refresh waits while there's unsent text.
  var dirty = {};
  function draftKey(id) { return 'kiwi-draft:' + (document.body.dataset.page || '') + ':' + id; }
  function keepsDraft(el) { return el && el.id && /^(INPUT|TEXTAREA)$/.test(el.tagName) && !/^(password|number|time|color|datetime-local|hidden)$/.test(el.type) && document.body.dataset.page !== 'login'; }
  document.addEventListener('input', function (e) {
    var el = e.target; if (!keepsDraft(el)) return;
    dirty[el.id] = !!el.value.trim();
    if (document.body.dataset.page !== 'admin') K.store.set(draftKey(el.id), el.value);
  });
  function clearDraft(el) { if (el && el.id) { delete dirty[el.id]; try { localStorage.removeItem(draftKey(el.id)); } catch (x) { /* */ } } }
  // Sending a form clears its drafts
  document.addEventListener('submit', function (e) { e.target.querySelectorAll('input,textarea').forEach(clearDraft); }, true);
  // Admin: pressing a button in a card counts as "done" with that card's fields
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || document.body.dataset.page !== 'admin') return;
    var box = b.closest('.card, .item'); if (box) box.querySelectorAll('input,textarea').forEach(clearDraft);
  }, true);
  K.hasUnsent = function () { return Object.keys(dirty).some(function (k) { return dirty[k]; }); };
  K.restoreDrafts = function () {
    if (document.body.dataset.page === 'admin') return;
    document.querySelectorAll('input[id], textarea[id]').forEach(function (el) {
      if (!keepsDraft(el) || el.value) return;
      var v = K.store.get(draftKey(el.id), '');
      if (v) { el.value = v; dirty[el.id] = !!v.trim(); }
    });
  };
  // Warn before closing the tab with unsent text (browsers show their own "Leave site?" box)
  window.addEventListener('beforeunload', function (e) { if (K.hasUnsent() && !K._reloading) { e.preventDefault(); e.returnValue = ''; } });

  // ------------------------------------------------------------ home screen + refreshing
  var tEl, tT;
  K.toast = function (msg) {
    if (!tEl) { tEl = document.createElement('div'); tEl.className = 'toast'; document.body.appendChild(tEl); }
    tEl.textContent = msg; tEl.classList.add('show'); clearTimeout(tT); tT = setTimeout(function () { tEl.classList.remove('show'); }, 2600);
  };
  K.standalone = function () { return !!((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone); };
  // Re-download the site's own files (skipping the browser cache), then reload. Drafts are saved, so this is safe.
  K.refresh = function () {
    K._reloading = true;
    var urls = [location.pathname || 'index.html'].concat([].slice.call(document.querySelectorAll('script[src], link[rel=stylesheet][href]')).map(function (el) { return el.getAttribute('src') || el.getAttribute('href'); })
      .filter(function (u) { return u && !/^https?:/.test(u); }));
    Promise.all(urls.map(function (u) { return fetch(u, { cache: 'reload' }).catch(function () {}); })).then(function () { location.reload(); });
  };
  K.installHelp = function () {
    if (K.installPrompt) { K.closeModal(); K.installPrompt.prompt(); return; }
    var ua = navigator.userAgent, ios = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var steps = ios
      ? '<ol class="steps"><li>Open this site in <b>Safari</b></li><li>Tap the <b>Share</b> button ⬆️ (bottom of the screen)</li><li>Scroll and tap <b>"Add to Home Screen"</b></li><li>Tap <b>Add</b> 🥝</li></ol>'
      : /android/i.test(ua)
        ? '<ol class="steps"><li>Open this site in <b>Chrome</b></li><li>Tap <b>⋮</b> (top right)</li><li>Tap <b>"Add to Home screen"</b> or <b>"Install app"</b></li><li>Tap <b>Add</b> 🥝</li></ol>'
        : /Edg\//.test(ua)
          ? '<ol class="steps"><li>Click <b>⋯</b> (top right of Edge)</li><li>Go to <b>Apps</b> → <b>"Install this site as an app"</b></li><li>Click <b>Install</b> 🥝</li></ol><p class="muted">It gets its own window and a kiwi icon in your taskbar or dock.</p>'
          : /Chrome\//.test(ua)
            ? '<ol class="steps"><li>Click <b>⋮</b> (top right of Chrome)</li><li>Go to <b>"Cast, save and share"</b> → <b>"Install page as app"</b> (or click the install icon at the right end of the address bar)</li><li>Click <b>Install</b> 🥝</li></ol><p class="muted">It gets its own window and a kiwi icon in your dock or taskbar.</p>'
            : /Safari\//.test(ua)
              ? '<ol class="steps"><li>In Safari, click <b>File</b> (or the Share button ⬆️)</li><li>Click <b>"Add to Dock"</b></li><li>Click <b>Add</b> 🥝</li></ol><p class="muted">Then it opens from your Dock like an app.</p>'
              : '<p class="desc">Bookmark this page, or open it in Chrome or Edge and use "Install app" from the menu.</p>';
    var phone = /iphone|ipad|ipod|android/i.test(ua) || ios;
    K.modal('<div class="em">' + (phone ? '📱' : '💻') + '</div><h3>' + (phone ? 'Put Kiwi Corner on your home screen' : 'Put Kiwi Corner on your laptop') + '</h3>' + steps +
      (phone ? '<p class="muted">Then it opens like a real app with the kiwi icon.</p>' : '') + '<p class="muted">You can use it on your phone and laptop at the same time. Everything stays in sync.</p>');
  };

  // Auto-refresh: when a new version of the site is published, or after the app sat in the background a while.
  (function () {
    var loadedV = null, hiddenAt = 0;
    function safe() {
      var a = document.activeElement;
      return !K.isModalOpen() && !K.hasUnsent() && !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) && !document.querySelector('.game-over:not(.show)');
    }
    function check() {
      fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        if (!j || !j.v) return;
        if (loadedV === null) { loadedV = j.v; return; }
        if (j.v !== loadedV) {
          if (safe()) K.refresh();
          else if (!document.getElementById('update-bar')) {
            var b = document.createElement('button'); b.id = 'update-bar'; b.className = 'update-bar'; b.type = 'button';
            b.textContent = '✨ New update! Tap to refresh'; b.addEventListener('click', K.refresh); document.body.appendChild(b);
          }
        }
      }).catch(function () { /* offline */ });
    }
    check(); setInterval(check, 5 * 60000);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt > 30 * 60000 && safe()) { K.refresh(); return; }   // back after 30+ min: start fresh
      check();
    });
  })();

  // ------------------------------------------------------------ 📞 next call: he sets it in admin; a live countdown card on her Home + Week
  // Regular calls: every weekday (her time) at set times. He can switch it off. Default: on, 5:30 pm + 9:30 pm.
  K.callPlan = function () { return Object.assign({ on: true, days: [1, 2, 3, 4, 5], times: ['17:30', '21:30'], mins: 60 }, DB.state.callPlan || {}); };
  // Every call from now on (regular + extra), soonest first. Skipped regular ones are kept but marked, so admin can undo.
  K.upcomingCalls = function (days) {
    var cp = K.callPlan(), T = window.KiwiTime, now = Date.now(), out = [], skips = DB.state.callSkips || [];
    if (cp.on) {
      for (var i = 0; i < (days || 9); i++) {
        var day = T.startOfDay(now, K.HZ) + i * T.DAY + 12 * T.HOUR, p = T.parts(day, K.HZ);
        if (cp.days.indexOf(T.weekday(day, K.HZ)) === -1) continue;
        cp.times.forEach(function (t) {
          var hm = t.split(':'), at = T.wall(p.y, p.m, p.d, +hm[0], +hm[1], K.HZ), end = at + cp.mins * 60000;
          if (end > now) out.push({ at: at, end: end, mins: cp.mins, note: '', regular: true, skipped: skips.indexOf(at) !== -1 });
        });
      }
    }
    var extras = (DB.state.extraCalls || []).slice();
    var old = DB.state.nextCall; if (old && old.at) extras.push(Object.assign({ id: 'old' }, old));   // from before extra calls were a list
    extras.forEach(function (c) { var end = c.at + (c.mins || 60) * 60000; if (now <= end + 30 * 60000) out.push(Object.assign({ end: end, extra: true }, c)); });
    return out.sort(function (x, y) { return x.at - y.at; });
  };
  K.nextCall = function () {
    var now = Date.now();
    return K.upcomingCalls().filter(function (c) { return !c.skipped && (c.regular ? c.end > now : true); })[0] || null;
  };
  (function () {
    var el = document.getElementById('call-card'); if (!el) return;
    function draw() {
      var c = K.nextCall();
      if (!c || !DB.user) { el.hidden = true; return; }
      var now = Date.now(), ms = c.at - now, live = now >= c.at && now < c.end, over = now >= c.end;
      var d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), sec = Math.floor(ms % 6e4 / 1e3);
      var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
      var when = d > 0 ? d + 'd ' + h + 'h ' + p2(m) + 'm' : h > 0 ? h + 'h ' + p2(m) + 'm' : m + 'm ' + p2(sec) + 's';
      var her = KiwiTime.fmtDay(c.at, K.HZ) + ', ' + KiwiTime.fmtTime(c.at, K.HZ), his = KiwiTime.fmtTime(c.at, 'Asia/Singapore');
      el.classList.toggle('live', live);
      el.innerHTML = '<div class="call-ic" aria-hidden="true">📞</div><div class="call-body">' +
        '<div class="call-k">' + (live ? 'It\'s call time!' : over ? 'Call just ended' : 'Next call') + '</div>' +
        '<div class="call-big">' + (live ? 'Now 💚' : over ? 'Hope it was cute 🥰' : 'in ' + when) + '</div>' +
        '<div class="call-when">' + her + ' your time · ' + his + ' for him</div>' +
        (c.note ? '<div class="call-note">' + K.esc(c.note) + '</div>' : '') + '</div>';
      el.hidden = false;
    }
    draw(); setInterval(draw, 1000); DB.subscribe(draw);
  })();

  // ------------------------------------------------------------ "you got points!" notification (Livina only)
  var noticeOpen = false;
  function pointsNotice() {
    if (noticeOpen || K.isModalOpen()) return;
    var seen = DB.her.seenPoints || 0;
    if (!seen) { DB.setHer({ seenPoints: Date.now() }); return; }   // first visit: start fresh
    var fresh = K.pointsLog().filter(function (l) { return l.at > seen && !l.self; });
    if (!fresh.length) return;
    noticeOpen = true;
    var total = fresh.reduce(function (a, l) { return a + l.amt; }, 0);
    var rows = fresh.slice(-8).reverse().map(function (l) {
      return '<li><span>' + K.esc(l.reason || (l.amt > 0 ? 'Just because 💚' : 'Points taken away')) + '</span><span class="amt' + (l.amt < 0 ? ' neg' : '') + '">' + (l.amt > 0 ? '+' : '') + l.amt + ' ⭐</span></li>';
    }).join('');
    K.modal('<div class="em">' + (total >= 0 ? '⭐' : '🙈') + '</div><h3>' + (total >= 0 ? 'You got points, ' + K.petName() + '!' : 'Uh oh, ' + K.petName() + '…') + '</h3>' +
      '<p class="desc">' + (total >= 0 ? '+' : '') + total + ' ⭐ from Chengxuan. You now have <b>' + K.balance() + '</b>.</p>' +
      '<ul class="log">' + rows + '</ul><p style="margin-top:14px"><button type="button" class="btn" id="pn-go">' + (document.body.dataset.page === 'gifts' ? 'Yay! 💚' : 'See my presents 🎁') + '</button></p>', 'call');
    if (total > 0) K.confetti({ count: 90 });
    var saved = DB.setHer({ seenPoints: Date.now() });
    K.$('#pn-go').addEventListener('click', function () {
      K.closeModal();
      if (document.body.dataset.page === 'gifts') return;
      // wait until "seen" is saved so the pop-up doesn't come back on the Gifts page
      Promise.resolve(saved).catch(function () {}).then(function () { location.href = 'gifts.html'; });
    });
    setTimeout(function () { noticeOpen = false; }, 1500);
  }

  // ------------------------------------------------------------ scheduled actions (set up in admin, go live at their time; no server needed)
  // state.scheduled = [{ id, type, at, data }]. Everything below reads "due" items as if they had been sent at that moment.
  K.scheduled = function (type, all) {
    var now = T.now();
    return ((DB && DB.state.scheduled) || []).filter(function (s) { return (!type || s.type === type) && (all || s.at <= now); })
      .sort(function (a, b) { return a.at - b.at; });
  };
  function latestDue(type) { var l = K.scheduled(type); return l[l.length - 1] || null; }
  K.surprise = function () {
    var sp = DB.state.surprise, s = latestDue('surprise');
    var fromSched = s ? Object.assign({ active: true, id: s.id, at: s.at }, s.data) : null;
    if (!fromSched) return sp;
    return (!sp || !sp.active || (sp.at || 0) < fromSched.at) ? fromSched : sp;
  };
  K.banner = function () {
    var s = latestDue('banner');
    if (s && (!+s.data.hours || T.now() < s.at + s.data.hours * 3600e3) && s.at > (DB.state.bannerAt || 0)) return s.data.text || '';
    return DB.state.banner || '';
  };
  K.ping = function () {
    var p = DB.state.ping, s = latestDue('ping');
    var sp = s ? Object.assign({ id: s.id, at: s.at }, s.data) : null;
    return (sp && (!p || (p.at || 0) < sp.at)) ? sp : p;
  };
  K.scheduledPoints = function () { return K.scheduled('points').map(function (s) { return { amt: +s.data.amt || 0, reason: s.data.reason || '', at: s.at, sched: true }; }); };
  K.scheduledKiwis = function () { return K.scheduled('kiwis').map(function (s) { return { id: s.id, amount: +s.data.amount || 0, note: s.data.note || '', at: s.at }; }); };

  // ------------------------------------------------------------ themes
  K.THEMES = [
    ['kiwi', '🥝 Kiwi (normal)', ''], ['scrapbook', '✂️ Scrapbook', '🌼'], ['mochi', '🍡 Mochi', '✨'], ['zen', '🍃 Zen', '🍃'], ['christmas', '🎄 Christmas', '❄️']
  ];
  K.XMAS_SECRETS = 19;   // number of secrets in the Christmas room (xmas.js SECRETS)
  K.HATS = { christmas: '🎅', scrapbook: '🎀', mochi: '🍡', zen: '🍃' };
  // old saved themes (valentine, ocean…) were removed: anything unknown falls back to Kiwi
  function knownTheme(t) { return K.THEMES.some(function (x) { return x[0] === t; }) ? t : 'kiwi'; }
  K.adminTheme = function () {
    var s = latestDue('theme'), st = DB.state;
    if (s && s.at > (st.themeAt || 0)) return knownTheme(s.data.theme);
    return knownTheme(st.theme || 'kiwi');
  };
  K.theme = function () {
    if (DB.state.themeChoice && DB.user && DB.user.role === 'livina' && DB.her.theme) return knownTheme(DB.her.theme);
    return K.adminTheme();
  };
  var themeNow = null;
  // What each theme sprinkles on the screen: kind of particle, how many, and the strip at the top
  var THEME_FX = {
    christmas: { kind: 'snow', n: 110, ground: 'snow', tree: true },
    mochi: { kind: 'paper', n: 26, items: ['✦', '♡', '✿', '●', '✧'], cols: ['#ffb3cf', '#a8ecc6', '#c9b8ff', '#ffd59e', '#9fd8ff'] },
    zen: { kind: 'fall', n: 9, items: ['🍃', '🌿', '🍃'], slow: true },
    scrapbook: { kind: 'paper', n: 30, items: ['♡', '★', '✿', '♥', '✦'], cols: ['#ff9cb8', '#ffc21a', '#7cc576', '#8ec5ff', '#c9a7ff', '#ff8a5c'], tape: true }
  };
  function applyTheme() {
    var th = K.theme(); if (th === themeNow) return; themeNow = th;
    document.documentElement.dataset.theme = th;
    try { localStorage.setItem('kiwi-theme', th); } catch (e) { /* */ }   // so the next page load paints this theme instantly
    ['theme-fx', 'theme-fx-front', 'theme-strip', 'theme-ground'].forEach(function (id) { var o = document.getElementById(id); if (o) o.remove(); });
    document.querySelectorAll('.xmas-tree-home').forEach(function (t) { t.remove(); });
    try { document.dispatchEvent(new CustomEvent('kiwi:theme', { detail: th })); } catch (e) { /* */ }
    var meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--cream').trim() || '#FFF8E7';
    document.querySelectorAll('.mascot').forEach(function (m) { if (K.HATS[th]) m.setAttribute('data-hat', K.HATS[th]); else m.removeAttribute('data-hat'); });
    var cfg = THEME_FX[th]; if (!cfg || document.body.dataset.page === 'chat') return;
    // Two layers: almost everything falls BEHIND the cards and buttons; only a tiny few drift over the top.
    var back = document.createElement('div'); back.id = 'theme-fx'; back.className = 'tfx-' + cfg.kind; back.setAttribute('aria-hidden', 'true');
    var front = document.createElement('div'); front.id = 'theme-fx-front'; front.className = 'tfx-' + cfg.kind; front.setAttribute('aria-hidden', 'true');
    var n = Math.round(cfg.n * (innerWidth < 500 ? 0.7 : 1)), frontN = Math.max(2, Math.round(n * 0.05));
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i'), r = Math.random;
      p.style.left = (r() * 100) + '%';
      p.style.animationDuration = (cfg.kind === 'stars' ? 2 + r() * 3 : cfg.kind === 'snow' ? 7 + r() * 9 : 8 + r() * 10) + 's';
      p.style.animationDelay = (-r() * 18) + 's';
      if (cfg.kind === 'snow') { var sz = 4 + r() * 9; p.style.width = p.style.height = sz + 'px'; p.style.opacity = 0.55 + r() * 0.45; p.style.setProperty('--drift', (r() * 60 - 30) + 'px'); if (r() < 0.28) { p.textContent = '❄️'; p.className = 'flake'; p.style.fontSize = (14 + r() * 16) + 'px'; } }
      else if (cfg.kind === 'confetti') { if (r() < 0.2) { p.textContent = cfg.items[Math.floor(r() * cfg.items.length)]; p.className = 'emo'; p.style.fontSize = (16 + r() * 12) + 'px'; } else { p.style.background = ['#ff6f91', '#ffb703', '#8EE000', '#38b6d8', '#9b8cff'][Math.floor(r() * 5)]; p.style.setProperty('--spin', (r() * 720 - 360) + 'deg'); } }
      else if (cfg.kind === 'bubble') { var bs = 6 + r() * 18; p.style.width = p.style.height = bs + 'px'; }
      else if (cfg.kind === 'paper') { p.textContent = cfg.items[Math.floor(r() * cfg.items.length)]; p.style.color = cfg.cols[Math.floor(r() * cfg.cols.length)]; p.style.fontSize = (13 + r() * 15) + 'px'; p.style.setProperty('--drift', (r() * 120 - 60) + 'px'); p.style.animationDuration = (10 + r() * 10) + 's'; }
      else if (cfg.kind === 'stars') { p.style.top = (r() * 100) + '%'; var ss = 2 + r() * 3; p.style.width = p.style.height = ss + 'px'; if (r() < 0.15) { p.textContent = '✨'; p.className = 'emo'; p.style.fontSize = (10 + r() * 10) + 'px'; } }
      else { p.textContent = cfg.items[Math.floor(r() * cfg.items.length)]; p.style.fontSize = (14 + r() * 14) + 'px'; p.style.setProperty('--drift', (r() * 120 - 60) + 'px'); if (cfg.slow) { p.style.animationDuration = (18 + r() * 14) + 's'; p.style.opacity = .55; } }
      (i < frontN ? front : back).appendChild(p);
    }
    var fx = back;
    document.body.appendChild(front);
    document.body.appendChild(fx);
    if (cfg.strip && document.body.dataset.page !== 'admin') {
      var st = document.createElement('div'); st.id = 'theme-strip'; st.setAttribute('aria-hidden', 'true');
      st.innerHTML = '<span>' + cfg.strip + ' ' + cfg.strip + '</span>';
      var top = document.querySelector('.topbar'); if (top) top.after(st); else document.body.prepend(st);
    }
    // 🎅 Christmas Eve takeover (Dec 24, her time): night sky, banner, Santa flying over every page
    var eve = th === 'christmas' && (K.todayKey().slice(5) === '12-24' || (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]eve=1/.test(location.search)));
    document.documentElement.classList.toggle('xmas-eve', !!eve);
    ['eve-banner', 'eve-santa'].forEach(function (id) { var o = document.getElementById(id); if (o) o.remove(); });
    clearInterval(applyTheme.santaT);
    if (eve && document.body.dataset.page !== 'admin') {
      var eb = document.createElement('div'); eb.id = 'eve-banner'; eb.className = 'eve-banner'; eb.innerHTML = '🎅 <b>It\'s Christmas Eve!</b> Santa is on his way to you… 🌙';
      var tb = document.querySelector('.topbar'); if (tb) tb.after(eb); else document.body.prepend(eb);
      var sn = document.createElement('div'); sn.id = 'eve-santa'; sn.className = 'eve-santa'; sn.setAttribute('aria-hidden', 'true'); sn.textContent = '🦌🦌🦌🛷🎅'; document.body.appendChild(sn);
      var fly = function () { sn.classList.remove('go'); void sn.offsetWidth; sn.style.top = (8 + Math.random() * 22) + 'vh'; sn.classList.add('go'); };
      setTimeout(fly, 2500); applyTheme.santaT = setInterval(fly, 30000);
    }
    var deco = K.homeDeco ? K.homeDeco(th) : (th === 'christmas' ? K.xmasTreeSVG() : '');
    var hero = document.querySelector('.hero');
    if (deco && hero) {
      var t = document.createElement(th === 'christmas' ? 'a' : 'div'); t.className = 'xmas-tree-home deco-' + th;
      if (th === 'christmas') { t.href = 'gifts.html#xmas'; t.setAttribute('aria-label', 'Go into the Christmas room'); t.innerHTML = deco + '<span class="deco-tip">tap me 🎄</span>'; } else { t.setAttribute('aria-hidden', 'true'); t.innerHTML = deco; }
      hero.appendChild(t);
    }
    // 🎄 Christmas extras: a string of swinging lights along the top, and a "step into the room" card on Home
    ['xmas-lights', 'xmas-home-card'].forEach(function (id) { var o = document.getElementById(id); if (o) o.remove(); });
    clearInterval(applyTheme.xhT);
    if (th === 'christmas' && document.body.dataset.page !== 'admin') {
      var cols = ['#ff5a5a', '#ffd77a', '#5ac8ff', '#ff8ad8', '#7dff9a'], bulbs = '';
      for (var b = 0; b < 16; b++) { var bx = 12 + b * 25, by = 6 + Math.sin(b / 15 * Math.PI) * 14; bulbs += '<g class="xl-bulb" style="transform-origin:' + bx + 'px ' + by + 'px;animation-delay:-' + (b * .37 % 3).toFixed(2) + 's"><rect x="' + (bx - 2) + '" y="' + by + '" width="4" height="5" fill="#3a3a3a"/><ellipse class="xl-glow" cx="' + bx + '" cy="' + (by + 11) + '" rx="4.5" ry="7" fill="' + cols[b % 5] + '" style="color:' + cols[b % 5] + ';animation-delay:' + (b * .21).toFixed(2) + 's"/></g>'; }
      var lt = document.createElement('div'); lt.id = 'xmas-lights'; lt.setAttribute('aria-hidden', 'true');
      lt.innerHTML = '<svg viewBox="0 0 400 34" preserveAspectRatio="none"><path d="M0 4 Q200 44 400 4" stroke="#2a4a2a" stroke-width="2" fill="none" vector-effect="non-scaling-stroke"/>' + bulbs + '</svg>';
      var tb2 = document.querySelector('.topbar'); if (tb2) tb2.after(lt); else document.body.prepend(lt);
      var hero2 = document.querySelector('.hero');
      if (hero2 && document.body.dataset.page === 'home' && DB.user) {
        var hc = document.createElement('a'); hc.id = 'xmas-home-card'; hc.className = 'card xh-card'; hc.href = 'gifts.html#xmas';
        var drawHC = function () {
          var found = Object.keys(((DB.dmMeta || {}).xmas || {}).found || {}).length, tot = K.XMAS_SECRETS || 19;
          var eve = window.KiwiTime.wall(new Date().getFullYear(), 12, 24, 0, 0, K.HZ), ms = eve - Date.now();
          var cd = ms > 0 ? Math.floor(ms / 864e5) + 'd ' + Math.floor(ms % 864e5 / 36e5) + 'h ' + Math.floor(ms % 36e5 / 6e4) + 'm' : 'it\'s Christmas! 🎄';
          hc.innerHTML = '<div class="xh-tree">' + K.xmasTreeSVG() + '</div><div class="xh-body"><div class="xh-k">Christmas Eve in</div><div class="xh-cd">' + cd + '</div>' +
            '<div class="xh-title">Step into the Christmas room</div><div class="xh-sub">the fire\'s crackling, the cat is asleep</div>' +
            '<div class="xh-sec"><span>🔑 secrets found</span><b>' + Math.min(found, tot) + ' / ' + tot + '</b></div><div class="xh-bar"><i style="width:' + Math.round(Math.min(found, tot) / tot * 100) + '%"></i></div>' +
            '<span class="xh-go">go inside →</span></div>';
        };
        drawHC(); applyTheme.xhT = setInterval(drawHC, 30000);
        hero2.after(hc);
      }
    }
    if (cfg.ground) { var g = document.createElement('div'); g.id = 'theme-ground'; g.className = 'tg-' + cfg.ground; g.setAttribute('aria-hidden', 'true'); document.body.appendChild(g); }
  }
  // ------------------------------------------------------------ Christmas: a decorated tree and a cozy fireplace scene (SVG + CSS animation)
  K.xmasTreeSVG = function () {
    var lights = '', orn = '', cols = ['#ff4d4d', '#ffd23f', '#4dc3ff', '#ff7ad9', '#7dff7a'];
    [[60, 52], [48, 70], [74, 74], [40, 96], [62, 92], [84, 100], [34, 122], [56, 118], [78, 124], [96, 128]].forEach(function (p, i) {
      lights += '<circle class="xl" cx="' + p[0] + '" cy="' + p[1] + '" r="3.2" fill="' + cols[i % 5] + '" style="animation-delay:' + (i * 0.23).toFixed(2) + 's"/>';
    });
    [[52, 60, '#d32f2f'], [70, 84, '#ffd23f'], [44, 108, '#1e88e5'], [88, 114, '#d32f2f'], [66, 106, '#e91e63'], [30, 132, '#ffd23f'], [74, 136, '#1e88e5']].forEach(function (o) {
      orn += '<circle cx="' + o[0] + '" cy="' + o[1] + '" r="5.5" fill="' + o[2] + '"/><circle cx="' + (o[0] - 1.8) + '" cy="' + (o[1] - 1.8) + '" r="1.6" fill="#fff" opacity=".7"/>';
    });
    return '<svg viewBox="0 0 120 170" class="xtree" aria-hidden="true">' +
      '<rect x="52" y="140" width="16" height="20" rx="2" fill="#7a4a2a"/>' +
      '<path d="M60 22 L98 70 L80 70 L108 108 L86 108 L114 146 L6 146 L34 108 L12 108 L40 70 L22 70 Z" fill="#1f8a44"/>' +
      '<path d="M60 22 L98 70 L80 70 L108 108 L86 108 L114 146 L60 146 Z" fill="#17703a" opacity=".55"/>' +
      '<path d="M26 96 Q60 110 96 92 M18 132 Q60 146 104 126 M38 64 Q60 74 84 62" stroke="#ffd23f" stroke-width="2" fill="none" stroke-dasharray="3 4" opacity=".9"/>' +
      orn + lights +
      '<g class="xstar"><path d="M60 6 L64.5 17 L76 17.5 L67 24.5 L70 36 L60 29.5 L50 36 L53 24.5 L44 17.5 L55.5 17 Z" fill="#ffd23f" stroke="#f5a700" stroke-width="1"/></g>' +
      '</svg>';
  };
  K.xmasScene = function (gifts) {
    gifts = gifts || [];
    // presents piled next to the fireplace, biggest at the bottom
    var boxes = '', slots = [[20, 168, 46, 34], [68, 172, 38, 30], [108, 170, 42, 32], [36, 136, 36, 30], [78, 140, 34, 28], [56, 110, 30, 26], [118, 142, 30, 26], [6, 146, 28, 22]];
    gifts.slice(0, slots.length).forEach(function (g, i) {
      var sl = slots[i], x = sl[0], y = sl[1], w = sl[2], h = sl[3], wrap = g.color || '#d32f2f', rib = g.ribbon || '#ffd23f';
      var lid = g.opened ? '<rect x="' + (x - 3) + '" y="' + (y - h - 14) + '" width="' + (w + 6) + '" height="8" rx="2" fill="' + wrap + '" transform="rotate(-18 ' + (x + w / 2) + ' ' + (y - h) + ')"/>' : '<rect x="' + (x - 3) + '" y="' + (y - h - 2) + '" width="' + (w + 6) + '" height="8" rx="2" fill="' + wrap + '" stroke="rgba(0,0,0,.12)"/>';
      boxes += '<g class="xbox' + (g.opened ? ' open' : g.unlocked ? ' ready' : '') + '" data-gift="' + K.esc(g.id) + '" tabindex="0" role="button" aria-label="Present ' + g.n + '">' +
        '<rect x="' + x + '" y="' + (y - h) + '" width="' + w + '" height="' + h + '" rx="3" fill="' + wrap + '" stroke="rgba(0,0,0,.15)"/>' +
        '<rect x="' + (x + w / 2 - 3) + '" y="' + (y - h) + '" width="6" height="' + h + '" fill="' + rib + '"/>' + lid +
        (g.opened ? '<text x="' + (x + w / 2) + '" y="' + (y - h - 8) + '" font-size="12" text-anchor="middle">✨</text>' : '<path d="M' + (x + w / 2) + ' ' + (y - h - 2) + ' q-9 -10 -12 -2 q4 5 12 2 q9 -10 12 -2 q-4 5 -12 2" fill="' + rib + '"/>') +
        '<text x="' + (x + w / 2) + '" y="' + (y - h / 2 + 4) + '" font-size="11" font-weight="700" text-anchor="middle" fill="#fff" style="paint-order:stroke" stroke="rgba(0,0,0,.35)" stroke-width="2">' + g.n + '</text></g>';
    });
    return '<div class="xscene" aria-label="Christmas scene with your presents">' +
      '<svg viewBox="0 0 400 230" class="xroom">' +
        '<defs><radialGradient id="xglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb347" stop-opacity=".75"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="xfloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a86b45"/><stop offset="1" stop-color="#7a4a2a"/></linearGradient>' +
        '<pattern id="xbrick" width="24" height="12" patternUnits="userSpaceOnUse"><rect width="24" height="12" fill="#b5523b"/><path d="M0 11.5 H24 M12 0 V6 M0 6 H24 M0 6 V12 M24 6 V12" stroke="#8e3b29" stroke-width="1.2"/></pattern></defs>' +
        '<rect width="400" height="230" fill="#3b2a4d"/>' +
        '<rect width="400" height="178" fill="#5a3f6e"/>' +
        '<path d="M0 0 H400 V30 H0 Z" fill="#4a3360"/>' +
        // window with snow outside
        '<g><rect x="300" y="34" width="70" height="62" rx="6" fill="#1b2a4a" stroke="#f3e6d0" stroke-width="5"/><path d="M335 34 V96 M300 65 H370" stroke="#f3e6d0" stroke-width="4"/>' +
          '<g class="xwsnow"><circle cx="310" cy="45" r="1.6" fill="#fff"/><circle cx="325" cy="58" r="1.3" fill="#fff"/><circle cx="350" cy="44" r="1.8" fill="#fff"/><circle cx="360" cy="75" r="1.4" fill="#fff"/><circle cx="318" cy="84" r="1.7" fill="#fff"/><circle cx="345" cy="88" r="1.3" fill="#fff"/></g>' +
          '<circle cx="355" cy="50" r="7" fill="#fff6c9" opacity=".9"/></g>' +
        // floor + rug
        '<rect y="178" width="400" height="52" fill="url(#xfloor)"/>' +
        '<ellipse cx="200" cy="205" rx="120" ry="16" fill="#b8323a" opacity=".85"/><ellipse cx="200" cy="205" rx="104" ry="11" fill="none" stroke="#ffd23f" stroke-dasharray="4 5" opacity=".7"/>' +
        // fireplace
        '<ellipse class="xfloorglow" cx="200" cy="186" rx="110" ry="26" fill="url(#xglow)"/>' +
        '<rect x="120" y="70" width="160" height="110" fill="url(#xbrick)" rx="4"/>' +
        '<rect x="108" y="62" width="184" height="16" rx="4" fill="#f3e6d0"/><rect x="112" y="76" width="176" height="4" fill="#d9c7aa"/>' +
        '<path d="M150 180 V122 Q150 102 170 102 H230 Q250 102 250 122 V180 Z" fill="#1d1414"/>' +
        '<g class="xfire">' +
          '<path class="xf f1" d="M168 176 Q160 150 178 130 Q176 148 188 154 Q186 132 200 116 Q204 140 214 146 Q216 132 226 128 Q240 152 232 176 Z" fill="#ff7b1c"/>' +
          '<path class="xf f2" d="M176 176 Q172 156 186 142 Q186 156 196 160 Q196 142 206 132 Q210 150 218 154 Q228 160 224 176 Z" fill="#ffb21c"/>' +
          '<path class="xf f3" d="M186 176 Q184 164 194 154 Q196 164 202 166 Q204 154 210 150 Q216 162 214 176 Z" fill="#ffe07a"/>' +
        '</g>' +
        '<g class="xembers"><circle cx="190" cy="150" r="1.6" fill="#ffd23f"/><circle cx="206" cy="146" r="1.3" fill="#ff9a3c"/><circle cx="214" cy="152" r="1.5" fill="#ffd23f"/><circle cx="196" cy="140" r="1.2" fill="#ff7b1c"/></g>' +
        '<rect x="160" y="170" width="80" height="9" rx="4" fill="#5b3a22"/><rect x="170" y="164" width="60" height="8" rx="4" fill="#6e4429" transform="rotate(-6 200 168)"/>' +
        // garland + lights on the mantel
        '<path d="M110 66 Q150 82 200 70 Q250 82 290 66" stroke="#1f8a44" stroke-width="7" fill="none" stroke-linecap="round"/>' +
        [130, 155, 180, 205, 230, 255, 278].map(function (x, i) { return '<circle class="xl" cx="' + x + '" cy="' + (72 + (i % 2) * 5) + '" r="3" fill="' + ['#ff4d4d', '#ffd23f', '#4dc3ff', '#ff7ad9'][i % 4] + '" style="animation-delay:' + (i * .3) + 's"/>'; }).join('') +
        // stockings
        '<g class="xsock" style="transform-origin:150px 80px"><path d="M140 80 h18 v26 q0 8 8 12 l-4 9 q-18 -6 -22 -16 Z" fill="#d32f2f"/><rect x="138" y="78" width="22" height="8" rx="2" fill="#fff"/><text x="149" y="98" font-size="8" text-anchor="middle" fill="#fff">L</text></g>' +
        '<g class="xsock s2" style="transform-origin:250px 80px"><path d="M242 80 h18 v26 q0 8 8 12 l-4 9 q-18 -6 -22 -16 Z" fill="#1f8a44"/><rect x="240" y="78" width="22" height="8" rx="2" fill="#fff"/><text x="251" y="98" font-size="8" text-anchor="middle" fill="#fff">C</text></g>' +
        // tree on the left, presents piled in front
        '<g transform="translate(4 40) scale(.98)">' + K.xmasTreeSVG().replace('<svg viewBox="0 0 120 170" class="xtree" aria-hidden="true">', '<svg viewBox="0 0 120 170" width="120" height="170" class="xtree" aria-hidden="true">') + '</g>' +
        '<g transform="translate(0 40) scale(.98)">' + boxes + '</g>' +
        // cat sleeping by the fire (why not)
        '<g transform="translate(290 172)"><ellipse cx="0" cy="0" rx="18" ry="9" fill="#e8a25a"/><circle cx="14" cy="-6" r="7" fill="#e8a25a"/><path d="M10 -12 l2 -6 l3 5 M16 -12 l3 -5 l1 6" fill="#e8a25a"/><path d="M12 -6 h3 M17 -6 h3" stroke="#5a3a1a" stroke-width="1"/><text x="-6" y="-12" font-size="8" class="xz">z</text></g>' +
      '</svg>' +
      '<p class="xcap">✨ Tap the room to go inside 🎄 · tap a present to find it below</p></div>';
  };

  // ------------------------------------------------------------ ambient sound for scenes: crackling fire / ocean waves (generated, no files)
  var amb = null;
  K.ambient = function (kind) {
    if (amb) { try { amb.stop(); } catch (e) { /* */ } var was = amb.kind; amb = null; if (was === kind) return false; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    var ctx = new AC(), master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    var sr = ctx.sampleRate, buf = ctx.createBuffer(1, sr * 2, sr), d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < d.length; i++) { var w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }   // soft brown noise
    var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    var filt = ctx.createBiquadFilter(), g = ctx.createGain(), timers = [];
    if (kind === 'fire') {
      filt.type = 'lowpass'; filt.frequency.value = 600; g.gain.value = 0.35;
      src.connect(filt); filt.connect(g); g.connect(master);
      var pop = function () {   // little crackles and pops
        var t = ctx.currentTime, b = ctx.createBufferSource(), len = Math.floor(sr * (0.004 + Math.random() * 0.02)), pb = ctx.createBuffer(1, len, sr), pd = pb.getChannelData(0);
        for (var j = 0; j < len; j++) pd[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 3);
        b.buffer = pb; var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500 + Math.random() * 3000;
        var pg = ctx.createGain(); pg.gain.value = 0.25 + Math.random() * 0.6; b.connect(hp); hp.connect(pg); pg.connect(master); b.start(t);
        timers.push(setTimeout(pop, 40 + Math.random() * (Math.random() < 0.2 ? 900 : 260)));
      };
      pop();
    } else {   // waves: noise swelling in and out
      filt.type = 'lowpass'; filt.frequency.value = 900; src.connect(filt); filt.connect(g); g.connect(master);
      var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 0.35; g.gain.value = 0.4; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    }
    src.start();
    amb = { kind: kind, stop: function () { timers.forEach(clearTimeout); try { src.stop(); } catch (e) { /* */ } ctx.close(); } };
    return true;
  };

  K.applyTheme = function () { themeNow = null; applyTheme(); };

  // ------------------------------------------------------------ phone notifications for Chengxuan (ntfy). Settings live in her record (private).
  var EMOJI_KIND = { '💌': 'message', '✅': 'checkin', '❓': 'answer', '💭': 'wish', '🤔': 'wish', '🎁': 'gift', '⭐': 'gift', '🥺': 'miss', '🥝': 'clicker', '🐦': 'clicker', '📸': 'photo', '🍿': 'movie' };
  K.notifyCfg = function () { return Object.assign({ on: false, topic: '', server: 'https://ntfy.sh', events: { message: true, online: true, checkin: true, answer: true, wish: true, gift: true, photo: true }, withText: false }, DB.her.notifyCfg || {}); };
  K.sendNtfy = function (cfg, title, body, tags) {
    if (!cfg.topic) return Promise.resolve();
    return fetch(String(cfg.server || 'https://ntfy.sh').replace(/\/+$/, '') + '/', {
      method: 'POST', body: JSON.stringify({ topic: cfg.topic, title: title, message: body || ' ', tags: tags || ['kiwi_fruit'], click: location.origin + '/admin.html' })
    }).catch(function () { /* offline */ });
  };
  K.notify = function (kind, title, body) {
    if (!DB.user || DB.user.role !== 'livina') return;
    var cfg = K.notifyCfg(); if (!cfg.on || !cfg.topic || !(cfg.events || {})[kind]) return;
    K.sendNtfy(cfg, title, body);
  };

  // ------------------------------------------------------------ this device's id + sign-out from admin
  K.deviceId = function () {
    var id = K.store.get('kiwi-dev', ''); if (!id) { id = 'd' + Math.random().toString(36).slice(2, 10); K.store.set('kiwi-dev', id); } return id;
  };
  function checkSignout() {
    var u = DB.user; if (!u) return;
    var so = DB.state.signout || {}, at = +K.store.get('kiwi-login-at', '0');
    if (!at) { K.store.set('kiwi-login-at', String(Date.now())); return; }
    var epoch = u.role === 'admin' ? +so.admin || 0 : +so.her || 0, kick = (so.kick || {})[K.deviceId()] || 0;
    if (epoch > at || kick > at) {
      K.store.set('kiwi-login-at', '0');
      DB.logout().then(function () { location.replace('login.html?out=1'); });
    }
  }
  function adminDeviceBeat() {
    if (!DB.user || DB.user.role !== 'admin' || /[?&]mirror=1/.test(location.search)) return;
    var m = Object.assign({}, DB.live.adminDevices || {});
    m[K.deviceId()] = { name: K.deviceName(), last: Date.now(), page: document.body.dataset.page, loginAt: +K.store.get('kiwi-login-at', '0') || Date.now() };
    DB.setLive({ adminDevices: m }).catch(function () { /* */ });
  }

  // ------------------------------------------------------------ "see her screen": only while Chengxuan is watching (his Screen tab is open)
  function startScreenShare(page) {
    var lastTap = null, lastSig = '', lastSent = 0;
    document.addEventListener('pointerdown', function (e) {
      var el = e.target.closest('button, a, [role=button], input, textarea, label, .mood, .q-opt') || e.target;
      var label = (el.getAttribute('aria-label') || el.textContent || el.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      lastTap = { x: e.clientX / innerWidth, y: e.clientY / innerHeight, at: Date.now(), label: label };
    }, true);
    function snap() {
      var w = DB.live.watching || 0;
      if (document.hidden || Date.now() - w > 20000) return;
      var a = document.activeElement, typing = '';
      if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && !/^(button|submit|checkbox|radio|file)$/.test(a.type)) typing = (a.getAttribute('placeholder') || a.id || 'a box').slice(0, 40);
      var sheet = K.isModalOpen() && document.querySelector('.sheet');
      var sc = {
        page: page, hash: location.hash || '', sy: Math.round(scrollY), sh: document.documentElement.scrollHeight, vw: innerWidth, vh: innerHeight,
        modal: sheet ? sheet.innerText.replace(/\s+\n/g, '\n').trim().slice(0, 400) : '', typing: typing, tap: lastTap
      };
      var sig = JSON.stringify(sc);
      if (sig === lastSig && Date.now() - lastSent < 15000) return;
      lastSig = sig; lastSent = Date.now(); sc.at = Date.now();
      DB.setLive({ screen: sc }).catch(function () { /* */ });
    }
    setInterval(snap, 1500); DB.subscribe(function () { if (Date.now() - lastSent > 3000) snap(); });
  }

  // ------------------------------------------------------------ auto-replies to her messages (admin can change them)
  K.AUTO_DEFAULT = {
    on: true, delay: 6, fallbackOn: false,
    fallback: 'Got your message baby 💚 I\'ll read it properly soon | Aww 🥺💚 I\'ll write back properly soon',
    rules: [
      { keys: 'miss, missing', replies: 'I miss you too 🥺💚 | I miss you so much more baby 🥺 | Miss you too, counting down the days 💚' },
      { keys: 'love you, ily, love u', replies: 'I love you more 💚 | I love you too baby 🥰 | Love you to the moon and back 🌙💚' },
      { keys: 'good night, goodnight, gn, sleep', replies: 'Good night baby 🌙 Sweet dreams 💚 | Sleep well my love 😴💚' },
      { keys: 'good morning, morning, gm', replies: 'Good morning baby ☀️💚 | Morning my love ☀️ Have the best day!' },
      { keys: 'sad, cry, crying, tired, stressed, stress', replies: 'Aww baby 🥺 Come here *hug* 🫂 I\'ll call you soon 💚' },
      { keys: 'exam, test, school, homework', replies: 'You\'ve got this, smart girl 📚💚 | So proud of you 🥹📚' }
    ]
  };
  K.autoCfg = function () { var a = DB && DB.state.autoReply; return Object.assign({}, K.AUTO_DEFAULT, a || {}); };
  K.autoReplyFor = function (text) {
    var cfg = K.autoCfg(); if (!cfg.on) return null;
    var t = ' ' + String(text).toLowerCase().replace(/[^a-z0-9À-ɏ\s']/g, ' ') + ' ';
    function pick(s) { var o = String(s || '').split('|').map(function (x) { return x.trim(); }).filter(Boolean); return o.length ? o[Math.floor(Math.random() * o.length)] : null; }
    for (var i = 0; i < (cfg.rules || []).length; i++) {
      var r = cfg.rules[i], keys = String(r.keys || '').split(',').map(function (k) { return k.trim().toLowerCase(); }).filter(Boolean);
      if (keys.some(function (k) { return t.indexOf(' ' + k + ' ') !== -1 || (k.length > 4 && t.indexOf(k) !== -1); })) { var p = pick(r.replies); if (p) return p; }
    }
    return cfg.fallbackOn ? pick(cfg.fallback) : null;
  };

  // ------------------------------------------------------------ device name, e.g. "iPhone · app" or "Mac · Chrome"
  K.deviceName = function () {
    var ua = navigator.userAgent, ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var dev = /iPhone/.test(ua) ? 'iPhone' : ipad ? 'iPad' : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android phone' : 'Android tablet') : /Macintosh/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows PC' : /CrOS/.test(ua) ? 'Chromebook' : /Linux/.test(ua) ? 'Linux' : 'Unknown device';
    var br = K.standalone() ? 'home-screen app' : /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'browser';
    return dev + ' · ' + br;
  };
  var PAGE_NAMES = { home: 'Home', timers: 'Timers', week: 'Week', gifts: 'Gifts', fun: 'Fun', clicker: 'Kiwi Clicker', login: 'Login' };
  K.pageName = function (p) { return PAGE_NAMES[p] || p || '?'; };

  // ------------------------------------------------------------ activity log (what she does, for Chengxuan's Live tab)
  // merge: events with the same key within 10 minutes are combined ("Pressed I miss you ×5")
  K.logEvent = function (emoji, text, merge, full) {
    if (!DB.user || DB.user.role !== 'livina' || !DB.setLive) return;
    var list = (DB.live.events || []).slice(), last = list[list.length - 1];
    var merging = merge && last && last.k === merge && Date.now() - last.at < 600000;
    if (!merging && EMOJI_KIND[emoji]) { var nc = K.notifyCfg(); K.notify(EMOJI_KIND[emoji], emoji + ' Livina', (nc.withText && full) ? full : text); }
    if (merging) {
      var n = (last.n || 1) + 1; list[list.length - 1] = Object.assign({}, last, { t: String(text).slice(0, 160) + ' ×' + n, n: n, at: Date.now() });
      return DB.setLive({ events: list }).catch(function () { /* */ });
    }
    var item = { e: emoji, t: String(text).slice(0, 160), at: Date.now(), d: K.deviceName() }; if (merge) item.k = merge;
    var ev = list.concat([item]).slice(-200);
    DB.setLive({ events: ev }).catch(function () { /* */ });
  };

  // ------------------------------------------------------------ presence: precise "online now / last online" (only for her)
  function startPresence(page) {
    var PING = 20000, start = Date.now(), dev = K.deviceName(), visibleSince = document.hidden ? 0 : Date.now();
    var key = 'kiwi-sess';
    // A visit = time the site is open on screen. Moving between pages within 2 minutes continues the same visit.
    var prev = K.store.get(key, null);
    try { prev = typeof prev === 'string' ? JSON.parse(prev) : prev; } catch (e) { prev = null; }
    var sess = (prev && prev.end && Date.now() - prev.end < 120000 && prev.d === dev) ? prev : { id: Math.random().toString(36).slice(2, 9), start: start, d: dev, pages: [] };
    function onlineNote() {
      var ss = DB.live.sessions || [], lastEnd = ss.length ? Math.max.apply(null, ss.filter(function (x) { return x.id !== sess.id; }).map(function (x) { return x.end || 0; }).concat([0])) : 0;
      if (Date.now() - lastEnd > 10 * 60000) K.notify('online', '🟢 Livina is on Kiwi Corner', 'On ' + K.pageName(page) + ' · ' + dev);
    }
    if (sess.start === start) setTimeout(onlineNote, 900);
    if (sess.pages[sess.pages.length - 1] !== page) sess.pages = sess.pages.concat([page]).slice(-30);
    function pres(visible) {
      return { at: Date.now(), visible: visible, page: page, device: dev, devId: K.deviceId(), start: sess.start, sessId: sess.id, since: visibleSince || Date.now(),
        screen: Math.round(screen.width) + '×' + Math.round(screen.height), lang: navigator.language || '', tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || '') };
    }
    function sessions(endNow) {
      var list = (DB.live.sessions || []).filter(function (x) { return x.id !== sess.id; });
      var cur = { id: sess.id, start: sess.start, end: Date.now(), d: dev, devId: K.deviceId(), pages: sess.pages, open: !endNow };
      return list.concat([cur]).slice(-60);
    }
    function beat() {
      if (document.hidden) return;
      sess.end = Date.now(); K.store.set(key, JSON.stringify(sess));
      DB.setLive({ presence: pres(true), sessions: sessions(false) }).catch(function () { /* offline */ });
    }
    function away() {
      sess.end = Date.now(); K.store.set(key, JSON.stringify(sess));
      DB.setLive({ presence: pres(false), sessions: sessions(true) }).catch(function () { /* */ });
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { away(); visibleSince = 0; }
      else {
        // came back after a while = a new visit
        if (sess.end && Date.now() - sess.end > 120000) { sess = { id: Math.random().toString(36).slice(2, 9), start: Date.now(), d: dev, pages: [page] }; onlineNote(); }
        visibleSince = Date.now(); beat();
      }
    });
    window.addEventListener('pagehide', away);
    // first beat once the live record has loaded, then every 20 seconds
    setTimeout(beat, 800); setInterval(beat, PING);
  }

  // ------------------------------------------------------------ instant "ping" pop-up and remote refresh, both sent from admin
  function watchAdminSignals() {
    var loadedAt = Date.now();
    function check() {
      var st = DB.state, p = K.ping();
      if (p && p.id && K.store.get('kiwi-ping') !== p.id && Date.now() - (p.at || 0) < 12 * 3600e3) {
        K.store.set('kiwi-ping', p.id);
        K.queueModal('<div class="em">' + K.esc(p.emoji || '💚') + '</div><h3>' + K.esc(p.title || 'Chengxuan says…') + '</h3>' +
          (p.text ? '<p class="desc" style="white-space:pre-wrap">' + K.esc(p.text) + '</p>' : '') + '<p class="muted">From Chengxuan · ' + K.herTime(p.at) + ' 💚</p>', 'call', function () {
          K.confetti({ count: 90 });
          DB.setLive({ pingSeen: { id: p.id, at: Date.now(), page: document.body.dataset.page } }).catch(function () { /* */ });
        });
      }
      if (st.reloadAt && st.reloadAt > loadedAt && Date.now() - st.reloadAt < 3600e3) {
        loadedAt = Date.now() + 5000;
        if (!K.hasUnsent()) K.refresh();
        else if (!document.getElementById('update-bar')) {
          var b = document.createElement('button'); b.id = 'update-bar'; b.className = 'update-bar'; b.type = 'button';
          b.textContent = '✨ New update! Tap to refresh'; b.addEventListener('click', K.refresh); document.body.appendChild(b);
        }
      }
    }
    DB.subscribe(check); check(); setInterval(check, 15000);
  }

  // ------------------------------------------------------------ real phone notifications (Web Push via the Kiwi Corner server)
  function b64ToBytes(b) { var p = '='.repeat((4 - b.length % 4) % 4), s = atob((b + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, function (c) { return c.charCodeAt(0); }); }
  K.isIOS = function () { var ua = navigator.userAgent; return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); };
  K.pushState = function () {
    if (!('serviceWorker' in navigator)) return 'unsupported';
    if (K.isIOS() && !K.standalone()) return 'needs-app';           // iPhone: only from the home-screen app
    if (!('PushManager' in window) || !('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    return Notification.permission === 'granted' && K.store.get('kiwi-push-on') === '1' ? 'on' : 'off';
  };
  function savePush(sub) {
    var j = sub.toJSON(), id = j.endpoint.replace(/[^a-z0-9]/gi, '').slice(-60);
    return DB.savePush(id, { who: K.dmMe(), sub: { endpoint: j.endpoint, keys: j.keys }, device: K.deviceName(), at: Date.now() });
  }
  K.enablePush = function () {
    var key = (window.KIWI_CONFIG || {}).pushKey;
    if (!key || DB.mode !== 'live') { K.toast('Notifications only work on the real site'); return Promise.resolve(false); }
    return navigator.serviceWorker.register('/sw.js').then(function () { return Notification.requestPermission(); }).then(function (perm) {
      if (perm !== 'granted') { K.toast('Notifications are blocked. Allow them in your phone settings'); return false; }
      return navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription().then(function (s) { return s || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }); });
      }).then(savePush).then(function () {
        K.store.set('kiwi-push-on', '1'); K.toast('Notifications on 🔔'); K.logEvent('🔔', 'Turned on notifications on ' + K.deviceName()); return true;
      });
    }).catch(function (e) { console.error(e); K.toast('Couldn\'t turn on notifications on this device'); return false; });
  };
  // keep this phone's address fresh (once a day)
  function refreshPush() {
    if (K.pushState() !== 'on' || DB.mode !== 'live') return;
    if (Date.now() - +K.store.get('kiwi-push-at', '0') < 864e5) return;
    navigator.serviceWorker.register('/sw.js').then(function () { return navigator.serviceWorker.ready; }).then(function (reg) { return reg.pushManager.getSubscription(); })
      .then(function (s) { if (s) { K.store.set('kiwi-push-at', String(Date.now())); return savePush(s); } K.store.set('kiwi-push-on', '0'); }).catch(function () { /* */ });
  }
  K.pushCard = function (el) {
    if (!el) return;
    var st = K.pushState();
    if (st === 'on' || st === 'unsupported' || K.store.get('kiwi-push-x') === '1') { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = '<button type="button" class="a2hs-x" data-push-x aria-label="Hide">✕</button><div class="em">🔔</div><div><b>' + (K.dmMe() === 'her' ? 'Get a buzz when Chengxuan messages you' : 'Get a buzz when she messages you') + '</b>' +
      (st === 'needs-app' ? '<span>First put Kiwi Corner on your home screen, then open it from there and tap here again.</span><button type="button" class="btn sm" data-push-a2hs style="margin-top:8px">📱 How?</button>'
        : st === 'denied' ? '<span>Notifications are blocked for this site. Turn them on in Settings → Notifications → Kiwi Corner.</span>'
        : '<span>Messages, surprises, points and more, even when the site is closed.</span><button type="button" class="btn sm" data-push-on style="margin-top:8px">🔔 Turn on notifications</button>') + '</div>';
    el.onclick = function (e) {
      if (e.target.closest('[data-push-on]')) K.enablePush().then(function () { K.pushCard(el); });
      if (e.target.closest('[data-push-a2hs]')) K.installHelp();
      if (e.target.closest('[data-push-x]')) { K.store.set('kiwi-push-x', '1'); el.hidden = true; }
    };
  };

  // ------------------------------------------------------------ DM: unread badge, presence, floating chat button with "our" emojis
  K.dmMe = function () { return DB.user ? (DB.user.role === 'admin' ? 'him' : 'her') : null; };
  K.dmOurs = function () { var o = (DB.dmMeta.settings || {}).emojis; return (o && o.length) ? o : ['🥝', '💚', '🥺', '😘', '🫶', '😂', '🥰', '🍿', '🌙', '☀️', '🐦', '💕']; };
  K.dmQuickSend = function (text) {
    var me = K.dmMe(), other = me === 'him' ? 'her' : 'him', now = Date.now();
    var m = { id: 'm' + now.toString(36) + Math.random().toString(36).slice(2, 8), from: me, text: text, at: now };
    DB.dmSend(m); var p = { last: { at: now, from: me, text: text } }; DB.dmMetaSet(p, other);
    if (me === 'her') K.notify('message', '💬 Livina', text);
    K.toast('Sent ' + text + ' to ' + (me === 'him' ? 'Livina' : 'Chengxuan'));
  };
  function startDm(page) {
    var me = K.dmMe(), other = me === 'him' ? 'her' : 'him';
    function badge() {
      var n = ((DB.dmMeta.unread || {})[me]) || 0;
      var b = K.$('#chat-unread'); if (b) b.textContent = n ? ' ' + (n > 99 ? '99+' : n) : '';
      var f = K.$('#fab-n'); if (f) { f.textContent = n > 99 ? '99+' : n; f.hidden = !n; }
    }
    DB.subscribe(badge); badge();
    // site-wide "online" for the chat header (every 25 s while on screen)
    function beat(vis) { var o = {}; o[me] = { at: Date.now(), visible: vis, page: page }; if (!vis) o[me].typing = 0; DB.dmMetaSet(o).catch(function () { /* */ }); }
    if (page !== 'chat') {
      setTimeout(function () { beat(!document.hidden); }, 1200); setInterval(function () { if (!document.hidden) beat(true); }, 25000);
      document.addEventListener('visibilitychange', function () { beat(!document.hidden); });
    }
    if (page === 'chat' || page === 'login' || /[?&]mirror=1/.test(location.search)) return;
    // floating chat button: tap = quick sheet with our emojis, last message and "Open chat"
    var fab = document.createElement('button'); fab.type = 'button'; fab.className = 'chat-fab'; fab.setAttribute('aria-label', 'Chat');
    fab.innerHTML = '💬<b id="fab-n" hidden></b>';
    document.body.appendChild(fab); badge();
    fab.addEventListener('click', function () {
      var last = DB.dmMeta.last, NAME = { him: 'Chengxuan', her: 'Livina' };
      var sh = K.modal('<h3>💬 ' + NAME[other] + '</h3>' +
        (last ? '<div class="dm-last"><b>' + (last.from === me ? 'You' : NAME[last.from]) + ':</b> ' + K.esc(last.text || '') + '<span class="help"> · ' + K.herTime(last.at) + '</span></div>' : '') +
        '<p class="help" style="margin:10px 0 6px">Tap to send instantly:</p><div class="dm-ours big">' + K.dmOurs().map(function (e) { return '<button type="button" data-qsend="' + K.esc(e) + '">' + K.esc(e) + '</button>'; }).join('') + '</div>' +
        '<a class="btn big" href="chat.html" style="margin-top:14px;text-decoration:none;display:block;text-align:center">Open chat 💬</a>', 'dm-quick');
      sh.addEventListener('click', function (e) { var b = e.target.closest('[data-qsend]'); if (!b) return; K.dmQuickSend(b.dataset.qsend); K.closeModal(); });
    });
  }

  // ------------------------------------------------------------ movie night: pop-up to join + a bar on every page while it's on
  function watchMovie(page) {
    if (page === 'movie' || page === 'login' || /[?&]mirror=1/.test(location.search)) return;
    var me = K.dmMe();
    function check() {
      var m = (DB.dmMeta || {}).movie || {}, bar = document.getElementById('mv-bar');
      var on = m.active && Date.now() - (m.startedAt || 0) < 10 * 3600e3;
      if (!on) { if (bar) bar.remove(); return; }
      if (!bar) {
        bar = document.createElement('a'); bar.id = 'mv-bar'; bar.className = 'mv-bar'; bar.href = 'movie.html';
        document.body.appendChild(bar);
      }
      bar.innerHTML = '🍿 <b>Movie night is on</b> · ' + K.esc(m.title || '') + ' <span>Join →</span>';
      if (me === 'her' && K.store.get('kiwi-mv-seen') !== m.id) {
        K.store.set('kiwi-mv-seen', m.id);
        K.queueModal('<div class="em">🍿🎬</div><h3>Movie night with Chengxuan!</h3><p class="desc">He\'s ready to watch <b>' + K.esc(m.title || 'a movie') + '</b> with you right now.</p>' +
          '<a class="btn big pink" href="movie.html" style="text-decoration:none;display:block;text-align:center;margin-top:10px">Join 🍿</a><p class="muted" style="text-align:center">or tap ✕ to join later from the bar at the top</p>', 'call', function () { K.confetti({ count: 70 }); });
      }
    }
    DB.subscribe(check); check(); setInterval(check, 30000);
  }

  // ------------------------------------------------------------ 🎯 catchables: something flies across now and then; tap it for points (not on the plain Kiwi theme)
  K.CATCH = {
    christmas: [['🦌🛷', 'Santa\'s sleigh'], ['🎁', 'a present'], ['❄️', 'a snowflake']],
    scrapbook: [['🌟', 'a gold star sticker'], ['💌', 'a love note'], ['🌼', 'a flower sticker']],
    mochi: [['🍡', 'a golden mochi'], ['🍓', 'a strawberry daifuku'], ['✨', 'a sparkle']],
    zen: [['🪷', 'a lotus flower'], ['🍵', 'a cup of matcha'], ['🍃', 'a falling leaf']]
  };
  function startCatchables(page) {
    if (!DB.user || DB.user.role !== 'livina' || /^(chat|movie|login|admin)$/.test(page)) return;
    var timer = null;
    function next() {
      var cfg = K.catchCfg(), lo = Math.max(20, +cfg.minGap || 120), hi = Math.max(lo + 10, +cfg.maxGap || 240);
      clearTimeout(timer); timer = setTimeout(spawn, (lo + Math.random() * (hi - lo)) * 1000);
    }
    function spawn() {
      var cfg = K.catchCfg(), set = K.CATCH[K.theme()];
      if (!cfg.on || !set || document.hidden || K.isModalOpen() || document.documentElement.classList.contains('xr-open') || K.caughtToday() >= (+cfg.daily || 50)) return next();
      var r = Math.random(), tier = r < 1 / 12 ? 0 : r < 1 / 12 + 0.25 ? 1 : 2, pts = [10, 5, 1][tier], item = set[tier];
      var b = document.createElement('button'); b.type = 'button'; b.className = 'catch tier' + tier; b.textContent = item[0]; b.setAttribute('aria-label', 'Catch ' + item[1]);
      var fromLeft = Math.random() < 0.5, y = 12 + Math.random() * 60, dur = [6.5, 5.2, 4.4][tier];
      b.style.top = y + 'vh'; b.style.setProperty('--dx', (fromLeft ? 1 : -1) * (innerWidth + 140) + 'px'); b.style.setProperty('--dy', ((Math.random() * 30) - 15) + 'vh');
      b.style[fromLeft ? 'left' : 'right'] = '-70px'; b.style.animationDuration = dur + 's';
      if (!fromLeft) b.classList.add('flip');
      var done = false;
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); if (done) return; done = true;
        var left = (+K.catchCfg().daily || 50) - K.caughtToday(), got = Math.max(0, Math.min(pts, left));
        b.style.translate = getComputedStyle(b).translate; b.classList.add('caught'); setTimeout(function () { b.remove(); }, 500);
        if (!got) { K.toast('You\'ve caught the most for today ✨ More tomorrow!'); return next(); }
        DB.setHer({ catches: (DB.her.catches || []).concat([{ at: Date.now(), amt: got, name: item[1], theme: K.theme() }]).slice(-400) });
        var rr = b.getBoundingClientRect(); K.confetti({ x: rr.left + rr.width / 2, y: rr.top + rr.height / 2, count: tier === 0 ? 90 : 30 });
        K.toast('+' + got + ' ⭐ You caught ' + item[1] + '!' + (tier === 0 ? ' 🤩' : ''));
        if (tier === 0) K.logEvent('⭐', 'Caught ' + item[1] + ' (+' + got + ')');
        next();
      });
      document.body.appendChild(b);
      setTimeout(function () { if (!done) b.remove(); }, dur * 1000 + 300);
      next();
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) next(); });
    setTimeout(next, 15000);
  }

  // ------------------------------------------------------------ feature switches: admin can hide parts of her site
  function applyFeatures() {
    var off = (DB.state && DB.state.hide) || {};
    document.querySelectorAll('[data-feature]').forEach(function (el) { el.classList.toggle('f-off', !!off[el.dataset.feature]); });
  }

  // ------------------------------------------------------------ boot: only admin needs a login; guests get a lighter site
  var readyFns = [];
  K.onReady = function (f) { readyFns.push(f); };
  function boot() {
    document.querySelectorAll('[data-slice]').forEach(function (el) { el.innerHTML = K.sliceSVG(); });
    document.querySelectorAll('[data-mascot]').forEach(function (el) { el.innerHTML = K.mascotSVG(); });
    var page = document.body.dataset.page;
    DB.ready.then(function () {
      var u = DB.user;
      if (page === 'login') { readyFns.forEach(function (f) { f(); }); return; }
      if (!u && page === 'admin') { location.replace('login.html?next=admin.html'); return; }
      if (u && page === 'admin' && u.role !== 'admin') { location.replace('index.html'); return; }
      if (!u) document.body.classList.add('guest');
      chrome(page);
      document.documentElement.classList.remove('locked');
      var mirror = /[?&]mirror=1/.test(location.search);
      if (u && u.role === 'admin' && (page === 'admin' || page === 'chat') && !mirror) { VZ = 'Asia/Singapore'; K.VZ = VZ; }
      if (u && u.role === 'admin' && !mirror) document.body.classList.add('is-admin');
      if (mirror) document.body.classList.add('mirror');
      applyFeatures(); DB.subscribe(applyFeatures);
      applyTheme(); DB.subscribe(applyTheme);
      if (u && !mirror) { checkSignout(); DB.subscribe(checkSignout); }
      if (u && u.role === 'admin' && !mirror) { setTimeout(adminDeviceBeat, 1500); setInterval(adminDeviceBeat, 60000); }
      if (u && !mirror) startDm(page);
      if (u && !mirror) watchMovie(page);
      if (u && !mirror) startCatchables(page);
      if (u && !mirror) { refreshPush(); K.pushCard(K.$('#push-card')); }
      if (u && u.role === 'livina') {
        if (Date.now() - (DB.her.lastSeen || 0) > 5 * 60000) DB.setHer({ lastSeen: Date.now() });
        startPresence(page); watchAdminSignals(); startScreenShare(page);
        pointsNotice(); DB.subscribe(pointsNotice); setInterval(pointsNotice, 60000);
        // Once a day, the first time she opens the site: the check-in pop-up (waits for other pop-ups to close)
        var tries = 0, ckTimer = setInterval(function () {
          if (++tries > 30 || K.checkedInToday() || K.store.get('kiwi-ck-prompt') === K.todayKey()) { clearInterval(ckTimer); return; }
          if (K.isModalOpen() || document.querySelector('.confetti')) return;
          clearInterval(ckTimer); K.store.set('kiwi-ck-prompt', K.todayKey()); K.checkinModal();
        }, 1500);
      }
      readyFns.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
      K.restoreDrafts();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
