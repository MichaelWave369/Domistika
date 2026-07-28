import { canvasToBlob, clamp, hexToRgba, loadImage, rgbaToHex, uid } from './utils.js';

const DRAW_TOOLS = new Set(['pencil', 'ink', 'marker', 'airbrush', 'eraser']);
const SHAPE_TOOLS = new Set(['line', 'rectangle', 'ellipse']);

export class CanvasEngine {
  constructor({ artboard, overlay, width = 1600, height = 1200, onChange, onStatus, onPan }) {
    this.artboard = artboard;
    this.overlay = overlay;
    this.overlayCtx = overlay.getContext('2d', { willReadFrequently: true });
    this.width = width;
    this.height = height;
    this.layers = [];
    this.activeLayerId = null;
    this.tool = 'pencil';
    this.settings = {
      color: '#1b1820', size: 12, opacity: 1, smoothing: 35, pressure: true,
      symmetry: 'none', grid: false, gridSize: 80,
    };
    this.pointer = null;
    this.spacePan = false;
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 16;
    this.onChange = onChange ?? (() => {});
    this.onStatus = onStatus ?? (() => {});
    this.onPan = onPan ?? {};
    this.resizeCanvases(width, height, false);
    this.bindEvents();
    this.createLayer('Sketch 1');
  }

  bindEvents() {
    this.overlay.addEventListener('pointerdown', (event) => this.pointerDown(event));
    this.overlay.addEventListener('pointermove', (event) => this.pointerMove(event));
    this.overlay.addEventListener('pointerup', (event) => this.pointerUp(event));
    this.overlay.addEventListener('pointercancel', (event) => this.pointerUp(event));
    this.overlay.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  setSpacePan(enabled) {
    this.spacePan = enabled;
    this.overlay.classList.toggle('is-panning', enabled || this.tool === 'pan');
  }

  setTool(tool) {
    this.tool = tool;
    this.overlay.classList.toggle('is-panning', tool === 'pan' || this.spacePan);
    this.onStatus(`${tool[0].toUpperCase()}${tool.slice(1)} selected`);
  }

  setSetting(key, value) {
    if (!(key in this.settings)) return;
    this.settings[key] = value;
    if (key === 'grid' || key === 'gridSize' || key === 'symmetry') this.redrawOverlay();
  }

  get activeLayer() {
    return this.layers.find((layer) => layer.id === this.activeLayerId) ?? null;
  }

  createLayer(name = `Layer ${this.layers.length + 1}`, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    canvas.className = 'paint-layer';
    canvas.dataset.layerId = options.id ?? uid('layer');
    canvas.style.opacity = String(options.opacity ?? 1);
    canvas.style.mixBlendMode = options.blendMode ?? 'normal';
    this.artboard.insertBefore(canvas, this.overlay);
    const layer = {
      id: canvas.dataset.layerId,
      name,
      canvas,
      ctx: canvas.getContext('2d', { willReadFrequently: true }),
      visible: options.visible ?? true,
      opacity: options.opacity ?? 1,
      blendMode: options.blendMode ?? 'normal',
    };
    this.layers.push(layer);
    this.setActiveLayer(layer.id);
    this.markChanged('Layer created');
    return layer;
  }

  async duplicateActiveLayer() {
    const source = this.activeLayer;
    if (!source) return;
    const copy = this.createLayer(`${source.name} copy`, {
      opacity: source.opacity, blendMode: source.blendMode, visible: source.visible,
    });
    copy.ctx.drawImage(source.canvas, 0, 0);
    this.markChanged('Layer duplicated');
  }

  deleteActiveLayer() {
    if (this.layers.length <= 1) {
      this.clearActiveLayer();
      this.onStatus('The last layer was cleared instead of deleted');
      return;
    }
    const index = this.layers.findIndex((layer) => layer.id === this.activeLayerId);
    const [layer] = this.layers.splice(index, 1);
    layer.canvas.remove();
    this.setActiveLayer(this.layers[Math.max(0, index - 1)].id);
    this.markChanged('Layer deleted');
  }

  moveActiveLayer(direction) {
    const index = this.layers.findIndex((layer) => layer.id === this.activeLayerId);
    const nextIndex = clamp(index + direction, 0, this.layers.length - 1);
    if (index === nextIndex) return;
    const [layer] = this.layers.splice(index, 1);
    this.layers.splice(nextIndex, 0, layer);
    this.syncLayerDomOrder();
    this.markChanged('Layer order changed');
  }

  syncLayerDomOrder() {
    this.layers.forEach((layer) => this.artboard.insertBefore(layer.canvas, this.overlay));
  }

  setActiveLayer(id) {
    if (!this.layers.some((layer) => layer.id === id)) return;
    this.activeLayerId = id;
    this.layers.forEach((layer) => layer.canvas.classList.toggle('active-layer', layer.id === id));
    this.onChange({ reason: 'active-layer', engine: this });
  }

  renameLayer(id, name) {
    const layer = this.layers.find((candidate) => candidate.id === id);
    if (!layer) return;
    layer.name = name.trim() || layer.name;
    this.markChanged('Layer renamed');
  }

  setLayerVisibility(id, visible) {
    const layer = this.layers.find((candidate) => candidate.id === id);
    if (!layer) return;
    layer.visible = visible;
    layer.canvas.hidden = !visible;
    this.markChanged('Layer visibility changed');
  }

  setLayerOpacity(id, opacity) {
    const layer = this.layers.find((candidate) => candidate.id === id);
    if (!layer) return;
    layer.opacity = clamp(Number(opacity), 0, 1);
    layer.canvas.style.opacity = String(layer.opacity);
    this.markChanged('Layer opacity changed');
  }

  setLayerBlendMode(id, blendMode) {
    const layer = this.layers.find((candidate) => candidate.id === id);
    if (!layer) return;
    layer.blendMode = blendMode;
    layer.canvas.style.mixBlendMode = blendMode;
    this.markChanged('Layer blend mode changed');
  }

  clearActiveLayer() {
    const layer = this.activeLayer;
    if (!layer) return;
    this.captureHistory();
    layer.ctx.clearRect(0, 0, this.width, this.height);
    this.markChanged('Layer cleared');
  }

  resizeCanvases(width, height, preserve = true) {
    width = clamp(Math.round(width), 64, 8192);
    height = clamp(Math.round(height), 64, 8192);
    const existing = preserve ? this.layers.map((layer) => ({ layer, copy: this.copyCanvas(layer.canvas) })) : [];
    this.width = width;
    this.height = height;
    this.artboard.style.aspectRatio = `${width} / ${height}`;
    this.artboard.dataset.size = `${width} × ${height}`;
    this.overlay.width = width;
    this.overlay.height = height;
    this.layers.forEach((layer) => { layer.canvas.width = width; layer.canvas.height = height; });
    existing.forEach(({ layer, copy }) => layer.ctx.drawImage(copy, 0, 0));
    this.redrawOverlay();
    if (preserve) this.markChanged(`Canvas resized to ${width} × ${height}`);
  }

  copyCanvas(source) {
    const canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext('2d').drawImage(source, 0, 0);
    return canvas;
  }

  eventPoint(event) {
    const rect = this.overlay.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) * (this.width / rect.width), 0, this.width),
      y: clamp((event.clientY - rect.top) * (this.height / rect.height), 0, this.height),
      pressure: this.settings.pressure && event.pointerType === 'pen'
        ? clamp(event.pressure || 0.35, 0.08, 1) : 1,
    };
  }

  pointerDown(event) {
    if (event.button === 1 || this.tool === 'pan' || this.spacePan) {
      this.pointer = { mode: 'pan', id: event.pointerId };
      this.overlay.setPointerCapture(event.pointerId);
      this.onPan.start?.(event);
      return;
    }
    const point = this.eventPoint(event);
    if (this.tool === 'eyedropper' || event.button === 2 || event.altKey) {
      this.pickColor(point);
      return;
    }
    if (!DRAW_TOOLS.has(this.tool) && !SHAPE_TOOLS.has(this.tool)) return;
    this.captureHistory();
    this.overlay.setPointerCapture(event.pointerId);
    this.pointer = { mode: this.tool, id: event.pointerId, start: point, last: point, smoothed: point, moved: false };
    if (DRAW_TOOLS.has(this.tool)) this.drawDot(point);
    else this.redrawOverlay(point, point);
  }

  pointerMove(event) {
    if (!this.pointer || this.pointer.id !== event.pointerId) return;
    if (this.pointer.mode === 'pan') { this.onPan.move?.(event); return; }
    const raw = this.eventPoint(event);
    const smoothing = clamp(Number(this.settings.smoothing), 0, 100) / 100;
    const follow = 1 - smoothing * 0.88;
    const point = {
      x: this.pointer.smoothed.x + (raw.x - this.pointer.smoothed.x) * follow,
      y: this.pointer.smoothed.y + (raw.y - this.pointer.smoothed.y) * follow,
      pressure: raw.pressure,
    };
    this.pointer.smoothed = point;
    this.pointer.moved = true;
    if (DRAW_TOOLS.has(this.pointer.mode)) {
      this.drawSegment(this.pointer.last, point);
      this.pointer.last = point;
    } else this.redrawOverlay(this.pointer.start, point);
  }

  pointerUp(event) {
    if (!this.pointer || this.pointer.id !== event.pointerId) return;
    if (this.pointer.mode === 'pan') {
      this.onPan.end?.(event);
      this.pointer = null;
      return;
    }
    if (SHAPE_TOOLS.has(this.pointer.mode)) {
      const end = this.eventPoint(event);
      this.commitShape(this.pointer.mode, this.pointer.start, end);
    }
    this.pointer = null;
    this.redrawOverlay();
    this.markChanged('Stroke committed');
  }

  drawDot(point) {
    this.drawSegment(point, { ...point, x: point.x + 0.01, y: point.y + 0.01 });
  }

  drawSegment(from, to) {
    for (const transform of this.symmetryTransforms()) this.drawSingleSegment(transform(from), transform(to));
  }

  symmetryTransforms() {
    const { symmetry } = this.settings;
    const identity = (point) => ({ ...point });
    const mirrorX = (point) => ({ ...point, x: this.width - point.x });
    const mirrorY = (point) => ({ ...point, y: this.height - point.y });
    if (symmetry === 'vertical') return [identity, mirrorX];
    if (symmetry === 'horizontal') return [identity, mirrorY];
    if (symmetry === 'quad') return [identity, mirrorX, mirrorY, (point) => mirrorY(mirrorX(point))];
    if (symmetry.startsWith('radial-')) {
      const count = Number(symmetry.split('-')[1]) || 6;
      const cx = this.width / 2;
      const cy = this.height / 2;
      return Array.from({ length: count }, (_, index) => {
        const angle = (Math.PI * 2 * index) / count;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return (point) => {
          const x = point.x - cx;
          const y = point.y - cy;
          return { ...point, x: cx + x * cos - y * sin, y: cy + x * sin + y * cos };
        };
      });
    }
    return [identity];
  }

  drawSingleSegment(from, to) {
    const layer = this.activeLayer;
    if (!layer) return;
    const ctx = layer.ctx;
    const averagePressure = (from.pressure + to.pressure) / 2;
    const width = Math.max(0.5, Number(this.settings.size) * averagePressure);
    const alpha = clamp(Number(this.settings.opacity), 0.01, 1);
    const { r, g, b } = hexToRgba(this.settings.color);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = this.tool === 'eraser' ? 'destination-out' : 'source-over';
    if (this.tool === 'airbrush') {
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const steps = Math.max(1, Math.ceil(distance / Math.max(2, width * 0.22)));
      for (let index = 0; index <= steps; index += 1) {
        const t = index / steps;
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, width * 1.8);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha * 0.13})`);
        gradient.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, ${alpha * 0.07})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, width * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    let effectiveAlpha = alpha;
    if (this.tool === 'pencil') effectiveAlpha *= 0.7;
    if (this.tool === 'marker') effectiveAlpha *= 0.28;
    ctx.globalAlpha = effectiveAlpha;
    ctx.strokeStyle = this.tool === 'eraser' ? '#000000' : this.settings.color;
    ctx.lineWidth = this.tool === 'marker' ? width * 1.5 : width;
    if (this.tool === 'pencil') {
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${effectiveAlpha * 0.35})`;
      ctx.shadowBlur = Math.max(0.5, width * 0.12);
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  commitShape(tool, start, end) {
    const layer = this.activeLayer;
    if (!layer) return;
    for (const transform of this.symmetryTransforms()) this.drawShape(layer.ctx, tool, transform(start), transform(end), false);
  }

  drawShape(ctx, tool, start, end, preview = false) {
    ctx.save();
    ctx.globalAlpha = preview ? 0.78 : clamp(Number(this.settings.opacity), 0.01, 1);
    ctx.strokeStyle = this.settings.color;
    ctx.lineWidth = Math.max(1, Number(this.settings.size));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(preview ? [12, 8] : []);
    ctx.beginPath();
    if (tool === 'line') { ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); }
    else if (tool === 'rectangle') ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
    else if (tool === 'ellipse') {
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      ctx.ellipse(cx, cy, Math.abs(end.x - start.x) / 2, Math.abs(end.y - start.y) / 2, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.restore();
  }

  redrawOverlay(shapeStart = null, shapeEnd = null) {
    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    if (this.settings.grid) this.drawGrid(ctx);
    this.drawSymmetryGuides(ctx);
    if (shapeStart && shapeEnd && SHAPE_TOOLS.has(this.tool)) {
      for (const transform of this.symmetryTransforms()) this.drawShape(ctx, this.tool, transform(shapeStart), transform(shapeEnd), true);
    }
  }

  drawGrid(ctx) {
    const size = clamp(Number(this.settings.gridSize), 10, 600);
    ctx.save();
    ctx.strokeStyle = 'rgba(61, 52, 68, 0.12)';
    ctx.lineWidth = 1;
    for (let x = size; x < this.width; x += size) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke(); }
    for (let y = size; y < this.height; y += size) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke(); }
    ctx.restore();
  }

  drawSymmetryGuides(ctx) {
    const symmetry = this.settings.symmetry;
    if (symmetry === 'none') return;
    ctx.save();
    ctx.strokeStyle = 'rgba(127, 90, 240, 0.44)';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 12]);
    const cx = this.width / 2;
    const cy = this.height / 2;
    if (symmetry === 'vertical' || symmetry === 'quad') { ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, this.height); ctx.stroke(); }
    if (symmetry === 'horizontal' || symmetry === 'quad') { ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(this.width, cy); ctx.stroke(); }
    if (symmetry.startsWith('radial-')) {
      const count = Number(symmetry.split('-')[1]) || 6;
      const length = Math.hypot(this.width, this.height);
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length); ctx.stroke();
      }
    }
    ctx.restore();
  }

  pickColor(point) {
    const composite = this.compositeCanvas(false);
    const pixel = composite.getContext('2d').getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data;
    if (pixel[3] === 0) return;
    const color = rgbaToHex(pixel[0], pixel[1], pixel[2]);
    this.settings.color = color;
    this.onChange({ reason: 'color-picked', color, engine: this });
    this.onStatus(`Color picked: ${color}`);
  }

  captureHistory() {
    const layer = this.activeLayer;
    if (!layer) return;
    this.undoStack.push({ layerId: layer.id, dataUrl: layer.canvas.toDataURL('image/png') });
    if (this.undoStack.length > this.maxHistory) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  async restoreSnapshot(snapshot) {
    const layer = this.layers.find((candidate) => candidate.id === snapshot.layerId);
    if (!layer) return;
    const image = await loadImage(snapshot.dataUrl);
    layer.ctx.clearRect(0, 0, this.width, this.height);
    layer.ctx.drawImage(image, 0, 0);
  }

  async undo() {
    const snapshot = this.undoStack.pop();
    if (!snapshot) return this.onStatus('Nothing to undo');
    const layer = this.layers.find((candidate) => candidate.id === snapshot.layerId);
    if (!layer) return;
    this.redoStack.push({ layerId: layer.id, dataUrl: layer.canvas.toDataURL('image/png') });
    await this.restoreSnapshot(snapshot);
    this.markChanged('Undo');
  }

  async redo() {
    const snapshot = this.redoStack.pop();
    if (!snapshot) return this.onStatus('Nothing to redo');
    const layer = this.layers.find((candidate) => candidate.id === snapshot.layerId);
    if (!layer) return;
    this.undoStack.push({ layerId: layer.id, dataUrl: layer.canvas.toDataURL('image/png') });
    await this.restoreSnapshot(snapshot);
    this.markChanged('Redo');
  }

  compositeCanvas(includeBackground = true, background = '#ffffff') {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');
    if (includeBackground) { ctx.fillStyle = background; ctx.fillRect(0, 0, this.width, this.height); }
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = this.mapBlendMode(layer.blendMode);
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }
    return canvas;
  }

  mapBlendMode(mode) {
    if (mode === 'normal') return 'source-over';
    const supported = new Set(['multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference']);
    return supported.has(mode) ? mode : 'source-over';
  }

  async exportImage(type = 'image/png', quality = 0.92, transparent = false) {
    return canvasToBlob(this.compositeCanvas(!transparent), type, quality);
  }

  async importImage(file) {
    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      const layer = this.createLayer(file.name.replace(/\.[^.]+$/, '') || 'Imported image');
      const scale = Math.min(this.width / image.width, this.height / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;
      layer.ctx.drawImage(image, (this.width - width) / 2, (this.height - height) / 2, width, height);
      this.markChanged('Image imported');
    } finally { URL.revokeObjectURL(url); }
  }

  serialize() {
    return {
      format: 'domistika-project', version: 1, savedAt: new Date().toISOString(),
      width: this.width, height: this.height, activeLayerId: this.activeLayerId,
      settings: this.settings,
      layers: this.layers.map((layer) => ({
        id: layer.id, name: layer.name, visible: layer.visible, opacity: layer.opacity,
        blendMode: layer.blendMode, image: layer.canvas.toDataURL('image/png'),
      })),
    };
  }

  async restore(project) {
    if (!project || project.format !== 'domistika-project' || !Array.isArray(project.layers)) throw new Error('Not a valid Domistika project');
    this.layers.forEach((layer) => layer.canvas.remove());
    this.layers = [];
    this.resizeCanvases(project.width, project.height, false);
    this.settings = { ...this.settings, ...(project.settings ?? {}) };
    for (const saved of project.layers) {
      const layer = this.createLayer(saved.name, saved);
      if (saved.image) { const image = await loadImage(saved.image); layer.ctx.drawImage(image, 0, 0); }
      layer.visible = saved.visible !== false;
      layer.canvas.hidden = !layer.visible;
    }
    this.setActiveLayer(project.activeLayerId ?? this.layers.at(-1)?.id);
    this.undoStack = [];
    this.redoStack = [];
    this.redrawOverlay();
    this.onChange({ reason: 'project-restored', engine: this });
  }

  markChanged(message) {
    this.onChange({ reason: 'content', engine: this });
    this.onStatus(message);
  }
}
