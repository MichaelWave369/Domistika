import { compileFormula } from '../v0932/symmetryRecipes.js';

export const VERSION = '0.9.35';
export const PLATE_SCHEMA = 'domistika.composition-plate.v1';

const freeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(freeze);
  return value;
};

const region = (id, label, geometry, formula = null, options = {}) => freeze({
  id,
  label,
  geometry,
  formula,
  excluded: options.excluded === true,
  output: options.output === 'same-region' ? 'same-region' : 'non-excluded',
});

export const COMPOSITION_PLATES = freeze([
  {
    id: 'mandala',
    label: 'Mandala',
    description: 'Concentric laws: nested core, mirrored body, restrained outer frame.',
    regions: [
      region('core', 'Core', { kind: 'circle', cx: .5, cy: .5, r: .19 }, 'RADIAL(12) | NEST(2,.88,.02)'),
      region('body', 'Body', { kind: 'ring', cx: .5, cy: .5, inner: .19, outer: .39 }, 'RADIAL(12) | MIRROR(15)'),
      region('frame', 'Frame', { kind: 'all' }, 'RADIAL(8)'),
    ],
  },
  {
    id: 'harvest-wheel',
    label: 'Harvest Wheel',
    description: 'A weighted wheel with a dense hub, broad spokes, and calmer edge rhythm.',
    regions: [
      region('hub', 'Hub', { kind: 'circle', cx: .5, cy: .5, r: .16 }, 'RADIAL(12) | NEST(2,.9,.018)'),
      region('spokes', 'Spokes', { kind: 'ring', cx: .5, cy: .5, inner: .16, outer: .36 }, 'RADIAL(8) | MIRROR(22.5)'),
      region('rim', 'Rim', { kind: 'ring', cx: .5, cy: .5, inner: .36, outer: .48 }, 'RADIAL(16) | PERTURB(.018)'),
      region('field', 'Field', { kind: 'all' }, 'RADIAL(4)'),
    ],
  },
  {
    id: 'portal-gate',
    label: 'Portal Gate',
    description: 'A radial portal held inside a vertical gate with mirrored flank channels.',
    regions: [
      region('gate', 'Crown gates', { kind: 'any', items: [
        { kind: 'rect', x0: .44, x1: .56, y0: .03, y1: .22 },
        { kind: 'rect', x0: .44, x1: .56, y0: .78, y1: .97 },
      ] }, 'RADIAL(2)', { output: 'same-region' }),
      region('flanks', 'Flank channels', { kind: 'any', items: [
        { kind: 'rect', x0: .05, x1: .23, y0: .34, y1: .66 },
        { kind: 'rect', x0: .77, x1: .95, y0: .34, y1: .66 },
      ] }, 'MIRROR(0)', { output: 'same-region' }),
      region('core', 'Portal core', { kind: 'circle', cx: .5, cy: .5, r: .18 }, 'RADIAL(16) | NEST(2,.84,.018)'),
      region('veil', 'Portal veil', { kind: 'ring', cx: .5, cy: .5, inner: .18, outer: .34 }, 'RADIAL(16) | MIRROR(5.625) | COUNTERSPIN(5.625)'),
      region('field', 'Field', { kind: 'all' }, 'RADIAL(4)'),
    ],
  },
  {
    id: 'square-guardians',
    label: 'Square Guardians',
    description: 'The Archons plate: protected corners, inward veil teeth, crown gates, and mirrored flanks.',
    regions: [
      region('corners', 'Guardians', { kind: 'corners', x: .23, y: .23 }, null, { excluded: true }),
      region('axes', 'Crown gates', { kind: 'any', items: [
        { kind: 'rect', x0: .455, x1: .545, y0: .02, y1: .22 },
        { kind: 'rect', x0: .455, x1: .545, y0: .78, y1: .98 },
      ] }, 'RADIAL(2)', { output: 'same-region' }),
      region('flanks', 'Flank channels', { kind: 'any', items: [
        { kind: 'rect', x0: .03, x1: .22, y0: .39, y1: .61 },
        { kind: 'rect', x0: .78, x1: .97, y0: .39, y1: .61 },
      ] }, 'MIRROR(0)', { output: 'same-region' }),
      region('core', 'Core', { kind: 'circle', cx: .5, cy: .5, r: .15 }, 'RADIAL(12) | NEST(2,.9,.018)'),
      region('veil', 'Veil', { kind: 'ring', cx: .5, cy: .5, inner: .15, outer: .29 }, 'RADIAL(18) | NEST(2,.91,-.025) | PERTURB(.025)'),
      region('body', 'Body', { kind: 'ring', cx: .5, cy: .5, inner: .29, outer: .47 }, 'RADIAL(12) | MIRROR(15)'),
      region('field', 'Field', { kind: 'all' }, 'RADIAL(4)'),
    ],
  },
]);

const PLATE_MAP = new Map(COMPOSITION_PLATES.map((plate) => [plate.id, plate]));
const COMPILE_CACHE = new Map();

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizedPoint(point, width, height) {
  const w = Math.max(1, finite(width, 1));
  const h = Math.max(1, finite(height, 1));
  return {
    x: finite(point?.x) / w,
    y: finite(point?.y) / h,
  };
}

export function geometryContains(geometry, point, width = 1, height = 1) {
  if (!geometry) return false;
  const p = normalizedPoint(point, width, height);
  const kind = String(geometry.kind || '');

  if (kind === 'all') return true;
  if (kind === 'circle' || kind === 'ring') {
    const dx = p.x - finite(geometry.cx, .5);
    const dy = p.y - finite(geometry.cy, .5);
    const distance = Math.hypot(dx, dy);
    if (kind === 'circle') return distance <= finite(geometry.r, .25);
    return distance >= finite(geometry.inner, 0) && distance <= finite(geometry.outer, .5);
  }
  if (kind === 'rect') {
    return p.x >= finite(geometry.x0, 0)
      && p.x <= finite(geometry.x1, 1)
      && p.y >= finite(geometry.y0, 0)
      && p.y <= finite(geometry.y1, 1);
  }
  if (kind === 'corners') {
    const x = finite(geometry.x, .2);
    const y = finite(geometry.y, .2);
    return (p.x <= x || p.x >= 1 - x) && (p.y <= y || p.y >= 1 - y);
  }
  if (kind === 'any') {
    return Array.isArray(geometry.items) && geometry.items.some((item) => geometryContains(item, point, width, height));
  }
  return false;
}

export function plateById(id) {
  return PLATE_MAP.get(String(id || '').trim().toLowerCase()) || null;
}

export function listCompositionPlates() {
  return freeze(COMPOSITION_PLATES.map((plate) => ({
    id: plate.id,
    label: plate.label,
    description: plate.description,
    regions: plate.regions.map((item) => ({
      id: item.id,
      label: item.label,
      formula: item.formula,
      excluded: item.excluded,
      output: item.output,
    })),
  })));
}

export function resolveCompositionRegion(plateInput, point, width, height) {
  const plate = typeof plateInput === 'string' ? plateById(plateInput) : plateInput;
  if (!plate) return null;
  return plate.regions.find((item) => geometryContains(item.geometry, point, width, height)) || null;
}

export function isExcludedPoint(plateInput, point, width, height) {
  const plate = typeof plateInput === 'string' ? plateById(plateInput) : plateInput;
  if (!plate) return false;
  return plate.regions.some((item) => item.excluded && geometryContains(item.geometry, point, width, height));
}

function compiledTransforms(formula, width, height) {
  const key = String(width) + 'x' + String(height) + ':' + formula;
  if (!COMPILE_CACHE.has(key)) {
    COMPILE_CACHE.set(key, compileFormula(formula, { width, height }).transforms);
  }
  return COMPILE_CACHE.get(key);
}

function midpoint(from, to) {
  return {
    x: (finite(from?.x) + finite(to?.x)) / 2,
    y: (finite(from?.y) + finite(to?.y)) / 2,
    pressure: (finite(from?.pressure, 1) + finite(to?.pressure, 1)) / 2,
  };
}

function identity(point) {
  return { ...point };
}

function segmentIntersectsRect(from, to, rect) {
  const dx = finite(to?.x) - finite(from?.x);
  const dy = finite(to?.y) - finite(from?.y);
  const p = [-dx, dx, -dy, dy];
  const q = [
    finite(from?.x) - rect.x0,
    rect.x1 - finite(from?.x),
    finite(from?.y) - rect.y0,
    rect.y1 - finite(from?.y),
  ];
  let u0 = 0;
  let u1 = 1;
  for (let index = 0; index < 4; index += 1) {
    if (p[index] === 0) {
      if (q[index] < 0) return false;
      continue;
    }
    const ratio = q[index] / p[index];
    if (p[index] < 0) u0 = Math.max(u0, ratio);
    else u1 = Math.min(u1, ratio);
    if (u0 > u1) return false;
  }
  return true;
}

function rectForGeometry(geometry, width, height) {
  return {
    x0: finite(geometry.x0, 0) * width,
    x1: finite(geometry.x1, 1) * width,
    y0: finite(geometry.y0, 0) * height,
    y1: finite(geometry.y1, 1) * height,
  };
}

function segmentIntersectsGeometry(geometry, from, to, width, height) {
  const kind = String(geometry?.kind || '');
  if (kind === 'rect') return segmentIntersectsRect(from, to, rectForGeometry(geometry, width, height));
  if (kind === 'corners') {
    const cornerWidth = finite(geometry.x, .2) * width;
    const cornerHeight = finite(geometry.y, .2) * height;
    const rects = [
      { x0: 0, x1: cornerWidth, y0: 0, y1: cornerHeight },
      { x0: width - cornerWidth, x1: width, y0: 0, y1: cornerHeight },
      { x0: 0, x1: cornerWidth, y0: height - cornerHeight, y1: height },
      { x0: width - cornerWidth, x1: width, y0: height - cornerHeight, y1: height },
    ];
    return rects.some((rect) => segmentIntersectsRect(from, to, rect));
  }
  if (kind === 'any') {
    return Array.isArray(geometry.items)
      && geometry.items.some((item) => segmentIntersectsGeometry(item, from, to, width, height));
  }
  return isExcludedPoint({ regions: [{ excluded: true, geometry }] }, midpoint(from, to), width, height);
}

export function segmentTouchesExcluded(plateInput, from, to, width, height) {
  const plate = typeof plateInput === 'string' ? plateById(plateInput) : plateInput;
  if (!plate) return false;
  return plate.regions.some((item) => item.excluded
    && segmentIntersectsGeometry(item.geometry, from, to, width, height));
}

function targetAllowed(plate, region, transform, from, to, width, height) {
  const transformedFrom = transform(from);
  const transformedTo = transform(to);
  const transformedMid = transform(midpoint(from, to));

  if (segmentTouchesExcluded(plate, transformedFrom, transformedTo, width, height)) return false;

  if (region.output === 'same-region') {
    return resolveCompositionRegion(plate, transformedMid, width, height)?.id === region.id;
  }
  return true;
}

export function transformsForSegment(plateInput, from, to, width, height) {
  const plate = typeof plateInput === 'string' ? plateById(plateInput) : plateInput;
  if (!plate) return Object.freeze([identity]);

  const source = midpoint(from, to);
  const region = resolveCompositionRegion(plate, source, width, height);
  if (!region || region.excluded || !region.formula) return Object.freeze([identity]);

  const transforms = compiledTransforms(region.formula, width, height)
    .filter((transform) => targetAllowed(plate, region, transform, from, to, width, height));

  return Object.freeze(transforms.length ? transforms : [identity]);
}

export function describePlate(id) {
  const plate = plateById(id);
  if (!plate) return null;
  const excluded = plate.regions.filter((item) => item.excluded).map((item) => item.id);
  return freeze({
    schema: PLATE_SCHEMA,
    version: VERSION,
    id: plate.id,
    label: plate.label,
    description: plate.description,
    regionCount: plate.regions.length,
    excluded,
  });
}
