import { CanvasEngine } from '../core/CanvasEngine.js';
import { getEngine, setStatus, waitForEngine } from '../v093/runtime.js';
import {
  SCHEMA, VERSION, WEAVE_DEFAULTS, normalizeWeaveOptions,
  normalizeWeavePoints, validateWeave, drawWeave, weaveMetadata,
} from './dimensionalWeave.js';

const state = { armed: false, anchors: [], pointer: null, options: { ...WEAVE_DEFAULTS } };
const originalDown = CanvasEngine.prototype.pointerDown;
const originalMove = CanvasEngine.prototype.pointerMove;
const originalOverlay = CanvasEngine.prototype.redrawOverlay;
const originalRestore = CanvasEngine.prototype.restore;

function engine() {
  const current = getEngine();
  if (!current) throw new Error('WEAVE_ENGINE_UNAVAILABLE');
  return current;
}
function canCapture(target) {
  return target === getEngine() && state.armed === true;
}
function announce(message) {
  const detail = { schema: SCHEMA, version: VERSION, armed: state.armed,
    anchorCount: state.anchors.length, options: { ...state.options }, message };
  document.dispatchEvent(new CustomEvent('domistika:dimensional-weave', { detail }));
  setStatus(message);
  return detail;
}
function refresh() { getEngine()?.redrawOverlay(); }
function resetCapture() {
  state.armed = false;
  state.anchors = [];
  state.pointer = null;
  refresh();
}

CanvasEngine.prototype.pointerDown = function pointerDownDimensionalWeave(event) {
  if (!canCapture(this) || event.button !== 0 || event.altKey || this.spacePan) {
    return originalDown.call(this, event);
  }
  if (this.settings?.sectorSurgery) {
    announce('Finish Sector Surgery before placing weave anchors.');
    return;
  }
  const point = this.eventPoint(event);
  const anchor = { x: point.x / this.width, y: point.y / this.height };
  if (state.anchors.length >= 24) {
    announce('Maximum 24 anchors. Commit or clear to continue.');
    return;
  }
  if (state.anchors.some((p) => Math.hypot(p.x - anchor.x, p.y - anchor.y) < 0.002)) {
    announce('Anchor too close to an existing point.');
    return;
  }
  state.anchors.push(anchor);
  this.redrawOverlay();
  announce(state.anchors.length + ' weave anchors. Create a closed face with 3 or more.');
  event.preventDefault();
};

CanvasEngine.prototype.pointerMove = function pointerMoveDimensionalWeave(event) {
  if (!canCapture(this) || this.pointer?.mode === 'pan') return originalMove.call(this, event);
  const point = this.eventPoint(event);
  state.pointer = { x: point.x / this.width, y: point.y / this.height };
  this.redrawOverlay();
};

CanvasEngine.prototype.redrawOverlay = function redrawOverlayDimensionalWeave(...args) {
  const result = originalOverlay.apply(this, args);
  if (!canCapture(this)) return result;
  const ctx = this.overlayCtx;
  const { width, height } = this;
  const anchors = state.anchors;
  const candidate = state.pointer && anchors.length >= 2 ? [...anchors, state.pointer] : anchors;
  if (candidate.length >= 3) {
    try {
      drawWeave(ctx, candidate, width, height, state.options, { preview: true });
    } catch {
      // A crossed or incomplete face still displays its raw guide edges.
    }
  }
  ctx.save();
  ctx.lineWidth = Math.max(2, Math.min(width, height) / 500);
  ctx.strokeStyle = '#22d3ee';
  ctx.fillStyle = '#fef08a';
  ctx.setLineDash([9, 7]);
  ctx.beginPath();
  anchors.forEach((p, index) => {
    if (index === 0) ctx.moveTo(p.x * width, p.y * height);
    else ctx.lineTo(p.x * width, p.y * height);
  });
  if (state.pointer && anchors.length) ctx.lineTo(state.pointer.x * width, state.pointer.y * height);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const p of anchors) {
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, Math.max(4, Math.min(width, height) / 220), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  return result;
};

CanvasEngine.prototype.restore = async function restoreDimensionalWeave(...args) {
  if (this === getEngine()) resetCapture();
  return originalRestore.apply(this, args);
};

export function startWeave({ keepAnchors = false } = {}) {
  const current = engine();
  if (current.settings?.sectorSurgery) throw new Error('WEAVE_SECTOR_SURGERY_ACTIVE');
  if (!keepAnchors) state.anchors = [];
  state.armed = true;
  state.pointer = null;
  refresh();
  return announce('Dimensional Weave capture ON · click vertices on the canvas.');
}
export function stopWeave() {
  state.armed = false;
  state.pointer = null;
  refresh();
  return announce('Weave capture off · normal painting restored.');
}
export function clearWeave() {
  state.anchors = [];
  state.pointer = null;
  refresh();
  return announce('Weave anchors cleared. No artwork was changed.');
}
export function undoWeaveAnchor() {
  if (!state.anchors.length) return announce('No weave anchors to undo.');
  state.anchors.pop();
  refresh();
  return announce('Last weave anchor removed.');
}
export function addWeaveAnchor(point) {
  const anchors = normalizeWeavePoints([point]);
  if (state.anchors.length >= 24) throw new Error('WEAVE_MAX_24_ANCHORS');
  if (!state.armed) startWeave({ keepAnchors: true });
  if (state.anchors.some((p) => Math.hypot(p.x - anchors[0].x, p.y - anchors[0].y) < 0.002)) {
    throw new Error('WEAVE_DUPLICATE_ANCHOR');
  }
  state.anchors.push(anchors[0]);
  refresh();
  return announce('Weave anchor added.');
}
export function setWeaveOptions(changes = {}) {
  state.options = normalizeWeaveOptions({ ...state.options, ...changes });
  refresh();
  return announce('Weave preview updated.');
}
export function weaveState() {
  return { schema: SCHEMA, version: VERSION, armed: state.armed,
    anchors: state.anchors.map((p) => ({ ...p })), options: { ...state.options } };
}
export function loadSelectedWeave() {
  const current = engine();
  const source = current.activeLayer;
  const entry = source?.semanticOverlays?.find((item) => item?.kind === 'dimensional-weave' && item?.schema === SCHEMA);
  if (!entry) throw new Error('WEAVE_SELECT_GENERATED_LAYER');
  state.anchors = validateWeave(entry.anchors);
  state.options = normalizeWeaveOptions(entry.options);
  state.pointer = null;
  state.armed = true;
  refresh();
  announce('Loaded weave geometry. Rendering creates a NEW layer, retaining the original.');
  return weaveState();
}
export function commitWeave() {
  const current = engine();
  if (current.settings?.sectorSurgery) throw new Error('WEAVE_SECTOR_SURGERY_ACTIVE');
  const anchors = validateWeave(state.anchors);
  const options = normalizeWeaveOptions(state.options);
  const sourceLayerId = current.activeLayerId;
  const provenance = { ...weaveMetadata(anchors, options), sourceLayerId };
  // Generate into an independent paint layer. Never rasterize into the source.
  const layer = current.createLayer('Dimensional Weave · ' + options.copies + '×', {
    role: 'paint', motionPolicy: 'animate', semanticOverlays: [provenance],
  });
  drawWeave(layer.ctx, anchors, current.width, current.height, options);
  state.armed = false;
  state.pointer = null;
  current.redrawOverlay();
  current.markChanged('Dimensional Weave rendered to new layer · original preserved');
  announce('New weave layer ready. Select an earlier weave to make another version.');
  return { ok: true, layerId: layer.id, sourceLayerId, copies: options.copies,
    anchorCount: anchors.length, schema: SCHEMA };
}
export function animateWeave() {
  stopWeave();
  const kinetic = window.domistikaKineticRotationV0912;
  if (!kinetic?.play || !kinetic?.refresh) throw new Error('WEAVE_KINETIC_UNAVAILABLE');
  kinetic.refresh();
  kinetic.play();
  return { ok: true, mode: 'kinetic-rings-3' };
}
export async function sendWeaveToAuralith() {
  stopWeave();
  const bridge = window.domistikaAuralithBridgeV093;
  if (!bridge?.transfer) throw new Error('WEAVE_AURALITH_BRIDGE_UNAVAILABLE');
  return bridge.transfer();
}
waitForEngine(() => {
  window.domistikaDimensionalWeaveV1 = Object.freeze({
    schema: SCHEMA, version: VERSION,
    start: startWeave, stop: stopWeave, clear: clearWeave, undoAnchor: undoWeaveAnchor,
    addAnchor: addWeaveAnchor, options: setWeaveOptions, state: weaveState,
    loadSelected: loadSelectedWeave, commit: commitWeave,
    animate: animateWeave, auralith: sendWeaveToAuralith,
  });
  announce('Dimensional Weave ready · open the Layers panel to create 2.5D geometry.');
});
