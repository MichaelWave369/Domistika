import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VERSION,
  SCHEMA,
  radialCountFromFormula,
  normalizeAngle,
  sectorIndexAtPoint,
  sectorAngles,
  describeSectorTarget,
  rotationForSectorCopy,
} from '../src/v0941/sectorSurgery.js';
import { plateById } from '../src/v0935/compositionPlates.js';

assert.equal(VERSION, '0.9.41');
assert.equal(SCHEMA, 'domistika.sector-surgery.v1');

assert.equal(radialCountFromFormula('RADIAL(12)'), 12);
assert.equal(radialCountFromFormula('RADIAL(18) | NEST(2,.9,.02)'), 18);
assert.equal(radialCountFromFormula('MIRROR(0)'), 0);
assert.equal(radialCountFromFormula('not valid'), 0);

assert.ok(Math.abs(normalizeAngle(-Math.PI / 2) - Math.PI * 1.5) < 1e-12);

assert.equal(sectorIndexAtPoint({ x: 750, y: 500 }, 1000, 1000, 4), 0);
assert.equal(sectorIndexAtPoint({ x: 500, y: 750 }, 1000, 1000, 4), 1);
assert.equal(sectorIndexAtPoint({ x: 250, y: 500 }, 1000, 1000, 4), 2);
assert.equal(sectorIndexAtPoint({ x: 500, y: 250 }, 1000, 1000, 4), 3);

const angles = sectorAngles(3, 12);
assert.equal(angles.index, 3);
assert.equal(angles.count, 12);
assert.ok(Math.abs(angles.span - Math.PI / 6) < 1e-12);

const mandala = plateById('mandala');
const target = describeSectorTarget(mandala, { x: 600, y: 500 }, 1000, 1000);
assert.equal(target.plateId, 'mandala');
assert.equal(target.regionId, 'core');
assert.equal(target.sectorCount, 12);
assert.equal(target.sectorIndex, 0);

const guardians = plateById('square-guardians');
assert.equal(
  describeSectorTarget(guardians, { x: 50, y: 50 }, 1000, 1000),
  null,
  'protected corner regions must not become surgery targets',
);

const portal = plateById('portal-gate');
assert.equal(
  describeSectorTarget(portal, { x: 120, y: 500 }, 1000, 1000),
  null,
  'mirror-only flank channels are outside radial surgery v0.9.41',
);

assert.ok(Math.abs(rotationForSectorCopy(2, 3, 12) - Math.PI / 6) < 1e-12);
assert.ok(Math.abs(rotationForSectorCopy(3, 2, 12) + Math.PI / 6) < 1e-12);

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/v0941/sectorSurgeryRuntime.js', import.meta.url), 'utf8');
const panel = fs.readFileSync(new URL('../src/v0941/sectorSurgeryPanel.js', import.meta.url), 'utf8');
const selection = fs.readFileSync(new URL('../src/SelectionTransformV04.js', import.meta.url), 'utf8');
const director = fs.readFileSync(new URL('../src/v0934/artDirector.js', import.meta.url), 'utf8');
const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const docs = fs.readFileSync(new URL('../docs/SECTOR_SURGERY_V0941.md', import.meta.url), 'utf8');

assert.ok(Number(pkg.version.split('.')[2]) >= 41);
assert.match(pkg.scripts.check, /tests\/v0941-static\.mjs/);
assert.match(index, /DomistikaSectorSurgeryV0941\.js/);

assert.match(runtime, /originalDrawSegment/);
assert.match(runtime, /originalCommitShape/);
assert.match(runtime, /clearActiveLayerV0941/);
assert.match(runtime, /clipSectorRegion/);
assert.match(runtime, /repair\.ctx\.drawImage\(source\.canvas/);
assert.match(runtime, /engine\.setLayerVisibility\(source\.id, false\)/);
assert.match(runtime, /DOMISTIKA_SECTOR_SURGERY_VISIBLE_SOURCE_REQUIRED/);
assert.match(runtime, /sectorSource = document\.createElement\('canvas'\)/);
assert.match(runtime, /clipSectorRegion\(engine, state, repair\.ctx, targetIndex\)/);
assert.match(runtime, /rotationForSectorCopy/);
assert.match(runtime, /engine\.setLayerLocked\(repair\.id, true\)/);
assert.match(runtime, /sourceVisibilityRestored: true/);
assert.match(runtime, /domistika:v0941-sector-surgery/);

assert.match(panel, /Pick one sector/);
assert.match(panel, /Refold \+ lock/);
assert.match(panel, /Seal only/);
assert.match(panel, /window\.domistikaSelectionV04\?\.disable/);

assert.match(selection, /Sector Surgery repair layer/);
assert.match(selection, /disable: disableSelection/);

assert.match(director, /const lockResult = newLayer && options\.lockResult !== false/);
assert.match(director, /api\.layers\.lock\(targetLayer, true\)/);
assert.match(director, /targetLayerLocked/);

assert.match(sdk, /APP_VERSION = '0\.9\.\d+'/);
assert.match(sdk, /SDK_VERSION = '0\.1\.\d+'/);
assert.match(sdk, /sectorSurgery: Object\.freeze/);
assert.match(sdk, /sectorSurgery: \{/);
assert.match(sdk, /sector\.begin/);
assert.match(sdk, /sector\.refold/);
assert.match(sdk, /sector\.seal/);
assert.match(sdk, /sector\.cancel/);

assert.match(docs, /one radial sector/i);
assert.match(docs, /full paint-layer copy/i);
assert.match(docs, /Refold is deliberately \*\*radial-only\*\*/i);
assert.match(docs, /The exception never silently becomes global authority/i);

console.log('Domistika v0.9.41 sector surgery contracts passed.');
