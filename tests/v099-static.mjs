import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('../src/DomistikaSignatureLabV099.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);
assert.equal(major, 0);
assert.equal(minor, 9);
assert.ok(patch >= 9, `Expected Domistika 0.9.9 or newer, got ${pkg.version}`);
assert.match(index, /DomistikaSignatureLabV099\.js/);
assert.ok(index.indexOf('DomistikaPenDeckV098.js') < index.indexOf('DomistikaSignatureLabV099.js'));
assert.match(pkg.scripts.check, /DomistikaSignatureLabV099\.js/);
assert.match(pkg.scripts.check, /v099-static\.mjs/);
assert.match(runtime, /Signature Mandala/);
assert.match(runtime, /Name Vortex/);
assert.match(runtime, /Phrase Bloom/);
assert.match(runtime, /Replay Build/);
assert.match(runtime, /Capture New/);
assert.match(runtime, /getCoalescedEvents/);
assert.match(runtime, /signaturelab:artifact/);
assert.match(runtime, /domistika:cc-sketch/);
assert.match(runtime, /Original \+ Result/);
assert.match(runtime, /pendeckSignatureLab/);
assert.match(runtime, /F9/);

console.log('Domistika v0.9.9 Signature Lab contracts passed');
