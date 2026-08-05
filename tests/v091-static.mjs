import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [index, pkgText, entry, theme, fill, colors] = await Promise.all([
  read('index.html'),
  read('package.json'),
  read('src/RetroBasementV091.js'),
  read('src/v091/retroTheme.js'),
  read('src/v091/fillTool.js'),
  read('src/v091/colorFavorites.js'),
]);

const pkg = JSON.parse(pkgText);
const [major = 0, minor = 0, patch = 0] = String(pkg.version).split('.').map(Number);
assert.ok(major > 0 || minor > 9 || (minor === 9 && patch >= 1), `Expected Domistika version 0.9.1 or newer, got ${pkg.version}`);
assert.match(index, /RetroBasementV091\.js/);
assert.match(entry, /retroTheme\.js/);
assert.match(entry, /fillTool\.js/);
assert.match(entry, /colorFavorites\.js/);

assert.match(theme, /domistika-retro-basement/);
assert.match(theme, /Grandma's Basement/);
assert.match(theme, /\.tika-orb\{left:16px!important;right:auto!important/);
assert.match(theme, /BasementVision/);

assert.match(fill, /this\.tool !== 'fill'/);
assert.match(fill, /fillTolerance/);
assert.match(fill, /fillSampleAll/);
assert.match(fill, /Int32Array/);
assert.match(fill, /MAX_FILL_PIXELS/);
assert.match(fill, /data-tool = 'fill'|dataset\.tool = 'fill'/);

assert.match(colors, /domistika-v091-favorite-colors/);
assert.match(colors, /MAX_COLORS = 24/);
assert.match(colors, /favoriteColorsPanel/);
assert.match(colors, /Save current/);

console.log('Domistika v0.9.1 static contracts passed');
