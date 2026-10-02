import { CanvasEngine } from '../core/CanvasEngine.js';
import { ensureModeOption } from '../v092/geometryModes.js';
import { getEngine, setStatus } from '../v093/runtime.js';
import {
  RECIPE_SCHEMA,
  SYMMETRY_RECIPE_PRESETS,
  compileFormula,
  listRecipes,
  parseFormula,
  recipeById,
} from './symmetryRecipes.js';

const CACHE = new WeakMap();
const originalSymmetryTransforms = CanvasEngine.prototype.symmetryTransforms;

function selectedFormula(engine) {
  const mode = String(engine?.settings?.symmetry || '');
  if (!mode.startsWith('recipe:')) return null;
  const id = mode.slice('recipe:'.length);
  if (id === 'custom') return String(engine.settings.symmetryRecipeFormula || '').trim() || null;
  return recipeById(id)?.formula || String(engine.settings.symmetryRecipeFormula || '').trim() || null;
}

function compiledForEngine(engine) {
  const formula = selectedFormula(engine);
  if (!formula) return null;
  const cacheKey = `${engine.width}x${engine.height}:${formula}`;
  const cached = CACHE.get(engine);
  if (cached?.key === cacheKey) return cached.compiled;
  const compiled = compileFormula(formula, { width: engine.width, height: engine.height });
  CACHE.set(engine, { key: cacheKey, compiled });
  return compiled;
}

CanvasEngine.prototype.symmetryTransforms = function symmetryTransformsV0932() {
  if (!String(this.settings.symmetry || '').startsWith('recipe:')) return originalSymmetryTransforms.call(this);
  try {
    return compiledForEngine(this)?.transforms || originalSymmetryTransforms.call(this);
  } catch (error) {
    console.warn('[Domistika Symmetry Recipes]', error);
    return originalSymmetryTransforms.call(this);
  }
};

function syncSelector(mode, label) {
  ensureModeOption(mode, label);
  const select = document.querySelector('#symmetryInput');
  if (select) select.value = mode;
}

function emitApplied(engine, detail) {
  document.dispatchEvent(new CustomEvent('domistika:v0932-symmetry-recipe', {
    detail: {
      schema: RECIPE_SCHEMA,
      symmetry: engine.settings.symmetry,
      ...detail,
    },
  }));
}

function commitFormula(engine, { id, label, formula }) {
  parseFormula(formula);
  engine.settings.symmetryRecipeId = id;
  engine.settings.symmetryRecipeFormula = formula;
  CACHE.delete(engine);
  const mode = `recipe:${id}`;
  syncSelector(mode, `Recipe · ${label}`);
  engine.setSetting('symmetry', mode);
  engine.redrawOverlay();
  const compiled = compiledForEngine(engine);
  const suffix = compiled?.truncated ? ' (capped for performance)' : '';
  setStatus(`${label} recipe active · ${compiled?.count || 1} copies${suffix}`);
  emitApplied(engine, {
    id,
    label,
    formula,
    copies: compiled?.count || 1,
    truncated: Boolean(compiled?.truncated),
  });
  return {
    id,
    label,
    formula,
    copies: compiled?.count || 1,
    truncated: Boolean(compiled?.truncated),
  };
}

export function applyRecipe(id) {
  const preset = recipeById(id);
  if (!preset) throw new Error(`DOMISTIKA_RECIPE_UNKNOWN:${id}`);
  const engine = getEngine();
  if (!engine) throw new Error('DOMISTIKA_RECIPE_ENGINE_UNAVAILABLE');
  return commitFormula(engine, preset);
}

export function applyFormula(formula, label = 'Custom') {
  const engine = getEngine();
  if (!engine) throw new Error('DOMISTIKA_RECIPE_ENGINE_UNAVAILABLE');
  return commitFormula(engine, {
    id: 'custom',
    label: String(label || 'Custom'),
    formula: String(formula || '').trim(),
  });
}

export function activeRecipe() {
  const engine = getEngine();
  if (!engine) return null;
  const mode = String(engine.settings.symmetry || '');
  if (!mode.startsWith('recipe:')) return null;
  const id = mode.slice('recipe:'.length);
  const preset = recipeById(id);
  const formula = selectedFormula(engine);
  if (!formula) return null;
  let compiled = null;
  try { compiled = compiledForEngine(engine); } catch {}
  return Object.freeze({
    id,
    label: preset?.label || 'Custom',
    formula,
    copies: compiled?.count || null,
    truncated: Boolean(compiled?.truncated),
  });
}

function installPresetOptions() {
  for (const preset of SYMMETRY_RECIPE_PRESETS) ensureModeOption(`recipe:${preset.id}`, `Recipe · ${preset.label}`);
  const engine = getEngine();
  if (engine?.settings?.symmetry === 'recipe:custom') ensureModeOption('recipe:custom', 'Recipe · Custom');
  const select = document.querySelector('#symmetryInput');
  if (select && engine?.settings?.symmetry?.startsWith?.('recipe:')) select.value = engine.settings.symmetry;
}

function wait(attempt = 0) {
  const engine = getEngine();
  const select = document.querySelector('#symmetryInput');
  if (engine && select) {
    installPresetOptions();
    return;
  }
  if (attempt > 720) return;
  requestAnimationFrame(() => wait(attempt + 1));
}
wait();

window.domistikaSymmetryRecipesV0932 = Object.freeze({
  version: '0.9.32',
  schema: RECIPE_SCHEMA,
  list: listRecipes,
  parse: parseFormula,
  apply: applyRecipe,
  applyFormula,
  active: activeRecipe,
});
