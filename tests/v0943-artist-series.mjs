import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  MAX_TRANSFORMS, listRecipes, compileFormula, compileRecipePlan, parseFormula,
} from '../src/v0932/symmetryRecipes.js';

const samples = listRecipes().filter((recipe) => recipe.family === 'artists');
assert.equal(samples.length, 6, 'Six original Artist Series recipes are discoverable');
for (const recipe of samples) {
  assert.ok(recipe.id && recipe.label && recipe.description && recipe.inspiration);
  const a = compileRecipePlan(recipe.formula);
  const b = compileRecipePlan(recipe.formula);
  assert.equal(a.truncated, false, 'Built-in studies must fit within the live drawing budget');
  assert.ok(a.count > 1 && a.count <= MAX_TRANSFORMS);
  assert.deepEqual(a.states, b.states, 'Artist formula must replay deterministically');
  const transforms = compileFormula(recipe.formula, { width: 1600, height: 1200 });
  assert.equal(transforms.count, a.count);
  for (const apply of transforms.transforms) {
    const point = apply({ x: 800, y: 600, pressure: 0.8 });
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    assert.equal(point.pressure, 0.8);
  }
}

assert.equal(parseFormula('TILE(4,4,.2,.2,.5) | GLIDE(x,.1) | SHEAR(.3,-.1)').length, 3);
assert.equal(compileRecipePlan('TILE(3,2,.2,.2,.5)').count, 6);
assert.equal(compileRecipePlan('TILE(3,2,.2,.2,.5) | GLIDE(x,.1)').count, 12);
assert.equal(compileRecipePlan('TILE(99,99,.2,.2)').count, 144, 'Lattice dimensions are bounded');
assert.equal(compileRecipePlan('TILE(12,12,.2,.2) | GLIDE(y,.2)').count, MAX_TRANSFORMS);
assert.equal(compileRecipePlan('TILE(12,12,.2,.2) | GLIDE(y,.2)').truncated, true);
assert.throws(() => compileRecipePlan('GLIDE(z,.2)'), /DOMISTIKA_RECIPE_GLIDE_AXIS/);

const point = { x: 520, y: 540, pressure: 0.4 };
const horizontal = compileFormula('GLIDE(x,.2)', { width: 1000, height: 1000 }).transforms;
assert.deepEqual(horizontal[0](point), point);
assert.deepEqual(horizontal[1](point), { x: 720, y: 460, pressure: 0.4 });
const vertical = compileFormula('GLIDE(y,.2)', { width: 1000, height: 1000 }).transforms;
assert.deepEqual(vertical[0](point), point);
assert.deepEqual(vertical[1](point), { x: 480, y: 740, pressure: 0.4 });

const skew = compileFormula('SHEAR(.4,0)', { width: 1000, height: 1000 }).transforms[0];
assert.deepEqual(skew({ x: 500, y: 600 }), { x: 540, y: 600 });
const translated = compileFormula('TILE(3,1,.2,.2)', { width: 1000, height: 1000 }).transforms;
assert.deepEqual(translated.map((t) => t({ x: 500, y: 500 }).x), [300, 500, 700]);

assert.equal(compileRecipePlan('RADIAL(12) | MIRROR(15)').count, 24,
  'Preexisting radial / mirror contract remains unchanged');

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');
const [panel, runtime, docs, pkgText, sdk] = await Promise.all([
  read('src/v0932/symmetryRecipePanel.js'), read('src/v0932/symmetryRecipeRuntime.js'),
  read('docs/ARTIST_SERIES_V0943.md'), read('package.json'), read('src/DomistikaSDKV0921.js'),
]);
assert.match(panel, /Artists Series/);
assert.match(panel, /recipePreview/);
assert.match(panel, /artistOpenWeave/);
assert.match(panel, /recipeCards\(artistRecipes\)/);
assert.match(runtime, /compileFormula/);
assert.match(docs, /Open Dimensional Weave/);
assert.match(sdk, /APP_VERSION = '0\.9\.43'/);
const pkg = JSON.parse(pkgText);
assert.equal(pkg.version, '0.9.43');
assert.match(pkg.scripts.check, /tests\/v0943-artist-series\.mjs/);
console.log('Domistika v0.9.43 Artists Series contracts passed.');
