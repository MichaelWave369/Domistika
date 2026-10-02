const VERSION = '0.9.33';
const SCHEMA = 'domistika.recipe-artifact.v1';
const MAX_STROKES = 16;
const MAX_POINTS_PER_STROKE = 256;
const DRAW_TOOLS = new Set(['pencil', 'ink', 'marker', 'airbrush', 'eraser']);

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

const PRESETS = Object.freeze([
  Object.freeze({
    id: 'portal-bloom',
    label: 'Portal Bloom',
    recipe: 'portal',
    canvas: Object.freeze({ width: 1200, height: 1200 }),
    strokes: Object.freeze([
      Object.freeze({ tool: 'ink', color: '#7c3aed', size: 18, opacity: 0.92, smoothing: 28, points: Object.freeze([{ x: .50, y: .37 }, { x: .56, y: .43 }, { x: .53, y: .50 }, { x: .47, y: .55 }]) }),
      Object.freeze({ tool: 'marker', color: '#22d3ee', size: 12, opacity: 0.76, smoothing: 22, points: Object.freeze([{ x: .50, y: .29 }, { x: .54, y: .36 }, { x: .50, y: .43 }, { x: .46, y: .49 }]) }),
      Object.freeze({ tool: 'ink', color: '#f472b6', size: 8, opacity: 0.9, smoothing: 18, points: Object.freeze([{ x: .64, y: .50 }, { x: .59, y: .54 }, { x: .53, y: .52 }, { x: .50, y: .47 }]) }),
      Object.freeze({ tool: 'pencil', color: '#fde047', size: 5, opacity: 0.95, smoothing: 35, points: Object.freeze([{ x: .50, y: .41 }, { x: .57, y: .47 }, { x: .55, y: .55 }, { x: .48, y: .60 }]) }),
    ]),
  }),
  Object.freeze({
    id: 'counterspin-flower',
    label: 'Counterspin Flower',
    recipe: 'counterspin',
    canvas: Object.freeze({ width: 1200, height: 1200 }),
    strokes: Object.freeze([
      Object.freeze({ tool: 'ink', color: '#0ea5e9', size: 14, opacity: .9, smoothing: 30, points: Object.freeze([{ x: .50, y: .35 }, { x: .57, y: .41 }, { x: .55, y: .49 }, { x: .49, y: .54 }]) }),
      Object.freeze({ tool: 'marker', color: '#a855f7', size: 20, opacity: .55, smoothing: 24, points: Object.freeze([{ x: .50, y: .42 }, { x: .61, y: .48 }, { x: .56, y: .57 }, { x: .48, y: .60 }]) }),
      Object.freeze({ tool: 'ink', color: '#34d399', size: 7, opacity: .88, smoothing: 16, points: Object.freeze([{ x: .50, y: .27 }, { x: .53, y: .34 }, { x: .50, y: .41 }]) }),
      Object.freeze({ tool: 'pencil', color: '#fbbf24', size: 4, opacity: .95, smoothing: 40, points: Object.freeze([{ x: .67, y: .50 }, { x: .60, y: .55 }, { x: .52, y: .53 }]) }),
    ]),
  }),
  Object.freeze({
    id: 'gear-halo',
    label: 'Gear Halo',
    recipe: 'gear',
    canvas: Object.freeze({ width: 1200, height: 1200 }),
    strokes: Object.freeze([
      Object.freeze({ tool: 'ink', color: '#f97316', size: 10, opacity: .92, smoothing: 14, points: Object.freeze([{ x: .50, y: .31 }, { x: .54, y: .38 }, { x: .51, y: .44 }]) }),
      Object.freeze({ tool: 'marker', color: '#eab308', size: 16, opacity: .62, smoothing: 18, points: Object.freeze([{ x: .50, y: .40 }, { x: .58, y: .45 }, { x: .57, y: .52 }, { x: .51, y: .57 }]) }),
      Object.freeze({ tool: 'ink', color: '#06b6d4', size: 6, opacity: .92, smoothing: 20, points: Object.freeze([{ x: .63, y: .50 }, { x: .58, y: .53 }, { x: .52, y: .51 }]) }),
    ]),
  }),
  Object.freeze({
    id: 'fracture-iris',
    label: 'Fracture Iris',
    recipe: 'fracture',
    canvas: Object.freeze({ width: 1200, height: 1200 }),
    strokes: Object.freeze([
      Object.freeze({ tool: 'ink', color: '#ec4899', size: 11, opacity: .9, smoothing: 16, points: Object.freeze([{ x: .50, y: .34 }, { x: .55, y: .40 }, { x: .52, y: .47 }, { x: .47, y: .52 }]) }),
      Object.freeze({ tool: 'marker', color: '#8b5cf6', size: 18, opacity: .5, smoothing: 22, points: Object.freeze([{ x: .50, y: .41 }, { x: .60, y: .47 }, { x: .56, y: .55 }]) }),
      Object.freeze({ tool: 'ink', color: '#38bdf8', size: 6, opacity: .9, smoothing: 26, points: Object.freeze([{ x: .65, y: .50 }, { x: .59, y: .56 }, { x: .51, y: .58 }]) }),
      Object.freeze({ tool: 'pencil', color: '#f8fafc', size: 3, opacity: .86, smoothing: 38, points: Object.freeze([{ x: .50, y: .25 }, { x: .52, y: .33 }, { x: .50, y: .40 }]) }),
    ]),
  }),
]);

const PRESET_MAP = new Map(PRESETS.map((preset) => [preset.id, preset]));

function requireApi(api = globalThis.window?.Domistika) {
  if (!api?.schema || api.schema !== 'domistika.sdk.v1') throw new Error('DOMISTIKA_RECIPE_ARTIFACT_SDK_UNAVAILABLE');
  if (!api.ready?.()) throw new Error('DOMISTIKA_RECIPE_ARTIFACT_STUDIO_NOT_READY');
  return api;
}

function safeColor(value) {
  const color = String(value || '').trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(color)) throw new Error('DOMISTIKA_RECIPE_ARTIFACT_COLOR_INVALID');
  return color;
}

function normalizePoint(point) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  const p = point?.p == null ? 1 : Number(point.p);
  if (![x, y, p].every(Number.isFinite) || x < 0 || x > 1 || y < 0 || y > 1) {
    throw new Error('DOMISTIKA_RECIPE_ARTIFACT_POINT_INVALID');
  }
  return Object.freeze({ x, y, p: clamp(p, .08, 1) });
}

function normalizeStroke(stroke) {
  const points = Array.isArray(stroke?.points) ? stroke.points : [];
  if (points.length < 2 || points.length > MAX_POINTS_PER_STROKE) {
    throw new Error('DOMISTIKA_RECIPE_ARTIFACT_STROKE_POINTS_INVALID');
  }
  const tool = String(stroke?.tool || 'ink').trim().toLowerCase();
  if (!DRAW_TOOLS.has(tool)) throw new Error('DOMISTIKA_RECIPE_ARTIFACT_TOOL_INVALID');
  return Object.freeze({
    tool,
    color: safeColor(stroke?.color || '#1b1820'),
    size: clamp(stroke?.size ?? 10, 1, 180),
    opacity: clamp(stroke?.opacity ?? 1, .01, 1),
    smoothing: clamp(stroke?.smoothing ?? 28, 0, 95),
    points: Object.freeze(points.map(normalizePoint)),
  });
}

function normalizeSpec(options = {}) {
  const presetId = options.preset == null ? null : String(options.preset).trim().toLowerCase();
  const preset = presetId ? PRESET_MAP.get(presetId) : null;
  if (presetId && !preset) throw new Error('DOMISTIKA_RECIPE_ARTIFACT_PRESET_UNKNOWN');

  const source = preset || {};
  const strokesSource = options.strokes ?? source.strokes;
  if (!Array.isArray(strokesSource) || strokesSource.length < 1 || strokesSource.length > MAX_STROKES) {
    throw new Error('DOMISTIKA_RECIPE_ARTIFACT_STROKES_INVALID');
  }

  const recipe = options.recipe == null ? source.recipe || null : String(options.recipe).trim().toLowerCase();
  const formula = options.formula == null ? null : String(options.formula).trim();
  if (!recipe && !formula) throw new Error('DOMISTIKA_RECIPE_ARTIFACT_RECIPE_REQUIRED');

  const fallbackCanvas = source.canvas || { width: 1200, height: 1200 };
  return Object.freeze({
    preset: preset?.id || null,
    label: String(options.name || preset?.label || 'Recipe Artifact').trim().slice(0, 120) || 'Recipe Artifact',
    recipe,
    formula,
    freshCanvas: options.freshCanvas === true,
    clearFirst: options.clearFirst === true,
    width: clamp(options.width ?? fallbackCanvas.width, 256, 4096),
    height: clamp(options.height ?? fallbackCanvas.height, 256, 4096),
    strokes: Object.freeze(strokesSource.map(normalizeStroke)),
  });
}

export function listRecipeArtifactPresets() {
  return Object.freeze(PRESETS.map((preset) => Object.freeze({
    id: preset.id,
    label: preset.label,
    recipe: preset.recipe,
    strokeCount: preset.strokes.length,
    canvas: Object.freeze({ ...preset.canvas }),
  })));
}

export function getRecipeArtifactPreset(id) {
  const preset = PRESET_MAP.get(String(id || '').trim().toLowerCase());
  return preset ? Object.freeze({
    id: preset.id,
    label: preset.label,
    recipe: preset.recipe,
    strokeCount: preset.strokes.length,
    canvas: Object.freeze({ ...preset.canvas }),
  }) : null;
}

export async function drawRecipeArtifact(options = {}, apiInput = null) {
  const api = requireApi(apiInput || globalThis.window?.Domistika);
  const spec = normalizeSpec(options);

  if (spec.freshCanvas) {
    await api.canvas.new({ width: spec.width, height: spec.height, name: spec.label });
  } else if (spec.clearFirst) {
    const active = api.canvas.info().activeLayerId;
    if (!active) throw new Error('DOMISTIKA_RECIPE_ARTIFACT_ACTIVE_LAYER_REQUIRED');
    api.layers.clear(active);
  }

  if (spec.formula) api.symmetryRecipes.applyFormula(spec.formula, spec.label);
  else api.symmetryRecipes.apply(spec.recipe);

  const results = [];
  for (let index = 0; index < spec.strokes.length; index += 1) {
    const stroke = spec.strokes[index];
    results.push(api.stroke(stroke.points, {
      tool: stroke.tool,
      color: stroke.color,
      size: stroke.size,
      opacity: stroke.opacity,
      smoothing: stroke.smoothing,
      space: 'normalized',
      history: !spec.freshCanvas && !spec.clearFirst && index === 0,
      message: `Recipe artifact · ${spec.label} · stroke ${index + 1}/${spec.strokes.length}`,
    }));
  }

  const activeRecipe = api.symmetryRecipes.active?.() || null;
  const result = Object.freeze({
    ok: true,
    schema: SCHEMA,
    version: VERSION,
    preset: spec.preset,
    label: spec.label,
    recipe: spec.recipe,
    formula: spec.formula,
    strokeCount: results.length,
    activeRecipe,
    canvas: api.canvas.info(),
  });

  globalThis.window?.dispatchEvent?.(new CustomEvent('domistika:recipe-artifact', { detail: result }));
  return result;
}

if (typeof window !== 'undefined') {
  window.domistikaRecipeArtifactsV0933 = Object.freeze({
    version: VERSION,
    schema: SCHEMA,
    presets: listRecipeArtifactPresets,
    preset: getRecipeArtifactPreset,
    draw: drawRecipeArtifact,
  });
}

export { VERSION, SCHEMA, MAX_STROKES, MAX_POINTS_PER_STROKE };
