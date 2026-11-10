/* tests/check.js: checks the schedule. Run with `node tests/run.js`, or open tests/test.html. */
(function (G) {
  'use strict';
  G.runKiwiTests = function () {
    var T = G.KiwiTime, S = G.SCHEDULE, M = T.build(S), Z = S.zone;
    var results = [];
    function ok(name, pass, detail) { results.push({ name: name, pass: !!pass, detail: detail || '' }); }
    function f(e) { return T.fmtDay(e, Z) + ' ' + T.fmt24(e, Z); }

    // 1. Both-free windows match what we expect
    var got = M.windows.map(function (w) { return f(w.start) + ' → ' + f(w.end); });
    var want = (S.expectBothFree || []).map(function (w) { return f(T.parse(w[0], Z)) + ' → ' + f(T.parse(w[1], Z)); });
    ok('Both-free windows match (' + Z + ')', JSON.stringify(got) === JSON.stringify(want),
      'got:\n  ' + got.join('\n  ') + '\nwant:\n  ' + want.join('\n  '));

    // 2. Every block makes sense
    M.me.forEach(function (g) {
      ok('"' + g.title + '" ends after it starts', g.end > g.start, f(g.start) + ' → ' + f(g.end));
      g.children.forEach(function (c) {
        ok('  "' + c.title + '" sits inside "' + g.title + '"', c.start >= g.start && c.end <= g.end && c.end > c.start, f(c.start) + ' → ' + f(c.end));
      });
      for (var i = 1; i < g.children.length; i++) {
        ok('  "' + g.children[i - 1].title + '" doesn\'t overlap the next one', g.children[i - 1].end <= g.children[i].start);
      }
    });

    // 3. Time-zone sanity (only meaningful for this week's data, so guarded)
    if (Z === 'Asia/Kolkata') {
      var e = T.parse('2026-11-12T13:20', 'Asia/Kolkata');
      ok('Thu 13:20 Chennai = 08:50 Barcelona', T.fmt24(e, 'Europe/Madrid') === '08:50', T.fmt24(e, 'Europe/Madrid'));
      ok('Home: 05:55 Singapore = 03:25 Chennai', T.fmt24(M.homeAt, 'Asia/Kolkata') === '03:25', T.fmt24(M.homeAt, 'Asia/Kolkata'));
      var st = M.statusNow(T.parse('2026-11-13T11:00', Z));
      ok('Fri 11:00: in committee, can text at 12:30', st.kind === 'busy' && st.leaf.title === 'Committee' && T.fmt24(st.until, Z) === '12:30' && st.nextStatus === 'text');
      ok('Fri 12:45: lunch counts as "can text"', M.statusNow(T.parse('2026-11-13T12:45', Z)).kind === 'text');
      ok('Sat 17:00: both free', M.statusNow(T.parse('2026-11-14T17:00', Z)).bothFree === true);
    }
    return results;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
