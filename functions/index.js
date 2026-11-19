/* Kiwi Corner server: real phone notifications (Web Push) + the monthly spending cap.
   Runs on Firebase (Blaze plan). Region matches the database (europe-west1). */
const { onDocumentCreated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onMessagePublished } = require('firebase-functions/v2/pubsub');
const { defineSecret } = require('firebase-functions/params');
const { setGlobalOptions, logger } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const webpush = require('web-push');

admin.initializeApp();
const db = admin.firestore();
const VAPID_PRIVATE = defineSecret('VAPID_PRIVATE');
const VAPID_PUBLIC = 'BNFUtb89SZTprIvGwj5WEvaeEOO5u5IvVlvCJCOX6I5M3dLV5pxcUTfCm5Lo40MqJbdEGuAnZhwPBGbGXVqdZM8';
const PROJECT = 'kiwi-corner';
const SITE = 'https://mywifelivina.com';
setGlobalOptions({ region: 'europe-west1', maxInstances: 2, memory: '256MiB', secrets: [VAPID_PRIVATE] });

const NAME = { him: 'Chengxuan 🥝', her: 'Livina 🌸' };
const other = (w) => (w === 'him' ? 'her' : 'him');
const clip = (s, n = 140) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// ------------------------------------------------------------ sending
async function push(who, { title, body, url = '/', tag }) {
  webpush.setVapidDetails('mailto:noreply@mywifelivina.com', VAPID_PUBLIC, VAPID_PRIVATE.value());
  const subs = await db.collection('push').where('who', '==', who).get();
  const payload = JSON.stringify({ title, body: body || '', url: SITE + url, tag: tag || undefined });
  await Promise.all(subs.docs.map(async (d) => {
    try { await webpush.sendNotification(d.data().sub, payload, { TTL: 86400, urgency: 'high' }); }
    catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await d.ref.delete();   // phone unsubscribed
      else logger.warn('push failed', e.statusCode, e.body);
    }
  }));
}
// Is this person looking at the chat right now? (then no buzz for chat messages)
async function inChat(who) {
  const m = (await db.doc('kiwi/dm').get()).data() || {};
  const p = m[who] || {};
  return p.visible && p.page === 'chat' && Date.now() - (p.at || 0) < 45000;
}
async function log() { return db.doc('kiwi/pushlog'); }

// ------------------------------------------------------------ chat messages
exports.onDm = onDocumentCreated('dm/{id}', async (ev) => {
  const m = ev.data && ev.data.data(); if (!m || !m.from) return;
  const to = other(m.from);
  if (await inChat(to)) return;
  await push(to, { title: NAME[m.from], body: m.audio ? '🎙️ Voice message' : m.img ? '📷 Photo' + (m.text ? ': ' + clip(m.text) : '') : clip(m.text, 300), url: '/chat.html', tag: 'dm' });
});

// ------------------------------------------------------------ things he sends her (pings, surprises, points, questions, kiwis)
exports.onState = onDocumentWritten('kiwi/state', async (ev) => {
  const b = (ev.data.before && ev.data.before.data()) || {}, a = (ev.data.after && ev.data.after.data()) || {};
  const jobs = [];
  if (a.ping && a.ping.id && (!b.ping || b.ping.id !== a.ping.id)) jobs.push(push('her', { title: (a.ping.emoji || '💚') + ' ' + (a.ping.title || 'Chengxuan says…'), body: a.ping.text || 'From Chengxuan', url: '/', tag: 'ping' }));
  if (a.surprise && a.surprise.active && (!b.surprise || b.surprise.id !== a.surprise.id || !b.surprise.active)) jobs.push(push('her', { title: '💌 You have a surprise!', body: 'Tap to open it', url: '/', tag: 'surprise' }));
  const bl = (b.pointsLog || []).length, al = (a.pointsLog || []).length;
  if (al > bl) {
    const got = (a.pointsLog || []).slice(bl).filter((x) => x.amt > 0 && !x.auto);
    const sum = got.reduce((s, x) => s + x.amt, 0);
    if (sum > 0) jobs.push(push('her', { title: '⭐ +' + sum + ' points!', body: got.map((x) => x.reason).filter(Boolean).join(' · ') || 'From Chengxuan 💚', url: '/gifts.html', tag: 'points' }));
  }
  const bq = (b.questions || []).length, aq = (a.questions || []).length;
  if (aq > bq) { const q = a.questions[aq - 1]; jobs.push(push('her', { title: '❓ Chengxuan asks…', body: clip(String(q.text || '').replace(/\{name\}/g, 'baby')), url: '/', tag: 'question' })); }
  const bg = (b.clickerGifts || []).length, ag = (a.clickerGifts || []).length;
  if (ag > bg) { const g = a.clickerGifts[ag - 1]; if (g.amount > 0) jobs.push(push('her', { title: '🎁 ' + g.amount + ' kiwis for you!', body: g.note || 'Open Kiwi Clicker', url: '/clicker.html', tag: 'kiwis' })); }
  await Promise.all(jobs);
});

// ------------------------------------------------------------ photos
exports.onPhoto = onDocumentCreated('photos/{id}', async (ev) => {
  const p = ev.data && ev.data.data(); if (!p) return;
  await push('her', p.bonus ? { title: '🎁 New bonus photo!', body: 'Send a selfie to unlock it 📸', url: '/', tag: 'photo' } : { title: '📸 Photo of the day', body: p.caption || 'From Chengxuan', url: '/', tag: 'photo' });
});
exports.onHerPhoto = onDocumentCreated('herPhotos/{id}', async () => {
  await push('him', { title: '📸 Livina sent a selfie', body: 'Approve it to unlock her bonus photo', url: '/admin.html', tag: 'selfie' });
});

// ------------------------------------------------------------ what she does (for him) + his replies to her letters (for her)
exports.onHer = onDocumentWritten('kiwi/her', async (ev) => {
  const b = (ev.data.before && ev.data.before.data()) || {}, a = (ev.data.after && ev.data.after.data()) || {};
  const jobs = [];
  const bm = b.messages || [], am = a.messages || [];
  if (am.length > bm.length) { const m = am[am.length - 1]; jobs.push(push('him', { title: '💌 Livina wrote you a letter', body: clip(m.text, 200), url: '/admin.html', tag: 'letter' })); }
  const before = {}; bm.forEach((m) => { before[m.id] = m; });
  am.forEach((m) => { const o = before[m.id]; if (o && m.reply && m.reply !== o.reply) jobs.push(push('her', { title: '↩️ Chengxuan answered your letter', body: clip(m.reply, 200), url: '/fun.html', tag: 'letter-reply' })); });
  if ((a.checkins || []).length > (b.checkins || []).length) {
    const md = (a.moods || [])[(a.moods || []).length - 1];
    const fresh = md && Date.now() - md.at < 60000;
    jobs.push(push('him', { title: '✅ Livina checked in', body: fresh ? 'Feeling ' + md.mood + (md.note ? ' · "' + clip(md.note, 100) + '"' : '') : 'Daily check-in done', url: '/admin.html', tag: 'checkin' }));
  }
  const ba = b.answers || {}, aa = a.answers || {};
  Object.keys(aa).forEach((k) => { if (!ba[k] || ba[k].at !== aa[k].at) jobs.push(push('him', { title: '❓ Livina answered your question', body: aa[k].note ? '"' + clip(aa[k].note, 120) + '"' : 'Open admin to see her answer', url: '/admin.html', tag: 'answer' })); });
  if ((a.wishes || []).length > (b.wishes || []).length) jobs.push(push('him', { title: '💭 New wish from Livina', body: clip(a.wishes[a.wishes.length - 1].text), url: '/admin.html', tag: 'wish' }));
  if ((a.guesses || []).length > (b.guesses || []).length) jobs.push(push('him', { title: '🤔 Livina guessed a present', body: clip(a.guesses[a.guesses.length - 1].text), url: '/admin.html', tag: 'guess' }));
  const bo = b.opened || {}, ao = a.opened || {};
  if (Object.keys(ao).length > Object.keys(bo).length) jobs.push(push('him', { title: '🎁 Livina opened a present!', body: 'She just unwrapped it', url: '/admin.html', tag: 'gift' }));
  // Santa's Golden Key
  const bk = b.xmasKey || {}, ak = a.xmasKey || {};
  if (ak.got && !bk.got) jobs.push(push('him', { title: '🔑 Livina found every Christmas secret!', body: 'She earned Santa\'s Golden Key (one free present of her choice)', url: '/admin.html', tag: 'xmaskey' }));
  if (ak.used && !bk.used) jobs.push(push('him', { title: '🔑 Livina used Santa\'s Golden Key', body: 'She unlocked a present with it 🎁', url: '/admin.html', tag: 'xmaskey' }));
  // open-when letters she opened
  const bl2 = {}; (b.letters || []).forEach((l) => { bl2[l.id] = l; });
  (a.letters || []).forEach((l) => { const o = bl2[l.id]; if (l.openedAt && (!o || !o.openedAt)) jobs.push(push('him', { title: '💌 Livina opened a letter', body: '"Open when ' + clip(l.when, 60) + '"', url: '/admin.html', tag: 'letter-open' })); });
  // new open-when letter for her
  if ((a.letters || []).length > (b.letters || []).length) jobs.push(push('her', { title: '💌 A new letter from Chengxuan', body: 'Open when ' + clip((a.letters[a.letters.length - 1] || {}).when, 60), url: '/fun.html', tag: 'letter-new' }));
  // question of the day: her answer → him (he can peek), his answer → her
  const bd = (b.qotd || {}).days || {}, ad = (a.qotd || {}).days || {};
  Object.keys(ad).forEach((k) => {
    const x = ad[k] || {}, y = bd[k] || {};
    if (x.her && (!y.her || y.her.at !== x.her.at)) jobs.push(push('him', { title: '❓ Livina answered today\'s question', body: clip(x.her.text, 160), url: '/admin.html', tag: 'qotd' }));
    if (x.him && (!y.him || y.him.at !== x.him.at)) jobs.push(push('her', { title: '❓ Chengxuan answered too!', body: 'See both answers on your Home page', url: '/', tag: 'qotd' }));
  });
  if ((a.missCount || 0) > (b.missCount || 0)) {
    const ref = await log(), l = (await ref.get()).data() || {};
    if (Date.now() - (l.lastMiss || 0) > 10 * 60000) { await ref.set({ lastMiss: Date.now() }, { merge: true }); jobs.push(push('him', { title: '🥺 Livina misses you', body: 'She pressed "I miss you" (' + a.missCount + ' times so far)', url: '/admin.html', tag: 'miss' })); }
  }
  await Promise.all(jobs);
});

// ------------------------------------------------------------ movie night started → her
exports.onDmMeta = onDocumentWritten('kiwi/dm', async (ev) => {
  const b = (ev.data.before && ev.data.before.data()) || {}, a = (ev.data.after && ev.data.after.data()) || {};
  const am = a.movie || {}, bm = b.movie || {};
  if (am.active && am.id !== bm.id) await push(am.by === 'her' ? 'him' : 'her', { title: '🍿 Movie night!', body: (am.by === 'her' ? 'Livina' : 'Chengxuan') + ' wants to watch ' + clip(am.title, 60) + ' with you. Tap to join', url: '/movie.html', tag: 'movie' });
});
// ------------------------------------------------------------ a new memory in Our story → the other one
exports.onStory = onDocumentCreated('story/{id}', async (ev) => {
  const m = ev.data && ev.data.data(); if (!m) return;
  await push(m.by === 'her' ? 'him' : 'her', { title: '📖 New memory in Our story', body: clip(m.title, 100), url: '/story.html#' + ev.params.id, tag: 'story' });
});

// ------------------------------------------------------------ she opens the site (for him)
exports.onLive = onDocumentWritten('kiwi/live', async (ev) => {
  const b = (ev.data.before && ev.data.before.data()) || {}, a = (ev.data.after && ev.data.after.data()) || {};
  const pa = a.presence, pb = b.presence || {};
  if (!pa || !pa.visible || pa.sessId === pb.sessId) return;
  if (pb.at && pa.start - pb.at < 10 * 60000) return;   // just moved between pages
  await push('him', { title: '🟢 Livina is on Kiwi Corner', body: 'On ' + (pa.page || 'the site') + ' · ' + (pa.device || ''), url: '/admin.html', tag: 'online' });
});

// ------------------------------------------------------------ scheduled items go out on time (checked every minute)
exports.dispatch = onSchedule({ schedule: 'every 1 minutes', timeZone: 'Europe/Madrid' }, async () => {
  const st = (await db.doc('kiwi/state').get()).data() || {};
  const now = Date.now(), due = (st.scheduled || []).filter((s) => s.at <= now && now - s.at < 6 * 3600e3);
  if (!due.length) return;
  const ref = await log(), l = (await ref.get()).data() || {}, sent = l.sent || [];
  const todo = due.filter((s) => sent.indexOf(s.id) === -1);
  if (!todo.length) return;
  await ref.set({ sent: sent.concat(todo.map((s) => s.id)).slice(-300) }, { merge: true });
  await Promise.all(todo.map((s) => {
    const d = s.data || {};
    if (s.type === 'ping') return push('her', { title: (d.emoji || '💚') + ' ' + (d.title || 'Chengxuan says…'), body: d.text || 'From Chengxuan', url: '/', tag: 'ping' });
    if (s.type === 'surprise') return push('her', { title: '💌 You have a surprise!', body: 'Tap to open it', url: '/', tag: 'surprise' });
    if (s.type === 'points' && d.amt > 0) return push('her', { title: '⭐ +' + d.amt + ' points!', body: d.reason || 'From Chengxuan 💚', url: '/gifts.html', tag: 'points' });
    if (s.type === 'question') return push('her', { title: '❓ Chengxuan asks…', body: clip(String(d.text || '').replace(/\{name\}/g, 'baby')), url: '/', tag: 'question' });
    if (s.type === 'kiwis' && d.amount > 0) return push('her', { title: '🎁 ' + d.amount + ' kiwis for you!', body: d.note || 'Open Kiwi Clicker', url: '/clicker.html', tag: 'kiwis' });
    if (s.type === 'banner') return push('her', { title: '🥝 Kiwi Corner', body: d.text || '', url: '/', tag: 'banner' });
    return null;
  }));
});

// ------------------------------------------------------------ spending cap (budget reports arrive a few times a day)
// Warnings at S$1 / S$3 / S$5 (phone + email), at S$10 he's asked whether to stop there, at S$15 billing switches off.
async function disableBilling(reason) {
  const tok = await admin.credential.applicationDefault().getAccessToken();
  const r = await fetch('https://cloudbilling.googleapis.com/v1/projects/' + PROJECT + '/billingInfo', {
    method: 'PUT', headers: { Authorization: 'Bearer ' + tok.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ billingAccountName: '' })
  });
  const ok = r.ok; logger.warn('billing disabled', reason, r.status);
  await db.doc('kiwi/billing').set({ disabledAt: Date.now(), disabledReason: reason, disableOk: ok }, { merge: true });
  return ok;
}
async function checkCap(b) {
  const cap = b.capAt === 10 ? 10 : 15;
  if ((b.cost || 0) >= cap && !b.disabledAt) {
    await push('him', { title: '🛑 Spending cap reached (S$' + cap + ')', body: 'Billing is now switched off. Notifications stop until you turn it back on.', url: '/admin.html', tag: 'billing' });
    await disableBilling('cost ' + b.cost + ' >= cap ' + cap);
  }
}
exports.budget = onMessagePublished('billing-alerts', async (ev) => {
  const d = ev.data.message.json || {};
  const cost = +d.costAmount || 0, month = String(d.costIntervalStart || '').slice(0, 7);
  const ref = db.doc('kiwi/billing'), b = (await ref.get()).data() || {};
  const fresh = b.month !== month;   // new month: start over
  const told = fresh ? [] : (b.told || []);
  const upd = { cost, budget: +d.budgetAmount || 15, currency: d.currencyCode || 'SGD', at: Date.now(), month };
  if (fresh) { upd.told = []; upd.asked10 = false; upd.capAt = b.capKeep ? b.capAt || null : null; }
  for (const lvl of [1, 3, 5]) {
    if (cost >= lvl && told.indexOf(lvl) === -1) { told.push(lvl); await push('him', { title: '💳 Kiwi Corner has cost S$' + cost.toFixed(2) + ' this month', body: 'Warning at S$' + lvl + '. It switches off by itself at S$15.', url: '/admin.html', tag: 'billing' }); }
  }
  upd.told = told;
  if (cost >= 10 && !(fresh ? false : b.asked10)) {
    upd.asked10 = true;
    await push('him', { title: '💳 S$10 reached this month', body: 'Stop here, or keep going to S$15? Tap to choose.', url: '/admin.html', tag: 'billing' });
  }
  await ref.set(upd, { merge: true });
  await checkCap(Object.assign({}, b, upd));
});
// He tapped "Stop at S$10" in admin: act straight away if already past it.
exports.onBilling = onDocumentWritten('kiwi/billing', async (ev) => {
  const b = ev.data.after && ev.data.after.data(), p = (ev.data.before && ev.data.before.data()) || {};
  if (!b || b.capAt === p.capAt) return;
  await checkCap(b);
});
