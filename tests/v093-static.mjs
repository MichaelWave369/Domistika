import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [index, pkgText, entry, runtime, layout, symmetryFill, theme, gallery, bridge, galleryJson, issueTemplate] = await Promise.all([
  read('index.html'),
  read('package.json'),
  read('src/DomistikaGalleryBridgeV093.js'),
  read('src/v093/runtime.js'),
  read('src/v093/toolRailLayout.js'),
  read('src/v093/symmetryFill.js'),
  read('src/v093/consoleTheme.js'),
  read('src/v093/gallery.js'),
  read('src/v093/auralithBridge.js'),
  read('public/gallery/artworks.json'),
  read('.github/ISSUE_TEMPLATE/art-gallery-submission.md'),
]);

const pkg = JSON.parse(pkgText);
const [major, minor, patch] = pkg.version.split('.').map(Number);
assert.ok(major > 0 || minor > 9 || (minor === 9 && patch >= 3), 'Expected Domistika v0.9.3 or later');
assert.match(index, /DomistikaGalleryBridgeV093\.js/);
for (const moduleName of ['runtime.js', 'toolRailLayout.js', 'symmetryFill.js', 'consoleTheme.js', 'gallery.js', 'auralithBridge.js']) {
  assert.match(entry, new RegExp(moduleName.replace('.', '\\.')));
}

assert.match(runtime, /parallax|currentArtworkDataUrl|domistika:v093-engine/);
assert.match(layout, /data-tool=\\?"eyedropper|\[data-tool="eyedropper"\]/);
assert.match(layout, /\[data-tool="fill"\]/);
assert.match(symmetryFill, /fillSymmetry/);
assert.match(symmetryFill, /symmetryTransforms\(\)/);
assert.match(symmetryFill, /Symmetry fill/);
assert.match(theme, /domistika-16bit-console/);
assert.match(theme, /16-bit-console/);
assert.match(theme, /Domistika 16-Bit/);
assert.match(gallery, /Domistika Art Gallery/);
assert.match(gallery, /Art of the Day/);
assert.match(gallery, /Submit to Public Gallery/);
assert.match(gallery, /gallery\/artworks\.json/);
assert.match(bridge, /parallax-creative-bridge-v1/);
assert.match(bridge, /Auralith369/);

const catalog = JSON.parse(galleryJson);
assert.ok(Array.isArray(catalog.artworks) && catalog.artworks.length >= 4, 'Expected seeded gallery artworks');
assert.match(issueTemplate, /Permission and governance/);
assert.match(issueTemplate, /I created this artwork or have permission/);

console.log('Domistika v0.9.3+ static contracts passed.');
