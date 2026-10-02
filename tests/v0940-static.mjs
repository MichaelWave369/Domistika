import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VERSION,
  SCHEMA,
  PSD_MIME,
  layeredExitDecision,
  layeredExitManifest,
  psdBlendMode,
} from '../src/v0940/layeredExit.js';

assert.equal(VERSION, '0.9.40');
assert.equal(SCHEMA, 'domistika.layered-exit.v1');
assert.equal(PSD_MIME, 'image/vnd.adobe.photoshop');

assert.deepEqual(layeredExitDecision({ role: 'paint' }), { include: true, reason: 'paint' });
assert.deepEqual(layeredExitDecision({ role: 'guide', kind: 'guide' }), { include: false, reason: 'guide' });
assert.deepEqual(layeredExitDecision({ role: 'paint', motionPolicy: 'ignore' }), { include: false, reason: 'motion-ignore' });
assert.deepEqual(layeredExitDecision({ role: 'type' }), { include: false, reason: 'non-paint-role' });
assert.deepEqual(layeredExitDecision({ role: 'paint', exportPolicy: 'exclude' }), { include: false, reason: 'export-excluded' });

assert.equal(psdBlendMode('normal'), 'normal');
assert.equal(psdBlendMode('color-dodge'), 'color dodge');
assert.equal(psdBlendMode('soft-light'), 'soft light');
assert.equal(psdBlendMode('made-up-mode'), 'normal');

const manifest = layeredExitManifest({
  width: 1600,
  height: 1200,
  layers: [
    { id: 'base', name: 'Base Paint', role: 'paint', visible: true, opacity: 1 },
    { id: 'hidden', name: 'Hidden Paint', role: 'paint', visible: false, opacity: .5, locked: true },
    { id: 'guide', name: 'Ruler', role: 'guide', kind: 'guide', motionPolicy: 'ignore' },
    { id: 'static', name: 'Static Overlay', role: 'paint', motionPolicy: 'ignore' },
    { id: 'type', name: 'Title', role: 'type', motionPolicy: 'inherit' },
  ],
});

assert.equal(manifest.canonicalFormat, 'domistika-project');
assert.equal(manifest.canonicalSourceOfTruth, true);
assert.equal(manifest.interchangeFormat, 'psd');
assert.deepEqual(manifest.included.map((layer) => layer.id), ['base', 'hidden']);
assert.deepEqual(manifest.excluded.map((layer) => [layer.id, layer.reason]), [
  ['guide', 'guide'],
  ['static', 'motion-ignore'],
  ['type', 'non-paint-role'],
]);

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const core = fs.readFileSync(new URL('../src/v0940/layeredExit.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/v0940/layeredExitRuntime.js', import.meta.url), 'utf8');
const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const docs = fs.readFileSync(new URL('../docs/LAYERED_EXIT_V0940.md', import.meta.url), 'utf8');

assert.equal(pkg.version, '0.9.40');
assert.equal(pkg.dependencies['ag-psd'], '14.3.7');
assert.match(pkg.scripts.check, /tests\/v0940-static\.mjs/);
assert.match(index, /DomistikaLayeredExitV0940\.js/);

assert.match(main, /PSD · paint layers/);
assert.match(main, /image\/vnd\.adobe\.photoshop/);
assert.match(main, /domistikaLayeredExitV0940/);
assert.match(main, /Layered PSD exported/);

assert.match(core, /writePsdUint8Array/);
assert.match(core, /\.reverse\(\)\.map/);
assert.match(core, /hidden: layer\.visible === false/);
assert.match(core, /composite: layer\.locked === true/);
assert.match(core, /DOMISTIKA_LAYERED_EXIT_NO_PAINT_LAYERS/);
assert.match(core, /domistika:v0940-layered-export/);

assert.match(runtime, /exportCurrentLayeredPsd/);
assert.match(runtime, /inspectLayeredExit/);

assert.match(sdk, /APP_VERSION = '0\.9\.40'/);
assert.match(sdk, /SDK_VERSION = '0\.1\.17'/);
assert.match(sdk, /layeredExit: Object\.freeze/);
assert.match(sdk, /psd: exportPsd/);
assert.match(sdk, /inspectLayered: inspectLayeredExit/);
assert.match(sdk, /export\.psd/);

assert.match(docs, /canonical editable project/i);
assert.match(docs, /omit guides/i);
assert.match(docs, /motion-ignore/i);
assert.match(docs, /PSD succeeded cleanly enough that the fallback was unnecessary/i);

console.log('Domistika v0.9.40 layered exit contracts passed.');
