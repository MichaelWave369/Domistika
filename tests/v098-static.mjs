import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('../src/DomistikaPenDeckV098.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);
assert.equal(major, 0);
assert.equal(minor, 9);
assert.ok(patch >= 8, `Expected Domistika 0.9.8 or newer, got ${pkg.version}`);
assert.match(index, /DomistikaPenDeckV098\.js/);
assert.ok(index.indexOf('DomistikaReliabilityV097.js') < index.indexOf('DomistikaPenDeckV098.js'));
assert.match(pkg.scripts.check, /DomistikaPenDeckV098\.js/);
assert.match(pkg.scripts.check, /v098-static\.mjs/);
assert.match(runtime, /getCoalescedEvents/);
assert.match(runtime, /pointerType === 'pen'/);
assert.match(runtime, /pressureGamma/);
assert.match(runtime, /symmetryTransforms/);
assert.match(runtime, /domistika:cc-sketch/);
assert.match(runtime, /pendeck:action/);
assert.match(runtime, /F8/);
assert.match(runtime, /Deco 640 easy mapping/);
assert.match(runtime, /No AutoHotkey required/);

console.log('Domistika v0.9.8+ PenDeck contracts passed');
