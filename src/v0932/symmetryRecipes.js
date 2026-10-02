export const RECIPE_SCHEMA = 'domistika.symmetry-recipe.v1';
export const MAX_TRANSFORMS = 192;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const degToRad = (degrees) => Number(degrees || 0) * Math.PI / 180;

export const SYMMETRY_RECIPE_PRESETS = Object.freeze([
  {
    id: 'mandala',
    label: 'Mandala',
    description: 'Clean radial repetition around one shared center.',
    formula: 'RADIAL(12)',
  },
  {
    id: 'kaleido',
    label: 'Kaleido',
    description: 'Radial repetition doubled through alternating mirrored copies.',
    formula: 'RADIAL(12) | MIRROR(15)',
  },
  {
    id: 'gear',
    label: 'Gear',
    description: 'Dense radial teeth with a nested counter-rotated inner shell.',
    formula: 'RADIAL(24) | NEST(2,.92,.025) | COUNTERSPIN(7.5)',
  },
  {
    id: 'vortex',
    label: 'Vortex',
    description: 'Nested radial copies drift through scale, rotation, and radius.',
    formula: 'RADIAL(12) | NEST(3,.82,.03) | SPIRAL(4,.995,.002)',
  },
  {
    id: 'counterspin',
    label: 'Counterspin',
    description: 'Concentric rings alternate rotational direction like meshed wheels.',
    formula: 'RADIAL(12) | NEST(4,.82,.035) | COUNTERSPIN(8)',
  },
  {
    id: 'portal',
    label: 'Portal',
    description: 'Mirrored nested shells with counter-rotation and subtle spiral drift.',
    formula: 'RADIAL(16) | MIRROR(5.625) | NEST(3,.76,.03) | COUNTERSPIN(5.625) | SPIRAL(2.8,.998,.001)',
  },
  {
    id: 'flower',
    label: 'Flower',
    description: 'Mirrored petals arranged across two proportionally scaled rings.',
    formula: 'RADIAL(12) | MIRROR(15) | NEST(2,.78,.06) | COUNTERSPIN(3.5)',
  },
  {
    id: 'fracture',
    label: 'Fracture',
    description: 'Radial order with deterministic imperfections that stay stable while drawing.',
    formula: 'RADIAL(18) | NEST(2,.9,.025) | PERTURB(.055)',
  },
]);

const PRESET_MAP = new Map(SYMMETRY_RECIPE_PRESETS.map((preset) => [preset.id, preset]));
const ALLOWED_OPERATORS = new Set(['RADIAL', 'MIRROR', 'NEST', 'SPIRAL', 'COUNTERSPIN', 'PERTURB', 'PHASE']);

function parseNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function splitArgs(raw = '') {
  if (!String(raw).trim()) return [];
  return String(raw).split(',').map((value) => value.trim()).filter(Boolean);
}

export function parseFormula(formula) {
  const source = String(formula || '').trim();
  if (!source) throw new Error('DOMISTIKA_RECIPE_EMPTY');
  const chunks = source.split(/\s*\|\s*|\n+/).map((chunk) => chunk.trim()).filter(Boolean);
  if (!chunks.length) throw new Error('DOMISTIKA_RECIPE_EMPTY');
  return chunks.map((chunk) => {
    const match = chunk.match(/^([A-Za-z_][A-Za-z0-9_-]*)(?:\((.*)\))?$/);
    if (!match) throw new Error(`DOMISTIKA_RECIPE_SYNTAX:${chunk}`);
    const op = match[1].replaceAll('-', '_').toUpperCase();
    if (!ALLOWED_OPERATORS.has(op)) throw new Error(`DOMISTIKA_RECIPE_OPERATOR:${op}`);
    return Object.freeze({ op, args: Object.freeze(splitArgs(match[2])) });
  });
}

function deterministicSigned(index, salt = 0) {
  const value = Math.sin((index + 1) * 12.9898 + (salt + 1) * 78.233) * 43758.5453;
  return ((value - Math.floor(value)) * 2) - 1;
}

function baseState() {
  return {
    angle: 0,
    scale: 1,
    mirror: false,
    radius: 0,
    ring: 0,
    arm: 0,
    copy: 0,
  };
}

function capStates(states, limit) {
  if (states.length <= limit) return { states, truncated: false };
  return { states: states.slice(0, limit), truncated: true };
}

function expandRadial(states, args) {
  const count = clamp(Math.round(parseNumber(args[0], 12)), 2, 96);
  const next = [];
  for (const state of states) {
    for (let arm = 0; arm < count; arm += 1) {
      next.push({
        ...state,
        angle: state.angle + Math.PI * 2 * arm / count,
        arm,
      });
    }
  }
  return next;
}

function expandMirror(states, args) {
  const phase = degToRad(parseNumber(args[0], 0));
  const next = [];
  for (const state of states) {
    next.push({ ...state });
    next.push({ ...state, angle: state.angle + phase, mirror: !state.mirror });
  }
  return next;
}

function expandNest(states, args) {
  const rings = clamp(Math.round(parseNumber(args[0], 2)), 1, 12);
  const scaleStep = clamp(parseNumber(args[1], 0.82), 0.05, 2.5);
  const radiusStep = clamp(parseNumber(args[2], 0), -0.5, 0.5);
  const next = [];
  for (const state of states) {
    for (let ring = 0; ring < rings; ring += 1) {
      next.push({
        ...state,
        scale: state.scale * Math.pow(scaleStep, ring),
        radius: state.radius + radiusStep * ring,
        ring: state.ring + ring,
      });
    }
  }
  return next;
}

function applySpiral(states, args) {
  const degreesPerStep = clamp(parseNumber(args[0], 4), -180, 180);
  const scaleStep = clamp(parseNumber(args[1], 1), 0.5, 1.5);
  const radiusStep = clamp(parseNumber(args[2], 0), -0.05, 0.05);
  return states.map((state, index) => ({
    ...state,
    angle: state.angle + degToRad(degreesPerStep * index),
    scale: state.scale * Math.pow(scaleStep, index),
    radius: state.radius + radiusStep * index,
  }));
}

function applyCounterspin(states, args) {
  const degrees = clamp(parseNumber(args[0], 8), -180, 180);
  return states.map((state) => {
    const direction = state.ring % 2 === 0 ? 1 : -1;
    return {
      ...state,
      angle: state.angle + degToRad(direction * degrees * Math.max(1, state.ring)),
    };
  });
}

function applyPerturb(states, args) {
  const amount = clamp(Math.abs(parseNumber(args[0], 0.03)), 0, 0.35);
  return states.map((state, index) => {
    const angleNoise = deterministicSigned(index, 1);
    const scaleNoise = deterministicSigned(index, 2);
    const radiusNoise = deterministicSigned(index, 3);
    return {
      ...state,
      angle: state.angle + degToRad(angleNoise * amount * 18),
      scale: state.scale * (1 + scaleNoise * amount * 0.4),
      radius: state.radius + radiusNoise * amount * 0.06,
    };
  });
}

function applyPhase(states, args) {
  const phase = degToRad(parseNumber(args[0], 0));
  return states.map((state) => ({ ...state, angle: state.angle + phase }));
}

export function compileRecipePlan(formula, options = {}) {
  const operations = Array.isArray(formula) ? formula : parseFormula(formula);
  const limit = clamp(Math.round(Number(options.limit) || MAX_TRANSFORMS), 1, MAX_TRANSFORMS);
  let states = [baseState()];
  let truncated = false;

  for (const operation of operations) {
    if (operation.op === 'RADIAL') states = expandRadial(states, operation.args);
    else if (operation.op === 'MIRROR') states = expandMirror(states, operation.args);
    else if (operation.op === 'NEST') states = expandNest(states, operation.args);
    else if (operation.op === 'SPIRAL') states = applySpiral(states, operation.args);
    else if (operation.op === 'COUNTERSPIN') states = applyCounterspin(states, operation.args);
    else if (operation.op === 'PERTURB') states = applyPerturb(states, operation.args);
    else if (operation.op === 'PHASE') states = applyPhase(states, operation.args);

    const capped = capStates(states, limit);
    states = capped.states;
    truncated = truncated || capped.truncated;
  }

  states = states.map((state, index) => Object.freeze({ ...state, copy: index }));
  return Object.freeze({
    schema: RECIPE_SCHEMA,
    source: Array.isArray(formula) ? operations.map((op) => `${op.op}(${op.args.join(',')})`).join(' | ') : String(formula),
    operations: Object.freeze([...operations]),
    states: Object.freeze(states),
    count: states.length,
    truncated,
  });
}

export function transformForState(state, width, height) {
  const cx = Number(width) / 2;
  const cy = Number(height) / 2;
  const unit = Math.min(Number(width), Number(height));
  const cos = Math.cos(state.angle);
  const sin = Math.sin(state.angle);
  const offsetX = Math.cos(state.angle) * unit * state.radius;
  const offsetY = Math.sin(state.angle) * unit * state.radius;
  return (point) => {
    let x = Number(point.x) - cx;
    let y = Number(point.y) - cy;
    if (state.mirror) x *= -1;
    x *= state.scale;
    y *= state.scale;
    return {
      ...point,
      x: cx + x * cos - y * sin + offsetX,
      y: cy + x * sin + y * cos + offsetY,
    };
  };
}

export function compileFormula(formula, { width, height, limit = MAX_TRANSFORMS } = {}) {
  const plan = compileRecipePlan(formula, { limit });
  const transforms = plan.states.map((state) => transformForState(state, width, height));
  return Object.freeze({ ...plan, transforms: Object.freeze(transforms) });
}

export function recipeById(id) {
  return PRESET_MAP.get(String(id || '').trim()) || null;
}

export function formulaForRecipe(id) {
  return recipeById(id)?.formula || null;
}

export function listRecipes() {
  return Object.freeze(SYMMETRY_RECIPE_PRESETS.map((preset) => Object.freeze({ ...preset })));
}
