/* time.js: time-zone helpers and schedule logic. Works in browsers and Node.
   All conversions go through Intl with real IANA zones; nothing hard-codes offsets. */
(function (G) {
  'use strict';
  var MIN = 6e4, HOUR = 36e5, DAY = 864e5;
  var fmts = {};

  function F(key, zone, opts, locale) {
    var k = key + '|' + zone;
    if (!fmts[k]) fmts[k] = new Intl.DateTimeFormat(locale || 'en-US', Object.assign({ timeZone: zone }, opts));
    return fmts[k];
  }

  // Wall-clock parts of an instant in a zone
  function parts(epoch, zone) {
    var o = {};
    F('parts', zone, { hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(new Date(epoch)).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second };
  }

  // Zone offset (ms) at an instant
  function offset(epoch, zone) {
    var p = parts(epoch, zone);
    var whole = epoch - (((epoch % 1000) + 1000) % 1000);
    return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - whole;
  }

  // Wall-clock time in a zone -> epoch ms (day overflow is fine, e.g. d = 32)
  function wall(y, m, d, h, mi, zone) {
    var guess = Date.UTC(y, m - 1, d, h || 0, mi || 0);
    var first = guess - offset(guess, zone);
    return guess - offset(first, zone);
  }

  // "2026-11-12T02:00" or "2026-11-16T05:55@Asia/Singapore"
  function parse(str, zone) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})(?:@(.+))?$/.exec(String(str).trim());
    if (!m) throw new Error('Bad time: ' + str);
    return wall(+m[1], +m[2], +m[3], +m[4], +m[5], m[6] || zone);
  }

  function weekday(epoch, zone) { var p = parts(epoch, zone); return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay(); }
  function startOfDay(epoch, zone) { var p = parts(epoch, zone); return wall(p.y, p.m, p.d, 0, 0, zone); }
  function addDays(epoch, n, zone) { var p = parts(epoch, zone); return wall(p.y, p.m, p.d + n, p.h, p.mi, zone); }
  function dayKey(epoch, zone) {
    var p = parts(epoch, zone);
    return p.y + '-' + String(p.m).padStart(2, '0') + '-' + String(p.d).padStart(2, '0');
  }

  function fmtTime(e, z) { return F('t', z, { hour: 'numeric', minute: '2-digit' }).format(e); }
  function fmtClock(e, z) { return F('c', z, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(e); }
  function fmt24(e, z) { return F('24', z, { hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).format(e); }
  function fmtHour(e, z) { return F('h', z, { hour: 'numeric' }).format(e); }
  function fmtDay(e, z) { return F('d', z, { weekday: 'short', day: 'numeric', month: 'short' }, 'en-GB').format(e); }
  function fmtDayShort(e, z) { return F('ds', z, { weekday: 'short', day: 'numeric' }, 'en-GB').format(e); }

  function pad(n) { return String(n).padStart(2, '0'); }
  function dur(ms) {
    var m = Math.round(ms / MIN), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
    return [d && d + 'd', h && h + 'h', mm && mm + 'm'].filter(Boolean).join(' ') || '0m';
  }
  function countdown(ms) {
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (d) return d + 'd ' + h + 'h ' + pad(m) + 'm ' + pad(sec) + 's';
    if (h) return h + 'h ' + pad(m) + 'm ' + pad(sec) + 's';
    return m + 'm ' + pad(sec) + 's';
  }

  // Always in hours: "37h 12m 05s"
  function hoursLeft(ms) {
    if (ms < 0) ms = 0;
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 3600) + 'h ' + pad(Math.floor((s % 3600) / 60)) + 'm ' + pad(s % 60) + 's';
  }

  // "Pretend it's another time" for testing. Only on localhost or file://, so the gifts can't be peeked at.
  // ?now=2026-11-13T11:00@Asia/Kolkata   or   ?now=2026-11-13T05:30Z
  var skew = 0;
  try {
    var loc = G.location;
    if (loc && /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(loc.hostname)) {
      var q = new URLSearchParams(loc.search).get('now');
      if (q) {
        var t = /Z$/.test(q) ? Date.parse(q) : parse(q, 'Europe/Madrid');
        if (!isNaN(t)) skew = t - Date.now();
      }
    }
  } catch (e) { /* ignore */ }
  function now() { return Date.now() + skew; }

  // ---------------------------------------------------------------- model
  function build(S) {
    var Z = S.zone;
    var P = function (s) { return parse(s, Z); };
    var n = 0;

    function leaf(c, parent, who, at) {
      var conv = at || P;
      return {
        id: (parent ? parent.id : who) + '-' + (n++), who: who, title: c.title, emoji: c.emoji || (parent && parent.emoji) || '',
        desc: c.desc || '', now: c.now || '', start: conv(c.start), end: conv(c.end),
        status: c.status || 'busy', estimated: !!c.estimated, tag: c.tag || (parent && parent.tag) || '', parent: parent || null, children: []
      };
    }

    var me = S.myBlocks.map(function (b, i) {
      var g = leaf(b, null, 'me');
      g.id = b.id || ('me' + i);
      g.children = (b.children || []).map(function (c) { return leaf(c, g, 'me'); });
      return g;
    });

    var cov = { start: P(S.coverage.start), end: P(S.coverage.end) };

    // Livina's recurring weekday block
    var L = S.livina, HZ = L.zone, her = [];
    var day = startOfDay(cov.start - 3 * DAY, HZ), stop = cov.end + 3 * DAY;
    while (day < stop) {
      var p = parts(day + 12 * HOUR, HZ);
      if (L.weekdays.indexOf(weekday(day + 12 * HOUR, HZ)) !== -1) {
        (function (p) {
          var at = function (hm) { var a = hm.split(':'); return wall(p.y, p.m, p.d, +a[0], +a[1], HZ); };
          var g = leaf(L.block, null, 'her', at);
          g.id = 'her-' + dayKey(day + 12 * HOUR, HZ);
          g.children = (L.block.children || []).map(function (c) { return leaf(c, g, 'her', at); });
          her.push(g);
        })(p);
      }
      day = addDays(day, 1, HZ);
    }

    function leaves(gs) { return gs.reduce(function (a, g) { return a.concat(g.children.length ? g.children : [g]); }, []); }
    var meLeaves = leaves(me), herLeaves = leaves(her);

    function myLeafAt(t) {
      var found = null;
      for (var i = 0; i < meLeaves.length; i++) {
        var l = meLeaves[i];
        if (l.start <= t && t < l.end) { if (!found || found.status === 'free') found = l; }
      }
      return found;
    }
    function myStatusAt(t) {
      var l = myLeafAt(t);
      if (l) return l.status;
      return (t >= cov.start && t < cov.end) ? 'free' : 'unknown';
    }
    function herLeafAt(t) {
      for (var i = 0; i < herLeaves.length; i++) if (herLeaves[i].start <= t && t < herLeaves[i].end) return herLeaves[i];
      return null;
    }
    function herBusyAt(t) { return !!herLeafAt(t); }

    // Windows where we're both free (inside the schedule's coverage)
    var pts = [cov.start, cov.end];
    meLeaves.concat(herLeaves).forEach(function (l) {
      [l.start, l.end].forEach(function (t) { if (t > cov.start && t < cov.end) pts.push(t); });
    });
    pts = pts.filter(function (v, i, a) { return a.indexOf(v) === i; }).sort(function (a, b) { return a - b; });
    var windows = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], mid = (a + b) / 2;
      if (myStatusAt(mid) === 'free' && !herBusyAt(mid)) {
        var last = windows[windows.length - 1];
        if (last && last.end === a) last.end = b; else windows.push({ start: a, end: b });
      }
    }

    var myPts = meLeaves.reduce(function (a, l) { return a.concat([l.start, l.end]); }, [cov.start, cov.end])
      .sort(function (a, b) { return a - b; });
    function nextChange(t, from) {
      for (var i = 0; i < myPts.length; i++) if (myPts[i] > t && myStatusAt(myPts[i]) !== from) return myPts[i];
      return null;
    }

    function statusNow(t) {
      if (t < cov.start) return { kind: 'before', until: cov.start };
      if (t >= cov.end) return { kind: 'after' };
      var l = myLeafAt(t), st = l ? l.status : 'free';
      var until = nextChange(t, st);
      return {
        kind: st, leaf: l, group: l ? (l.parent || l) : null, until: until,
        nextStatus: until ? myStatusAt(until) : null, bothFree: st === 'free' && !herBusyAt(t), herLeaf: herLeafAt(t)
      };
    }

    function locationAt(t) {
      var locs = S.locations || [];
      for (var i = 0; i < locs.length; i++) if (P(locs[i].from) <= t && t < P(locs[i].until)) return locs[i];
      return S.home;
    }

    return {
      S: S, zone: Z, herZone: HZ, cov: cov, homeAt: P(S.homeAt), leaveAt: S.leaveAt ? P(S.leaveAt) : null, me: me, her: her, meLeaves: meLeaves, herLeaves: herLeaves,
      windows: windows, myStatusAt: myStatusAt, herBusyAt: herBusyAt, statusNow: statusNow, locationAt: locationAt
    };
  }

  var api = {
    MIN: MIN, HOUR: HOUR, DAY: DAY, parts: parts, wall: wall, parse: parse, weekday: weekday, startOfDay: startOfDay,
    addDays: addDays, dayKey: dayKey, fmtTime: fmtTime, fmtClock: fmtClock, fmt24: fmt24, fmtHour: fmtHour, fmtDay: fmtDay,
    fmtDayShort: fmtDayShort, dur: dur, hoursLeft: hoursLeft, countdown: countdown, now: now, build: build
  };
  G.KiwiTime = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
