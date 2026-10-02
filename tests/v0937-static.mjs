import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VERSION,
  SCHEMA,
} from '../src/DomistikaLayerHousekeepingV0937.js';

assert.equal(VERSION, '0.9.37');
assert.equal(SCHEMA, 'domistika.layer-housekeeping.v1');

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const engine = fs.readFileSync(new URL('../src/core/CanvasEngine.js', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const plates = fs.readFileSync(new URL('../src/v0935/compositionPlateRuntime.js', import.meta.url), 'utf8');
const artDirector = fs.readFileSync(new URL('../src/v0934/artDirector.js', import.meta.url), 'utf8');
const docs = fs.readFileSync(new URL('../docs/LAYER_HOUSEKEEPING_V0937.md', import.meta.url), 'utf8');

assert.equal(pkg.version, '0.9.37');
assert.match(pkg.scripts.check, /tests\/v0937-static\.mjs/);
assert.match(index, /DomistikaLayerHousekeepingV0937\.js/);

for (const contract of [
  /this\.layerGroups = \[\]/,
  /locked: options\.locked === true/,
  /groupId: options\.groupId \|\| null/,
  /setLayerLocked\(/,
  /createLayerGroup\(/,
  /renameLayerGroup\(/,
  /deleteLayerGroup\(/,
  /setLayerGroup\(/,
  /mergeActiveLayerDown\(/,
  /kind: 'merge-down'/,
  /undoMergeDown\(/,
  /redoMergeDown\(/,
]) {
  assert.match(engine, contract);
}

assert.match(engine, /if \(!this\.layerWritable\(\)\)/, 'direct pointer drawing must honor lock');
assert.match(engine, /if \(!layer \|\| !this\.layerWritable\(layer\)\) return;/, 'low-level segment writes must honor lock');
assert.match(engine, /locked: layer\.locked === true, groupId: layer\.groupId \|\| null/, 'project serialization must persist lock and group');
assert.match(engine, /layerGroups: this\.layerGroups\.map/, 'project serialization must persist groups');
assert.match(engine, /this\.layerGroups = Array\.isArray\(project\.layerGroups\)/, 'old/new project restore must initialize groups');

assert.match(plates, /!this\.layerWritable\?\.\(layer\)/, 'plate shape writes must honor lock');
assert.match(sdk, /DOMISTIKA_SDK_LAYER_LOCKED/, 'SDK writes must reject locked targets');
assert.match(sdk, /lock: layerLock/);
assert.match(sdk, /mergeDown: layerMergeDown/);
assert.match(sdk, /groups: \{/);
assert.match(sdk, /layerHousekeeping: Object\.freeze/);
assert.match(sdk, /APP_VERSION = '0\.9\.37'/);
assert.match(sdk, /SDK_VERSION = '0\.1\.14'/);

assert.match(main, /id="mergeLayerDown"/);
assert.match(main, /id="newLayerGroup"/);
assert.match(main, /id="layerLock"/);
assert.match(main, /id="layerGroup"/);
assert.match(main, /layer-group-badge/);
assert.match(main, /engine\.mergeActiveLayerDown/);
assert.match(main, /engine\.setLayerLocked/);
assert.match(main, /engine\.setLayerGroup/);

assert.match(artDirector, /api\.stroke/, 'Art Director must still route writes through the stable SDK');
assert.match(docs, /organizational folders only/i);
assert.match(docs, /one structural undo entry/i);
assert.match(docs, /Composition Plates determine/);

console.log('Domistika v0.9.37 layer housekeeping contracts passed.');
