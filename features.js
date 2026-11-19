/* features.js: "Open when…" letters (Fun page), Question of the day + "On this day" / days together (Home). */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, T = window.KiwiTime, $ = K.$, esc = K.esc;
  if (!DB.user) return;
  var isHer = DB.user.role === 'livina';

  // ================================================================ 💌 Open-when letters
  (function () {
    var grid = $('#letters-grid'); if (!grid) return;
    function letters() { return (DB.her.letters || []).filter(function (l) { return l && l.text; }); }
    function draw() {
      var ls = letters();
      $('#letters-card').hidden = !ls.length;
      var sig = JSON.stringify(ls.map(function (l) { return [l.id, l.when, l.emoji, !!l.openedAt, l.color]; }));
      if (grid.dataset.sig === sig) return; grid.dataset.sig = sig;
      grid.innerHTML = ls.map(function (l) {
        var open = !!l.openedAt;
        return '<button type="button" class="env' + (open ? ' opened' : '') + '" data-letter="' + esc(l.id) + '" style="--env:' + esc(l.color || '#ffd6e1') + '">' +
          '<span class="env-flap"></span><span class="env-seal">' + esc(open ? '💌' : (l.emoji || '💚')) + '</span>' +
          '<span class="env-when"><small>Open when</small>' + esc(l.when || '…') + '</span>' + (open ? '<span class="env-tag">opened ✓</span>' : '') + '</button>';
      }).join('');
    }
    function show(l) {
      K.modal('<div class="letter-paper"><div class="letter-when">Open when ' + esc(l.when || '') + '</div><div class="letter-text">' + esc(l.text) + '</div><div class="letter-sign">Love, Chengxuan 💚</div></div>', 'letter-sheet');
    }
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('[data-letter]'); if (!b) return;
      var l = letters().find(function (x) { return x.id === b.dataset.letter; }); if (!l) return;
      if (l.openedAt) { show(l); return; }
      K.confirm({ emoji: l.emoji || '💌', title: 'Open when ' + l.when + '?', text: 'Each letter is meant for that moment. Is it the right time? 🥺', yes: 'Open it 💌', no: 'Not yet' }).then(function (ok) {
        if (!ok) return;
        b.classList.add('opening');
        setTimeout(function () {
          show(l); K.confetti({ count: 70 });
          if (!isHer) return;   // his preview never counts as opened
          DB.setHer({ letters: letters().map(function (x) { return x.id === l.id ? Object.assign({}, x, { openedAt: Date.now() }) : x; }) });
          K.logEvent('💌', 'Opened the letter "Open when ' + l.when + '"');
        }, 650);
      });
    });
    draw(); DB.subscribe(draw);
  })();

  // ================================================================ ❓ Question of the day
  // her.qotd = { plan: { 'YYYY-MM-DD': 'question' }, days: { 'YYYY-MM-DD': { q, her: {text, at}, him: {text, at} } } }
  (function () {
    var card = $('#qotd-card'); if (!card) return;
    function draw() {
      var day = K.todayKey(), q = DB.her.qotd || {}, d = (q.days || {})[day] || {}, question = K.qotdFor(day);
      var mine = isHer ? d.her : d.him;
      var sig = JSON.stringify([day, question, d.her && d.her.at, d.him && d.him.at]);
      if (card.dataset.sig === sig) return;
      var keep = $('#qotd-in') ? $('#qotd-in').value : '';
      card.dataset.sig = sig;
      var body;
      if (!d.her) body = '<textarea class="field" id="qotd-in" maxlength="1000" placeholder="Your answer… (Chengxuan answers too, then you see both)"></textarea><button type="button" class="btn pink" id="qotd-send">Send my answer 💬</button>';
      else if (!d.him) body = '<div class="qa-mine"><b>You said</b>' + esc(d.her.text) + '</div><p class="help" style="text-align:center;margin:6px 0 0">🤫 Chengxuan\'s answer shows up here as soon as he answers</p>';
      else body = '<div class="qa-mine"><b>You</b>' + esc(d.her.text) + '</div><div class="qa-his"><b>Chengxuan 🥝</b>' + esc(d.him.text) + '</div>';
      card.innerHTML = '<div class="q-from">❓ Question of the day</div><p class="q-text">' + esc(question) + '</p>' + body;
      if (keep && $('#qotd-in')) $('#qotd-in').value = keep;
    }
    card.addEventListener('click', function (e) {
      if (!e.target.closest('#qotd-send')) return;
      var t = $('#qotd-in').value.trim(); if (!t) return K.toast('Write your answer first');
      if (!isHer) return K.toast('Answer from admin → ❓ Daily question');
      var day = K.todayKey(), q = JSON.parse(JSON.stringify(DB.her.qotd || {})); q.days = q.days || {};
      q.days[day] = Object.assign({ q: K.qotdFor(day) }, q.days[day] || {}, { her: { text: t, at: Date.now() } });
      DB.setHer({ qotd: q }); K.confetti({ count: 50 }); K.toast('Sent 💬');
      try { localStorage.removeItem('kiwi-draft:home:qotd-in'); } catch (x) { /* */ }
      K.logEvent('❓', 'Answered the question of the day: "' + t.slice(0, 80) + '"');
    });
    draw(); DB.subscribe(draw); setInterval(draw, 60000);
  })();

  // ================================================================ 📖 Days together + "On this day"
  (function () {
    var card = $('#otd-card'); if (!card) return;
    var mems = [];
    function daysTogether() { var s = DB.state.storyStart; if (!s) return null; try { return Math.floor((T.now() - T.parse(s + 'T00:00', K.HZ)) / 864e5); } catch (e) { return null; } }
    function draw() {
      var dt = daysTogether(), today = K.todayKey(), md = today.slice(5), y = +today.slice(0, 4);
      var otd = mems.filter(function (m) { return m.date && m.date.slice(5) === md && m.date.slice(0, 4) < String(y); });
      var month = mems.filter(function (m) { return m.date && m.date.slice(8) === today.slice(8) && m.date < today && m.date.slice(0, 7) !== today.slice(0, 7); });
      var pick = otd[0] || month[0] || null;
      if (dt == null && !pick) { card.hidden = true; return; }
      card.hidden = false;
      card.innerHTML = (dt != null ? '<div class="otd-days"><b>' + dt.toLocaleString('en-US') + '</b><span>days together 💚</span></div>' : '') +
        (pick ? '<a class="otd-mem" href="story.html#' + esc(pick.id) + '">' + (pick.img ? '<img src="' + pick.img + '" alt="">' : '<span class="otd-em">' + esc(pick.emoji || '📖') + '</span>') +
          '<span><small>' + (otd[0] ? 'On this day, ' + (y - +pick.date.slice(0, 4)) + ' year' + (y - +pick.date.slice(0, 4) > 1 ? 's' : '') + ' ago' : 'This day, ' + monthsAgo(pick.date) + ' ago') + '</small><b>' + esc(pick.title || '') + '</b></span></a>' : '') +
        '<a class="otd-link" href="story.html">📖 Our story →</a>';
    }
    function monthsAgo(d) { var t = K.todayKey(), m = (+t.slice(0, 4) - +d.slice(0, 4)) * 12 + (+t.slice(5, 7) - +d.slice(5, 7)); return m + ' month' + (m > 1 ? 's' : ''); }
    DB.storyListen(function (l) { mems = l || []; draw(); });
    DB.subscribe(draw); draw();
  })();
});
