/* xmas.js: the interactive Christmas room (Gifts page, Christmas theme). Tap the scene to open it full screen.
   Decorate the tree (shared), pet the cat, feed the fire, peek in stockings, sip cocoa, eat cookies, kiss under the mistletoe,
   switch the tree lights, call Santa's sleigh past the window and play the music box.
   Shared state lives in kiwi/dm → xmas (both can write). */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, T = window.KiwiTime, $ = K.$, esc = K.esc;
  if (!DB.user || !$('#xmas-scene')) return;
  var me = DB.user.role === 'admin' ? 'him' : 'her', other = me === 'him' ? 'her' : 'him';

  function X() { return (DB.dmMeta || {}).xmas || {}; }
  function setX(p) { return DB.dmMetaSet({ xmas: p }); }

  // ---------------------------------------------------------------- little synth (no files)
  var ac = null;
  function ctx() { if (!ac) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ac = new AC(); } if (ac && ac.state === 'suspended') ac.resume(); return ac; }
  function tone(freq, t0, dur, type, vol) {
    var c = ctx(); if (!c) return; var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'triangle'; o.frequency.value = freq; g.gain.setValueAtTime(0, c.currentTime + t0); g.gain.linearRampToValueAtTime(vol || 0.18, c.currentTime + t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + t0 + dur); o.connect(g); g.connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.05);
  }
  function jingle() {   // "Jingle Bells" (public domain), music-box style
    var N = { C: 523, D: 587, E: 659, F: 698, G: 784 }, tune = 'E E E- E E E- E G C D E-- F F F F F E E E E D D E D- G-'.split(' '), t = 0;
    tune.forEach(function (n) { var len = 0.22 * (1 + (n.match(/-/g) || []).length); tone(N[n[0]], t, len + 0.25, 'triangle', 0.16); tone(N[n[0]] * 2, t, 0.18, 'sine', 0.05); t += len; });
  }
  function purr() { var c = ctx(); if (!c) return; for (var i = 0; i < 14; i++) tone(26 + Math.random() * 6, i * 0.09, 0.12, 'sawtooth', 0.05); }
  function crackle() { var c = ctx(); if (!c) return; for (var i = 0; i < 14; i++) (function (i) { setTimeout(function () { tone(1800 + Math.random() * 2500, 0, 0.02, 'square', 0.04 + Math.random() * 0.05); }, i * (40 + Math.random() * 120)); })(i); }
  function ding(f) { tone(f || 1046, 0, 0.5, 'sine', 0.12); tone((f || 1046) * 1.5, 0.08, 0.4, 'sine', 0.06); }
  function kissSnd() { tone(900, 0, 0.08, 'sine', 0.15); tone(1300, 0.06, 0.1, 'sine', 0.1); }

  // ---------------------------------------------------------------- room drawing (400×300)
  var ORN = { red: ['#e53935', 'circle'], gold: ['#ffd23f', 'circle'], blue: ['#1e88e5', 'circle'], purple: ['#8e24aa', 'circle'], star: ['#ffd23f', 'star'], candy: ['#fff', 'candy'], bow: ['#e53935', 'bow'], heart: ['#ff4d7a', 'heart'] };
  function ornSVG(o) {
    var d = ORN[o.k] || ORN.red, x = o.x, y = o.y;
    if (d[1] === 'star') return '<path d="M' + x + ' ' + (y - 6) + ' l1.8 4 4.4 .4 -3.3 2.9 1 4.3 -3.9 -2.3 -3.9 2.3 1 -4.3 -3.3 -2.9 4.4 -.4 Z" fill="' + d[0] + '" stroke="#e0a800" stroke-width=".6"/>';
    if (d[1] === 'candy') return '<path d="M' + (x - 1) + ' ' + (y + 6) + ' v-8 a3 3 0 0 1 6 0" stroke="#e53935" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-dasharray="2 2"/><path d="M' + (x - 1) + ' ' + (y + 6) + ' v-8 a3 3 0 0 1 6 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-dasharray="2 2" stroke-dashoffset="2"/>';
    if (d[1] === 'bow') return '<path d="M' + x + ' ' + y + ' l-6 -4 v8 Z M' + x + ' ' + y + ' l6 -4 v8 Z" fill="' + d[0] + '"/><circle cx="' + x + '" cy="' + y + '" r="1.8" fill="#b71c1c"/>';
    if (d[1] === 'heart') return '<path d="M' + x + ' ' + (y + 4) + ' C' + (x - 7) + ' ' + (y - 1) + ' ' + (x - 3) + ' ' + (y - 6) + ' ' + x + ' ' + (y - 2) + ' C' + (x + 3) + ' ' + (y - 6) + ' ' + (x + 7) + ' ' + (y - 1) + ' ' + x + ' ' + (y + 4) + ' Z" fill="' + d[0] + '"/>';
    return '<circle cx="' + x + '" cy="' + y + '" r="4.6" fill="' + d[0] + '"/><circle cx="' + (x - 1.5) + '" cy="' + (y - 1.5) + '" r="1.4" fill="#fff" opacity=".7"/><rect x="' + (x - 1.2) + '" y="' + (y - 6.4) + '" width="2.4" height="2" fill="#bbb"/>';
  }
  function roomSVG() {
    var x = X(), lights = x.lights || 'on';
    return '<svg viewBox="0 0 400 300" class="xr-svg lights-' + lights + '" id="xr-svg">' +
      '<defs><radialGradient id="xrg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb347" stop-opacity=".8"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>' +
      '<pattern id="xrb" width="24" height="12" patternUnits="userSpaceOnUse"><rect width="24" height="12" fill="#b5523b"/><path d="M0 11.5 H24 M12 0 V6 M0 6 H24 M0 6 V12 M24 6 V12" stroke="#8e3b29" stroke-width="1.2"/></pattern>' +
      '<clipPath id="xrwin"><rect x="306" y="46" width="74" height="66"/></clipPath>' +
      '<pattern id="xrwall" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#5a3f6e"/><path d="M20 0 V40" stroke="#644879" stroke-width="6"/></pattern></defs>' +
      '<rect width="400" height="300" fill="url(#xrwall)"/><rect y="0" width="400" height="16" fill="#4a3360"/>' +
      // window + snow + sleigh
      '<g data-x="window" class="xr-hit"><rect x="302" y="42" width="82" height="74" rx="6" fill="#16223e" stroke="#f3e6d0" stroke-width="6"/>' +
        '<g clip-path="url(#xrwin)"><circle cx="360" cy="58" r="8" fill="#fff6c9"/><g class="xwsnow' + (x.storm ? ' storm' : '') + '">' + snowDots(x.storm ? 30 : 10) + '</g>' +
        '<path d="M306 104 q20 -10 40 0 t40 0 V112 H306 Z" fill="#fff"/><g transform="translate(316 92)"><circle r="7" fill="#fff"/><circle cy="-9" r="5" fill="#fff"/><circle cx="-1.5" cy="-10" r=".8" fill="#222"/><circle cx="1.5" cy="-10" r=".8" fill="#222"/><path d="M0 -8.6 l3 1" stroke="#ff7b1c" stroke-width="1.2"/></g>' +
        '<g id="xr-sleigh" class="xr-sleigh"><text x="0" y="0" font-size="14">🦌🦌🛷</text></g></g>' +
        '<path d="M343 42 V116 M302 79 H384" stroke="#f3e6d0" stroke-width="4"/></g>' +
      // mistletoe
      '<g data-x="mistletoe" class="xr-hit xr-sway" style="transform-origin:212px 16px"><path d="M212 16 V40" stroke="#c62828" stroke-width="2"/><ellipse cx="206" cy="46" rx="7" ry="4" fill="#2e7d32" transform="rotate(-30 206 46)"/><ellipse cx="218" cy="46" rx="7" ry="4" fill="#388e3c" transform="rotate(30 218 46)"/><circle cx="212" cy="44" r="2.2" fill="#fff"/><circle cx="209" cy="47" r="2" fill="#fff"/><circle cx="215" cy="47" r="2" fill="#fff"/><path d="M206 38 q6 -6 12 0" fill="#c62828"/></g>' +
      // fireplace
      '<ellipse class="xfloorglow' + (x.fireBoost > Date.now() ? ' big' : '') + '" cx="210" cy="232" rx="120" ry="30" fill="url(#xrg)"/>' +
      '<rect x="128" y="116" width="164" height="112" fill="url(#xrb)" rx="4"/><rect x="116" y="106" width="188" height="16" rx="4" fill="#f3e6d0"/><rect x="120" y="120" width="180" height="4" fill="#d9c7aa"/>' +
      '<g data-x="fire" class="xr-hit"><path d="M158 228 V170 Q158 150 178 150 H242 Q262 150 262 170 V228 Z" fill="#1d1414"/>' +
        '<g class="xfire' + (x.fireBoost > Date.now() ? ' big' : '') + '"><path class="xf f1" d="M176 224 Q168 198 186 178 Q184 196 196 202 Q194 180 208 164 Q212 188 222 194 Q224 180 234 176 Q248 200 240 224 Z" fill="#ff7b1c"/><path class="xf f2" d="M184 224 Q180 204 194 190 Q194 204 204 208 Q204 190 214 180 Q218 198 226 202 Q236 208 232 224 Z" fill="#ffb21c"/><path class="xf f3" d="M194 224 Q192 212 202 202 Q204 212 210 214 Q212 202 218 198 Q224 210 222 224 Z" fill="#ffe07a"/></g>' +
        '<g class="xembers"><circle cx="198" cy="196" r="1.6" fill="#ffd23f"/><circle cx="214" cy="192" r="1.3" fill="#ff9a3c"/><circle cx="222" cy="198" r="1.5" fill="#ffd23f"/><circle cx="204" cy="186" r="1.2" fill="#ff7b1c"/></g>' +
        '<rect x="168" y="218" width="84" height="9" rx="4" fill="#5b3a22"/><rect x="178" y="212" width="64" height="8" rx="4" fill="#6e4429" transform="rotate(-6 210 216)"/></g>' +
      // garland + lights
      '<path d="M118 110 Q160 126 210 114 Q260 126 302 110" stroke="#1f8a44" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      [138, 163, 188, 213, 238, 263, 288].map(function (cx, i) { return '<circle class="xl" cx="' + cx + '" cy="' + (116 + (i % 2) * 5) + '" r="3" fill="' + ['#ff4d4d', '#ffd23f', '#4dc3ff', '#ff7ad9'][i % 4] + '" style="animation-delay:' + (i * .3) + 's"/>'; }).join('') +
      // mantel things: music box + cocoa
      '<g data-x="music" class="xr-hit"><rect x="148" y="90" width="26" height="16" rx="2" fill="#8d6e63"/><rect x="146" y="86" width="30" height="5" rx="2" fill="#a1887f"/><text x="161" y="102" font-size="8" text-anchor="middle">🎵</text></g>' +
      '<g data-x="cocoa" class="xr-hit"><path d="M244 88 h18 v14 q0 6 -9 6 q-9 0 -9 -6 Z" fill="#fff" stroke="#c62828" stroke-width="1.5"/><path d="M262 92 q6 0 6 5 q0 5 -6 5" fill="none" stroke="#c62828" stroke-width="1.5"/><rect x="246" y="' + (90 + (5 - (x.cocoa == null ? 5 : x.cocoa)) * 2) + '" width="14" height="' + Math.max(0, (x.cocoa == null ? 5 : x.cocoa) * 2) + '" fill="#6d4c41"/>' + ((x.cocoa == null ? 5 : x.cocoa) > 0 ? '<path class="xr-steam" d="M248 84 q-3 -5 0 -10 q3 -5 0 -10 M256 84 q-3 -5 0 -10 q3 -5 0 -10" stroke="#fff" stroke-width="1.4" fill="none" opacity=".7"/>' : '') + '</g>' +
      // stockings
      '<g data-x="stockL" class="xr-hit xsock" style="transform-origin:160px 124px"><path d="M150 124 h18 v26 q0 8 8 12 l-4 9 q-18 -6 -22 -16 Z" fill="#d32f2f"/><rect x="148" y="122" width="22" height="8" rx="2" fill="#fff"/><text x="159" y="142" font-size="8" text-anchor="middle" fill="#fff">L</text></g>' +
      '<g data-x="stockC" class="xr-hit xsock s2" style="transform-origin:262px 124px"><path d="M252 124 h18 v26 q0 8 8 12 l-4 9 q-18 -6 -22 -16 Z" fill="#1f8a44"/><rect x="250" y="122" width="22" height="8" rx="2" fill="#fff"/><text x="261" y="142" font-size="8" text-anchor="middle" fill="#fff">C</text></g>' +
      // floor + rug
      '<rect y="228" width="400" height="72" fill="#8a5636"/><rect y="228" width="400" height="5" fill="#6e4429"/>' +
      '<ellipse cx="220" cy="262" rx="130" ry="20" fill="#b8323a" opacity=".9"/><ellipse cx="220" cy="262" rx="112" ry="14" fill="none" stroke="#ffd23f" stroke-dasharray="4 5" opacity=".7"/>' +
      // tree (tap = hang ornament) + ornaments
      '<g id="xr-tree" data-x="tree" class="xr-hit" transform="translate(2 76)"><svg viewBox="0 0 120 170" width="128" height="181">' + K.xmasTreeSVG().replace(/^<svg[^>]*>|<\/svg>$/g, '') + '<g id="xr-orns">' + (x.orn || []).map(ornSVG).join('') + '</g></svg></g>' +
      // presents
      '<g transform="translate(-2 104) scale(.92)">' + (K.giftScene ? '' : '') + presents() + '</g>' +
      // cookies table + cat
      '<g data-x="cookies" class="xr-hit"><rect x="318" y="196" width="66" height="7" rx="3" fill="#6e4429"/><rect x="326" y="203" width="5" height="26" fill="#5b3a22"/><rect x="371" y="203" width="5" height="26" fill="#5b3a22"/>' +
        '<ellipse cx="351" cy="194" rx="24" ry="5" fill="#fff"/>' + cookies(x.cookies == null ? 5 : x.cookies) + '<rect x="364" y="180" width="10" height="14" rx="2" fill="#e3f2fd" stroke="#90caf9"/></g>' +
      '<g data-x="cat" class="xr-hit" transform="translate(304 252)"><ellipse cx="0" cy="0" rx="20" ry="10" fill="#e8a25a"/><path d="M-18 2 q-14 -2 -10 -14" stroke="#e8a25a" stroke-width="5" fill="none" stroke-linecap="round" class="xr-tail"/><circle cx="15" cy="-7" r="8" fill="#e8a25a"/><path d="M10 -13 l2 -7 l4 6 M17 -13 l4 -6 l1 7" fill="#e8a25a"/>' +
        '<g class="xr-eyes"><path d="M12 -7 h3 M18 -7 h3" stroke="#5a3a1a" stroke-width="1.2"/></g><text x="-8" y="-14" font-size="8" class="xz">z</text></g>' +
      '</svg>';
  }
  function snowDots(n) { var o = ''; for (var i = 0; i < n; i++) o += '<circle cx="' + (306 + Math.random() * 74).toFixed(0) + '" cy="' + (40 + Math.random() * 66).toFixed(0) + '" r="' + (1 + Math.random() * 1.2).toFixed(1) + '" fill="#fff"/>'; return o; }
  function cookies(n) { var o = ''; for (var i = 0; i < n; i++) o += '<circle cx="' + (334 + i * 7) + '" cy="' + (190 - (i % 2) * 2) + '" r="4.2" fill="#c68642"/><circle cx="' + (333 + i * 7) + '" cy="' + (189 - (i % 2) * 2) + '" r=".8" fill="#4e342e"/>'; return o; }
  function presents() {
    var gs = K.gifts(), slots = [[20, 168, 46, 34], [68, 172, 38, 30], [108, 170, 42, 32], [36, 136, 36, 30], [78, 140, 34, 28], [56, 110, 30, 26]], out = '';
    gs.slice(0, slots.length).forEach(function (g, i) {
      var s = slots[i], x = s[0], y = s[1], w = s[2], h = s[3];
      out += '<g class="xbox' + (g.unlocked && !g.opened ? ' ready' : '') + '" data-x="gift" data-gift="' + esc(g.id) + '"><rect x="' + x + '" y="' + (y - h) + '" width="' + w + '" height="' + h + '" rx="3" fill="' + (g.color || '#d32f2f') + '"/><rect x="' + (x + w / 2 - 3) + '" y="' + (y - h) + '" width="6" height="' + h + '" fill="' + (g.ribbon || '#ffd23f') + '"/><rect x="' + (x - 3) + '" y="' + (y - h - 2) + '" width="' + (w + 6) + '" height="8" rx="2" fill="' + (g.color || '#d32f2f') + '"/><text x="' + (x + w / 2) + '" y="' + (y - h / 2 + 4) + '" font-size="11" font-weight="700" text-anchor="middle" fill="#fff" style="paint-order:stroke" stroke="rgba(0,0,0,.35)" stroke-width="2">' + g.n + '</text></g>';
    });
    return out;
  }

  // ---------------------------------------------------------------- the full-screen room
  var tool = null, overlay = null;
  function daysToXmas() { var y = +K.todayKey().slice(0, 4), xm = T.parse(y + '-12-25T00:00', K.HZ); if (T.now() > xm + 864e5) xm = T.parse((y + 1) + '-12-25T00:00', K.HZ); return Math.ceil((xm - T.now()) / 864e5); }
  function open() {
    if (overlay) return;
    overlay = document.createElement('div'); overlay.className = 'xr-full'; overlay.setAttribute('role', 'dialog');
    var d = daysToXmas();
    overlay.innerHTML = '<div class="xr-top"><b>🎄 Our Christmas room</b><span>' + (d > 0 ? d + ' day' + (d > 1 ? 's' : '') + ' until Christmas' : 'Merry Christmas! 🎅') + '</span><button type="button" class="xr-x" aria-label="Close">✕</button></div>' +
      '<div class="xr-stage"><div id="xr-room"></div><div class="xr-pop" id="xr-pop"></div><div class="xr-fx" id="xr-fx"></div></div>' +
      '<div class="xr-tools"><div class="xr-orn" id="xr-orn">' + Object.keys(ORN).map(function (k) { return '<button type="button" data-orn="' + k + '"><svg viewBox="-8 -8 16 16" width="22" height="22">' + ornSVG({ x: 0, y: 0, k: k }) + '</svg></button>'; }).join('') + '</div>' +
      '<div class="xr-btns"><button type="button" data-t="undo">↶ Undo ornament</button><button type="button" data-t="lights">💡 Lights</button>' + (me === 'him' ? '<button type="button" data-t="clear">🧹 Clear tree</button>' : '') + '</div>' +
      '<p class="xr-hint" id="xr-hint">Pick an ornament, then tap the tree to hang it. Tap anything in the room 👀</p></div>';
    document.body.appendChild(overlay); document.documentElement.classList.add('xr-open');
    drawRoom();
    overlay.addEventListener('click', onClick);
    setTimeout(sleigh, 2500);
  }
  function close() { if (!overlay) return; overlay.remove(); overlay = null; document.documentElement.classList.remove('xr-open'); }
  function drawRoom() { if (!overlay) return; $('#xr-room').innerHTML = roomSVG(); }
  function say(txt, x, y) {
    var p = $('#xr-pop'); if (!p) return;
    p.textContent = txt; p.className = 'xr-pop show';
    clearTimeout(say.t); say.t = setTimeout(function () { p.className = 'xr-pop'; }, 2600);
  }
  function burst(em, n, cx, cy) {
    var fx = $('#xr-fx'); if (!fx) return;
    for (var i = 0; i < (n || 6); i++) { var s = document.createElement('span'); s.textContent = em; s.style.left = (cx + (Math.random() * 60 - 30)) + 'px'; s.style.top = cy + 'px'; s.style.animationDelay = (i * 0.08) + 's'; fx.appendChild(s); setTimeout(function (el) { return function () { el.remove(); }; }(s), 2000); }
  }
  function svgPoint(e) {
    var svg = $('#xr-svg'), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  function sleigh() {
    if (!overlay) return;
    var s = $('#xr-sleigh'); if (!s) return;
    s.classList.remove('fly'); void s.getBoundingClientRect(); s.classList.add('fly');
    tone(1568, 0, 0.15, 'sine', 0.05); tone(2093, 0.15, 0.15, 'sine', 0.05);
    clearTimeout(sleigh.t); sleigh.t = setTimeout(sleigh, 20000 + Math.random() * 20000);
  }
  function onClick(e) {
    if (e.target.closest('.xr-x')) return close();
    var ob = e.target.closest('[data-orn]');
    if (ob) { tool = ob.dataset.orn; overlay.querySelectorAll('[data-orn]').forEach(function (b) { b.classList.toggle('on', b === ob); }); $('#xr-hint').textContent = 'Now tap the tree to hang it 🎄'; return; }
    var tb = e.target.closest('[data-t]');
    if (tb) {
      var t = tb.dataset.t, x = X();
      if (t === 'undo') { var o = (x.orn || []).slice(); for (var i = o.length - 1; i >= 0; i--) if (o[i].by === me) { o.splice(i, 1); break; } setX({ orn: o }); }
      if (t === 'lights') { var modes = ['on', 'rainbow', 'off'], cur = modes.indexOf(x.lights || 'on'); setX({ lights: modes[(cur + 1) % 3] }); ding(cur === 1 ? 523 : 1046); say(['🌈 Rainbow lights!', '🌑 Lights off… cozy', '✨ Lights on!'][cur]); }
      if (t === 'clear') K.confirm({ emoji: '🧹', title: 'Take all ornaments off the tree?', yes: 'Clear', danger: true }).then(function (ok) { if (ok) setX({ orn: [] }); });
      return;
    }
    var hit = e.target.closest('[data-x]'); if (!hit) return;
    var what = hit.dataset.x, r = $('#xr-room').getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top;
    var X0 = X();
    if (what === 'tree') {
      if (!tool) { say('Pick an ornament below first 👇'); return; }
      var p = svgPoint(e), tx = (p.x - 2) * (120 / 128), ty = (p.y - 76) * (170 / 181);
      var half = ty < 22 ? 0 : ty < 70 ? (ty - 22) * 0.8 : ty < 108 ? 30 + (ty - 70) * 0.6 : ty < 146 ? 40 + (ty - 108) * 0.5 : 0;
      if (ty < 26 || ty > 144 || Math.abs(tx - 60) > half) { say('Put it on the branches 🎄'); return; }
      var orn = (X0.orn || []).concat([{ x: Math.round(tx), y: Math.round(ty), k: tool, by: me, at: Date.now() }]).slice(-80);
      setX({ orn: orn }); ding(784 + Math.random() * 600);
      if (orn.length % 10 === 0) { K.confetti({ count: 40 }); say(orn.length + ' ornaments! Beautiful 🎄'); }
      if (me === 'her' && orn.filter(function (o) { return o.by === 'her'; }).length === 1) K.logEvent('🎄', 'Started decorating the Christmas tree');
      return;
    }
    if (what === 'cat') {
      var pets = (+X0.pets || 0) + 1; setX({ pets: pets }); purr(); burst('💕', 5, cx, cy - 20);
      hit.classList.add('awake'); setTimeout(function () { hit.classList.remove('awake'); }, 2500);
      say(['Purrrr… 😻', 'Mrrrow 💚', 'The cat loves you', 'Purr purr purr', '*slow blink* 😽'][pets % 5] + ' (petted ' + pets + ' times)');
      return;
    }
    if (what === 'fire') { setX({ fireBoost: Date.now() + 6000, logs: (+X0.logs || 0) + 1 }); crackle(); burst('✨', 6, cx, cy - 10); say('🪵 Another log on the fire! So warm 🔥'); setTimeout(drawRoom, 6100); return; }
    if (what === 'stockL') {
      var notes = K.notes(), n = notes[Math.floor(Math.random() * notes.length)];
      say('🧦 Inside your stocking: "' + n + '"'); burst('💚', 4, cx, cy); return;
    }
    if (what === 'stockC') { say(['🧦 Chengxuan\'s stocking: one kiwi 🥝 and a lot of love', '🧦 Just a note: "I miss Livina" 🥺', '🧦 A coal… for not being there yet 😅'][Math.floor(Math.random() * 3)]); return; }
    if (what === 'cocoa') {
      var c = X0.cocoa == null ? 5 : +X0.cocoa;
      if (c > 0) { setX({ cocoa: c - 1 }); say(c > 1 ? '☕ Mmm, hot cocoa (' + (c - 1) + ' sips left)' : '☕ All gone! Tap again to refill'); burst('💭', 2, cx, cy - 10); }
      else { setX({ cocoa: 5 }); say('☕ Refilled with extra marshmallows 🍫'); ding(659); }
      return;
    }
    if (what === 'cookies') {
      var k = X0.cookies == null ? 5 : +X0.cookies;
      if (k > 0) { setX({ cookies: k - 1 }); say(k > 1 ? '🍪 Nom! ' + (k - 1) + ' left (leave some for Santa)' : '🍪 You ate Santa\'s cookies 😱 Tap to bake more'); burst('🍪', 3, cx, cy); }
      else { setX({ cookies: 5 }); say('🍪 Fresh cookies out of the oven!'); }
      return;
    }
    if (what === 'mistletoe') {
      kissSnd(); burst('💋', 8, cx, cy + 20); say('💋 Under the mistletoe! A kiss is on its way to ' + (other === 'him' ? 'Chengxuan' : 'Livina'));
      if (K.dmQuickSend && Date.now() - (onClick.kissAt || 0) > 20000) { onClick.kissAt = Date.now(); K.dmQuickSend('😘 (from under the mistletoe 🌿)'); }
      return;
    }
    if (what === 'window') { setX({ storm: !X0.storm }); say(X0.storm ? '🌤️ The snow calms down' : '❄️ Snowstorm outside! Stay cozy'); sleigh(); return; }
    if (what === 'music') { jingle(); burst('🎵', 6, cx, cy); say('🎵 Jingle bells, jingle bells…'); return; }
    if (what === 'gift') { var g = hit.dataset.gift; close(); var el = document.querySelector('.gift[data-id="' + g + '"]'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 1400); } }
  }

  // open the room from the scene (presents still jump to their card)
  $('#xmas-scene').addEventListener('click', function (e) {
    if (e.target.closest('[data-gift]') || e.target.closest('[data-sound]')) return;
    if (!(K.theme && K.theme() === 'christmas')) return;
    open();
  }, true);
  if (location.hash === '#xmas' && K.theme && K.theme() === 'christmas') setTimeout(open, 500);
  DB.subscribe(function () { if (overlay) { var sig = JSON.stringify(X()); if (sig !== open.sig) { open.sig = sig; drawRoom(); } } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
});
