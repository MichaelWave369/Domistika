import assert from 'node:assert/strict';
import fs from 'node:fs';

const accessible = fs.readFileSync(new URL('../src/DomistikaAccessibleInputV0919.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);
assert.ok(major > 0 || minor > 9 || (minor === 9 && patch >= 19));
assert.match(index, /DomistikaAccessibleInputV0919\.js/);
assert.ok(index.indexOf('DomistikaVisualPerformanceV0918.js') < index.indexOf('DomistikaAccessibleInputV0919.js'));
assert.ok(index.indexOf('DomistikaAccessibleInputV0919.js') < index.indexOf('main.js'));

assert.match(accessible, /Sticky Draw/);
assert.match(accessible, /Polyline/);
assert.match(accessible, /Shift\+D/);
assert.match(accessible, /Shift\+P/);
assert.match(accessible, /pointercancel/);
assert.match(accessible, /pointerleave/);
assert.match(accessible, /double-click/);
assert.match(accessible, /Backspace|backspace/);
assert.match(accessible, /domistika:accessible-input-ready/);
assert.match(accessible, /window\.domistikaAccessibleInputV0919/);
assert.match(accessible, /captureHistory\(\)/);
assert.match(accessible, /markChanged/);

console.log('v0.9.19 Accessible Input static checks passed');
