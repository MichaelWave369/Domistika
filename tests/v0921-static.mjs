import assert from 'node:assert/strict';
import fs from 'node:fs';

const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const engine = fs.readFileSync(new URL('../src/core/CanvasEngine.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);
assert.ok(major > 0 || minor > 9 || (minor === 9 && patch >= 21));

assert.match(index, /DomistikaSDKV0921\.js/);
assert.ok(index.indexOf('DomistikaCleanCaptureV0920.js') < index.indexOf('DomistikaSDKV0921.js'));

assert.match(sdk, /domistika\.sdk\.v1/);
assert.match(sdk, /SDK_VERSION = '0\.1\.2'/);
assert.match(sdk, /window\.Domistika/);
assert.match(sdk, /deepFreeze\(api\)/);
assert.match(sdk, /setTool/);
assert.match(sdk, /stroke/);
assert.match(sdk, /layers:/);
assert.match(sdk, /spiro:/);
assert.match(sdk, /motion:/);
assert.match(sdk, /export:/);
assert.match(sdk, /events:/);
assert.match(sdk, /commands:/);
assert.match(sdk, /emit\('stroke'/);
assert.match(sdk, /pressure \?\? point\.p \?\? 1/);
assert.doesNotMatch(sdk, /eval\s*\(/);
assert.doesNotMatch(sdk, /new Function\s*\(/);
assert.doesNotMatch(sdk, /fetch\s*\(/);
assert.doesNotMatch(sdk, /localStorage/);

assert.match(engine, /Number\.isFinite\(fromPressureRaw\)/);
assert.match(engine, /Number\.isFinite\(toPressureRaw\)/);

console.log('v0.9.23 stable SDK compatibility checks passed');
