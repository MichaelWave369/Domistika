import assert from 'node:assert/strict';
import fs from 'node:fs';

const playground=fs.readFileSync(new URL('../src/DomistikaPlaygroundV0927.js',import.meta.url),'utf8');
const sdk=fs.readFileSync(new URL('../src/DomistikaSDKV0921.js',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));

assert.ok(Number(pkg.version.split('.')[2]) >= 28);
assert.match(playground,/const VERSION='0\.9\.28'/);
assert.match(sdk,/APP_VERSION = '0\.9\.31'/);
assert.match(sdk,/SDK_VERSION = '0\.1\.9'/);

assert.match(playground,/function clipSummary\(clip\)/);
assert.match(playground,/lastClip:clipSummary\(lastClip\)/);
assert.doesNotMatch(playground,/lastClip:lastClip\?Object\.freeze\(\{\.\.\.lastClip\}\):null/);
assert.match(playground,/mimeType:String\(clip\.mimeType/);
assert.match(playground,/durationSeconds:Math\.max/);
assert.match(playground,/fps:Math\.max/);

const clipSummaryBody=playground.slice(
  playground.indexOf('function clipSummary(clip)'),
  playground.indexOf('function ensurePlaygroundUi()'),
);
assert.doesNotMatch(clipSummaryBody,/poster/);
assert.doesNotMatch(clipSummaryBody,/dataUrl/);

assert.match(playground,/id='playgroundQuickAction'/);
assert.match(playground,/▶ Playground/);
assert.match(playground,/↩ Return to Artwork/);
assert.match(playground,/id="playgroundReturnNow"/);
assert.match(playground,/Your previous artwork is safe/);
assert.match(playground,/⌘K \/ Ctrl\+K → Playground · Return to Previous Artwork/);
assert.match(playground,/syncPlaygroundUi\(\)/);

assert.match(readme,/Stable Runtime Acceptance 001/);
assert.match(readme,/Playground UX \+ Capability Hygiene/);

console.log('v0.9.28 Playground UX and capability hygiene checks passed');
