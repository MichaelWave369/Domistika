import { CanvasEngine } from '../core/CanvasEngine.js';
import { getEngine, setStatus } from '../v093/runtime.js';
import {
  VERSION,
  PLATE_SCHEMA,
  plateById,
  listCompositionPlates,
  describePlate,
  resolveCompositionRegion,
  transformsForSegment,
} from './compositionPlates.js';

const originalDrawSegment = CanvasEngine.prototype.drawSegment;
const originalCommitShape = CanvasEngine.prototype.commitShape;
const originalSymmetryTransforms = CanvasEngine.prototype.symmetryTransforms;
const originalRedrawOverlay = CanvasEngine.prototype.redrawOverlay;

function enginePlate(engine) {
  return plateById(engine?.settings?.compositionPlateId);
}

function identity(point) {
  return { ...point };
}

CanvasEngine.prototype.symmetryTransforms = function symmetryTransformsV0935() {
  if (enginePlate(this)) return [identity];
  return originalSymmetryTransforms.call(this);
};

CanvasEngine.prototype.drawSegment = function drawSegmentV0935(from, to) {
  const plate = enginePlate(this);
  if (!plate) return originalDrawSegment.call(this, from, to);
  for (const transform of transformsForSegment(plate, from, to, this.width, this.height)) {
    this.drawSingleSegment(transform(from), transform(to));
  }
};

CanvasEngine.prototype.commitShape = function commitShapeV0935(tool, start, end) {
  const plate = enginePlate(this);
  if (!plate) return originalCommitShape.call(this, tool, start, end);
  const layer = this.activeLayer;
  if (!layer || !this.layerWritable?.(layer)) return;
  for (const transform of transformsForSegment(plate, start, end, this.width, this.height)) {
    this.drawShape(layer.ctx, tool, transform(start), transform(end), false);
  }
};

function drawGeometry(ctx, geometry, width, height) {
  const kind = String(geometry?.kind || '');
  ctx.beginPath();
  if (kind === 'circle' || kind === 'ring') {
    const cx = Number(geometry.cx ?? .5) * width;
    const cy = Number(geometry.cy ?? .5) * height;
    const unit = Math.min(width, height);
    if (kind === 'circle') {
      ctx.arc(cx, cy, Number(geometry.r ?? .25) * unit, 0, Math.PI * 2);
    } else {
      ctx.arc(cx, cy, Number(geometry.inner ?? 0) * unit, 0, Math.PI * 2);
      ctx.moveTo(cx + Number(geometry.outer ?? .5) * unit, cy);
      ctx.arc(cx, cy, Number(geometry.outer ?? .5) * unit, 0, Math.PI * 2);
    }
    ctx.stroke();
    return;
  }
  if (kind === 'rect') {
    const x = Number(geometry.x0 ?? 0) * width;
    const y = Number(geometry.y0 ?? 0) * height;
    const w = (Number(geometry.x1 ?? 1) - Number(geometry.x0 ?? 0)) * width;
    const h = (Number(geometry.y1 ?? 1) - Number(geometry.y0 ?? 0)) * height;
    ctx.rect(x, y, w, h);
    ctx.stroke();
    return;
  }
  if (kind === 'corners') {
    const w = Number(geometry.x ?? .2) * width;
    const h = Number(geometry.y ?? .2) * height;
    [[0, 0], [width - w, 0], [0, height - h], [width - w, height - h]].forEach(([x, y]) => {
      ctx.strokeRect(x, y, w, h);
    });
    return;
  }
  if (kind === 'any' && Array.isArray(geometry.items)) {
    geometry.items.forEach((item) => drawGeometry(ctx, item, width, height));
  }
}

function drawPlateOverlay(engine) {
  const plate = enginePlate(engine);
  if (!plate) return;
  const ctx = engine.overlayCtx;
  ctx.save();
  ctx.lineWidth = 1.25;
  ctx.setLineDash([8, 7]);
  for (const item of plate.regions) {
    if (item.geometry.kind === 'all') continue;
    ctx.strokeStyle = item.excluded ? 'rgba(244,63,94,.68)' : 'rgba(34,211,238,.34)';
    drawGeometry(ctx, item.geometry, engine.width, engine.height);
  }
  ctx.restore();
}

CanvasEngine.prototype.redrawOverlay = function redrawOverlayV0935(shapeStart = null, shapeEnd = null) {
  originalRedrawOverlay.call(this, shapeStart, shapeEnd);
  drawPlateOverlay(this);
};

function emit(detail) {
  document.dispatchEvent(new CustomEvent('domistika:v0935-composition-plate', {
    detail: {
      schema: PLATE_SCHEMA,
      version: VERSION,
      ...detail,
    },
  }));
}

export function applyCompositionPlate(id) {
  const plate = plateById(id);
  if (!plate) throw new Error('DOMISTIKA_COMPOSITION_PLATE_UNKNOWN');
  const engine = getEngine();
  if (!engine) throw new Error('DOMISTIKA_COMPOSITION_PLATE_ENGINE_UNAVAILABLE');
  engine.settings.compositionPlateId = plate.id;
  engine.redrawOverlay();
  const state = activeCompositionPlate();
  setStatus(plate.label + ' composition plate active · ' + plate.regions.length + ' regions');
  emit({ action: 'apply', plate: state });
  return state;
}

export function clearCompositionPlate() {
  const engine = getEngine();
  if (!engine) throw new Error('DOMISTIKA_COMPOSITION_PLATE_ENGINE_UNAVAILABLE');
  const previous = engine.settings.compositionPlateId || null;
  engine.settings.compositionPlateId = null;
  engine.redrawOverlay();
  setStatus('Composition plate cleared');
  emit({ action: 'clear', previous });
  return true;
}

export function activeCompositionPlate() {
  const engine = getEngine();
  if (!engine) return null;
  return describePlate(engine.settings.compositionPlateId);
}

export function compositionRegionAt(point) {
  const engine = getEngine();
  const plate = enginePlate(engine);
  if (!engine || !plate) return null;
  const region = resolveCompositionRegion(plate, point, engine.width, engine.height);
  if (!region) return null;
  return Object.freeze({
    plate: plate.id,
    id: region.id,
    label: region.label,
    formula: region.formula,
    excluded: region.excluded,
    output: region.output,
  });
}

if (typeof window !== 'undefined') {
  window.domistikaCompositionPlatesV0935 = Object.freeze({
    version: VERSION,
    schema: PLATE_SCHEMA,
    list: listCompositionPlates,
    apply: applyCompositionPlate,
    clear: clearCompositionPlate,
    active: activeCompositionPlate,
    regionAt: compositionRegionAt,
  });
}
