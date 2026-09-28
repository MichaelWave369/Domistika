import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/DomistikaCleanCaptureV0920.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);
assert.ok(major > 0 || minor > 9 || (minor === 9 && patch >= 20));
assert.match(index, /DomistikaCleanCaptureV0920\.js/);
assert.ok(index.indexOf('DomistikaRuntimeBridgeV0911.js') < index.indexOf('DomistikaCleanCaptureV0920.js'));
assert.ok(index.indexOf('DomistikaCleanCaptureV0920.js') < index.indexOf('main.js'));

assert.match(source, /domistika\.clean-art-capture\.v1/);
assert.match(source, /window\.domistikaCleanCaptureV0920/);
assert.match(source, /compositeCanvas/);
assert.match(source, /image\/png/);
assert.match(source, /base64/);
assert.match(source, /MAX_DIMENSION = 2048/);
assert.match(source, /DOMISTIKA_CLEAN_CAPTURE_FIELDS_INVALID/);
assert.match(source, /DOMISTIKA_CLEAN_CAPTURE_DIMENSION_INVALID/);
assert.doesNotMatch(source, /fetch\s*\(/);
assert.doesNotMatch(source, /localStorage/);
assert.doesNotMatch(source, /navigator\.clipboard/);

console.log('v0.9.20 clean composite capture static checks passed');
