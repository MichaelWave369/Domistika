import assert from 'node:assert/strict';
import fs from 'node:fs';

const engine=fs.readFileSync(new URL('../src/core/CanvasEngine.js',import.meta.url),'utf8');
const guide=fs.readFileSync(new URL('../src/v090/guideLayer.js',import.meta.url),'utf8');
const kinetic=fs.readFileSync(new URL('../src/DomistikaKineticRotationV0912.js',import.meta.url),'utf8');
const sdk=fs.readFileSync(new URL('../src/DomistikaSDKV0921.js',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));

assert.ok(Number(pkg.version.split('.')[2]) >= 26);
assert.match(engine,/LAYER_ROLES = Object\.freeze\(\['paint', 'guide', 'type', 'motion-ignore'\]\)/);
assert.match(engine,/canvas\.dataset\.layerRole = role/);
assert.match(engine,/setLayerRole\(id, role\)/);
assert.match(engine,/role: layer\.role \|\| 'paint'/);
assert.match(engine,/excludeRoles/);

assert.match(guide,/layer\.role = 'guide'/);
assert.match(guide,/originalCompositeCanvas\.call\(this, includeBackground, background, options\)/);

assert.match(kinetic,/excludeRoles: \['motion-ignore'\]/);
assert.match(kinetic,/data-layer-role="motion-ignore"/);

assert.match(main,/id="layerRole"/);
assert.match(main,/value="motion-ignore"/);
assert.match(main,/layer-role-badge/);
assert.match(main,/engine\.setLayerRole/);

assert.match(sdk,/SDK_VERSION = '0\.1\.7'/);
assert.match(sdk,/role: layerRole/);
assert.match(sdk,/layer\.role\.motion-ignore/);
assert.match(sdk,/layerRoles:/);

console.log('v0.9.26 layer role checks passed');
