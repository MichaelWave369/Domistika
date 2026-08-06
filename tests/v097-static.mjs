import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { colorMatchesBounded, isEligibleSymmetryRegion } from '../src/v097/fillMath.js';

const runtime = await readFile(new URL('../src/DomistikaReliabilityV097.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const transparentTarget = [0, 0, 0, 0];
assert.equal(colorMatchesBounded(new Uint8ClampedArray([0, 0, 0, 10]), 0, transparentTarget, 28), true);
assert.equal(colorMatchesBounded(new Uint8ClampedArray([0, 0, 0, 40]), 0, transparentTarget, 28), false);
assert.equal(colorMatchesBounded(new Uint8ClampedArray([120, 100, 80, 255]), 0, [120, 100, 80, 255], 28), true);
assert.equal(isEligibleSymmetryRegion({ touchesEdge: true, pixelCount: 100, totalPixels: 1000 }), false);
assert.equal(isEligibleSymmetryRegion({ touchesEdge: false, pixelCount: 600, totalPixels: 1000 }), false);
assert.equal(isEligibleSymmetryRegion({ touchesEdge: false, pixelCount: 200, totalPixels: 1000 }), true);

assert.equal(pkg.version, '0.9.7');
assert.match(index, /DomistikaReliabilityV097\.js/);
assert.match(pkg.scripts.check, /v097-static\.mjs/);
assert.match(runtime, /domistika-history-v097/);
assert.match(runtime, /stopImmediatePropagation/);
assert.match(runtime, /historyQueue/);
assert.match(runtime, /boundedSymmetryFill/);
assert.match(runtime, /shared background was protected/);
assert.match(runtime, /isEligibleSymmetryRegion/);
assert.match(runtime, /__v096PerformanceInstalled/);
assert.doesNotMatch(runtime, /new OffscreenCanvas/);

console.log('Domistika v0.9.7 reliability contracts passed');
