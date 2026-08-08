import assert from 'node:assert/strict';
import fs from 'node:fs';

const composer = fs.readFileSync(new URL('../src/DomistikaKineticComposerV0916.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

assert.equal(pkg.version, '0.9.16');
assert.match(index, /DomistikaKineticComposerV0916\.js/);
assert.ok(index.indexOf('DomistikaKineticLiveSourceV0915.js') < index.indexOf('DomistikaKineticComposerV0916.js'));
assert.ok(index.indexOf('DomistikaKineticComposerV0916.js') < index.indexOf('main.js'));

assert.match(composer, /Ghost Trails/);
assert.match(composer, /Kaleidoscope Lens/);
assert.match(composer, /Orbit Pivot/);
assert.match(composer, /Scene Sequencer/);
assert.match(composer, /Ghost Mandala/);
assert.match(composer, /Orbit Bloom/);
assert.match(composer, /Infinite Dream/);
assert.match(composer, /Calm Drift/);
assert.match(composer, /figure8/);
assert.match(composer, /captureStream/);
assert.match(composer, /MediaRecorder/);
assert.match(composer, /kinetic-composer\.webm/);
assert.match(composer, /window\.domistikaKineticComposerV0916/);
assert.match(composer, /domistika:kinetic-composer-ready/);

console.log('v0.9.16 Kinetic Composer static checks passed');
