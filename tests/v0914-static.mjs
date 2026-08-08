import assert from 'node:assert/strict';
import fs from 'node:fs';

const expansion = fs.readFileSync(new URL('../src/DomistikaKineticExpansionV0914.js', import.meta.url), 'utf8');
const audio = fs.readFileSync(new URL('../src/DomistikaKineticAudioV0914.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

assert.equal(pkg.version, '0.9.14');
assert.match(index, /DomistikaKineticExpansionV0914\.js/);
assert.match(index, /DomistikaKineticAudioV0914\.js/);
assert.ok(index.indexOf('DomistikaKineticRotationV0912.js') < index.indexOf('DomistikaKineticExpansionV0914.js'));
assert.ok(index.indexOf('DomistikaKineticExpansionV0914.js') < index.indexOf('DomistikaKineticAudioV0914.js'));
assert.ok(index.indexOf('DomistikaKineticAudioV0914.js') < index.indexOf('main.js'));

assert.match(expansion, /Pick Motion Region/);
assert.match(expansion, /Find art center/);
assert.match(expansion, /Mirror Tunnel/);
assert.match(expansion, /captureStream/);
assert.match(expansion, /MediaRecorder/);
assert.match(expansion, /Record WebM/);
assert.match(expansion, /slow-drift/);
assert.match(expansion, /inversion-storm/);
assert.match(expansion, /bass-bloom/);
assert.match(expansion, /alphaCentroid/);
assert.match(expansion, /domistikaKineticRuntime/);
assert.match(expansion, /original artwork unchanged/);

assert.match(audio, /getUserMedia/);
assert.match(audio, /createAnalyser/);
assert.match(audio, /createMediaElementSource/);
assert.match(audio, /Use microphone/);
assert.match(audio, /Choose audio file/);
assert.match(audio, /Mic audio stays local in the browser/);

console.log('v0.9.14 kinetic expansion static checks passed');
