import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VERSION,
  SCHEMA,
  MAX_DIRECTED_STROKES,
  listDirectorPalettes,
  listDirectorProfiles,
  planArtDirection,
  directArt,
} from '../src/v0934/artDirector.js';

assert.equal(VERSION, '0.9.34');
assert.equal(SCHEMA, 'domistika.art-director.v1');
assert.equal(MAX_DIRECTED_STROKES, 10);
assert.ok(listDirectorPalettes().some((palette) => palette.id === 'electric-dusk'));
assert.ok(listDirectorProfiles().some((profile) => profile.id === 'mechanical'));

const planA = planArtDirection({
  prompt: 'cosmic mechanical portal reactor',
  density: .72,
  complexity: .8,
  surprise: .22,
});
const planB = planArtDirection({
  prompt: 'cosmic mechanical portal reactor',
  density: .72,
  complexity: .8,
  surprise: .22,
});

assert.equal(planA.symmetry, 'portal', 'cosmic portal intent should resolve to the portal recipe');
assert.deepEqual(planA, planB, 'same direction must compile deterministically');
assert.ok(planA.strokeCount >= 3 && planA.strokeCount <= 10);
assert.ok(planA.pointsPerStroke >= 3 && planA.pointsPerStroke <= 6);
assert.equal(planA.strokes.length, planA.strokeCount);
for (const stroke of planA.strokes) {
  assert.match(stroke.color, /^#[0-9a-f]{6}$/);
  assert.ok(stroke.points.length <= 6);
  for (const point of stroke.points) {
    assert.ok(point.x >= 0 && point.x <= 1);
    assert.ok(point.y >= 0 && point.y <= 1);
  }
}

const organic = planArtDirection({ mood: 'organic botanical flower', symmetry: 'auto', palette: 'auto' });
assert.equal(organic.symmetry, 'flower');
assert.equal(organic.paletteId, 'biolume');

const override = planArtDirection({
  mood: 'calm minimal',
  symmetry: 'vortex',
  colors: ['#112233', '#abcdef'],
  seed: 'fixed-test',
});
assert.equal(override.symmetry, 'vortex');
assert.equal(override.paletteId, 'custom');
assert.deepEqual(override.palette, ['#112233', '#abcdef']);

assert.throws(() => planArtDirection({ symmetry: 'forbidden' }), /SYMMETRY_UNKNOWN/);
assert.throws(() => planArtDirection({ palette: 'missing-palette' }), /PALETTE_UNKNOWN/);

function fakeApi() {
  const calls = [];
  let activeLayerId = 'layer-1';
  return {
    schema: 'domistika.sdk.v1',
    ready: () => true,
    canvas: {
      info: () => ({ width: 1200, height: 1200, activeLayerId, layerCount: 1 }),
    },
    layers: {
      create: (name) => {
        const layer = { id: 'director-layer', name };
        calls.push(['layer.create', name]);
        return layer;
      },
      activate: (id) => {
        activeLayerId = id;
        calls.push(['layer.activate', id]);
        return { id };
      },
    },
    art: {
      drawRecipeArtifact: async (input) => {
        calls.push(['artifact', input.recipe, input.strokes.length, input.freshCanvas, input.clearFirst]);
        return { ok: true, recipe: input.recipe, strokeCount: input.strokes.length };
      },
    },
    calls,
  };
}

const api = fakeApi();
const directed = await directArt({
  prompt: 'orbital opposing binary rings',
  density: .5,
  complexity: .5,
  seed: 'director-test',
}, api);
assert.equal(directed.ok, true);
assert.equal(directed.plan.symmetry, 'counterspin');
assert.equal(directed.placement, 'new-layer');
assert.equal(directed.targetLayer, 'director-layer');
assert.equal(api.calls[0][0], 'layer.create');
assert.deepEqual(api.calls[1], ['layer.activate', 'director-layer']);
assert.equal(api.calls[2][0], 'artifact');

const freshApi = fakeApi();
const fresh = await directArt({ mood: 'crystal prism', freshCanvas: true, seed: 'fresh-test' }, freshApi);
assert.equal(fresh.placement, 'fresh-canvas');
assert.equal(freshApi.calls[0][0], 'artifact');

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const site = fs.readFileSync(new URL('../src/DomistikaSiteToolsV0929.js', import.meta.url), 'utf8');
const entry = fs.readFileSync(new URL('../src/DomistikaArtDirectorV0934.js', import.meta.url), 'utf8');
const docs = fs.readFileSync(new URL('../docs/ART_DIRECTOR_V0934.md', import.meta.url), 'utf8');

assert.ok(Number(pkg.version.split('.')[2]) >= 34);
assert.match(pkg.scripts.check, /tests\/v0934-static\.mjs/);
assert.match(index, /DomistikaArtDirectorV0934\.js/);
assert.match(entry, /v0934\/artDirector\.js/);
assert.match(sdk, /APP_VERSION = '0\.9\.\d+'/);
assert.match(sdk, /SDK_VERSION = '0\.1\.\d+'/);
assert.match(sdk, /directArt/);
assert.match(sdk, /planArtDirection/);
assert.match(site, /VERSION = '0\.1\.4'/);
assert.match(site, /domistika_direct_art/);
assert.match(docs, /Domistika\.art\.direct/);

console.log('Domistika v0.9.34 Agent Art Director contracts passed.');
