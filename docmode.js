/* docmode.js: "doc mode" for Chengxuan's chat only. One tap turns the chat into a plain-looking work document
   (white page, menu bar, toolbar, plain paragraphs) so nobody looking over his shoulder sees a cute chat.
   Computer only. Remembered on his computer. Click the blue doc icon (top left) to go back. Livina never sees any of this. */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, $ = K.$;
  var root = document.documentElement;
  // computer only: needs a wide screen and a mouse/trackpad (never on phones)
  var desk = window.matchMedia && matchMedia('(min-width: 760px) and (hover: hover) and (pointer: fine)').matches;
  if (!DB.user || DB.user.role !== 'admin' || !desk) { root.classList.remove('docmode'); return; }
  var head = $('.dm-head'), app = $('#dm-app'), txt = $('#dm-text'); if (!head || !app) return;
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
      '<span class="dc-saved" id="dc-saved">All changes saved</span><span class="dc-share">Share</span></div>' +
    '<div class="dc-tools"><span>↶</span><span>↷</span><span>🖨</span><i></i><span class="dc-drop">100%</span><i></i><span class="dc-drop">Normal text</span><i></i><span class="dc-drop">Arial</span><i></i><span>−</span><span class="dc-num">11</span><span>+</span><i></i><b>B</b><em>I</em><u>U</u><span>A</span><i></i><button type="button" class="dc-para" id="dc-clear" title="Clear the page (messages stay in the chat)">Clear</button><button type="button" class="dc-para" id="dc-para" title="Switch between one line per message and one flowing paragraph">¶ Lines</button><span>⋮</span></div>' +
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
  $('#dc-clear').addEventListener('click', function () {
    try { localStorage.setItem(CKEY, String(Date.now())); } catch (e) { /* */ }
    applyClear(); var sv2 = $('#dc-saved'); if (sv2) sv2.textContent = 'All changes saved';
  });
  if (msgs && window.MutationObserver) new MutationObserver(applyClear).observe(msgs, { childList: true });
  var on = false; try { on = localStorage.getItem(KEY) === '1'; } catch (e) { /* */ }
  set(on); applyClear();
  // "Saving…" flicker when he sends, like a real editor
  var form = $('#dm-form'), sv = $('#dc-saved');
  if (form && sv) form.addEventListener('submit', function () { if (!root.classList.contains('docmode')) return; sv.textContent = 'Saving…'; setTimeout(function () { sv.textContent = 'All changes saved'; }, 900); });
});
