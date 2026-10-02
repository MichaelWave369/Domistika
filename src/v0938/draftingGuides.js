export const VERSION = '0.9.38';
export const DRAFTING_GUIDE_SCHEMA = 'domistika.drafting-guide.v1';
export const GUIDE_KINDS = Object.freeze(['horizontal-ruler', 'vertical-ruler', 'ellipse', 'one-point']);

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

export function normalizeDraftingGuide(kind, options = {}) {
  if (!GUIDE_KINDS.includes(kind)) throw new Error('DOMISTIKA_DRAFTING_GUIDE_KIND_INVALID');

  if (kind === 'horizontal-ruler') {
    return Object.freeze({
      kind,
      position: clamp(options.position ?? options.y ?? 0.5, 0, 1),
    });
  }

  if (kind === 'vertical-ruler') {
    return Object.freeze({
      kind,
      position: clamp(options.position ?? options.x ?? 0.5, 0, 1),
    });
  }

  if (kind === 'ellipse') {
    return Object.freeze({
      kind,
      cx: clamp(options.cx ?? 0.5, 0.05, 0.95),
      cy: clamp(options.cy ?? 0.5, 0.05, 0.95),
      rx: clamp(options.rx ?? 0.32, 0.02, 0.48),
      ry: clamp(options.ry ?? 0.22, 0.02, 0.48),
    });
  }

  return Object.freeze({
    kind,
    horizonY: clamp(options.horizonY ?? 0.42, 0.05, 0.95),
    vanishingX: clamp(options.vanishingX ?? 0.5, 0.02, 0.98),
  });
}

export function guideGeometry(guide, width, height) {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  if (!guide) return null;

  if (guide.kind === 'horizontal-ruler') {
    return Object.freeze({ y: guide.position * h });
  }
  if (guide.kind === 'vertical-ruler') {
    return Object.freeze({ x: guide.position * w });
  }
  if (guide.kind === 'ellipse') {
    return Object.freeze({
      cx: guide.cx * w,
      cy: guide.cy * h,
      rx: guide.rx * w,
      ry: guide.ry * h,
    });
  }
  if (guide.kind === 'one-point') {
    return Object.freeze({
      horizonY: guide.horizonY * h,
      vanishingX: guide.vanishingX * w,
      vanishingY: guide.horizonY * h,
    });
  }
  return null;
}

export function beginDraftingSnap(guide, point, width, height) {
  if (!guide || guide.kind !== 'one-point') return Object.freeze({ kind: guide?.kind || null });
  const geometry = guideGeometry(guide, width, height);
  let dx = Number(point?.x) - geometry.vanishingX;
  let dy = Number(point?.y) - geometry.vanishingY;
  let length = Math.hypot(dx, dy);
  if (length < 0.0001) {
    dx = 1;
    dy = 0;
    length = 1;
  }
  return Object.freeze({
    kind: guide.kind,
    ux: dx / length,
    uy: dy / length,
  });
}

export function snapDraftingPoint(guide, point, width, height, session = null) {
  if (!guide || !point) return point;
  const geometry = guideGeometry(guide, width, height);
  const next = { ...point };

  if (guide.kind === 'horizontal-ruler') {
    next.y = geometry.y;
    return next;
  }

  if (guide.kind === 'vertical-ruler') {
    next.x = geometry.x;
    return next;
  }

  if (guide.kind === 'ellipse') {
    const dx = Number(point.x) - geometry.cx;
    const dy = Number(point.y) - geometry.cy;
    if (Math.abs(dx) < 0.0001 && Math.abs(dy) < 0.0001) {
      next.x = geometry.cx + geometry.rx;
      next.y = geometry.cy;
      return next;
    }
    const angle = Math.atan2(dy / Math.max(0.0001, geometry.ry), dx / Math.max(0.0001, geometry.rx));
    next.x = geometry.cx + Math.cos(angle) * geometry.rx;
    next.y = geometry.cy + Math.sin(angle) * geometry.ry;
    return next;
  }

  if (guide.kind === 'one-point') {
    const ux = Number(session?.ux);
    const uy = Number(session?.uy);
    if (!Number.isFinite(ux) || !Number.isFinite(uy)) return next;
    const dx = Number(point.x) - geometry.vanishingX;
    const dy = Number(point.y) - geometry.vanishingY;
    const distance = dx * ux + dy * uy;
    next.x = geometry.vanishingX + ux * distance;
    next.y = geometry.vanishingY + uy * distance;
    return next;
  }

  return next;
}
