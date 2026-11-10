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

  // ---------------------------------------------------------------- daily check-in card
  (function () {
    if (!DB.user || !$('#checkin-card')) return;
    var T = window.KiwiTime;
    function draw() {
      var done = K.checkedInToday(), st = K.streak(), last = K.lastMood();
      $('#ck-flame').querySelector('b').textContent = st;
      $('#ck-flame').classList.toggle('lit', st > 0);
      $('#ck-sub').textContent = done ? (st > 1 ? 'You\'re on a ' + st + '-day streak! 🔥' : 'Checked in today ✓') : (st ? 'Check in to keep your ' + st + '-day streak 🔥' : 'Check in every day to build a streak 🔥');
      $('#ck-btn').textContent = done ? '✓ Checked in today · update mood' : 'Check in for today ✅';
      $('#ck-btn').classList.toggle('ghost', done);
      if (last && T.dayKey(last.at, K.HZ) === K.todayKey()) {
        var info = K.moodInfo(last.mood);
        $('#mood-now').innerHTML = 'Today you\'re feeling <b>' + info[1] + ' ' + K.esc(info[2]) + '</b>' + (last.note ? ' · "' + K.esc(last.note) + '"' : '');
      } else $('#mood-now').textContent = '';
    }
    $('#ck-btn').addEventListener('click', function () { K.checkinModal(); });
    draw(); DB.subscribe(draw); setInterval(draw, 60000);
  })();

  // ---------------------------------------------------------------- photo of the day
  (function () {
    if (!DB.user || !$('#photo-card')) return;
    var T = window.KiwiTime;
    function when(at) {
      var today = T.dayKey(at, K.HZ) === K.todayKey();
      return (today ? 'Today' : T.fmtDay(at, K.HZ)) + ', ' + T.fmtTime(at, K.HZ);
    }
    function draw() {
      var ps = DB.photos || [];
      $('#photo-card').hidden = !ps.length;
      if (!ps.length) return;
      var p = ps[0];
      if ($('#photo-img').getAttribute('data-id') !== p.id) { $('#photo-img').src = p.data; $('#photo-img').setAttribute('data-id', p.id); }
      $('#photo-cap').textContent = p.caption || '';
      $('#photo-cap').hidden = !p.caption;
      $('#photo-when').textContent = when(p.at);
      $('#photo-more').hidden = ps.length < 2;
    }
    function big(p) {
      K.modal('<img class="photo-big" src="' + p.data + '" alt="">' + (p.caption ? '<p class="desc" style="margin-top:10px">' + K.esc(p.caption) + '</p>' : '') +
        '<div class="help">' + when(p.at) + ' (your time)</div>', 'photo-sheet');
    }
    $('#photo-open').addEventListener('click', function () { if (DB.photos[0]) big(DB.photos[0]); });
    $('#photo-more').addEventListener('click', function () {
      var sh = K.modal('<h3>📸 Photos from Chengxuan</h3><div class="photo-grid">' + DB.photos.map(function (p, i) {
        return '<button type="button" data-pi="' + i + '"><img src="' + p.data + '" alt=""><span>' + K.esc(T.fmtDay(p.at, K.HZ)) + '</span></button>';
      }).join('') + '</div>', 'photo-sheet');
      sh.querySelector('.photo-grid').addEventListener('click', function (e) { var b = e.target.closest('[data-pi]'); if (b) big(DB.photos[+b.dataset.pi]); });
    });
    draw(); DB.subscribe(draw);
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
