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

  // ---------------------------------------------------------------- questions from him
  (function () {
    var box = $('#questions'); if (!DB.user || !box) return;
    var DAY = 864e5, picked = {};
    function visible() {
      var now = Date.now();
      return K.questions().filter(function (q) {
        if (q.active === false) return false;
        if (q.answer) return now - q.answer.at < DAY;          // her answer stays for a day
        return !q.untilMs || now < q.untilMs;
      });
    }
    var last = '';
    function draw() {
      var qs = visible();
      var sig = JSON.stringify(qs.map(function (q) { return [q.id, q.answer && q.answer.at, q.text]; })) + JSON.stringify(picked);
      if (sig === last) return; last = sig;
      var keep = {}; box.querySelectorAll('[data-qnote]').forEach(function (t) { keep[t.dataset.qnote] = t.value; });
      box.innerHTML = qs.map(function (q) {
        var head = '<div class="q-from">💌 Chengxuan asks…</div><div class="q-em">' + K.esc(q.emoji || '💭') + '</div><p class="q-text">' + K.esc(K.qText(q)) + '</p>';
        if (q.answer) {
          var opt = (q.options || [])[q.answer.choice] || {};
          return '<section class="card q-card answered">' + head +
            '<div class="q-you">You said: <b>' + K.esc(opt.label || '') + '</b>' + (q.answer.note ? '<br>"' + K.esc(q.answer.note) + '"' : '') + '</div>' +
            '<p class="q-reply">' + K.esc(opt.reply || 'Sent to Chengxuan 💚') + '</p>' +
            '<button type="button" class="link-btn" data-qredo="' + K.esc(q.id) + '">Change my answer</button></section>';
        }
        var sel = picked[q.id];
        return '<section class="card q-card">' + head +
          '<div class="q-opts">' + (q.options || []).map(function (o, i) {
            return '<button type="button" class="q-opt" data-q="' + K.esc(q.id) + '" data-i="' + i + '" aria-pressed="' + (sel === i) + '">' + K.esc(o.label) + '</button>';
          }).join('') + '</div>' +
          (q.note ? '<textarea class="field q-note" data-qnote="' + K.esc(q.id) + '" maxlength="300" placeholder="' + K.esc(q.note) + '"></textarea>' : '') +
          '<button type="button" class="btn pink big" data-qsend="' + K.esc(q.id) + '"' + (sel === undefined ? ' disabled' : '') + '>Send my answer 💌</button></section>';
      }).join('');
      box.querySelectorAll('[data-qnote]').forEach(function (t) { if (keep[t.dataset.qnote]) t.value = keep[t.dataset.qnote]; });
    }
    box.addEventListener('click', function (e) {
      var o = e.target.closest('[data-q]'), s = e.target.closest('[data-qsend]'), r = e.target.closest('[data-qredo]');
      if (o) { picked[o.dataset.q] = +o.dataset.i; draw(); return; }
      if (r) {
        var a0 = Object.assign({}, DB.her.answers || {}); var was = a0[r.dataset.qredo]; delete a0[r.dataset.qredo];
        if (was) picked[r.dataset.qredo] = was.choice;
        DB.setHer({ answers: a0 }); return;
      }
      if (s) {
        var id = s.dataset.qsend; if (picked[id] === undefined) return;
        var t = box.querySelector('[data-qnote="' + id + '"]'), note = t ? t.value.trim() : '';
        var a = Object.assign({}, DB.her.answers || {}); a[id] = { choice: picked[id], note: note, at: Date.now() };
        var r2 = s.getBoundingClientRect();
        DB.setHer({ answers: a }).then(function () { K.toast('Sent to Chengxuan 💚'); });
        delete picked[id];
        if (t) { t.value = ''; try { localStorage.removeItem('kiwi-draft:home:' + t.id); } catch (x) { /* */ } }
        K.confetti({ x: r2.left + r2.width / 2, y: r2.top, count: 90 });
      }
    });
    draw(); DB.subscribe(draw); setInterval(function () { last = ''; draw(); }, 60000);
  })();

  // ---------------------------------------------------------------- daily check-in card
  (function () {
    if (!DB.user || !$('#checkin-card')) return;
    var T = window.KiwiTime;
    function draw() {
      var done = K.checkedInToday(), st = K.streak(), last = K.lastMood();
      $('#ck-flame').querySelector('b').textContent = st;
      $('#ck-flame').classList.toggle('lit', st > 0);
      $('#ck-sub').textContent = done ? (st > 1 ? 'You\'re on a ' + st + '-day streak! 🔥' : 'Checked in today ✓') : (st ? 'Check in to keep your ' + st + '-day streak 🔥' : 'Check in every day to build a streak 🔥');
      var cfg = K.checkinCfg(), left = Math.max(0, +cfg.extraMax - K.extrasToday()), more = done && cfg.on && +cfg.extra && left > 0;
      $('#ck-btn').textContent = !done ? 'Check in for today ✅' + (cfg.on && +cfg.perDay ? ' (+' + cfg.perDay + ' ⭐)' : '')
        : more ? 'Check in again (+' + cfg.extra + ' ⭐) · ' + left + ' left today' : '✓ All done today · update mood';
      $('#ck-btn').classList.toggle('ghost', done && !more);
      if (last && T.dayKey(last.at, K.HZ) === K.todayKey()) {
        var info = K.moodInfo(last.mood);
        $('#mood-now').innerHTML = 'Today you\'re feeling <b>' + info[1] + ' ' + K.esc(info[2]) + '</b>' + (last.note ? ' · "' + K.esc(last.note) + '"' : '');
      } else $('#mood-now').textContent = '';
    }
    $('#ck-btn').addEventListener('click', function () { K.checkinModal(); });
    draw(); DB.subscribe(draw); setInterval(draw, 60000);
  })();

  // ---------------------------------------------------------------- photo of the day + bonus photo
  (function () {
    if (!DB.user || !$('#photo-card')) return;
    var T = window.KiwiTime, DAY = 24 * 3600000;
    function when(at) {
      var today = T.dayKey(at, K.HZ) === K.todayKey();
      return (today ? 'Today' : T.fmtDay(at, K.HZ)) + ', ' + T.fmtTime(at, K.HZ);
    }
    function setImg(el, p) { if (el.getAttribute('data-id') !== p.id) { el.src = p.data; el.setAttribute('data-id', p.id); } }
    function big(p) {
      K.modal('<img class="photo-big" src="' + p.data + '" alt="">' + (p.caption ? '<p class="desc" style="margin-top:10px">' + K.esc(p.caption) + '</p>' : '') +
        '<div class="help">' + when(p.at) + '</div>', 'photo-sheet');
    }
    // Only the newest photo, and only if it's from the last 24 hours. No photo = no card.
    function current(bonus) {
      var p = (DB.photos || []).filter(function (x) { return !!x.bonus === bonus; })[0];
      return p && (Date.now() - p.at < (bonus ? 3 : 1) * DAY) ? p : null;
    }
    function draw() {
      var p = current(false);
      $('#photo-card').hidden = !p;
      if (p) {
        setImg($('#photo-img'), p);
        $('#photo-cap').textContent = p.caption || ''; $('#photo-cap').hidden = !p.caption;
        $('#photo-when').textContent = when(p.at);
      }
      var bp = current(true);
      $('#bonus-card').hidden = !bp;
      if (bp) {
        var open = !!(DB.her.unlockedBonus || {})[bp.id];
        var mine = (DB.herPhotos || []).filter(function (h) { return h.forBonus === bp.id; }).sort(function (a, b) { return b.at - a.at; });
        var last = mine[0], status = open ? 'approved' : last ? (last.status || 'pending') : 'none';
        $('#bonus-locked').hidden = open; $('#bonus-open').hidden = !open;
        $('#bonus-btn').hidden = status === 'pending';
        $('#bonus-msg').textContent = status === 'pending' ? 'Photo sent! Waiting for Chengxuan to approve it ⏳'
          : status === 'rejected' ? 'Hmm, that one wasn\'t approved 🙈 Try another photo of you!'
          : 'Send a photo of yourself to unlock it 📸';
        $('#bonus-btn-text').textContent = status === 'rejected' ? '📷 Send another photo' : '📷 Send my photo';
        if (open) {
          setImg($('#bonus-img'), bp); $('#bonus-cap').textContent = bp.caption || ''; $('#bonus-cap').hidden = !bp.caption;
          // celebrate once, the first time she sees it unlocked
          if (K.store.get('kiwi-bonus-seen') !== bp.id) {
            K.store.set('kiwi-bonus-seen', bp.id); K.toast('Approved! Bonus unlocked 🎁💚');
            setTimeout(function () { var r = $('#bonus-card').getBoundingClientRect(); K.confetti({ x: r.left + r.width / 2, y: r.top + 80, count: 120 }); }, 300);
          }
        }
      }
    }
    $('#photo-open').addEventListener('click', function () { var p = current(false); if (p) big(p); });
    $('#bonus-view').addEventListener('click', function () { var p = current(true); if (p) big(p); });
    $('#bonus-file').addEventListener('change', function (e) {
      var f = e.target.files[0], bp = current(true); if (!f || !bp) return;
      K.toast('Sending your photo… 📸');
      K.compressPhoto(f).then(function (data) {
        var id = 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        return DB.addHerPhoto({ id: id, data: data, at: Date.now(), forBonus: bp.id, status: 'pending' });
      }).then(function () {
        draw(); K.toast('Sent! Waiting for Chengxuan to approve ⏳');
      }).catch(function (err) { console.error(err); K.toast('Couldn\'t send that photo. Try another one'); });
      e.target.value = '';
    });
    draw(); DB.subscribe(draw); setInterval(draw, 60000);
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
