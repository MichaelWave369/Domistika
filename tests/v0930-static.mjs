import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  bindCreativeBridgeV2ContentHash,
  normalizeCreativeBridgeV2,
} from '../src/v093/parallaxBridgeAdapter.js';

const dataUri = (value) => 'data:image/png;base64,' + Buffer.from(value).toString('base64');

const payload = {
  protocol: 'parallax-creative-bridge',
  version: 2,
  source: 'domistika',
  target: 'auralith369',
  createdAt: '2026-09-28T17:40:00-07:00',
  name: 'Semantic bridge fixture',
  image: dataUri('base artwork'),
  canvas: { width: 1400, height: 1000 },
  palette: ['#112233', '#abcdef'],
  symmetry: 'none',
  note: 'fixture',
  overlays: [{
    id: 'overlay-1',
    kind: 'raster-overlay',
    role: 'type',
    name: 'Title',
    sourceLayerId: 'layer-title',
    preserveDuringStyle: true,
    opacity: 1,
    blendMode: 'normal',
    semantic: [{
      kind: 'text',
      schema: 'domistika.semantic-text.v1',
      text: 'Harbor Bridge v3',
      x: 0.05,
      y: 0.05,
      preserveDuringStyle: true,
    }],
    image: dataUri('transparent title pixels'),
  }],
};

const bound = await bindCreativeBridgeV2ContentHash(payload);
assert.match(bound.baseContentHash, /^sha256:[0-9a-f]{64}$/);
assert.match(bound.overlays[0].contentHash, /^sha256:[0-9a-f]{64}$/);
assert.match(bound.contentHash, /^sha256:[0-9a-f]{64}$/);
assert.notEqual(bound.baseContentHash, bound.overlays[0].contentHash);

const normalized = normalizeCreativeBridgeV2(bound);
assert.equal(normalized.schema, 'parallax.bridge.v2');
assert.equal(normalized.version, 2);
assert.equal(normalized.localOnly, true);
assert.equal(normalized.requiresUserAction, true);
assert.equal(normalized.payloadType, 'image/data-url+semantic-overlays');
assert.deepEqual(normalized.trustLabels, ['semantic-overlay-bound']);
assert.equal(normalized.contentHash, bound.contentHash);

const engine = fs.readFileSync(new URL('../src/core/CanvasEngine.js', import.meta.url), 'utf8');
const textStudio = fs.readFileSync(new URL('../src/v094/textStudio.js', import.meta.url), 'utf8');
const bridge = fs.readFileSync(new URL('../src/v093/auralithBridge.js', import.meta.url), 'utf8');
const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const siteTools = fs.readFileSync(new URL('../src/DomistikaSiteToolsV0929.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

assert.ok(/^0\\.9\\.\\d+$/.test(pkg.version));
assert.match(sdk, /APP_VERSION = '0\.9\.31'/);
assert.match(sdk, /SDK_VERSION = '0\.1\.9'/);

assert.match(engine, /semanticOverlays:/);
assert.match(engine, /excludeLayerIds/);
assert.match(engine, /layer\.semanticOverlays = \[\]/);
assert.match(engine, /semanticOverlays: Array\.isArray\(layer\.semanticOverlays\)/);

assert.match(textStudio, /domistika\.semantic-text\.v1/);
assert.match(textStudio, /preserveDuringStyle: true/);
assert.match(textStudio, /engine\.setLayerRole\(layer\.id, 'type'\)/);
assert.match(textStudio, /layer\.semanticOverlays\.push\(descriptor\)/);

assert.match(bridge, /parallax-creative-bridge-v2/);
assert.match(bridge, /protectedOverlayLayers/);
assert.match(bridge, /excludeLayerIds: protectedLayers\.map/);
assert.match(bridge, /kind: 'raster-overlay'/);
assert.match(bridge, /bindCreativeBridgeV2ContentHash/);
assert.match(bridge, /protocolVersion: 2/);
assert.match(bridge, /overlayCount: payload\.overlays\.length/);

assert.match(sdk, /function transferToAuralith/);
assert.match(sdk, /bridge\.auralith\.transfer/);
assert.match(sdk, /bridge: Object\.freeze/);
assert.match(sdk, /semanticOverlays: true/);
assert.match(sdk, /transfer: transferToAuralith/);

assert.match(siteTools, /VERSION = '0\.1\.2'/);
assert.match(siteTools, /domistika_transfer_to_auralith/);
assert.doesNotMatch(siteTools, /\beval\s*\(/);
assert.doesNotMatch(siteTools, /new Function\s*\(/);

console.log('v0.9.30 Creative Bridge v2 semantic-overlay checks passed');
