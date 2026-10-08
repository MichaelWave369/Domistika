import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SCHEMA, VERSION, WEAVE_DEFAULTS,
  normalizeWeaveOptions, normalizeWeavePoints, validateWeave,
  signedPolygonArea, buildWeaveGeometry, weaveMetadata, drawWeave,
} from '../src/v0942/dimensionalWeave.js';

assert.equal(SCHEMA, 'domistika.dimensional-weave.v1');
assert.equal(VERSION, '1.0.0');
assert.equal(WEAVE_DEFAULTS.copies, 28);
assert.deepEqual(normalizeWeaveOptions({ copies: 99, depth: -5, direction: 999 }).copies, 32);
assert.equal(normalizeWeaveOptions({ copies: 99 }).copies, 32);
assert.equal(normalizeWeaveOptions({ copies: 0 }).copies, 1);
assert.equal(normalizeWeaveOptions({ depth: -4 }).depth, 0);
assert.equal(normalizeWeaveOptions({ depth: 10000 }).depth, 160);
assert.equal(normalizeWeaveOptions({ direction: 270 }).direction, 180);
assert.equal(normalizeWeaveOptions({ color: 'javascript:alert(1)' }).color, WEAVE_DEFAULTS.color);
assert.equal(normalizeWeaveOptions({ fill: false, impossible: true }).fill, false);
assert.equal(normalizeWeaveOptions({ impossible: true }).impossible, true);

const points = [{ x: .55, y: .40 }, { x: .65, y: .5 }, { x: .55, y: .6 }];
const original = JSON.stringify(points);
assert.equal(validateWeave(points).length, 3);
assert.ok(signedPolygonArea(points) > 0);
const geometry = buildWeaveGeometry(points, 800, 800, { copies: 4, depth: 20, direction: 0 });
assert.equal(geometry.copies.length, 4);
assert.equal(geometry.copies[0].top.length, 3);
assert.equal(geometry.copies[0].sides.length, 3);
assert.equal(geometry.copies[0].top[0].x, 440);
assert.equal(geometry.copies[0].far[0].x, 460);
assert.ok(Math.abs(geometry.copies[1].top[0].x - 480) < 1e-8);
assert.ok(Math.abs(geometry.copies[1].top[0].y - 440) < 1e-8);

const impossible = buildWeaveGeometry(points, 800, 800, { copies: 1, depth: 20, direction: 0, impossible: true });
assert.equal(impossible.copies[0].far[0].x, 460);
assert.equal(impossible.copies[0].far[1].x, impossible.copies[0].top[1].x - 11);
assert.equal(JSON.stringify(points), original, 'geometry must not mutate source anchors');

const metadata = weaveMetadata(points, { copies: 28, depth: 34 });
assert.equal(metadata.kind, 'dimensional-weave');
assert.equal(metadata.schema, SCHEMA);
assert.deepEqual(metadata.anchors, points);
assert.equal(metadata.options.copies, 28);

assert.throws(() => validateWeave([]), /WEAVE_NEEDS_3_ANCHORS/);
assert.throws(() => validateWeave([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: .5 }]), /WEAVE_ANCHOR_OUT_OF_BOUNDS/);
assert.throws(() => normalizeWeavePoints([{ x: Infinity, y: .3 }]), /WEAVE_ANCHOR_OUT_OF_BOUNDS/);
assert.throws(() => validateWeave([{x:.5,y:.5}, {x:.5001,y:.5001}, {x:.7,y:.8}]), /WEAVE_FACE_TOO_SMALL|WEAVE_DUPLICATE_ANCHOR/);
assert.throws(() => normalizeWeavePoints(Array.from({ length: 25 }, () => ({x:.5,y:.5}))), /WEAVE_MAX_24_ANCHORS/);
assert.throws(() => validateWeave([{x:.1,y:.1},{x:.9,y:.1},{x:.1,y:.9},{x:.9,y:.9},{x:.5,y:.02}]), /WEAVE_CROSSED_FACE_EDGES/);
assert.throws(() => buildWeaveGeometry(points, 0, 500), /WEAVE_CANVAS_INVALID/);

const calls = [];
const ctx = new Proxy({}, { get(_, prop) {
  if (['save','restore','beginPath','moveTo','lineTo','closePath','fill','stroke'].includes(prop))
    return (...args) => { calls.push([prop, ...args]); };
  return undefined;
}, set() { return true; } });
drawWeave(ctx, points, 400, 400, { copies: 2, fill: true });
assert.equal(calls.filter((c) => c[0] === 'fill').length, 8, 'two copies, three sides and one face each');
calls.length = 0;
drawWeave(ctx, points, 400, 400, { copies: 2, fill: false });
assert.equal(calls.filter((c) => c[0] === 'fill').length, 0, 'wireframe never fills faces');

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const runtime = fs.readFileSync(new URL('../src/v0942/dimensionalWeaveRuntime.js', import.meta.url), 'utf8');
const panel = fs.readFileSync(new URL('../src/v0942/dimensionalWeavePanel.js', import.meta.url), 'utf8');
const docs = fs.readFileSync(new URL('../docs/DIMENSIONAL_WEAVE_V1.md', import.meta.url), 'utf8');
assert.match(index, /DomistikaDimensionalWeaveV1\.js/);
assert.match(pkg.scripts.check, /tests\/dimensional-weave-v1\.mjs/);
assert.match(runtime, /CanvasEngine\.prototype\.pointerDown/);
assert.match(runtime, /createLayer\('Dimensional Weave/);
assert.match(runtime, /semanticOverlays: \[provenance\]/);
assert.match(runtime, /getEngine\(\)/);
assert.match(runtime, /window\.domistikaDimensionalWeaveV1/);
assert.match(runtime, /domistikaAuralithBridgeV093/);
assert.match(runtime, /domistikaKineticRotationV0912/);
assert.match(panel, /data-weave-option="impossible"/);
assert.match(panel, /data-weave-action="render"/);
assert.match(docs, /source pixels and layer are untouched/i);
console.log('Dimensional Weave v1 geometry and integration contracts passed.');
