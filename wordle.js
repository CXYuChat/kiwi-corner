/* wordle.js: Chengxuan sets a secret word (admin → ✍️ Write → 🟩 Wordle); she guesses it on her Fun page. 6 tries.
   her.wordle = { id, word, hint, reward, at, guesses: [], status: 'playing' | 'won' | 'lost' }; finished games go to her.wordleHist. */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, $ = K.$, esc = K.esc;
  var card = $('#wordle-card'); if (!card || !DB.user) return;
  var isHer = DB.user.role === 'livina', typed = '', ROWS = ['qwertyuiop', 'asdfghjkl', '⏎zxcvbnm⌫'];

  K.wordleScore = function (guess, word) {   // 'g' right spot, 'y' in the word, '-' not in it (handles double letters)
    var res = [], left = {}, i;
    for (i = 0; i < word.length; i++) { if (guess[i] === word[i]) res[i] = 'g'; else left[word[i]] = (left[word[i]] || 0) + 1; }
    for (i = 0; i < word.length; i++) { if (res[i]) continue; if (left[guess[i]]) { res[i] = 'y'; left[guess[i]]--; } else res[i] = '-'; }
    return res;
  };
  function game() { return DB.her.wordle || null; }
  function draw() {
    var g = game();
    card.hidden = !g;
    if (!g) return;
    var w = String(g.word || '').toLowerCase(), n = w.length, rows = '';
    for (var r = 0; r < 6; r++) {
      var gs = (g.guesses || [])[r], cur = !gs && r === (g.guesses || []).length && g.status === 'playing';
      var letters = gs || (cur ? typed : ''), sc = gs ? K.wordleScore(gs, w) : [];
      rows += '<div class="wd-row' + (cur ? ' cur' : '') + '" style="grid-template-columns:repeat(' + n + ',1fr)">';
      for (var c = 0; c < n; c++) rows += '<span class="wd-t ' + (sc[c] ? 's' + sc[c] : letters[c] ? 'typed' : '') + '" style="animation-delay:' + (c * 0.12) + 's">' + esc((letters[c] || '').toUpperCase()) + '</span>';
      rows += '</div>';
    }
    var used = {}; (g.guesses || []).forEach(function (gs) { K.wordleScore(gs, w).forEach(function (s, i) { var L = gs[i]; if (s === 'g' || (s === 'y' && used[L] !== 'g') || !used[L]) used[L] = s; }); });
    var kb = g.status === 'playing' ? '<div class="wd-kb">' + ROWS.map(function (row) { return '<div>' + row.split('').map(function (k) { return '<button type="button" data-k="' + k + '" class="' + (k === '⏎' || k === '⌫' ? 'wide' : '') + ' ' + (used[k] ? 's' + used[k] : '') + '">' + (k === '⏎' ? 'Enter' : k === '⌫' ? '⌫' : k.toUpperCase()) + '</button>'; }).join('') + '</div>'; }).join('') + '</div>' : '';
    var msg = g.status === 'won' ? '<p class="wd-msg win">🎉 You got it in ' + g.guesses.length + '! ' + (+g.reward ? '+' + g.reward + ' ⭐' : '') + '</p>'
      : g.status === 'lost' ? '<p class="wd-msg">The word was <b>' + esc(w.toUpperCase()) + '</b> 🥺 Next one soon!</p>' : '';
    card.innerHTML = '<h2>🟩 Wordle from Chengxuan</h2><p class="muted">Guess his secret ' + n + '-letter word in 6 tries' + (+g.reward ? ' · win ' + g.reward + ' ⭐' : '') + '.' + (g.hint ? ' Hint: <b>' + esc(g.hint) + '</b>' : '') + '</p>' +
      '<div class="wd-grid">' + rows + '</div>' + msg + kb +
      '<p class="help" style="text-align:center;margin:8px 0 0">🟩 right spot · 🟨 in the word · ⬜ not in it</p>';
  }
  function key(k) {
    var g = game(); if (!g || g.status !== 'playing') return;
    if (!isHer) { K.toast('This one\'s for her 🙂 Watch her guesses in admin'); return; }
    var n = String(g.word).length;
    if (k === '⌫') typed = typed.slice(0, -1);
    else if (k === '⏎') {
      if (typed.length < n) { shake(); K.toast('Not enough letters'); return; }
      var gs = (g.guesses || []).concat([typed]), w = String(g.word).toLowerCase(), won = typed === w, lost = !won && gs.length >= 6;
      var ng = Object.assign({}, g, { guesses: gs, status: won ? 'won' : lost ? 'lost' : 'playing' });
      var patch = { wordle: ng };
      if (won || lost) {
        patch.wordleHist = (DB.her.wordleHist || []).concat([{ id: g.id, word: w, won: won, tries: gs.length, reward: won ? +g.reward || 0 : 0, at: Date.now() }]).slice(-100);
        K.logEvent('🟩', (won ? 'Solved your Wordle "' + w.toUpperCase() + '" in ' + gs.length : 'Didn\'t get your Wordle "' + w.toUpperCase() + '"'));
      }
      typed = ''; DB.setHer(patch);
      if (won) setTimeout(function () { K.confetti({ count: 140 }); }, 700);
      return;
    } else if (/^[a-z]$/.test(k) && typed.length < n) typed += k;
    draw();
  }
  function shake() { var r = card.querySelector('.wd-row.cur'); if (r) { r.classList.remove('shake'); void r.offsetWidth; r.classList.add('shake'); } }
  card.addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) key(b.dataset.k); });
  document.addEventListener('keydown', function (e) {
    if (!game() || game().status !== 'playing' || K.isModalOpen() || /^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName)) return;
    var r = card.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    if (e.key === 'Enter') key('⏎'); else if (e.key === 'Backspace') key('⌫'); else if (/^[a-zA-Z]$/.test(e.key)) key(e.key.toLowerCase());
  });
  var lastId = null;
  DB.subscribe(function () { var g = game(); if (g && g.id !== lastId) { lastId = g.id; typed = ''; } draw(); });
  draw();
});
