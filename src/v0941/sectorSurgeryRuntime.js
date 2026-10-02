import { CanvasEngine } from '../core/CanvasEngine.js';
import { getEngine, setStatus } from '../v093/runtime.js';
import { plateById } from '../v0935/compositionPlates.js';
import {
  VERSION,
  SCHEMA,
  describeSectorTarget,
  rotationForSectorCopy,
  sectorAngles,
} from './sectorSurgery.js';

const originalDrawSegment = CanvasEngine.prototype.drawSegment;
const originalCommitShape = CanvasEngine.prototype.commitShape;
const originalPointerDown = CanvasEngine.prototype.pointerDown;
const originalRedrawOverlay = CanvasEngine.prototype.redrawOverlay;
const originalClearActiveLayer = CanvasEngine.prototype.clearActiveLayer;

let lastReceipt = null;

function activeState(engine = getEngine()) {
  const state = engine?.settings?.sectorSurgery;
  if (!state || state.schema !== SCHEMA || state.version !== VERSION) return null;
  return state;
}

function surgeryLayer(engine, state = activeState(engine)) {
  if (!engine || !state?.repairLayerId) return null;
  return engine.layers.find((layer) => layer.id === state.repairLayerId) || null;
}

function sourceLayer(engine, state = activeState(engine)) {
  if (!engine || !state?.sourceLayerId) return null;
  return engine.layers.find((layer) => layer.id === state.sourceLayerId) || null;
}

function traceGeometry(ctx, geometry, width, height) {
  const kind = String(geometry?.kind || '');
  if (kind === 'all') {
    ctx.rect(0, 0, width, height);
    return true;
  }
  if (kind === 'circle') {
    const unit = Math.min(width, height);
    ctx.arc(
      Number(geometry.cx ?? .5) * width,
      Number(geometry.cy ?? .5) * height,
      Number(geometry.r ?? .25) * unit,
      0,
      Math.PI * 2,
    );
    return true;
  }
  if (kind === 'ring') {
    const unit = Math.min(width, height);
    const cx = Number(geometry.cx ?? .5) * width;
    const cy = Number(geometry.cy ?? .5) * height;
    const outer = Number(geometry.outer ?? .5) * unit;
    const inner = Number(geometry.inner ?? 0) * unit;
    ctx.moveTo(cx + outer, cy);
    ctx.arc(cx, cy, outer, 0, Math.PI * 2, false);
    if (inner > 0) {
      ctx.moveTo(cx + inner, cy);
      ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
    }
    return true;
  }
  if (kind === 'rect') {
    ctx.rect(
      Number(geometry.x0 ?? 0) * width,
      Number(geometry.y0 ?? 0) * height,
      (Number(geometry.x1 ?? 1) - Number(geometry.x0 ?? 0)) * width,
      (Number(geometry.y1 ?? 1) - Number(geometry.y0 ?? 0)) * height,
    );
    return true;
  }
  if (kind === 'corners') {
    const w = Number(geometry.x ?? .2) * width;
    const h = Number(geometry.y ?? .2) * height;
    ctx.rect(0, 0, w, h);
    ctx.rect(width - w, 0, w, h);
    ctx.rect(0, height - h, w, h);
    ctx.rect(width - w, height - h, w, h);
    return true;
  }
  if (kind === 'any' && Array.isArray(geometry.items)) {
    let traced = false;
    for (const item of geometry.items) traced = traceGeometry(ctx, item, width, height) || traced;
    return traced;
  }
  return false;
}

function clipSectorRegion(engine, state, ctx = surgeryLayer(engine, state)?.ctx, sectorIndex = state?.sectorIndex) {
  if (!engine || !state || !ctx) return false;
  const cx = engine.width / 2;
  const cy = engine.height / 2;
  const radius = Math.hypot(engine.width, engine.height) * 1.25;
  const angles = sectorAngles(sectorIndex, state.sectorCount);

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, radius, angles.start, angles.end, false);
  ctx.closePath();
  ctx.clip();

  const plate = plateById(state.plateId);
  const region = plate?.regions?.find((item) => item.id === state.regionId);
  if (!region?.geometry || region.geometry.kind === 'all') return true;

  ctx.beginPath();
  if (!traceGeometry(ctx, region.geometry, engine.width, engine.height)) return false;
  ctx.clip(region.geometry.kind === 'ring' ? 'evenodd' : 'nonzero');
  return true;
}

function withSurgeryClip(engine, state, operation) {
  const layer = surgeryLayer(engine, state);
  if (!layer || engine.activeLayerId !== layer.id || layer.locked === true) return false;
  const ctx = layer.ctx;
  ctx.save();
  try {
    if (!clipSectorRegion(engine, state, ctx)) return false;
    operation(layer, ctx);
    return true;
  } finally {
    ctx.restore();
  }
}

function isSurgeryTarget(engine) {
  const state = activeState(engine);
  return Boolean(state && engine?.activeLayerId === state.repairLayerId);
}

CanvasEngine.prototype.drawSegment = function drawSegmentV0941(from, to) {
  const state = activeState(this);
  if (!state || this.activeLayerId !== state.repairLayerId) {
    return originalDrawSegment.call(this, from, to);
  }
  return withSurgeryClip(this, state, () => this.drawSingleSegment(from, to));
};

CanvasEngine.prototype.commitShape = function commitShapeV0941(tool, start, end) {
  const state = activeState(this);
  if (!state || this.activeLayerId !== state.repairLayerId) {
    return originalCommitShape.call(this, tool, start, end);
  }
  return withSurgeryClip(this, state, (layer) => this.drawShape(layer.ctx, tool, start, end, false));
};

CanvasEngine.prototype.pointerDown = function pointerDownV0941(event) {
  if (isSurgeryTarget(this) && this.tool === 'fill') {
    this.onStatus('Sector Surgery allows brush and shape edits only. Fill is blocked on the repair layer.');
    return;
  }
  return originalPointerDown.call(this, event);
};

CanvasEngine.prototype.clearActiveLayer = function clearActiveLayerV0941() {
  const state = activeState(this);
  if (!state || this.activeLayerId !== state.repairLayerId) {
    return originalClearActiveLayer.call(this);
  }
  const layer = surgeryLayer(this, state);
  if (!layer || layer.locked === true) return false;
  this.captureHistory();
  withSurgeryClip(this, state, (_target, ctx) => {
    ctx.clearRect(0, 0, this.width, this.height);
  });
  this.markChanged('Sector repair cleared');
  return true;
};

function drawSurgeryOverlay(engine) {
  const state = activeState(engine);
  if (!state) return;
  const ctx = engine.overlayCtx;
  const cx = engine.width / 2;
  const cy = engine.height / 2;
  const radius = Math.hypot(engine.width, engine.height) * 1.05;

  ctx.save();
  ctx.fillStyle = 'rgba(250, 204, 21, .055)';
  ctx.strokeStyle = 'rgba(250, 204, 21, .9)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 7]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, radius, state.startAngle, state.endAngle, false);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(250, 204, 21, .95)';
  ctx.font = `700 ${Math.max(12, Math.min(18, Math.min(engine.width, engine.height) / 70))}px system-ui, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(
    `SECTOR ${state.sectorIndex + 1}/${state.sectorCount} · ${state.regionLabel}`,
    14,
    14,
  );
  ctx.restore();
}

CanvasEngine.prototype.redrawOverlay = function redrawOverlayV0941(shapeStart = null, shapeEnd = null) {
  originalRedrawOverlay.call(this, shapeStart, shapeEnd);
  drawSurgeryOverlay(this);
};

function emit(action, detail = {}) {
  const payload = Object.freeze({
    schema: SCHEMA,
    version: VERSION,
    action,
    at: new Date().toISOString(),
    ...detail,
  });
  document.dispatchEvent(new CustomEvent('domistika:v0941-sector-surgery', { detail: payload }));
  return payload;
}

function stateReceipt(state, action, extras = {}) {
  return Object.freeze({
    schema: SCHEMA,
    version: VERSION,
    action,
    plateId: state.plateId,
    regionId: state.regionId,
    formula: state.formula,
    sectorIndex: state.sectorIndex,
    sectorCount: state.sectorCount,
    sourceLayerId: state.sourceLayerId,
    repairLayerId: state.repairLayerId,
    ...extras,
  });
}

export function beginSectorSurgery(point) {
  const engine = getEngine();
  if (!engine) throw new Error('DOMISTIKA_SECTOR_SURGERY_ENGINE_UNAVAILABLE');
  if (activeState(engine)) throw new Error('DOMISTIKA_SECTOR_SURGERY_ALREADY_ACTIVE');

  const plate = plateById(engine.settings.compositionPlateId);
  if (!plate) throw new Error('DOMISTIKA_SECTOR_SURGERY_PLATE_REQUIRED');

  const target = describeSectorTarget(plate, point, engine.width, engine.height);
  if (!target) throw new Error('DOMISTIKA_SECTOR_SURGERY_RADIAL_REGION_REQUIRED');

  const source = engine.activeLayer;
  if (!source || source.kind === 'guide' || source.role !== 'paint') {
    throw new Error('DOMISTIKA_SECTOR_SURGERY_PAINT_SOURCE_REQUIRED');
  }
  if (source.visible === false) {
    throw new Error('DOMISTIKA_SECTOR_SURGERY_VISIBLE_SOURCE_REQUIRED');
  }

  const sourceWasLocked = source.locked === true;
  const sourceWasVisible = source.visible !== false;
  if (!sourceWasLocked) engine.setLayerLocked(source.id, true);

  const repair = engine.createLayer(
    `Sector Repair · ${target.regionLabel} · ${target.sectorIndex + 1}/${target.sectorCount}`,
    {
      role: 'paint',
      motionPolicy: source.motionPolicy || 'inherit',
      opacity: Number(source.opacity ?? 1),
      blendMode: source.blendMode || 'normal',
      visible: true,
      locked: false,
      groupId: source.groupId || null,
      semanticOverlays: [{
        kind: 'sector-surgery',
        schema: SCHEMA,
        version: VERSION,
        plateId: target.plateId,
        regionId: target.regionId,
        sectorIndex: target.sectorIndex,
        sectorCount: target.sectorCount,
        sourceLayerId: source.id,
      }],
    },
  );
  repair.ctx.drawImage(source.canvas, 0, 0);
  engine.setLayerVisibility(source.id, false);

  const state = {
    schema: SCHEMA,
    version: VERSION,
    plateId: target.plateId,
    plateLabel: target.plateLabel,
    regionId: target.regionId,
    regionLabel: target.regionLabel,
    regionGeometry: target.regionGeometry,
    formula: target.formula,
    sectorIndex: target.sectorIndex,
    sectorCount: target.sectorCount,
    startAngle: target.startAngle,
    endAngle: target.endAngle,
    sourceLayerId: source.id,
    sourceWasLocked,
    sourceWasVisible,
    repairLayerId: repair.id,
    startedAt: new Date().toISOString(),
  };

  engine.settings.sectorSurgery = state;
  engine.setActiveLayer(repair.id);
  engine.redrawOverlay();
  setStatus(`Sector ${state.sectorIndex + 1}/${state.sectorCount} unlocked for repair · ${state.regionLabel}`);
  lastReceipt = stateReceipt(state, 'begin');
  emit('begin', { state: activeSectorSurgery(), receipt: lastReceipt });
  return activeSectorSurgery();
}

export function refoldSectorSurgery() {
  const engine = getEngine();
  const state = activeState(engine);
  if (!engine || !state) throw new Error('DOMISTIKA_SECTOR_SURGERY_NOT_ACTIVE');
  const repair = surgeryLayer(engine, state);
  if (!repair) throw new Error('DOMISTIKA_SECTOR_SURGERY_LAYER_MISSING');

  engine.setActiveLayer(repair.id);
  engine.captureHistory();

  const sectorSource = document.createElement('canvas');
  sectorSource.width = engine.width;
  sectorSource.height = engine.height;
  const sectorCtx = sectorSource.getContext('2d');
  sectorCtx.save();
  clipSectorRegion(engine, state, sectorCtx, state.sectorIndex);
  sectorCtx.drawImage(repair.canvas, 0, 0);
  sectorCtx.restore();

  const cx = engine.width / 2;
  const cy = engine.height / 2;
  for (let targetIndex = 0; targetIndex < state.sectorCount; targetIndex += 1) {
    repair.ctx.save();
    clipSectorRegion(engine, state, repair.ctx, targetIndex);
    repair.ctx.clearRect(0, 0, engine.width, engine.height);
    repair.ctx.restore();

    const rotation = rotationForSectorCopy(state.sectorIndex, targetIndex, state.sectorCount);
    repair.ctx.save();
    repair.ctx.translate(cx, cy);
    repair.ctx.rotate(rotation);
    repair.ctx.translate(-cx, -cy);
    repair.ctx.drawImage(sectorSource, 0, 0);
    repair.ctx.restore();
  }

  engine.setLayerLocked(repair.id, true);
  engine.settings.sectorSurgery = null;
  engine.redrawOverlay();
  engine.markChanged(`Sector repair refolded ×${state.sectorCount}`);

  lastReceipt = stateReceipt(state, 'refold', {
    copies: state.sectorCount,
    radialOnly: true,
    repairLayerLocked: true,
  });
  emit('refold', { receipt: lastReceipt });
  return lastReceipt;
}

export function sealSectorSurgery() {
  const engine = getEngine();
  const state = activeState(engine);
  if (!engine || !state) throw new Error('DOMISTIKA_SECTOR_SURGERY_NOT_ACTIVE');
  const repair = surgeryLayer(engine, state);
  if (!repair) throw new Error('DOMISTIKA_SECTOR_SURGERY_LAYER_MISSING');

  engine.setLayerLocked(repair.id, true);
  engine.settings.sectorSurgery = null;
  engine.redrawOverlay();
  setStatus('Sector repair sealed without refold');

  lastReceipt = stateReceipt(state, 'seal', {
    copies: 1,
    radialOnly: true,
    repairLayerLocked: true,
  });
  emit('seal', { receipt: lastReceipt });
  return lastReceipt;
}

export function cancelSectorSurgery() {
  const engine = getEngine();
  const state = activeState(engine);
  if (!engine || !state) return false;
  const repair = surgeryLayer(engine, state);
  const source = sourceLayer(engine, state);

  if (repair) {
    const index = engine.layers.findIndex((layer) => layer.id === repair.id);
    if (index >= 0) engine.layers.splice(index, 1);
    repair.canvas.remove();
  }
  if (source) {
    engine.setLayerVisibility(source.id, state.sourceWasVisible !== false);
    if (!state.sourceWasLocked) engine.setLayerLocked(source.id, false);
  }
  engine.settings.sectorSurgery = null;
  if (source) engine.setActiveLayer(source.id);
  engine.syncLayerDomOrder();
  engine.redrawOverlay();
  engine.markChanged('Sector surgery cancelled');

  lastReceipt = stateReceipt(state, 'cancel', {
    sourceLockRestored: !state.sourceWasLocked,
    sourceVisibilityRestored: true,
  });
  emit('cancel', { receipt: lastReceipt });
  return true;
}

export function activeSectorSurgery() {
  const engine = getEngine();
  const state = activeState(engine);
  if (!engine || !state) return null;
  const repair = surgeryLayer(engine, state);
  return Object.freeze({
    schema: SCHEMA,
    version: VERSION,
    plateId: state.plateId,
    plateLabel: state.plateLabel,
    regionId: state.regionId,
    regionLabel: state.regionLabel,
    formula: state.formula,
    sectorIndex: state.sectorIndex,
    sectorCount: state.sectorCount,
    sourceLayerId: state.sourceLayerId,
    repairLayerId: state.repairLayerId,
    repairLayerLocked: repair?.locked === true,
    radialOnly: true,
  });
}

export function sectorSurgeryReceipt() {
  return lastReceipt;
}

export function restrictsLayer(layerId) {
  const state = activeState();
  return Boolean(state && state.repairLayerId === String(layerId || ''));
}

if (typeof window !== 'undefined') {
  window.domistikaSectorSurgeryV0941 = Object.freeze({
    version: VERSION,
    schema: SCHEMA,
    begin: beginSectorSurgery,
    active: activeSectorSurgery,
    refold: refoldSectorSurgery,
    seal: sealSectorSurgery,
    cancel: cancelSectorSurgery,
    receipt: sectorSurgeryReceipt,
    restrictsLayer,
  });
}
