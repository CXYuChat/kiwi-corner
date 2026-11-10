/* guesses.js: Livina guesses presents and makes wishes; Chengxuan replies from the admin page. */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, $ = K.$, esc = K.esc;
  if (!$('#guess-form') || !DB.user) return;
  var VERDICT = { yes: '✅ Correct! (shh 🤫)', close: '🔥 So close!', warm: '🙂 Getting warmer', no: '❌ Nope, keep guessing' };
  var WISH = { noted: '💚 Noted!', maybe: '🤔 Maybe… 👀', coming: '🎁 It\'s on its way!', no: '🙈 Not this time' };
  function uid() { return Math.random().toString(36).slice(2, 9); }

  function render() {
    var gs = K.gifts().filter(function (g) { return !g.opened; });
    var sel = $('#g-which'), cur = sel.value;
    sel.innerHTML = gs.length ? gs.map(function (g) { return '<option value="' + esc(g.id) + '">Present #' + g.n + ': ' + esc(g.hint || '') + '</option>'; }).join('')
      : '<option value="">All presents are opened 🎉</option>';
    if (cur) sel.value = cur;
    var num = {}; K.gifts().forEach(function (g) { num[g.id] = g.n; });
    var guesses = (DB.her.guesses || []).slice().reverse();
    $('#guess-list').innerHTML = guesses.map(function (x) {
      return '<li><span>#' + (num[x.giftId] || '?') + ': "' + esc(x.text) + '"' + (x.note ? '<br><small>' + esc(x.note) + '</small>' : '') + '</span>' +
        '<span class="amt">' + (x.verdict ? VERDICT[x.verdict] : '⏳ waiting') + '</span></li>';
    }).join('');
    var wishes = (DB.her.wishes || []).slice().reverse();
    $('#wish-list').innerHTML = wishes.map(function (x) {
      return '<li><span>' + esc(x.text) + (x.note ? '<br><small>' + esc(x.note) + '</small>' : '') + '</span>' +
        '<span class="amt">' + (x.status ? WISH[x.status] : '⏳ sent') + '</span></li>';
    }).join('');
  }
  $('#guess-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = $('#g-text').value.trim(), gid = $('#g-which').value;
    if (!t || !gid) return;
    DB.setHer({ guesses: (DB.her.guesses || []).concat([{ id: uid(), giftId: gid, text: t, at: Date.now() }]).slice(-100) });
    $('#g-text').value = '';
    K.confetti({ count: 30 });
  });
  $('#wish-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = $('#w-text').value.trim(); if (!t) return;
    DB.setHer({ wishes: (DB.her.wishes || []).concat([{ id: uid(), text: t, at: Date.now() }]).slice(-100) });
    $('#w-text').value = '';
    K.confetti({ count: 30 });
  });
  render(); DB.subscribe(render);
  K.guessLabels = { VERDICT: VERDICT, WISH: WISH };
});
