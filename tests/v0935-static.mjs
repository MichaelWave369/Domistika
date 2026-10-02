import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VERSION,
  PLATE_SCHEMA,
  plateById,
  listCompositionPlates,
  resolveCompositionRegion,
  isExcludedPoint,
  transformsForSegment,
} from '../src/v0935/compositionPlates.js';

assert.equal(VERSION, '0.9.35');
assert.equal(PLATE_SCHEMA, 'domistika.composition-plate.v1');
assert.deepEqual(listCompositionPlates().map((plate) => plate.id), [
  'mandala',
  'harvest-wheel',
  'portal-gate',
  'square-guardians',
]);

const square = plateById('square-guardians');
assert.ok(square);
assert.equal(square.regions.find((region) => region.id === 'corners').excluded, true);

const width = 1000;
const height = 1000;
assert.equal(resolveCompositionRegion(square, { x: 50, y: 50 }, width, height).id, 'corners');
assert.equal(isExcludedPoint(square, { x: 50, y: 50 }, width, height), true);
assert.equal(resolveCompositionRegion(square, { x: 500, y: 500 }, width, height).id, 'core');

const cornerTransforms = transformsForSegment(
  square,
  { x: 70, y: 70, pressure: 1 },
  { x: 90, y: 90, pressure: 1 },
  width,
  height,
);
assert.equal(cornerTransforms.length, 1, 'protected corners stay identity-only');
assert.deepEqual(cornerTransforms[0]({ x: 80, y: 80 }), { x: 80, y: 80 });

const coreFrom = { x: 500, y: 390, pressure: 1 };
const coreTo = { x: 520, y: 410, pressure: 1 };
const coreTransforms = transformsForSegment(square, coreFrom, coreTo, width, height);
assert.ok(coreTransforms.length > 1, 'core should expand under its regional recipe');
for (const transform of coreTransforms) {
  assert.equal(isExcludedPoint(square, transform(coreFrom), width, height), false);
  assert.equal(isExcludedPoint(square, transform(coreTo), width, height), false);
}

const flankFrom = { x: 120, y: 480, pressure: 1 };
const flankTo = { x: 140, y: 520, pressure: 1 };
const flankTransforms = transformsForSegment(square, flankFrom, flankTo, width, height);
assert.equal(flankTransforms.length, 2, 'flank mirror should keep both channel copies');
for (const transform of flankTransforms) {
  const point = transform({ x: 130, y: 500, pressure: 1 });
  assert.equal(resolveCompositionRegion(square, point, width, height).id, 'flanks');
}

const gateFrom = { x: 490, y: 100, pressure: 1 };
const gateTo = { x: 510, y: 140, pressure: 1 };
const gateTransforms = transformsForSegment(square, gateFrom, gateTo, width, height);
assert.equal(gateTransforms.length, 2, 'crown gate should route top and bottom only');
for (const transform of gateTransforms) {
  const point = transform({ x: 500, y: 120, pressure: 1 });
  assert.equal(resolveCompositionRegion(square, point, width, height).id, 'axes');
}

const bodyFrom = { x: 740, y: 740, pressure: 1 };
const bodyTo = { x: 755, y: 730, pressure: 1 };
const bodyTransforms = transformsForSegment(square, bodyFrom, bodyTo, width, height);
assert.ok(bodyTransforms.length > 1);
for (const transform of bodyTransforms) {
  assert.equal(isExcludedPoint(square, transform(bodyFrom), width, height), false);
  assert.equal(isExcludedPoint(square, transform(bodyTo), width, height), false);
}

assert.equal(plateById('missing'), null);

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const entry = fs.readFileSync(new URL('../src/DomistikaCompositionPlatesV0935.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/v0935/compositionPlateRuntime.js', import.meta.url), 'utf8');
const panel = fs.readFileSync(new URL('../src/v0935/compositionPlatePanel.js', import.meta.url), 'utf8');
const docs = fs.readFileSync(new URL('../docs/COMPOSITION_PLATES_V0935.md', import.meta.url), 'utf8');

assert.equal(pkg.version, '0.9.35');
assert.match(pkg.scripts.check, /tests\/v0935-static\.mjs/);
assert.match(index, /DomistikaCompositionPlatesV0935\.js/);
assert.match(entry, /compositionPlateRuntime\.js/);
assert.match(entry, /compositionPlatePanel\.js/);
assert.match(runtime, /CanvasEngine\.prototype\.drawSegment/);
assert.match(runtime, /CanvasEngine\.prototype\.commitShape/);
assert.match(runtime, /domistikaCompositionPlatesV0935/);
assert.match(panel, /Composition plates/);
assert.match(panel, /Clear plate/);
assert.match(sdk, /APP_VERSION = '0\.9\.35'/);
assert.match(sdk, /SDK_VERSION = '0\.1\.12'/);
assert.match(sdk, /compositionPlates: Object\.freeze/);
assert.match(docs, /Square Guardians/);
assert.match(docs, /capability is not authority/i);

console.log('Domistika v0.9.35 composition plate contracts passed.');
