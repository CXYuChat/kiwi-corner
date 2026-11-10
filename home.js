/* home.js: greeting, surprise, featured countdown, quote, points. */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, $ = K.$;

  var mascot = $('#mascot'), bubble = $('#bubble');
  function tap() { K.sayNote(bubble); K.hop(mascot); }
  mascot.addEventListener('click', tap);
  mascot.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });

  function status() {
    var s = K.statusShort();
    $('#status-pill').className = 'status-pill ' + s.cls;
    $('#status-pill-text').textContent = 'Right now: ' + s.text;
    mascot.classList.toggle('mun', K.status().mun);
  }

  function render() {
    var st = DB.state, her = DB.her;
    $('#quote-text').textContent = st.quote.text;
    $('#quote-by').textContent = st.quote.by;
    $('#banner').hidden = !st.banner; $('#banner').textContent = st.banner || '';
    var sp = st.surprise;
    $('#surprise-btn').hidden = !(sp && sp.active && her.seenSurprise !== sp.id);
    pointsCard();
    status();
  }
  function pointsCard() {
    var pts = K.balance(), g = K.nextGift();
    $('#pts-big').textContent = pts;
    if (g && g.cost) {
      $('#pts-bar').style.width = Math.min(100, pts / g.cost * 100) + '%';
      $('#pts-next').textContent = (g.cost - pts) + ' more points to unlock present #' + g.n + ' 🎁';
      if (pts >= g.cost) $('#pts-next').textContent = 'You can unlock present #' + g.n + ' now! Go to Gifts 🎁';
    } else if (g) {
      $('#pts-bar').style.width = '0%';
      $('#pts-next').textContent = 'Present #' + g.n + ' unwraps on ' + K.herDateTime(g.at) + ' 🎁';
    } else {
      $('#pts-bar').style.width = '100%';
      $('#pts-next').textContent = 'All presents unlocked! 🎉';
    }
  }

  $('#surprise-btn').addEventListener('click', function () {
    var sp = DB.state.surprise; if (!sp) return;
    K.modal('<div class="em">' + K.esc(sp.emoji || '💌') + '</div><h3>' + K.esc(sp.title || 'A surprise for you') + '</h3>' +
      '<p class="desc" style="white-space:pre-wrap">' + K.esc(sp.text || '') + '</p><p class="muted">From Chengxuan 💚</p>', 'call');
    K.confetti({ count: 110 });
    DB.setHer({ seenSurprise: sp.id });
  });

  $('#hi-name').textContent = K.name();
  K.missButton();

  // ---------------------------------------------------------------- mood check-in
  (function () {
    if (!DB.user || !$('#moods')) return;
    var picked = null;
    $('#mood-h').textContent = "How's your day, " + K.petName() + '? 🌤️';
    $('#moods').innerHTML = K.MOODS.map(function (m) {
      return '<button type="button" class="mood" data-mood="' + m[0] + '"><span class="e">' + m[1] + '</span><span>' + m[2] + '</span></button>';
    }).join('');
    function showNow() {
      var last = K.lastMood();
      document.querySelectorAll('.mood').forEach(function (b) { b.classList.toggle('on', !!last && b.dataset.mood === last.mood && T.dayKey(last.at, K.HZ) === T.dayKey(T.now(), K.HZ)); });
      if (!last) { $('#mood-now').textContent = ''; return; }
      var info = K.moodInfo(last.mood), today = T.dayKey(last.at, K.HZ) === T.dayKey(T.now(), K.HZ);
      $('#mood-now').innerHTML = (today ? 'Today: ' : 'Last time (' + T.fmtDay(last.at, K.HZ) + '): ') + '<b>' + info[1] + ' ' + K.esc(info[2]) + '</b>' +
        (last.note ? ' · "' + K.esc(last.note) + '"' : '') + (today ? ' · sent to Chengxuan ✓' : '');
    }
    var T = window.KiwiTime;
    $('#moods').addEventListener('click', function (e) {
      var b = e.target.closest('[data-mood]'); if (!b) return;
      picked = b.dataset.mood;
      document.querySelectorAll('.mood').forEach(function (x) { x.classList.toggle('picked', x === b); });
      $('#mood-note-wrap').hidden = false;
      $('#mood-note').focus({ preventScroll: true });
    });
    function send() {
      if (!picked) return;
      var note = $('#mood-note').value.trim();
      var list = (DB.her.moods || []).concat([{ mood: picked, note: note, at: Date.now() }]).slice(-60);
      DB.setHer({ moods: list });
      $('#mood-note').value = ''; $('#mood-note-wrap').hidden = true; picked = null;
      document.querySelectorAll('.mood').forEach(function (x) { x.classList.remove('picked'); });
      K.toast('Sent to Chengxuan 💚'); K.hop($('#mascot'));
      var r = $('#mood-card').getBoundingClientRect(); K.confetti({ x: r.left + r.width / 2, y: r.top + 40, count: 40 });
    }
    $('#mood-send').addEventListener('click', send);
    $('#mood-note').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
    showNow(); DB.subscribe(showNow);
  })();
  // ---------------------------------------------------------------- "add to home screen" tip (once, phones only)
  (function () {
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    var phone = /iphone|ipad|ipod|android/i.test(navigator.userAgent);
    if (!DB.user || standalone || !phone || K.store.get('kiwi-a2hs') === 'hide') return;
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent), box = $('#a2hs'), how = $('#a2hs-how');
    function show() {
      if (K.installPrompt) how.innerHTML = '<button type="button" class="btn sm" id="a2hs-go" style="margin-top:8px">Add it 🥝</button>';
      else if (ios) how.textContent = 'Tap the Share button ⬆️ at the bottom of Safari, then "Add to Home Screen". Then you can open it like an app 🥝';
      else how.textContent = 'Tap ⋮ at the top of Chrome, then "Add to Home screen". Then you can open it like an app 🥝';
      box.hidden = false;
      var go = $('#a2hs-go');
      if (go) go.addEventListener('click', function () {
        K.installPrompt.prompt();
        K.installPrompt.userChoice.then(function (c) { if (c.outcome === 'accepted') { K.store.set('kiwi-a2hs', 'hide'); box.hidden = true; K.confetti({ count: 80 }); } });
      });
    }
    show(); document.addEventListener('kiwi:installable', show);
    $('#a2hs-x').addEventListener('click', function () { K.store.set('kiwi-a2hs', 'hide'); box.hidden = true; K.toast && K.toast('You can find it again under 🌸 at the top'); });
  })();

  K.bigCountdown($('#big-cd'));
  render();
  DB.subscribe(render);
  setInterval(status, 30000);
});
