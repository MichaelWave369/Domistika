import assert from 'node:assert/strict';
import fs from 'node:fs';

const engine = fs.readFileSync(new URL('../src/core/CanvasEngine.js', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const site = fs.readFileSync(new URL('../src/DomistikaSiteToolsV0929.js', import.meta.url), 'utf8');
const bridge = fs.readFileSync(new URL('../src/v093/auralithBridge.js', import.meta.url), 'utf8');
const rotation = fs.readFileSync(new URL('../src/DomistikaKineticRotationV0912.js', import.meta.url), 'utf8');
const expansion = fs.readFileSync(new URL('../src/DomistikaKineticExpansionV0914.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

assert.ok(Number(pkg.version.split('.')[2]) >= 31);
assert.match(engine, /LAYER_ROLES = Object\.freeze\(\['paint', 'guide', 'type'\]\)/);
assert.match(engine, /MOTION_POLICIES = Object\.freeze\(\['inherit', 'animate', 'ignore'\]\)/);
assert.match(engine, /requested === 'motion-ignore'/);
assert.match(engine, /hasSemanticText\(options\) \? 'type' : 'paint'/);
assert.match(engine, /motionPolicy = normalizeMotionPolicy/);
assert.match(engine, /canvas\.dataset\.motionPolicy = motionPolicy/);
assert.match(engine, /setLayerMotionPolicy\(id, policy\)/);
assert.match(engine, /motionPolicy: layer\.motionPolicy \|\| 'inherit'/);

assert.match(main, /id="layerRole"/);
assert.match(main, /id="layerMotionPolicy"/);
assert.doesNotMatch(main, /<option value="motion-ignore">Motion ignore<\/option>/);
assert.match(main, /engine\.setLayerMotionPolicy/);

assert.match(sdk, /APP_VERSION = '0\.9\.\d+'/);
assert.match(sdk, /SDK_VERSION = '0\.1\.\d+'/);
assert.match(sdk, /motionPolicy: String\(layer\.motionPolicy \|\| 'inherit'\)/);
assert.match(sdk, /function layerMotionPolicy/);
assert.match(sdk, /layer\.motion\.ignore/);
assert.match(sdk, /layer\.role\.motion-ignore/);
assert.match(sdk, /Compatibility alias/);
assert.match(sdk, /motionPolicies: Object\.freeze\(\['inherit', 'animate', 'ignore'\]\)/);
assert.match(sdk, /motionPolicy: layerMotionPolicy/);

assert.match(site, /VERSION = '0\.1\.\d+'/);
assert.match(site, /domistika_set_layer_motion_policy/);
assert.match(site, /enum: \['paint', 'guide', 'type'\]/);
assert.match(site, /enum: \['inherit', 'animate', 'ignore'\]/);

assert.match(rotation, /data-motion-policy="ignore"/);
assert.match(rotation, /layer\.motionPolicy === 'ignore'/);
assert.match(expansion, /layer\.motionPolicy === 'ignore'/);

assert.match(bridge, /layer\.role === 'type' \|\| layer\.motionPolicy === 'ignore'/);
assert.match(bridge, /role: layer\.role === 'type' \? 'type' : 'motion-ignore'/);

console.log('v0.9.31 semantic role + motion policy checks passed');
