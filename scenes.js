/* scenes.js: an animated scene for each theme.
   K.giftScene(theme, gifts) → big picture on the Gifts page with her presents piled in it (tap a present = jump to it).
   K.homeDeco(theme)          → a decoration next to the kiwi on Home.
   Christmas lives in common.js (tree + fireplace); Scrapbook is here. Pure SVG + CSS animation. */
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
  // ---------------------------------------------------------------- scenes
  var SCENES = {};

  // ✂️ Scrapbook: a kraft-paper desk with a notebook page, taped polaroids, sticky notes, paper-heart bunting and a paper plane
  function tape(x, y, w, rot, col) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="10" fill="' + (col || 'rgba(150,220,120,.8)') + '" transform="rotate(' + rot + ' ' + (x + w / 2) + ' ' + (y + 5) + ')"/>'; }
  function gtext(x, y, size, col, txt, anchor) { return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + col + '" font-family="Gaegu, cursive" font-weight="700"' + (anchor ? ' text-anchor="middle"' : '') + '>' + txt + '</text>'; }
  function polaroid(x, y, rot, inner, cap, delay) {
    return '<g class="s-sway" style="animation-duration:5s;animation-delay:' + (delay || 0) + 's"><g transform="rotate(' + rot + ' ' + (x + 30) + ' ' + (y + 36) + ')">' +
      '<rect x="' + (x + 2) + '" y="' + (y + 3) + '" width="60" height="72" fill="rgba(90,60,20,.22)"/><rect x="' + x + '" y="' + y + '" width="60" height="72" fill="#fff"/>' +
      '<g transform="translate(' + (x + 5) + ' ' + (y + 5) + ')">' + inner + '</g>' + gtext(x + 30, y + 67, 9, '#4a3423', cap, true) + '</g>' + tape(x + 16, y - 5, 28, rot - 6) + '</g>';
  }
  SCENES.scrapbook = function (gifts) {
    var dots = '', i;
    for (i = 0; i < 60; i++) dots += '<circle cx="' + (rnd(i + 5) * 400).toFixed(0) + '" cy="' + (rnd(i + 9) * 230).toFixed(0) + '" r=".9" fill="rgba(120,80,40,.18)"/>';
    var lines = '';
    for (i = 0; i < 7; i++) lines += '<path d="M142 ' + (56 + i * 18) + ' H298" stroke="rgba(110,170,230,.4)" stroke-width="1"/>';
    var flags = '', fc = ['#ff9cb8', '#ffe066', '#9ccf3a', '#8ec5ff', '#c9a7ff', '#ff8a5c', '#ff9cb8', '#ffe066', '#9ccf3a'];
    for (i = 0; i < 9; i++) { var fx = 30 + i * 42, fy = 10 + Math.sin(i / 8 * Math.PI) * 14; flags += '<g class="s-sway" style="animation-duration:' + (2.4 + rnd(i) * 1.6).toFixed(1) + 's;animation-delay:-' + (rnd(i + 3) * 2).toFixed(1) + 's">' + heart(fx, fy + 12, 8, fc[i]) + '</g>'; }
    var kiwiPic = '<rect width="50" height="50" fill="#cfeaff"/><circle cx="38" cy="12" r="6" fill="#fff6c9"/><ellipse cx="24" cy="38" rx="14" ry="10" fill="#7a4a2a"/><circle cx="34" cy="30" r="6" fill="#7a4a2a"/><circle cx="35.5" cy="29" r="1.2" fill="#111"/><path d="M39 31 l9 3" stroke="#d9a35a" stroke-width="2" stroke-linecap="round"/><rect y="44" width="50" height="6" fill="#9ccf3a"/>';
    var cityPic = '<rect width="50" height="50" fill="#ffd194"/><circle cx="25" cy="22" r="10" fill="#ff9a8b"/><path d="M0 50 V34 h8 v-8 h6 v12 h6 v-16 h4 v16 h8 v-10 h6 v6 h12 V50 Z" fill="#a8556b"/>';
    return wrapScene(
      '<rect width="400" height="230" fill="#e9d5b5"/>' + dots +
      '<path d="M10 8 Q200 44 390 8" stroke="#8a6a4a" stroke-width="1.2" fill="none"/>' + flags +
      '<g transform="rotate(-2 220 110)"><rect x="145" y="42" width="156" height="140" fill="rgba(90,60,20,.18)"/><rect x="142" y="38" width="156" height="140" fill="#fffdf6"/>' + lines +
        '<path d="M164 38 V178" stroke="rgba(226,96,110,.5)" stroke-width="1.5"/>' +
        gtext(172, 66, 15, '#4a3423', 'our little book ♡') + gtext(172, 86, 12, '#7a5a3a', '· call on tuesday') + gtext(172, 104, 12, '#7a5a3a', '· movie night!!') + gtext(172, 122, 12, '#7a5a3a', '· open a present') +
        '<g class="s-bob">' + heart(272, 150, 9, '#ff6f91') + '</g>' + tape(200, 32, 40, 3, 'rgba(255,190,210,.85)') + '</g>' +
      polaroid(20, 46, -8, kiwiPic, 'kiwi ♡', 0) +
      polaroid(316, 40, 7, cityPic, 'barcelona', -1.3) +
      '<g transform="rotate(5 345 152)"><rect x="318" y="128" width="56" height="48" fill="#fff3a8"/>' + gtext(346, 149, 12, '#4a3423', 'miss you', true) + gtext(346, 165, 12, '#c2456a', 'xoxo', true) + '</g>' +
      '<g transform="rotate(-6 60 150)"><rect x="30" y="128" width="58" height="40" fill="#d6f1ff"/>' + gtext(59, 152, 11, '#4a3423', 'see you soon', true) + '</g>' +
      '<g class="s-drift-slow"><path d="M0 70 l26 -8 l-8 18 l-4 -7 Z" fill="#fff" stroke="#c9b48a" stroke-width="1"/><path d="M14 73 l12 -11" stroke="#c9b48a" stroke-width="1"/><path d="M-4 74 q-20 6 -40 -2" stroke="#a3845e" stroke-width="1" stroke-dasharray="3 4" fill="none"/></g>' +
      pile(gifts, 120, 46, 1),
      '#d9bf96', 'Tap a present to find it below ✂️');
  };

  // ---------------------------------------------------------------- Home decorations (next to the kiwi)
  var DECO = {
    scrapbook: '<svg viewBox="0 0 120 170">' +
      '<g class="s-sway" style="animation-duration:4s"><g transform="rotate(-8 60 70)"><rect x="27" y="28" width="72" height="86" fill="rgba(90,60,20,.2)"/><rect x="24" y="24" width="72" height="86" fill="#fff"/>' +
        '<rect x="30" y="30" width="60" height="60" fill="#ffd6e2"/><g class="s-bob">' + heart(60, 60, 18, '#ff6f91') + '</g>' + gtext(60, 104, 12, '#4a3423', 'us ♡', true) + '</g>' +
        '<rect x="44" y="16" width="34" height="11" fill="rgba(150,220,120,.85)" transform="rotate(-10 61 21)"/></g>' +
      '<g class="s-bob" style="animation-delay:-1s"><g transform="rotate(6 84 140)"><rect x="62" y="120" width="48" height="40" fill="#fff3a8"/>' + gtext(86, 144, 13, '#c2456a', 'hi baby', true) + '</g></g>' +
      '<text class="s-twinkle" x="10" y="140" font-size="14" fill="#ffc21a">★</text><text class="s-twinkle" style="animation-delay:-1s" x="100" y="24" font-size="12" fill="#ff9cb8">✿</text></svg>'
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
