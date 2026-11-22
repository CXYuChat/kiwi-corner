/* docmode.js: "doc mode" for Chengxuan's chat only. One tap turns the chat into a plain-looking work document
   (white page, menu bar, toolbar, plain paragraphs) so nobody looking over his shoulder sees a cute chat.
   Computer only. Remembered on his computer. Click the blue doc icon (top left) to go back. Livina never sees any of this. */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, $ = K.$;
  var root = document.documentElement;
  var head = $('.dm-head'); if (!head) return;
  // 📲 Ping her (his side only): a pop-up on her screen. Button in the chat header (phone + computer) and in doc mode's toolbar.
  if (DB.user && DB.user.role === 'admin') {
    var QUICK = [['💚', 'Thinking of you'], ['🥺', 'I miss you'], ['📞', 'Call me?'], ['😘', 'Mwah!'], ['🌙', 'Good night baby'], ['☀️', 'Good morning baby']];
    var sendPing = function (emoji, title, text) {
      DB.setState({ ping: { id: 'p' + Math.random().toString(36).slice(2, 9), emoji: emoji, title: title, text: text || '', at: Date.now() } });
      K.closeModal(); K.toast('Ping sent 📲');
    };
    K.pingSheet = function () {
      var sh = K.modal('<h3>📲 Ping her</h3><p class="help" style="margin:0 0 8px">Pops up on her screen right away if she has the site open (or next time she opens it).</p>' +
        '<div class="quick" style="display:flex;flex-wrap:wrap;gap:6px">' + QUICK.map(function (q, i) { return '<button type="button" class="btn sm ghost" data-qping="' + i + '">' + q[0] + ' ' + K.esc(q[1]) + '</button>'; }).join('') + '</div>' +
        '<label class="help" style="display:block;margin-top:10px">Or your own<input class="field" id="pq-title" maxlength="60" placeholder="e.g. Hey you 👀"></label>' +
        '<div class="btns" style="margin-top:8px"><button type="button" class="btn sm pink" id="pq-send">📲 Send ping</button></div>');
      sh.addEventListener('click', function (e) {
        var q = e.target.closest('[data-qping]'); if (q) { var x = QUICK[+q.dataset.qping]; sendPing(x[0], x[1]); return; }
        if (e.target.closest('#pq-send')) { var t = (sh.querySelector('#pq-title').value || '').trim(); if (!t) { K.toast('Write something or tap one above'); return; } sendPing('💚', t); }
      });
    };
    var pbtn = document.createElement('button'); pbtn.type = 'button'; pbtn.className = 'dm-pingbtn'; pbtn.textContent = '📲'; pbtn.title = 'Ping her'; pbtn.setAttribute('aria-label', 'Ping her');
    pbtn.addEventListener('click', function () { K.pingSheet(); });
    head.appendChild(pbtn);
  }
  // computer only: needs a wide screen and a mouse/trackpad (never on phones)
  var desk = window.matchMedia && matchMedia('(min-width: 760px) and (hover: hover) and (pointer: fine)').matches;
  if (!DB.user || DB.user.role !== 'admin' || !desk) { root.classList.remove('docmode'); return; }
  var app = $('#dm-app'), txt = $('#dm-text'); if (!app) return;
  var KEY = 'kiwi-docmode', TITLE = 'Project notes – draft', oldTitle = document.title, oldPh = txt ? txt.placeholder : '';
  var icon = $('link[rel=icon]'), oldIcon = icon ? icon.href : '';
  var DOC_ICON = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6z" fill="#4a7fe0"/><path d="M15 2v5h5" fill="#a9c4f5"/><path d="M9 12h8M9 15h8M9 18h5" stroke="#fff" stroke-width="1.4"/></svg>');

  // the switch in the normal chat header
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'dm-docbtn'; btn.setAttribute('aria-label', 'Doc mode: make the chat look like a work document'); btn.title = 'Doc mode';
  btn.textContent = '📄';
  head.appendChild(btn);

  // the fake document chrome (only shown in doc mode)
  var ch = document.createElement('div'); ch.id = 'doc-chrome'; ch.setAttribute('aria-hidden', 'false');
  ch.innerHTML =
    '<div class="dc-row1"><button type="button" class="dc-icon" id="dc-exit" aria-label="Back to the normal chat"><svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M6 2h9l5 5v15H6z" fill="#4a7fe0"/><path d="M15 2v5h5" fill="#a9c4f5"/><path d="M9 12h8M9 15h8M9 18h5" stroke="#fff" stroke-width="1.4"/></svg></button>' +
      '<div class="dc-titlebox"><div class="dc-title">' + TITLE + '</div><div class="dc-menu"><span>File</span><span>Edit</span><span>View</span><span>Insert</span><span>Format</span><span>Tools</span><span>Help</span></div></div>' +
      '<span class="dc-saved" id="dc-saved">All changes saved</span><button type="button" class="dc-ava" id="dc-ava" title="Livina">L</button><span class="dc-share">Share</span></div>' +
    '<div class="dc-tools"><span>↶</span><span>↷</span><span>🖨</span><i></i><span class="dc-drop">100%</span><i></i><span class="dc-drop">Normal text</span><i></i><span class="dc-drop">Arial</span><i></i><span>−</span><span class="dc-num">11</span><span>+</span><i></i><b>B</b><em>I</em><u>U</u><span>A</span><i></i><button type="button" class="dc-para" id="dc-ping" title="Ping her">Ping</button><button type="button" class="dc-para" id="dc-newest" title="Colour her newest message differently">Highlight newest</button><button type="button" class="dc-para" id="dc-hideme" title="Show only her messages">Hide mine</button><button type="button" class="dc-para" id="dc-clear" title="Clear the page (messages stay in the chat)">Clear</button><select class="dc-plen" id="dc-plen" title="Paragraph length"><option value="0">One paragraph</option><option value="5">New ¶ every 5</option><option value="10">New ¶ every 10</option><option value="20">New ¶ every 20</option><option value="day">New ¶ each day</option></select><button type="button" class="dc-para" id="dc-newp" title="Start a new paragraph from the next message">↵ New ¶</button><button type="button" class="dc-para" id="dc-para" title="Switch between one line per message and one flowing paragraph">¶ Lines</button><span>⋮</span></div>' +
    '<div class="dc-ruler" aria-hidden="true"><div class="dc-ruler-in">' + Array.apply(null, Array(15)).map(function (_, i) { return '<span>' + (i ? i : '') + '</span>'; }).join('') + '</div></div>';
  app.insertBefore(ch, app.firstChild);

  function set(on) {
    root.classList.toggle('docmode', on);
    try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch (e) { /* */ }
    document.title = on ? TITLE : oldTitle;
    if (icon) icon.href = on ? DOC_ICON : oldIcon;
    if (txt) txt.placeholder = on ? '' : oldPh;
    if (on && txt && window.matchMedia('(hover: hover)').matches) setTimeout(function () { try { txt.focus(); } catch (e) { /* */ } }, 50);
    var meta = $('meta[name=theme-color]'); if (meta && on) meta.content = '#f9fbfd';
  }
  btn.addEventListener('click', function () { set(true); });
  $('#dc-exit').addEventListener('click', function () { try { localStorage.removeItem('kiwi-docclear'); } catch (e) { /* */ } set(false); applyClear(); if (K.applyTheme) K.applyTheme(); });
  // ¶ Lines ↔ One paragraph (remembered on his computer)
  var PKEY = 'kiwi-docpara', pb = $('#dc-para');
  function setPara(p) {
    root.classList.toggle('docpara', p);
    try { localStorage.setItem(PKEY, p ? '1' : '0'); } catch (e) { /* */ }
    pb.textContent = p ? '¶ One paragraph' : '¶ Lines'; pb.setAttribute('aria-pressed', p);
  }
  pb.addEventListener('click', function () { setPara(!root.classList.contains('docpara')); var l = $('#dm-list'); if (l) l.scrollTop = l.scrollHeight; });
  var para = true; try { para = localStorage.getItem(PKEY) !== '0'; } catch (e) { /* */ }   // One paragraph unless he picked Lines
  setPara(para);
  // Clear: hides everything up to now from the document page only. Nothing is deleted;
  // going back to the normal chat shows it all again (and resets the clear).
  var CKEY = 'kiwi-docclear', msgs = $('#dm-msgs');
  function cut() { var v = 0; try { v = +localStorage.getItem(CKEY) || 0; } catch (e) { /* */ } return v; }
  function applyClear() {
    var c = root.classList.contains('docmode') ? cut() : 0;
    if (!msgs) return;
    [].forEach.call(msgs.querySelectorAll('.dm-wrap'), function (w) { w.classList.toggle('dc-gone', !!c && +w.dataset.at <= c); });
  }
  $('#dc-ping').addEventListener('click', function () { if (K.pingSheet) K.pingSheet(); });
  $('#dc-clear').addEventListener('click', function () {
    try { localStorage.setItem(CKEY, String(Date.now())); } catch (e) { /* */ }
    applyClear(); var sv2 = $('#dc-saved'); if (sv2) sv2.textContent = 'All changes saved';
  });
  if (msgs && window.MutationObserver) new MutationObserver(applyClear).observe(msgs, { childList: true });
  // Hide mine: the page shows only her messages (remembered)
  var HKEY = 'kiwi-dochideme', hb = $('#dc-hideme');
  function setHide(h) { root.classList.toggle('dochideme', h); try { localStorage.setItem(HKEY, h ? '1' : '0'); } catch (e) { /* */ } hb.textContent = h ? 'Show mine' : 'Hide mine'; hb.setAttribute('aria-pressed', h); }
  hb.addEventListener('click', function () { setHide(!root.classList.contains('dochideme')); });
  var hid = false; try { hid = localStorage.getItem(HKEY) === '1'; } catch (e) { /* */ } setHide(hid);
  // Online: her avatar in the corner, green ring when she's on the site; click for last active
  var ava = $('#dc-ava');
  function herInfo() { var o = ((DB.dmMeta || {}).her) || {}, now = Date.now(), on = !!o.visible && now - (o.at || 0) < 60000; return { on: on, at: o.at || 0 }; }
  function drawAva() { var i = herInfo(); ava.classList.toggle('on', i.on); ava.title = i.on ? 'Livina · online now' : i.at ? 'Livina · last active ' + K.herTime(i.at) : 'Livina'; }
  ava.addEventListener('click', function () {
    var i = herInfo(), m = i.at ? Math.round((Date.now() - i.at) / 60000) : null;
    K.toast(i.on ? '🟢 Livina is online now' : m === null ? 'Livina hasn\'t been on yet' : 'Livina was last active ' + (m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'));
  });
  drawAva(); setInterval(drawAva, 5000); if (DB.subscribe) DB.subscribe(drawAva);
  // Emojis → words in doc mode (the real emoji stays in the chat; only doc mode shows the word)
  var NAMES = { '😘': 'kiss', '😗': 'kiss', '😚': 'kiss', '🥺': 'pleading', '❤️': 'heart', '❤': 'heart', '💚': 'green heart', '💕': 'hearts', '💖': 'sparkly heart', '💗': 'heart', '💞': 'hearts', '🫶': 'heart hands', '🥰': 'smiling with hearts', '😍': 'heart eyes',
    '😂': 'laughing', '🤣': 'laughing', '😭': 'crying', '😢': 'sad', '😊': 'smile', '🙂': 'smile', '😁': 'grin', '😄': 'smile', '😅': 'sweat smile', '😆': 'laughing', '🤭': 'giggle', '🙈': 'shy', '😳': 'blushing', '🥹': 'teary', '🤗': 'hug', '😴': 'sleepy', '🥱': 'yawn',
    '😋': 'yum', '😜': 'wink', '😉': 'wink', '😏': 'smirk', '😎': 'cool', '🤔': 'thinking', '🙄': 'eye roll', '😤': 'huff', '😡': 'angry', '😠': 'angry', '🥲': 'smiling tear', '😌': 'relieved', '🤩': 'starstruck', '😇': 'angel', '🤍': 'heart', '💛': 'heart', '💜': 'heart', '🩷': 'heart',
    '👍': 'thumbs up', '👌': 'ok', '🙏': 'please', '👏': 'clap', '👋': 'wave', '💪': 'strong', '🤞': 'fingers crossed', '🫡': 'salute', '👀': 'eyes', '🔥': 'fire', '✨': 'sparkles', '⭐': 'star', '🌟': 'star', '🎉': 'party', '🥳': 'party',
    '🥝': 'kiwi', '🍿': 'popcorn', '🌙': 'moon', '☀️': 'sun', '🌸': 'flower', '🌿': 'leaf', '🍃': 'leaf', '🎄': 'tree', '🎁': 'gift', '📞': 'call', '💌': 'letter', '☕': 'coffee', '🍵': 'tea', '🐱': 'cat', '🐶': 'dog', '😺': 'cat', '💤': 'zzz', '🥶': 'cold', '🥵': 'hot', '🤒': 'sick', '😷': 'sick', '💯': '100' };
  var EMO = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*/gu;
  function wordify(root2) {
    var walker = document.createTreeWalker(root2, NodeFilter.SHOW_TEXT, null), list = [], n;
    while ((n = walker.nextNode())) { if (!n.parentNode.closest('.dc-emo') && EMO.test(n.nodeValue)) list.push(n); EMO.lastIndex = 0; }
    list.forEach(function (t) {
      var frag = document.createDocumentFragment(), str = t.nodeValue, last = 0;
      str.replace(EMO, function (m, idx) {
        if (idx > last) frag.appendChild(document.createTextNode(str.slice(last, idx)));
        var sp = document.createElement('span'); sp.className = 'dc-emo'; sp.textContent = m; sp.dataset.n = '(' + (NAMES[m] || NAMES[m.replace(/️/g, '')] || 'emoji') + ')'; frag.appendChild(sp);
        last = idx + m.length; return m;
      });
      if (last < str.length) frag.appendChild(document.createTextNode(str.slice(last)));
      t.parentNode.replaceChild(frag, t);
    });
  }
  function wordAll() { if (msgs) [].forEach.call(msgs.querySelectorAll('.dm-bubble'), wordify); }
  if (msgs && window.MutationObserver) new MutationObserver(wordAll).observe(msgs, { childList: true, subtree: true });
  wordAll();
  // Highlight newest: the latest message on the page gets its own colour (remembered)
  var NKEY = 'kiwi-docnewest', nb = $('#dc-newest');
  function markNewest() {
    if (!msgs) return;
    var all = [].filter.call(msgs.querySelectorAll('.dm-wrap'), function (w) { return w.querySelector('.dm-row.them') && getComputedStyle(w).display !== 'none'; });   // her newest only
    [].forEach.call(msgs.querySelectorAll('.dc-newest'), function (w) { w.classList.remove('dc-newest'); });
    var last = all[all.length - 1]; if (last) last.classList.add('dc-newest');
  }
  function setNewest(v) { root.classList.toggle('docnewest', v); try { localStorage.setItem(NKEY, v ? '1' : '0'); } catch (e) { /* */ } nb.setAttribute('aria-pressed', v); markNewest(); }
  nb.addEventListener('click', function () { setNewest(!root.classList.contains('docnewest')); });
  var nv = false; try { nv = localStorage.getItem(NKEY) === '1'; } catch (e) { /* */ } setNewest(nv);
  if (msgs && window.MutationObserver) new MutationObserver(function () { setTimeout(markNewest, 0); }).observe(msgs, { childList: true });
  [hb, $('#dc-clear')].forEach(function (b) { b.addEventListener('click', function () { setTimeout(markNewest, 0); }); });
  // [sent attachment]: click it → a little menu with Show / Hide (just for this message, only in doc mode)
  if (msgs) msgs.addEventListener('click', function (e) {
    if (!root.classList.contains('docmode')) return;
    var b = e.target.closest('.dm-bubble.pic, .dm-audio'); if (!b) return;
    if (e.target.closest('a, [data-play], button')) return;
    e.preventDefault(); e.stopPropagation();
    var shown = b.classList.contains('dc-show');
    document.querySelectorAll('.dc-attmenu').forEach(function (m) { m.remove(); });
    var menu = document.createElement('div'); menu.className = 'dc-attmenu';
    menu.innerHTML = '<button type="button">' + (shown ? 'Hide attachment' : 'Show attachment') + '</button>';
    var r = b.getBoundingClientRect(); menu.style.left = Math.round(r.left) + 'px'; menu.style.top = Math.round(r.bottom + 4) + 'px';
    document.body.appendChild(menu);
    menu.querySelector('button').addEventListener('click', function (ev) { ev.stopPropagation(); b.classList.toggle('dc-show', !shown); menu.remove(); });
    setTimeout(function () { document.addEventListener('click', function off() { menu.remove(); document.removeEventListener('click', off); }); }, 0);
  }, true);
  // Clicking anywhere on the page puts the cursor back in the typing line
  var list = $('#dm-list');
  if (list && txt) list.addEventListener('click', function (e) {
    if (!root.classList.contains('docmode')) return;
    if (e.target.closest('.dm-bubble, a, button, .dc-attmenu') || (window.getSelection && String(getSelection()))) return;
    txt.focus(); try { txt.selectionStart = txt.selectionEnd = txt.value.length; } catch (x) { /* */ }
  });
  // Paragraph length + manual "new paragraph" breaks (One paragraph mode)
  var LKEY = 'kiwi-docplen', BKEY = 'kiwi-docbreaks', sel = $('#dc-plen');
  function getL() { try { return localStorage.getItem(LKEY) || '0'; } catch (e) { return '0'; } }
  function getB() { try { return JSON.parse(localStorage.getItem(BKEY) || '[]'); } catch (e) { return []; } }
  function markBreaks() {
    if (!msgs) return;
    var L = getL(), B = getB(), n = 0, prevDay = null, T = window.KiwiTime;
    var vis = [].filter.call(msgs.querySelectorAll('.dm-wrap'), function (w) { return getComputedStyle(w).display !== 'none'; });
    var prevAt = 0;
    vis.forEach(function (w, i) {
      var at = +w.dataset.at || 0, day = T ? T.fmtDay(at, K.VZ) : '', br = false;
      if (i > 0) {
        if (L === 'day') br = day !== prevDay;
        else if (+L > 0) br = n % +L === 0;
        if (B.some(function (b) { return b >= prevAt && b < at; })) br = true;
      }
      w.classList.toggle('dc-pbreak', br);
      n++; prevDay = day; prevAt = at;
    });
  }
  sel.value = getL();
  sel.addEventListener('change', function () { try { localStorage.setItem(LKEY, sel.value); } catch (e) { /* */ } if (!root.classList.contains('docpara')) setPara(true); markBreaks(); });
  $('#dc-newp').addEventListener('click', function () {
    var B = getB(); B.push(Date.now()); try { localStorage.setItem(BKEY, JSON.stringify(B.slice(-200))); } catch (e) { /* */ }
    if (!root.classList.contains('docpara')) setPara(true);
    markBreaks(); if (txt) txt.focus(); var sv3 = $('#dc-saved'); if (sv3) sv3.textContent = 'All changes saved';
  });
  if (msgs && window.MutationObserver) new MutationObserver(function () { setTimeout(markBreaks, 0); }).observe(msgs, { childList: true });
  [hb, $('#dc-clear')].forEach(function (b) { b.addEventListener('click', function () { setTimeout(markBreaks, 0); }); });
  markBreaks();
  var on = false; try { on = localStorage.getItem(KEY) === '1'; } catch (e) { /* */ }
  set(on); applyClear();
  // "Saving…" flicker when he sends, like a real editor
  var form = $('#dm-form'), sv = $('#dc-saved');
  if (form && sv) form.addEventListener('submit', function () { if (!root.classList.contains('docmode')) return; sv.textContent = 'Saving…'; setTimeout(function () { sv.textContent = 'All changes saved'; }, 900); });
});
