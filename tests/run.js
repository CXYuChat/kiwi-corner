// Run: node tests/run.js
require('../schedule.js');
require('../time.js');
require('./check.js');
const results = globalThis.runKiwiTests();
let failed = 0;
for (const r of results) {
  console.log((r.pass ? '✅ ' : '❌ ') + r.name);
  if (!r.pass) { failed++; if (r.detail) console.log('   ' + r.detail.replace(/\n/g, '\n   ')); }
}
console.log(failed ? `\n${failed} check(s) failed` : `\nAll ${results.length} checks passed 🥝`);
process.exit(failed ? 1 : 0);
