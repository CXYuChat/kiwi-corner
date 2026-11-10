/* countdowns.js: every countdown, soonest first. */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, list = K.$('#cd-list');
  var sig = '';
  function draw() {
    var cds = K.countdowns(), f = K.featured();
    var s = cds.map(function (c) { return c.id + c.at; }).join() + (f && f.id);
    if (s !== sig) {
      sig = s;
      list.innerHTML = cds.length ? cds.map(function (c) {
        return '<div class="card cd-item' + (c.live ? ' live' : '') + (f && f.id === c.id ? ' featured' : '') + '" data-id="' + K.esc(c.id) + '">' +
          '<div class="em">' + K.esc(c.emoji) + '</div><div><div class="label">' + K.esc(c.label) + (f && f.id === c.id ? ' · ⭐ main' : '') + '</div>' +
          '<div class="d"></div><div class="s muted">' + K.esc(c.sub) + '</div></div></div>';
      }).join('') : '<div class="card" style="text-align:center">Nothing to count down right now 🥝</div>';
    }
    cds.forEach(function (c) {
      var el = list.querySelector('[data-id="' + c.id + '"] .d');
      if (el) el.textContent = K.fmtCountdown(c);
    });
  }
  draw(); setInterval(draw, 1000); DB.subscribe(function () { sig = ''; draw(); });
});
