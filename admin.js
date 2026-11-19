/* admin.js: Chengxuan's control panel. Every change saves straight away and Livina sees it live (in live mode). */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, T = window.KiwiTime, DB = window.KiwiDB, $ = K.$, esc = K.esc, HZ = K.HZ;
  // Everything in admin is shown and typed in Singapore time. Things stored as Barcelona clock times (gift dates, countdowns) are converted.
  var VZ = K.VZ || 'Asia/Singapore', ZL = VZ === HZ ? 'Barcelona' : 'Singapore';
  function wallOf(epoch, z) { var p = T.parts(epoch, z), d = function (n) { return (n < 10 ? '0' : '') + n; }; return p.y + '-' + d(p.m) + '-' + d(p.d) + 'T' + d(p.h) + ':' + d(p.mi); }
  function toBcn(v) { try { return v ? wallOf(T.parse(String(v).replace(' ', 'T').slice(0, 16), VZ), HZ) : ''; } catch (e) { return ''; } }
  function fromBcn(v) { try { return v ? wallOf(T.parse(v, HZ), VZ) : ''; } catch (e) { return ''; } }
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
    var other = VZ === HZ ? 'Asia/Singapore' : HZ;
    try { var e = T.parse(v, VZ); return '= ' + T.fmtDay(e, other) + ', ' + T.fmtTime(e, other) + (other === HZ ? ' her time (Barcelona)' : ' Singapore time'); } catch (x) { return ''; }
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
    return T.fmtDay(at, 'Asia/Singapore') + ', ' + T.fmtTime(at, 'Asia/Singapore') + ' Singapore (' + T.fmtDay(at, HZ) + ', ' + T.fmtTime(at, HZ) + ' her time)';
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
      '<div class="help">' + ago(now.at) + ' · ' + K.herDateTime(now.at) + '</div>' +
      (hist ? '<div class="help">Before that: <span class="mood-hist">' + hist + '</span></div>' : '') + '</div>';
  }

  function needsYou() {
    var t = todo(), rows = [];
    var qdd = ((DB.her.qotd || {}).days || {})[K.todayKey()] || {};
    if (qdd.her && !qdd.him) rows.push(['qotd', '❓', 'She answered today\'s question. Peek, then answer yours']);
        var bl = DB.billing || {};
    if ((+bl.cost || 0) >= 10 && bl.capAt == null && !bl.disabledAt) rows.push(['billing', '💳', 'S$10 spent this month: stop here or keep going to S$15?']);
    if (t.photos) rows.push(['photos', '📸', t.photos + ' photo' + (t.photos > 1 ? 's' : '') + ' from her to approve']);
    if (t.inbox) {
      var c = { msg: 0, guess: 0, wish: 0, answer: 0 }; fromHer().forEach(function (i) { if (!i.done) c[i.kind]++; });
      var parts = [];
      if (c.msg) parts.push(c.msg + ' message' + (c.msg > 1 ? 's' : ''));
      if (c.guess) parts.push(c.guess + ' guess' + (c.guess > 1 ? 'es' : ''));
      if (c.wish) parts.push(c.wish + ' wish' + (c.wish > 1 ? 'es' : ''));
      if (c.answer) parts.push(c.answer + ' answer' + (c.answer > 1 ? 's' : '') + ' to your question');
      rows.push(['inbox', '📥', 'New from her: ' + parts.join(', ')]);
    }
    return '<section class="card stack needs"><h3>✋ Needs you</h3>' + (rows.length ? rows.map(function (r) {
      return '<button type="button" class="need-row" data-goto="' + r[0] + '"><span class="em">' + r[1] + '</span><span>' + r[2] + '</span><span class="go">›</span></button>';
    }).join('') : '<p class="muted" style="margin:0">All caught up 💚</p>') + '</section>' +
    '<section class="card stack"><h3>⚡ Quick actions</h3><div class="quick">' +
      '<button type="button" class="btn sm" data-quick="10">+10 ⭐</button><button type="button" class="btn sm" data-quick="25">+25 ⭐</button>' +
      '<button type="button" class="btn sm ghost" data-goto="photos">📸 Post a photo</button><button type="button" class="btn sm ghost" data-goto="messages">💌 Send a surprise</button>' +
      '<button type="button" class="btn sm ghost" data-goto="ask">❓ Ask her something</button><button type="button" class="btn sm ghost" data-goto="control">📲 Ping her</button><button type="button" class="btn sm ghost" data-goto="clicker">🥝 Send clicker kiwis</button><button type="button" class="btn sm ghost" data-goto="schedule">⏰ Schedule something</button><button type="button" class="btn sm ghost" data-goto="screen">📱 See her screen</button><a class="btn sm ghost" href="movie.html" style="text-decoration:none">🍿 Movie night</a>' +
      '<a class="btn sm ghost" href="fun.html#movies-card" style="text-decoration:none">🍿 Movie list</a>' + '<a class="btn sm ghost" href="index.html" style="text-decoration:none">👀 View her site</a></div></section>';
  }

  P.overview = function () {
    var st = DB.state, her = DB.her, gs = K.gifts(), f = K.featured();
    var opened = gs.filter(function (g) { return g.opened; }).length, unlocked = gs.filter(function (g) { return g.unlocked; }).length;
    var sp = st.surprise, ov = st.statusOverride;
    return '<section class="card a2hs" id="push-card-admin" hidden></section>' +
      '<section class="card stack"><div data-presence="small">' + presenceHtml(false) + '</div><div class="btns"><button class="btn sm ghost" data-goto="live">🛰️ Live details</button><button class="btn sm ghost" data-goto="control">📲 Ping her</button></div></section>' +
      needsYou() + '<section class="card stack"><h3>💚 Her</h3>' +
      '<div class="stat-grid">' +
        '<div class="stat"><b>⭐ ' + K.balance() + '</b><span>points (' + K.spent() + ' spent)</span></div>' +
        '<div class="stat"><b>🥺 ' + (her.missCount || 0) + '</b><span>times she missed you</span></div>' +
        '<div class="stat"><b>🎁 ' + opened + '/' + gs.length + '</b><span>gifts opened (' + unlocked + ' unlocked)</span></div>' +
        '<div class="stat"><b>🧺 ' + (her.gameBest || 0) + '</b><span>kiwi game best</span></div>' +
      '</div>' +
      moodBox(her) +
      '<p>🔥 Check-in streak: <b>' + K.streak() + (K.streak() === 1 ? ' day' : ' days') + '</b>' + (K.checkedInToday() ? ' · checked in today ✓' : ' · not checked in yet today') + ' <span class="muted">(best: ' + K.bestStreak() + ')</span></p>' +
      '<p>⏳ Main countdown: <b>' + (f ? esc(f.emoji + ' ' + f.label) : 'none') + '</b></p>' +
      '<p>💌 Surprise: <b>' + (sp && sp.active ? esc(sp.title || 'untitled') + (her.seenSurprise === sp.id ? ' (seen ✓)' : ' (not opened yet)') : 'none showing') + '</b></p>' +
      '<p>📥 Things from her waiting for you: <b>' + fromHer().filter(function (i) { return !i.done; }).length + '</b></p>' +
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
        return '<li><span>' + (l.auto ? '📞 ' : '') + esc(l.reason || '(no reason)') + '<br><small class="muted">' + K.herDateTime(l.at) + (l.auto ? ' · nightly' : '') + '</small></span><span class="amt' + (l.amt < 0 ? ' neg' : '') + '">' + (l.amt > 0 ? '+' : '') + l.amt + '</span></li>';
      }).join('') : '<li class="muted">No points given yet</li>') + '</ul>' +
    '</section>';
  };

  P.gifts = function () {
    var map = giftsMap(), ids = Object.keys(map).sort(function (a, b) { return (map[a].order || 0) - (map[b].order || 0); });
    var live = {}; K.gifts().forEach(function (g) { live[g.id] = g; });
    return '<p class="help" style="margin:0 4px">She can <b>spend</b> points to unlock a gift (its price), or it unlocks for free on its date, or right away if you tap "Unlock now". Leave points at 0 for date-only, or the date empty for points-only. Dates are <b>' + ZL + ' time</b>.</p>' +
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
            '<label>Opens on (' + ZL + ' time)<input class="field" data-k="reveal" type="datetime-local" value="' + esc(fromBcn(g.reveal || '')) + '"><span class="help sg"></span></label>' +
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

  // ---- Everything from her in one place: messages, guesses, wishes, answers to your questions.
  // "Needs you" = waiting for your reply; "Done" = replied / archived.
  var inboxView = 'inbox', inboxKind = 'all', inboxSel = null, lastInboxList = [];
  function isArchived(m) { return m.archived === true || (m.archived !== false && !!m.reply); }
  function seenAnswers() { return DB.state.seenAnswers || {}; }
  function fromHer() {
    var her = DB.her, num = {}, name = {}, out = [];
    K.gifts().forEach(function (g) { num[g.id] = g.n; name[g.id] = g.name; });
    (her.messages || []).forEach(function (m) { out.push({ kind: 'msg', id: m.id, at: m.at, done: isArchived(m), x: m }); });
    (her.guesses || []).forEach(function (x) { out.push({ kind: 'guess', id: x.id, at: x.at, done: !!x.verdict, x: x, n: num[x.giftId], real: name[x.giftId] }); });
    (her.wishes || []).forEach(function (x) { out.push({ kind: 'wish', id: x.id, at: x.at, done: !!x.status, x: x }); });
    K.questions().forEach(function (q) { if (q.answer) out.push({ kind: 'answer', id: q.id, at: q.answer.at, done: seenAnswers()[q.id] === q.answer.at, x: q }); });
    return out.sort(function (a, b) { return b.at - a.at; });
  }
  var KINDS = [['all', 'All'], ['msg', '💌 Messages'], ['guess', '🤔 Guesses'], ['wish', '💭 Wishes'], ['answer', '❓ Answers']];
  var KIND_LABEL = { msg: '💌 Message', guess: '🤔 Guess', wish: '💭 Wish', answer: '❓ Answer' };
  function longText(text) {
    var t = esc(text);
    if (text.length <= 700) return '<div class="msg-text">' + t + '</div>';
    return '<details class="msg-long"><summary><span class="msg-text">' + esc(text.slice(0, 600)) + '…</span><span class="more">Read all (' + text.trim().split(/\s+/).length + ' words)</span></summary><div class="msg-text">' + t + '</div></details>';
  }
  function itemHtml(it) {
    var x = it.x, head = '<div class="item-head"><span><span class="kind ' + it.kind + '">' + KIND_LABEL[it.kind] + '</span><span class="help">' + K.herDateTime(it.at) + ' · ' + ago(it.at) + '</span></span>';
    var del = '<button class="btn sm danger" data-' + (it.kind === 'msg' ? 'msg="del" data-mid' : it.kind === 'answer' ? 'adel' : 'xdel="' + it.kind + '" data-xid') + '="' + esc(it.id) + '">🗑️</button>';
    if (it.kind === 'msg') {
      var tag = !it.done ? (x.read ? '<span class="tag">read</span>' : '<span class="tag on">new</span>') : (x.reply ? '<span class="tag on">replied ✓</span>' : '<span class="tag">archived</span>');
      return '<div class="item' + (!it.done && !x.read ? ' unread' : '') + '">' + head + tag + '</div>' + longText(x.text) +
        (x.auto && x.auto.text ? '<div class="help" style="margin:0">🤖 Auto-replied: "' + esc(x.auto.text) + '"</div>' : '') +
        (!it.done ? '<div class="qr-chips">' + quickList().map(function (q, qi) { return '<button type="button" data-qr="' + qi + '" data-mid="' + esc(x.id) + '">' + esc(q) + '</button>'; }).join('') + '</div>' : '') +
        '<label class="help">' + (x.reply ? 'Your reply' : 'Reply') + ' (she sees it under her message)<textarea class="field" data-replyto="' + esc(x.id) + '" placeholder="Write back…">' + esc(x.reply || '') + '</textarea></label>' +
        '<div class="btns">' + (!it.done
          ? '<button class="btn sm" data-msg="reply" data-mid="' + esc(x.id) + '">💌 Reply</button><button class="btn sm ghost" data-msg="archive" data-mid="' + esc(x.id) + '">🗄️ Done, no reply</button>'
          : '<button class="btn sm" data-msg="reply" data-mid="' + esc(x.id) + '">💌 ' + (x.reply ? 'Update reply' : 'Reply') + '</button><button class="btn sm ghost" data-msg="unarchive" data-mid="' + esc(x.id) + '">📥 Back to Needs you</button>') +
        del + '</div></div>';
    }
    if (it.kind === 'guess' || it.kind === 'wish') {
      var map = it.kind === 'guess' ? VERDICT : WISH, cur = it.kind === 'guess' ? x.verdict : x.status;
      return '<div class="item">' + head + '<span class="tag' + (cur ? ' on' : '') + '">' + (cur ? map[cur] : 'new') + '</span></div>' +
        '<b style="color:var(--brown)">' + (it.kind === 'guess' ? 'Present #' + (it.n || '?') + ': ' : '') + '"' + esc(x.text) + '"</b>' +
        (it.kind === 'guess' ? '<div class="help">Really: ' + esc(it.real || 'deleted gift') + '</div>' : '') +
        '<div class="row2"><label class="help">Note (optional)<input class="field" data-xnote="' + esc(x.id) + '" value="' + esc(x.note || '') + '" placeholder="e.g. haha nice try 😏" maxlength="100"></label>' +
        '<label class="help">Points (optional)<input class="field" data-xpts="' + esc(x.id) + '" type="number" inputmode="numeric" placeholder="0"></label></div>' +
        '<div class="btns">' + Object.keys(map).map(function (k) {
          return '<button class="btn sm ' + (cur === k ? '' : 'ghost') + '" data-reply="' + it.kind + '" data-xid="' + esc(x.id) + '" data-v="' + k + '">' + map[k] + '</button>';
        }).join('') + del + '</div></div>';
    }
    // answer to a question
    var opt = (x.options || [])[x.answer.choice] || {};
    return '<div class="item">' + head + '<span class="tag' + (it.done ? '' : ' on') + '">' + (it.done ? 'seen ✓' : 'new') + '</span></div>' +
      '<div class="help">You asked: ' + esc(K.qText(x)) + '</div>' +
      '<b style="color:var(--brown)">She said: ' + esc(opt.label || '?') + '</b>' + (x.answer.note ? '<div class="msg-text">"' + esc(x.answer.note) + '"</div>' : '') +
      '<div class="btns">' + (!it.done ? '<button class="btn sm" data-aseen="' + esc(x.id) + '">✓ Got it</button>' : '') + '<button class="btn sm ghost" data-goto="ask">❓ Questions</button></div></div>';
  }
  P.inbox = function () {
    var all = fromHer();
    var needs = all.filter(function (i) { return !i.done; }), done = all.filter(function (i) { return i.done; });
    var list = (inboxView === 'inbox' ? needs : done).filter(function (i) { return inboxKind === 'all' || i.kind === inboxKind; });
    var pool = inboxView === 'inbox' ? needs : done;
    var seg = '<div class="seg" role="group">' +
      '<button type="button" data-inboxview="inbox" aria-pressed="' + (inboxView === 'inbox') + '">✋ Needs you' + (needs.length ? ' (' + needs.length + ')' : '') + '</button>' +
      '<button type="button" data-inboxview="archive" aria-pressed="' + (inboxView === 'archive') + '">✓ Done' + (done.length ? ' (' + done.length + ')' : '') + '</button></div>';
    var chips = '<div class="chips">' + KINDS.map(function (k) {
      var n = k[0] === 'all' ? pool.length : pool.filter(function (i) { return i.kind === k[0]; }).length;
      return '<button type="button" data-inboxkind="' + k[0] + '" aria-pressed="' + (inboxKind === k[0]) + '">' + k[1] + (n ? ' ' + n : '') + '</button>';
    }).join('') + '</div>';
    var help = inboxView === 'inbox'
      ? '<p class="help" style="margin:0">Newest first. Once you reply, it moves to Done.</p>'
      : '<p class="help" style="margin:0">Everything you\'ve answered. You can still change a reply.</p>';
    var empty = inboxView === 'inbox' ? '<p class="muted">All caught up 💚 Nothing from her is waiting.</p>' : '<p class="muted">Nothing here yet</p>';
    var selBar = inboxSel
      ? '<div class="sel-bar"><b>' + Object.keys(inboxSel).length + ' selected</b><button class="btn sm ghost" id="isel-all">All</button><button class="btn sm" id="isel-done">✓ Mark done</button><button class="btn sm danger" id="isel-del">🗑️ Delete</button><button class="btn sm ghost" id="isel-x">Cancel</button></div>'
      : '<div class="btns" style="justify-content:flex-end;margin:0"><button class="btn sm ghost" id="isel-on">☑️ Select</button></div>';
    var rows = list.map(function (it) {
      if (!inboxSel) return itemHtml(it);
      var key = it.kind + ':' + it.id;
      return '<div class="sel-wrap' + (inboxSel[key] ? ' on' : '') + '" data-iselrow="' + esc(key) + '"><span class="sel-check">' + (inboxSel[key] ? '✓' : '') + '</span><div class="sel-body">' + itemHtml(it) + '</div></div>';
    });
    lastInboxList = list;
    return '<section class="card stack"><h3>📥 From her</h3>' + seg + chips + help + selBar + (rows.join('') || empty) + '</section>';
  };

  // ---- Questions you ask her (show as a card on her Home page)
  function qList() { var q = DB.state.questions; return ((q && q.length) ? q : (window.QUESTIONS || [])).map(function (x) { return Object.assign({}, x); }); }
  function saveQs(list, msg) { DB.setState({ questions: list }); toast(msg); render(); }
  P.ask = function () {
    var qs = K.questions().slice().reverse(), now = Date.now();
    return '<section class="card stack"><h3>❓ Ask her something</h3><p class="help" style="margin:0">Shows as a big card at the top of her Home page, with buttons to answer. Write {name} for a pet name.</p><div class="form">' +
        '<div class="row2"><label>Emoji<input class="field" id="qa-emoji" value="💭" maxlength="4"></label><span></span></div>' +
        '<label>Question<textarea class="field" id="qa-text" placeholder="e.g. Hey {name}, are you free for a call at 9pm? 📞"></textarea></label>' +
        '<label>Answer buttons (one per line)<textarea class="field" id="qa-opts" placeholder="Yes! 💚\nNot tonight 🥲"></textarea></label>' +
        '<label>What she sees after answering (optional, one per line, same order)<textarea class="field" id="qa-replies" placeholder="Yay! See you at 9 💚\nAww okay, tomorrow then 🥺"></textarea></label>' +
        '<label>Box for her to add a line (empty = no box)<input class="field" id="qa-note" placeholder="e.g. Anything to add? (optional)"></label>' +
        '<label>Hide if she hasn\'t answered by (optional, ' + ZL + ' time)<input class="field" id="qa-until" type="datetime-local"><span class="help sg"></span></label></div>' +
        '<div class="btns"><button class="btn sm pink" id="qa-send">💌 Ask her</button></div></section>' +
      '<section class="card stack"><h3>📋 Your questions</h3>' + (qs.length ? qs.map(function (q) {
        var showing = q.active !== false && (q.answer ? now - q.answer.at < 864e5 : (!q.untilMs || now < q.untilMs));
        return '<div class="item"><div class="item-head"><b>' + esc(q.emoji || '💭') + ' ' + esc(K.qText(q)).slice(0, 140) + '</b><span class="tag' + (q.answer ? ' on' : '') + '">' + (q.answer ? 'answered ✓' : showing ? 'waiting' : 'hidden') + '</span></div>' +
          (q.options || []).map(function (o, i) { var won = q.answer && q.answer.choice === i; return '<div class="q-admin-opt' + (won ? ' won' : '') + '"><span>' + (won ? '👉 ' : '') + esc(o.label) + '</span></div>'; }).join('') +
          (q.answer ? '<div class="help">Answered ' + K.herDateTime(q.answer.at) + (q.answer.note ? ' · "' + esc(q.answer.note) + '"' : '') + '</div>' : (q.untilMs ? '<div class="help">Hides ' + K.herDateTime(q.untilMs) + ' if unanswered</div>' : '')) +
          '<div class="btns">' + (q.active === false ? '<button class="btn sm ghost" data-qshow="' + esc(q.id) + '">👀 Show again</button>' : '<button class="btn sm ghost" data-qhide="' + esc(q.id) + '">🙈 Hide</button>') +
          '<button class="btn sm danger" data-qdel="' + esc(q.id) + '">🗑️</button></div></div>';
      }).join('') : '<p class="muted">No questions yet</p>') + '</section>';
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
        '<div class="btns"><button class="btn sm ghost" id="s-preview">👀 Preview</button><button class="btn sm ghost" id="s-ideas">💡 Ideas</button></div>' +
        '<div class="btns"><button class="btn sm pink" id="s-send">✨ Send surprise</button>' + (sp.active ? '<button class="btn sm ghost" id="s-hide">Hide it</button>' : '') + '</div></section>' +
      '<section class="card stack"><h3>📣 Live status update</h3><p class="help">Replaces the "Right now Chengxuan is…" text for a while, e.g. "Just landed! 🛬".</p><div class="form">' +
        '<label>Status<input class="field" id="o-text" value="' + esc(ovOn ? ov.text : '') + '" placeholder="e.g. Just landed safe! 🛬" maxlength="80"></label>' +
        '<label>Show for<select class="field" id="o-dur"><option value="1">1 hour</option><option value="3" selected>3 hours</option><option value="6">6 hours</option><option value="24">1 day</option><option value="0">Until I clear it</option></select></label></div>' +
        '<p class="help">' + (ovOn ? 'Showing now' + (ov.until ? ' until ' + K.herDateTime(ov.until) : '') : 'Not showing (using the schedule)') + '</p>' +
        '<div class="btns"><button class="btn sm" id="o-save">📣 Show status</button>' + (ovOn ? '<button class="btn sm ghost" id="o-clear">Clear</button>' : '') + '</div></section>' +
      '<section class="card stack"><h3>🏷️ Home page banner</h3><div class="form"><label>Short line at the top of her home page (empty = hidden)<input class="field" id="b-text" value="' + esc(st.banner || '') + '" maxlength="90" placeholder="e.g. Good luck on your exam today! 📚💚"></label></div>' +
        '<div class="btns"><button class="btn sm" id="b-save">💾 Save banner</button></div></section>';
  };

  // ---- surprise helpers: what she sees, ideas, and everything you've sent
  function surprisePreview(sp) {
    K.modal('<div class="help" style="text-align:center;margin:0 0 6px">👀 Preview: this is exactly what she sees</div><div class="em">' + esc(sp.emoji || '💌') + '</div><h3>' + esc(sp.title || 'A surprise for you') + '</h3>' +
      '<p class="desc" style="white-space:pre-wrap">' + esc(sp.text || '') + '</p><p class="muted">From Chengxuan 💚</p>', 'call');
  }
  var SURPRISE_IDEAS = [
    ['🥝', 'Open me, dumpling', 'Just a reminder that somewhere in Singapore, someone is smiling at his phone because of you. That someone is me. 💚'],
    ['🎟️', 'A coupon for you', 'This coupon is good for ONE (1) call where you get to talk about anything for as long as you want, and I just listen. No expiry date. 📞'],
    ['🗺️', 'When I see you…', 'Top 3 things we\'re doing when I see you:\n1. A very long hug\n2. Your favourite food, my treat\n3. 10 Things I Hate About You, finally together 🍿'],
    ['📸', 'Remember this?', 'I was thinking about the day we met and I still can\'t believe how lucky I got. Tell me your favourite memory of us tonight? 🥺'],
    ['🌙', 'For tonight', 'Before you sleep: you are smart, you are so loved, and tomorrow is going to be a good day. Sweet dreams, baby 🌙💚'],
    ['🎁', 'Points rain!', 'Check your points… I might have sent you a few for being the cutest person alive ⭐'],
    ['🍜', 'Dinner date', 'Order your favourite dinner tonight, send me a photo, and I\'ll eat with you on call. Virtual date, my treat next time 🍜']
  ];
  function seenSurprise(id) { var h = DB.her; return h.seenSurprise === id || !!(h.seenSurprises || {})[id]; }
  function surpriseHistory() {
    var log = (DB.state.surpriseLog || []).slice();
    K.scheduled('surprise', true).forEach(function (x) { log.push({ id: x.id, emoji: x.data.emoji, title: x.data.title, text: x.data.text, at: x.at, scheduled: x.at > Date.now() }); });
    var cur = DB.state.surprise; if (cur && cur.id && !log.some(function (x) { return x.id === cur.id; })) log.push(Object.assign({ at: cur.at || 0 }, cur));
    return log.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
  }
  P.surprises = function () {
    var h = surpriseHistory();
    return '<section class="card stack"><h3>📜 Surprises you\'ve sent</h3><p class="help" style="margin:0">Tap 👀 to see one exactly as she did.</p>' +
      (h.length ? h.map(function (x) {
        var st = x.scheduled ? '⏰ scheduled' : seenSurprise(x.id) ? 'opened ✓' : 'not opened yet';
        return '<div class="hist-row"><div><b>' + esc((x.emoji || '💌') + ' ' + (x.title || 'Surprise')) + '</b><p class="help">' + (x.at ? K.herDateTime(x.at) + ' · ' : '') + st + '</p>' +
          (x.text ? '<p class="help" style="white-space:pre-wrap">' + esc(x.text.slice(0, 160)) + (x.text.length > 160 ? '…' : '') + '</p>' : '') + '</div>' +
          '<div class="btns" style="flex-direction:column"><button class="btn sm ghost" data-spv="' + esc(x.id) + '">👀</button><button class="btn sm ghost" data-spcopy="' + esc(x.id) + '">↻ Reuse</button></div></div>';
      }).join('') : '<p class="muted">None yet. Send one from 💌 Messages to her.</p>') + '</section>';
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
        '<label>When (' + ZL + ' time)<input class="field" id="c-at" type="datetime-local"><span class="help sg"></span></label></div>' +
        '<div class="btns"><button class="btn sm" id="c-add">＋ Add countdown</button></div></section>' +
      '<section class="card stack"><h3>Your countdowns</h3>' +
        ((st.countdowns || []).length ? (st.countdowns || []).map(function (c) {
          return '<div class="item-head"><span>' + esc((c.emoji || '⭐') + ' ' + c.label) + '<br><small class="muted">' + esc(K.herDateTime(T.parse(c.at, HZ))) + '</small></span><button class="btn sm danger" data-cdel="' + esc(c.id) + '">🗑️</button></div>';
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

  // ================================================================ POWER TOOLS
  // ---- precise time helpers
  function exact(at) {
    if (!at) return 'never';
    return new Date(at).toLocaleString('en-GB', { timeZone: VZ, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  }
  function dur(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return d ? d + 'd ' + h + 'h' : h ? h + 'h ' + m + 'm' : m ? m + 'm ' + x + 's' : x + 's';
  }
  function agoP(at) { return at ? dur(Date.now() - at) + ' ago' : 'never'; }
  // Her presence: online now / probably away / offline
  function presence() {
    var lv = DB.live || {}, p = lv.presence, now = Date.now();
    var lastAt = Math.max(p ? p.at : 0, DB.her.lastSeen || 0);
    if (p && p.visible && now - p.at < 45000) return { cls: 'on', label: 'Online now', p: p, lastAt: p.at };
    if (p && p.visible && now - p.at < 5 * 60000) return { cls: 'idle', label: 'Probably just put her phone down', p: p, lastAt: p.at };
    return { cls: '', label: lastAt ? 'Offline' : 'Hasn\'t visited yet', p: p, lastAt: lastAt };
  }
  function presenceHtml(big) {
    var s = presence(), p = s.p;
    var line = s.cls === 'on'
      ? 'On <b>' + esc(K.pageName(p.page)) + '</b> · ' + esc(p.device || '') + ' · here for <span class="mono" data-for="' + (p.since || p.start) + '">' + dur(Date.now() - (p.since || p.start)) + '</span>'
      : s.lastAt ? 'Last online <b class="mono" data-ago="' + s.lastAt + '">' + agoP(s.lastAt) + '</b>' + (p ? ' · on ' + esc(K.pageName(p.page)) + ' · ' + esc(p.device || '') : '') : '';
    return '<div class="presence ' + s.cls + '"><span class="dot"></span><div><b>' + s.label + '</b><div class="help" style="margin:2px 0 0">' + line + '</div>' +
      (s.lastAt && s.cls !== 'on' ? '<div class="help mono" style="margin:0">' + exact(s.lastAt) + ' (' + ZL + ')</div>' : '') +
      (big && p ? '<div class="help" style="margin:2px 0 0">Screen ' + esc(p.screen || '?') + ' · ' + esc(p.tz || '') + ' · ' + esc(p.lang || '') + '</div>' : '') + '</div></div>';
  }
  // live tickers: every second
  setInterval(function () {
    panels.querySelectorAll('[data-ago]').forEach(function (el) { el.textContent = agoP(+el.dataset.ago); });
    panels.querySelectorAll('[data-for]').forEach(function (el) { el.textContent = dur(Date.now() - +el.dataset.for); });
    var pr = panels.querySelector('[data-presence]');
    if (pr) { var sig = presence().cls + (DB.live.presence || {}).at; if (pr.dataset.sig !== sig) { pr.dataset.sig = sig; pr.innerHTML = presenceHtml(pr.dataset.presence === 'big'); } }
  }, 1000);

  // ---- 🛰️ Live: where she is, every visit, everything she did
  P.live = function () {
    var lv = DB.live || {}, sess = (lv.sessions || []).slice().reverse(), ev = (lv.events || []).slice().reverse();
    var today = sess.filter(function (x) { return T.dayKey(x.start, HZ) === K.todayKey(); });
    var todayMs = today.reduce(function (a, x) { return a + Math.max(0, (x.end || x.start) - x.start); }, 0);
    var weekMs = sess.filter(function (x) { return Date.now() - x.start < 7 * 864e5; }).reduce(function (a, x) { return a + Math.max(0, (x.end || x.start) - x.start); }, 0);
    var devs = {}; sess.forEach(function (x) { devs[x.d] = (devs[x.d] || 0) + 1; });
    return '<section class="card stack"><h3>🛰️ Right now</h3><div data-presence="big">' + presenceHtml(true) + '</div>' +
        '<div class="stat-grid">' +
          '<div class="stat"><b>' + today.length + '</b><span>visits today</span></div>' +
          '<div class="stat"><b>' + dur(todayMs) + '</b><span>on the site today</span></div>' +
          '<div class="stat"><b>' + dur(weekMs) + '</b><span>last 7 days</span></div>' +
          '<div class="stat"><b>' + (lv.pingSeen ? '✓' : '–') + '</b><span>' + (lv.pingSeen ? 'saw your last ping ' + agoP(lv.pingSeen.at) : 'no ping seen yet') + '</span></div>' +
        '</div>' +
        (Object.keys(devs).length ? '<p class="help" style="margin:0">Devices: ' + Object.keys(devs).map(function (d) { return esc(d) + ' (' + devs[d] + ')'; }).join(', ') + '</p>' : '') +
        '<p class="help" style="margin:0">Updates every 20 seconds while the site is open on her screen. Times are ' + ZL + ' time.</p></section>' +
      '<section class="card stack"><h3>🕒 Visits</h3>' + (sess.length ? '<table class="sess">' + sess.slice(0, 30).map(function (x) {
        var live = x.open && Date.now() - x.end < 45000;
        return '<tr><td class="mono">' + esc(T.fmtDay(x.start, VZ)) + '<br><b>' + T.fmtTime(x.start, VZ) + '</b>' + (live ? ' → <b style="color:#2a9d3a">now</b>' : ' → ' + T.fmtTime(x.end || x.start, VZ)) + '</td>' +
          '<td><b class="mono">' + dur((live ? Date.now() : x.end || x.start) - x.start) + '</b><br><span class="help">' + esc(x.d || '') + '</span></td>' +
          '<td class="help">' + (x.pages || []).map(function (pg) { return esc(K.pageName(pg)); }).join(' → ') + '</td></tr>';
      }).join('') + '</table>' : '<p class="muted">No visits recorded yet. They show up after she opens the site.</p>') + '</section>' +
      '<section class="card stack"><h3>📜 What she did</h3>' + (ev.length ? '<ul class="feed">' + ev.slice(0, 120).map(function (e) {
        return '<li><span>' + esc(e.e || '•') + '</span><span>' + esc(e.t) + '</span><span class="t" title="' + esc(exact(e.at) + (e.d ? ' · ' + e.d : '')) + '">' + esc(T.fmtDayShort(e.at, VZ)) + ' ' + T.fmtTime(e.at, VZ) + '</span></li>';
      }).join('') + '</ul>' : '<p class="muted">Nothing yet. Check-ins, messages, presents, clicker milestones and more show up here.</p>') +
      (ev.length ? '<div class="btns"><button class="btn sm ghost" id="ev-clear">🧹 Clear activity &amp; visits</button></div>' : '') + '</section>';
  };

  // ---- 🥝 Clicker: watch her game, send kiwis, boosts
  P.clicker = function () {
    var c = (DB.live || {}).clicker, st = DB.state, b = st.clickerBoost, boostOn = b && b.until > Date.now();
    var f = K.fmtKiwis || function (n) { return Math.floor(n || 0).toLocaleString(); };
    function fmt(n) { n = Math.max(0, n || 0); if (n < 100 && n % 1) return n.toFixed(1); if (n < 1000) return Math.floor(n).toLocaleString(); var u = ['K', 'M', 'B', 'T', 'Qa'], i = -1; while (n >= 1000 && i < 4) { n /= 1000; i++; } return n.toFixed(n < 10 ? 2 : 1) + u[i]; }
    f = fmt;
    var gifts = (st.clickerGifts || []).slice().reverse();
    return '<section class="card stack"><h3>🥝 Her Kiwi Clicker</h3>' + (c ? '<div class="stat-grid">' +
        '<div class="stat"><b>' + f(c.k) + '</b><span>kiwis now</span></div>' +
        '<div class="stat"><b>' + f(c.kps) + '/s</b><span>kiwis per second</span></div>' +
        '<div class="stat"><b>' + f(c.totalEver || c.total) + '</b><span>grown ever</span></div>' +
        '<div class="stat"><b>' + f(c.clicks) + '</b><span>taps</span></div></div>' +
        '<p class="help" style="margin:0">Helpers: ' + (Object.keys(c.owned || {}).map(function (k) { return ({ bird: '🐦', tree: '🌳', farm: '🚜', bakery: '🧁', factory: '🏭', island: '🏝️', rocket: '🚀', portal: '🌀', love: '💚' }[k] || esc(k)) + ' ×' + c.owned[k]; }).join(', ') || 'none') +
        ' · Upgrades: ' + Object.keys(c.up || {}).length + ' · Trophies: ' + (c.trophies || 0) + ' · Love Seeds: ' + (c.seeds || 0) + ' · Golden kiwis: ' + (c.goldenEver || c.golden || 0) + ' · Saved <span data-ago="' + (c.savedAt || 0) + '">' + agoP(c.savedAt) + '</span></p>' +
        '<a class="btn sm ghost" href="clicker.html" style="text-decoration:none;justify-self:start">👀 Watch her game</a>'
      : '<p class="muted">She hasn\'t played yet. It\'s on her Fun page.</p>') + '</section>' +
      '<section class="card stack"><h3>🎁 Send her kiwis</h3><p class="help" style="margin:0">Pops up next time she opens the game (only once she\'s started playing). Use a minus number to take some away.</p><div class="form">' +
        '<div class="row2"><label>Kiwis<input class="field" id="cg-amt" type="number" inputmode="numeric" placeholder="e.g. 1000"></label><span></span></div>' +
        '<div class="btns">' + [100, 1000, 10000, 100000, 1000000].map(function (n) { return '<button class="btn sm ghost" data-cgquick="' + n + '">+' + f(n) + '</button>'; }).join('') + '</div>' +
        '<label>Note (optional)<input class="field" id="cg-note" maxlength="120" placeholder="e.g. For being the cutest 🥝"></label></div>' +
        '<div class="btns"><button class="btn sm pink" id="cg-send">🎁 Send kiwis</button></div>' +
        (gifts.length ? '<ul class="log">' + gifts.slice(0, 8).map(function (g) {
          var got = c && (c.gifts || []).indexOf(g.id) !== -1;
          return '<li><span>' + (g.amount >= 0 ? '+' : '') + f(Math.abs(g.amount)) + (g.amount < 0 ? ' taken' : '') + (g.note ? ' · ' + esc(g.note) : '') + '<br><small>' + ago(g.at) + '</small></span><span class="amt">' + (got ? 'received ✓' : 'waiting') + '</span></li>';
        }).join('') + '</ul>' : '') + '</section>' +
      '<section class="card stack"><h3>⚡ Kiwi boost</h3><p class="help" style="margin:0">Multiplies everything she makes for a while. She sees a banner.</p>' +
        (boostOn ? '<p><b>' + b.mult + '× on</b> until ' + K.herDateTime(b.until) + ' · "' + esc(b.label || '') + '"</p>' : '') +
        '<div class="form"><div class="row2"><label>Multiplier<select class="field" id="cb-mult">' + [2, 3, 5, 10, 25, 100].map(function (n) { return '<option value="' + n + '">' + n + '×</option>'; }).join('') + '</select></label>' +
        '<label>For how long<select class="field" id="cb-hours"><option value="0.5">30 minutes</option><option value="1" selected>1 hour</option><option value="3">3 hours</option><option value="12">12 hours</option><option value="24">1 day</option><option value="168">1 week</option></select></label></div>' +
        '<label>Banner text<input class="field" id="cb-label" maxlength="60" placeholder="e.g. Movie night bonus 🍿"></label></div>' +
        '<div class="btns"><button class="btn sm" id="cb-on">⚡ Start boost</button>' + (boostOn ? '<button class="btn sm ghost" id="cb-off">Stop boost</button>' : '') + '</div></section>' +
      '<section class="card stack"><h3>🗓️ Weekly restart</h3>' +
        '<label class="switch"><span><b>Back to 0 every Monday at midnight (her time)</b><br><span class="help">Kiwis, helpers, upgrades, seeds, perks and trophies all reset. She sees last week\'s score.</span></span><input type="checkbox" id="ck-weekly"' + (DB.state.clickerWeekly !== false ? ' checked' : '') + '></label>' +
        (c && (c.weeks || []).length ? '<ul class="log">' + c.weeks.slice().reverse().slice(0, 12).map(function (w) { return '<li><span>Week of ' + esc(w.week) + '<br><small>' + w.helpers + ' helpers · ' + f(w.taps) + ' taps · ' + w.trophies + ' trophies</small></span><span class="amt">' + f(w.total) + ' 🥝</span></li>'; }).join('') + '</ul><p class="help" style="margin:0">Best week: ' + f(c.bestWeek || 0) + ' kiwis</p>' : '<p class="help" style="margin:0">Her week-by-week scores show up here after the first Monday.</p>') + '</section>' +
      '<section class="card stack"><h3>🌱 Restart her game</h3><p class="help" style="margin:0">Sets her kiwis, helpers and upgrades back to zero.</p><div class="btns"><button class="btn sm danger" id="cr-go">Restart her game</button></div></section>';
  };

  // ---- 🤖 Auto-replies + quick replies
  var QUICK_DEFAULT = ['I miss you too 🥺💚', 'I love you more 💚', 'Aww baby 🥰', 'Hahaha 😂', 'Call you soon 📞', 'Good night baby 🌙💚', 'So proud of you 🥹', 'You\'re the cutest 🥝'];
  function quickList() { var q = DB.state.quickReplies; return (q && q.length) ? q : QUICK_DEFAULT; }
  P.auto = function () {
    var a = K.autoCfg();
    return '<section class="card stack"><h3>🤖 Auto-replies</h3><p class="help" style="margin:0">When she sends you a message with one of these words, a reply from you appears a few seconds later (with "typing…" dots first). She doesn\'t see that it\'s automatic. The message stays in your inbox so you can still answer properly.</p>' +
        '<label class="switch"><span><b>Auto-replies on</b></span><input type="checkbox" id="ar-on"' + (a.on ? ' checked' : '') + '></label>' +
        '<label class="help">Wait before replying (seconds)<input class="field" id="ar-delay" type="number" min="1" max="120" value="' + esc(a.delay) + '"></label>' +
        '<div id="ar-rules" class="stack">' + (a.rules || []).map(function (r, i) {
          return '<div class="item" data-rule><div class="item-head"><b>Rule ' + (i + 1) + '</b><button class="btn sm danger" data-rdel="' + i + '">🗑️</button></div>' +
            '<label class="help">If her message has any of these words (comma separated)<input class="field" data-rk value="' + esc(r.keys) + '"></label>' +
            '<label class="help">Reply with one of these (separate with | and one is picked at random)<textarea class="field" data-rr>' + esc(r.replies) + '</textarea></label></div>';
        }).join('') + '</div>' +
        '<div class="btns"><button class="btn sm ghost" id="ar-add">＋ Add a rule</button></div>' +
        '<label class="switch"><span><b>Reply even when no words match</b><br><span class="help">Uses the lines below</span></span><input type="checkbox" id="ar-fb"' + (a.fallbackOn ? ' checked' : '') + '></label>' +
        '<label class="help">Reply for everything else (separate with |)<textarea class="field" id="ar-fbt">' + esc(a.fallback) + '</textarea></label>' +
        '<div class="btns"><button class="btn sm" id="ar-save">💾 Save auto-replies</button><button class="btn sm ghost" id="ar-reset">Back to the original</button></div>' +
        '<label class="help">Try it: type a message like she would<input class="field" id="ar-test" placeholder="e.g. I miss you so much"></label><div class="help" id="ar-test-out"></div></section>' +
      '<section class="card stack"><h3>⚡ Quick replies</h3><p class="help" style="margin:0">One-tap buttons under each of her messages in your inbox. One per line.</p>' +
        '<textarea class="field" id="qr-list" style="min-height:160px">' + esc(quickList().join('\n')) + '</textarea>' +
        '<div class="btns"><button class="btn sm" id="qr-save">💾 Save quick replies</button></div></section>';
  };

  // ---- 🎛️ Control: ping, refresh, switches, pet names, her numbers
  var FEATURES = [['countdown', '⏳ Big countdown (Home)'], ['checkin', '✅ Daily check-in (Home)'], ['quote', '💬 Quote (Home)'], ['points', '⭐ Points card (Home)'],
    ['miss', '🥺 "I miss you" button'], ['clicker', '🥝 Kiwi Clicker'], ['messages', '💌 Messages for him'], ['movies', '🍿 Movie list'], ['notes', '📝 Love note jar'],
    ['game', '🧺 Catch the kiwis'], ['guesses', '🤔 Guess a present'], ['wishes', '💭 Wish list']];
  P.control = function () {
    var st = DB.state, p = st.ping, seen = (DB.live || {}).pingSeen, off = st.hide || {}, pets = (st.petNames && st.petNames.length) ? st.petNames : K.PET_DEFAULT;
    return '<section class="card stack"><h3>📲 Ping her</h3><p class="help" style="margin:0">Pops up on her screen straight away if she has the site open (or the next time she opens it, within 12 hours).</p>' +
        '<div data-presence="small">' + presenceHtml(false) + '</div>' +
        '<div class="quick">' + [['💚', 'Thinking of you'], ['🥺', 'I miss you'], ['📞', 'Call me?'], ['😘', 'Mwah!'], ['🌙', 'Good night baby'], ['☀️', 'Good morning baby']].map(function (q) {
          return '<button class="btn sm ghost" data-ping="' + esc(q[0]) + '|' + esc(q[1]) + '">' + q[0] + ' ' + esc(q[1]) + '</button>';
        }).join('') + '</div>' +
        '<div class="form"><div class="row2"><label>Emoji<input class="field" id="pg-emoji" value="💚" maxlength="4"></label><span></span></div>' +
        '<label>Title<input class="field" id="pg-title" maxlength="60" placeholder="e.g. Hey you 👀"></label>' +
        '<label>Message (optional)<textarea class="field" id="pg-text" placeholder="Anything…"></textarea></label></div>' +
        '<div class="btns"><button class="btn sm pink" id="pg-send">📲 Send ping</button></div>' +
        (p ? '<p class="help" style="margin:0">Last ping: ' + esc((p.emoji || '') + ' ' + (p.title || '')) + ' · sent ' + agoP(p.at) + ' · ' + (seen && seen.id === p.id ? '<b>seen ✓ ' + agoP(seen.at) + '</b>' : 'not seen yet') + '</p>' : '') + '</section>' +
      '<section class="card stack"><h3>🔄 Refresh her site</h3><p class="help" style="margin:0">Reloads every open copy of her site right now (it waits if she\'s typing). Use it if something looks stuck.</p>' +
        '<div class="btns"><button class="btn sm" id="rl-go">🔄 Refresh her site now</button></div>' + (st.reloadAt ? '<p class="help" style="margin:0">Last refresh sent ' + agoP(st.reloadAt) + '</p>' : '') + '</section>' +
      '<section class="card stack"><h3>🎚️ What she can see</h3><p class="help" style="margin:0">Untick to hide a part of her site. You still see it, faded with a "Hidden from her" label.</p><div class="switches">' +
        FEATURES.map(function (f) { return '<label class="switch"><span>' + f[1] + '</span><input type="checkbox" data-feat="' + f[0] + '"' + (off[f[0]] ? '' : ' checked') + '></label>'; }).join('') + '</div></section>' +
      '<section class="card stack"><h3>💕 Pet names</h3><p class="help" style="margin:0">What the site calls her. Bigger number = shows up more often. Empty name = removed.</p>' +
        '<div id="pet-rows" class="stack">' + pets.concat([['', 10], ['', 10]]).map(function (p2) {
          return '<div class="row2" data-pet><input class="field" data-pn value="' + esc(p2[0]) + '" placeholder="new name"><input class="field" data-pw type="number" min="0" value="' + esc(p2[1]) + '"></div>';
        }).join('') + '</div>' +
        '<div class="btns"><button class="btn sm" id="pet-save">💾 Save pet names</button><button class="btn sm ghost" id="pet-reset">Back to the original</button></div></section>' +
      '<section class="card stack"><h3>🔢 Her numbers</h3><div class="form">' +
        '<div class="row2"><label>"I miss you" count<input class="field" id="hn-miss" type="number" min="0" value="' + (DB.her.missCount || 0) + '"></label>' +
        '<label>Catch-the-kiwis best<input class="field" id="hn-game" type="number" min="0" value="' + (DB.her.gameBest || 0) + '"></label></div></div>' +
        '<div class="btns"><button class="btn sm" id="hn-save">💾 Save numbers</button></div></section>';
  };

  // ---- 💾 Data: backup, restore, raw editor
  var rawWhich = 'state';
  P.data = function () {
    var obj = rawWhich === 'state' ? DB.state : rawWhich === 'her' ? DB.her : DB.live;
    return '<section class="card stack"><h3>💾 Backup</h3><p class="help" style="margin:0">Download everything (points, gifts, messages, check-ins, clicker…) as one file. Photos aren\'t included.</p>' +
        '<div class="btns"><button class="btn sm" id="bk-down">⬇️ Download backup</button>' +
        '<label class="btn sm ghost" style="cursor:pointer">⬆️ Restore from backup<input type="file" id="bk-file" accept=".json,application/json" hidden></label></div></section>' +
      '<section class="card stack"><h3>🧬 Raw data editor</h3><p class="help" style="margin:0">For anything the other tabs can\'t do. Be careful: what you save here goes straight to her site.</p>' +
        '<div class="seg" role="group">' + [['state', 'Site settings'], ['her', 'Her data'], ['live', 'Live data']].map(function (x) {
          return '<button type="button" data-raw="' + x[0] + '" aria-pressed="' + (rawWhich === x[0]) + '">' + x[1] + '</button>';
        }).join('') + '</div>' +
        '<textarea class="field json" id="raw-json" spellcheck="false">' + esc(JSON.stringify(obj, null, 2)) + '</textarea>' +
        '<div class="btns"><button class="btn sm" id="raw-save">💾 Save changes</button><button class="btn sm ghost" id="raw-reload">↺ Reload</button></div></section>';
  };

  function download(name, text) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function readRules() {
    return [].slice.call(panels.querySelectorAll('[data-rule]')).map(function (r) { return { keys: r.querySelector('[data-rk]').value.trim(), replies: r.querySelector('[data-rr]').value.trim() }; })
      .filter(function (r) { return r.keys && r.replies; });
  }
  function autoFromForm() {
    return { on: $('#ar-on').checked, delay: Math.min(120, Math.max(1, +$('#ar-delay').value || 6)), rules: readRules(), fallbackOn: $('#ar-fb').checked, fallback: $('#ar-fbt').value.trim() };
  }

  // power-tool buttons; returns true if it handled the click
  function powerClick(b, d, id) {
    if (id === 'isel-on') { inboxSel = {}; render(); return true; }
    if (id === 'isel-x') { inboxSel = null; render(); return true; }
    if (id === 'isel-all') { lastInboxList.forEach(function (it) { inboxSel[it.kind + ':' + it.id] = true; }); render(); return true; }
    if (id === 'isel-done' || id === 'isel-del') {
      var keys = Object.keys(inboxSel || {}); if (!keys.length) { toast('Tap items to select them'); return true; }
      var by = { msg: [], guess: [], wish: [], answer: [] }; keys.forEach(function (k) { var i = k.indexOf(':'); by[k.slice(0, i)].push(k.slice(i + 1)); });
      var apply = function () {
        var her = DB.her, patch = {};
        if (id === 'isel-del') {
          if (by.msg.length) patch.messages = (her.messages || []).filter(function (m) { return by.msg.indexOf(m.id) === -1; });
          if (by.guess.length) patch.guesses = (her.guesses || []).filter(function (x) { return by.guess.indexOf(x.id) === -1; });
          if (by.wish.length) patch.wishes = (her.wishes || []).filter(function (x) { return by.wish.indexOf(x.id) === -1; });
          if (by.answer.length) { var an = Object.assign({}, her.answers || {}); by.answer.forEach(function (q) { delete an[q]; }); patch.answers = an; }
        } else {
          if (by.msg.length) patch.messages = (her.messages || []).map(function (m) { return by.msg.indexOf(m.id) !== -1 ? Object.assign({}, m, { read: true, archived: true }) : m; });
          if (by.wish.length) patch.wishes = (her.wishes || []).map(function (x) { return by.wish.indexOf(x.id) !== -1 && !x.status ? Object.assign({}, x, { status: 'noted' }) : x; });
          if (by.answer.length) { var sa = Object.assign({}, DB.state.seenAnswers || {}); K.questions().forEach(function (q) { if (by.answer.indexOf(q.id) !== -1 && q.answer) sa[q.id] = q.answer.at; }); DB.setState({ seenAnswers: sa }); }
        }
        if (Object.keys(patch).length) DB.setHer(patch);
        toast((id === 'isel-del' ? 'Deleted ' : 'Marked done: ') + keys.length + (by.guess.length && id === 'isel-done' ? ' (guesses need a verdict)' : ''));
        inboxSel = null; render();
      };
      if (id === 'isel-del') K.confirm({ emoji: '🗑️', title: 'Delete ' + keys.length + ' item' + (keys.length > 1 ? 's' : '') + '?', text: 'They disappear for both of you. (You can undo it in 🕘 History.)', yes: 'Delete', danger: true }).then(function (ok) { if (ok) apply(); });
      else apply();
      return true;
    }
    if (id === 'ev-clear') {
      K.confirm({ emoji: '🧹', title: 'Clear her activity and visits?', yes: 'Clear', danger: true }).then(function (ok) { if (ok) DB.setLive({ events: [], sessions: [] }).then(function () { toast('Cleared'); render(); }); });
      return true;
    }
    // clicker
    if (d.cgquick) { $('#cg-amt').value = d.cgquick; return true; }
    if (id === 'cg-send') {
      var amt = Math.round(+$('#cg-amt').value || 0); if (!amt) { toast('Type how many kiwis'); return true; }
      DB.setState({ clickerGifts: (DB.state.clickerGifts || []).concat([{ id: 'cg' + uid(), amount: amt, note: val('cg-note'), at: Date.now() }]).slice(-50) });
      toast(amt > 0 ? 'Kiwis sent 🎁🥝' : 'Kiwis taken 😝'); render(); return true;
    }
    if (id === 'cb-on') {
      var h = +$('#cb-hours').value || 1;
      DB.setState({ clickerBoost: { mult: +$('#cb-mult').value || 2, until: Date.now() + h * 3600e3, label: val('cb-label') || 'Boost from Chengxuan', at: Date.now() } });
      toast('Boost on ⚡'); render(); return true;
    }
    if (id === 'cb-off') { DB.setState({ clickerBoost: null }); toast('Boost stopped'); render(); return true; }
    if (id === 'cr-go') {
      K.confirm({ emoji: '🌱', title: 'Restart her Kiwi Clicker?', text: 'Her kiwis, helpers and upgrades go back to zero.', yes: 'Restart', danger: true }).then(function (ok) {
        if (ok) { DB.setState({ clickerReset: Date.now() }); toast('Her game restarts next time it opens'); render(); }
      });
      return true;
    }
    // auto-replies
    if (id === 'ar-add') {
      var box = $('#ar-rules'), n = box.querySelectorAll('[data-rule]').length + 1, div = document.createElement('div');
      div.className = 'item'; div.setAttribute('data-rule', '');
      div.innerHTML = '<div class="item-head"><b>Rule ' + n + '</b><button class="btn sm danger" data-rdel="x">🗑️</button></div><label class="help">If her message has any of these words<input class="field" data-rk placeholder="e.g. hungry, food"></label><label class="help">Reply with one of these (separate with |)<textarea class="field" data-rr placeholder="Go eat something yummy 🍜 | Feed my baby!"></textarea></label>';
      box.appendChild(div); div.querySelector('[data-rk]').focus(); return true;
    }
    if (d.rdel !== undefined) { var it = b.closest('[data-rule]'); if (it) it.remove(); return true; }
    if (id === 'ar-save') { DB.setState({ autoReply: autoFromForm() }); toast('Auto-replies saved 🤖'); render(); return true; }
    if (id === 'ar-reset') { DB.setState({ autoReply: null }); toast('Back to the original auto-replies'); render(); return true; }
    if (id === 'qr-save') { DB.setState({ quickReplies: $('#qr-list').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean) }); toast('Quick replies saved ⚡'); render(); return true; }
    // control
    if (d.ping || id === 'pg-send') {
      var parts = d.ping ? d.ping.split('|') : [val('pg-emoji') || '💚', val('pg-title') || 'Chengxuan says…'];
      var ping = { id: 'p' + uid(), emoji: parts[0], title: parts[1], text: d.ping ? '' : val('pg-text'), at: Date.now() };
      DB.setState({ ping: ping }); toast('Ping sent 📲'); render(); return true;
    }
    if (id === 'rl-go') { DB.setState({ reloadAt: Date.now() }); toast('Her site will refresh in a few seconds 🔄'); render(); return true; }
    if (id === 'pet-save' || id === 'pet-reset') {
      var pets = id === 'pet-reset' ? null : [].slice.call(panels.querySelectorAll('[data-pet]')).map(function (r) { return [r.querySelector('[data-pn]').value.trim(), Math.max(0, +r.querySelector('[data-pw]').value || 0)]; }).filter(function (p) { return p[0] && p[1] > 0; });
      if (pets && !pets.length) { toast('Keep at least one name'); return true; }
      DB.setState({ petNames: pets }); toast('Pet names saved 💕'); render(); return true;
    }
    if (id === 'hn-save') { DB.setHer({ missCount: Math.max(0, Math.round(+val('hn-miss') || 0)), gameBest: Math.max(0, Math.round(+val('hn-game') || 0)) }); toast('Saved'); render(); return true; }
    // data
    if (id === 'bk-down') {
      download('kiwi-corner-backup-' + T.dayKey(Date.now(), HZ) + '.json', JSON.stringify({ app: 'kiwi-corner', exportedAt: Date.now(), state: DB.state, her: DB.her, live: DB.live }, null, 2));
      toast('Backup downloaded ⬇️'); return true;
    }
    if (d.raw) { rawWhich = d.raw; render(); return true; }
    if (id === 'raw-reload') { render(); return true; }
    if (id === 'raw-save') {
      var obj; try { obj = JSON.parse($('#raw-json').value); } catch (x) { toast('That isn\'t valid JSON: ' + x.message); return true; }
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { toast('It has to be an object { … }'); return true; }
      K.confirm({ emoji: '🧬', title: 'Save raw changes?', text: 'This writes straight to her site.', yes: 'Save', danger: true }).then(function (ok) {
        if (!ok) return;
        (rawWhich === 'state' ? DB.setState(obj) : rawWhich === 'her' ? DB.setHer(obj) : DB.setLive(obj)).then(function () { toast('Saved 🧬'); render(); });
      });
      return true;
    }
    return false;
  }
  // power-tool inputs (switches, test box, restore file)
  panels.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.feat) {
      var off = Object.assign({}, DB.state.hide || {}); if (t.checked) delete off[t.dataset.feat]; else off[t.dataset.feat] = true;
      DB.setState({ hide: off }); toast(t.checked ? 'Showing it again 👀' : 'Hidden from her 🙈'); return;
    }
    if (t.id === 'bk-file' && t.files[0]) {
      var rd = new FileReader();
      rd.onload = function () {
        var j; try { j = JSON.parse(rd.result); } catch (x) { toast('That file isn\'t a backup'); return; }
        if (!j || j.app !== 'kiwi-corner' || !j.state || !j.her) { toast('That file isn\'t a Kiwi Corner backup'); return; }
        K.confirm({ emoji: '⬆️', title: 'Restore this backup?', text: 'From ' + K.herDateTime(j.exportedAt) + '. Everything on her site now gets replaced.', yes: 'Restore', danger: true, typeWord: 'RESTORE' }).then(function (ok) {
          if (!ok) return;
          Promise.all([DB.setState(j.state), DB.setHer(j.her), j.live ? DB.setLive(j.live) : null]).then(function () { toast('Restored ⬆️'); render(); });
        });
      };
      rd.readAsText(t.files[0]); t.value = '';
    }
  });
  panels.addEventListener('input', function (e) {
    if (e.target.id !== 'ar-test') return;
    var saved = DB.state.autoReply; DB.state.autoReply = autoFromForm();   // test with what's on screen (not saved)
    var r = K.autoReplyFor(e.target.value); DB.state.autoReply = saved;
    $('#ar-test-out').textContent = e.target.value ? (r ? '🤖 Would reply: "' + r + '"' : 'No auto-reply for that one') : '';
  });

  // ================================================================ MORE POWER: schedule, notifications, history, theme, screen, devices, search
  function dtInput(id, label) {
    return '<label>' + label + ' (' + ZL + ' time)<input class="field" id="' + id + '" type="datetime-local"><span class="help sg"></span></label>';
  }
  function parseDt(v) { try { return v ? T.parse(v.replace(' ', 'T').slice(0, 16), VZ) : 0; } catch (e) { return 0; } }

  // ---- ⏰ Schedule
  var SCHED_TYPES = [['ping', '📲 Ping'], ['surprise', '💌 Surprise'], ['points', '⭐ Points'], ['kiwis', '🥝 Clicker kiwis'], ['question', '❓ Question'], ['banner', '🏷️ Banner'], ['theme', '🎨 Theme']];
  var schedType = 'ping';
  function schedFields(t) {
    if (t === 'ping') return '<div class="row2"><label>Emoji<input class="field" id="sc-emoji" value="💚" maxlength="4"></label><span></span></div><label>Title<input class="field" id="sc-title" maxlength="60" placeholder="e.g. Good morning baby ☀️"></label><label>Message (optional)<textarea class="field" id="sc-text"></textarea></label>';
    if (t === 'surprise') return '<div class="row2"><label>Emoji<input class="field" id="sc-emoji" value="💌" maxlength="4"></label><span></span></div><label>Title<input class="field" id="sc-title" placeholder="e.g. Open me 🥰"></label><label>Message<textarea class="field" id="sc-text"></textarea></label>';
    if (t === 'points') return '<div class="row2"><label>Points (minus to take away)<input class="field" id="sc-amt" type="number" inputmode="numeric" placeholder="e.g. 20"></label><span></span></div><label>Reason (she sees it)<input class="field" id="sc-reason" maxlength="80" placeholder="e.g. Good luck on your exam! 📚"></label>';
    if (t === 'kiwis') return '<div class="row2"><label>Kiwis<input class="field" id="sc-amt" type="number" inputmode="numeric" placeholder="e.g. 5000"></label><span></span></div><label>Note (optional)<input class="field" id="sc-reason" maxlength="120"></label>';
    if (t === 'question') return '<div class="row2"><label>Emoji<input class="field" id="sc-emoji" value="💭" maxlength="4"></label><span></span></div><label>Question ({name} = pet name)<textarea class="field" id="sc-text"></textarea></label><label>Answer buttons (one per line)<textarea class="field" id="sc-opts" placeholder="Yes! 💚\nNot today 🥲"></textarea></label><label>Box for her to add a line (optional)<input class="field" id="sc-note"></label>';
    if (t === 'banner') return '<label>Banner text<input class="field" id="sc-text" maxlength="90" placeholder="e.g. Happy Friday baby! 🎉"></label><label>Show for (hours, 0 = until changed)<input class="field" id="sc-hours" type="number" min="0" value="24"></label>';
    if (t === 'theme') return '<label>Theme<select class="field" id="sc-theme">' + K.THEMES.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join('') + '</select></label>';
    return '';
  }
  function schedSummary(s) {
    var d = s.data || {};
    return { ping: '📲 ' + (d.emoji || '') + ' ' + (d.title || ''), surprise: '💌 ' + (d.title || 'Surprise'), points: '⭐ ' + (d.amt > 0 ? '+' : '') + d.amt + ' points · ' + (d.reason || ''),
      kiwis: '🥝 ' + d.amount + ' kiwis' + (d.note ? ' · ' + d.note : ''), question: '❓ ' + (d.text || '').slice(0, 80), banner: '🏷️ ' + (d.text || ''), theme: '🎨 ' + ((K.THEMES.find(function (x) { return x[0] === d.theme; }) || [0, d.theme])[1]) }[s.type] || s.type;
  }
  P.schedule = function () {
    var all = K.scheduled(null, true), now = Date.now();
    var up = all.filter(function (s) { return s.at > now; }), past = all.filter(function (s) { return s.at <= now; }).reverse();
    return '<section class="card stack"><h3>⏰ Schedule something</h3><p class="help" style="margin:0">Write it now, it goes out by itself at the time you pick, even while you sleep. If her site is open it appears within ~20 seconds; otherwise the next time she opens it.</p>' +
        '<div class="chips">' + SCHED_TYPES.map(function (t) { return '<button type="button" data-schedtype="' + t[0] + '" aria-pressed="' + (schedType === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
        '<div class="form">' + schedFields(schedType) + dtInput('sc-at', 'Send at') + '</div>' +
        '<div class="quick">' + [['in 1 hour', 1], ['her 7:30 AM tomorrow', 'm'], ['her 9 PM tonight', 'n']].map(function (q) { return '<button class="btn sm ghost" data-schedquick="' + q[1] + '">' + q[0] + '</button>'; }).join('') + '</div>' +
        '<div class="btns"><button class="btn sm pink" id="sc-add">⏰ Schedule it</button></div></section>' +
      '<section class="card stack"><h3>📅 Coming up</h3>' + (up.length ? up.map(function (s) {
        return '<div class="hist-row"><div><b>' + esc(schedSummary(s)) + '</b><p class="help">' + K.herDateTime(s.at) + ' · her time ' + T.fmtDay(s.at, HZ) + ' ' + T.fmtTime(s.at, HZ) + ' · in ' + dur(s.at - now) + '</p></div>' +
          '<div class="btns"><button class="btn sm ghost" data-schednow="' + esc(s.id) + '">Send now</button><button class="btn sm danger" data-scheddel="' + esc(s.id) + '">🗑️</button></div></div>';
      }).join('') : '<p class="muted">Nothing scheduled</p>') + '</section>' +
      (past.length ? '<section class="card stack"><h3>✓ Already sent</h3>' + past.slice(0, 15).map(function (s) {
        return '<div class="hist-row"><div><b>' + esc(schedSummary(s)) + '</b><p class="help">' + K.herDateTime(s.at) + '</p></div><button class="btn sm danger" data-scheddel="' + esc(s.id) + '">🗑️</button></div>';
      }).join('') + '<p class="help" style="margin:0">Deleting a sent one takes it back (e.g. its points).</p></section>' : '');
  };

  // ---- 🔔 Notifications to your phone (ntfy)
  P.notify = function () {
    var c = K.notifyCfg(), ev = c.events || {};
    var KINDS = [['message', '💌 She sends you a message'], ['online', '🟢 She opens the site'], ['checkin', '✅ She checks in'], ['answer', '❓ She answers a question'], ['wish', '💭 Guesses and wishes'], ['gift', '🎁 She opens or unlocks a present'], ['photo', '📸 She sends a selfie'], ['miss', '🥺 She presses "I miss you"'], ['movie', '🍿 Movie list changes'], ['clicker', '🥝 Clicker milestones']];
    return '<section class="card stack"><h3>🔔 Kiwi Corner notifications</h3><p class="help" style="margin:0">Real notifications from Kiwi Corner itself, on each phone or laptop you turn them on for. You get one when she messages, checks in, answers, wishes, opens a present, sends a selfie or opens the site. She gets one for your chat messages, pings, surprises, points, questions, photos and scheduled things.</p>' +
        '<p><b>This device: ' + ({ on: '🔔 on', off: 'off', denied: 'blocked in settings', 'needs-app': 'add to home screen first', unsupported: 'not supported here' }[K.pushState()]) + '</b></p>' +
        (K.pushState() === 'off' ? '<div class="btns"><button class="btn sm pink" id="push-on">🔔 Turn on for this device</button></div>' : '') +
        (K.pushState() === 'needs-app' ? '<div class="btns"><button class="btn sm" id="push-a2hs">📱 Add to home screen</button></div>' : '') +
        '<p class="help" style="margin:0">She turns hers on from the 🔔 card on her Home page (or her 🌸 menu). With these on, you don\'t need ntfy anymore.</p></section>' +
      '<section class="card stack"><h3>📲 ntfy (optional, older way)</h3>' +
        '<p class="help" style="margin:0">Uses the free <b>ntfy</b> app. Her site sends a notification to a private channel only you know.</p>' +
        '<ol class="steps"><li>Install <b>ntfy</b> from the App Store or Google Play.</li><li>Tap <b>＋</b>, then subscribe to this channel:<br><b class="mono" style="user-select:all">' + esc(c.topic || '(press "Make my channel" first)') + '</b></li><li>Turn it on below and press <b>Send a test</b>.</li></ol>' +
        '<div class="btns"><button class="btn sm ghost" id="nt-topic">' + (c.topic ? '🔁 Make a new channel' : '✨ Make my channel') + '</button>' + (c.topic ? '<button class="btn sm ghost" id="nt-copy">📋 Copy channel</button>' : '') + '</div>' +
        '<label class="switch"><span><b>Notifications on</b></span><input type="checkbox" id="nt-on"' + (c.on ? ' checked' : '') + '></label>' +
        '<div class="switches">' + KINDS.map(function (k) { return '<label class="switch"><span>' + k[1] + '</span><input type="checkbox" data-ntev="' + k[0] + '"' + (ev[k[0]] ? ' checked' : '') + '></label>'; }).join('') + '</div>' +
        '<label class="switch"><span><b>Include her message text</b><br><span class="help">Off = just "Sent you a message (12 words)". On = the words go through ntfy\'s servers.</span></span><input type="checkbox" id="nt-text"' + (c.withText ? ' checked' : '') + '></label>' +
        '<div class="btns"><button class="btn sm" id="nt-save">💾 Save</button><button class="btn sm ghost" id="nt-test">📲 Send a test</button></div></section>';
  };

  // ---- 🕘 History + undo (every change made from this admin page, kept on this device)
  var HKEY = 'kiwi-admin-history', pendingLabel = [];
  function hist() { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) { return []; } }
  function saveHist(h) {
    while (h.length) { try { localStorage.setItem(HKEY, JSON.stringify(h)); return; } catch (e) { h = h.slice(Math.ceil(h.length / 4)); } }
    try { localStorage.removeItem(HKEY); } catch (e) { /* */ }
  }
  function wrap(name, doc, getter) {
    var orig = DB[name];
    DB[name] = function (patch) {
      if (!wrap.off && patch && typeof patch === 'object') {
        var cur = getter() || {}, before = {};
        Object.keys(patch).forEach(function (k) { before[k] = cur[k] === undefined ? null : JSON.parse(JSON.stringify(cur[k])); });
        var keys = Object.keys(patch).filter(function (k) { return JSON.stringify(before[k]) !== JSON.stringify(patch[k]); });
        if (keys.length && !(doc === 'live' && keys.every(function (k) { return /^(adminDevices|watching)$/.test(k); }))) {
          var b2 = {}; keys.forEach(function (k) { b2[k] = before[k]; });
          var e = { id: uid(), at: Date.now(), doc: doc, keys: keys, before: b2, label: '' };
          var h = hist(); h.push(e); saveHist(h.slice(-80)); pendingLabel.push(e.id);
          setTimeout(function () { pendingLabel = pendingLabel.filter(function (x) { return x !== e.id; }); }, 1500);
        }
      }
      return orig.apply(DB, arguments);
    };
  }
  wrap('setState', 'state', function () { return DB.state; });
  wrap('setHer', 'her', function () { return DB.her; });
  wrap('setLive', 'live', function () { return DB.live; });
  // the toast right after a change becomes its label ("+10 points sent 💚")
  var toast0 = toast;
  toast = function (msg) {
    if (pendingLabel.length) { var h = hist(); h.forEach(function (e) { if (pendingLabel.indexOf(e.id) !== -1 && !e.label) e.label = String(msg); }); saveHist(h); pendingLabel = []; }
    toast0(msg);
  };
  var DOCNAME = { state: 'Site settings', her: 'Her data', live: 'Live data' };
  P.history = function () {
    var h = hist().slice().reverse();
    return '<section class="card stack"><h3>🕘 History</h3><p class="help" style="margin:0">Every change you made from admin on this device (last 80). Undo puts those things back to how they were just before.</p>' +
      (h.length ? h.map(function (e) {
        return '<div class="hist-row"><div><b>' + esc(e.label || 'Changed ' + e.keys.join(', ')) + '</b><p class="help">' + esc(T.fmtDayShort(e.at, VZ) + ' ' + T.fmtTime(e.at, VZ)) + ' · ' + agoP(e.at) + ' · ' + DOCNAME[e.doc] + ': ' + esc(e.keys.join(', ')) + (e.undone ? ' · <b>undone</b>' : '') + '</p></div>' +
          '<button class="btn sm ghost" data-undo="' + esc(e.id) + '">↶ Undo</button></div>';
      }).join('') + '<div class="btns"><button class="btn sm ghost" id="hist-clear">Clear history</button></div>' : '<p class="muted">No changes yet</p>') + '</section>';
  };

  // ---- 🎨 Theme
  P.theme = function () {
    var st = DB.state, cur = K.adminTheme(), up = K.scheduled('theme', true).filter(function (s) { return s.at > Date.now(); });
    return '<section class="card stack"><h3>🎨 Her site\'s theme</h3><p class="help" style="margin:0">Colours, a little hat on the kiwi, and things floating down the screen.</p>' +
        '<div class="theme-pick">' + K.THEMES.map(function (t) { return '<button type="button" data-settheme="' + t[0] + '" aria-pressed="' + (cur === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
        '<label class="switch"><span><b>Let her pick her own theme</b><br><span class="help">Adds a theme picker to her 🌸 menu. Her pick wins over yours.</span></span><input type="checkbox" id="th-choice"' + (st.themeChoice ? ' checked' : '') + '></label>' +
        (st.themeChoice && DB.her.theme ? '<p class="help" style="margin:0">She picked: ' + esc((K.THEMES.find(function (x) { return x[0] === DB.her.theme; }) || [0, DB.her.theme])[1]) + '</p>' : '') +
        (up.length ? '<p class="help" style="margin:0">Scheduled: ' + up.map(function (s) { return esc(schedSummary(s)) + ' on ' + K.herDateTime(s.at); }).join(', ') + ' (see ⏰ Schedule)</p>' : '<p class="help" style="margin:0">Tip: schedule a theme (e.g. 🎄 on Dec 24) in ✍️ Write → ⏰ Schedule.</p>') + '</section>';
  };

  // ---- 📱 Her screen (live mirror)
  var watchTimer = null, mirrorPage = '', mirrorFrame = null;
  P.screen = function () {
    return '<section class="card stack"><h3>📱 Her screen</h3><div data-presence="small">' + presenceHtml(false) + '</div>' +
      '<p class="help" style="margin:0">While this tab is open, her site shares where she is and what she taps (every ~1.5 s). It shows your copy of that page scrolled to where she is. It never shows what she types until she sends it.</p>' +
      '<div class="mirror-wrap" id="mirror"><p class="muted">Waiting for her screen… (she needs to have the site open)</p></div></section>';
  };
  function drawMirror() {
    var box = $('#mirror'); if (!box || current !== 'screen') return;
    var sc = (DB.live || {}).screen, pr = presence();
    if (!sc || Date.now() - (sc.at || 0) > 60000 || pr.cls !== 'on') {
      if (!box.querySelector('.muted')) { box.innerHTML = '<p class="muted">Waiting for her screen… (she needs to have the site open)</p>'; mirrorPage = ''; mirrorFrame = null; }
      return;
    }
    var W = Math.min(300, panels.clientWidth - 60), scale = W / sc.vw, H = Math.round(sc.vh * scale);
    var file = { home: 'index.html', timers: 'countdowns.html', week: 'schedule.html', gifts: 'gifts.html', fun: 'fun.html', clicker: 'clicker.html' }[sc.page] || 'index.html';
    if (mirrorPage !== file || !mirrorFrame) {
      mirrorPage = file;
      box.innerHTML = '<div class="help" id="mirror-cap"></div><div class="phone" style="width:' + W + 'px;height:' + H + 'px"><iframe id="mirror-frame" src="' + file + '?mirror=1" style="width:' + sc.vw + 'px;height:' + sc.vh + 'px;transform:scale(' + scale + ')"></iframe><div class="cover" id="mirror-cover"></div></div>';
      mirrorFrame = $('#mirror-frame');
      mirrorFrame.addEventListener('load', function () { mirrorFrame.dataset.loaded = '1'; scrollMirror(); });
    }
    scrollMirror();
    var cover = $('#mirror-cover');
    cover.innerHTML = (sc.typing ? '<div class="typing-mirror">✍️ typing in "' + esc(sc.typing) + '"…</div>' : '') + (sc.modal ? '<div class="modal-mirror">' + esc(sc.modal) + '</div>' : '');
    if (sc.tap && Date.now() - sc.tap.at < 4000 && cover.dataset.tap !== String(sc.tap.at)) {
      cover.dataset.tap = sc.tap.at;
      var d = document.createElement('div'); d.className = 'tapdot'; d.style.left = (sc.tap.x * 100) + '%'; d.style.top = (sc.tap.y * 100) + '%'; cover.appendChild(d);
    }
    $('#mirror-cap').innerHTML = '<b>' + esc(K.pageName(sc.page)) + '</b> · scrolled ' + Math.round(sc.sy / Math.max(1, sc.sh - sc.vh) * 100 || 0) + '% · updated ' + agoP(sc.at) +
      (sc.tap ? '<br>Last tap: "' + esc(sc.tap.label || '?') + '" ' + agoP(sc.tap.at) : '');
  }
  function scrollMirror() {
    var sc = (DB.live || {}).screen; if (!sc || !mirrorFrame || !mirrorFrame.dataset.loaded) return;
    try {
      var w = mirrorFrame.contentWindow, dh = w.document.documentElement.scrollHeight - sc.vh, ratio = sc.sy / Math.max(1, sc.sh - sc.vh);
      w.scrollTo({ top: Math.round(ratio * dh), behavior: 'smooth' });
    } catch (e) { /* */ }
  }
  function watchBeat() { if (current === 'screen' && !document.hidden) DB.setLive({ watching: Date.now() }).catch(function () { /* */ }); }
  setInterval(function () {
    if (current === 'screen') { if (!watchTimer) { watchTimer = setInterval(watchBeat, 8000); watchBeat(); } drawMirror(); }
    else if (watchTimer) { clearInterval(watchTimer); watchTimer = null; mirrorPage = ''; mirrorFrame = null; }
  }, 1000);

  // ---- 🔐 Devices + sign out
  P.devices = function () {
    var lv = DB.live || {}, ad = lv.adminDevices || {}, me = K.deviceId(), so = DB.state.signout || {};
    var herDevs = {}; (lv.sessions || []).forEach(function (s) { var k = s.devId || s.d; if (!herDevs[k] || herDevs[k].last < s.end) herDevs[k] = { name: s.d, last: s.end || s.start, id: s.devId }; });
    function row(id, d, who) {
      var gone = (so.kick || {})[id] > (d.loginAt || 0);
      return '<div class="hist-row"><div><b>' + esc(d.name || '?') + (id === me ? ' (this device)' : '') + '</b><p class="help">Last active ' + agoP(d.last) + (d.page ? ' · ' + esc(K.pageName(d.page)) : '') + (gone ? ' · signed out' : '') + '</p></div>' +
        (id && id !== me && !gone ? '<button class="btn sm danger" data-kick="' + esc(id) + '" data-who="' + who + '">Sign out</button>' : '') + '</div>';
    }
    return '<section class="card stack"><h3>🔐 Your admin devices</h3><p class="help" style="margin:0">Everywhere you\'re logged in as admin.</p>' +
        Object.keys(ad).sort(function (a, b) { return ad[b].last - ad[a].last; }).map(function (id) { return row(id, ad[id], 'admin'); }).join('') +
        '<div class="btns"><button class="btn sm danger" id="so-admin">Sign out all my other devices</button></div></section>' +
      '<section class="card stack"><h3>🌸 Her devices</h3>' + (Object.keys(herDevs).length ? Object.keys(herDevs).map(function (k) { var d = herDevs[k]; return row(d.id, d, 'her'); }).join('') : '<p class="muted">None yet</p>') +
        '<div class="btns"><button class="btn sm danger" id="so-her">Sign her out everywhere</button></div><p class="help" style="margin:0">She can log back in with her username and PIN. Use this if a phone gets lost.</p></section>';
  };

  // ---- 🔎 Search everything
  var searchQ = '';
  function searchItems() {
    var her = DB.her, lv = DB.live || {}, out = [];
    (her.messages || []).forEach(function (m) { out.push({ k: '💌 Message', at: m.at, t: m.text, go: 'inbox' }); if (m.reply) out.push({ k: '↩️ Your reply', at: m.replyAt || m.at, t: m.reply, go: 'inbox' }); if (m.auto) out.push({ k: '🤖 Auto-reply', at: m.auto.at, t: m.auto.text, go: 'inbox' }); });
    (her.guesses || []).forEach(function (x) { out.push({ k: '🤔 Guess', at: x.at, t: x.text + (x.note ? ' · ' + x.note : ''), go: 'inbox' }); });
    (her.wishes || []).forEach(function (x) { out.push({ k: '💭 Wish', at: x.at, t: x.text + (x.note ? ' · ' + x.note : ''), go: 'inbox' }); });
    (her.moods || []).forEach(function (x) { var i = K.moodInfo(x.mood); out.push({ k: '💭 Mood', at: x.at, t: i[1] + ' ' + i[2] + (x.note ? ' · ' + x.note : ''), go: 'overview' }); });
    K.questions().forEach(function (q) { if (q.answer) { var o = (q.options || [])[q.answer.choice] || {}; out.push({ k: '❓ Answer', at: q.answer.at, t: K.qText(q) + ' → ' + (o.label || '') + (q.answer.note ? ' · ' + q.answer.note : ''), go: 'ask' }); } });
    (Array.isArray(her.movies) ? her.movies : []).forEach(function (m) { out.push({ k: '🍿 Movie', at: m.at, t: m.title + (m.watched ? ' (watched)' : ''), go: '' }); });
    (lv.events || []).forEach(function (e) { out.push({ k: (e.e || '•') + ' Activity', at: e.at, t: e.t, go: 'live' }); });
    return out;
  }
  function hl(text, q) {
    var t = String(text), i = t.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return esc(t.slice(0, 200));
    var s = Math.max(0, i - 80), part = t.slice(s, i + q.length + 120);
    var j = i - s;
    return (s ? '…' : '') + esc(part.slice(0, j)) + '<mark>' + esc(part.slice(j, j + q.length)) + '</mark>' + esc(part.slice(j + q.length)) + (i + q.length + 120 < t.length ? '…' : '');
  }
  function searchResults() {
    var q = searchQ.trim(); if (!q) return '<p class="muted">Type to search her messages, your replies, wishes, guesses, moods, answers, movies and activity.</p>';
    var res = searchItems().filter(function (x) { return String(x.t || '').toLowerCase().indexOf(q.toLowerCase()) !== -1; }).sort(function (a, b) { return b.at - a.at; });
    return '<p class="help" style="margin:0">' + res.length + ' result' + (res.length === 1 ? '' : 's') + '</p>' + res.slice(0, 100).map(function (x) {
      return '<div class="hist-row"><div><span class="kind">' + esc(x.k) + '</span><span class="help">' + K.herDateTime(x.at) + '</span><div class="msg-text" style="margin-top:4px">' + hl(x.t, q) + '</div></div>' + (x.go ? '<button class="btn sm ghost" data-goto="' + x.go + '">›</button>' : '') + '</div>';
    }).join('');
  }
  P.search = function () {
    return '<section class="card stack"><h3>🔎 Search everything</h3><input class="field" id="search-q" placeholder="e.g. miss, movie, exam…" value="' + esc(searchQ) + '" autocomplete="off"><div id="search-out" class="stack">' + searchResults() + '</div></section>';
  };

  // ---- 💳 Spending (cap: warnings S$1/3/5, choice at S$10, switches off at S$15)
  P.billing = function () {
    var b = DB.billing || {}, cost = +b.cost || 0, cap = b.capAt === 10 ? 10 : 15, pct = Math.min(100, cost / 15 * 100);
    return '<section class="card stack"><h3>💳 Spending this month</h3>' +
        '<div class="stat-grid"><div class="stat"><b>S$' + cost.toFixed(2) + '</b><span>so far' + (b.at ? ' (updated ' + agoP(b.at) + ')' : '') + '</span></div><div class="stat"><b>S$' + cap + '</b><span>hard stop</span></div></div>' +
        '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '<p class="help" style="margin:0">Expected: S$0. Google sends a report a few times a day, so this can lag by some hours. You get a phone notification and an email at S$1, S$3 and S$5. At S$10 you\'re asked here. At your stop, billing switches off by itself: the site keeps working, only notifications stop until you turn billing back on.</p>' +
        (b.disabledAt ? '<p class="warn">🛑 Billing was switched off ' + agoP(b.disabledAt) + ' (' + esc(b.disabledReason || '') + '). To turn it back on: Firebase console → kiwi-corner → Upgrade → Blaze, then pick your billing account.</p>' : '') +
        '</section>' +
      '<section class="card stack"><h3>🛑 Where to stop</h3>' +
        '<div class="theme-pick"><button type="button" data-cap="10" aria-pressed="' + (cap === 10) + '">Stop at S$10</button><button type="button" data-cap="15" aria-pressed="' + (cap === 15) + '">Keep going to S$15</button></div>' +
        '<label class="switch"><span><b>Remember this for next months</b><br><span class="help">Off = every month starts again at S$15 and asks you at S$10.</span></span><input type="checkbox" id="cap-keep"' + (b.capKeep ? ' checked' : '') + '></label>' +
        '<p class="help" style="margin:0">Budget: S$15/month on your billing account, with alerts at S$1, S$3, S$5, S$10 and S$15.</p></section>';
  };

  // ---- 💌 Open-when letters (stored in her record: private)
  var LETTER_IDEAS = ['you miss me', 'you can\'t sleep', 'you had a bad day', 'you\'re proud of yourself', 'you need a laugh', 'you feel lonely', 'it\'s your birthday', 'you\'re stressed about exams', 'you want to know how much I love you', 'we just had a fight'];
  var COLORS = ['#ffd6e1', '#d6f1ff', '#fff1c4', '#e3ddff', '#d8f5c8', '#ffe0c7'];
  P.letters = function () {
    var ls = (DB.her.letters || []).slice().reverse();
    return '<section class="card stack"><h3>💌 Write an "Open when…" letter</h3><p class="help" style="margin:0">She sees a sealed envelope on her Fun page and opens it at the right moment. You can see when she opened each one.</p><div class="form">' +
        '<div class="row2"><label>Seal emoji<input class="field" id="lt-emoji" value="💚" maxlength="4"></label><label>Colour<select class="field" id="lt-color">' + COLORS.map(function (c, i) { return '<option value="' + c + '">' + ['Pink', 'Blue', 'Yellow', 'Purple', 'Green', 'Peach'][i] + '</option>'; }).join('') + '</select></label></div>' +
        '<label>Open when…<input class="field" id="lt-when" maxlength="60" placeholder="you miss me" list="lt-ideas"><datalist id="lt-ideas">' + LETTER_IDEAS.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist></label>' +
        '<label>Letter<textarea class="field" id="lt-text" style="min-height:180px" placeholder="Dear Livina…"></textarea></label></div>' +
        '<div class="btns"><button class="btn sm ghost" id="lt-preview">👀 Preview</button><button class="btn sm pink" id="lt-add">✉️ Seal and send</button></div></section>' +
      '<section class="card stack"><h3>📬 Your letters</h3>' + (ls.length ? ls.map(function (l) {
        return '<div class="hist-row"><div><b>' + esc((l.emoji || '💌') + ' Open when ' + l.when) + '</b><p class="help">' + (l.openedAt ? '<b style="color:var(--green-d)">opened ' + K.herDateTime(l.openedAt) + '</b>' : 'still sealed') + ' · written ' + K.herDateTime(l.at) + '</p><p class="help" style="white-space:pre-wrap">' + esc(l.text.slice(0, 140)) + (l.text.length > 140 ? '…' : '') + '</p></div>' +
          '<div class="btns" style="flex-direction:column"><button class="btn sm ghost" data-ltview="' + esc(l.id) + '">👀</button>' + (l.openedAt ? '<button class="btn sm ghost" data-ltreseal="' + esc(l.id) + '">Re-seal</button>' : '') + '<button class="btn sm danger" data-ltdel="' + esc(l.id) + '">🗑️</button></div></div>';
      }).join('') : '<p class="muted">No letters yet</p>') + '</section>';
  };
  function letterPreview(l) { K.modal('<div class="letter-paper"><div class="letter-when">Open when ' + esc(l.when || '') + '</div><div class="letter-text">' + esc(l.text || '') + '</div><div class="letter-sign">Love, Chengxuan 💚</div></div>', 'letter-sheet'); }

  // ---- ❓ Question of the day: you see her answer straight away (she doesn't know); she sees yours once you answer
  function qotdData() { return JSON.parse(JSON.stringify(DB.her.qotd || {})); }
  function dayAdd(key, n) { var p = key.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10); }
  P.qotd = function () {
    var today = K.todayKey(), q = DB.her.qotd || {}, d = (q.days || {})[today] || {}, plan = q.plan || {};
    var past = Object.keys(q.days || {}).filter(function (k) { return k < today; }).sort().reverse().slice(0, 14);
    var next = []; for (var i = 1; i <= 7; i++) next.push(dayAdd(today, i));
    return '<section class="card stack"><h3>❓ Today\'s question <span class="help">(her day: ' + esc(today) + ')</span></h3>' +
        '<p class="q-text" style="text-align:left">' + esc(K.qotdFor(today)) + '</p>' +
        (!d.her ? '<div class="row2"><input class="field" id="qd-today" placeholder="Change today\'s question" value=""><button class="btn sm ghost" id="qd-today-set">Change</button></div>' : '') +
        '<div class="qa-mine"><b>Her answer 🤫 (she doesn\'t know you can see it yet)</b>' + (d.her ? esc(d.her.text) + '<br><small class="help">' + K.herDateTime(d.her.at) + '</small>' : '<span class="muted">Not answered yet</span>') + '</div>' +
        (d.him ? '<div class="qa-his"><b>Your answer (she can see it' + (d.her ? '' : ' after she answers') + ')</b>' + esc(d.him.text) + '</div>'
          : '<label class="help">Your answer. She sees it as soon as you send it<textarea class="field" id="qd-mine" placeholder="Your answer…"></textarea></label><div class="btns"><button class="btn sm pink" id="qd-send">💬 Send my answer</button></div>') + '</section>' +
      '<section class="card stack"><h3>🗓️ Next days</h3><p class="help" style="margin:0">Set the question for each day (her time). Empty = a question from the built-in list.</p>' +
        next.map(function (k) { return '<label class="help">' + esc(k) + ' · ' + esc(T.fmtDay(T.parse(k + 'T12:00', HZ), HZ)) + '<input class="field" data-qplan="' + k + '" value="' + esc(plan[k] || '') + '" placeholder="' + esc(K.qotdFor(k)) + '"></label>'; }).join('') +
        '<div class="btns"><button class="btn sm" id="qd-plan">💾 Save questions</button></div></section>' +
      (past.length ? '<section class="card stack"><h3>📚 Past days</h3>' + past.map(function (k) {
        var x = q.days[k];
        return '<div class="item"><div class="help">' + esc(k) + '</div><b>' + esc(x.q || '') + '</b>' + (x.her ? '<div class="qa-mine"><b>Her</b>' + esc(x.her.text) + '</div>' : '') + (x.him ? '<div class="qa-his"><b>You</b>' + esc(x.him.text) + '</div>' : '<div class="help">You didn\'t answer</div>') + '</div>';
      }).join('') + '</section>' : '');
  };

  // ---- 📖 Our story settings
  P.story = function () {
    return '<section class="card stack"><h3>📖 Our story</h3><p class="help" style="margin:0">The "days together" counter on her Home counts from this date. Memories (with photos) are added on the Our story page, by either of you.</p>' +
      '<label>Together since<input class="field" id="st-start" type="date" value="' + esc(DB.state.storyStart || '') + '"></label>' +
      '<div class="btns"><button class="btn sm" id="st-save">💾 Save</button><a class="btn sm ghost" href="story.html" style="text-decoration:none">📖 Open Our story</a></div></section>';
  };

  // ---- 🎄 Christmas room (stats + reset)
  P.xmasroom = function () {
    var x = (DB.dmMeta || {}).xmas || {};
    return '<section class="card stack"><h3>🎄 Christmas room</h3><p class="help" style="margin:0">The room inside the Christmas scene on her Gifts page (Christmas theme).</p>' +
      '<div class="stat-grid"><div class="stat"><b>' + (x.orn || []).length + '</b><span>ornaments on the tree</span></div><div class="stat"><b>' + (x.pets || 0) + '</b><span>times the cat was petted</span></div><div class="stat"><b>' + (x.logs || 0) + '</b><span>logs on the fire</span></div><div class="stat"><b>' + (x.snow || 0) + '/5</b><span>snowman built</span></div></div>' +
      (function () { var f = x.found || {}, n = Object.keys(f).length, key = DB.her.xmasKey || {}, gname = key.used ? ((K.gifts().find(function (g) { return g.id === key.used; }) || {}).name || key.used) : '';
        return '<p><b>🔎 Secrets she found: ' + n + '/19</b> · ' + (key.got ? (key.used ? '🔑 key used on "' + esc(gname) + '" ' + K.herDateTime(key.usedAt) : '🔑 key earned ' + K.herDateTime(key.got) + ', not used yet') : 'when she finds all 19 she gets Santa\'s Golden Key (unlocks one present of her choice, free) + 30 ⭐') + '</p>' +
          '<div class="btns"><button class="btn sm ghost" id="xk-give">🔑 Give her the key now</button><button class="btn sm ghost" id="xk-reset">↺ Reset key + secrets</button></div>'; })() +
      '<div class="btns"><button class="btn sm ghost" id="xr-clear">🧹 Clear the tree</button><button class="btn sm danger" id="xr-reset">♻️ Reset the whole room</button><a class="btn sm ghost" href="gifts.html#xmas" style="text-decoration:none">🎄 Open the room</a></div></section>' +
      '<section class="card stack"><h3>📜 12 days of Christmas</h3><p class="help" style="margin:0">Off until you write at least one day. Then a scroll appears on the room wall, and each day (Dec 25 → Jan 5, her time) opens your message.</p>' +
        (function () { var t = DB.state.twelve || {}, seen = ((DB.dmMeta || {}).xmas || {}).twelveSeen || {}, r = ''; for (var i = 1; i <= 12; i++) { var d = new Date(Date.UTC(2026, 11, 24 + i)).toISOString().slice(5, 10).replace('-', '/'); r += '<label class="help">Day ' + i + ' · ' + d + (seen[i] ? ' · <b style="color:var(--green-d)">opened ✓</b>' : '') + '<input class="field" data-tw="' + i + '" value="' + esc(t[i] || '') + '" placeholder="(empty = locked)"></label>'; } return r; })() +
        '<div class="btns"><button class="btn sm" id="tw-save">💾 Save the 12 days</button></div></section>';
  };

  // ---- 🎯 Catchables
  P.catch = function () {
    var c = K.catchCfg(), today = K.todayKey(), list = (DB.her.catches || []).slice().reverse().slice(0, 15);
    return '<section class="card stack"><h3>🎯 Catchables</h3><p class="help" style="margin:0">Things fly across her screen now and then (every theme except plain Kiwi). Big = 10 ⭐ (rare), medium = 5 ⭐, small = 1 ⭐.</p>' +
      '<p><b>Today she caught ' + K.caughtToday() + ' / ' + c.daily + ' ⭐</b></p>' +
      '<label class="switch"><span><b>Catchables on</b></span><input type="checkbox" id="ct-on"' + (c.on ? ' checked' : '') + '></label>' +
      '<div class="row2"><label class="help">Max points a day<input class="field" id="ct-daily" type="number" min="0" value="' + c.daily + '"></label><label class="help">Something appears every (minutes)<select class="field" id="ct-gap">' +
        [[1, 2], [2, 4], [4, 8], [8, 15]].map(function (g) { return '<option value="' + g[0] + '-' + g[1] + '"' + (c.minGap === g[0] * 60 ? ' selected' : '') + '>' + g[0] + '–' + g[1] + ' min</option>'; }).join('') + '</select></label></div>' +
      '<div class="btns"><button class="btn sm" id="ct-save">💾 Save</button></div>' +
      (list.length ? '<ul class="log">' + list.map(function (x) { return '<li><span>' + esc(x.name) + '<br><small>' + K.herDateTime(x.at) + '</small></span><span class="amt">+' + x.amt + '</span></li>'; }).join('') + '</ul>' : '<p class="muted">Nothing caught yet</p>') + '</section>';
  };

  // ---- 🟩 Wordle (she guesses a word you set)
  function wScore(guess, word) { var res = [], left = {}, i; for (i = 0; i < word.length; i++) { if (guess[i] === word[i]) res[i] = 'g'; else left[word[i]] = (left[word[i]] || 0) + 1; } for (i = 0; i < word.length; i++) { if (res[i]) continue; if (left[guess[i]]) { res[i] = 'y'; left[guess[i]]--; } else res[i] = '-'; } return res; }
  P.wordle = function () {
    var g = DB.her.wordle, hist = (DB.her.wordleHist || []).slice().reverse().slice(0, 10);
    var live = g ? '<div class="wd-grid admin">' + (g.guesses || []).map(function (gs) { var sc = wScore(gs, String(g.word).toLowerCase()); return '<div class="wd-row" style="grid-template-columns:repeat(' + g.word.length + ',1fr)">' + gs.split('').map(function (L, i) { return '<span class="wd-t s' + sc[i] + '">' + esc(L.toUpperCase()) + '</span>'; }).join('') + '</div>'; }).join('') + '</div>' : '';
    return '<section class="card stack"><h3>🟩 Set a Wordle for her</h3><p class="help" style="margin:0">She gets 6 tries to guess your word on her Fun page. Any letters count as a guess (no dictionary), so pick something she can work out. Setting a new word replaces the current one.</p><div class="form">' +
        '<div class="row2"><label>Secret word (3–8 letters)<input class="field" id="wd-word" maxlength="8" autocomplete="off" autocapitalize="characters" placeholder="e.g. KIWIS"></label><label>Points if she wins<input class="field" id="wd-reward" type="number" min="0" value="10"></label></div>' +
        '<label>Hint (optional)<input class="field" id="wd-hint" maxlength="80" placeholder="e.g. what I call you 🥺"></label></div>' +
        '<div class="btns"><button class="btn sm pink" id="wd-set">🟩 Send the Wordle</button></div></section>' +
      (g ? '<section class="card stack"><h3>👀 Her current game: ' + esc(String(g.word).toUpperCase()) + '</h3><p class="help" style="margin:0">' + ({ playing: 'Playing · ' + (g.guesses || []).length + '/6 guesses', won: '🎉 She won in ' + (g.guesses || []).length + (+g.reward ? ' (+' + g.reward + ' ⭐)' : ''), lost: '🥺 She didn\'t get it' }[g.status] || '') + '</p>' + (live || '<p class="muted">No guesses yet</p>') +
        '<div class="btns"><button class="btn sm danger" id="wd-del">Remove this Wordle</button></div></section>' : '') +
      (hist.length ? '<section class="card stack"><h3>📚 Past Wordles</h3><ul class="log">' + hist.map(function (h) { return '<li><span>' + esc(String(h.word).toUpperCase()) + '<br><small>' + K.herDateTime(h.at) + '</small></span><span class="amt">' + (h.won ? '✅ ' + h.tries + '/6' : '❌') + '</span></li>'; }).join('') + '</ul></section>' : '');
  };

  // ---- clicks for the tabs above
  function morePowerClick(b, d, id) {
    if (id === 'wd-set') {
      var ww = val('wd-word').toLowerCase().replace(/[^a-z]/g, '');
      if (ww.length < 3 || ww.length > 8) { toast('Use 3 to 8 letters (A–Z)'); return true; }
      DB.setHer({ wordle: { id: 'w' + uid(), word: ww, hint: val('wd-hint'), reward: Math.max(0, Math.round(+val('wd-reward') || 0)), at: Date.now(), guesses: [], status: 'playing' } });
      toast('Wordle sent 🟩'); render(); return true;
    }
    if (id === 'wd-del') { K.confirm({ emoji: '🟩', title: 'Remove this Wordle?', yes: 'Remove', danger: true }).then(function (ok) { if (ok) { DB.setHer({ wordle: null }); toast('Removed'); render(); } }); return true; }
    if (id === 'ct-save') { var g2 = $('#ct-gap').value.split('-'); DB.setState({ catchCfg: { on: $('#ct-on').checked, daily: Math.max(0, Math.round(+$('#ct-daily').value || 0)), minGap: +g2[0] * 60, maxGap: +g2[1] * 60 } }); toast('Catchables saved 🎯'); render(); return true; }
    if (id === 'tw-save') { var tw = {}; panels.querySelectorAll('[data-tw]').forEach(function (inp) { if (inp.value.trim()) tw[inp.dataset.tw] = inp.value.trim(); }); DB.setState({ twelve: tw }); toast(Object.keys(tw).length ? '12 days saved 📜' : '12 days turned off'); render(); return true; }
    if (id === 'xk-give') { DB.setHer({ xmasKey: { got: Date.now(), used: null } }); toast('She has Santa\'s Golden Key 🔑'); render(); return true; }
    if (id === 'xk-reset') {
      K.confirm({ emoji: '↺', title: 'Reset the key and her found secrets?', text: 'If she used the key, that present goes back to locked (unless she already opened it).', yes: 'Reset', danger: true }).then(function (ok) {
        if (!ok) return; DB.setHer({ xmasKey: null }); DB.dmMetaSet({ xmas: { found: null } }).then(function () { toast('Reset ↺'); render(); });
      });
      return true;
    }
    if (id === 'xr-clear' || id === 'xr-reset') {
      var full = id === 'xr-reset';
      K.confirm({ emoji: full ? '♻️' : '🧹', title: full ? 'Reset the whole Christmas room?' : 'Take all ornaments off the tree?', text: full ? 'Ornaments, snowman, cocoa, cookies, candles, lights and counters go back to the start.' : '', yes: full ? 'Reset' : 'Clear', danger: true }).then(function (ok) {
        if (!ok) return;
        DB.dmMetaSet({ xmas: full ? { orn: [], pets: 0, logs: 0, cocoa: 5, cookies: 5, storm: false, lights: 'on', snow: 0, candles: true, fireBoost: 0, outfit: {}, house: [] } : { orn: [] } }).then(function () { toast(full ? 'Christmas room reset ♻️' : 'Tree cleared 🧹'); render(); });
      });
      return true;
    }
    if (id === 'lt-preview') { letterPreview({ when: val('lt-when'), text: val('lt-text') }); return true; }
    if (id === 'lt-add') {
      if (!val('lt-when') || !val('lt-text')) { toast('Write "open when…" and the letter'); return true; }
      var l1 = { id: 'l' + uid(), emoji: val('lt-emoji') || '💌', color: $('#lt-color').value, when: val('lt-when').replace(/^open when\s*/i, ''), text: val('lt-text'), at: Date.now() };
      DB.setHer({ letters: (DB.her.letters || []).concat([l1]) }); toast('Letter sealed and sent ✉️'); render(); return true;
    }
    if (d.ltview) { var lv = (DB.her.letters || []).find(function (x) { return x.id === d.ltview; }); if (lv) letterPreview(lv); return true; }
    if (d.ltreseal) { DB.setHer({ letters: (DB.her.letters || []).map(function (x) { return x.id === d.ltreseal ? Object.assign({}, x, { openedAt: null }) : x; }) }); toast('Sealed again'); render(); return true; }
    if (d.ltdel) {
      K.confirm({ emoji: '🗑️', title: 'Delete this letter?', yes: 'Delete', danger: true }).then(function (ok) { if (ok) { DB.setHer({ letters: (DB.her.letters || []).filter(function (x) { return x.id !== d.ltdel; }) }); toast('Deleted'); render(); } });
      return true;
    }
    if (id === 'qd-send' || id === 'qd-today-set' || id === 'qd-plan') {
      var qd = qotdData(), td = K.todayKey(); qd.days = qd.days || {}; qd.plan = qd.plan || {};
      if (id === 'qd-send') { if (!val('qd-mine')) { toast('Write your answer'); return true; } qd.days[td] = Object.assign({ q: K.qotdFor(td) }, qd.days[td] || {}, { him: { text: val('qd-mine'), at: Date.now() } }); }
      if (id === 'qd-today-set') { if (!val('qd-today')) { toast('Type the new question'); return true; } qd.days[td] = Object.assign({}, qd.days[td] || {}, { q: val('qd-today') }); }
      if (id === 'qd-plan') panels.querySelectorAll('[data-qplan]').forEach(function (inp) { if (inp.value.trim()) qd.plan[inp.dataset.qplan] = inp.value.trim(); else delete qd.plan[inp.dataset.qplan]; });
      DB.setHer({ qotd: qd }); toast(id === 'qd-send' ? 'Sent. She can see it now 💬' : 'Saved ❓'); render(); return true;
    }
    if (id === 'st-save') { DB.setState({ storyStart: $('#st-start').value || null }); toast('Saved 📖'); render(); return true; }
    if (d.schedtype) { schedType = d.schedtype; render(); return true; }
    if (d.schedquick) {
      var now = Date.now(), at;
      if (d.schedquick === '1') at = now + 3600e3;
      else {
        var p = T.parts(now, HZ), hh = d.schedquick === 'm' ? 7 : 21, mm = d.schedquick === 'm' ? 30 : 0;
        at = T.wall(p.y, p.m, p.d, hh, mm, HZ); if (at <= now) at = T.addDays(at, 1, HZ);
      }
      var inp = $('#sc-at'); inp.value = wallOf(at, VZ); inp.dispatchEvent(new Event('input')); return true;
    }
    if (id === 'sc-add') {
      var at2 = parseDt(val('sc-at')); if (!at2) { toast('Pick when to send it'); return true; }
      if (at2 < Date.now() - 60000) { toast('That time has already passed'); return true; }
      var t = schedType, data = {};
      if (t === 'ping' || t === 'surprise') { data = { emoji: val('sc-emoji'), title: val('sc-title'), text: val('sc-text') }; if (!data.title && !data.text) { toast('Write something first'); return true; } }
      if (t === 'points') { data = { amt: Math.round(+val('sc-amt') || 0), reason: val('sc-reason') }; if (!data.amt) { toast('How many points?'); return true; } }
      if (t === 'kiwis') { data = { amount: Math.round(+val('sc-amt') || 0), note: val('sc-reason') }; if (!data.amount) { toast('How many kiwis?'); return true; } }
      if (t === 'question') {
        var opts = val('sc-opts').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
        if (!val('sc-text') || !opts.length) { toast('Write the question and at least one answer'); return true; }
        data = { emoji: val('sc-emoji') || '💭', text: val('sc-text'), options: opts.map(function (o) { return { label: o }; }) }; if (val('sc-note')) data.note = val('sc-note');
      }
      if (t === 'banner') { data = { text: val('sc-text'), hours: Math.max(0, +val('sc-hours') || 0) }; if (!data.text) { toast('Write the banner'); return true; } }
      if (t === 'theme') data = { theme: $('#sc-theme').value };
      DB.setState({ scheduled: (DB.state.scheduled || []).concat([{ id: 's' + uid(), type: t, at: at2, data: data }]).slice(-200) });
      toast('Scheduled for ' + K.herDateTime(at2) + ' ⏰'); render(); return true;
    }
    if (d.scheddel) {
      K.confirm({ emoji: '🗑️', title: 'Delete this?', yes: 'Delete', danger: true }).then(function (ok) {
        if (ok) { DB.setState({ scheduled: (DB.state.scheduled || []).filter(function (s) { return s.id !== d.scheddel; }) }); toast('Deleted'); render(); }
      });
      return true;
    }
    if (d.schednow) { DB.setState({ scheduled: (DB.state.scheduled || []).map(function (s) { return s.id === d.schednow ? Object.assign({}, s, { at: Date.now() }) : s; }) }); toast('Sent now ✓'); render(); return true; }
    if (id === 'push-on') { K.enablePush().then(render); return true; }
    if (id === 'push-a2hs') { K.installHelp(); return true; }
    if (d.cap) {
      var c10 = d.cap === '10';
      if (c10 && (+(DB.billing || {}).cost || 0) >= 10) {
        K.confirm({ emoji: '🛑', title: 'Stop now?', text: 'You\'re already past S$10, so billing switches off right away and notifications stop.', yes: 'Stop now', danger: true }).then(function (ok) { if (ok) DB.setBilling({ capAt: 10 }).then(function () { toast('Stopping at S$10'); render(); }); });
        return true;
      }
      DB.setBilling({ capAt: c10 ? 10 : null }).then(function () { toast(c10 ? 'It stops at S$10 this month' : 'Keeps going up to S$15'); render(); }); return true;
    }
    // notifications
    if (id === 'nt-topic') {
      var c0 = K.notifyCfg(), a = new Uint8Array(12); crypto.getRandomValues(a);
      c0.topic = 'kiwi-' + Array.from(a).map(function (x) { return (x % 36).toString(36); }).join('');
      DB.setHer({ notifyCfg: c0 }); toast('New channel made. Subscribe to it in ntfy'); render(); return true;
    }
    if (id === 'nt-copy') { try { navigator.clipboard.writeText(K.notifyCfg().topic); toast('Copied 📋'); } catch (e) { toast('Couldn\'t copy. Select it and copy by hand'); } return true; }
    if (id === 'nt-save' || id === 'nt-test') {
      var c1 = K.notifyCfg(), evs = {};
      panels.querySelectorAll('[data-ntev]').forEach(function (x) { evs[x.dataset.ntev] = x.checked; });
      c1.on = $('#nt-on').checked; c1.events = evs; c1.withText = $('#nt-text').checked;
      DB.setHer({ notifyCfg: c1 });
      if (id === 'nt-test') {
        if (!c1.topic) { toast('Make your channel first'); return true; }
        K.sendNtfy(c1, '🥝 Kiwi Corner test', 'It works! You\'ll get notifications here when she does things 💚').then(function () { toast('Test sent. Check your phone 📲'); });
      } else toast('Notifications saved 🔔');
      render(); return true;
    }
    // history
    if (d.undo) {
      var e = hist().find(function (x) { return x.id === d.undo; }); if (!e) return true;
      K.confirm({ emoji: '↶', title: 'Undo "' + (e.label || e.keys.join(', ')) + '"?', text: 'Puts ' + e.keys.join(', ') + ' back to how it was ' + agoP(e.at) + '.', yes: 'Undo' }).then(function (ok) {
        if (!ok) return;
        (e.doc === 'state' ? DB.setState(e.before) : e.doc === 'her' ? DB.setHer(e.before) : DB.setLive(e.before)).then(function () {
          var h = hist(); h.forEach(function (x) { if (x.id === e.id) x.undone = true; }); saveHist(h); toast('Undone ↶'); render();
        });
      });
      return true;
    }
    if (id === 'hist-clear') { saveHist([]); try { localStorage.removeItem(HKEY); } catch (x) { /* */ } toast('History cleared'); render(); return true; }
    // theme
    if (d.settheme) { DB.setState({ theme: d.settheme, themeAt: Date.now() }); K.applyTheme(); toast('Theme set: ' + b.textContent); render(); return true; }
    // devices
    if (d.kick) {
      K.confirm({ emoji: '🔐', title: 'Sign out this device?', yes: 'Sign out', danger: true }).then(function (ok) {
        if (!ok) return; var so = Object.assign({}, DB.state.signout || {}); so.kick = Object.assign({}, so.kick || {}); so.kick[d.kick] = Date.now();
        DB.setState({ signout: so }); toast('Signed out 🔐'); render();
      });
      return true;
    }
    if (id === 'so-admin' || id === 'so-her') {
      var mine = id === 'so-admin';
      K.confirm({ emoji: '🔐', title: mine ? 'Sign out all your other devices?' : 'Sign her out everywhere?', text: mine ? 'This device stays logged in.' : 'She\'ll need to log in again.', yes: 'Sign out', danger: true }).then(function (ok) {
        if (!ok) return; var so = Object.assign({}, DB.state.signout || {}), now = Date.now();
        so[mine ? 'admin' : 'her'] = now; if (mine) K.store.set('kiwi-login-at', String(now + 1000));
        DB.setState({ signout: so }); toast(mine ? 'Your other devices are signed out' : 'She\'s signed out everywhere'); render();
      });
      return true;
    }
    return false;
  }
  panels.addEventListener('change', function (e) {
    if (e.target.id === 'ck-weekly') { DB.setState({ clickerWeekly: e.target.checked }); toast(e.target.checked ? 'Her game restarts every Monday 🗓️' : 'Weekly restart off'); return; }
    if (e.target.id === 'cap-keep') { DB.setBilling({ capKeep: e.target.checked }); toast('Saved'); return; }
    if (e.target.id === 'th-choice') { DB.setState({ themeChoice: e.target.checked }); toast(e.target.checked ? 'She can pick her theme now 🎨' : 'Theme picker hidden'); render(); }
  });
  panels.addEventListener('input', function (e) {
    if (e.target.id === 'search-q') { searchQ = e.target.value; $('#search-out').innerHTML = searchResults(); }
  });

  // ---------------------------------------------------------------- auto-save what you type (survives refresh, switching tabs, closing)
  var ADR = 'kiwi-adraft:';
  function draftKeyOf(el) {
    if (!el || !/^(INPUT|TEXTAREA)$/.test(el.tagName) || /^(checkbox|radio|file|number|datetime-local|hidden)$/.test(el.type) || el.id === 'search-q' || el.id === 'ar-test' || el.id === 'raw-json') return null;
    if (el.id) return 'id:' + el.id;
    if (el.dataset.replyto) return 'reply:' + el.dataset.replyto;
    if (el.dataset.xnote) return 'note:' + el.dataset.xnote;
    return null;
  }
  var savedPill = null, savedT = null;
  panels.addEventListener('input', function (e) {
    var k = draftKeyOf(e.target); if (!k) return;
    try { if (e.target.value.trim()) localStorage.setItem(ADR + k, e.target.value); else localStorage.removeItem(ADR + k); } catch (x) { /* */ }
    if (!savedPill) { savedPill = document.createElement('div'); savedPill.className = 'draft-pill'; savedPill.textContent = '💾 Draft saved'; document.body.appendChild(savedPill); }
    savedPill.classList.add('show'); clearTimeout(savedT); savedT = setTimeout(function () { savedPill.classList.remove('show'); }, 1200);
  });
  function restoreAdminDrafts() {
    panels.querySelectorAll('input, textarea').forEach(function (el) {
      var k = draftKeyOf(el); if (!k) return;
      var v = null; try { v = localStorage.getItem(ADR + k); } catch (x) { /* */ }
      if (v != null && v !== el.value) { el.value = v; el.classList.add('has-draft'); }
    });
  }
  // A real "send / save" in a card clears that card's drafts (picking a type or a filter doesn't).
  panels.addEventListener('click', function (e) {
    var b = e.target.closest('button.btn'); if (!b || b.classList.contains('ghost')) return;
    if (b.dataset.schedtype || b.dataset.inboxkind || b.dataset.cgquick || b.dataset.schedquick || b.dataset.raw) return;
    var box = b.closest('.item, .card'); if (!box) return;
    box.querySelectorAll('input, textarea').forEach(function (el) { var k = draftKeyOf(el); if (k) try { localStorage.removeItem(ADR + k); } catch (x) { /* */ } });
  }, true);

  // ---------------------------------------------------------------- render + tabs
  function render() {
    renderNav();
    panels.innerHTML = '<div class="panel stack">' + P[current]() + '</div>';
    restoreAdminDrafts();
    var pc = $('#push-card-admin'); if (pc) { var x = K.store.get('kiwi-push-x'); K.store.set('kiwi-push-x', '0'); K.pushCard(pc); if (x) K.store.set('kiwi-push-x', x); }
    wireSgHints(panels);
  }
  // ---- navigation: 5 groups, each with its own tabs
  var GROUPS = [
    { id: 'home', label: '🏠 Home', tabs: [['overview', '📊 Overview']] },
    { id: 'her', label: '💬 Her', tabs: [['inbox', '📥 From her'], ['qotd', '❓ Daily question'], ['live', '🛰️ Live'], ['screen', '📱 Screen'], ['search', '🔎 Search'], ['photos', '📸 Photos']] },
    { id: 'rewards', label: '⭐ Rewards', tabs: [['points', '⭐ Points'], ['gifts', '🎁 Gifts'], ['catch', '🎯 Catchables'], ['clicker', '🥝 Clicker']] },
    { id: 'write', label: '✍️ Write', tabs: [['messages', '💌 Messages to her'], ['letters', '✉️ Open-when letters'], ['wordle', '🟩 Wordle'], ['surprises', '📜 Sent surprises'], ['story', '📖 Our story'], ['schedule', '⏰ Schedule'], ['ask', '❓ Ask her'], ['auto', '🤖 Auto-replies'], ['theme', '🎨 Theme'], ['xmasroom', '🎄 Xmas room'], ['countdowns', '⏳ Countdowns'], ['notes', '📝 Love notes']] },
    { id: 'more', label: '🎛️ Control', tabs: [['control', '🎛️ Control'], ['notify', '🔔 Notifications'], ['billing', '💳 Spending'], ['history', '🕘 History'], ['devices', '🔐 Devices'], ['data', '💾 Data'], ['reset', '🧹 Reset']] }
  ];
  function groupOf(tab) { return GROUPS.find(function (g) { return g.tabs.some(function (t) { return t[0] === tab; }); }) || GROUPS[0]; }
  // Things waiting for you, per tab
  function todo() {
    var her = DB.her;
    return {
      inbox: fromHer().filter(function (i) { return !i.done; }).length,
      photos: (DB.herPhotos || []).filter(function (p) { return (p.status || 'pending') === 'pending'; }).length
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
    if (current === 'overview' || current === 'live') render();
    var pc = (DB.photos || []).length + ':' + (DB.herPhotos || []).map(function (h) { return h.status || 'p'; }).join('') + ':' + Object.keys(DB.her.unlockedBonus || {}).length;
    if (current === 'photos' && pc !== photoCount && !pendingPhoto) { photoCount = pc; render(); }
  });

  // ---------------------------------------------------------------- actions
  function val(id) { var el = $('#' + id); return el ? el.value.trim() : ''; }
  function saveGifts(map, msg) { DB.setState({ gifts: map }); toast(msg || 'Saved 🎁'); render(); }

  panels.addEventListener('click', function (e) {
    var sr = inboxSel && e.target.closest('[data-iselrow]');
    if (sr && !e.target.closest('button, textarea, input, a')) { var key = sr.dataset.iselrow; if (inboxSel[key]) delete inboxSel[key]; else inboxSel[key] = true; return render(); }
    var un = e.target.closest('[data-apunskip]');
    if (un) {
      e.preventDefault();
      var ap2 = Object.assign({}, DB.state.autoPoints); ap2.skipped = (ap2.skipped || []).filter(function (k) { return k !== un.dataset.apunskip; });
      DB.setState({ autoPoints: ap2 }); toast('Night restored'); return render();
    }
    var b = e.target.closest('button'); if (!b) return;
    var d = b.dataset, id = b.id;
    if (powerClick(b, d, id) || morePowerClick(b, d, id)) return;
    if (d.qr !== undefined) {
      var qtext = quickList()[+d.qr]; if (!qtext) return;
      DB.setHer({ messages: (DB.her.messages || []).map(function (m) { return m.id === d.mid ? Object.assign({}, m, { read: true, reply: qtext, replyAt: Date.now(), archived: true }) : m; }) });
      toast('Sent: ' + qtext); return render();
    }

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
        card.querySelectorAll('[data-k]').forEach(function (inp) { g[inp.dataset.k] = inp.dataset.k === 'points' ? Math.max(0, +inp.value || 0) : inp.dataset.k === 'reveal' ? toBcn(inp.value.trim()) : inp.value.trim(); });
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
        var nEl = panels.querySelector('[data-xnote="' + d.xid + '"]'), pEl = panels.querySelector('[data-xpts="' + d.xid + '"]');
        var note = nEl ? nEl.value.trim() : '', pts = Math.round(+(pEl ? pEl.value : 0) || 0);
        arr = arr.map(function (x) {
          if (x.id !== d.xid) return x;
          var y = Object.assign({}, x); y[key === 'guesses' ? 'verdict' : 'status'] = d.v; if (note) y.note = note; else delete y.note; return y;
        });
        if (pts) addPoints(pts, key === 'guesses' ? 'Great guess! 🤔' : 'For your wish 💭');
      }
      var patch = {}; patch[key] = arr; DB.setHer(patch); toast(d.xdel ? 'Deleted' : 'Reply sent 💚'); return render();
    }

    if (d.inboxview) { inboxView = d.inboxview; return render(); }
    if (d.inboxkind) { inboxKind = d.inboxkind; return render(); }
    if (d.aseen) {
      var qa = K.questions().find(function (q) { return q.id === d.aseen; }); if (!qa || !qa.answer) return;
      var sa = Object.assign({}, seenAnswers()); sa[qa.id] = qa.answer.at; DB.setState({ seenAnswers: sa }); toast('Moved to Done ✓'); return render();
    }
    if (d.adel) {
      K.confirm({ emoji: '🗑️', title: 'Delete her answer?', text: 'The question shows again on her Home page (if it hasn\'t expired).', yes: 'Delete', danger: true }).then(function (ok) {
        if (!ok) return; var an = Object.assign({}, DB.her.answers || {}); delete an[d.adel]; DB.setHer({ answers: an }); toast('Deleted'); render();
      });
      return;
    }
    if (d.qhide || d.qshow) { var hid = d.qhide || d.qshow; return saveQs(qList().map(function (q) { if (q.id === hid) q.active = !!d.qshow; return q; }), d.qhide ? 'Hidden from her 🙈' : 'Showing again 👀'); }
    if (d.qdel) {
      K.confirm({ emoji: '🗑️', title: 'Delete this question?', text: 'It disappears from her Home page too.', yes: 'Delete', danger: true }).then(function (ok) {
        if (ok) saveQs(qList().filter(function (q) { return q.id !== d.qdel; }), 'Deleted');
      });
      return;
    }
    if (id === 'qa-send') {
      var qtext = val('qa-text'), opts = val('qa-opts').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      var reps = val('qa-replies').split('\n').map(function (x) { return x.trim(); });
      if (!qtext) return toast('Write a question first');
      if (opts.length < 1) return toast('Add at least one answer button');
      var nq = { id: 'q' + uid(), emoji: val('qa-emoji') || '💭', text: qtext, options: opts.map(function (o, i) { var r = { label: o }; if (reps[i]) r.reply = reps[i]; return r; }), at: Date.now() };
      if (val('qa-note')) nq.note = val('qa-note');
      if (val('qa-until')) nq.until = toBcn(val('qa-until'));
      return saveQs(qList().concat([nq]), 'Asked! It\'s on her Home page now 💌');
    }
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
      toast({ reply: inboxView === 'inbox' ? 'Reply sent 💌 · moved to Done' : 'Reply updated 💌', archive: 'Moved to Done ✓', unarchive: 'Back in Needs you ✋' }[d.msg] || 'Done');
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
      if (hp) K.modal('<img class="photo-big" src="' + hp.data + '" alt=""><div class="help">' + esc(K.herDateTime(hp.at)) + '</div>', 'photo-sheet');
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
      var sp1 = { id: uid(), emoji: val('s-emoji') || '💌', title: val('s-title'), text: val('s-text'), active: true, at: Date.now() };
      DB.setState({ surprise: sp1, surpriseLog: (DB.state.surpriseLog || []).concat([{ id: sp1.id, emoji: sp1.emoji, title: sp1.title, text: sp1.text, at: sp1.at }]).slice(-100) });
      toast('Surprise sent 💌'); return render();
    }
    if (id === 's-preview') { surprisePreview({ emoji: val('s-emoji') || '💌', title: val('s-title'), text: val('s-text') }); return; }
    if (id === 's-ideas') {
      var sh2 = K.modal('<h3>💡 Surprise ideas</h3><p class="help">Tap one to put it in the box. You can change it before sending.</p><div class="stack" style="gap:8px">' + SURPRISE_IDEAS.map(function (x, i) {
        return '<button type="button" class="hist-row" data-idea="' + i + '" style="text-align:left;border:0;font:inherit;cursor:pointer;width:100%"><div><b>' + esc(x[0] + ' ' + x[1]) + '</b><p class="help" style="white-space:pre-wrap">' + esc(x[2]) + '</p></div></button>';
      }).join('') + '</div>');
      sh2.addEventListener('click', function (e) {
        var b2 = e.target.closest('[data-idea]'); if (!b2) return; var x = SURPRISE_IDEAS[+b2.dataset.idea];
        $('#s-emoji').value = x[0]; $('#s-title').value = x[1]; $('#s-text').value = x[2];
        ['s-emoji', 's-title', 's-text'].forEach(function (k) { $('#' + k).dispatchEvent(new Event('input', { bubbles: true })); });
        K.closeModal(); toast('Idea added. Preview or send it 💌');
      });
      return;
    }
    if (d.spv || d.spcopy) {
      var it = surpriseHistory().find(function (x) { return x.id === (d.spv || d.spcopy); }); if (!it) return;
      if (d.spv) { surprisePreview(it); return; }
      go('messages'); setTimeout(function () { $('#s-emoji').value = it.emoji || '💌'; $('#s-title').value = it.title || ''; $('#s-text').value = it.text || ''; toast('Copied into the surprise box'); }, 60); return;
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
      DB.setState({ countdowns: (DB.state.countdowns || []).concat([{ id: 'c-' + uid(), emoji: val('c-emoji') || '⭐', label: val('c-label'), at: toBcn(val('c-at')) }]) });
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
