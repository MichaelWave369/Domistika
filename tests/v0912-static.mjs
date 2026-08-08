import assert from 'node:assert/strict';
import fs from 'node:fs';

const feature = fs.readFileSync(new URL('../src/DomistikaKineticRotationV0912.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);
assert.ok(major > 0 || minor > 9 || (minor === 9 && patch >= 12));
assert.match(index, /DomistikaKineticRotationV0912\.js/);
assert.match(feature, /Three radial bands/);
assert.match(feature, /3·6·9 Portal/);
assert.match(feature, /compositeCanvas\(false\)/);
assert.match(feature, /kinetic-previewing/);
assert.match(feature, /window\.domistikaKineticRotationV0912/);
assert.match(feature, /original artwork unchanged/);

console.log('v0.9.12+ kinetic rotation static checks passed');
