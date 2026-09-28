import assert from 'node:assert/strict';
import fs from 'node:fs';

const playground=fs.readFileSync(new URL('../src/DomistikaPlaygroundV0927.js',import.meta.url),'utf8');
const sdk=fs.readFileSync(new URL('../src/DomistikaSDKV0921.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));

assert.ok(Number(pkg.version.split('.')[2]) >= 27);
assert.match(playground,/domistika\.playground\.v1/);
assert.match(playground,/project\.serialize\(\{embedMotion:false\}\)/);
assert.match(playground,/canvas\.new\(\{width:1200,height:1200,name:'Domistika Playground'\}\)/);
assert.match(playground,/applyGradient\('portal-core'/);
assert.match(playground,/spiro\.place\('flower'/);
assert.match(playground,/spiro\.place\('gear'/);
assert.match(playground,/role\(frame\.id,'motion-ignore'\)/);
assert.match(playground,/motion\.play\('portal-369'\)/);
assert.match(playground,/motion\.record\.start\(\{source:'kinetic'\}\)/);
assert.match(playground,/motion\.record\.stop\(\{source:'kinetic'\}\)/);
assert.match(playground,/domistika:motion-clip-added/);
assert.match(playground,/restorePrevious/);

assert.match(sdk,/SDK_VERSION = '0\.1\.7'/);
assert.match(sdk,/function motionRecorderRuntime/);
assert.match(sdk,/project: \{[\s\S]*restore: restoreProject/);
assert.match(sdk,/playground: \{/);
assert.match(sdk,/playground\.run/);
assert.match(sdk,/playground\.return/);

assert.match(index,/DomistikaPlaygroundV0927\.js/);
assert.ok(index.indexOf('DomistikaSDKV0921.js')<index.indexOf('DomistikaPlaygroundV0927.js'));

assert.doesNotMatch(playground,/fetch\s*\(/);
assert.doesNotMatch(playground,/eval\s*\(/);
assert.doesNotMatch(playground,/new Function\s*\(/);

console.log('v0.9.27 Playground checks passed');
