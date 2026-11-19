/* scenes.js: an animated scene for each theme.
   K.giftScene(theme, gifts) → big picture on the Gifts page with her presents piled in it (tap a present = jump to it).
   K.homeDeco(theme)          → a decoration next to the kiwi on Home.
   Christmas lives in common.js (tree + fireplace); the rest are here. Pure SVG + CSS animation. */
(function () {
  'use strict';
  var K = window.Kiwi; if (!K) return;
  var esc = K.esc;

  // ---------------------------------------------------------------- shared: a pile of presents
  // slots: [x, bottomY, width, height] in a 160×180 box, moved with ox/oy
  var SLOTS = [[20, 168, 46, 34], [68, 172, 38, 30], [108, 170, 42, 32], [36, 136, 36, 30], [78, 140, 34, 28], [56, 110, 30, 26], [118, 142, 30, 26], [6, 146, 28, 22]];
  function pile(gifts, ox, oy, s) {
    var out = '';
    (gifts || []).slice(0, SLOTS.length).forEach(function (g, i) {
      var sl = SLOTS[i], x = sl[0], y = sl[1], w = sl[2], h = sl[3], wrap = g.color || '#ff8fa3', rib = g.ribbon || '#ffd23f';
      var lid = g.opened
        ? '<rect x="' + (x - 3) + '" y="' + (y - h - 14) + '" width="' + (w + 6) + '" height="8" rx="2" fill="' + wrap + '" transform="rotate(-18 ' + (x + w / 2) + ' ' + (y - h) + ')"/>'
        : '<rect x="' + (x - 3) + '" y="' + (y - h - 2) + '" width="' + (w + 6) + '" height="8" rx="2" fill="' + wrap + '" stroke="rgba(0,0,0,.12)"/>';
      out += '<g class="xbox' + (g.opened ? ' open' : g.unlocked ? ' ready' : '') + '" data-gift="' + esc(g.id) + '" tabindex="0" role="button" aria-label="Present ' + g.n + '">' +
        '<rect x="' + x + '" y="' + (y - h) + '" width="' + w + '" height="' + h + '" rx="3" fill="' + wrap + '" stroke="rgba(0,0,0,.15)"/>' +
        '<rect x="' + (x + w / 2 - 3) + '" y="' + (y - h) + '" width="6" height="' + h + '" fill="' + rib + '"/>' + lid +
        (g.opened ? '<text x="' + (x + w / 2) + '" y="' + (y - h - 8) + '" font-size="12" text-anchor="middle">✨</text>'
          : '<path d="M' + (x + w / 2) + ' ' + (y - h - 2) + ' q-9 -10 -12 -2 q4 5 12 2 q9 -10 12 -2 q-4 5 -12 2" fill="' + rib + '"/>') +
        '<text x="' + (x + w / 2) + '" y="' + (y - h / 2 + 4) + '" font-size="11" font-weight="700" text-anchor="middle" fill="#fff" style="paint-order:stroke" stroke="rgba(0,0,0,.35)" stroke-width="2">' + g.n + '</text></g>';
    });
    return '<g transform="translate(' + ox + ' ' + oy + ') scale(' + (s || 1) + ')">' + out + '</g>';
  }
  function wrapScene(svg, bg, cap) {
    return '<div class="xscene" style="background:' + bg + '"><svg viewBox="0 0 400 230" class="xroom">' + svg + '</svg><p class="xcap" style="background:' + bg + '">' + (cap || 'Tap a present to find it below 🎁') + '</p></div>';
  }
  function rnd(seed) { var x = Math.sin(seed) * 10000; return x - Math.floor(x); }
  function heart(cx, cy, r, fill, cls, delay) {
    return '<path class="' + (cls || '') + '" style="animation-delay:' + (delay || 0) + 's" d="M' + cx + ' ' + (cy + r * .9) + ' C' + (cx - r * 1.4) + ' ' + (cy - r * .2) + ' ' + (cx - r * .6) + ' ' + (cy - r * 1.2) + ' ' + cx + ' ' + (cy - r * .45) + ' C' + (cx + r * .6) + ' ' + (cy - r * 1.2) + ' ' + (cx + r * 1.4) + ' ' + (cy - r * .2) + ' ' + cx + ' ' + (cy + r * .9) + ' Z" fill="' + fill + '"/>';
  }
  function balloon(x, y, col, delay, str) {
    return '<g class="s-bob" style="animation-delay:' + delay + 's"><path d="M' + x + ' ' + (y + 22) + ' q-4 20 3 40" stroke="' + (str || '#fff') + '" stroke-width="1" fill="none" opacity=".8"/>' +
      '<ellipse cx="' + x + '" cy="' + y + '" rx="13" ry="16" fill="' + col + '"/><path d="M' + (x - 3) + ' ' + (y + 15) + ' l3 5 l3 -5 Z" fill="' + col + '"/><ellipse cx="' + (x - 4) + '" cy="' + (y - 6) + '" rx="3" ry="5" fill="#fff" opacity=".45"/></g>';
  }
  function candle(x, y, h, col, delay) {
    return '<rect x="' + (x - 2.5) + '" y="' + (y - h) + '" width="5" height="' + h + '" rx="1" fill="' + col + '"/>' +
      '<path class="s-flick" style="animation-delay:' + delay + 's" d="M' + x + ' ' + (y - h - 11) + ' q5 6 0 10 q-5 -4 0 -10 Z" fill="#ffb21c"/><circle cx="' + x + '" cy="' + (y - h - 4) + '" r="6" fill="#ffd23f" opacity=".25" class="s-glow"/>';
  }

  // ---------------------------------------------------------------- scenes
  var SCENES = {};

  // 💘 Valentine: a rose-gold room, heart balloons, candlelit table, hearts floating up
  SCENES.valentine = function (gifts) {
    var hearts = '';
    for (var i = 0; i < 9; i++) hearts += heart(30 + rnd(i + 1) * 340, 200 - rnd(i + 7) * 30, 5 + rnd(i + 3) * 5, ['#ff6f91', '#ff9eb5', '#e2557f'][i % 3], 's-rise', (i * .9).toFixed(1));
    return wrapScene(
      '<defs><linearGradient id="vbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd6e1"/><stop offset="1" stop-color="#ffb3c6"/></linearGradient></defs>' +
      '<rect width="400" height="230" fill="url(#vbg)"/>' +
      '<g opacity=".25">' + [40, 120, 200, 280, 360].map(function (x, i) { return heart(x, 30 + (i % 2) * 20, 9, '#fff'); }).join('') + '</g>' +
      '<rect y="182" width="400" height="48" fill="#c9566f"/><rect y="182" width="400" height="6" fill="#b04560"/>' +
      // heart arch with lights
      '<path d="M210 182 V100 Q210 50 260 50 Q310 50 310 100 V182" fill="none" stroke="#e2557f" stroke-width="10"/>' +
      [214, 222, 240, 260, 280, 298, 306].map(function (x, i) { var y = [150, 100, 64, 52, 64, 100, 150][i]; return heart(x, y, 5, ['#fff', '#ffd23f'][i % 2], 's-twinkle', i * .3); }).join('') +
      // table with candles + roses
      '<rect x="230" y="150" width="70" height="8" rx="3" fill="#7a3048"/><rect x="236" y="158" width="6" height="26" fill="#7a3048"/><rect x="288" y="158" width="6" height="26" fill="#7a3048"/>' +
      candle(244, 150, 16, '#fff', 0) + candle(286, 150, 20, '#fff', .4) +
      '<path d="M262 150 l-4 -18 M266 150 l0 -22 M270 150 l4 -18" stroke="#2e7d32" stroke-width="2"/>' + ['#d32f2f', '#e91e63', '#d32f2f'].map(function (c, i) { return '<circle cx="' + (258 + i * 8) + '" cy="' + (130 - (i === 1) * 4) + '" r="5" fill="' + c + '"/>'; }).join('') +
      // big heart balloons
      '<g class="s-bob"><path d="M352 112 q-6 30 4 66" stroke="#fff" stroke-width="1" fill="none"/>' + heart(352, 94, 20, '#ff4d7a') + '</g>' +
      '<g class="s-bob" style="animation-delay:-1.2s"><path d="M378 124 q4 26 -8 54" stroke="#fff" stroke-width="1" fill="none"/>' + heart(378, 108, 15, '#ff8fab') + '</g>' +
      hearts + pile(gifts, 18, 44, 1),
      '#c9566f');
  };

  // 🎂 Birthday: party room, bunting, balloons, a big cake with flickering candles, confetti
  SCENES.birthday = function (gifts) {
    var flags = '', conf = '';
    for (var i = 0; i < 12; i++) flags += '<path d="M' + (10 + i * 33) + ' ' + (22 + Math.sin(i / 1.5) * 4) + ' l16 0 l-8 18 Z" fill="' + ['#ff6fb5', '#ffb703', '#8EE000', '#38b6d8', '#a77be6'][i % 5] + '" class="s-sway" style="animation-delay:' + (i * .2) + 's"/>';
    for (var j = 0; j < 18; j++) conf += '<rect class="s-fall" style="animation-delay:' + (-rnd(j + 2) * 6).toFixed(1) + 's" x="' + (rnd(j + 9) * 400).toFixed(0) + '" y="-10" width="4" height="7" fill="' + ['#ff6fb5', '#ffb703', '#8EE000', '#38b6d8', '#a77be6'][j % 5] + '"/>';
    return wrapScene(
      '<rect width="400" height="230" fill="#fff4dc"/><rect width="400" height="230" fill="#ffe7b0" opacity=".5"/>' +
      '<path d="M0 22 Q100 36 200 22 Q300 36 400 22" stroke="#7b4fbf" stroke-width="2" fill="none"/>' + flags +
      '<rect y="184" width="400" height="46" fill="#a77be6"/><rect y="184" width="400" height="6" fill="#7b4fbf"/>' +
      // table + cake
      '<rect x="200" y="170" width="140" height="10" rx="4" fill="#7b4fbf"/><rect x="210" y="180" width="8" height="10" fill="#573591"/><rect x="322" y="180" width="8" height="10" fill="#573591"/>' +
      '<rect x="226" y="140" width="88" height="30" rx="6" fill="#ff9ecf"/><path d="M226 148 q11 8 22 0 q11 8 22 0 q11 8 22 0 q11 8 22 0" fill="#fff" stroke="#fff"/>' +
      '<rect x="240" y="114" width="60" height="28" rx="6" fill="#ffe08a"/><path d="M240 121 q7.5 6 15 0 q7.5 6 15 0 q7.5 6 15 0 q7.5 6 15 0" fill="#fff" stroke="#fff"/>' +
      '<rect x="252" y="94" width="36" height="22" rx="5" fill="#a77be6"/>' +
      [258, 266, 274, 282].map(function (x, i) { return candle(x, 94, 12, ['#ff6fb5', '#38b6d8', '#8EE000', '#ffb703'][i], i * .25); }).join('') +
      '<text x="270" y="162" font-size="10" font-weight="700" text-anchor="middle" fill="#fff">HAPPY DAY</text>' +
      balloon(360, 70, '#ff6fb5', 0) + balloon(382, 92, '#38b6d8', -.8) + balloon(340, 96, '#ffb703', -1.6) +
      balloon(180, 64, '#8EE000', -.4) + balloon(160, 84, '#a77be6', -1.2) +
      conf + pile(gifts, 14, 48, 1),
      '#7b4fbf');
  };

  // 🌸 Sakura: evening garden, cherry tree, drifting petals, glowing lantern, moon, little bridge
  SCENES.sakura = function (gifts) {
    var blossoms = '', petals = '';
    for (var i = 0; i < 46; i++) { var a = rnd(i + 1) * Math.PI * 2, r = rnd(i + 5) * 55; blossoms += '<circle cx="' + (300 + Math.cos(a) * r * 1.3).toFixed(1) + '" cy="' + (66 + Math.sin(a) * r * .7).toFixed(1) + '" r="' + (6 + rnd(i + 2) * 7).toFixed(1) + '" fill="' + ['#ffc1d6', '#ffd6e4', '#f7a8c4', '#ffe4ee'][i % 4] + '"/>'; }
    for (var j = 0; j < 14; j++) petals += '<ellipse class="s-drift" style="animation-delay:' + (-rnd(j + 3) * 9).toFixed(1) + 's" cx="' + (200 + rnd(j + 1) * 200).toFixed(0) + '" cy="' + (40 + rnd(j + 8) * 120).toFixed(0) + '" rx="3.5" ry="2.2" fill="#ffb7cf"/>';
    return wrapScene(
      '<defs><linearGradient id="sbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6ef"/><stop offset="1" stop-color="#ffd0e0"/></linearGradient></defs>' +
      '<rect width="400" height="230" fill="url(#sbg)"/>' +
      '<circle cx="80" cy="46" r="22" fill="#fff7fb"/><circle cx="80" cy="46" r="30" fill="#fff" opacity=".35" class="s-glow"/>' +
      '<path d="M0 150 Q60 120 130 140 Q200 118 260 138 Q330 120 400 140 V230 H0 Z" fill="#cfe8c5"/>' +
      '<rect y="178" width="400" height="52" fill="#b9dca9"/>' +
      // stream + bridge
      '<path d="M150 230 Q170 200 200 192 Q240 184 260 160" stroke="#a8d8ea" stroke-width="18" fill="none" opacity=".9"/>' +
      '<path d="M176 196 Q206 168 236 190" stroke="#c0392b" stroke-width="6" fill="none"/><path d="M180 194 v10 M232 188 v10 M206 178 v14" stroke="#c0392b" stroke-width="3"/>' +
      // tree
      '<path d="M296 182 Q300 140 290 112 Q310 120 312 96 M300 140 Q330 120 340 98 M296 130 Q268 112 258 92" stroke="#6b4a3a" stroke-width="9" fill="none" stroke-linecap="round"/>' +
      '<g class="s-sway" style="transform-origin:300px 170px;animation-duration:6s">' + blossoms + '</g>' +
      // lantern
      '<rect x="356" y="150" width="6" height="34" fill="#7a5a4a"/><rect x="346" y="126" width="26" height="26" rx="4" fill="#ffe08a" class="s-glow"/><rect x="344" y="122" width="30" height="5" fill="#7a5a4a"/><circle cx="359" cy="139" r="18" fill="#ffd23f" opacity=".25" class="s-glow"/>' +
      // picnic blanket
      '<path d="M8 188 L170 188 L182 222 L-4 222 Z" fill="#fff" opacity=".85"/><path d="M8 188 L170 188 L182 222 L-4 222 Z" fill="none" stroke="#f4a6c0" stroke-width="2" stroke-dasharray="6 4"/>' +
      petals + pile(gifts, 12, 46, 1),
      '#b07a8e');
  };

  // 🌊 Ocean: beach, rolling waves, bobbing sailboat, swimming fish, treasure chest, presents on the sand
  SCENES.ocean = function (gifts) {
    var fish = '';
    [[0, 128, '#ff9f43'], [1, 146, '#feca57'], [2, 118, '#ff6b81']].forEach(function (f) { fish += '<g class="s-swim" style="animation-delay:' + (-f[0] * 3) + 's"><path d="M0 ' + f[1] + ' q12 -8 22 0 q-10 8 -22 0 Z M22 ' + f[1] + ' l8 -6 v12 Z" fill="' + f[2] + '"/><circle cx="6" cy="' + (f[1] - 1) + '" r="1.3" fill="#222"/></g>'; });
    return wrapScene(
      '<defs><linearGradient id="obg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe9ff"/><stop offset=".55" stop-color="#e8f8ff"/></linearGradient><linearGradient id="osea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#38b6d8"/><stop offset="1" stop-color="#1c80a0"/></linearGradient></defs>' +
      '<rect width="400" height="230" fill="url(#obg)"/>' +
      '<circle cx="330" cy="40" r="20" fill="#ffd23f" class="s-glow"/><circle cx="330" cy="40" r="30" fill="#ffd23f" opacity=".2" class="s-glow"/>' +
      '<g class="s-drift-slow"><ellipse cx="80" cy="36" rx="26" ry="9" fill="#fff"/><ellipse cx="98" cy="30" rx="16" ry="9" fill="#fff"/></g>' +
      '<rect y="96" width="400" height="90" fill="url(#osea)"/>' +
      '<g class="s-wave"><path d="M-40 100 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 V110 H-40 Z" fill="#7fd3ea"/></g>' +
      '<g class="s-bob" style="animation-duration:3s"><path d="M250 104 h50 l-8 12 h-34 Z" fill="#fff"/><path d="M274 62 v42" stroke="#7a5230" stroke-width="2"/><path d="M276 64 l22 34 h-22 Z" fill="#ff6b81"/><path d="M272 70 l-18 28 h18 Z" fill="#fff"/></g>' +
      fish +
      '<path d="M0 176 Q100 160 200 170 Q300 160 400 172 V230 H0 Z" fill="#f5deb3"/>' +
      '<g class="s-wave2"><path d="M-40 172 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/></g>' +
      // treasure chest
      '<rect x="300" y="182" width="56" height="30" rx="4" fill="#8b5a2b"/><path d="M300 186 q28 -26 56 0" fill="#a0692f"/><rect x="324" y="186" width="8" height="12" fill="#ffd23f"/>' +
      '<circle cx="312" cy="180" r="4" fill="#ffd23f" class="s-twinkle"/><circle cx="340" cy="176" r="3" fill="#fff6b0" class="s-twinkle" style="animation-delay:.6s"/><circle cx="350" cy="182" r="3.5" fill="#ffd23f" class="s-twinkle" style="animation-delay:1.1s"/>' +
      '<text x="372" y="214" font-size="16">🐚</text><text x="270" y="222" font-size="14">⭐</text>' +
      pile(gifts, 16, 48, 1),
      '#1c80a0');
  };

  // 🍂 Autumn: orange forest, falling leaves, pumpkins, crackling campfire
  SCENES.autumn = function (gifts) {
    var leaves = '', trees = '';
    for (var i = 0; i < 14; i++) leaves += '<text class="s-fall" style="animation-delay:' + (-rnd(i + 4) * 7).toFixed(1) + 's" x="' + (rnd(i + 1) * 390).toFixed(0) + '" y="-10" font-size="' + (10 + rnd(i + 2) * 8).toFixed(0) + '">' + ['🍂', '🍁'][i % 2] + '</text>';
    [[40, '#e07a2e'], [110, '#c0392b'], [330, '#f39c12'], [380, '#e67e22']].forEach(function (t, i) { trees += '<rect x="' + (t[0] - 4) + '" y="96" width="8" height="70" fill="#6b3e1d"/><g class="s-sway" style="transform-origin:' + t[0] + 'px 160px;animation-delay:' + (-i) + 's"><circle cx="' + t[0] + '" cy="84" r="30" fill="' + t[1] + '"/><circle cx="' + (t[0] - 16) + '" cy="98" r="18" fill="' + t[1] + '"/><circle cx="' + (t[0] + 18) + '" cy="96" r="20" fill="' + t[1] + '"/></g>'; });
    return wrapScene(
      '<defs><linearGradient id="abg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd8a8"/><stop offset="1" stop-color="#ffb877"/></linearGradient></defs>' +
      '<rect width="400" height="230" fill="url(#abg)"/>' +
      '<circle cx="210" cy="60" r="26" fill="#fff3c4" opacity=".9"/>' +
      '<path d="M0 140 Q80 110 170 132 Q260 108 400 134 V230 H0 Z" fill="#d9a066"/>' + trees +
      '<rect y="174" width="400" height="56" fill="#b5703a"/>' +
      // cabin
      '<rect x="160" y="112" width="80" height="62" fill="#8b4a23"/><path d="M150 116 L200 80 L250 116 Z" fill="#5a2d14"/><rect x="190" y="140" width="20" height="34" fill="#4a2410"/><rect x="168" y="124" width="16" height="14" fill="#ffd27a" class="s-glow"/><rect x="216" y="124" width="16" height="14" fill="#ffd27a" class="s-glow"/>' +
      // campfire
      '<ellipse cx="290" cy="196" rx="40" ry="10" fill="#ffb347" opacity=".45" class="s-glow"/>' +
      '<path d="M270 200 l40 -8 M272 192 l36 10" stroke="#5b3a22" stroke-width="6" stroke-linecap="round"/>' +
      '<g class="xfire"><path class="xf f1" d="M276 196 Q272 178 284 166 Q284 178 291 180 Q292 166 300 158 Q306 174 304 196 Z" fill="#ff7b1c"/><path class="xf f2" d="M282 196 Q280 182 289 174 Q290 184 296 186 Q300 178 302 196 Z" fill="#ffd23f"/></g>' +
      '<g class="xembers"><circle cx="288" cy="170" r="1.5" fill="#ffd23f"/><circle cx="296" cy="164" r="1.3" fill="#ff9a3c"/><circle cx="300" cy="172" r="1.4" fill="#ffd23f"/></g>' +
      // pumpkins
      '<g transform="translate(340 190)"><ellipse rx="16" ry="12" fill="#e67e22"/><path d="M-6 -11 q6 -6 12 0" fill="none" stroke="#c0571a" stroke-width="2"/><rect x="-2" y="-18" width="4" height="7" fill="#4a7a2a"/></g>' +
      '<g transform="translate(372 200)"><ellipse rx="11" ry="8" fill="#f39c12"/><rect x="-1.5" y="-13" width="3" height="5" fill="#4a7a2a"/></g>' +
      leaves + pile(gifts, 12, 46, 1),
      '#8b4a23');
  };

  // 🌙 Night: rooftop under the stars, glowing moon, shooting star, telescope, string lights, lantern
  SCENES.night = function (gifts) {
    var stars = '';
    for (var i = 0; i < 40; i++) stars += '<circle class="s-twinkle" style="animation-delay:' + (rnd(i + 1) * 3).toFixed(1) + 's" cx="' + (rnd(i + 2) * 400).toFixed(0) + '" cy="' + (rnd(i + 3) * 120).toFixed(0) + '" r="' + (0.8 + rnd(i + 4) * 1.6).toFixed(1) + '" fill="#fff6c9"/>';
    return wrapScene(
      '<defs><linearGradient id="nbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b1640"/><stop offset="1" stop-color="#4b3f8f"/></linearGradient></defs>' +
      '<rect width="400" height="230" fill="url(#nbg)"/>' + stars +
      '<g class="s-shoot"><path d="M0 0 l40 14" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".9"/><circle cx="40" cy="14" r="2.5" fill="#fff"/></g>' +
      '<circle cx="320" cy="50" r="40" fill="#fff6c9" opacity=".12" class="s-glow"/><circle cx="320" cy="50" r="24" fill="#fff6c9"/><circle cx="330" cy="44" r="22" fill="#2b2560"/>' +
      // city skyline
      '<path d="M0 160 h30 v-30 h20 v20 h24 v-40 h18 v30 h30 v-22 h26 v36 h22 v-50 h20 v40 h30 v-26 h24 v30 h28 v-18 h22 v24 h30 v-34 h22 v40 h34 V230 H0 Z" fill="#2b2560"/>' +
      [[38, 140], [86, 128], [126, 150], [196, 124], [240, 150], [296, 142], [348, 136]].map(function (w, i) { return '<rect class="s-twinkle" style="animation-delay:' + (i * .7) + 's;animation-duration:4s" x="' + w[0] + '" y="' + w[1] + '" width="5" height="6" fill="#ffd27a"/>'; }).join('') +
      // rooftop
      '<rect y="178" width="400" height="52" fill="#3d3477"/><rect y="178" width="400" height="5" fill="#5f50c8"/>' +
      '<path d="M0 100 Q100 130 200 104 Q300 130 400 100" stroke="#cfc6ff" stroke-width="1" fill="none" opacity=".6"/>' +
      [20, 60, 100, 140, 180, 220, 260, 300, 340, 380].map(function (x, i) { var y = 100 + Math.sin((x / 400) * Math.PI * 2) * 14 + 10; return '<circle class="xl" style="animation-delay:' + (i * .25) + 's" cx="' + x + '" cy="' + y.toFixed(0) + '" r="3" fill="' + ['#ffd23f', '#ff9ecf', '#9ef0ff'][i % 3] + '"/>'; }).join('') +
      // telescope
      '<path d="M300 182 l14 -30 M314 152 l14 30 M314 152 v30" stroke="#cfc6ff" stroke-width="2.5"/><rect x="290" y="130" width="48" height="12" rx="3" fill="#9b8cff" transform="rotate(-28 314 140)"/>' +
      // lantern + blanket
      '<path d="M10 192 L180 192 L190 224 L0 224 Z" fill="#6a5acd" opacity=".85"/>' +
      '<rect x="356" y="166" width="20" height="18" rx="3" fill="#ffd27a" class="s-glow"/><rect x="354" y="162" width="24" height="4" fill="#cfc6ff"/><circle cx="366" cy="175" r="18" fill="#ffd23f" opacity=".2" class="s-glow"/>' +
      pile(gifts, 14, 48, 1),
      '#3d3477');
  };

  // ---------------------------------------------------------------- Home decorations (next to the kiwi)
  var DECO = {
    valentine: '<svg viewBox="0 0 120 170"><path d="M60 70 q-6 50 0 96" stroke="#c2185b" stroke-width="1.5" fill="none"/><path d="M60 70 q14 40 -4 96" stroke="#c2185b" stroke-width="1.2" fill="none"/>' +
      '<g class="s-bob">' + heart(44, 46, 24, '#ff4d7a') + '</g><g class="s-bob" style="animation-delay:-1s">' + heart(80, 34, 18, '#ff8fab') + '</g><g class="s-bob" style="animation-delay:-2s">' + heart(70, 78, 14, '#e2557f') + '</g></svg>',
    birthday: '<svg viewBox="0 0 120 170">' + balloon(40, 40, '#ff6fb5', 0, '#7b4fbf') + balloon(72, 30, '#38b6d8', -.8, '#7b4fbf') + balloon(92, 62, '#ffb703', -1.6, '#7b4fbf') + balloon(56, 70, '#8EE000', -2.2, '#7b4fbf') + '</svg>',
    sakura: (function () { var b = ''; for (var i = 0; i < 22; i++) { var a = rnd(i + 11) * Math.PI * 2, r = rnd(i + 21) * 34; b += '<circle cx="' + (64 + Math.cos(a) * r).toFixed(1) + '" cy="' + (60 + Math.sin(a) * r * .8).toFixed(1) + '" r="' + (6 + rnd(i) * 6).toFixed(1) + '" fill="' + ['#ffc1d6', '#ffd6e4', '#f7a8c4'][i % 3] + '"/>'; }
      return '<svg viewBox="0 0 120 170"><path d="M58 166 Q62 120 52 92 Q70 98 72 74 M60 122 Q86 104 92 84" stroke="#6b4a3a" stroke-width="7" fill="none" stroke-linecap="round"/><g class="s-sway" style="transform-origin:60px 150px;animation-duration:6s">' + b + '</g></svg>'; })(),
    ocean: '<svg viewBox="0 0 120 170"><g class="s-sway" style="transform-origin:60px 166px;animation-duration:5s"><path d="M60 166 Q54 110 66 60" stroke="#8b5a2b" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path d="M66 60 q-30 -6 -48 16 q22 -6 48 -16 M66 60 q-14 -26 -40 -26 q22 8 40 26 M66 60 q18 -28 44 -22 q-26 2 -44 22 M66 60 q32 0 44 26 q-20 -14 -44 -26" fill="#2e9e4f"/><circle cx="62" cy="66" r="5" fill="#8b5a2b"/><circle cx="70" cy="68" r="5" fill="#7a4a1f"/></g></svg>',
    autumn: '<svg viewBox="0 0 120 170"><rect x="56" y="80" width="8" height="86" fill="#6b3e1d"/><g class="s-sway" style="transform-origin:60px 160px"><circle cx="60" cy="66" r="34" fill="#e07a2e"/><circle cx="40" cy="82" r="20" fill="#c0392b"/><circle cx="82" cy="80" r="22" fill="#f39c12"/></g>' +
      '<g transform="translate(30 156)"><ellipse rx="16" ry="11" fill="#e67e22"/><rect x="-2" y="-17" width="4" height="7" fill="#4a7a2a"/></g><text class="s-fall" x="80" y="0" font-size="14">🍁</text><text class="s-fall" style="animation-delay:-3s" x="20" y="0" font-size="12">🍂</text></svg>',
    night: '<svg viewBox="0 0 120 170"><circle cx="64" cy="58" r="40" fill="#fff6c9" opacity=".15" class="s-glow"/><circle cx="64" cy="58" r="28" fill="#fff6c9"/><circle cx="76" cy="50" r="26" fill="var(--cream)"/>' +
      '<circle cx="48" cy="56" r="1.6" fill="#7a6a3a"/><path d="M44 66 q4 3 8 0" stroke="#7a6a3a" stroke-width="1.4" fill="none"/>' +
      [[18, 30], [100, 24], [96, 100], [24, 104], [56, 130]].map(function (s, i) { return '<text class="s-twinkle" style="animation-delay:' + (i * .5) + 's" x="' + s[0] + '" y="' + s[1] + '" font-size="12">✨</text>'; }).join('') + '</svg>'
  };

  K.giftScene = function (theme, gifts) {
    if (theme === 'christmas' && K.xmasScene) return K.xmasScene(gifts);
    return SCENES[theme] ? SCENES[theme](gifts) : '';
  };
  K.homeDeco = function (theme) {
    if (theme === 'christmas' && K.xmasTreeSVG) return K.xmasTreeSVG();
    return DECO[theme] || '';
  };
})();
