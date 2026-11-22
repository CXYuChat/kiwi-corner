// node bump.js → sets a new version in version.json and stamps ?v=<version> on every local script/stylesheet in the HTML pages,
// so phones and browsers always load the fresh files after a publish (instead of an old saved copy).
const fs = require('fs');
const d = new Date(), day = d.toISOString().slice(0, 10);
let old = ''; try { old = JSON.parse(fs.readFileSync('version.json', 'utf8')).v; } catch (e) { /* */ }
const n = old.startsWith(day) ? (+old.split('.')[1] || 0) + 1 : 1;
const v = day + '.' + n;
fs.writeFileSync('version.json', '{ "v": "' + v + '" }\n');
for (const f of fs.readdirSync('.').filter(f => f.endsWith('.html'))) {
  const s = fs.readFileSync(f, 'utf8');
  const out = s.replace(/(<script[^>]+src="|<link[^>]+href=")(?!https?:|\/\/)([^"?#]+\.(?:js|css))(?:\?v=[^"]*)?"/g, (m, a, p) => a + p + '?v=' + v + '"');
  if (out !== s) fs.writeFileSync(f, out);
}
console.log('version', v);
