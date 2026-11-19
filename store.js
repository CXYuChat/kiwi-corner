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
  function defaultHer() { return { missCount: 0, gameBest: 0, opened: {}, lastSeen: 0, seenSurprise: '', guesses: [], wishes: [], bought: {}, seenPoints: 0, messages: [], moods: [], checkins: [], unlockedBonus: {}, movies: null }; }

  // live: small record that changes often (presence, activity, clicker game). Kept apart so her big record isn't rewritten every minute.
  function defaultLive() { return { presence: null, sessions: [], events: [], clicker: null }; }
  var state = defaultState(), her = defaultHer(), user = null, subs = [], photos = [], herPhotos = [], live = defaultLive(), liveDenied = false;
  // DMs: one document per message (collection "dm") + one small "kiwi/dm" record for presence, typing, unread counts and his privacy settings.
  function defaultDmMeta() { return { him: {}, her: {}, unread: { him: 0, her: 0 }, settings: { showOnline: true, showRead: true, showDelivered: true, showTyping: true }, last: null }; }
  var dmMeta = defaultDmMeta(), billing = null;
  function fillMeta(d) { var m = fill(d, defaultDmMeta); m.settings = Object.assign(defaultDmMeta().settings, m.settings || {}); m.unread = Object.assign({ him: 0, her: 0 }, m.unread || {}); return m; }
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
      load(); local.loadPhotos(); local.loadLive(); local.dmLoad();
      var s = null; try { s = localStorage.getItem('kiwi-session'); } catch (e) { /* */ }
      var u = s && userByName(s);
      user = u ? Object.assign({ username: s }, u) : null;
      window.addEventListener('storage', function (e) {
        if (e.key === 'kiwi-db-dm') { local.dmFire(); return; }
        if (e.key === 'kiwi-db-story') { local.storyFire(); return; }
        if (/^kiwi-db-/.test(e.key || '')) { load(); local.loadPhotos(); local.loadLive(); local.dmLoad(); emit(); }
      });
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
    dmLoad: function () {
      var l = []; try { l = JSON.parse(localStorage.getItem('kiwi-db-dm') || '[]'); } catch (e) { /* */ }
      try { dmMeta = fillMeta(JSON.parse(localStorage.getItem('kiwi-db-dmmeta') || 'null')); } catch (e) { dmMeta = defaultDmMeta(); }
      return l;
    },
    dmSave: function (l) { localStorage.setItem('kiwi-db-dm', JSON.stringify(l.slice(-500))); local.dmFire(); },
    dmFire: function () { var l = local.dmLoad(); local.dmSubs.forEach(function (f) { f(l.slice().sort(function (a, b) { return a.at - b.at; })); }); },
    dmSubs: [],
    dmListen: function (limit, cb) { local.dmSubs.push(cb); setTimeout(function () { cb(local.dmLoad().sort(function (a, b) { return a.at - b.at; }).slice(-limit)); }, 0); return function () { local.dmSubs = local.dmSubs.filter(function (f) { return f !== cb; }); }; },
    dmAdd: function (m) { var l = local.dmLoad(); l.push(m); local.dmSave(l); return Promise.resolve(); },
    dmUpdate: function (id, patch) { var l = local.dmLoad().map(function (m) { return m.id === id ? Object.assign({}, m, patch) : m; }); local.dmSave(l); return Promise.resolve(); },
    dmUpdateMany: function (ids, patch) { var l = local.dmLoad().map(function (m) { return ids.indexOf(m.id) !== -1 ? Object.assign({}, m, patch) : m; }); local.dmSave(l); return Promise.resolve(); },
    savePush: function () { return Promise.resolve(); },
    setBilling: function (patch) { billing = Object.assign({}, billing || {}, patch); emit(); return Promise.resolve(); },
    dmMetaSet: function (patch, incFor) {
      local.dmLoad();
      var deep = function (a, b) { var o = Object.assign({}, a || {}); Object.keys(b).forEach(function (k) { o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a && typeof a[k] === 'object' && a[k] && !Array.isArray(a[k])) ? deep(a[k], b[k]) : b[k]; }); return o; };
      dmMeta = deep(dmMeta, patch);
      if (incFor) dmMeta.unread[incFor] = (dmMeta.unread[incFor] || 0) + 1;
      localStorage.setItem('kiwi-db-dmmeta', JSON.stringify(dmMeta)); emit(); return Promise.resolve();
    },
    loadLive: function () { try { live = fill(JSON.parse(localStorage.getItem('kiwi-db-live') || 'null'), defaultLive); } catch (e) { live = defaultLive(); } },
    saveLive: function (patch) { local.loadLive(); live = Object.assign({}, live, patch); localStorage.setItem('kiwi-db-live', JSON.stringify(live)); emit(); return Promise.resolve(); },
    storySubs: [],
    storyLoad: function () { try { return JSON.parse(localStorage.getItem('kiwi-db-story') || '[]'); } catch (e) { return []; } },
    storyFire: function () { var l = local.storyLoad(); local.storySubs.forEach(function (f) { f(l); }); },
    storyListen: function (cb) { local.storySubs.push(cb); setTimeout(function () { cb(local.storyLoad()); }, 0); return function () { local.storySubs = local.storySubs.filter(function (f) { return f !== cb; }); }; },
    storySet: function (m) { var l = local.storyLoad().filter(function (x) { return x.id !== m.id; }).concat([m]); localStorage.setItem('kiwi-db-story', JSON.stringify(l)); local.storyFire(); return Promise.resolve(); },
    storyDel: function (id) { localStorage.setItem('kiwi-db-story', JSON.stringify(local.storyLoad().filter(function (x) { return x.id !== id; }))); local.storyFire(); return Promise.resolve(); },
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
      // Keep a copy on the device so the chat opens instantly (and works on a bad connection).
      try { db.enablePersistence({ synchronizeTabs: true }).catch(function () { /* another tab / private mode */ }); } catch (e) { /* */ }
      fb.db = db;
      fb.dmRef = db.collection('dm');
      fb.dmMetaRef = db.collection('kiwi').doc('dm');
      fb.stateRef = db.collection('kiwi').doc('state');
      fb.photosRef = db.collection('photos');
      fb.herPhotosRef = db.collection('herPhotos');
      fb.herRef = db.collection('kiwi').doc('her');
      fb.liveRef = db.collection('kiwi').doc('live');
      return new Promise(function (resolve) {
        var first = true;
        firebase.auth().onAuthStateChanged(function (fu) {
          fb.unsub.forEach(function (f) { f(); }); fb.unsub = [];
          user = fu ? userByEmail(fu.email) : null;
          var need = user ? 3 : 1, got = 0, done = function () { if (++got === need && first) { first = false; resolve(); } };
          if (!user) her = defaultHer();
          fb.unsub.push(fb.stateRef.onSnapshot(function (d) { state = fill(d.data(), defaultState); emit(); done(); }, function (e) { console.error(e); done(); }));
          photos = []; herPhotos = []; live = defaultLive(); liveDenied = false; dmMeta = defaultDmMeta();
          if (user && user.role === 'admin') fb.unsub.push(db.collection('kiwi').doc('billing').onSnapshot(function (d) { billing = d.data() || null; emit(); }, function () { /* */ }));
          if (user) fb.unsub.push(fb.dmMetaRef.onSnapshot(function (d) { dmMeta = fillMeta(d.data()); emit(); }, function (e) { console.warn('dm meta', e && e.code); }));
          if (user) fb.unsub.push(fb.liveRef.onSnapshot(function (d) { live = fill(d.data(), defaultLive); emit(); done(); }, function (e) {
            // Rules for kiwi/live not published yet: keep the same data inside her record instead.
            console.warn('live doc unavailable, using fallback', e && e.code); liveDenied = true; emit(); done();
          }));
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
    saveLive: function (patch) {
      var clean = JSON.parse(JSON.stringify(patch));
      if (liveDenied) { her = Object.assign({}, her, { live: Object.assign({}, her.live || {}, clean) }); emit(); return fb.herRef.set({ live: clean }, { merge: true }); }
      live = Object.assign({}, live, clean); emit();
      return fb.liveRef.set(clean, { merge: true }).catch(function (e) {
        if (e && e.code === 'permission-denied') { liveDenied = true; return fb.herRef.set({ live: clean }, { merge: true }); }
        throw e;
      });
    },
    dmListen: function (limit, cb) {
      return fb.dmRef.orderBy('at', 'desc').limit(limit).onSnapshot({ includeMetadataChanges: true }, function (q) {
        cb(q.docs.map(function (d) { return Object.assign({ id: d.id, pending: d.metadata.hasPendingWrites }, d.data()); }).reverse());
      }, function (e) { console.error('dm', e); });
    },
    dmAdd: function (m) { var id = m.id, d = Object.assign({}, m); delete d.id; return fb.dmRef.doc(id).set(d); },
    dmUpdate: function (id, patch) { return fb.dmRef.doc(id).set(patch, { merge: true }); },
    dmUpdateMany: function (ids, patch) {
      var b = fb.db.batch(); ids.slice(0, 400).forEach(function (id) { b.set(fb.dmRef.doc(id), patch, { merge: true }); }); return b.commit();
    },
    savePush: function (id, data) { return fb.db.collection('push').doc(id).set(data); },
    setBilling: function (patch) { return fb.db.collection('kiwi').doc('billing').set(patch, { merge: true }); },
    dmMetaSet: function (patch, incFor) {
      var p = JSON.parse(JSON.stringify(patch));
      if (incFor) { p.unread = p.unread || {}; p.unread[incFor] = firebase.firestore.FieldValue.increment(1); }
      return fb.dmMetaRef.set(p, { merge: true });
    },
    storyListen: function (cb) {
      return fb.db.collection('story').onSnapshot(function (q) { cb(q.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); })); }, function (e) { console.error('story', e); cb([]); });
    },
    storySet: function (m) { var d = Object.assign({}, m); delete d.id; return fb.db.collection('story').doc(m.id).set(JSON.parse(JSON.stringify(d))); },
    storyDel: function (id) { return fb.db.collection('story').doc(id).delete(); },
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
  function isPreview() { var pg = document.body && document.body.dataset.page; return !!(user && user.role === 'admin' && pg && pg !== 'admin' && pg !== 'chat' && pg !== 'movie' && pg !== 'story' && pg !== 'calendar'); }
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
    // ---- DMs
    get dmMeta() { return dmMeta; },
    storyListen: function (cb) { return B.storyListen(cb); },
    storySet: function (m) { return B.storySet(m); },
    storyDel: function (id) { return B.storyDel(id); },
    get billing() { return billing; },
    setBilling: function (patch) { return B.setBilling(patch); },
    savePush: function (id, data) { return B.savePush(id, data); },
    dmListen: function (limit, cb) { return B.dmListen(limit, cb); },
    dmSend: function (m) { return B.dmAdd(m); },
    dmUpdate: function (id, patch) { return B.dmUpdate(id, patch); },
    dmUpdateMany: function (ids, patch) { return ids.length ? B.dmUpdateMany(ids, patch) : Promise.resolve(); },
    dmMetaSet: function (patch, incFor) { return B.dmMetaSet(patch, incFor); },
    get live() { return (liveDenied ? fill(her.live, defaultLive) : live); },
    setLive: function (patch) {
      if (isPreview() && Object.keys(patch || {}).some(function (k) { return !/^(adminDevices|watching)$/.test(k); })) { live = Object.assign({}, live, patch); emit(); return Promise.resolve(); }
      return B.saveLive(patch);
    },
    addHerPhoto: function (p) { if (isPreview()) { herPhotos = [p].concat(herPhotos); emit(); return Promise.resolve(); } return B.addHerPhoto(p); },
    deleteHerPhoto: function (id) { return B.deleteHerPhoto(id); },
    updateHerPhoto: function (id, patch) { return B.updateHerPhoto(id, patch); },
    defaults: { state: defaultState, her: defaultHer, live: defaultLive },
    resetLive: function () { var d = defaultLive(); return B.saveLive(d); },
    subscribe: function (f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
    login: function (n, p) { return B.login(n, p).then(function () { try { localStorage.setItem('kiwi-login-at', String(Date.now())); } catch (e) { /* */ } emit(); }); },
    logout: function () { return B.logout().then(function () { emit(); }); },
    // patch = { key: newValue } (top-level keys are replaced)
    setState: function (patch) { state = Object.assign({}, state, patch); emit(); return B.saveState(); },
    // Admin looking at her pages = preview: taps there change only his screen, so she still gets to open everything herself.
    // (The shared movie list is the one thing he can change from her pages.)
    get preview() { return isPreview(); },
    setHer: function (patch) {
      her = Object.assign({}, her, patch); emit();
      if (isPreview() && Object.keys(patch || {}).some(function (k) { return k !== 'movies'; })) return Promise.resolve();
      return B.saveHer();
    },
    resetState: function () { state = defaultState(); emit(); return B.saveState(); },
    resetHer: function () { her = defaultHer(); emit(); return B.saveHer(); }
  };
})();
