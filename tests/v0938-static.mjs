import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VERSION,
  DRAFTING_GUIDE_SCHEMA,
  GUIDE_KINDS,
  normalizeDraftingGuide,
  guideGeometry,
  beginDraftingSnap,
  snapDraftingPoint,
} from '../src/v0938/draftingGuides.js';

assert.equal(VERSION, '0.9.38');
assert.equal(DRAFTING_GUIDE_SCHEMA, 'domistika.drafting-guide.v1');
assert.deepEqual(GUIDE_KINDS, ['horizontal-ruler', 'vertical-ruler', 'ellipse', 'one-point']);

const horizontal = normalizeDraftingGuide('horizontal-ruler', { position: 0.25 });
const hSnap = snapDraftingPoint(horizontal, { x: 780, y: 999, pressure: 0.7 }, 1200, 800);
assert.equal(hSnap.x, 780);
assert.equal(hSnap.y, 200);
assert.equal(hSnap.pressure, 0.7);

const vertical = normalizeDraftingGuide('vertical-ruler', { position: 0.75 });
const vSnap = snapDraftingPoint(vertical, { x: 10, y: 300, pressure: 0.5 }, 1200, 800);
assert.equal(vSnap.x, 900);
assert.equal(vSnap.y, 300);
assert.equal(vSnap.pressure, 0.5);

const ellipse = normalizeDraftingGuide('ellipse', { cx: 0.5, cy: 0.5, rx: 0.25, ry: 0.2 });
const ellipseGeometry = guideGeometry(ellipse, 1000, 800);
assert.deepEqual(ellipseGeometry, { cx: 500, cy: 400, rx: 250, ry: 160 });
const eSnap = snapDraftingPoint(ellipse, { x: 900, y: 400, pressure: 1 }, 1000, 800);
assert.ok(Math.abs(eSnap.x - 750) < 1e-9);
assert.ok(Math.abs(eSnap.y - 400) < 1e-9);

const perspective = normalizeDraftingGuide('one-point', { horizonY: 0.5, vanishingX: 0.5 });
const session = beginDraftingSnap(perspective, { x: 800, y: 400 }, 1000, 800);
assert.ok(Math.abs(session.ux - 1) < 1e-9);
assert.ok(Math.abs(session.uy) < 1e-9);
const pSnap = snapDraftingPoint(perspective, { x: 700, y: 620, pressure: 0.8 }, 1000, 800, session);
assert.ok(Math.abs(pSnap.x - 700) < 1e-9);
assert.ok(Math.abs(pSnap.y - 400) < 1e-9);
assert.equal(pSnap.pressure, 0.8);

const clamped = normalizeDraftingGuide('one-point', { horizonY: 9, vanishingX: -2 });
assert.equal(clamped.horizonY, 0.95);
assert.equal(clamped.vanishingX, 0.02);

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/v0938/draftingGuideRuntime.js', import.meta.url), 'utf8');
const panel = fs.readFileSync(new URL('../src/v0938/draftingGuidePanel.js', import.meta.url), 'utf8');
const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const guideLayer = fs.readFileSync(new URL('../src/v090/guideLayer.js', import.meta.url), 'utf8');
const docs = fs.readFileSync(new URL('../docs/DRAFTING_GUIDES_V0938.md', import.meta.url), 'utf8');

assert.ok(Number(pkg.version.split('.')[2]) >= 38);
assert.match(pkg.scripts.check, /tests\/v0938-static\.mjs/);
assert.match(index, /DomistikaDraftingGuidesV0938\.js/);

assert.match(runtime, /CanvasEngine\.prototype\.eventPoint/);
assert.match(runtime, /CanvasEngine\.prototype\.pointerDown/);
assert.match(runtime, /beginDraftingSnap/);
assert.match(runtime, /snapDraftingPoint/);
assert.match(runtime, /snapDraftingPoints/);
assert.match(runtime, /kind: 'guide'/);
assert.match(runtime, /exportPolicy: 'exclude-guide'/);
assert.match(runtime, /guideMeta:/);
assert.match(runtime, /domistika:v0938-drafting-guide/);

assert.match(panel, /H ruler/);
assert.match(panel, /V ruler/);
assert.match(panel, /Ellipse/);
assert.match(panel, /1-point/);
assert.match(panel, /draftingGuideSnap/);
assert.match(panel, /draftingGuideVisible/);

assert.match(guideLayer, /layer\.role = 'guide'/);
assert.match(guideLayer, /layer\.locked = true/);
assert.match(guideLayer, /exclude-guide/);

assert.match(sdk, /APP_VERSION = '0\.9\.\d+'/);
assert.match(sdk, /SDK_VERSION = '0\.1\.\d+'/);
assert.match(sdk, /draftingGuides: Object\.freeze/);
assert.match(sdk, /draftingGuides: \{/);
assert.match(sdk, /drafting\?\.snapPoints/);
assert.match(sdk, /guide\.drafting\.horizontal/);
assert.match(sdk, /guide\.drafting\.one-point/);

assert.match(docs, /horizontal straight ruler/i);
assert.match(docs, /one horizon with one vanishing point/i);
assert.match(docs, /Visibility and snap are independent/i);
assert.match(docs, /Layer locks constrain write authority/i);

console.log('Domistika v0.9.38 drafting guide contracts passed.');
