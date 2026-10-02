import { CanvasEngine } from '../core/CanvasEngine.js';
import { getEngine, setStatus } from '../v093/runtime.js';
import {
  VERSION,
  DRAFTING_GUIDE_SCHEMA,
  GUIDE_KINDS,
  normalizeDraftingGuide,
  guideGeometry,
  beginDraftingSnap,
  snapDraftingPoint,
} from './draftingGuides.js';

const originalEventPoint = CanvasEngine.prototype.eventPoint;
const originalPointerDown = CanvasEngine.prototype.pointerDown;
const originalPointerUp = CanvasEngine.prototype.pointerUp;
const originalDrawDot = CanvasEngine.prototype.drawDot;

function stateFor(engine) {
  const state = engine?.settings?.draftingGuide;
  if (!state || !GUIDE_KINDS.includes(state.kind)) return null;
  return state;
}

function guideLayer(engine, state = stateFor(engine)) {
  if (!engine || !state?.layerId) return null;
  return engine.layers.find((layer) => layer.id === state.layerId) || null;
}

function isSnapDrawingAction(engine, event) {
  if (!engine || !event) return false;
  if (event.button === 1 || event.button === 2 || event.altKey) return false;
  if (engine.tool === 'pan' || engine.tool === 'eyedropper') return false;
  return true;
}

CanvasEngine.prototype.eventPoint = function eventPointV0938(event) {
  const point = originalEventPoint.call(this, event);
  const state = stateFor(this);
  if (!state?.snap || !this._draftingSnapSession) return point;
  return snapDraftingPoint(state.guide, point, this.width, this.height, this._draftingSnapSession);
};

CanvasEngine.prototype.pointerDown = function pointerDownV0938(event) {
  const state = stateFor(this);
  if (state?.snap && isSnapDrawingAction(this, event) && this.layerWritable?.()) {
    const raw = originalEventPoint.call(this, event);
    this._draftingSnapSession = beginDraftingSnap(state.guide, raw, this.width, this.height);
  } else {
    this._draftingSnapSession = null;
  }
  return originalPointerDown.call(this, event);
};

CanvasEngine.prototype.pointerUp = function pointerUpV0938(event) {
  try {
    return originalPointerUp.call(this, event);
  } finally {
    this._draftingSnapSession = null;
  }
};

CanvasEngine.prototype.drawDot = function drawDotV0938(point) {
  const state = stateFor(this);
  if (!state?.snap) return originalDrawDot.call(this, point);
  const session = this._draftingSnapSession || beginDraftingSnap(state.guide, point, this.width, this.height);
  const start = snapDraftingPoint(state.guide, point, this.width, this.height, session);
  const candidate = { ...start, x: start.x + 0.01, y: start.y + 0.01 };
  const end = snapDraftingPoint(state.guide, candidate, this.width, this.height, session);
  this.drawSegment(start, end);
};

function removeDraftingLayer(engine, layerId) {
  if (!engine || !layerId) return false;
  if (typeof engine.removeGuideLayer === 'function' && engine.removeGuideLayer(layerId)) return true;
  const index = engine.layers.findIndex((layer) => layer.id === layerId);
  if (index < 0) return false;
  const [layer] = engine.layers.splice(index, 1);
  layer.canvas?.remove?.();
  engine.syncLayerDomOrder?.();
  return true;
}

function drawDraftingGuide(engine, layer, guide) {
  const ctx = layer.ctx;
  const geometry = guideGeometry(guide, engine.width, engine.height);
  ctx.clearRect(0, 0, engine.width, engine.height);
  ctx.save();
  ctx.strokeStyle = 'rgba(34,211,238,.86)';
  ctx.fillStyle = 'rgba(244,114,182,.95)';
  ctx.lineWidth = Math.max(1.5, Math.min(engine.width, engine.height) / 700);
  ctx.setLineDash([12, 9]);

  if (guide.kind === 'horizontal-ruler') {
    ctx.beginPath();
    ctx.moveTo(0, geometry.y);
    ctx.lineTo(engine.width, geometry.y);
    ctx.stroke();
  } else if (guide.kind === 'vertical-ruler') {
    ctx.beginPath();
    ctx.moveTo(geometry.x, 0);
    ctx.lineTo(geometry.x, engine.height);
    ctx.stroke();
  } else if (guide.kind === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(geometry.cx, geometry.cy, geometry.rx, geometry.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (guide.kind === 'one-point') {
    ctx.beginPath();
    ctx.moveTo(0, geometry.horizonY);
    ctx.lineTo(engine.width, geometry.horizonY);
    ctx.stroke();

    ctx.globalAlpha = 0.38;
    for (const [x, y] of [[0, 0], [engine.width, 0], [0, engine.height], [engine.width, engine.height]]) {
      ctx.beginPath();
      ctx.moveTo(geometry.vanishingX, geometry.vanishingY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(geometry.vanishingX, geometry.vanishingY, Math.max(5, ctx.lineWidth * 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function emit(action, state) {
  document.dispatchEvent(new CustomEvent('domistika:v0938-drafting-guide', {
    detail: {
      schema: DRAFTING_GUIDE_SCHEMA,
      version: VERSION,
      action,
      guide: state || null,
    },
  }));
}

export function applyDraftingGuide(kind, options = {}) {
  const engine = getEngine();
  if (!engine) throw new Error('DOMISTIKA_DRAFTING_GUIDE_ENGINE_UNAVAILABLE');
  const guide = normalizeDraftingGuide(kind, options);
  const previous = stateFor(engine);
  const previousActive = engine.activeLayerId;
  if (previous?.layerId) removeDraftingLayer(engine, previous.layerId);

  const layer = engine.createLayer('Guide · ' + ({
    'horizontal-ruler': 'Horizontal Ruler',
    'vertical-ruler': 'Vertical Ruler',
    ellipse: 'Ellipse',
    'one-point': 'One-Point Perspective',
  }[kind] || kind), {
    kind: 'guide',
    guide: true,
    locked: true,
    exportPolicy: 'exclude-guide',
    role: 'guide',
    opacity: Number(options.opacity ?? 0.82),
    guideMeta: {
      schema: DRAFTING_GUIDE_SCHEMA,
      version: VERSION,
      kind,
      guide,
    },
  });

  drawDraftingGuide(engine, layer, guide);
  const state = {
    schema: DRAFTING_GUIDE_SCHEMA,
    version: VERSION,
    kind,
    guide,
    layerId: layer.id,
    visible: options.visible !== false,
    snap: options.snap !== false,
  };
  engine.settings.draftingGuide = state;
  engine.setLayerVisibility(layer.id, state.visible);
  if (previousActive && engine.layers.some((candidate) => candidate.id === previousActive)) {
    engine.setActiveLayer(previousActive);
  } else {
    const artLayer = [...engine.layers].reverse().find((candidate) => candidate.kind !== 'guide');
    if (artLayer) engine.setActiveLayer(artLayer.id);
  }
  engine.markChanged('Drafting guide applied');
  setStatus((state.snap ? 'Snap ON · ' : 'Snap OFF · ') + layer.name);
  emit('apply', activeDraftingGuide());
  return activeDraftingGuide();
}

export function clearDraftingGuide() {
  const engine = getEngine();
  if (!engine) throw new Error('DOMISTIKA_DRAFTING_GUIDE_ENGINE_UNAVAILABLE');
  const state = stateFor(engine);
  if (state?.layerId) removeDraftingLayer(engine, state.layerId);
  engine.settings.draftingGuide = null;
  engine._draftingSnapSession = null;
  engine.markChanged('Drafting guide cleared');
  setStatus('Drafting guide cleared');
  emit('clear', null);
  return true;
}

export function setDraftingGuideSnap(enabled) {
  const engine = getEngine();
  const state = stateFor(engine);
  if (!engine || !state) throw new Error('DOMISTIKA_DRAFTING_GUIDE_NOT_ACTIVE');
  state.snap = Boolean(enabled);
  engine.settings.draftingGuide = state;
  setStatus('Drafting snap ' + (state.snap ? 'enabled' : 'disabled'));
  emit('snap', activeDraftingGuide());
  return state.snap;
}

export function setDraftingGuideVisible(visible) {
  const engine = getEngine();
  const state = stateFor(engine);
  if (!engine || !state) throw new Error('DOMISTIKA_DRAFTING_GUIDE_NOT_ACTIVE');
  state.visible = Boolean(visible);
  engine.settings.draftingGuide = state;
  const layer = guideLayer(engine, state);
  if (layer) engine.setLayerVisibility(layer.id, state.visible);
  setStatus('Drafting guide ' + (state.visible ? 'visible' : 'hidden'));
  emit('visibility', activeDraftingGuide());
  return state.visible;
}

export function snapDraftingPoints(points, engineInput = null) {
  const engine = engineInput || getEngine();
  const state = stateFor(engine);
  if (!engine || !state?.snap || !Array.isArray(points) || !points.length) return points;
  const session = beginDraftingSnap(state.guide, points[0], engine.width, engine.height);
  return points.map((point) => snapDraftingPoint(state.guide, point, engine.width, engine.height, session));
}

export function activeDraftingGuide() {
  const engine = getEngine();
  const state = stateFor(engine);
  if (!engine || !state) return null;
  const layer = guideLayer(engine, state);
  return Object.freeze({
    schema: DRAFTING_GUIDE_SCHEMA,
    version: VERSION,
    kind: state.kind,
    guide: Object.freeze({ ...state.guide }),
    layerId: state.layerId || null,
    visible: layer ? layer.visible !== false : state.visible !== false,
    snap: state.snap !== false,
  });
}

if (typeof window !== 'undefined') {
  window.domistikaDraftingGuidesV0938 = Object.freeze({
    version: VERSION,
    schema: DRAFTING_GUIDE_SCHEMA,
    kinds: Object.freeze([...GUIDE_KINDS]),
    apply: applyDraftingGuide,
    clear: clearDraftingGuide,
    active: activeDraftingGuide,
    snapPoints: snapDraftingPoints,
    snap: setDraftingGuideSnap,
    visible: setDraftingGuideVisible,
  });
}
