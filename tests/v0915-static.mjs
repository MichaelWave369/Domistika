import assert from 'node:assert/strict';
import fs from 'node:fs';

const hotfix = fs.readFileSync(new URL('../src/DomistikaKineticLiveSourceV0915.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

assert.equal(pkg.version, '0.9.15');
assert.match(index, /DomistikaKineticLiveSourceV0915\.js/);
assert.ok(index.indexOf('DomistikaKineticAudioV0914.js') < index.indexOf('DomistikaKineticLiveSourceV0915.js'));
assert.ok(index.indexOf('DomistikaKineticLiveSourceV0915.js') < index.indexOf('main.js'));
assert.match(hotfix, /refreshBeforePreview/);
assert.match(hotfix, /rt\.refresh\?\.\(false\)/);
assert.match(hotfix, /markSourceDirty/);
assert.match(hotfix, /domistika:v03-content/);
assert.match(hotfix, /early blank startup frame/);

console.log('v0.9.15 kinetic live-source hotfix checks passed');
