import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/DomistikaMotionClipsV0922.js', import.meta.url), 'utf8');
const expansion = fs.readFileSync(new URL('../src/DomistikaKineticExpansionV0914.js', import.meta.url), 'utf8');
const composer = fs.readFileSync(new URL('../src/DomistikaKineticComposerV0916.js', import.meta.url), 'utf8');
const visual = fs.readFileSync(new URL('../src/DomistikaVisualPerformanceV0918.js', import.meta.url), 'utf8');
const gallery = fs.readFileSync(new URL('../src/v093/gallery.js', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);
assert.ok(major > 0 || minor > 9 || (minor === 9 && patch >= 22));

assert.match(index, /DomistikaMotionClipsV0922\.js/);
assert.ok(index.indexOf('DomistikaMotionClipsV0922.js') < index.indexOf('main.js'));

assert.match(source, /domistika\.motion-clips\.v1/);
assert.match(source, /window\.domistikaMotionClipsV0922/);
assert.match(source, /MAX_CLIP_BYTES = 24 \* 1024 \* 1024/);
assert.match(source, /MAX_PROJECT_CLIPS = 8/);
assert.match(source, /indexedDB\.open/);
assert.match(source, /motionClips = metadataEnvelope\(\)/);
assert.match(source, /embedProject/);
assert.match(source, /restoreProjectClips/);
assert.match(source, /domistika:motion-clip-added/);

for (const runtime of [expansion, composer, visual]) {
  assert.match(runtime, /domistikaMotionClipsV0922/);
  assert.match(runtime, /addBlob/);
  assert.match(runtime, /startedAt/);
}

assert.match(main, /embedProject/);
assert.match(gallery, /motionClipId/);
assert.match(gallery, /gallery-motion-badge/);
assert.match(gallery, /playbackUrl/);
assert.match(sdk, /clips:/);

assert.doesNotMatch(source, /fetch\s*\(/);
assert.doesNotMatch(source, /eval\s*\(/);
assert.doesNotMatch(source, /new Function\s*\(/);

console.log('v0.9.22 motion clip project-object static checks passed');
