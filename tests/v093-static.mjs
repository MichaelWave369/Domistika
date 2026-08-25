import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  bindCreativeBridgeContentHash,
  normalizeCreativeBridgeV1,
} from '../src/v093/parallaxBridgeAdapter.js';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [index, pkgText, entry, runtime, layout, symmetryFill, theme, gallery, bridge, galleryJson, issueTemplate, pass5FixtureText] = await Promise.all([
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
  read('tests/fixtures/parallax-pass5-artifact.json'),
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
assert.match(bridge, /bindCreativeBridgeContentHash/);
assert.match(bridge, /contentHash: payload\.contentHash/);

const normalizedBridge = normalizeCreativeBridgeV1({
  protocol: 'parallax-creative-bridge',
  version: 1,
  source: 'domistika',
  target: 'auralith369',
  createdAt: '2026-08-25T17:00:00Z',
  name: 'Interop fixture',
  image: 'data:image/webp;base64,QUJD',
});
assert.equal(normalizedBridge.schema, 'parallax.bridge.v1');
assert.equal(normalizedBridge.localOnly, true);
assert.equal(normalizedBridge.requiresUserAction, true);
assert.equal(normalizedBridge.payloadRefOrInline.native.protocol, 'parallax-creative-bridge');

const pass5 = JSON.parse(pass5FixtureText);
const encodedArtifact = pass5.data_uri.split(',', 2)[1];
const artifactBytes = Buffer.from(encodedArtifact, 'base64');
const artifactSha256 = createHash('sha256').update(artifactBytes).digest('hex');
assert.equal(artifactBytes.length, pass5.bytes, 'Pass 5 artifact byte count must match the frozen fixture');
assert.equal(artifactSha256, pass5.sha256, 'Pass 5 artifact SHA-256 must match the frozen fixture');

const pass5NativeBridge = {
  protocol: 'parallax-creative-bridge',
  version: 1,
  source: 'domistika',
  target: 'auralith369',
  createdAt: '2026-08-25T22:00:00Z',
  name: pass5.name,
  image: pass5.data_uri,
  canvas: { width: pass5.width, height: pass5.height },
  note: pass5.rights_note,
};
const boundPass5 = await bindCreativeBridgeContentHash(pass5NativeBridge);
assert.equal(boundPass5.contentHash, `sha256:${pass5.sha256}`);
assert.equal(boundPass5.image, pass5.data_uri);

const pass5Normalized = normalizeCreativeBridgeV1(boundPass5);
assert.equal(pass5Normalized.contentHash, `sha256:${pass5.sha256}`);
assert.equal(pass5Normalized.payloadRefOrInline.native.image, pass5.data_uri);
assert.equal(pass5Normalized.localOnly, true);
assert.equal(pass5Normalized.requiresUserAction, true);
assert.deepEqual(pass5Normalized.warnings, []);

const catalog = JSON.parse(galleryJson);
assert.ok(Array.isArray(catalog.artworks) && catalog.artworks.length >= 4, 'Expected seeded gallery artworks');
assert.match(issueTemplate, /Permission and governance/);
assert.match(issueTemplate, /I created this artwork or have permission/);

console.log('Domistika v0.9.3+ static contracts passed.');
