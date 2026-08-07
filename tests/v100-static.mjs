import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const runtime = await readFile(new URL('../src/DomistikaCreatureLabV100.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);
assert.equal(major, 0);
assert.equal(minor, 9);
assert.ok(patch >= 10, `Expected Domistika 0.9.10 or newer, got ${pkg.version}`);
assert.match(index, /DomistikaCreatureLabV100\.js/);
assert.ok(index.indexOf('DomistikaSignatureLabV099.js') < index.indexOf('DomistikaCreatureLabV100.js'));
assert.match(pkg.scripts.check, /DomistikaCreatureLabV100\.js/);
assert.match(pkg.scripts.check, /v100-static\.mjs/);
assert.match(runtime, /Mirror Creature/);
assert.match(runtime, /Totem Builder/);
assert.match(runtime, /Mask Mode/);
assert.match(runtime, /Inkblot Character Lab/);
assert.match(runtime, /Little People/);
assert.match(runtime, /Crowd Builder/);
assert.match(runtime, /creaturelab:artifact/);
assert.match(runtime, /domistika:cc-sketch/);
assert.match(runtime, /pendeckCreatureLab/);
assert.match(runtime, /captureHistory/);
assert.match(runtime, /Auto Palette/);

console.log('Domistika v0.9.10 Creature Lab contracts passed');
