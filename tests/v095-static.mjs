import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const stage = await readFile(new URL('../src/v095/TextMeshStage.js', import.meta.url), 'utf8');
const bridge = await readFile(new URL('../src/DomistikaTextMeshV095.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

assert.match(stage, /TextGeometry/);
assert.match(stage, /TransformControls/);
assert.match(stage, /GLTFExporter/);
assert.match(stage, /capturePng/);
assert.match(stage, /exportGlb/);
assert.match(bridge, /textMeshStudio/);
assert.match(bridge, /Bake to active layer/);
assert.match(bridge, /Export GLB/);
assert.match(index, /DomistikaTextMeshV095\.js/);
assert.equal(pkg.version, '0.9.5');
assert.match(pkg.scripts.check, /v095-static\.mjs/);
console.log('Domistika v0.9.5 static contract passed');
