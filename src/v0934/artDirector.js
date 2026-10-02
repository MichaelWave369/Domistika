const VERSION = '0.9.34';
const SCHEMA = 'domistika.art-director.v1';
const MAX_DIRECTED_STROKES = 10;
const MAX_DIRECTED_POINTS = 6;

const RECIPE_IDS = new Set(['mandala', 'kaleido', 'gear', 'vortex', 'counterspin', 'portal', 'flower', 'fracture']);

const PALETTES = Object.freeze({
  'electric-dusk': Object.freeze(['#7c3aed', '#22d3ee', '#f472b6', '#fde047']),
  'solar-forge': Object.freeze(['#f97316', '#fbbf24', '#06b6d4', '#f8fafc']),
  biolume: Object.freeze(['#34d399', '#22d3ee', '#a3e635', '#f0fdf4']),
  'moon-glass': Object.freeze(['#e2e8f0', '#94a3b8', '#67e8f9', '#c4b5fd']),
  prismatica: Object.freeze(['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7']),
  'signal-break': Object.freeze(['#ec4899', '#8b5cf6', '#38bdf8', '#f8fafc']),
  orbital: Object.freeze(['#0ea5e9', '#a855f7', '#34d399', '#fbbf24']),
});

const PROFILES = Object.freeze([
  Object.freeze({
    id: 'mechanical',
    label: 'Mechanical',
    keywords: Object.freeze(['mechanical', 'machine', 'gear', 'clockwork', 'industrial', 'cog', 'reactor']),
    recipe: 'gear',
    palette: 'solar-forge',
    sweep: 0.42,
    radialBias: 0.12,
  }),
  Object.freeze({
    id: 'organic',
    label: 'Organic',
    keywords: Object.freeze(['organic', 'flower', 'botanical', 'bloom', 'living', 'petal', 'garden']),
    recipe: 'flower',
    palette: 'biolume',
    sweep: 0.72,
    radialBias: 0.08,
  }),
  Object.freeze({
    id: 'calm',
    label: 'Sacred Calm',
    keywords: Object.freeze(['calm', 'sacred', 'meditative', 'minimal', 'temple', 'mandala', 'still']),
    recipe: 'mandala',
    palette: 'moon-glass',
    sweep: 0.32,
    radialBias: 0.04,
  }),
  Object.freeze({
    id: 'crystal',
    label: 'Crystal',
    keywords: Object.freeze(['crystal', 'kaleido', 'kaleidoscope', 'prism', 'mirror', 'glass', 'facet']),
    recipe: 'kaleido',
    palette: 'prismatica',
    sweep: 0.48,
    radialBias: 0.1,
  }),
  Object.freeze({
    id: 'vortex',
    label: 'Vortex',
    keywords: Object.freeze(['vortex', 'spiral', 'storm', 'whirl', 'tunnel', 'spin', 'cyclone']),
    recipe: 'vortex',
    palette: 'electric-dusk',
    sweep: 0.95,
    radialBias: 0.16,
  }),
  Object.freeze({
    id: 'fracture',
    label: 'Fracture',
    keywords: Object.freeze(['fracture', 'glitch', 'broken', 'chaos', 'noise', 'shatter', 'corrupt']),
    recipe: 'fracture',
    palette: 'signal-break',
    sweep: 0.58,
    radialBias: 0.18,
  }),
  Object.freeze({
    id: 'orbital',
    label: 'Orbital',
    keywords: Object.freeze(['orbit', 'orbital', 'counterspin', 'dual', 'opposing', 'planet', 'binary']),
    recipe: 'counterspin',
    palette: 'orbital',
    sweep: 0.76,
    radialBias: 0.14,
  }),
  Object.freeze({
    id: 'cosmic',
    label: 'Cosmic Mechanical',
    keywords: Object.freeze(['cosmic', 'portal', 'space', 'celestial', 'alien', 'vessel', 'reactor', 'energy']),
    recipe: 'portal',
    palette: 'electric-dusk',
    sweep: 0.82,
    radialBias: 0.13,
  }),
]);

const DEFAULT_PROFILE = PROFILES.find((profile) => profile.id === 'cosmic');

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
const round = (value, places = 4) => Number(Number(value).toFixed(places));

function cleanText(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().replace(/\s+/g, ' ').slice(0, max);
}

function hashString(value) {
  let hash = 2166136261;
  const source = String(value);
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createPrng(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function keywordScore(profile, text) {
  return profile.keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);
}

function inferProfile(text) {
  const normalized = String(text || '').toLowerCase();
  let best = DEFAULT_PROFILE;
  let bestScore = 0;
  for (const profile of PROFILES) {
    const score = keywordScore(profile, normalized);
    if (score > bestScore) {
      best = profile;
      bestScore = score;
    }
  }
  return best;
}

function safeColor(value) {
  const color = String(value || '').trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(color)) throw new Error('DOMISTIKA_ART_DIRECTOR_COLOR_INVALID');
  return color;
}

function resolvePalette(input, profile) {
  if (Array.isArray(input)) {
    if (input.length < 2 || input.length > 8) throw new Error('DOMISTIKA_ART_DIRECTOR_PALETTE_INVALID');
    return Object.freeze(input.map(safeColor));
  }

  const id = cleanText(input || 'auto', 80).toLowerCase();
  const resolved = id === 'auto' ? profile.palette : id;
  const palette = PALETTES[resolved];
  if (!palette) throw new Error('DOMISTIKA_ART_DIRECTOR_PALETTE_UNKNOWN');
  return palette;
}

function resolveRecipe(input, profile) {
  const requested = cleanText(input || 'auto', 80).toLowerCase();
  if (requested === 'auto') return profile.recipe;
  if (!RECIPE_IDS.has(requested)) throw new Error('DOMISTIKA_ART_DIRECTOR_SYMMETRY_UNKNOWN');
  return requested;
}

function pointOnPolar(angle, radius, jitterAngle, jitterRadius, random) {
  const a = angle + (random() - 0.5) * jitterAngle;
  const r = radius + (random() - 0.5) * jitterRadius;
  return Object.freeze({
    x: round(clamp(0.5 + Math.cos(a) * r, 0.03, 0.97)),
    y: round(clamp(0.5 + Math.sin(a) * r, 0.03, 0.97)),
    p: round(clamp(0.72 + random() * 0.28, 0.08, 1), 3),
  });
}

function toolFor(index, complexity, random) {
  const tools = complexity > 0.72
    ? ['ink', 'marker', 'pencil', 'airbrush']
    : complexity > 0.38
      ? ['ink', 'marker', 'pencil']
      : ['ink', 'pencil'];
  const offset = Math.floor(random() * tools.length);
  return tools[(index + offset) % tools.length];
}

function buildStroke({ index, count, pointsPerStroke, palette, profile, density, complexity, surprise, random }) {
  const baseAngle = (Math.PI * 2 * index / count) + (random() - 0.5) * 0.55;
  const radiusStart = clamp(
    0.055 + profile.radialBias + (index / Math.max(1, count - 1)) * (0.13 + density * 0.08),
    0.06,
    0.31,
  );
  const radialTravel = 0.035 + complexity * 0.075 + random() * 0.025;
  const sweep = profile.sweep * (0.35 + complexity * 0.7) * (random() < 0.5 ? -1 : 1);
  const jitterAngle = surprise * 0.3;
  const jitterRadius = surprise * 0.06;
  const points = [];

  for (let pointIndex = 0; pointIndex < pointsPerStroke; pointIndex += 1) {
    const t = pointIndex / Math.max(1, pointsPerStroke - 1);
    const angle = baseAngle + sweep * t + Math.sin(t * Math.PI) * surprise * 0.18;
    const radius = radiusStart + radialTravel * t + Math.sin(t * Math.PI * 2) * surprise * 0.018;
    points.push(pointOnPolar(angle, radius, jitterAngle, jitterRadius, random));
  }

  const colorOffset = Math.floor(random() * palette.length);
  const color = palette[(index + colorOffset) % palette.length];
  const baseSize = 4 + (1 - density) * 5 + complexity * 8;
  const size = round(clamp(baseSize * (0.72 + random() * 0.72), 2, 24), 2);
  const opacity = round(clamp(0.56 + random() * 0.38 - density * 0.08, 0.3, 1), 3);
  const smoothing = round(clamp(12 + (1 - surprise) * 36 + random() * 18, 0, 90), 1);

  return Object.freeze({
    tool: toolFor(index, complexity, random),
    color,
    size,
    opacity,
    smoothing,
    points: Object.freeze(points),
  });
}

export function listDirectorPalettes() {
  return Object.freeze(Object.entries(PALETTES).map(([id, colors]) => Object.freeze({
    id,
    colors: Object.freeze([...colors]),
  })));
}

export function listDirectorProfiles() {
  return Object.freeze(PROFILES.map((profile) => Object.freeze({
    id: profile.id,
    label: profile.label,
    recipe: profile.recipe,
    palette: profile.palette,
    keywords: Object.freeze([...profile.keywords]),
  })));
}

export function planArtDirection(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('DOMISTIKA_ART_DIRECTOR_OPTIONS_INVALID');
  }

  const prompt = cleanText(options.prompt || options.mood || '', 500);
  const mood = cleanText(options.mood || prompt || 'cosmic mechanical', 160);
  const profile = inferProfile(`${mood} ${prompt}`);
  const density = clamp(options.density ?? 0.62, 0, 1);
  const complexity = clamp(options.complexity ?? 0.72, 0, 1);
  const surprise = clamp(options.surprise ?? 0.18, 0, 1);
  const recipe = resolveRecipe(options.symmetry, profile);
  const palette = resolvePalette(options.colors ?? options.palette, profile);

  const seedText = cleanText(options.seed || [
    prompt,
    mood,
    recipe,
    palette.join(','),
    density,
    complexity,
    surprise,
  ].join('|'), 1000);
  const seed = hashString(seedText || 'domistika-art-director');
  const random = createPrng(seed);

  const strokeCount = Math.max(3, Math.min(
    MAX_DIRECTED_STROKES,
    Math.round(3 + density * 3.4 + complexity * 3.2),
  ));
  const pointsPerStroke = Math.max(3, Math.min(
    MAX_DIRECTED_POINTS,
    Math.round(3 + complexity * 2.8),
  ));

  const strokes = [];
  for (let index = 0; index < strokeCount; index += 1) {
    strokes.push(buildStroke({
      index,
      count: strokeCount,
      pointsPerStroke,
      palette,
      profile,
      density,
      complexity,
      surprise,
      random,
    }));
  }

  const label = cleanText(options.name || `${profile.label} · ${recipe}`, 120) || 'Directed Artifact';
  const width = Math.round(clamp(options.width ?? 1200, 256, 4096));
  const height = Math.round(clamp(options.height ?? 1200, 256, 4096));

  return Object.freeze({
    schema: SCHEMA,
    version: VERSION,
    label,
    prompt,
    mood,
    profile: profile.id,
    symmetry: recipe,
    paletteId: Array.isArray(options.colors ?? options.palette) ? 'custom' : (cleanText(options.palette || 'auto', 80).toLowerCase() === 'auto' ? profile.palette : cleanText(options.palette, 80).toLowerCase()),
    palette: Object.freeze([...palette]),
    density: round(density, 3),
    complexity: round(complexity, 3),
    surprise: round(surprise, 3),
    seed,
    width,
    height,
    strokeCount,
    pointsPerStroke,
    strokes: Object.freeze(strokes),
  });
}

function requireApi(api = globalThis.window?.Domistika) {
  if (!api?.schema || api.schema !== 'domistika.sdk.v1') {
    throw new Error('DOMISTIKA_ART_DIRECTOR_SDK_UNAVAILABLE');
  }
  if (!api.ready?.()) throw new Error('DOMISTIKA_ART_DIRECTOR_STUDIO_NOT_READY');
  if (!api.art?.drawRecipeArtifact) throw new Error('DOMISTIKA_ART_DIRECTOR_RECIPE_ARTIFACT_UNAVAILABLE');
  return api;
}

export async function directArt(options = {}, apiInput = null) {
  const api = requireApi(apiInput || globalThis.window?.Domistika);
  const plan = planArtDirection(options);
  const freshCanvas = options.freshCanvas === true;
  const clearFirst = options.clearFirst === true;
  const newLayer = !freshCanvas && !clearFirst && options.newLayer !== false;

  let targetLayer = null;
  if (newLayer) {
    if (!api.layers?.create || !api.layers?.activate) throw new Error('DOMISTIKA_ART_DIRECTOR_LAYER_API_UNAVAILABLE');
    const layer = api.layers.create(`Director · ${plan.label}`);
    if (layer?.id) {
      api.layers.activate(layer.id);
      targetLayer = layer.id;
    }
  }

  const artifact = await api.art.drawRecipeArtifact({
    name: plan.label,
    recipe: plan.symmetry,
    strokes: plan.strokes,
    freshCanvas,
    clearFirst,
    width: plan.width,
    height: plan.height,
  });

  const result = Object.freeze({
    ok: true,
    schema: SCHEMA,
    version: VERSION,
    plan,
    artifact,
    placement: freshCanvas ? 'fresh-canvas' : clearFirst ? 'clear-active-layer' : newLayer ? 'new-layer' : 'active-layer',
    targetLayer,
  });

  globalThis.window?.dispatchEvent?.(new CustomEvent('domistika:art-directed', { detail: result }));
  return result;
}

if (typeof window !== 'undefined') {
  window.domistikaArtDirectorV0934 = Object.freeze({
    version: VERSION,
    schema: SCHEMA,
    palettes: listDirectorPalettes,
    profiles: listDirectorProfiles,
    plan: planArtDirection,
    direct: directArt,
  });
}

export {
  VERSION,
  SCHEMA,
  MAX_DIRECTED_STROKES,
  MAX_DIRECTED_POINTS,
  PALETTES,
};
