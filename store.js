/* store.js: login + shared data.
   Two documents:
     state: written by admin only (points, gifts, quote, surprise, countdowns…)
     her:   written by Livina or admin (miss-you count, high score, opened gifts, last seen)
   Firebase (live) when KIWI_CONFIG.firebase is set; otherwise localStorage (demo). */
(function () {
  'use strict';
  var C = window.KIWI_CONFIG || { users: {} };
  var FB_VER = '10.12.2';

  function defaultState() {
    return {
      points: 0,
      pointsLog: [],
      // Daily check-in points (she earns them herself). "since": only check-ins after this count for points.
      checkinPoints: { on: true, perDay: 5, extra: 1, extraMax: 5, weekBonus: 10, since: 0 },
      // Nightly call points. "since" = only nights after this moment count.
      autoPoints: { on: true, amount: 15, time: '00:31', zone: 'Asia/Singapore', reason: 'For our call 📞💚', since: Date.UTC(2026, 10, 10, 17, 0), skipped: [] },
      quote: {
        text: 'I came here tonight because when you realize you want to spend the rest of your life with somebody, you want the rest of your life to start as soon as possible.',
        by: 'Harry, When Harry Met Sally (1989)'
      },
      surprise: null,          // { id, emoji, title, text, active }
      statusOverride: null,    // { text, until }
      banner: '',              // short line at the top of Home
      notes: null,             // array overrides notes.js
      gifts: null,             // map overrides gifts.js
      countdowns: [],          // [{ id, emoji, label, at }]  (at = Barcelona wall time)
      featured: 'auto'
    };
  }
  function defaultHer() { return { missCount: 0, gameBest: 0, opened: {}, lastSeen: 0, seenSurprise: '', guesses: [], wishes: [], bought: {}, seenPoints: 0, messages: [], moods: [], checkins: [], unlockedBonus: {} }; }

  var state = defaultState(), her = defaultHer(), user = null, subs = [], photos = [], herPhotos = [];
  function fill(d, def) { var o = def(); if (d) Object.keys(d).forEach(function (k) { if (d[k] !== undefined) o[k] = d[k]; }); return o; }
  function emit() { subs.forEach(function (f) { try { f(state, her, user); } catch (e) { console.error(e); } }); }

  function userByName(name) { return C.users[String(name || '').trim().toLowerCase()] || null; }
  function userByEmail(email) {
    for (var k in C.users) if (C.users[k].email === email) return Object.assign({ username: k }, C.users[k]);
    return null;
  }
  async function sha256(s) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  // ------------------------------------------------------------------ demo backend
  var local = {
    init: function () {
      function load() {
        try { state = fill(JSON.parse(localStorage.getItem('kiwi-db-state') || 'null'), defaultState); } catch (e) { state = defaultState(); }
        try { her = fill(JSON.parse(localStorage.getItem('kiwi-db-her') || 'null'), defaultHer); } catch (e) { her = defaultHer(); }
      }
      load(); local.loadPhotos();
      var s = null; try { s = localStorage.getItem('kiwi-session'); } catch (e) { /* */ }
      var u = s && userByName(s);
      user = u ? Object.assign({ username: s }, u) : null;
      window.addEventListener('storage', function (e) { if (/^kiwi-db-/.test(e.key || '')) { load(); emit(); } });
      return Promise.resolve();
    },
    login: async function (name, pin) {
      var u = userByName(name);
      if (!u) throw new Error('nouser');
      var h = await sha256(String(name).trim().toLowerCase() + ':' + String(pin).trim() + C.pepper);
      if (h !== u.hash) throw new Error('badpass');
      localStorage.setItem('kiwi-session', String(name).trim().toLowerCase());
      user = Object.assign({ username: String(name).trim().toLowerCase() }, u);
    },
    logout: function () { try { localStorage.removeItem('kiwi-session'); } catch (e) { /* */ } user = null; return Promise.resolve(); },
    saveState: function () { localStorage.setItem('kiwi-db-state', JSON.stringify(state)); return Promise.resolve(); },
    saveHer: function () { localStorage.setItem('kiwi-db-her', JSON.stringify(her)); return Promise.resolve(); },
    loadPhotos: function () {
      try { photos = JSON.parse(localStorage.getItem('kiwi-db-photos') || '[]'); } catch (e) { photos = []; }
      try { herPhotos = JSON.parse(localStorage.getItem('kiwi-db-herphotos') || '[]'); } catch (e) { herPhotos = []; }
    },
    updatePhoto: function (id, patch) { local.loadPhotos(); photos = photos.map(function (x) { return x.id === id ? Object.assign({}, x, patch) : x; }); localStorage.setItem('kiwi-db-photos', JSON.stringify(photos)); emit(); return Promise.resolve(); },
    addHerPhoto: function (p) { local.loadPhotos(); herPhotos = [p].concat(herPhotos).slice(0, 30); localStorage.setItem('kiwi-db-herphotos', JSON.stringify(herPhotos)); emit(); return Promise.resolve(); },
    updateHerPhoto: function (id, patch) { local.loadPhotos(); herPhotos = herPhotos.map(function (x) { return x.id === id ? Object.assign({}, x, patch) : x; }); localStorage.setItem('kiwi-db-herphotos', JSON.stringify(herPhotos)); emit(); return Promise.resolve(); },
    deleteHerPhoto: function (id) { local.loadPhotos(); herPhotos = herPhotos.filter(function (x) { return x.id !== id; }); localStorage.setItem('kiwi-db-herphotos', JSON.stringify(herPhotos)); emit(); return Promise.resolve(); },
    addPhoto: function (p) { local.loadPhotos(); photos = [p].concat(photos).slice(0, 30); localStorage.setItem('kiwi-db-photos', JSON.stringify(photos)); emit(); return Promise.resolve(); },
    deletePhoto: function (id) { local.loadPhotos(); photos = photos.filter(function (x) { return x.id !== id; }); localStorage.setItem('kiwi-db-photos', JSON.stringify(photos)); emit(); return Promise.resolve(); }
  };

  // ------------------------------------------------------------------ firebase backend
  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  var fb = {
    stateRef: null, herRef: null, unsub: [],
    init: async function () {
      var base = 'https://www.gstatic.com/firebasejs/' + FB_VER + '/';
      await loadScript(base + 'firebase-app-compat.js');
      await Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-firestore-compat.js')]);
      firebase.initializeApp(C.firebase);
      var db = firebase.firestore();
      fb.stateRef = db.collection('kiwi').doc('state');
      fb.photosRef = db.collection('photos');
      fb.herPhotosRef = db.collection('herPhotos');
      fb.herRef = db.collection('kiwi').doc('her');
      return new Promise(function (resolve) {
        var first = true;
        firebase.auth().onAuthStateChanged(function (fu) {
          fb.unsub.forEach(function (f) { f(); }); fb.unsub = [];
          user = fu ? userByEmail(fu.email) : null;
          var need = user ? 2 : 1, got = 0, done = function () { if (++got === need && first) { first = false; resolve(); } };
          if (!user) her = defaultHer();
          fb.unsub.push(fb.stateRef.onSnapshot(function (d) { state = fill(d.data(), defaultState); emit(); done(); }, function (e) { console.error(e); done(); }));
          photos = []; herPhotos = [];
          if (user) fb.unsub.push(fb.herPhotosRef.orderBy('at', 'desc').limit(30).onSnapshot(function (q) {
            herPhotos = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); emit();
          }, function (e) { console.error(e); }));
          if (user) fb.unsub.push(fb.photosRef.orderBy('at', 'desc').limit(30).onSnapshot(function (q) {
            photos = q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); emit();
          }, function (e) { console.error(e); }));
          if (user) fb.unsub.push(fb.herRef.onSnapshot(function (d) { her = fill(d.data(), defaultHer); emit(); done(); }, function (e) { console.error(e); done(); }));
        });
      });
    },
    login: async function (name, pin) {
      var u = userByName(name);
      if (!u) throw new Error('nouser');
      try { await firebase.auth().signInWithEmailAndPassword(u.email, String(pin).trim() + C.pepper); }
      catch (e) { throw new Error('badpass'); }
      await new Promise(function (r) { var t = setInterval(function () { if (user) { clearInterval(t); r(); } }, 50); setTimeout(function () { clearInterval(t); r(); }, 5000); });
    },
    logout: function () { return firebase.auth().signOut(); },
    saveState: function () { return fb.stateRef.set(JSON.parse(JSON.stringify(state))); },
    saveHer: function () { return fb.herRef.set(JSON.parse(JSON.stringify(her))); },
    addPhoto: function (p) { var id = p.id; var d = Object.assign({}, p); delete d.id; return fb.photosRef.doc(id).set(d); },
    deletePhoto: function (id) { return fb.photosRef.doc(id).delete(); },
    updatePhoto: function (id, patch) { return fb.photosRef.doc(id).set(patch, { merge: true }); },
    addHerPhoto: function (p) { var id = p.id; var d = Object.assign({}, p); delete d.id; return fb.herPhotosRef.doc(id).set(d); },
    deleteHerPhoto: function (id) { return fb.herPhotosRef.doc(id).delete(); },
    updateHerPhoto: function (id, patch) { return fb.herPhotosRef.doc(id).set(patch, { merge: true }); }
  };

  // Local test mode: only on this computer (localhost), opened once with ?demo=1. Never affects the real site.
  var demo = false;
  try {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      if (/[?&]demo=1/.test(location.search)) sessionStorage.setItem('kiwi-demo', '1');
      if (/[?&]demo=0/.test(location.search)) sessionStorage.removeItem('kiwi-demo');
      demo = sessionStorage.getItem('kiwi-demo') === '1';
    }
  } catch (e) { /* */ }
  var B = (C.firebase && !demo) ? fb : local;
  var ready = B.init().catch(function (e) { console.error('KiwiDB init failed', e); });

  window.KiwiDB = {
    mode: (C.firebase && !demo) ? 'live' : 'demo',
    ready: ready,
    get state() { return state; },
    get her() { return her; },
    get user() { return user; },
    get photos() { return photos; },
    addPhoto: function (p) { return B.addPhoto(p); },
    deletePhoto: function (id) { return B.deletePhoto(id); },
    updatePhoto: function (id, patch) { return B.updatePhoto(id, patch); },
    get herPhotos() { return herPhotos; },
    addHerPhoto: function (p) { return B.addHerPhoto(p); },
    deleteHerPhoto: function (id) { return B.deleteHerPhoto(id); },
    updateHerPhoto: function (id, patch) { return B.updateHerPhoto(id, patch); },
    defaults: { state: defaultState, her: defaultHer },
    subscribe: function (f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
    login: function (n, p) { return B.login(n, p).then(function () { emit(); }); },
    logout: function () { return B.logout().then(function () { emit(); }); },
    // patch = { key: newValue } (top-level keys are replaced)
    setState: function (patch) { state = Object.assign({}, state, patch); emit(); return B.saveState(); },
    setHer: function (patch) { her = Object.assign({}, her, patch); emit(); return B.saveHer(); },
    resetState: function () { state = defaultState(); emit(); return B.saveState(); },
    resetHer: function () { her = defaultHer(); emit(); return B.saveHer(); }
  };
})();
