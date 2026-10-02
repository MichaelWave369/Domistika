import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VERSION,
  RECEIPT_SCHEMA,
  buildSymmetryReceipt,
  verifySymmetryReceipt,
  receiptHashAnchor,
} from '../src/v0936/symmetryReceipts.js';
import { bindCreativeBridgeV2ContentHash } from '../src/v093/parallaxBridgeAdapter.js';

assert.equal(VERSION, '0.9.36');
assert.equal(RECEIPT_SCHEMA, 'domistika.symmetry-receipt.v1');

const fixedDirector = {
  seed: 369123,
  paletteId: 'electric-dusk',
  palette: ['#7c3aed', '#22d3ee', '#f472b6', '#fde047'],
  symmetry: 'portal',
  profile: 'cosmic',
  label: 'Portal Fixture',
  recordedAt: '2026-10-02T12:00:00-07:00',
};

const engine = {
  width: 1200,
  height: 1200,
  settings: {
    symmetry: 'recipe:portal',
    symmetryRecipeFormula: 'RADIAL(16) | MIRROR(5.625) | NEST(3,.76,.03) | COUNTERSPIN(5.625) | SPIRAL(2.8,.998,.001)',
    compositionPlateId: 'square-guardians',
    symmetryReceiptDirector: fixedDirector,
  },
  symmetryTransforms: () => [((point) => ({ ...point }))],
};

const recipe = {
  id: 'portal',
  label: 'Portal',
  formula: engine.settings.symmetryRecipeFormula,
  copies: 96,
  truncated: false,
};

const options = {
  engine,
  recipe,
  director: fixedDirector,
  palette: ['#112233'],
  capturedAt: '2026-10-02T12:05:00-07:00',
};

const receiptA = await buildSymmetryReceipt(options);
const receiptB = await buildSymmetryReceipt(options);

assert.equal(receiptA.schema, RECEIPT_SCHEMA);
assert.equal(receiptA.formula, recipe.formula);
assert.equal(receiptA.formulaAuthority, 'plate-regions');
assert.equal(receiptA.plateId, 'square-guardians');
assert.equal(receiptA.seed, 369123);
assert.equal(receiptA.seedSource, 'art-director');
assert.equal(receiptA.paletteSource, 'art-director');
assert.deepEqual(receiptA.palette, fixedDirector.palette);
assert.equal(receiptA.transformCountMode, 'plate-region-max');
assert.equal(receiptA.transformCount, 36);
assert.equal(receiptA.plate.regions.find((region) => region.id === 'corners').excluded, true);
assert.equal(receiptA.plate.regions.find((region) => region.id === 'veil').transformCount, 36);
assert.ok(receiptA.plate.regions.every((region) => 'geometry' in region));
assert.match(receiptA.contentHash, /^sha256:[0-9a-f]{64}$/);
assert.equal(receiptA.contentHash, receiptB.contentHash, 'same state and capturedAt must hash identically');
assert.equal(await verifySymmetryReceipt(receiptA), true);

const tampered = JSON.parse(JSON.stringify(receiptA));
tampered.palette[0] = '#000000';
await assert.rejects(
  verifySymmetryReceipt(tampered),
  /HASH_MISMATCH/,
);

const noDirectorEngine = {
  width: 800,
  height: 600,
  settings: { symmetry: 'vertical', compositionPlateId: null },
  symmetryTransforms: () => [((point) => ({ ...point })), ((point) => ({ ...point, x: 800 - point.x }))],
};
const manualReceipt = await buildSymmetryReceipt({
  engine: noDirectorEngine,
  recipe: null,
  plate: null,
  director: null,
  palette: ['#abcdef', '#abcdef', 'bad'],
  capturedAt: '2026-10-02T12:06:00-07:00',
});
assert.equal(manualReceipt.seed, null);
assert.equal(manualReceipt.seedSource, 'none');
assert.equal(manualReceipt.formulaAuthority, 'legacy-symmetry');
assert.equal(manualReceipt.transformCount, 2);
assert.equal(manualReceipt.transformCountMode, 'legacy-symmetry');
assert.deepEqual(manualReceipt.palette, ['#abcdef']);
assert.equal(manualReceipt.paletteSource, 'favorite-colors');

const dataUri = (value) => 'data:image/png;base64,' + Buffer.from(value).toString('base64');
const anchor = receiptHashAnchor(receiptA);
assert.equal(anchor, 'Symmetry receipt ' + receiptA.contentHash);

const basePayload = {
  protocol: 'parallax-creative-bridge',
  version: 2,
  source: 'domistika',
  target: 'auralith369',
  createdAt: '2026-10-02T12:07:00-07:00',
  name: 'Receipt bridge fixture',
  image: dataUri('base pixels'),
  overlays: [],
  canvas: { width: 1200, height: 1200 },
  palette: receiptA.palette,
  symmetry: 'recipe:portal',
  symmetryReceipt: receiptA,
  note: 'Fixture. ' + anchor + '.',
};

const bridgeA = await bindCreativeBridgeV2ContentHash(basePayload);
assert.match(bridgeA.contentHash, /^sha256:[0-9a-f]{64}$/);
assert.equal(bridgeA.symmetryReceipt.contentHash, receiptA.contentHash);
assert.match(bridgeA.note, new RegExp(receiptA.contentHash.replace(':', '\\:')));

const changedReceiptOnly = JSON.parse(JSON.stringify(basePayload));
changedReceiptOnly.symmetryReceipt.palette = ['#000000'];
const bridgeSameOldManifest = await bindCreativeBridgeV2ContentHash(changedReceiptOnly);
assert.equal(
  bridgeA.contentHash,
  bridgeSameOldManifest.contentHash,
  'Creative Bridge v2 manifest shape must remain backward-compatible and ignore the new receipt object itself',
);

const changedAnchorPayload = {
  ...changedReceiptOnly,
  note: 'Fixture. Symmetry receipt sha256:' + '0'.repeat(64) + '.',
};
const bridgeChangedAnchor = await bindCreativeBridgeV2ContentHash(changedAnchorPayload);
assert.notEqual(
  bridgeA.contentHash,
  bridgeChangedAnchor.contentHash,
  'receipt hash anchor must participate in the existing Creative Bridge v2 manifest hash',
);

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const bridge = fs.readFileSync(new URL('../src/v093/auralithBridge.js', import.meta.url), 'utf8');
const entry = fs.readFileSync(new URL('../src/DomistikaSymmetryReceiptsV0936.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/v0936/symmetryReceiptRuntime.js', import.meta.url), 'utf8');
const docs = fs.readFileSync(new URL('../docs/SYMMETRY_RECEIPTS_V0936.md', import.meta.url), 'utf8');

assert.equal(pkg.version, '0.9.36');
assert.match(pkg.scripts.check, /tests\/v0936-static\.mjs/);
assert.match(index, /DomistikaSymmetryReceiptsV0936\.js/);
assert.match(entry, /symmetryReceiptRuntime\.js/);
assert.match(runtime, /domistikaSymmetryReceiptsV0936/);
assert.match(runtime, /domistika:art-directed/);
assert.match(sdk, /APP_VERSION = '0\.9\.36'/);
assert.match(sdk, /SDK_VERSION = '0\.1\.13'/);
assert.match(sdk, /symmetryReceipts: Object\.freeze/);
assert.match(sdk, /symmetryReceipts: \{/);
assert.match(bridge, /symmetryReceipt/);
assert.match(bridge, /symmetryReceiptHash/);
assert.match(bridge, /receiptHashAnchor/);
assert.match(docs, /formula/);
assert.match(docs, /plate id/i);
assert.match(docs, /seed/);
assert.match(docs, /palette/);
assert.match(docs, /transform count/i);

console.log('Domistika v0.9.36 symmetry receipt contracts passed.');
