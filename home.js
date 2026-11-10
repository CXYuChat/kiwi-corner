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
