/* chat.js: DMs between Livina and Chengxuan, iMessage-style.
   Instant (Firestore live updates), Sending → Delivered → Read, typing dots, tapbacks, replies, photos,
   edit / unsend, select + delete, clear chat. He decides whether she sees his online status, read receipts, delivered and typing.
   She can't hide hers. */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, T = window.KiwiTime, $ = K.$, esc = K.esc;
  if (!DB.user) { $('#dm-login').hidden = false; $('#dm-form').hidden = true; return; }

  var me = DB.user.role === 'admin' ? 'him' : 'her', other = me === 'him' ? 'her' : 'him';
  var NAME = { him: 'Chengxuan', her: 'Livina' };
  var list = $('#dm-list'), box = $('#dm-msgs'), input = $('#dm-text'), sendBtn = $('#dm-send');
  var LIMIT = 60, msgs = [], unsub = null, replyTo = null, selecting = false, selected = {}, nodes = {};
  var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;

  $('#dm-name').textContent = NAME[other];
  $('#dm-ava').textContent = other === 'him' ? '🥝' : '🌸';
  $('#dm-back').href = me === 'him' ? 'admin.html' : 'index.html';
  $('#dm-gear').hidden = false;
  (function () {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'dm-gear dm-selbtn'; b.textContent = 'Select'; b.setAttribute('aria-label', 'Select messages');
    $('#dm-gear').before(b);
    b.addEventListener('click', function () { if (selecting) stopSelect(); else startSelect(); b.textContent = selecting ? 'Done' : 'Select'; });
  })();
  // 🔔 in the header until notifications are on for this phone
  (function () {
    var st = K.pushState(); if (st === 'on' || st === 'unsupported') return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'dm-gear dm-bell'; b.textContent = '🔔'; b.setAttribute('aria-label', 'Turn on notifications');
    $('#dm-gear').before(b);
    b.addEventListener('click', function () {
      var s2 = K.pushState();
      if (s2 === 'needs-app') { K.installHelp(); return; }
      if (s2 === 'denied') { K.toast('Notifications are blocked. Turn them on in Settings → Notifications'); return; }
      K.enablePush().then(function (ok) { if (ok) b.remove(); });
    });
  })();

  function meta() { return DB.dmMeta || {}; }
  function settings() { return meta().settings || {}; }
  function cleared() { return +((meta()[me] || {}).clearedAt || 0); }
  function visibleMsgs() { var c = cleared(); return msgs.filter(function (m) { return m.at > c && !(m.hidden || {})[me]; }); }

  // ---------------------------------------------------------------- "our" emojis (he can change them in ⚙️)
  var OUR_DEFAULT = ['🥝', '💚', '🥺', '😘', '🫶', '😂', '🥰', '🍿', '🌙', '☀️', '🐦', '💕'];
  function ours() { var o = settings().emojis; return (o && o.length) ? o : OUR_DEFAULT; }
  function drawOurs() {
    var bar = $('#dm-ours');
    if (!bar) { bar = document.createElement('div'); bar.id = 'dm-ours'; bar.className = 'dm-ours'; $('#dm-form').before(bar); }
    var sig = ours().join('');
    if (bar.dataset.sig === sig) return; bar.dataset.sig = sig;
    bar.innerHTML = ours().map(function (e) { return '<button type="button" data-our="' + esc(e) + '">' + esc(e) + '</button>'; }).join('');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-our]'); if (!b) return;
    // empty box: tap sends it straight away (big emoji). Otherwise it's added to what you're typing.
    if (!input.value.trim()) { send(b.dataset.our); pop(b); return; }
    var s = input.selectionStart || input.value.length;
    input.value = input.value.slice(0, s) + b.dataset.our + input.value.slice(input.selectionEnd || s);
    input.focus(); input.selectionStart = input.selectionEnd = s + b.dataset.our.length; onType();
  });
  function pop(el) { el.classList.remove('popped'); void el.offsetWidth; el.classList.add('popped'); }

  // ---------------------------------------------------------------- listen
  function listen() { if (unsub) unsub(); unsub = DB.dmListen(LIMIT, function (l) { msgs = l; draw(); ack(); }); }
  var atBottom = true, unreadBelow = 0, lastCount = 0;
  list.addEventListener('scroll', function () {
    atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    if (atBottom) { unreadBelow = 0; $('#dm-jump').hidden = true; markRead(); }
    if (list.scrollTop < 40 && msgs.length >= LIMIT && !loadingMore) loadMore();
  });
  var loadingMore = false;
  function loadMore() {
    loadingMore = true; $('#dm-more').hidden = false;
    var h = list.scrollHeight; LIMIT += 60;
    var stop = DB.dmListen(LIMIT, function (l) {
      if (unsub) unsub(); unsub = stop; msgs = l; draw();
      list.scrollTop = list.scrollHeight - h; $('#dm-more').hidden = true; setTimeout(function () { loadingMore = false; }, 400);
    });
  }
  function scrollDown(smooth) { list.scrollTo({ top: list.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); }

  // delivered: as soon as my device has their message. read: when the chat is open, on screen and scrolled down.
  function ack() {
    var now = Date.now();
    var und = msgs.filter(function (m) { return m.from === other && !m.deliveredAt; }).map(function (m) { return m.id; });
    if (und.length) DB.dmUpdateMany(und, { deliveredAt: now }).catch(function () { /* */ });
    markRead();
  }
  function markRead() {
    if (document.hidden || !atBottom || (document.hasFocus && !document.hasFocus() && !touch)) return;
    var ids = msgs.filter(function (m) { return m.from === other && !m.readAt; }).map(function (m) { return m.id; });
    if (ids.length) DB.dmUpdateMany(ids, { readAt: Date.now(), deliveredAt: Date.now() }).catch(function () { /* */ });
    var u = (meta().unread || {})[me];
    if (u) { var p = { unread: {} }; p.unread[me] = 0; DB.dmMetaSet(p); }
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) markRead(); });
  window.addEventListener('focus', markRead);

  // ---------------------------------------------------------------- drawing
  var BIG = /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️|\s)+$/u;
  function bigEmoji(t) { if (!t || t.length > 24 || !BIG.test(t) || /^[\d#*\s]+$/.test(t)) return false; var n = typeof Intl.Segmenter === 'function' ? Array.from(new Intl.Segmenter().segment(t.trim())).length : Array.from(t.trim()).length; return n <= 3; }
  function linkify(t) { return esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }
  function timeLabel(at) {
    return K.herDay(at) + ' ' + T.fmtTime(at, K.VZ);
  }
  function short(at) {
    var today = K.herDay(at) === 'Today';
    return today ? T.fmtTime(at, K.VZ) : K.herDay(at);
  }
  function rowHtml(m, prev, next) {
    var mine = m.from === me, gapPrev = !prev || m.at - prev.at > 15 * 60000;
    var first = gapPrev || prev.from !== m.from || m.at - prev.at > 3 * 60000;
    var last = !next || next.from !== m.from || next.at - m.at > 3 * 60000 || next.at - m.at > 15 * 60000;
    var h = gapPrev ? '<div class="dm-time">' + timeLabel(m.at) + '</div>' : '';
    if (m.unsent) return h + '<div class="dm-unsent">' + (mine ? 'You' : NAME[m.from]) + ' unsent a message</div>';
    var rq = m.replyTo ? '<div class="dm-quote"><b>' + (m.replyTo.from === me ? 'You' : NAME[m.replyTo.from]) + '</b>' + esc((m.replyTo.text || '📷 Photo').slice(0, 90)) + '</div>' : '';
    var big = !m.img && bigEmoji(m.text);
    var body = m.card ? postcardHTML(m.card, m.from) : m.audio ? '<div class="dm-audio" data-aud="' + esc(m.id) + '"><button type="button" class="dm-play" data-play="' + esc(m.id) + '" aria-label="Play">▶</button><div class="dm-wave">' + waveBars(m.id) + '<i class="dm-prog"></i></div><span class="dm-dur">' + mmss(m.dur || 0) + '</span></div>' + (m.listenedAt && m.from === me ? '<small class="dm-played">Played</small>' : '')
      : m.img ? '<img src="' + m.img + '" alt="Photo" loading="lazy">' + (m.text ? '<div class="dm-cap">' + linkify(m.text) + '</div>' : '') : linkify(m.text || '');
    var rx = m.reactions || {}, rk = Object.keys(rx).filter(function (k) { return rx[k]; });
    var react = rk.length ? '<div class="dm-react">' + rk.map(function (k) { return '<span class="' + (k === me ? 'mine' : '') + '">' + esc(rx[k]) + '</span>'; }).join('') + '</div>' : '';
    return h + '<div class="dm-row ' + (mine ? 'me' : 'them') + (first ? ' first' : '') + (last ? ' last' : '') + (selecting ? ' sel' : '') + (selected[m.id] ? ' picked' : '') + '" data-id="' + esc(m.id) + '">' +
      (selecting ? '<span class="dm-check">' + (selected[m.id] ? '✓' : '') + '</span>' : '') +
      '<div class="dm-col">' + rq + '<div class="dm-bubble' + (big ? ' big' : '') + (m.img || m.card ? ' pic' : '') + (m.pending ? ' pending' : '') + '">' + body + react + '</div>' +
      (m.edited ? '<div class="dm-edited">Edited</div>' : '') + '</div></div>';
  }
  function statusFor(m) {
    if (!m || m.from !== me || m.unsent) return '';
    if (m.pending) return 'Sending…';
    var s = settings();
    if (me === 'her') {   // what she may see about HIS side is up to him
      if (m.readAt && s.showRead) return 'Read ' + short(m.readAt);
      if (m.deliveredAt && s.showDelivered) return 'Delivered';
      return 'Sent';
    }
    if (m.readAt) return 'Read ' + short(m.readAt);
    if (m.deliveredAt) return 'Delivered';
    return 'Sent';
  }
  function draw() {
    var v = visibleMsgs(), keep = {};
    v.forEach(function (m, i) {
      var html = rowHtml(m, v[i - 1], v[i + 1]), n = nodes[m.id];
      if (!n || n.dataset.sig !== html) {
        var w = document.createElement('div'); w.className = 'dm-wrap'; w.dataset.mid = m.id; w.dataset.sig = html; w.innerHTML = html;
        if (n) n.replaceWith(w); n = w; nodes[m.id] = w;
      }
      keep[m.id] = 1;
      if (box.children[i] !== n) box.insertBefore(n, box.children[i] || null);
    });
    Object.keys(nodes).forEach(function (id) { if (!keep[id]) { nodes[id].remove(); delete nodes[id]; } });
    // "Delivered / Read" under my latest message
    var mineLast = null; for (var i = v.length - 1; i >= 0; i--) { if (v[i].from === me) { mineLast = v[i]; break; } if (v[i].from === other) break; }
    var st = $('#dm-st'); if (st) st.remove();
    if (mineLast && nodes[mineLast.id]) { var s = document.createElement('div'); s.id = 'dm-st'; s.className = 'dm-st'; s.textContent = statusFor(mineLast); nodes[mineLast.id].appendChild(s); }
    if (!v.length && !$('#dm-empty')) box.insertAdjacentHTML('beforeend', '<div class="dm-empty" id="dm-empty"><div>' + (other === 'him' ? '🥝' : '🌸') + '</div>Say hi to ' + NAME[other] + '!<br><span>Messages here arrive instantly 💚</span></div>');
    if (v.length && $('#dm-empty')) $('#dm-empty').remove();
    // new messages: stick to the bottom, or show "↓ 2 new"
    var newOnes = v.length - lastCount; lastCount = v.length;
    if (newOnes > 0) {
      var lastM = v[v.length - 1];
      if (atBottom || (lastM && lastM.from === me)) requestAnimationFrame(function () { scrollDown(!firstDraw); });
      else if (!firstDraw) { unreadBelow += newOnes; $('#dm-jump-n').textContent = unreadBelow + ' new'; $('#dm-jump').hidden = false; }
      if (!firstDraw && lastM && lastM.from === other && navigator.vibrate) try { navigator.vibrate(12); } catch (e) { /* */ }
    }
    if (firstDraw) { firstDraw = false; requestAnimationFrame(function () { scrollDown(false); }); }
    drawHead(); drawTyping(); drawSelectBar();
  }
  var firstDraw = true;
  $('#dm-jump').addEventListener('click', function () { scrollDown(true); });

  // ---------------------------------------------------------------- header: online / typing
  function drawHead() {
    var o = meta()[other] || {}, now = Date.now(), el = $('#dm-status');
    var hidden = other === 'him' && !settings().showOnline;
    var typing = o.typing && now - o.typing < 6000 && (other === 'her' || settings().showTyping);
    var txt = '', cls = '';
    if (typing) { txt = 'typing…'; cls = 'on'; }
    else if (!hidden && o.at) {
      var on = o.visible && now - o.at < 60000;
      if (on) { txt = o.page === 'chat' ? 'In the chat now' : 'Active now'; cls = 'on'; }
      else txt = 'Active ' + ago(o.at);
    }
    el.textContent = txt; el.className = cls;
  }
  function ago(at) {
    var s = Math.max(0, (Date.now() - at) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return K.herDay(at).toLowerCase() === 'yesterday' ? 'yesterday' : Math.floor(s / 86400) + 'd ago';
  }
  function drawTyping() {
    var o = meta()[other] || {}, on = o.typing && Date.now() - o.typing < 6000 && (other === 'her' || settings().showTyping);
    var t = $('#dm-typing'), was = !t.hidden; t.hidden = !on;
    if (on && !was && atBottom) scrollDown(true);
  }
  setInterval(function () { drawHead(); drawTyping(); }, 1000);
  DB.subscribe(function () { drawOurs(); draw(); });

  // ---------------------------------------------------------------- composing + sending
  var lastTypingSent = 0;
  function myMeta(p) { var o = {}; o[me] = p; return DB.dmMetaSet(o); }
  function onType() {
    input.style.height = 'auto'; input.style.height = Math.min(140, input.scrollHeight) + 'px';
    sendBtn.disabled = !input.value.trim();
    if (input.value.trim() && Date.now() - lastTypingSent > 2500) { lastTypingSent = Date.now(); myMeta({ typing: Date.now() }); }
    if (!input.value.trim() && lastTypingSent) { lastTypingSent = 0; myMeta({ typing: 0 }); }
  }
  input.addEventListener('input', onType);
  input.addEventListener('blur', function () { if (lastTypingSent) { lastTypingSent = 0; myMeta({ typing: 0 }); } });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !touch && !e.isComposing) { e.preventDefault(); $('#dm-form').requestSubmit(); }
  });
  input.addEventListener('focus', function () { setTimeout(function () { scrollDown(true); }, 250); });
  $('#dm-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = input.value.trim(); if (!t) return;
    send(t); input.value = ''; onType(); input.focus();
    try { localStorage.removeItem('kiwi-draft:chat:dm-text'); } catch (x) { /* */ }
  });
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function send(text, img) {
    var m = { id: 'm' + uid(), from: me, text: text || '', at: Date.now() };
    if (img) m.img = img;
    if (replyTo) { m.replyTo = { id: replyTo.id, from: replyTo.from, text: (replyTo.text || (replyTo.img ? '📷 Photo' : '')).slice(0, 140) }; setReply(null); }
    atBottom = true;
    DB.dmSend(m).catch(function (err) { console.error(err); K.toast('Couldn\'t send. Check your connection'); });
    var last = {}; last.last = { at: m.at, from: me, text: img ? '📷 Photo' : m.text.slice(0, 80) }; last[me] = { typing: 0, at: Date.now(), visible: true, page: 'chat' };
    DB.dmMetaSet(last, other);
    lastTypingSent = 0;
    if (me === 'her') { K.notify('message', '💬 Livina', K.notifyCfg().withText ? (img ? '📷 Photo' : m.text) : 'Sent you a message'); }
  }
  $('#dm-file').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    K.toast('Sending photo… 📷');
    K.compressPhoto(f).then(function (d) { send(input.value.trim(), d); input.value = ''; onType(); })
      .catch(function () { K.toast('Couldn\'t read that photo'); });
    e.target.value = '';
  });

  // ---------------------------------------------------------------- 🖼️ postcards
  var PC = {
    sunset: ['linear-gradient(160deg,#ff9a8b,#ff6a88 45%,#ffd194)', 'Greetings from Barcelona', '#fff'],
    night: ['linear-gradient(160deg,#141e30,#243b55)', 'Greetings from Singapore', '#ffd27a'],
    kiwi: ['linear-gradient(160deg,#d4fc79,#96e6a1)', 'Kiwi Corner Post', '#2c5d1e'],
    hearts: ['radial-gradient(circle at 20% 30%,rgba(255,255,255,.35) 0 6px,transparent 7px),radial-gradient(circle at 70% 70%,rgba(255,255,255,.35) 0 8px,transparent 9px),linear-gradient(160deg,#ff9ecf,#ff6f91)', 'With love', '#fff'],
    snow: ['radial-gradient(circle at 15% 20%,#fff 0 2px,transparent 3px),radial-gradient(circle at 60% 40%,#fff 0 2px,transparent 3px),radial-gradient(circle at 85% 15%,#fff 0 2px,transparent 3px),linear-gradient(160deg,#a8c0ff,#3f2b96)', 'Season\'s greetings', '#fff'],
    ocean: ['linear-gradient(160deg,#2193b0,#6dd5ed)', 'Wish you were here', '#fff']
  };
  var STICKERS = ['🥝', '💚', '😘', '🌸', '⭐', '🌙', '☀️', '🎄', '🏖️', '✈️', '🍜', '🥺', '🐦', '🎁', '💌', '🫶'];
  function postcardHTML(c, from) {
    var d = PC[c.bg] || PC.kiwi;
    return '<div class="pc" style="background:' + d[0] + ';color:' + d[2] + '"><div class="pc-stamp">' + esc(c.stamp || (from === 'her' ? '🌸' : '🥝')) + '</div>' +
      (c.img ? '<img class="pc-img" src="' + c.img + '" alt="">' : '') + '<div class="pc-title">' + esc(d[1]) + '</div>' +
      (c.text ? '<div class="pc-text">' + esc(c.text) + '</div>' : '') + '<div class="pc-from">— ' + (from === 'her' ? 'Livina' : 'Chengxuan') + '</div>' +
      (c.stickers || []).map(function (st) { return '<span class="pc-st" style="left:' + st.x + '%;top:' + st.y + '%">' + esc(st.e) + '</span>'; }).join('') + '</div>';
  }
  function postcardEditor() {
    var c = { bg: me === 'her' ? 'sunset' : 'night', text: '', img: null, stickers: [] };
    var sh = K.modal('<h3>🖼️ Make a postcard</h3><div class="pc-prev" id="pc-prev"></div>' +
      '<div class="dress-row" style="margin-top:8px">' + Object.keys(PC).map(function (k) { return '<button type="button" data-pcbg="' + k + '" aria-pressed="' + (k === c.bg) + '"><span class="sw" style="background:' + PC[k][0] + '"></span><small>' + k + '</small></button>'; }).join('') + '</div>' +
      '<textarea class="field" id="pc-text" maxlength="240" placeholder="Write on your postcard…" style="margin-top:8px"></textarea>' +
      '<p class="help" style="margin:8px 0 4px">Stickers (tap to add · tap one on the card to remove it)</p><div class="pc-stickers">' + STICKERS.map(function (e) { return '<button type="button" data-pcst="' + e + '">' + e + '</button>'; }).join('') + '</div>' +
      '<div class="btns" style="margin-top:10px"><label class="btn sm ghost" style="cursor:pointer">📷 Photo<input type="file" id="pc-file" accept="image/*" hidden></label><button type="button" class="btn sm pink" id="pc-send">💌 Send postcard</button></div>', 'pc-sheet');
    function redraw() { sh.querySelector('#pc-prev').innerHTML = postcardHTML(c, me); }
    redraw();
    sh.addEventListener('input', function (e) { if (e.target.id === 'pc-text') { c.text = e.target.value; redraw(); } });
    sh.addEventListener('change', function (e) {
      if (e.target.id !== 'pc-file' || !e.target.files[0]) return;
      K.compressPhoto(e.target.files[0]).then(function (d) { c.img = d; redraw(); }).catch(function () { K.toast('Couldn\'t read that photo'); });
    });
    sh.addEventListener('click', function (e) {
      var bg = e.target.closest('[data-pcbg]'), st = e.target.closest('[data-pcst]'), on = e.target.closest('.pc-prev .pc-st');
      if (bg) { c.bg = bg.dataset.pcbg; sh.querySelectorAll('[data-pcbg]').forEach(function (x) { x.setAttribute('aria-pressed', x === bg); }); redraw(); }
      if (st && c.stickers.length < 10) { c.stickers.push({ e: st.dataset.pcst, x: Math.round(8 + Math.random() * 78), y: Math.round(10 + Math.random() * 70) }); redraw(); }
      if (on) { var i = [].indexOf.call(sh.querySelectorAll('.pc-prev .pc-st'), on); c.stickers.splice(i, 1); redraw(); }
      if (e.target.closest('#pc-send')) {
        if (!c.text && !c.img && !c.stickers.length) { K.toast('Write something or add a photo first'); return; }
        var m = { id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), from: me, text: '', card: c, at: Date.now() };
        DB.dmSend(m).catch(function () { K.toast('Couldn\'t send. Try a smaller photo'); });
        var last = { last: { at: m.at, from: me, text: '💌 Postcard' } }; DB.dmMetaSet(last, other);
        if (me === 'her') K.notify('message', '💬 Livina', '💌 Postcard');
        K.closeModal(); K.confetti({ count: 60 }); atBottom = true;
      }
    });
  }
  $('#dm-pc').addEventListener('click', postcardEditor);
  if (location.hash === '#postcard') { history.replaceState(null, '', 'chat.html'); setTimeout(postcardEditor, 600); }

  // ---------------------------------------------------------------- 🎙️ voice messages (up to 60 s, stored with the message)
  function mmss(sec) { sec = Math.round(sec || 0); return Math.floor(sec / 60) + ':' + ('0' + sec % 60).slice(-2); }
  function waveBars(id) { var h = '', x = 0; for (var i = 0; i < id.length; i++) x = (x * 31 + id.charCodeAt(i)) % 9973; for (var j = 0; j < 26; j++) { x = (x * 17 + 7) % 9973; h += '<span style="height:' + (25 + x % 70) + '%"></span>'; } return h; }
  var rec = null, recChunks = [], recStart = 0, recTimer = null, recCancel = false;
  function pickMime() { var c = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']; for (var i = 0; i < c.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c[i])) return c[i]; return ''; }
  function stopRec(cancel) { if (!rec) return; recCancel = !!cancel; try { rec.stop(); } catch (e) { /* */ } clearInterval(recTimer); }
  $('#dm-mic').addEventListener('click', function () {
    if (!window.MediaRecorder || !navigator.mediaDevices) { K.toast('Voice messages aren\'t supported in this browser'); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var mime = pickMime(); recChunks = []; recCancel = false;
      try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 }); } catch (e) { rec = new MediaRecorder(stream); }
      rec.ondataavailable = function (ev) { if (ev.data && ev.data.size) recChunks.push(ev.data); };
      rec.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        $('#dm-rec').hidden = true; $('#dm-form').hidden = false;
        var dur = (Date.now() - recStart) / 1000, r2 = rec; rec = null;
        if (recCancel || dur < 0.6) return;
        var blob = new Blob(recChunks, { type: r2.mimeType || mime || 'audio/webm' });
        var fr = new FileReader();
        fr.onload = function () {
          if (fr.result.length > 900000) { K.toast('That one\'s too long. Keep it under a minute'); return; }
          sendAudio(fr.result, dur);
        };
        fr.readAsDataURL(blob);
      };
      rec.start(250); recStart = Date.now();
      $('#dm-rec').hidden = false; $('#dm-form').hidden = true; $('#dm-rec-t').textContent = '0:00';
      recTimer = setInterval(function () { var t = (Date.now() - recStart) / 1000; $('#dm-rec-t').textContent = mmss(t); if (t >= 60) stopRec(false); }, 250);
      if (navigator.vibrate) try { navigator.vibrate(15); } catch (x) { /* */ }
    }).catch(function () { K.toast('Allow the microphone to send voice messages 🎙️'); });
  });
  $('#dm-rec-send').addEventListener('click', function () { stopRec(false); });
  $('#dm-rec-x').addEventListener('click', function () { stopRec(true); K.toast('Voice message deleted'); });
  function sendAudio(data, dur) {
    var m = { id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), from: me, text: '', audio: data, dur: Math.round(dur), at: Date.now() };
    if (replyTo) { m.replyTo = { id: replyTo.id, from: replyTo.from, text: (replyTo.text || '🎙️ Voice message').slice(0, 140) }; setReply(null); }
    atBottom = true;
    DB.dmSend(m).catch(function () { K.toast('Couldn\'t send. Check your connection'); });
    var last = { last: { at: m.at, from: me, text: '🎙️ Voice message' } }; last[me] = { typing: 0, at: Date.now(), visible: true, page: 'chat' };
    DB.dmMetaSet(last, other);
    if (me === 'her') K.notify('message', '💬 Livina', '🎙️ Voice message');
  }
  // player: one at a time, with a progress bar
  var player = null, playingId = null;
  box.addEventListener('click', function (e) {
    var b = e.target.closest('[data-play]'); if (!b) return;
    e.stopPropagation();
    var id = b.dataset.play, m = msgById(id); if (!m || !m.audio) return;
    if (player && playingId === id) { player.pause(); player = null; playingId = null; b.textContent = '▶'; return; }
    if (player) { player.pause(); var ob = box.querySelector('[data-play="' + playingId + '"]'); if (ob) ob.textContent = '▶'; }
    player = new Audio(m.audio); playingId = id; b.textContent = '❚❚';
    var wrap = box.querySelector('[data-aud="' + id + '"]');
    player.ontimeupdate = function () { var d = player.duration && isFinite(player.duration) ? player.duration : (m.dur || 1); var pr = wrap && wrap.querySelector('.dm-prog'); if (pr) pr.style.width = Math.min(100, player.currentTime / d * 100) + '%'; var dd = wrap && wrap.querySelector('.dm-dur'); if (dd) dd.textContent = mmss(player.currentTime); };
    player.onended = function () { b.textContent = '▶'; var pr = wrap && wrap.querySelector('.dm-prog'); if (pr) pr.style.width = '0'; var dd = wrap && wrap.querySelector('.dm-dur'); if (dd) dd.textContent = mmss(m.dur); player = null; playingId = null; };
    player.play().catch(function () { K.toast('Couldn\'t play this one on this device'); b.textContent = '▶'; });
    if (m.from === other && !m.listenedAt) DB.dmUpdate(m.id, { listenedAt: Date.now() });
  });

  // ---------------------------------------------------------------- reply
  function setReply(m) {
    replyTo = m; $('#dm-reply').hidden = !m;
    if (m) { $('#dm-reply-who').textContent = 'Replying to ' + (m.from === me ? 'yourself' : NAME[m.from]); $('#dm-reply-text').textContent = (m.text || '📷 Photo').slice(0, 100); input.focus(); }
  }
  $('#dm-reply-x').addEventListener('click', function () { setReply(null); });

  // ---------------------------------------------------------------- tap, double-tap, long-press, swipe
  function msgById(id) { return msgs.find(function (m) { return m.id === id; }); }
  var pressT = null, pressId = null, startX = 0, startY = 0, swipeRow = null, lastTap = 0, lastTapId = null, moved = false;
  box.addEventListener('pointerdown', function (e) {
    var row = e.target.closest('.dm-row'); if (!row || e.target.closest('a') || e.target.closest('[data-play]')) return;
    pressId = row.dataset.id; startX = e.clientX; startY = e.clientY; moved = false; swipeRow = row;
    if (selecting) return;
    clearTimeout(pressT); pressT = setTimeout(function () { if (!moved) { if (navigator.vibrate) try { navigator.vibrate(10); } catch (x) { /* */ } actions(msgById(pressId)); } }, 430);
  });
  box.addEventListener('pointermove', function (e) {
    if (!swipeRow) return;
    var dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) { moved = true; clearTimeout(pressT); }
    if (!selecting && dx > 0 && Math.abs(dx) > Math.abs(dy) && e.pointerType !== 'mouse') swipeRow.style.transform = 'translateX(' + Math.min(70, dx) + 'px)';
  });
  function endPress(e) {
    clearTimeout(pressT);
    if (e.target.closest && e.target.closest('[data-play]')) { swipeRow = null; return; }
    if (!swipeRow) return;
    var dx = e.clientX - startX, row = swipeRow; swipeRow = null;
    row.style.transform = '';
    if (selecting && !moved) { toggleSel(row.dataset.id); return; }
    if (!selecting && dx > 55 && e.pointerType !== 'mouse') { setReply(msgById(row.dataset.id)); return; }
    if (!moved) {   // double-tap = ❤️, single tap = quick bar (Reply · ❤️ · 😂 · More)
      var now = Date.now(), rid = row.dataset.id;
      if (lastTapId === rid && now - lastTap < 320) { clearTimeout(qbarT); hideQbar(); react(msgById(rid), '❤️', true); lastTap = 0; }
      else { lastTap = now; lastTapId = rid; clearTimeout(qbarT); qbarT = setTimeout(function () { showQbar(rid); }, 330); }
    }
  }
  // quick bar under a tapped message
  var qbarT = null, qbarId = null;
  function hideQbar() { var q = document.getElementById('dm-qbar'); if (q) q.remove(); qbarId = null; }
  function showQbar(id) {
    var m = msgById(id); if (!m || m.unsent) return;
    if (qbarId === id) { hideQbar(); return; }
    hideQbar(); qbarId = id;
    var n = nodes[id]; if (!n) return;
    var q = document.createElement('div'); q.id = 'dm-qbar'; q.className = 'dm-qbar ' + (m.from === me ? 'me' : 'them');
    q.innerHTML = '<button type="button" data-q="reply">↩️ Reply</button><button type="button" data-q="❤️">❤️</button><button type="button" data-q="😂">😂</button><button type="button" data-q="🥺">🥺</button><button type="button" data-q="more">⋯</button>' +
      '<span class="dm-qtime">' + timeLabel(m.at) + '</span>';
    n.appendChild(q);
    q.addEventListener('click', function (e) {
      var b = e.target.closest('[data-q]'); if (!b) return; e.stopPropagation();
      var k = b.dataset.q; hideQbar();
      if (k === 'reply') setReply(m); else if (k === 'more') actions(m); else react(m, k, true);
    });
    if (atBottom || n === box.lastElementChild) requestAnimationFrame(function () { q.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  }
  document.addEventListener('pointerdown', function (e) { if (!e.target.closest('#dm-qbar') && !e.target.closest('.dm-row')) hideQbar(); });
  box.addEventListener('pointerup', endPress);
  box.addEventListener('pointercancel', function () { clearTimeout(pressT); if (swipeRow) swipeRow.style.transform = ''; swipeRow = null; });
  box.addEventListener('contextmenu', function (e) { var row = e.target.closest('.dm-row'); if (!row) return; e.preventDefault(); clearTimeout(pressT); actions(msgById(row.dataset.id)); });

  var TAPBACKS = ['❤️', '👍', '👎', '😂', '‼️', '❓', '🥝', '💚'];
  function react(m, emo, quick) {
    if (!m || m.unsent) return;
    var rx = Object.assign({}, m.reactions || {}); rx[me] = (rx[me] === emo && !quick) ? null : emo;
    if (quick && (m.reactions || {})[me] === emo) rx[me] = null;
    DB.dmUpdate(m.id, { reactions: rx });
    var n = nodes[m.id]; if (n && rx[me]) { var b = n.querySelector('.dm-bubble'); if (b) pop(b); }
  }
  function actions(m) {
    if (!m || m.unsent) return;
    var mine = m.from === me, age = Date.now() - m.at, rx = (m.reactions || {})[me];
    var sh = K.modal('<div class="dm-tapbacks">' + TAPBACKS.map(function (e) { return '<button type="button" data-tb="' + e + '"' + (rx === e ? ' class="on"' : '') + '>' + e + '</button>'; }).join('') + '</div>' +
      '<div class="dm-preview ' + (mine ? 'me' : 'them') + '">' + (m.img ? '📷 Photo ' : '') + esc((m.text || '').slice(0, 200)) + '</div>' +
      '<div class="dm-actions">' +
        '<button type="button" data-act="reply">↩️ Reply</button>' +
        (m.text ? '<button type="button" data-act="copy">📋 Copy</button>' : '') +
        '<button type="button" data-act="select">☑️ Select</button>' +
        (mine && m.text && !m.img && age < 15 * 60000 ? '<button type="button" data-act="edit">✏️ Edit</button>' : '') +
        (mine && age < 2 * 60000 ? '<button type="button" data-act="unsend">↶ Undo send</button>' : '') +
        '<button type="button" data-act="hide" class="danger">🗑️ Delete for me</button>' +
        (me === 'him' ? '<button type="button" data-act="delall" class="danger">🗑️ Delete for both</button>' : '') +
      '</div>' + '<p class="help" style="text-align:center;margin:8px 0 0">' + timeLabel(m.at) + (m.readAt && (me === 'him' || settings().showRead) && mine ? ' · Read ' + short(m.readAt) : '') + '</p>', 'dm-sheet');
    sh.addEventListener('click', function (e) {
      var tb = e.target.closest('[data-tb]'), a = e.target.closest('[data-act]');
      if (tb) { react(m, tb.dataset.tb); K.closeModal(); return; }
      if (!a) return;
      var act = a.dataset.act; K.closeModal();
      if (act === 'reply') setReply(m);
      if (act === 'copy') { try { navigator.clipboard.writeText(m.text); K.toast('Copied'); } catch (x) { /* */ } }
      if (act === 'select') { startSelect(); toggleSel(m.id); }
      if (act === 'edit') edit(m);
      if (act === 'unsend') DB.dmUpdate(m.id, { unsent: true, text: '', img: null, reactions: null, replyTo: null });
      if (act === 'hide') hideFor([m.id]);
      if (act === 'delall') deleteBoth([m.id]);
    });
  }
  function edit(m) {
    var sh = K.modal('<h3>Edit message</h3><textarea class="field" id="dm-edit" style="min-height:100px">' + esc(m.text) + '</textarea><div class="btns" style="justify-content:flex-end;margin-top:10px"><button type="button" class="btn ghost" id="dm-edit-x">Cancel</button><button type="button" class="btn" id="dm-edit-ok">Save</button></div>');
    var ta = sh.querySelector('#dm-edit'); ta.focus(); ta.selectionStart = ta.value.length;
    sh.querySelector('#dm-edit-x').addEventListener('click', K.closeModal);
    sh.querySelector('#dm-edit-ok').addEventListener('click', function () {
      var t = ta.value.trim(); K.closeModal(); if (!t || t === m.text) return;
      DB.dmUpdate(m.id, { text: t, edited: Date.now() });
    });
  }
  function hideFor(ids) {
    var p = {}; p['hidden'] = {}; p.hidden[me] = true;
    DB.dmUpdateMany(ids, p).then(function () { K.toast(ids.length > 1 ? ids.length + ' messages deleted for you' : 'Deleted for you'); });
  }
  function deleteBoth(ids) {
    K.confirm({ emoji: '🗑️', title: 'Delete ' + (ids.length > 1 ? ids.length + ' messages' : 'this message') + ' for both of you?', text: 'They show as "unsent" for her.', yes: 'Delete', danger: true }).then(function (ok) {
      if (ok) DB.dmUpdateMany(ids, { unsent: true, text: '', img: null, reactions: null, replyTo: null }).then(function () { K.toast('Deleted for both'); });
    });
  }

  // ---------------------------------------------------------------- select mode
  function startSelect() { selecting = true; selected = {}; nodes = {}; box.innerHTML = ''; draw(); }
  function stopSelect() { selecting = false; selected = {}; nodes = {}; box.innerHTML = ''; draw(); }
  function toggleSel(id) { if (selected[id]) delete selected[id]; else selected[id] = true; draw(); }
  function drawSelectBar() {
    var sb = document.querySelector('.dm-selbtn'); if (sb) sb.textContent = selecting ? 'Done' : 'Select';
    var bar = $('#dm-selbar');
    if (!selecting) { if (bar) bar.remove(); $('#dm-form').hidden = false; var o = $('#dm-ours'); if (o) o.hidden = false; return; }
    if (!bar) { bar = document.createElement('div'); bar.id = 'dm-selbar'; bar.className = 'dm-selbar'; $('#dm-form').after(bar); }
    $('#dm-form').hidden = true; var o2 = $('#dm-ours'); if (o2) o2.hidden = true;
    var n = Object.keys(selected).length;
    bar.innerHTML = '<button type="button" data-sel="cancel">Cancel</button><b>' + (n ? n + ' selected' : 'Tap messages') + '</b>' +
      '<button type="button" data-sel="all">All</button>' +
      '<button type="button" data-sel="copy"' + (n ? '' : ' disabled') + '>📋</button>' +
      '<button type="button" data-sel="hide"' + (n ? '' : ' disabled') + '>🗑️</button>' +
      (me === 'him' ? '<button type="button" data-sel="delall"' + (n ? '' : ' disabled') + '>🗑️ both</button>' : '');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-sel]'); if (!b) return;
    var ids = Object.keys(selected), act = b.dataset.sel;
    if (act === 'cancel') return stopSelect();
    if (act === 'all') { visibleMsgs().forEach(function (m) { if (!m.unsent) selected[m.id] = true; }); return draw(); }
    if (!ids.length) return;
    if (act === 'copy') {
      var txt = visibleMsgs().filter(function (m) { return selected[m.id] && m.text; }).map(function (m) { return (m.from === me ? 'Me' : NAME[m.from]) + ' (' + timeLabel(m.at) + '): ' + m.text; }).join('\n');
      try { navigator.clipboard.writeText(txt); K.toast('Copied ' + ids.length); } catch (x) { /* */ }
      return stopSelect();
    }
    if (act === 'hide') { hideFor(ids); return stopSelect(); }
    if (act === 'delall') { deleteBoth(ids); return stopSelect(); }
  });

  // ---------------------------------------------------------------- ⚙️ chat settings (clear for both; privacy + our emojis for him)
  $('#dm-gear').addEventListener('click', function () {
    var s = settings(), isHim = me === 'him';
    var sh = K.modal('<h3>💬 Chat settings</h3>' +
      (isHim ? '<p class="help">What she can see about you. You always see all of hers.</p><div class="switches">' +
        [['showOnline', '🟢 When I\'m online'], ['showRead', '👀 When I\'ve read her messages'], ['showDelivered', '✓ When my phone got them (Delivered)'], ['showTyping', '💬 When I\'m typing']].map(function (x) {
          return '<label class="switch"><span>' + x[1] + '</span><input type="checkbox" data-set="' + x[0] + '"' + (s[x[0]] ? ' checked' : '') + '></label>';
        }).join('') + '</div>' +
        '<label class="help" style="display:block;margin-top:12px">Our emojis (quick buttons above the keyboard, for both of you)<input class="field" id="dm-ours-edit" value="' + esc(ours().join(' ')) + '"></label>' +
        '<div class="btns" style="margin-top:8px"><button type="button" class="btn sm" id="dm-ours-save">💾 Save emojis</button></div>' : '') +
      '<div class="btns" style="flex-direction:column;align-items:stretch;margin-top:14px">' +
        '<button type="button" class="btn ghost" id="dm-sel">☑️ Select messages</button>' +
        '<button type="button" class="btn danger" id="dm-clear">🧹 Clear chat (just for me)</button></div>' +
      '<p class="help" style="text-align:center;margin-top:8px">Long-press a message for reactions, reply, copy, edit, undo send and delete. Double-tap = ❤️. Swipe right = reply.</p>');
    sh.addEventListener('change', function (e) {
      var k = e.target.dataset.set; if (!k) return;
      var p = { settings: {} }; p.settings[k] = e.target.checked; DB.dmMetaSet(p); K.toast('Saved');
    });
    var os = sh.querySelector('#dm-ours-save');
    if (os) os.addEventListener('click', function () {
      var raw = sh.querySelector('#dm-ours-edit').value;
      var arr = (typeof Intl.Segmenter === 'function' ? Array.from(new Intl.Segmenter().segment(raw)).map(function (x) { return x.segment; }) : raw.split(/\s+/)).filter(function (x) { return x.trim(); }).slice(0, 16);
      DB.dmMetaSet({ settings: { emojis: arr } }); K.toast('Emojis saved'); K.closeModal();
    });
    sh.querySelector('#dm-sel').addEventListener('click', function () { K.closeModal(); startSelect(); });
    sh.querySelector('#dm-clear').addEventListener('click', function () {
      K.confirm({ emoji: '🧹', title: 'Clear this chat for you?', text: 'Messages disappear from your screen. ' + NAME[other] + ' still has them.', yes: 'Clear', danger: true }).then(function (ok) {
        if (ok) { myMeta({ clearedAt: Date.now() }); nodes = {}; box.innerHTML = ''; K.toast('Chat cleared'); }
      });
    });
  });

  // ---------------------------------------------------------------- phone keyboard: keep the box above it
  if (window.visualViewport) {
    var vv = window.visualViewport;
    var fit = function () { document.documentElement.style.setProperty('--vvh', vv.height + 'px'); if (atBottom) scrollDown(false); };
    vv.addEventListener('resize', fit); fit();
  }

  // presence while in the chat (the site-wide beat runs too)
  function beat() { if (!document.hidden) myMeta({ at: Date.now(), visible: true, page: 'chat' }); }
  beat(); setInterval(beat, 20000);
  document.addEventListener('visibilitychange', function () { if (document.hidden) myMeta({ at: Date.now(), visible: false, typing: 0 }); else beat(); });

  drawOurs(); listen();
});
