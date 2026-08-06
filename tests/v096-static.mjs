import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('../src/DomistikaPerformanceV096.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

assert.equal(pkg.version, '0.9.6');
assert.match(index, /DomistikaPerformanceV096\.js/);
assert.match(pkg.scripts.check, /v096-static\.mjs/);
assert.match(runtime, /installAcceleratedLayers/);
assert.match(runtime, /desynchronized: true/);
assert.match(runtime, /installSymmetryCache/);
assert.match(runtime, /MAX_TOTAL_STAMPS_PER_FRAME/);
assert.match(runtime, /requestAnimationFrame/);
assert.match(runtime, /copyLayerCanvas/);
assert.match(runtime, /batchSymmetryFill/);
assert.match(runtime, /claimed = new Uint8Array/);
assert.match(runtime, /offsetParent !== null/);
assert.doesNotMatch(runtime, /toDataURL\('image\/png'\).*undoStack/s);

console.log('Domistika v0.9.6 performance contracts passed');
