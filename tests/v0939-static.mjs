import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VERSION,
  SCHEMA,
} from '../src/DomistikaSelectionActsV0939.js';
import {
  RECENT_BRUSH_LIMIT,
  rememberRecentBrush,
} from '../src/v0939/recentBrushes.js';

assert.equal(VERSION, '0.9.39');
assert.equal(SCHEMA, 'domistika.selection-acts.v1');
assert.equal(RECENT_BRUSH_LIMIT, 5);

assert.deepEqual(
  rememberRecentBrush(['b', 'c', 'a', 'd'], 'a'),
  ['a', 'b', 'c', 'd'],
  'recent brush selection should move the chosen id to the front without duplicates',
);
assert.deepEqual(
  rememberRecentBrush(['b', 'c', 'd', 'e', 'f'], 'a'),
  ['a', 'b', 'c', 'd', 'e'],
  'recent brush history should stay bounded',
);
assert.deepEqual(
  rememberRecentBrush([], 'graphite-hb'),
  ['graphite-hb'],
);

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const selection = fs.readFileSync(new URL('../src/SelectionTransformV04.js', import.meta.url), 'utf8');
const brushes = fs.readFileSync(new URL('../src/brushes.js', import.meta.url), 'utf8');
const recent = fs.readFileSync(new URL('../src/v0939/recentBrushes.js', import.meta.url), 'utf8');
const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const docs = fs.readFileSync(new URL('../docs/SELECTION_ACTS_V0939.md', import.meta.url), 'utf8');

assert.equal(pkg.version, '0.9.39');
assert.match(pkg.scripts.check, /tests\/v0939-static\.mjs/);
assert.match(index, /DomistikaSelectionActsV0939\.js/);

assert.match(selection, /selectionShape: pathPoints\?\.length/);
assert.match(selection, /pathPointsLocal/);
assert.match(selection, /function selectionBoundaryPoints/);
assert.match(selection, /async function commitSelectionAct/);
assert.match(selection, /pushHistory\(layer, originalDataUrl\)/);
assert.match(selection, /commitSelectionAct\('fill'\)/);
assert.match(selection, /commitSelectionAct\('stroke-outline'\)/);
assert.match(selection, /ctx\.fillStyle = latestEngine\.settings\.color/);
assert.match(selection, /ctx\.lineWidth = Math\.max\(0\.5, Number\(latestEngine\.settings\.size/);
assert.match(selection, /ctx\.globalCompositeOperation = 'source-over'/);
assert.match(selection, /Layer is locked\. Unlock it before selecting pixels/);
assert.match(selection, /Layer is locked\. Unlock it before applying a selection act/);
assert.match(selection, /id="v0939FillSelection"/);
assert.match(selection, /id="v0939StrokeOutline"/);
assert.match(selection, /id="v0939RecentBrushStrip"/);
assert.match(selection, /fill: fillSelection/);
assert.match(selection, /strokeOutline: strokeSelectionOutline/);

assert.match(brushes, /domistika:brush-selected/);
assert.match(brushes, /window\.domistikaBrushLibraryV0939/);
assert.match(brushes, /apply: \(id\) =>/);

assert.match(recent, /domistika-recent-brushes-v1/);
assert.match(recent, /v0939-recent-brush-strip/);
assert.match(recent, /domistika:brush-selected/);

assert.match(sdk, /APP_VERSION = '0\.9\.39'/);
assert.match(sdk, /SDK_VERSION = '0\.1\.16'/);
assert.match(sdk, /selectionActs: Object\.freeze/);
assert.match(sdk, /selection: \{/);
assert.match(sdk, /fill: selectionFill/);
assert.match(sdk, /strokeOutline: selectionStrokeOutline/);
assert.match(sdk, /recent: recentBrushList/);
assert.match(sdk, /recall: recentBrushRecall/);
assert.match(sdk, /selection\.fill/);
assert.match(sdk, /selection\.stroke-outline/);

assert.match(docs, /One act, one undo/i);
assert.match(docs, /current brush size, opacity, and color/i);
assert.match(docs, /up to five recently selected brush presets/i);
assert.match(docs, /Layer locks remain the final write-authority boundary/i);

console.log('Domistika v0.9.39 selection act contracts passed.');
