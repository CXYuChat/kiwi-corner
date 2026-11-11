/* admin.js: Chengxuan's control panel. Every change saves straight away and Livina sees it live (in live mode). */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, T = window.KiwiTime, DB = window.KiwiDB, $ = K.$, esc = K.esc, HZ = K.HZ;
  var panels = $('#panels'), current = 'overview';
  $('#demo-warn').hidden = DB.mode !== 'demo';

  // ---------------------------------------------------------------- helpers
  var toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl);
  var toastT;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2200); }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function ago(ts) {
    if (!ts) return 'never';
    var m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'just now'; if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + 'h ago';
    return Math.round(h / 24) + 'd ago';
  }
  function sgHint(v) {
    if (!v) return '';
    try { var e = T.parse(v, HZ); return '= ' + T.fmtDay(e, 'Asia/Singapore') + ', ' + T.fmtTime(e, 'Asia/Singapore') + ' Singapore time'; } catch (x) { return ''; }
  }
  function wireSgHints(root) {
    root.querySelectorAll('input[type=datetime-local]').forEach(function (inp) {
      var out = inp.parentNode.querySelector('.sg');
      var upd = function () { if (out) out.textContent = sgHint(inp.value); };
      inp.addEventListener('input', upd); upd();
    });
  }
  function nextAutoAt(ap) {
    var z = ap.zone || 'Asia/Singapore', hm = String(ap.time || '00:31').split(':'), now = T.now(), skipped = ap.skipped || [];
    for (var i = 0; i < 400; i++) {
      var p = T.parts(T.startOfDay(now, z) + 12 * T.HOUR + i * T.DAY, z), at = T.wall(p.y, p.m, p.d, +hm[0], +hm[1], z);
      if (at > now && at > (+ap.since || 0) && skipped.indexOf(T.dayKey(at, z)) === -1) return at;
    }
    return null;
  }
  function nextAuto(ap) {
    if (!ap.on) return 'off';
    var at = nextAutoAt(ap); if (!at) return '—';
    return T.fmtDay(at, 'Asia/Singapore') + ', ' + T.fmtTime(at, 'Asia/Singapore') + ' Singapore (' + K.herDateTime(at) + ' Barcelona)';
  }
  function nextAutoKey(ap) { var at = nextAutoAt(Object.assign({}, ap, { skipped: [] })); return at ? T.dayKey(at, ap.zone || 'Asia/Singapore') : ''; }
  // Turn nights already awarded into normal points so later setting changes don't rewrite them
  function bakeAuto() {
    var aw = K.autoAwards(); if (!aw.length) return;
    var add = aw.reduce(function (a, x) { return a + x.amt; }, 0);
    DB.setState({ points: (DB.state.points || 0) + add, pointsLog: (DB.state.pointsLog || []).concat(aw.map(function (x) { return { amt: x.amt, reason: x.reason, at: x.at, auto: true }; })).slice(-200) });
  }

  function giftsMap() {
    if (DB.state.gifts) return JSON.parse(JSON.stringify(DB.state.gifts));
    var m = {}; (window.GIFTS || []).forEach(function (g, i) { var c = Object.assign({ order: i }, g); delete c.id; m[g.id] = c; }); return m;
  }
  function addPoints(amt, reason) {
    amt = Math.round(+amt); if (amt < 0) amt = Math.max(amt, -K.balance()); if (!amt) return toast('She has no points to take');
    var log = (DB.state.pointsLog || []).concat([{ amt: amt, reason: reason || '', at: Date.now() }]).slice(-200);
    DB.setState({ points: (DB.state.points || 0) + amt, pointsLog: log });
    toast((amt > 0 ? '+' : '') + amt + ' points ' + (amt > 0 ? 'sent 💚' : 'removed'));
  }

  // ---------------------------------------------------------------- panels
  var P = {};

  function moodBox(her) {
    var ms = (her.moods || []).slice().reverse();
    if (!ms.length) return '<div class="mood-admin"><b>💭 Her mood</b><span class="muted">She hasn\'t checked in yet</span></div>';
    var now = ms[0], info = K.moodInfo(now.mood);
    var hist = ms.slice(1, 7).map(function (m) { var i = K.moodInfo(m.mood); return '<span title="' + esc(i[2] + ' · ' + K.herDateTime(m.at) + (m.note ? ' · ' + m.note : '')) + '">' + i[1] + '</span>'; }).join(' ');
    return '<div class="mood-admin"><b>💭 Her mood</b>' +
      '<div class="mood-big">' + info[1] + ' <span>' + esc(info[2]) + '</span></div>' +
      (now.note ? '<div class="mood-quote">"' + esc(now.note) + '"</div>' : '') +
      '<div class="help">' + ago(now.at) + ' · ' + K.herDateTime(now.at) + ' Barcelona</div>' +
      (hist ? '<div class="help">Before that: <span class="mood-hist">' + hist + '</span></div>' : '') + '</div>';
  }

  function needsYou() {
    var t = todo(), rows = [];
    if (t.photos) rows.push(['photos', '📸', t.photos + ' photo' + (t.photos > 1 ? 's' : '') + ' from her to approve']);
    if (t.inbox) rows.push(['inbox', '📬', t.inbox + ' message' + (t.inbox > 1 ? 's' : '') + ' waiting for a reply']);
    if (t.wishes) rows.push(['wishes', '💭', t.wishes + ' new guess' + (t.wishes > 1 ? 'es/wishes' : '/wish')]);
    return '<section class="card stack needs"><h3>✋ Needs you</h3>' + (rows.length ? rows.map(function (r) {
      return '<button type="button" class="need-row" data-goto="' + r[0] + '"><span class="em">' + r[1] + '</span><span>' + r[2] + '</span><span class="go">›</span></button>';
    }).join('') : '<p class="muted" style="margin:0">All caught up 💚</p>') + '</section>' +
    '<section class="card stack"><h3>⚡ Quick actions</h3><div class="quick">' +
      '<button type="button" class="btn sm" data-quick="10">+10 ⭐</button><button type="button" class="btn sm" data-quick="25">+25 ⭐</button>' +
      '<button type="button" class="btn sm ghost" data-goto="photos">📸 Post a photo</button><button type="button" class="btn sm ghost" data-goto="messages">💌 Send a surprise</button>' +
      '<a class="btn sm ghost" href="index.html" style="text-decoration:none">👀 View her site</a></div></section>';
  }

  P.overview = function () {
    var st = DB.state, her = DB.her, gs = K.gifts(), f = K.featured();
    var opened = gs.filter(function (g) { return g.opened; }).length, unlocked = gs.filter(function (g) { return g.unlocked; }).length;
    var sp = st.surprise, ov = st.statusOverride;
    return needsYou() + '<section class="card stack"><h3>💚 Her</h3>' +
      '<div class="stat-grid">' +
        '<div class="stat"><b>⭐ ' + K.balance() + '</b><span>points (' + K.spent() + ' spent)</span></div>' +
        '<div class="stat"><b>🥺 ' + (her.missCount || 0) + '</b><span>times she missed you</span></div>' +
        '<div class="stat"><b>🎁 ' + opened + '/' + gs.length + '</b><span>gifts opened (' + unlocked + ' unlocked)</span></div>' +
        '<div class="stat"><b>🧺 ' + (her.gameBest || 0) + '</b><span>kiwi game best</span></div>' +
      '</div>' +
      moodBox(her) +
      '<p>🔥 Check-in streak: <b>' + K.streak() + (K.streak() === 1 ? ' day' : ' days') + '</b>' + (K.checkedInToday() ? ' · checked in today ✓' : ' · not checked in yet today') + ' <span class="muted">(best: ' + K.bestStreak() + ')</span></p>' +
      '<p>👀 Livina last visited: <b>' + ago(her.lastSeen) + '</b></p>' +
      '<p>⏳ Main countdown: <b>' + (f ? esc(f.emoji + ' ' + f.label) : 'none') + '</b></p>' +
      '<p>💌 Surprise: <b>' + (sp && sp.active ? esc(sp.title || 'untitled') + (her.seenSurprise === sp.id ? ' (seen ✓)' : ' (not opened yet)') : 'none showing') + '</b></p>' +
      '<p>💭 New guesses/wishes: <b>' + ((her.guesses || []).filter(function (x) { return !x.verdict; }).length + (her.wishes || []).filter(function (x) { return !x.status; }).length) + '</b></p>' +
      '<p>📬 Messages waiting in your inbox: <b>' + (her.messages || []).filter(function (m) { return !isArchived(m); }).length + '</b></p>' +
      '<p>📣 Status update: <b>' + (ov && ov.text && (!ov.until || Date.now() < ov.until) ? esc(ov.text) : 'none (using schedule)') + '</b></p>' +

    '</section>';
  };

  P.points = function () {
    var st = DB.state, log = K.pointsLog().slice(-25).reverse(), g = K.nextGift(), ap = st.autoPoints || DB.defaults.state().autoPoints, recent = K.autoAwards().slice(-7).reverse();
    return '<section class="card stack">' +
      '<div class="points-card"><div class="row"><span class="num">' + K.balance() + '</span><span class="muted">points she has</span></div>' +
      '<div class="help">Given ' + (st.points || 0) + ' · spent on presents ' + K.spent() + '</div>' +
      '<div class="help">' + (g && g.cost ? 'Next present she can buy: #' + g.n + ' (' + esc(g.name) + ') for ' + g.cost + ' ⭐' : 'No point-priced gifts left') + '</div></div>' +
      '<div class="form"><label>Reason she\'ll see (optional)<input class="field" id="pt-reason" placeholder="e.g. for being the cutest 🥰" maxlength="120"></label></div>' +
      '<div class="help">Give points</div>' +
      '<div class="btns">' + [5, 10, 25, 50, 100].map(function (n) { return '<button class="btn sm" data-add="' + n + '">+' + n + '</button>'; }).join('') + '</div>' +
      '<div class="help">Take points away</div>' +
      '<div class="btns">' + [5, 10, 25, 50].map(function (n) { return '<button class="btn sm danger" data-add="-' + n + '">−' + n + '</button>'; }).join('') + '</div>' +
      '<div class="row2"><label class="help">Custom amount (use − to remove)<input class="field" id="pt-custom" type="number" inputmode="numeric" placeholder="e.g. 15 or -5"></label>' +
      '<div style="align-self:end"><button class="btn sm" id="pt-custom-go">Give</button></div></div>' +
      '<div class="row2"><label class="help">Set exactly<input class="field" id="pt-set" type="number" inputmode="numeric" placeholder="' + K.balance() + '"></label>' +
      '<div style="align-self:end"><button class="btn sm brown" id="pt-set-go">Set</button></div></div>' +
      '<div class="item" style="border-color:var(--green)"><div class="item-head"><b>📞 Nightly call points</b><span class="tag' + (ap.on ? ' on' : '') + '">' + (ap.on ? 'on' : 'off') + '</span></div>' +
        '<p class="help" style="margin:0">Every night at this time she gets these points. She just sees the reason, never that it\'s automatic.</p>' +
        '<div class="row2"><label class="help">Points each night<input class="field" id="ap-amt" type="number" inputmode="numeric" min="1" value="' + (+ap.amount || 0) + '"></label>' +
        '<label class="help">Time (Singapore)<input class="field" id="ap-time" type="time" value="' + esc(ap.time || '00:31') + '"></label></div>' +
        '<label class="help">What she sees<input class="field" id="ap-reason" value="' + esc(ap.reason || '') + '" maxlength="80"></label>' +
        '<div class="help">Next: ' + esc(nextAuto(ap)) + '</div>' +
        '<div class="btns"><button class="btn sm" id="ap-save">💾 Save</button>' +
          (ap.on ? '<button class="btn sm ghost" id="ap-off">⏸️ Turn off</button>' : '<button class="btn sm pink" id="ap-on">▶️ Turn on</button>') +
          (ap.on ? '<button class="btn sm ghost" id="ap-skip">🙅 Skip next night</button>' : '') + '</div>' +
        (recent.length ? '<div class="help">Recent nights:</div><ul class="log">' + recent.map(function (x) {
          return '<li><span>' + esc(T.fmtDay(x.at, 'Asia/Singapore')) + ' · +' + x.amt + '</span><button class="btn sm ghost" data-apskip="' + esc(x.key) + '">Remove</button></li>';
        }).join('') + '</ul>' : '') +
        ((ap.skipped || []).length ? '<div class="help">Skipped: ' + ap.skipped.slice(-6).map(function (k) { return k.slice(5) + ' <a href="#" data-apunskip="' + esc(k) + '">undo</a>'; }).join(', ') + '</div>' : '') +
      '</div>' +
      (function () {
        var c = K.checkinCfg();
        return '<div class="item"><div class="item-head"><b>✅ Daily check-in points</b><span class="tag' + (c.on ? ' on' : '') + '">' + (c.on ? 'on' : 'off') + '</span></div>' +
          '<p class="help" style="margin:0">She earns these herself: the first check-in each day, extra check-ins from her Home (up to a daily limit), and a bonus on every 7th day in a row.</p>' +
          '<div class="row2"><label class="help">First check-in of the day<input class="field" id="ck-per" type="number" inputmode="numeric" min="0" value="' + (+c.perDay || 0) + '"></label>' +
          '<label class="help">7-day streak bonus<input class="field" id="ck-bonus" type="number" inputmode="numeric" min="0" value="' + (+c.weekBonus || 0) + '"></label></div>' +
          '<div class="row2"><label class="help">Each extra check-in<input class="field" id="ck-extra" type="number" inputmode="numeric" min="0" value="' + (+c.extra || 0) + '"></label>' +
          '<label class="help">Max extra check-ins a day<input class="field" id="ck-max" type="number" inputmode="numeric" min="0" value="' + (+c.extraMax || 0) + '"></label></div>' +
          '<div class="btns"><button class="btn sm" id="ck-save">💾 Save</button>' + (c.on ? '<button class="btn sm ghost" id="ck-off">⏸️ Turn off</button>' : '<button class="btn sm pink" id="ck-on">▶️ Turn on</button>') + '</div></div>';
      })() +
      '<h3 style="margin-top:8px">History</h3>' +
      (log.length ? '<button class="btn sm ghost" id="pt-undo">↩️ Undo last</button>' : '') +
      '<ul class="log">' + (log.length ? log.map(function (l) {
        return '<li><span>' + (l.auto ? '📞 ' : '') + esc(l.reason || '(no reason)') + '<br><small class="muted">' + K.herDateTime(l.at) + ' Barcelona' + (l.auto ? ' · nightly' : '') + '</small></span><span class="amt' + (l.amt < 0 ? ' neg' : '') + '">' + (l.amt > 0 ? '+' : '') + l.amt + '</span></li>';
      }).join('') : '<li class="muted">No points given yet</li>') + '</ul>' +
    '</section>';
  };

  P.gifts = function () {
    var map = giftsMap(), ids = Object.keys(map).sort(function (a, b) { return (map[a].order || 0) - (map[b].order || 0); });
    var live = {}; K.gifts().forEach(function (g) { live[g.id] = g; });
    return '<p class="help" style="margin:0 4px">She can <b>spend</b> points to unlock a gift (its price), or it unlocks for free on its date, or right away if you tap "Unlock now". Leave points at 0 for date-only, or the date empty for points-only. Dates are <b>Barcelona time</b>.</p>' +
      ids.map(function (id) {
        var g = map[id], L = live[id] || {};
        var tag = L.opened ? '<span class="tag on">opened ✓</span>' : L.unlocked ? '<span class="tag on">unlocked (' + L.why + ')</span>' : '<span class="tag">🔒 locked</span>';
        return '<section class="card item" data-gid="' + esc(id) + '">' +
          '<div class="item-head"><b>' + esc((g.emoji || '🎁') + ' ' + (g.name || 'New gift')) + '</b>' + tag + '</div>' +
          '<div class="form">' +
            '<div class="row2"><label>Emoji<input class="field" data-k="emoji" value="' + esc(g.emoji || '') + '" maxlength="4"></label>' +
            '<label>Price in points<input class="field" data-k="points" type="number" inputmode="numeric" min="0" value="' + (+g.points || 0) + '"></label></div>' +
            '<label>What it is (shown after unwrapping)<input class="field" data-k="name" value="' + esc(g.name || '') + '"></label>' +
            '<label>Hint (shown before)<input class="field" data-k="hint" value="' + esc(g.hint || '') + '"></label>' +
            '<label>Message when opened<textarea class="field" data-k="message">' + esc(g.message || '') + '</textarea></label>' +
            '<label>Opens on (Barcelona time)<input class="field" data-k="reveal" type="datetime-local" value="' + esc(g.reveal || '') + '"><span class="help sg"></span></label>' +
            '<div class="row2"><label>Wrapping colour<input class="field" data-k="color" type="color" value="' + esc(g.color || '#8EE000') + '" style="height:46px;padding:4px"></label>' +
            '<label>Ribbon colour<input class="field" data-k="ribbon" type="color" value="' + esc(g.ribbon || '#7A5230') + '" style="height:46px;padding:4px"></label></div>' +
          '</div>' +
          '<div class="btns">' +
            '<button class="btn sm" data-g="save">💾 Save</button>' +
            (g.forceOpen ? '<button class="btn sm ghost" data-g="lock">🔒 Lock again</button>' : '<button class="btn sm pink" data-g="unlock">✨ Unlock now</button>') +
            (L.opened ? '<button class="btn sm ghost" data-g="rewrap">🎀 Re-wrap</button>' : '') +
            '<button class="btn sm ghost" data-g="up">↑</button><button class="btn sm ghost" data-g="down">↓</button>' +
            '<button class="btn sm danger" data-g="delete">🗑️</button>' +
          '</div></section>';
      }).join('') +
      '<button class="btn big" id="gift-add">＋ Add a gift</button>';
  };


  var VERDICT = { yes: '✅ Correct', close: '🔥 Close', warm: '🙂 Warmer', no: '❌ Nope' };
  var WISH = { noted: '💚 Noted', maybe: '🤔 Maybe', coming: '🎁 On its way', no: '🙈 Not this time' };
  P.wishes = function () {
    var her = DB.her, num = {}, name = {};
    K.gifts().forEach(function (g) { num[g.id] = g.n; name[g.id] = g.name; });
    var gs = (her.guesses || []).slice().reverse(), ws = (her.wishes || []).slice().reverse();
    function btns(kind, x, map, cur) {
      return '<div class="btns">' + Object.keys(map).map(function (k) {
        return '<button class="btn sm ' + (cur === k ? '' : 'ghost') + '" data-reply="' + kind + '" data-xid="' + esc(x.id) + '" data-v="' + k + '">' + map[k] + '</button>';
      }).join('') + '<button class="btn sm danger" data-xdel="' + kind + '" data-xid="' + esc(x.id) + '">🗑️</button></div>';
    }
    return '<section class="card stack"><h3>🤔 Her guesses</h3><p class="help">Your reply shows next to her guess. Add a note if you like, and optional points for a good guess.</p>' +
      '<div class="row2"><label class="help">Note with your next reply<input class="field" id="x-note" placeholder="e.g. haha nice try 😏" maxlength="100"></label>' +
      '<label class="help">Points with your next reply<input class="field" id="x-pts" type="number" inputmode="numeric" placeholder="0"></label></div>' +
      (gs.length ? gs.map(function (x) {
        return '<div class="item"><div class="item-head"><b>#' + (num[x.giftId] || '?') + ': "' + esc(x.text) + '"</b><span class="tag' + (x.verdict ? ' on' : '') + '">' + (x.verdict ? VERDICT[x.verdict] : 'new') + '</span></div>' +
          '<div class="help">Really: ' + esc(name[x.giftId] || 'deleted gift') + ' · ' + ago(x.at) + (x.note ? ' · your note: ' + esc(x.note) : '') + '</div>' + btns('guess', x, VERDICT, x.verdict) + '</div>';
      }).join('') : '<p class="muted">No guesses yet</p>') + '</section>' +
      '<section class="card stack"><h3>💭 Her wish list</h3>' +
      (ws.length ? ws.map(function (x) {
        return '<div class="item"><div class="item-head"><b>' + esc(x.text) + '</b><span class="tag' + (x.status ? ' on' : '') + '">' + (x.status ? WISH[x.status] : 'new') + '</span></div>' +
          '<div class="help">' + ago(x.at) + (x.note ? ' · your note: ' + esc(x.note) : '') + '</div>' + btns('wish', x, WISH, x.status) + '</div>';
      }).join('') : '<p class="muted">No wishes yet</p>') + '</section>';
  };

  // Messages from her: Inbox (waiting for you) and Archive (replied, or archived by you).
  var inboxView = 'inbox';
  function isArchived(m) { return m.archived === true || (m.archived !== false && !!m.reply); }
  P.inbox = function () {
    var all = (DB.her.messages || []).slice().reverse();
    var inbox = all.filter(function (m) { return !isArchived(m); }), arch = all.filter(isArchived);
    var list = inboxView === 'inbox' ? inbox : arch;
    var seg = '<div class="seg" role="group" style="margin-bottom:4px">' +
      '<button type="button" data-inboxview="inbox" aria-pressed="' + (inboxView === 'inbox') + '">📥 Inbox' + (inbox.length ? ' (' + inbox.length + ')' : '') + '</button>' +
      '<button type="button" data-inboxview="archive" aria-pressed="' + (inboxView === 'archive') + '">🗄️ Archive' + (arch.length ? ' (' + arch.length + ')' : '') + '</button></div>';
    var help = inboxView === 'inbox'
      ? '<p class="help" style="margin:0">Replying sends your answer to her and moves the message to the Archive.</p>'
      : '<p class="help" style="margin:0">Replied and archived messages. You can still edit a reply or move one back to the Inbox.</p>';
    function body(m) {
      var t = esc(m.text);
      if (m.text.length <= 700) return '<div class="msg-text">' + t + '</div>';
      return '<details class="msg-long"><summary><span class="msg-text">' + esc(m.text.slice(0, 600)) + '…</span><span class="more">Read all (' + m.text.trim().split(/\s+/).length + ' words)</span></summary><div class="msg-text">' + t + '</div></details>';
    }
    var items = list.map(function (m) {
      var tag = !isArchived(m) ? (m.read ? '<span class="tag">read</span>' : '<span class="tag on">new</span>') : (m.reply ? '<span class="tag on">replied ✓</span>' : '<span class="tag">archived</span>');
      return '<div class="item' + (!isArchived(m) && !m.read ? ' unread' : '') + '"><div class="item-head"><span class="help">' + K.herDateTime(m.at) + ' Barcelona · ' + ago(m.at) + '</span>' + tag + '</div>' +
        body(m) +
        '<label class="help">' + (m.reply ? 'Your reply (she sees it under her message)' : 'Reply (she sees it under her message)') +
          '<textarea class="field" data-replyto="' + esc(m.id) + '" placeholder="Write back…">' + esc(m.reply || '') + '</textarea></label>' +
        '<div class="btns">' +
          (inboxView === 'inbox'
            ? '<button class="btn sm" data-msg="reply" data-mid="' + esc(m.id) + '">💌 Reply &amp; archive</button>' +
              '<button class="btn sm ghost" data-msg="archive" data-mid="' + esc(m.id) + '">🗄️ Archive</button>'
            : '<button class="btn sm" data-msg="reply" data-mid="' + esc(m.id) + '">💌 ' + (m.reply ? 'Update reply' : 'Reply') + '</button>' +
              '<button class="btn sm ghost" data-msg="unarchive" data-mid="' + esc(m.id) + '">📥 Back to Inbox</button>') +
          '<button class="btn sm danger" data-msg="del" data-mid="' + esc(m.id) + '">🗑️</button></div></div>';
    }).join('');
    var empty = inboxView === 'inbox' ? '<p class="muted">All caught up 💚 Nothing waiting for a reply.</p>' : '<p class="muted">Nothing archived yet</p>';
    return '<section class="card stack"><h3>📬 Messages from her</h3>' + seg + help + (items || empty) + '</section>';
  };

  P.photos = function () {
    var ps = DB.photos || [];
    return '<section class="card stack"><h3>📸 Post a photo of the day</h3>' +
      '<p class="help" style="margin:0">It shows on her Home page. Only you two can see photos.</p>' +
      '<label class="btn ghost" style="display:block;text-align:center;cursor:pointer">📷 Choose a photo<input type="file" id="ph-file" accept="image/*" hidden></label>' +
      '<img id="ph-preview" class="photo-big" hidden alt="">' +
      '<label class="help">Caption (optional)<input class="field" id="ph-cap" maxlength="200" placeholder="e.g. Committee room view 🇷🇺"></label>' +
      '<label class="switch-row"><input type="checkbox" id="ph-bonus"> <span><b>🎁 Bonus photo</b><br><span class="help">Locked until she sends a photo of herself. Leave off for a normal photo of the day.</span></span></label>' +
      '<div class="btns"><button class="btn sm" id="ph-post">📤 Post photo</button></div></section>' +
      '<section class="card stack"><h3>Posted (' + ps.length + ')</h3>' +
      (ps.length ? '<div class="photo-grid">' + ps.map(function (p) {
        var unlocked = Object.keys(DB.her.unlockedBonus || {}).indexOf(p.id) !== -1;
        return '<div class="ph-item"><img src="' + p.data + '" alt="">' +
          (p.bonus ? '<span class="tag' + (unlocked ? ' on' : '') + '">🎁 bonus' + (unlocked ? ' · unlocked' : ' · locked') + '</span>' : '<span class="tag">photo of the day</span>') +
          '<span class="help">' + esc(K.herDateTime(p.at)) + (p.caption ? ' · ' + esc(p.caption) : '') + '</span>' +
          '<div class="btns"><button class="btn sm ghost" data-phbonus="' + esc(p.id) + '">' + (p.bonus ? 'Make normal' : 'Make bonus 🎁') + '</button>' +
          '<button class="btn sm danger" data-phdel="' + esc(p.id) + '">🗑️</button></div></div>';
      }).join('') + '</div>' : '<p class="muted">No photos yet</p>') + '</section>' +
      '<section class="card stack"><h3>📷 From her (' + (DB.herPhotos || []).length + ')</h3>' +
      '<p class="help" style="margin:0">Approve to unlock the bonus for her. Reject to take points away (she can send another).</p>' +
      ((DB.herPhotos || []).length ? '<div class="photo-grid">' + DB.herPhotos.map(function (p) {
        var st = p.status || 'pending';
        var tag = st === 'approved' ? '<span class="tag on">✅ approved</span>' : st === 'rejected' ? '<span class="tag">❌ rejected' + (p.penalty ? ' · −' + p.penalty + ' ⭐' : '') + '</span>' : '<span class="tag pend">⏳ waiting for you</span>';
        return '<div class="ph-item' + (st === 'pending' ? ' pending' : '') + '"><button type="button" class="photo-frame" data-herview="' + esc(p.id) + '"><img src="' + p.data + '" alt=""></button>' + tag +
          '<span class="help">' + esc(K.herDateTime(p.at)) + ' · ' + ago(p.at) + '</span>' +
          '<div class="btns">' + (st !== 'approved' ? '<button class="btn sm" data-herok="' + esc(p.id) + '">✅ Approve</button>' : '') +
          (st === 'pending' ? '<button class="btn sm pink" data-herno="' + esc(p.id) + '">❌ Reject</button>' : '') +
          '<button class="btn sm danger" data-herdel="' + esc(p.id) + '">🗑️</button></div></div>';
      }).join('') + '</div>' : '<p class="muted">She hasn\'t sent any photos yet. Post a bonus photo to ask for one 😉</p>') + '</section>';
  };
  var pendingPhoto = null;
  panels.addEventListener('change', function (e) {
    if (e.target.id !== 'ph-file' || !e.target.files[0]) return;
    toast('Getting the photo ready…');
    K.compressPhoto(e.target.files[0]).then(function (d) {
      pendingPhoto = d; var pv = $('#ph-preview'); pv.src = d; pv.hidden = false; toast('Ready. Add a caption and post 📤');
    }).catch(function () { pendingPhoto = null; toast('Couldn\'t read that photo. Try a JPG or PNG'); });
  });

  P.messages = function () {
    var st = DB.state, sp = st.surprise || {}, ov = st.statusOverride || {}, her = DB.her;
    var ovOn = ov.text && (!ov.until || Date.now() < ov.until);
    return '<section class="card stack"><h3>💬 Quote on her home page</h3><div class="form">' +
        '<label>Quote<textarea class="field" id="q-text">' + esc(st.quote.text) + '</textarea></label>' +
        '<label>Who said it<input class="field" id="q-by" value="' + esc(st.quote.by) + '"></label></div>' +
        '<div class="btns"><button class="btn sm" id="q-save">💾 Save quote</button><button class="btn sm ghost" id="q-reset">Back to the original</button></div></section>' +
      '<section class="card stack"><h3>💌 Surprise message</h3><p class="help">Shows as a "You have a surprise!" envelope on her home page. Opening it sets off confetti.</p><div class="form">' +
        '<div class="row2"><label>Emoji<input class="field" id="s-emoji" value="' + esc(sp.emoji || '💌') + '" maxlength="4"></label><span></span></div>' +
        '<label>Title<input class="field" id="s-title" value="' + esc(sp.title || '') + '" placeholder="e.g. Open me 🥰"></label>' +
        '<label>Message<textarea class="field" id="s-text" placeholder="Write anything…">' + esc(sp.text || '') + '</textarea></label></div>' +
        '<p class="help">' + (sp.active ? 'Showing now · ' + (her.seenSurprise === sp.id ? 'she opened it ✓' : 'not opened yet') : 'Not showing') + '</p>' +
        '<div class="btns"><button class="btn sm pink" id="s-send">✨ Send surprise</button>' + (sp.active ? '<button class="btn sm ghost" id="s-hide">Hide it</button>' : '') + '</div></section>' +
      '<section class="card stack"><h3>📣 Live status update</h3><p class="help">Replaces the "Right now Chengxuan is…" text for a while, e.g. "Just landed! 🛬".</p><div class="form">' +
        '<label>Status<input class="field" id="o-text" value="' + esc(ovOn ? ov.text : '') + '" placeholder="e.g. Just landed safe! 🛬" maxlength="80"></label>' +
        '<label>Show for<select class="field" id="o-dur"><option value="1">1 hour</option><option value="3" selected>3 hours</option><option value="6">6 hours</option><option value="24">1 day</option><option value="0">Until I clear it</option></select></label></div>' +
        '<p class="help">' + (ovOn ? 'Showing now' + (ov.until ? ' until ' + K.herDateTime(ov.until) + ' Barcelona' : '') : 'Not showing (using the schedule)') + '</p>' +
        '<div class="btns"><button class="btn sm" id="o-save">📣 Show status</button>' + (ovOn ? '<button class="btn sm ghost" id="o-clear">Clear</button>' : '') + '</div></section>' +
      '<section class="card stack"><h3>🏷️ Home page banner</h3><div class="form"><label>Short line at the top of her home page (empty = hidden)<input class="field" id="b-text" value="' + esc(st.banner || '') + '" maxlength="90" placeholder="e.g. Good luck on your exam today! 📚💚"></label></div>' +
        '<div class="btns"><button class="btn sm" id="b-save">💾 Save banner</button></div></section>';
  };

  P.countdowns = function () {
    var st = DB.state, all = K.countdowns(), f = st.featured || 'auto';
    var opts = [['auto', '✨ Automatic (most important)']].concat([['leave', '✈️ Leaving'], ['both', '💚 Next both free'], ['home', '🏡 Home'], ['gift-next', '🎁 Next present']])
      .concat((st.countdowns || []).map(function (c) { return [c.id, (c.emoji || '⭐') + ' ' + c.label]; }));
    return '<section class="card stack"><h3>⭐ Main (big) countdown</h3><p class="help">The big countdown on her Home and Week pages. If the one you pick has already passed, it falls back to automatic.</p>' +
        '<select class="field" id="feat">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === f ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>' +
        '<div class="btns"><button class="btn sm" id="feat-save">💾 Save</button></div></section>' +
      '<section class="card stack"><h3>＋ Add your own countdown</h3><div class="form">' +
        '<div class="row2"><label>Emoji<input class="field" id="c-emoji" value="✈️" maxlength="4"></label><span></span></div>' +
        '<label>Label<input class="field" id="c-label" placeholder="e.g. Next video call" maxlength="60"></label>' +
        '<label>When (Barcelona time)<input class="field" id="c-at" type="datetime-local"><span class="help sg"></span></label></div>' +
        '<div class="btns"><button class="btn sm" id="c-add">＋ Add countdown</button></div></section>' +
      '<section class="card stack"><h3>Your countdowns</h3>' +
        ((st.countdowns || []).length ? (st.countdowns || []).map(function (c) {
          return '<div class="item-head"><span>' + esc((c.emoji || '⭐') + ' ' + c.label) + '<br><small class="muted">' + esc(K.herDateTime(T.parse(c.at, HZ))) + ' Barcelona</small></span><button class="btn sm danger" data-cdel="' + esc(c.id) + '">🗑️</button></div>';
        }).join('') : '<p class="muted">None yet</p>') +
        '<p class="help">Automatic ones (leaving, both free, home, presents) come from the schedule and gifts. Right now she sees ' + all.length + ' countdowns in the Timers tab.</p></section>';
  };

  P.notes = function () {
    return '<section class="card stack"><h3>📝 Love notes</h3><p class="help">One note per line. The kiwi says a random one when she taps it.</p>' +
      '<textarea class="field" id="n-text" style="min-height:320px">' + esc(K.notes().join('\n')) + '</textarea>' +
      '<div class="btns"><button class="btn sm" id="n-save">💾 Save notes</button><button class="btn sm ghost" id="n-reset">Back to the original 20</button></div></section>';
  };

  P.reset = function () {
    var rows = [
      ['points', '⭐ Reset points to 0', 'Clears her points and the points history.'],
      ['miss', '🥺 Reset "missed you" counter', 'Sets the miss-you count back to 0.'],
      ['game', '🧺 Reset game high score', 'Sets the kiwi game best back to 0.'],
      ['rewrap', '🎀 Re-wrap all gifts', 'Every unlocked gift goes back to "Tap to unwrap!".'],
      ['messages', '💌 Clear surprise, status and banner', 'Removes the surprise envelope, live status and banner.'],
      ['gifts', '🎁 Restore gifts from gifts.js', 'Throws away gift edits made here and uses the file again.'],
      ['all', '🧨 Reset the whole website', 'Everything above, plus quote, notes and countdowns back to the defaults.']
    ];
    return '<section class="card stack"><p class="help">Each button asks before doing anything.</p>' + rows.map(function (r) {
      return '<div class="item"><div class="item-head"><b>' + r[1] + '</b></div><p class="help" style="margin:0">' + r[2] + '</p><div><button class="btn sm ' + (r[0] === 'all' ? 'danger' : 'brown') + '" data-reset="' + r[0] + '">Reset</button></div></div>';
    }).join('') + '</section>';
  };

  // ---------------------------------------------------------------- render + tabs
  function render() {
    renderNav();
    panels.innerHTML = '<div class="panel stack">' + P[current]() + '</div>';
    wireSgHints(panels);
  }
  // ---- navigation: 5 groups, each with its own tabs
  var GROUPS = [
    { id: 'home', label: '🏠 Home', tabs: [['overview', '📊 Overview']] },
    { id: 'her', label: '💬 Her', tabs: [['inbox', '📬 Messages'], ['photos', '📸 Photos'], ['wishes', '💭 Guesses & wishes']] },
    { id: 'rewards', label: '⭐ Rewards', tabs: [['points', '⭐ Points'], ['gifts', '🎁 Gifts']] },
    { id: 'write', label: '✍️ Write', tabs: [['messages', '💌 Messages to her'], ['countdowns', '⏳ Countdowns'], ['notes', '📝 Love notes']] },
    { id: 'more', label: '⚙️ More', tabs: [['reset', '🧹 Reset']] }
  ];
  function groupOf(tab) { return GROUPS.find(function (g) { return g.tabs.some(function (t) { return t[0] === tab; }); }) || GROUPS[0]; }
  // Things waiting for you, per tab
  function todo() {
    var her = DB.her;
    return {
      inbox: (her.messages || []).filter(function (m) { return !isArchived(m); }).length,
      photos: (DB.herPhotos || []).filter(function (p) { return (p.status || 'pending') === 'pending'; }).length,
      wishes: (her.guesses || []).filter(function (x) { return !x.verdict; }).length + (her.wishes || []).filter(function (x) { return !x.status; }).length
    };
  }
  function renderNav() {
    var t = todo(), g = groupOf(current);
    function dot(n) { return n ? ' <span class="nbadge">' + n + '</span>' : ''; }
    $('#admin-groups').innerHTML = GROUPS.map(function (x) {
      var n = x.tabs.reduce(function (a, tb) { return a + (t[tb[0]] || 0); }, 0);
      return '<button type="button" data-group="' + x.id + '" aria-pressed="' + (x === g) + '">' + x.label + dot(n) + '</button>';
    }).join('');
    $('#admin-tabs').innerHTML = g.tabs.length > 1 ? g.tabs.map(function (tb) {
      return '<button role="tab" data-tab="' + tb[0] + '" aria-selected="' + (tb[0] === current) + '">' + esc(tb[1]) + dot(t[tb[0]]) + '</button>';
    }).join('') : '';
    $('#admin-tabs').hidden = g.tabs.length < 2;
  }
  function go(tab) { current = tab; render(); window.scrollTo({ top: 0 }); }
  $('#admin-groups').addEventListener('click', function (e) {
    var b = e.target.closest('[data-group]'); if (!b) return;
    var g = GROUPS.find(function (x) { return x.id === b.dataset.group; });
    var t = todo(), first = g.tabs.find(function (tb) { return t[tb[0]]; });   // open the tab that needs you, if any
    go((first || g.tabs[0])[0]);
  });
  $('#admin-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });
  // Only the overview refreshes live; forms re-render after you press a button.
  DB.subscribe(function () { renderNav(); });
  var photoCount = -1;
  DB.subscribe(function () {
    if (current === 'overview') render();
    var pc = (DB.photos || []).length + ':' + (DB.herPhotos || []).map(function (h) { return h.status || 'p'; }).join('') + ':' + Object.keys(DB.her.unlockedBonus || {}).length;
    if (current === 'photos' && pc !== photoCount && !pendingPhoto) { photoCount = pc; render(); }
  });

  // ---------------------------------------------------------------- actions
  function val(id) { var el = $('#' + id); return el ? el.value.trim() : ''; }
  function saveGifts(map, msg) { DB.setState({ gifts: map }); toast(msg || 'Saved 🎁'); render(); }

  panels.addEventListener('click', function (e) {
    var un = e.target.closest('[data-apunskip]');
    if (un) {
      e.preventDefault();
      var ap2 = Object.assign({}, DB.state.autoPoints); ap2.skipped = (ap2.skipped || []).filter(function (k) { return k !== un.dataset.apunskip; });
      DB.setState({ autoPoints: ap2 }); toast('Night restored'); return render();
    }
    var b = e.target.closest('button'); if (!b) return;
    var d = b.dataset, id = b.id;

    if (d.goto) { go(d.goto); return; }
    if (d.quick) { addPoints(+d.quick, ''); render(); return; }
    if (d.add) { addPoints(+d.add, val('pt-reason')); render(); return; }
    if (id === 'pt-custom-go') { if (!val('pt-custom')) return toast('Type an amount first'); addPoints(+val('pt-custom'), val('pt-reason')); render(); return; }
    if (id === 'pt-set-go') {
      var n = Math.max(0, Math.round(+val('pt-set'))); if (val('pt-set') === '' || isNaN(n)) return toast('Type a number first');
      var diff = n - K.balance(); if (diff) addPoints(diff, val('pt-reason') || 'Points adjusted'); render(); return;
    }
    if (id === 'pt-undo') {
      var log = (DB.state.pointsLog || []).slice(), last = log.pop(); if (!last) return;
      DB.setState({ points: Math.max(0, (DB.state.points || 0) - last.amt), pointsLog: log }); toast('Undone ↩️'); render(); return;
    }

    if (d.g) {
      var card = b.closest('[data-gid]'), gid = card.dataset.gid, map = giftsMap(), g = map[gid] || {};
      if (d.g === 'save') {
        card.querySelectorAll('[data-k]').forEach(function (inp) { g[inp.dataset.k] = inp.dataset.k === 'points' ? Math.max(0, +inp.value || 0) : inp.value.trim(); });
        if (!g.reveal) delete g.reveal;
        map[gid] = g; return saveGifts(map, 'Gift saved 🎁');
      }
      if (d.g === 'unlock') { g.forceOpen = true; map[gid] = g; return saveGifts(map, 'Unlocked! She can unwrap it now ✨'); }
      if (d.g === 'lock') { delete g.forceOpen; map[gid] = g; return saveGifts(map, 'Locked again 🔒'); }
      if (d.g === 'rewrap') { var op = Object.assign({}, DB.her.opened); delete op[gid]; DB.setHer({ opened: op }); toast('Re-wrapped 🎀'); return render(); }
      if (d.g === 'up' || d.g === 'down') {
        var ids = Object.keys(map).sort(function (a, b2) { return (map[a].order || 0) - (map[b2].order || 0); });
        var i = ids.indexOf(gid), j = d.g === 'up' ? i - 1 : i + 1; if (j < 0 || j >= ids.length) return;
        ids.splice(j, 0, ids.splice(i, 1)[0]); ids.forEach(function (k, n2) { map[k].order = n2; });
        return saveGifts(map, 'Order saved');
      }
      if (d.g === 'delete') {
        K.confirm({ emoji: '🗑️', title: 'Delete "' + (g.name || 'this gift') + '"?', text: 'It disappears from her Gifts page.', yes: 'Delete', danger: true }).then(function (ok) {
          if (!ok) return; delete map[gid]; saveGifts(map, 'Gift deleted');
        });
        return;
      }
    }
    if (id === 'gift-add') {
      var m = giftsMap(), ord = Object.keys(m).length;
      m['g' + uid()] = { order: ord, emoji: '🎁', name: '', hint: 'Something special is on its way…', message: '', points: 0, color: '#ff8fa3', ribbon: '#8EE000' };
      return saveGifts(m, 'New gift added. Fill it in and press Save');
    }


    if (d.reply || d.xdel) {
      var key = (d.reply || d.xdel) === 'guess' ? 'guesses' : 'wishes', arr = (DB.her[key] || []).slice();
      if (d.xdel) {
        K.confirm({ emoji: '🗑️', title: 'Delete this?', yes: 'Delete', danger: true }).then(function (ok) {
          if (!ok) return;
          var p2 = {}; p2[key] = (DB.her[key] || []).filter(function (x) { return x.id !== d.xid; }); DB.setHer(p2); toast('Deleted'); render();
        });
        return;
      }
      else {
        var note = val('x-note'), pts = Math.round(+val('x-pts') || 0);
        arr = arr.map(function (x) {
          if (x.id !== d.xid) return x;
          var y = Object.assign({}, x); y[key === 'guesses' ? 'verdict' : 'status'] = d.v; if (note) y.note = note; return y;
        });
        if (pts) addPoints(pts, key === 'guesses' ? 'Great guess! 🤔' : 'For your wish 💭');
      }
      var patch = {}; patch[key] = arr; DB.setHer(patch); toast(d.xdel ? 'Deleted' : 'Reply sent 💚'); return render();
    }

    if (d.inboxview) { inboxView = d.inboxview; return render(); }
    if (d.msg) {
      var mid = d.mid, msgs = (DB.her.messages || []).slice();
      if (d.msg === 'del') {
        K.confirm({ emoji: '🗑️', title: 'Delete this message?', text: 'It disappears for both of you.', yes: 'Delete', danger: true }).then(function (ok) {
          if (!ok) return; DB.setHer({ messages: (DB.her.messages || []).filter(function (m) { return m.id !== mid; }) }); toast('Deleted'); render();
        });
        return;
      }
      var replyEl = panels.querySelector('[data-replyto="' + mid + '"]'), txt = replyEl ? replyEl.value.trim() : '';
      if (d.msg === 'reply' && !txt) return toast('Write a reply first');
      msgs = msgs.map(function (m) {
        if (m.id !== mid) return m;
        var y = Object.assign({}, m, { read: true });
        if (d.msg === 'reply') { y.reply = txt; y.replyAt = Date.now(); y.archived = true; }
        if (d.msg === 'archive') y.archived = true;
        if (d.msg === 'unarchive') y.archived = false;
        return y;
      });
      DB.setHer({ messages: msgs });
      toast({ reply: inboxView === 'inbox' ? 'Reply sent 💌 · moved to Archive' : 'Reply updated 💌', archive: 'Archived 🗄️', unarchive: 'Back in the Inbox 📥' }[d.msg] || 'Done');
      return render();
    }

    // nightly call points
    if (id === 'ap-save' || id === 'ap-on' || id === 'ap-off' || id === 'ap-skip' || d.apskip) {
      var cur = Object.assign({}, DB.defaults.state().autoPoints, DB.state.autoPoints || {});
      if (id === 'ap-skip' || d.apskip) {
        var key2 = d.apskip || nextAutoKey(cur);
        cur.skipped = (cur.skipped || []).filter(function (k) { return k !== key2; }).concat([key2]).slice(-60);
        DB.setState({ autoPoints: cur }); toast(d.apskip ? 'Removed that night' : 'Next night skipped'); return render();
      }
      // Lock in nights already given (so changing the amount or time never rewrites the past), then apply the change
      bakeAuto();
      cur = Object.assign({}, DB.state.autoPoints, { since: T.now() });
      if (id === 'ap-on') cur.on = true;
      if (id === 'ap-off') cur.on = false;
      if (id === 'ap-save') {
        var amt2 = Math.round(+val('ap-amt')); if (!amt2 || amt2 < 1) return toast('Points must be at least 1');
        if (!/^\d{2}:\d{2}$/.test(val('ap-time'))) return toast('Pick a time');
        cur.amount = amt2; cur.time = val('ap-time'); cur.reason = val('ap-reason') || 'For our call 📞💚';
      }
      DB.setState({ autoPoints: cur }); toast(id === 'ap-off' ? 'Nightly points paused' : id === 'ap-on' ? 'Nightly points on 📞' : 'Saved 📞'); return render();
    }

    if (id === 'ck-save' || id === 'ck-on' || id === 'ck-off') {
      var ck = K.checkinCfg();
      if (id === 'ck-on') ck.on = true;
      if (id === 'ck-off') ck.on = false;
      if (id === 'ck-save') { ck.perDay = Math.max(0, Math.round(+val('ck-per') || 0)); ck.weekBonus = Math.max(0, Math.round(+val('ck-bonus') || 0)); ck.extra = Math.max(0, Math.round(+val('ck-extra') || 0)); ck.extraMax = Math.max(0, Math.round(+val('ck-max') || 0)); }
      DB.setState({ checkinPoints: ck }); toast(id === 'ck-off' ? 'Check-in points paused' : 'Saved ✅'); return render();
    }
    if (id === 'ph-post') {
      if (!pendingPhoto) return toast('Choose a photo first');
      b.disabled = true; b.textContent = 'Posting…';
      var isBonus = !!($('#ph-bonus') && $('#ph-bonus').checked);
      DB.addPhoto({ id: 'p' + Date.now().toString(36) + uid(), data: pendingPhoto, caption: val('ph-cap'), at: Date.now(), bonus: isBonus })
        .then(function () { pendingPhoto = null; toast(isBonus ? 'Bonus posted 🎁 She unlocks it with a selfie' : 'Posted 📸 She\'ll see it on her Home'); render(); })
        .catch(function (err) { console.error(err); b.disabled = false; b.textContent = '📤 Post photo'; toast('Couldn\'t post. Check your connection and try again'); });
      return;
    }
    if (d.phbonus) {
      var ph = (DB.photos || []).find(function (x) { return x.id === d.phbonus; }); if (!ph) return;
      DB.updatePhoto(ph.id, { bonus: !ph.bonus }).then(function () { toast(ph.bonus ? 'Now a normal photo 📸' : 'Now a bonus photo 🎁'); render(); });
      return;
    }
    if (d.herok) {
      var hpOk = (DB.herPhotos || []).find(function (x) { return x.id === d.herok; }); if (!hpOk) return;
      DB.updateHerPhoto(hpOk.id, { status: 'approved' });
      if (hpOk.forBonus) { var ub = Object.assign({}, DB.her.unlockedBonus); ub[hpOk.forBonus] = hpOk.id; DB.setHer({ unlockedBonus: ub }); }
      toast('Approved ✅ Her bonus photo is unlocked'); return render();
    }
    if (d.herno) {
      var hpNo = (DB.herPhotos || []).find(function (x) { return x.id === d.herno; }); if (!hpNo) return;
      var sh = K.modal('<div class="em">❌</div><h3>Reject this photo?</h3>' +
        '<p class="desc">The bonus stays locked and she can send another one.</p>' +
        '<label class="help">Points to take away<input class="field" id="rej-pts" type="number" inputmode="numeric" min="0" value="15"></label>' +
        '<label class="help" style="margin-top:8px;display:block">What she sees<input class="field" id="rej-why" maxlength="80" value="Photo not approved 🙈"></label>' +
        '<div class="btns" style="margin-top:14px"><button type="button" class="btn danger" id="rej-go">Reject</button><button type="button" class="btn ghost" id="rej-cancel">Cancel</button></div>', 'confirm');
      sh.querySelector('#rej-cancel').addEventListener('click', K.closeModal);
      sh.querySelector('#rej-go').addEventListener('click', function () {
        var n = Math.max(0, Math.round(+sh.querySelector('#rej-pts').value || 0)), why = sh.querySelector('#rej-why').value.trim() || 'Photo not approved 🙈';
        var take = Math.min(n, K.balance());
        DB.updateHerPhoto(hpNo.id, { status: 'rejected', penalty: take });
        if (take > 0) addPoints(-take, why);
        K.closeModal(); toast(take ? 'Rejected · −' + take + ' ⭐' : 'Rejected'); render();
      });
      return;
    }
    if (d.herview) {
      var hp = (DB.herPhotos || []).find(function (x) { return x.id === d.herview; });
      if (hp) K.modal('<img class="photo-big" src="' + hp.data + '" alt=""><div class="help">' + esc(K.herDateTime(hp.at)) + ' Barcelona</div>', 'photo-sheet');
      return;
    }
    if (d.herdel) {
      K.confirm({ emoji: '🗑️', title: 'Delete her photo?', yes: 'Delete', danger: true }).then(function (ok) {
        if (!ok) return; DB.deleteHerPhoto(d.herdel).then(function () { toast('Deleted'); render(); });
      });
      return;
    }
    if (d.phdel) {
      K.confirm({ emoji: '🗑️', title: 'Delete this photo?', text: 'It disappears from her site.', yes: 'Delete', danger: true }).then(function (ok) {
        if (!ok) return; DB.deletePhoto(d.phdel).then(function () { toast('Photo deleted'); render(); });
      });
      return;
    }

    if (id === 'q-save') { if (!val('q-text')) return toast('The quote is empty'); DB.setState({ quote: { text: val('q-text'), by: val('q-by') } }); toast('Quote saved 💬'); return render(); }
    if (id === 'q-reset') { DB.setState({ quote: DB.defaults.state().quote }); toast('Original quote back'); return render(); }
    if (id === 's-send') {
      if (!val('s-text') && !val('s-title')) return toast('Write a title or message first');
      DB.setState({ surprise: { id: uid(), emoji: val('s-emoji') || '💌', title: val('s-title'), text: val('s-text'), active: true } });
      toast('Surprise sent 💌'); return render();
    }
    if (id === 's-hide') { DB.setState({ surprise: Object.assign({}, DB.state.surprise, { active: false }) }); toast('Surprise hidden'); return render(); }
    if (id === 'o-save') {
      if (!val('o-text')) return toast('Type a status first');
      var hrs = +val('o-dur'); DB.setState({ statusOverride: { text: val('o-text'), until: hrs ? Date.now() + hrs * 3600000 : 0 } });
      toast('Status is live 📣'); return render();
    }
    if (id === 'o-clear') { DB.setState({ statusOverride: null }); toast('Status cleared'); return render(); }
    if (id === 'b-save') { DB.setState({ banner: val('b-text') }); toast(val('b-text') ? 'Banner saved 🏷️' : 'Banner hidden'); return render(); }

    if (id === 'feat-save') { DB.setState({ featured: val('feat') }); toast('Main countdown saved ⭐'); return render(); }
    if (id === 'c-add') {
      if (!val('c-label') || !val('c-at')) return toast('Add a label and a date');
      DB.setState({ countdowns: (DB.state.countdowns || []).concat([{ id: 'c-' + uid(), emoji: val('c-emoji') || '⭐', label: val('c-label'), at: val('c-at') }]) });
      toast('Countdown added ⏳'); return render();
    }
    if (d.cdel) { DB.setState({ countdowns: (DB.state.countdowns || []).filter(function (c) { return c.id !== d.cdel; }) }); toast('Countdown deleted'); return render(); }

    if (id === 'n-save') {
      var lines = $('#n-text').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!lines.length) return toast('Add at least one note');
      DB.setState({ notes: lines }); toast(lines.length + ' notes saved 📝'); return render();
    }
    if (id === 'n-reset') { DB.setState({ notes: null }); toast('Original notes back'); return render(); }

    if (d.reset) {
      var R = {
        points:   ['⭐', 'Reset her points to 0?', 'Her points, the points history and what she has spent all go back to 0. Opened presents stay open.'],
        miss:     ['🥺', 'Reset the "missed you" counter?', 'The miss-you count goes back to 0.'],
        game:     ['🧺', 'Reset the game high score?', 'Her kiwi game best goes back to 0.'],
        rewrap:   ['🎀', 'Re-wrap all gifts?', 'Every opened present goes back to "Tap to unwrap!".'],
        messages: ['💌', 'Clear surprise, status and banner?', 'They disappear from her site.'],
        gifts:    ['🎁', 'Restore gifts from gifts.js?', 'All gift edits made here are thrown away.'],
        all:      ['🧨', 'Reset the WHOLE website?', 'Points, gifts, messages, notes, countdowns, guesses, wishes and counters all go back to the start. This can\'t be undone.']
      }[d.reset];
      K.confirm({ emoji: R[0], title: R[1], text: R[2] + (d.reset === 'all' ? '' : ' This can\'t be undone.'), yes: 'Yes, reset', danger: true, typeWord: d.reset === 'all' ? 'RESET' : '' }).then(function (ok) {
        if (!ok) return;
        if (d.reset === 'points') { DB.setState({ points: 0, pointsLog: [], autoPoints: Object.assign({}, DB.state.autoPoints, { since: T.now(), skipped: [] }), checkinPoints: Object.assign({}, DB.state.checkinPoints, { since: T.now() }) }); DB.setHer({ bought: {} }); }
        if (d.reset === 'miss') DB.setHer({ missCount: 0 });
        if (d.reset === 'game') DB.setHer({ gameBest: 0 });
        if (d.reset === 'rewrap') DB.setHer({ opened: {} });
        if (d.reset === 'messages') DB.setState({ surprise: null, statusOverride: null, banner: '' });
        if (d.reset === 'gifts') DB.setState({ gifts: null });
        if (d.reset === 'all') { DB.resetState(); DB.resetHer(); }
        toast('Done 🧹'); render();
      });
      return;
    }
  });

  render();
});
