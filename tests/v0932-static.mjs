import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  MAX_TRANSFORMS,
  SYMMETRY_RECIPE_PRESETS,
  compileFormula,
  compileRecipePlan,
  parseFormula,
} from '../src/v0932/symmetryRecipes.js';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const portal = parseFormula('RADIAL(16) | MIRROR(5.625) | NEST(3,.76,.03) | COUNTERSPIN(5.625) | SPIRAL(2.8,.998,.001)');
assert.equal(portal.length, 5);
assert.equal(portal[0].op, 'RADIAL');
assert.equal(portal[1].op, 'MIRROR');
assert.equal(compileRecipePlan('RADIAL(12)').count, 12);
assert.equal(compileRecipePlan('RADIAL(12) | MIRROR(15)').count, 24);
assert.equal(compileRecipePlan('RADIAL(12) | NEST(3,.82,.03)').count, 36);
assert.equal(compileRecipePlan('RADIAL(96) | MIRROR | NEST(4,.8,.02)').count, MAX_TRANSFORMS);
assert.equal(compileRecipePlan('RADIAL(96) | MIRROR | NEST(4,.8,.02)').truncated, true);

const fractureA = compileRecipePlan('RADIAL(18) | NEST(2,.9,.025) | PERTURB(.055)');
const fractureB = compileRecipePlan('RADIAL(18) | NEST(2,.9,.025) | PERTURB(.055)');
assert.deepEqual(fractureA.states, fractureB.states, 'Perturb must remain deterministic while a stroke is drawn');

const compiled = compileFormula('RADIAL(8) | MIRROR', { width: 1600, height: 1200 });
assert.equal(compiled.transforms.length, 16);
for (const transform of compiled.transforms) {
  const point = transform({ x: 800, y: 300, pressure: 1 });
  assert.equal(Number.isFinite(point.x), true);
  assert.equal(Number.isFinite(point.y), true);
}

assert.ok(SYMMETRY_RECIPE_PRESETS.some((recipe) => recipe.id === 'portal'));
assert.ok(SYMMETRY_RECIPE_PRESETS.some((recipe) => recipe.id === 'counterspin'));
assert.throws(() => parseFormula('ALIEN_TEETH(12)'), /DOMISTIKA_RECIPE_OPERATOR/);
assert.throws(() => parseFormula('RADIAL('), /DOMISTIKA_RECIPE_SYNTAX/);

const [index, pkgText, entry, runtime, panel, docs] = await Promise.all([
  read('index.html'),
  read('package.json'),
  read('src/DomistikaSymmetryRecipesV0932.js'),
  read('src/v0932/symmetryRecipeRuntime.js'),
  read('src/v0932/symmetryRecipePanel.js'),
  read('docs/SYMMETRY_RECIPES_V0932.md'),
]);
const pkg = JSON.parse(pkgText);
assert.equal(pkg.version, '0.9.32');
assert.match(pkg.scripts.check, /tests\/v0932-static\.mjs/);
assert.match(index, /DomistikaSymmetryRecipesV0932\.js/);
assert.match(entry, /symmetryRecipeRuntime\.js/);
assert.match(entry, /symmetryRecipePanel\.js/);
assert.match(runtime, /CanvasEngine\.prototype\.symmetryTransforms/);
assert.match(runtime, /domistikaSymmetryRecipesV0932/);
assert.match(panel, /Symmetry Recipes/);
assert.match(panel, /Run formula/);
for (const primitive of ['RADIAL', 'MIRROR', 'NEST', 'SPIRAL', 'COUNTERSPIN', 'PERTURB']) assert.match(panel, new RegExp(primitive));
assert.match(docs, /domistika\.symmetry-recipe\.v1|Symmetry Recipes/);

console.log('Domistika v0.9.32 symmetry recipe contracts passed.');
