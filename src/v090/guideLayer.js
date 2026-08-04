import { CanvasEngine } from '../core/CanvasEngine.js';
import { GUIDE_TEMPLATES } from './guideTemplates.js';

let latestEngine = null;

const originalBindEvents = CanvasEngine.prototype.bindEvents;
const originalCreateLayer = CanvasEngine.prototype.createLayer;
const originalSerialize = CanvasEngine.prototype.serialize;
const originalCompositeCanvas = CanvasEngine.prototype.compositeCanvas;
const originalPointerDown = CanvasEngine.prototype.pointerDown;
const originalSetActiveLayer = CanvasEngine.prototype.setActiveLayer;

function normalizeElement(element = {}) {
  return {
    type: element.type || 'path',
    points: Array.isArray(element.points) ? element.points : [],
    x: Number(element.x ?? 0.5),
    y: Number(element.y ?? 0.5),
    width: Number(element.width ?? 0.1),
    height: Number(element.height ?? element.width ?? 0.1),
    radius: Number(element.radius ?? 0.04),
    rotation: Number(element.rotation ?? 0),
    label: String(element.label || ''),
    color: element.color || '#6ee7ff',
    dashed: element.dashed !== false,
    closed: Boolean(element.closed),
    arrow: Boolean(element.arrow),
  };
}

function canvasPoint(engine, point) {
  if (Array.isArray(point)) return { x: Number(point[0]) * engine.width, y: Number(point[1]) * engine.height };
  return { x: Number(point?.x ?? 0) * engine.width, y: Number(point?.y ?? 0) * engine.height };
}

function drawArrowHead(ctx, from, to, size) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - Math.cos(angle - Math.PI / 6) * size, to.y - Math.sin(angle - Math.PI / 6) * size);
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - Math.cos(angle + Math.PI / 6) * size, to.y - Math.sin(angle + Math.PI / 6) * size);
  ctx.stroke();
}

function drawElement(engine, ctx, raw) {
  const element = normalizeElement(raw);
  const lineWidth = Math.max(2, Math.min(engine.width, engine.height) / 520);
  ctx.save();
  ctx.strokeStyle = element.color;
  ctx.fillStyle = element.color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash(element.dashed ? [lineWidth * 6, lineWidth * 4] : []);
  ctx.globalAlpha = 0.92;

  if (element.type === 'path' && element.points.length >= 2) {
    const points = element.points.map((point) => canvasPoint(engine, point));
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) {
      const current = points[index];
      if (current.control1 && current.control2) {
        ctx.bezierCurveTo(current.control1.x, current.control1.y, current.control2.x, current.control2.y, current.x, current.y);
      } else ctx.lineTo(current.x, current.y);
    }
    if (element.closed) ctx.closePath();
    ctx.stroke();
    if (element.arrow) drawArrowHead(ctx, points.at(-2), points.at(-1), lineWidth * 7);
  } else if (element.type === 'curve' && element.points.length >= 4) {
    const [start, control1, control2, end] = element.points.slice(0, 4).map((point) => canvasPoint(engine, point));
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.bezierCurveTo(control1.x, control1.y, control2.x, control2.y, end.x, end.y);
    ctx.stroke();
    if (element.arrow) drawArrowHead(ctx, control2, end, lineWidth * 7);
  } else if (element.type === 'circle' || element.type === 'anchor') {
    const center = canvasPoint(engine, [element.x, element.y]);
    const radius = element.radius * Math.min(engine.width, engine.height);
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    if (element.type === 'anchor') {
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.arc(center.x, center.y, Math.max(3, lineWidth * 1.8), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (element.type === 'ellipse') {
    const center = canvasPoint(engine, [element.x, element.y]);
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, element.width * engine.width, element.height * engine.height, element.rotation, 0, Math.PI * 2);
    ctx.stroke();
  } else if (element.type === 'line') {
    const points = element.points.map((point) => canvasPoint(engine, point));
    if (points.length >= 2) {
      ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); ctx.lineTo(points[1].x, points[1].y); ctx.stroke();
      if (element.arrow) drawArrowHead(ctx, points[0], points[1], lineWidth * 7);
    }
  } else if (element.type === 'label' && element.label) {
    const point = canvasPoint(engine, [element.x, element.y]);
    ctx.setLineDash([]);
    ctx.font = `700 ${Math.max(14, Math.min(30, Math.min(engine.width, engine.height) / 46))}px system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, lineWidth * 2.4);
    ctx.strokeStyle = 'rgba(14, 12, 18, .85)';
    ctx.strokeText(element.label, point.x, point.y);
    ctx.fillStyle = element.color;
    ctx.fillText(element.label, point.x, point.y);
  }
  ctx.restore();
}

export { GUIDE_TEMPLATES };

function styleGuideLayer(layer) {
  if (!layer?.canvas) return;
  layer.kind = 'guide';
  layer.guide = true;
  layer.locked = true;
  layer.exportPolicy = 'exclude';
  layer.canvas.classList.add('guide-layer');
  layer.canvas.dataset.layerKind = 'guide';
  layer.canvas.style.pointerEvents = 'none';
  layer.canvas.style.filter = 'drop-shadow(0 0 3px rgba(110,231,255,.28))';
}

CanvasEngine.prototype.bindEvents = function bindEventsV090() {
  latestEngine = this;
  const result = originalBindEvents.call(this);
  document.dispatchEvent(new CustomEvent('domistika:v090-engine', { detail: { engine: this } }));
  return result;
};

CanvasEngine.prototype.createLayer = function createLayerV090(name, options = {}) {
  const layer = originalCreateLayer.call(this, name, options);
  if (options.kind === 'guide' || options.guide === true || options.exportPolicy === 'exclude-guide') {
    layer.kind = 'guide';
    layer.guide = true;
    layer.locked = options.locked !== false;
    layer.exportPolicy = 'exclude';
    layer.guideMeta = options.guideMeta || null;
    styleGuideLayer(layer);
  }
  return layer;
};

CanvasEngine.prototype.setActiveLayer = function setActiveLayerV090(id) {
  const result = originalSetActiveLayer.call(this, id);
  const active = this.activeLayer;
  document.dispatchEvent(new CustomEvent('domistika:v090-active-layer', {
    detail: { layerId: active?.id || null, kind: active?.kind || 'art', locked: Boolean(active?.locked) },
  }));
  return result;
};

CanvasEngine.prototype.pointerDown = function pointerDownV090(event) {
  const navigationAction = event.button === 1 || this.tool === 'pan' || this.spacePan || this.tool === 'eyedropper' || event.button === 2 || event.altKey;
  if (this.activeLayer?.kind === 'guide' && this.activeLayer.locked && !navigationAction) {
    this.onStatus('Guide layers are locked. Select an art layer to draw.');
    document.dispatchEvent(new CustomEvent('domistika:v090-guide-locked', { detail: { layerId: this.activeLayer.id } }));
    return;
  }
  return originalPointerDown.call(this, event);
};

CanvasEngine.prototype.serialize = function serializeV090() {
  const project = originalSerialize.call(this);
  project.version = Math.max(9, Number(project.version) || 1);
  project.layers = project.layers.map((saved) => {
    const layer = this.layers.find((candidate) => candidate.id === saved.id);
    if (!layer || layer.kind !== 'guide') return saved;
    return {
      ...saved,
      kind: 'guide',
      guide: true,
      locked: layer.locked !== false,
      exportPolicy: 'exclude-guide',
      guideMeta: layer.guideMeta || null,
    };
  });
  project.superphase = { ...(project.superphase || {}), guideLayers: 1, schema: 'domistika-superphase-v090' };
  return project;
};

CanvasEngine.prototype.compositeCanvas = function compositeCanvasV090(includeBackground = true, background = '#ffffff', options = {}) {
  const includeGuides = Boolean(options?.includeGuides);
  if (includeGuides) return originalCompositeCanvas.call(this, includeBackground, background);
  const states = this.layers.map((layer) => ({ layer, visible: layer.visible }));
  this.layers.forEach((layer) => { if (layer.kind === 'guide' || layer.exportPolicy === 'exclude') layer.visible = false; });
  try {
    return originalCompositeCanvas.call(this, includeBackground, background);
  } finally {
    states.forEach(({ layer, visible }) => { layer.visible = visible; });
  }
};

CanvasEngine.prototype.createGuideLayer = function createGuideLayer(templateId, options = {}) {
  const template = GUIDE_TEMPLATES[templateId];
  if (!template) throw new Error(`Unknown guide template: ${templateId}`);
  const previousLayerId = this.activeLayerId;
  const layer = this.createLayer(`Guide · ${options.title || template.title}`, {
    kind: 'guide',
    guide: true,
    locked: true,
    exportPolicy: 'exclude-guide',
    opacity: Number(options.opacity ?? 0.72),
    guideMeta: {
      templateId,
      lessonId: options.lessonId || null,
      createdAt: new Date().toISOString(),
      version: 1,
    },
  });
  layer.ctx.clearRect(0, 0, this.width, this.height);
  for (const element of options.elements || template.elements) drawElement(this, layer.ctx, element);
  styleGuideLayer(layer);
  if (previousLayerId && this.layers.some((candidate) => candidate.id === previousLayerId)) this.setActiveLayer(previousLayerId);
  this.markChanged(`${template.title} guide created`);
  document.dispatchEvent(new CustomEvent('domistika:v090-guide-created', { detail: { layerId: layer.id, templateId } }));
  return layer;
};

CanvasEngine.prototype.removeGuideLayer = function removeGuideLayer(id) {
  const index = this.layers.findIndex((layer) => layer.id === id && layer.kind === 'guide');
  if (index < 0) return false;
  const [layer] = this.layers.splice(index, 1);
  layer.canvas.remove();
  if (this.activeLayerId === id) {
    const next = this.layers[Math.max(0, index - 1)] || this.layers[0];
    if (next) this.setActiveLayer(next.id);
  }
  this.syncLayerDomOrder();
  this.markChanged('Guide layer removed');
  document.dispatchEvent(new CustomEvent('domistika:v090-guide-removed', { detail: { layerId: id } }));
  return true;
};

CanvasEngine.prototype.guideLayers = function guideLayers() {
  return this.layers.filter((layer) => layer.kind === 'guide');
};

export function getLatestEngine() {
  return latestEngine;
}
