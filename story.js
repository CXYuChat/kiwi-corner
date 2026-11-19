/* story.js: Our story — days together + a timeline of memories (with photos) that you both can add. */
Kiwi.onReady(function () {
  'use strict';
  var K = window.Kiwi, DB = window.KiwiDB, T = window.KiwiTime, $ = K.$, esc = K.esc;
  if (!DB.user) return;
  var me = DB.user.role === 'admin' ? 'him' : 'her', NAME = { him: 'Chengxuan', her: 'Livina' };
  var mems = [], editing = null, photo = null;

  function daysTogether() { var s = DB.state.storyStart; if (!s) return null; try { return Math.floor((T.now() - T.parse(s + 'T00:00', K.HZ)) / 864e5); } catch (e) { return null; } }
  function niceDate(d) { var p = d.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2], 12)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); }
  function head() {
    var dt = daysTogether();
    $('#st-days').textContent = dt == null ? '💚' : dt.toLocaleString('en-US');
    $('#st-since').textContent = dt == null ? (me === 'him' ? 'Set your "together since" date in admin → ✍️ Write → 📖 Our story' : 'Our story so far') : 'days together since ' + niceDate(DB.state.storyStart) + ' 💚';
  }
  function draw() {
    head();
    var list = mems.slice().sort(function (a, b) { return (a.date || '') < (b.date || '') ? -1 : 1; }), year = '', out = '';
    if (DB.state.storyStart) list.unshift({ id: '_start', date: DB.state.storyStart, emoji: '💚', title: 'The day it all started', fixed: true });
    list.forEach(function (m, i) {
      var y = (m.date || '').slice(0, 4);
      if (y !== year) { year = y; out += '<div class="st-year">' + esc(y) + '</div>'; }
      out += '<article class="st-mem ' + (i % 2 ? 'r' : 'l') + '" id="' + esc(m.id) + '"><div class="st-dot">' + esc(m.emoji || '💚') + '</div><div class="st-card">' +
        (m.img ? '<img src="' + m.img + '" alt="" loading="lazy" data-big="' + esc(m.id) + '">' : '') +
        '<small>' + esc(m.date ? niceDate(m.date) : '') + '</small><b>' + esc(m.title || '') + '</b>' + (m.text ? '<p>' + esc(m.text) + '</p>' : '') +
        (!m.fixed ? '<div class="st-by">added by ' + (m.by === me ? 'you' : NAME[m.by] || '') + ' · <button type="button" class="link-btn" data-edit="' + esc(m.id) + '">edit</button> · <button type="button" class="link-btn" data-del="' + esc(m.id) + '">delete</button></div>' : '') +
        '</div></article>';
    });
    if (!list.length) out = '<div class="card" style="text-align:center"><div style="font-size:2.4rem">📖</div><p class="muted">Your story starts here. Add your first memory: the day you met, your first date, a trip…</p></div>';
    $('#st-line').innerHTML = out;
    if (location.hash.length > 1 && !draw.jumped) { var el = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el) { draw.jumped = true; setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); }, 300); } }
  }
  function openForm(m) {
    editing = m || null; photo = m && m.img || null;
    $('#st-form').hidden = false;
    $('#st-date').value = m ? m.date : K.todayKey(); $('#st-emoji').value = m ? m.emoji || '💚' : '💚';
    $('#st-title').value = m ? m.title || '' : ''; $('#st-text').value = m ? m.text || '' : '';
    $('#st-preview').hidden = !photo; if (photo) $('#st-preview').src = photo;
    $('#st-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('#st-add-btn').addEventListener('click', function () { openForm(null); });
  $('#st-cancel').addEventListener('click', function () { $('#st-form').hidden = true; editing = null; });
  $('#st-file').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    K.toast('Getting the photo ready…');
    K.compressPhoto(f).then(function (d) { photo = d; $('#st-preview').src = d; $('#st-preview').hidden = false; }).catch(function () { K.toast('Couldn\'t read that photo'); });
    e.target.value = '';
  });
  $('#st-save').addEventListener('click', function () {
    var title = $('#st-title').value.trim(), date = $('#st-date').value;
    if (!title || !date) return K.toast('Add a date and a title');
    var m = Object.assign({}, editing || { id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), by: me, at: Date.now() },
      { date: date, emoji: $('#st-emoji').value.trim() || '💚', title: title, text: $('#st-text').value.trim(), img: photo || null, edited: editing ? Date.now() : undefined });
    if (m.edited === undefined) delete m.edited;
    $('#st-save').disabled = true;
    DB.storySet(m).then(function () {
      $('#st-form').hidden = true; $('#st-save').disabled = false; editing = null; photo = null;
      K.toast('Memory saved 📖'); K.confetti({ count: 60 });
      if (me === 'her') K.logEvent('📖', 'Added a memory: ' + title);
    }).catch(function () { $('#st-save').disabled = false; K.toast('Couldn\'t save. Try a smaller photo'); });
  });
  $('#st-line').addEventListener('click', function (e) {
    var ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]'), big = e.target.closest('[data-big]');
    if (ed) openForm(mems.find(function (x) { return x.id === ed.dataset.edit; }));
    if (dl) K.confirm({ emoji: '🗑️', title: 'Delete this memory?', text: 'It disappears for both of you.', yes: 'Delete', danger: true }).then(function (ok) { if (ok) DB.storyDel(dl.dataset.del).then(function () { K.toast('Deleted'); }); });
    if (big) { var m = mems.find(function (x) { return x.id === big.dataset.big; }); if (m) K.modal('<img class="photo-big" src="' + m.img + '" alt=""><h3>' + esc(m.title) + '</h3><p class="help">' + esc(niceDate(m.date)) + '</p>', 'photo-sheet'); }
  });
  DB.storyListen(function (l) { mems = l || []; draw(); });
  DB.subscribe(head); draw();
});
