import { getEngine, readFavoriteColors } from '../v093/runtime.js';
import { compileRecipePlan } from '../v0932/symmetryRecipes.js';
import { plateById, PLATE_SCHEMA, VERSION as PLATE_VERSION } from '../v0935/compositionPlates.js';

export const VERSION = '0.9.36';
export const RECEIPT_SCHEMA = 'domistika.symmetry-receipt.v1';

const freeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(freeze);
  return value;
};

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

async function sha256Text(value) {
  if (!globalThis.crypto?.subtle) throw new Error('DOMISTIKA_SYMMETRY_RECEIPT_CRYPTO_UNAVAILABLE');
  const bytes = new TextEncoder().encode(String(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (entry) => entry.toString(16).padStart(2, '0')).join('');
}

function receiptBody(receipt) {
  const {
    contentHash: _contentHash,
    ...body
  } = receipt || {};
  return body;
}

function cleanPalette(input) {
  const seen = new Set();
  const colors = [];
  for (const entry of Array.isArray(input) ? input : []) {
    const color = String(entry || '').trim().toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(color) || seen.has(color)) continue;
    seen.add(color);
    colors.push(color);
    if (colors.length >= 24) break;
  }
  return colors;
}

function activeRecipeSnapshot(engine, provided = undefined) {
  if (provided !== undefined) return provided;
  const live = globalThis.window?.domistikaSymmetryRecipesV0932?.active?.();
  if (live?.formula) return live;

  const mode = String(engine?.settings?.symmetry || '');
  if (!mode.startsWith('recipe:')) return null;
  const formula = String(engine?.settings?.symmetryRecipeFormula || '').trim();
  if (!formula) return null;

  let compiled = null;
  try { compiled = compileRecipePlan(formula); } catch {}
  return {
    id: mode.slice('recipe:'.length) || 'custom',
    label: 'Project recipe',
    formula,
    copies: compiled?.count || null,
    truncated: Boolean(compiled?.truncated),
  };
}

function regionSnapshot(region) {
  let compiled = null;
  if (region.formula) {
    try { compiled = compileRecipePlan(region.formula); } catch {}
  }
  return {
    id: String(region.id || ''),
    label: String(region.label || ''),
    geometry: JSON.parse(JSON.stringify(region.geometry || null)),
    formula: region.formula || null,
    excluded: region.excluded === true,
    output: region.output || 'non-excluded',
    transformCount: region.formula ? (compiled?.count || null) : 1,
    truncated: Boolean(compiled?.truncated),
  };
}

function activePlateSnapshot(engine, provided = undefined) {
  if (provided !== undefined) return provided;
  const plate = plateById(engine?.settings?.compositionPlateId);
  if (!plate) return null;
  const regions = plate.regions.map(regionSnapshot);
  return {
    schema: PLATE_SCHEMA,
    version: PLATE_VERSION,
    id: plate.id,
    label: plate.label,
    description: plate.description,
    regions,
  };
}

function directorSnapshot(engine, provided = undefined) {
  const raw = provided !== undefined ? provided : engine?.settings?.symmetryReceiptDirector;
  if (!raw || typeof raw !== 'object') return null;
  const seed = Number(raw.seed);
  return {
    schema: 'domistika.art-director-lineage.v1',
    seed: Number.isFinite(seed) ? seed : null,
    paletteId: String(raw.paletteId || ''),
    palette: cleanPalette(raw.palette),
    symmetry: String(raw.symmetry || ''),
    profile: String(raw.profile || ''),
    label: String(raw.label || '').slice(0, 120),
    recordedAt: raw.recordedAt || null,
  };
}

function legacyTransformCount(engine) {
  try {
    const transforms = engine?.symmetryTransforms?.();
    return Array.isArray(transforms) && transforms.length ? transforms.length : 1;
  } catch {
    return 1;
  }
}

function summarizeTransformCount(engine, recipe, plate) {
  if (plate?.regions?.length) {
    const counts = plate.regions
      .map((region) => Number(region.transformCount))
      .filter((value) => Number.isFinite(value) && value > 0);
    return {
      count: counts.length ? Math.max(...counts) : 1,
      mode: 'plate-region-max',
    };
  }
  if (Number.isFinite(Number(recipe?.copies))) {
    return {
      count: Number(recipe.copies),
      mode: 'active-recipe',
    };
  }
  return {
    count: legacyTransformCount(engine),
    mode: 'legacy-symmetry',
  };
}

function normalizeCanvas(engine, provided = undefined) {
  if (provided) return {
    width: Number(provided.width) || 0,
    height: Number(provided.height) || 0,
  };
  return {
    width: Number(engine?.width) || 0,
    height: Number(engine?.height) || 0,
  };
}

export async function bindSymmetryReceipt(receipt) {
  if (!receipt || receipt.schema !== RECEIPT_SCHEMA) {
    throw new Error('DOMISTIKA_SYMMETRY_RECEIPT_INVALID');
  }
  const body = receiptBody(receipt);
  const contentHash = 'sha256:' + await sha256Text(stableJson(body));
  return freeze({ ...body, contentHash });
}

export async function verifySymmetryReceipt(receipt) {
  if (!receipt || receipt.schema !== RECEIPT_SCHEMA) {
    throw new Error('DOMISTIKA_SYMMETRY_RECEIPT_INVALID');
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(String(receipt.contentHash || ''))) {
    throw new Error('DOMISTIKA_SYMMETRY_RECEIPT_HASH_REQUIRED');
  }
  const expected = 'sha256:' + await sha256Text(stableJson(receiptBody(receipt)));
  if (expected !== String(receipt.contentHash).toLowerCase()) {
    throw new Error('DOMISTIKA_SYMMETRY_RECEIPT_HASH_MISMATCH');
  }
  return true;
}

export async function buildSymmetryReceipt(options = {}) {
  const engine = options.engine || getEngine();
  if (!engine) throw new Error('DOMISTIKA_SYMMETRY_RECEIPT_ENGINE_UNAVAILABLE');

  const recipe = activeRecipeSnapshot(engine, options.recipe);
  const plate = activePlateSnapshot(engine, options.plate);
  const director = directorSnapshot(engine, options.director);
  const favoritePalette = cleanPalette(options.palette ?? readFavoriteColors());
  const palette = director?.palette?.length ? director.palette : favoritePalette;
  const paletteSource = director?.palette?.length ? 'art-director' : 'favorite-colors';
  const transform = summarizeTransformCount(engine, recipe, plate);
  const capturedAt = options.capturedAt || new Date().toISOString();

  const body = {
    schema: RECEIPT_SCHEMA,
    version: VERSION,
    capturedAt,
    canvas: normalizeCanvas(engine, options.canvas),
    formula: recipe?.formula || null,
    formulaAuthority: plate ? 'plate-regions' : recipe ? 'global-recipe' : 'legacy-symmetry',
    plateId: plate?.id || null,
    seed: director?.seed ?? null,
    seedSource: director?.seed != null ? 'art-director' : 'none',
    palette,
    paletteSource,
    transformCount: transform.count,
    transformCountMode: transform.mode,
    symmetryMode: String(engine?.settings?.symmetry || 'none'),
    recipe: recipe ? {
      id: String(recipe.id || 'custom'),
      label: String(recipe.label || 'Custom'),
      formula: String(recipe.formula || ''),
      transformCount: Number(recipe.copies) || null,
      truncated: Boolean(recipe.truncated),
    } : null,
    plate,
    director,
  };

  return bindSymmetryReceipt(body);
}

export function rememberArtDirectorPlan(plan, engineInput = null, recordedAt = null) {
  const engine = engineInput || getEngine();
  if (!engine || !plan || typeof plan !== 'object') return false;
  engine.settings.symmetryReceiptDirector = {
    seed: Number.isFinite(Number(plan.seed)) ? Number(plan.seed) : null,
    paletteId: String(plan.paletteId || ''),
    palette: cleanPalette(plan.palette),
    symmetry: String(plan.symmetry || ''),
    profile: String(plan.profile || ''),
    label: String(plan.label || '').slice(0, 120),
    recordedAt: recordedAt || new Date().toISOString(),
  };
  return true;
}

export function clearArtDirectorPlan(engineInput = null) {
  const engine = engineInput || getEngine();
  if (!engine) return false;
  engine.settings.symmetryReceiptDirector = null;
  return true;
}

export function receiptHashAnchor(receipt) {
  if (!/^sha256:[0-9a-f]{64}$/.test(String(receipt?.contentHash || ''))) {
    throw new Error('DOMISTIKA_SYMMETRY_RECEIPT_HASH_REQUIRED');
  }
  return 'Symmetry receipt ' + String(receipt.contentHash).toLowerCase();
}
