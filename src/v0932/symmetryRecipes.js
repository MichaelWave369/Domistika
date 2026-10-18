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
  // Original studies of mathematical ideas, not reproductions of existing artworks.
  {
    id: 'impossible-arcade',
    family: 'artists',
    label: 'Impossible Arcade',
    description: 'Staggered chambers and oblique nested frames for unreal architecture.',
    inspiration: 'impossible spaces / architectural repetition',
    formula: 'TILE(4,4,.24,.24,.5) | SHEAR(.24,-.12) | NEST(2,.85,.01)',
  },
  {
    id: 'metamorph-flight',
    family: 'artists',
    label: 'Metamorph Flight',
    description: 'Glide-reflected motifs that can become wings, fish, or interlocking forms.',
    inspiration: 'tessellation / glide reflection',
    formula: 'TILE(5,4,.23,.24,.5) | GLIDE(x,.115)',
  },
  {
    id: 'reversible-stair',
    family: 'artists',
    label: 'Reversible Stair',
    description: 'Reversed axes and slanted repeats for figures with competing directions.',
    inspiration: 'ambiguous perspective / figure-ground reversal',
    formula: 'TILE(4,3,.26,.28) | SHEAR(.5,-.15) | MIRROR(0)',
  },
  {
    id: 'vibration-field',
    family: 'artists',
    label: 'Vibration Field',
    description: 'Optical-art repetition, subtle offset and rigorous grid rhythm.',
    inspiration: 'kinetic optical geometry',
    formula: 'TILE(6,5,.18,.2,.5) | SHEAR(-.28,.1)',
  },
  {
    id: 'infinite-gallery',
    family: 'artists',
    label: 'Infinite Gallery',
    description: 'Recursive portals fold inward on four opposing axes.',
    inspiration: 'recursive rooms / nested perspective',
    formula: 'RADIAL(4) | NEST(5,.74,.022) | SHEAR(.22,-.16)',
  },
  {
    id: 'dream-mosaic',
    family: 'artists',
    label: 'Dream Mosaic',
    description: 'A drifting, alternating tile field for surreal architectural marks.',
    inspiration: 'surreal repetition / geometric metamorphosis',
    formula: 'TILE(5,4,.22,.23,.5) | GLIDE(y,.115) | PERTURB(.018)',
  },
]);

const PRESET_MAP = new Map(SYMMETRY_RECIPE_PRESETS.map((preset) => [preset.id, preset]));
const ALLOWED_OPERATORS = new Set(['RADIAL', 'MIRROR', 'NEST', 'SPIRAL', 'COUNTERSPIN', 'PERTURB', 'PHASE', 'TILE', 'GLIDE', 'SHEAR']);

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
    offsetX: 0,
    offsetY: 0,
    flipY: false,
    shearX: 0,
    shearY: 0,
    row: 0,
    column: 0,
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

// A bounded wallpaper-like lattice. Spacing is in fractions of the shorter
// canvas dimension; the alternating-row stagger is a fraction of one cell.
function expandTile(states, args) {
  const columns = clamp(Math.round(parseNumber(args[0], 4)), 1, 12);
  const rows = clamp(Math.round(parseNumber(args[1], 4)), 1, 12);
  const stepX = clamp(Math.abs(parseNumber(args[2], .24)), .02, 1.5);
  const stepY = clamp(Math.abs(parseNumber(args[3], .24)), .02, 1.5);
  const stagger = clamp(parseNumber(args[4], 0), -1, 1);
  const next = [];
  for (const state of states) {
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        next.push({
          ...state,
          offsetX: state.offsetX + (column - (columns - 1) / 2 + (row % 2 ? stagger : 0)) * stepX,
          offsetY: state.offsetY + (row - (rows - 1) / 2) * stepY,
          row,
          column,
        });
      }
    }
  }
  return next;
}

// A glide reflection flips across the axis of motion and moves by a
// normalized displacement. Existing copies are retained.
function expandGlide(states, args) {
  const axis = String(args[0] || 'x').toLowerCase();
  if (axis !== 'x' && axis !== 'y') throw new Error('DOMISTIKA_RECIPE_GLIDE_AXIS');
  const step = clamp(parseNumber(args[1], .12), -1.5, 1.5);
  return states.flatMap((state) => [
    { ...state },
    {
      ...state,
      ...(axis === 'x' ? { flipY: !state.flipY, offsetX: state.offsetX + step }
        : { mirror: !state.mirror, offsetY: state.offsetY + step }),
    },
  ]);
}

function applyShear(states, args) {
  const x = clamp(parseNumber(args[0], 0), -1.5, 1.5);
  const y = clamp(parseNumber(args[1], 0), -1.5, 1.5);
  return states.map((state) => ({
    ...state,
    shearX: clamp(state.shearX + x, -2, 2),
    shearY: clamp(state.shearY + y, -2, 2),
  }));
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
    else if (operation.op === 'TILE') states = expandTile(states, operation.args);
    else if (operation.op === 'GLIDE') states = expandGlide(states, operation.args);
    else if (operation.op === 'SHEAR') states = applyShear(states, operation.args);

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
  const offsetX = Math.cos(state.angle) * unit * state.radius + (state.offsetX || 0) * unit;
  const offsetY = Math.sin(state.angle) * unit * state.radius + (state.offsetY || 0) * unit;
  return (point) => {
    let x = Number(point.x) - cx;
    let y = Number(point.y) - cy;
    if (state.mirror) x *= -1;
    if (state.flipY) y *= -1;
    x *= state.scale;
    y *= state.scale;
    const skewedX = x + (state.shearX || 0) * y;
    const skewedY = y + (state.shearY || 0) * x;
    return {
      ...point,
      x: cx + skewedX * cos - skewedY * sin + offsetX,
      y: cy + skewedX * sin + skewedY * cos + offsetY,
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
