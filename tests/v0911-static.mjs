import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const bridge = await readFile(new URL('../src/DomistikaRuntimeBridgeV0911.js', import.meta.url), 'utf8');
const runtime = await readFile(new URL('../src/DomistikaCharacterLibraryV0911.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);
assert.ok(major > 0 || minor > 9 || (minor === 9 && patch >= 11));
assert.match(index, /DomistikaRuntimeBridgeV0911\.js/);
assert.match(index, /DomistikaCharacterLibraryV0911\.js/);
assert.ok(index.indexOf('DomistikaRuntimeBridgeV0911.js') < index.indexOf('main.js'));
assert.ok(index.indexOf('DomistikaCreatureLabV100.js') < index.indexOf('DomistikaCharacterLibraryV0911.js'));
assert.match(pkg.scripts.check, /DomistikaRuntimeBridgeV0911\.js/);
assert.match(pkg.scripts.check, /DomistikaCharacterLibraryV0911\.js/);
assert.match(pkg.scripts.check, /v0911-static\.mjs/);
assert.match(bridge, /__domistikaEngine/);
assert.match(bridge, /domistika:ready/);
assert.match(runtime, /Species Library/);
assert.match(runtime, /Character Sheet/);
assert.match(runtime, /1-up/);
assert.match(runtime, /4-up/);
assert.match(runtime, /9-up/);
assert.match(runtime, /specieslibrary:entry-added/);
assert.match(runtime, /charactersheet:exported/);
assert.match(runtime, /pendeckCharacters/);
assert.match(runtime, /local-first/);

console.log('Domistika v0.9.11+ Character Library contracts passed');
