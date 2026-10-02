import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VERSION,
  SCHEMA,
  MAX_STROKES,
  listRecipeArtifactPresets,
  getRecipeArtifactPreset,
  drawRecipeArtifact,
} from '../src/v0933/recipeArtifacts.js';

assert.equal(VERSION, '0.9.33');
assert.equal(SCHEMA, 'domistika.recipe-artifact.v1');
assert.equal(MAX_STROKES, 16);

const presets = listRecipeArtifactPresets();
assert.deepEqual(presets.map((preset) => preset.id), [
  'portal-bloom',
  'counterspin-flower',
  'gear-halo',
  'fracture-iris',
]);
assert.equal(getRecipeArtifactPreset('portal-bloom').recipe, 'portal');
assert.equal(getRecipeArtifactPreset('missing'), null);

function fakeApi() {
  const calls = [];
  let canvas = { width: 800, height: 800, projectName: 'Fixture', activeLayerId: 'layer-1', layerCount: 1 };
  let activeRecipe = null;
  return {
    schema: 'domistika.sdk.v1',
    ready: () => true,
    canvas: {
      info: () => ({ ...canvas }),
      new: async ({ width, height, name }) => {
        canvas = { ...canvas, width, height, projectName: name };
        calls.push(['canvas.new', width, height, name]);
        return { ...canvas };
      },
    },
    layers: {
      clear: (id) => { calls.push(['layers.clear', id]); return true; },
    },
    symmetryRecipes: {
      apply: (id) => { activeRecipe = { id, label: id, formula: null }; calls.push(['recipe', id]); return activeRecipe; },
      applyFormula: (formula, label) => { activeRecipe = { id: 'custom', label, formula }; calls.push(['formula', formula, label]); return activeRecipe; },
      active: () => activeRecipe,
    },
    stroke: (points, options) => {
      calls.push(['stroke', points.length, options.tool, options.color, options.history]);
      return { ok: true, pointCount: points.length };
    },
    calls,
  };
}

const api = fakeApi();
const result = await drawRecipeArtifact({ preset: 'portal-bloom', freshCanvas: true, name: 'Agent Portal' }, api);
assert.equal(result.ok, true);
assert.equal(result.preset, 'portal-bloom');
assert.equal(result.strokeCount, 4);
assert.deepEqual(api.calls[0], ['canvas.new', 1200, 1200, 'Agent Portal']);
assert.deepEqual(api.calls[1], ['recipe', 'portal']);
assert.equal(api.calls.filter((call) => call[0] === 'stroke').length, 4);

const customApi = fakeApi();
const custom = await drawRecipeArtifact({
  formula: 'RADIAL(8) | MIRROR',
  clearFirst: true,
  strokes: [{ tool: 'ink', color: '#ffffff', size: 5, points: [{ x: .5, y: .3 }, { x: .55, y: .4 }] }],
}, customApi);
assert.equal(custom.strokeCount, 1);
assert.deepEqual(customApi.calls[0], ['layers.clear', 'layer-1']);
assert.equal(customApi.calls[1][0], 'formula');

await assert.rejects(
  drawRecipeArtifact({ preset: 'not-a-preset' }, fakeApi()),
  /PRESET_UNKNOWN/,
);

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const site = fs.readFileSync(new URL('../src/DomistikaSiteToolsV0929.js', import.meta.url), 'utf8');
const entry = fs.readFileSync(new URL('../src/DomistikaRecipeArtifactsV0933.js', import.meta.url), 'utf8');
const docs = fs.readFileSync(new URL('../docs/RECIPE_ARTIFACTS_V0933.md', import.meta.url), 'utf8');

assert.equal(pkg.version, '0.9.33');
assert.match(pkg.scripts.check, /tests\/v0933-static\.mjs/);
assert.match(index, /DomistikaRecipeArtifactsV0933\.js/);
assert.match(entry, /v0933\/recipeArtifacts\.js/);
assert.match(sdk, /APP_VERSION = '0\.9\.33'/);
assert.match(sdk, /SDK_VERSION = '0\.1\.10'/);
assert.match(sdk, /drawRecipeArtifact/);
assert.match(sdk, /art: Object\.freeze/);
assert.match(site, /VERSION = '0\.1\.3'/);
assert.match(site, /domistika_draw_recipe_artifact/);
assert.match(site, /portal-bloom/);
assert.match(docs, /domistika_draw_recipe_artifact/);

console.log('Domistika v0.9.33 recipe artifact contracts passed.');
