// Dimensional Weave: deterministic, dependency-free 2.5D geometry.
// Anchors are normalized to the artboard, so project dimensions can change.
export const SCHEMA = 'domistika.dimensional-weave.v1';
export const VERSION = '1.0.0';
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const DEFAULTS = Object.freeze({
  copies: 28, depth: 34, direction: -45, fill: true,
  impossible: false, color: '#8b93a7', edge: '#eaf3ff',
});
export const WEAVE_DEFAULTS = DEFAULTS;

export function normalizeWeaveOptions(input = {}) {
  const hex = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value).toLowerCase() : fallback;
  const finite = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  return {
    copies: Math.round(clamp(finite(input.copies, DEFAULTS.copies), 1, 32)),
    depth: clamp(finite(input.depth, DEFAULTS.depth), 0, 160),
    direction: clamp(finite(input.direction, DEFAULTS.direction), -180, 180),
    fill: input.fill !== false,
    impossible: input.impossible === true,
    color: hex(input.color, DEFAULTS.color),
    edge: hex(input.edge, DEFAULTS.edge),
  };
}

export function normalizeWeavePoints(input) {
  if (!Array.isArray(input)) throw new Error('WEAVE_POINTS_REQUIRED');
  if (input.length > 24) throw new Error('WEAVE_MAX_24_ANCHORS');
  return input.map((p) => {
    const x = Number(p?.x), y = Number(p?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
      throw new Error('WEAVE_ANCHOR_OUT_OF_BOUNDS');
    }
    return { x, y };
  });
}

export function signedPolygonArea(points) {
  return points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + p.x * q.y - q.x * p.y;
  }, 0) / 2;
}

function segmentsCross(a, b, c, d) {
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const ab1 = cross(a, b, c), ab2 = cross(a, b, d);
  const cd1 = cross(c, d, a), cd2 = cross(c, d, b);
  return (ab1 * ab2 < 0) && (cd1 * cd2 < 0);
}

export function validateWeave(points) {
  const anchors = normalizeWeavePoints(points);
  if (anchors.length < 3) throw new Error('WEAVE_NEEDS_3_ANCHORS');
  if (Math.abs(signedPolygonArea(anchors)) < 0.00002) throw new Error('WEAVE_FACE_TOO_SMALL');
  for (let i = 0; i < anchors.length; i += 1) {
    const p = anchors[i], q = anchors[(i + 1) % anchors.length];
    if (Math.hypot(p.x - q.x, p.y - q.y) < 0.002) throw new Error('WEAVE_DUPLICATE_ANCHOR');
    for (let j = i + 1; j < anchors.length; j += 1) {
      if (j === i + 1 || (i === 0 && j === anchors.length - 1)) continue;
      if (segmentsCross(p, q, anchors[j], anchors[(j + 1) % anchors.length])) {
        throw new Error('WEAVE_CROSSED_FACE_EDGES');
      }
    }
  }
  return anchors;
}

function shade(hex, delta) {
  const value = parseInt(hex.slice(1), 16);
  const rgb = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return '#' + rgb.map((channel) => Math.round(clamp(channel + delta, 0, 255)).toString(16).padStart(2, '0')).join('');
}
function rotate(point, angle, cx, cy) {
  const x = point.x - cx, y = point.y - cy;
  return { x: cx + x * Math.cos(angle) - y * Math.sin(angle), y: cy + x * Math.sin(angle) + y * Math.cos(angle) };
}

export function buildWeaveGeometry(points, width, height, inputOptions = {}) {
  const anchors = validateWeave(points);
  const options = normalizeWeaveOptions(inputOptions);
  if (!(Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0)) {
    throw new Error('WEAVE_CANVAS_INVALID');
  }
  const cx = width / 2, cy = height / 2;
  const starting = anchors.map(({ x, y }) => ({ x: x * width, y: y * height }));
  const copies = [];
  for (let n = 0; n < options.copies; n += 1) {
    const angle = (n * 2 * Math.PI) / options.copies;
    const top = starting.map((point) => rotate(point, angle, cx, cy));
    const extrusionAngle = options.direction * Math.PI / 180 + angle;
    const dx = options.depth * Math.cos(extrusionAngle);
    const dy = options.depth * Math.sin(extrusionAngle);
    const far = top.map((p, i) => {
      // Alternating offsets give intentionally inconsistent Escher-style depth.
      const factor = options.impossible && i % 2 ? -0.55 : 1;
      return { x: p.x + dx * factor, y: p.y + dy * factor };
    });
    const sides = top.map((point, i) => {
      const next = (i + 1) % top.length;
      const edgeAngle = Math.atan2(top[next].y - point.y, top[next].x - point.x);
      const brightness = Math.round(58 * Math.cos(edgeAngle - extrusionAngle));
      return {
        points: [point, top[next], far[next], far[i]],
        color: shade(options.color, brightness - 28),
        highlight: options.impossible && i % 2 === 1,
      };
    });
    copies.push({ top, far, sides });
  }
  return { options, copies, anchorCount: anchors.length };
}

function trace(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

export function drawWeave(ctx, points, width, height, options = {}, { preview = false } = {}) {
  const geometry = buildWeaveGeometry(points, width, height, options);
  ctx.save();
  try {
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, Math.min(width, height) / 400);
    ctx.globalAlpha = preview ? 0.62 : 0.98;
    for (const copy of geometry.copies) {
      for (const side of copy.sides) {
        trace(ctx, side.points);
        if (geometry.options.fill) {
          ctx.fillStyle = side.color;
          ctx.fill();
        }
        ctx.strokeStyle = side.highlight ? shade(geometry.options.edge, -62) : shade(geometry.options.edge, -25);
        ctx.stroke();
      }
      trace(ctx, copy.top);
      if (geometry.options.fill) {
        ctx.fillStyle = geometry.options.color;
        ctx.fill();
      }
      ctx.strokeStyle = geometry.options.edge;
      ctx.lineWidth = Math.max(1.25, Math.min(width, height) / 270);
      ctx.stroke();
      for (let i = 0; i < copy.top.length; i += 1) {
        ctx.beginPath();
        ctx.moveTo(copy.top[i].x, copy.top[i].y);
        ctx.lineTo(copy.far[i].x, copy.far[i].y);
        ctx.strokeStyle = i % 2 && geometry.options.impossible
          ? shade(geometry.options.edge, -70) : geometry.options.edge;
        ctx.stroke();
      }
    }
  } finally {
    ctx.restore();
  }
  return geometry;
}

export function weaveMetadata(points, options = {}) {
  return { kind: 'dimensional-weave', schema: SCHEMA, version: VERSION,
    anchors: validateWeave(points), options: normalizeWeaveOptions(options) };
}
