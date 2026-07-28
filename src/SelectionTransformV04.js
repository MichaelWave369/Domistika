import { CanvasEngine } from './core/CanvasEngine.js';
import { clamp, loadImage } from './core/utils.js';

let latestEngine = null;
let selectionCanvas = null;
let selectionCtx = null;
let selectionEnabled = false;
let selectionMode = 'rectangle';
let drawingSelection = null;
let interaction = null;
let selection = null;
let clipboardCanvas = null;
let ui = null;

const originalBindEvents = CanvasEngine.prototype.bindEvents;
CanvasEngine.prototype.bindEvents = function bindEventsV04() {
  latestEngine = this;
  const result = originalBindEvents.call(this);
  document.dispatchEvent(new CustomEvent('domistika:v04-engine', { detail: { engine: this } }));
  return result;
};

const originalResizeCanvases = CanvasEngine.prototype.resizeCanvases;
CanvasEngine.prototype.resizeCanvases = function resizeCanvasesV04(...args) {
  latestEngine = this;
  const result = originalResizeCanvases.apply(this, args);
  requestAnimationFrame(syncSelectionCanvas);
  return result;
};

const originalRestore = CanvasEngine.prototype.restore;
CanvasEngine.prototype.restore = async function restoreV04(project) {
  latestEngine = this;
  await originalRestore.call(this, project);
  selection = null;
  drawingSelection = null;
  interaction = null;
  syncSelectionCanvas();
  redrawSelectionOverlay();
};

function setStatus(message) {
  const node = document.querySelector('#statusMessage');
  if (node) node.textContent = message;
}

function layerForSelection() {
  if (!latestEngine || !selection) return null;
  return latestEngine.layers.find((layer) => layer.id === selection.layerId) || null;
}

function activeLayer() {
  return latestEngine?.activeLayer || null;
}

function ensureSelectionCanvas() {
  const artboard = document.querySelector('#artboard');
  if (!artboard || !latestEngine) return false;
  if (!selectionCanvas) {
    selectionCanvas = document.createElement('canvas');
    selectionCanvas.id = 'v04SelectionCanvas';
    selectionCanvas.className = 'v04-selection-canvas';
    selectionCanvas.setAttribute('aria-label', 'Selection and transform overlay');
    artboard.appendChild(selectionCanvas);
    selectionCtx = selectionCanvas.getContext('2d', { willReadFrequently: true });
    bindSelectionEvents();
  }
  syncSelectionCanvas();
  return true;
}

function syncSelectionCanvas() {
  if (!selectionCanvas || !latestEngine) return;
  if (selectionCanvas.width !== latestEngine.width) selectionCanvas.width = latestEngine.width;
  if (selectionCanvas.height !== latestEngine.height) selectionCanvas.height = latestEngine.height;
  selectionCanvas.style.width = `${latestEngine.width}px`;
  selectionCanvas.style.height = `${latestEngine.height}px`;
  redrawSelectionOverlay();
}

function canvasPoint(event) {
  const rect = selectionCanvas.getBoundingClientRect();
  return {
    x: clamp((event.clientX - rect.left) * (selectionCanvas.width / rect.width), 0, selectionCanvas.width),
    y: clamp((event.clientY - rect.top) * (selectionCanvas.height / rect.height), 0, selectionCanvas.height),
  };
}

function normalizedBounds(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function pointBounds(points) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
  };
}

function transformedPoint(localX, localY, item = selection) {
  const cos = Math.cos(item.rotation);
  const sin = Math.sin(item.rotation);
  const scaledX = localX * item.scaleX;
  const scaledY = localY * item.scaleY;
  return {
    x: item.x + scaledX * cos - scaledY * sin,
    y: item.y + scaledX * sin + scaledY * cos,
  };
}

function localPoint(point, item = selection) {
  const dx = point.x - item.x;
  const dy = point.y - item.y;
  const cos = Math.cos(item.rotation);
  const sin = Math.sin(item.rotation);
  return {
    x: (dx * cos + dy * sin) / item.scaleX,
    y: (-dx * sin + dy * cos) / item.scaleY,
  };
}

function selectionCorners(item = selection) {
  const halfWidth = item.source.width / 2;
  const halfHeight = item.source.height / 2;
  return [
    transformedPoint(-halfWidth, -halfHeight, item),
    transformedPoint(halfWidth, -halfHeight, item),
    transformedPoint(halfWidth, halfHeight, item),
    transformedPoint(-halfWidth, halfHeight, item),
  ];
}

function rotationHandle(item = selection) {
  return transformedPoint(0, -item.source.height / 2 - 46 / Math.max(0.18, Math.abs(item.scaleY)), item);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function hitSelection(point) {
  if (!selection) return null;
  const rotate = rotationHandle();
  if (distance(point, rotate) < 22) return { type: 'rotate' };
  const corners = selectionCorners();
  const cornerIndex = corners.findIndex((corner) => distance(point, corner) < 22);
  if (cornerIndex >= 0) return { type: 'scale', cornerIndex };
  const local = localPoint(point);
  if (Math.abs(local.x) <= selection.source.width / 2 && Math.abs(local.y) <= selection.source.height / 2) return { type: 'move' };
  return null;
}

function beginPath(ctx, points, offsetX = 0, offsetY = 0) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x - offsetX, points[0].y - offsetY);
  for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index].x - offsetX, points[index].y - offsetY);
  ctx.closePath();
}

async function restoreLayer(layer, dataUrl) {
  const image = await loadImage(dataUrl);
  layer.ctx.clearRect(0, 0, latestEngine.width, latestEngine.height);
  layer.ctx.drawImage(image, 0, 0);
}

function pushHistory(layer, dataUrl) {
  latestEngine.undoStack.push({ layerId: layer.id, dataUrl });
  if (latestEngine.undoStack.length > latestEngine.maxHistory) latestEngine.undoStack.shift();
  latestEngine.redoStack.length = 0;
}

async function extractSelection(bounds, pathPoints = null) {
  const layer = activeLayer();
  if (!layer || bounds.width < 2 || bounds.height < 2) return;
  if (selection) await commitSelection(true);

  const x = Math.floor(clamp(bounds.x, 0, latestEngine.width - 1));
  const y = Math.floor(clamp(bounds.y, 0, latestEngine.height - 1));
  const width = Math.max(1, Math.ceil(Math.min(bounds.width, latestEngine.width - x)));
  const height = Math.max(1, Math.ceil(Math.min(bounds.height, latestEngine.height - y)));
  const source = document.createElement('canvas');
  source.width = width;
  source.height = height;
  const sourceCtx = source.getContext('2d');
  const originalDataUrl = layer.canvas.toDataURL('image/png');

  if (pathPoints?.length >= 3) {
    sourceCtx.save();
    beginPath(sourceCtx, pathPoints, x, y);
    sourceCtx.clip();
    sourceCtx.drawImage(layer.canvas, -x, -y);
    sourceCtx.restore();

    layer.ctx.save();
    layer.ctx.globalCompositeOperation = 'destination-out';
    beginPath(layer.ctx, pathPoints);
    layer.ctx.fillStyle = '#000';
    layer.ctx.fill();
    layer.ctx.restore();
  } else {
    sourceCtx.drawImage(layer.canvas, x, y, width, height, 0, 0, width, height);
    layer.ctx.clearRect(x, y, width, height);
  }

  selection = {
    layerId: layer.id,
    source,
    x: x + width / 2,
    y: y + height / 2,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    originalDataUrl,
    createdFromLayer: true,
    duplicateCount: 0,
  };
  updateTransformUi();
  redrawSelectionOverlay();
  latestEngine.onChange?.({ reason: 'selection-preview', engine: latestEngine });
  setStatus(`${pathPoints ? 'Lasso' : 'Rectangle'} selection lifted from ${layer.name}`);
}

function drawSelectionToLayer(item = selection, layer = layerForSelection()) {
  if (!item || !layer) return;
  layer.ctx.save();
  layer.ctx.translate(item.x, item.y);
  layer.ctx.rotate(item.rotation);
  layer.ctx.scale(item.scaleX, item.scaleY);
  layer.ctx.drawImage(item.source, -item.source.width / 2, -item.source.height / 2);
  layer.ctx.restore();
}

async function commitSelection(draw = true) {
  if (!selection) return;
  const item = selection;
  const layer = layerForSelection();
  if (!layer) {
    selection = null;
    redrawSelectionOverlay();
    return;
  }
  pushHistory(layer, item.originalDataUrl);
  if (draw) drawSelectionToLayer(item, layer);
  selection = null;
  drawingSelection = null;
  interaction = null;
  redrawSelectionOverlay();
  latestEngine.markChanged(draw ? 'Selection transformed' : 'Selected pixels removed');
  updateTransformUi();
}

async function cancelSelection() {
  if (!selection) return;
  const item = selection;
  const layer = layerForSelection();
  selection = null;
  drawingSelection = null;
  interaction = null;
  if (layer && item.originalDataUrl) await restoreLayer(layer, item.originalDataUrl);
  redrawSelectionOverlay();
  latestEngine?.onChange?.({ reason: 'selection-cancelled', engine: latestEngine });
  updateTransformUi();
  setStatus('Selection cancelled and original pixels restored');
}

function flattenedSelection(item = selection) {
  if (!item) return null;
  const corners = selectionCorners(item);
  const minX = Math.min(...corners.map((point) => point.x));
  const minY = Math.min(...corners.map((point) => point.y));
  const maxX = Math.max(...corners.map((point) => point.x));
  const maxY = Math.max(...corners.map((point) => point.y));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(maxX - minX));
  canvas.height = Math.max(1, Math.ceil(maxY - minY));
  const ctx = canvas.getContext('2d');
  ctx.translate(item.x - minX, item.y - minY);
  ctx.rotate(item.rotation);
  ctx.scale(item.scaleX, item.scaleY);
  ctx.drawImage(item.source, -item.source.width / 2, -item.source.height / 2);
  return canvas;
}

function copySelection() {
  if (!selection) return setStatus('Make a selection first');
  clipboardCanvas = flattenedSelection();
  setStatus('Selection copied to Domistika clipboard');
  updateButtons();
}

async function cutSelection() {
  if (!selection) return setStatus('Make a selection first');
  copySelection();
  await commitSelection(false);
  setStatus('Selection cut to Domistika clipboard');
}

async function pasteSelection() {
  if (!clipboardCanvas || !latestEngine) return setStatus('The Domistika clipboard is empty');
  if (selection) await commitSelection(true);
  const layer = activeLayer();
  if (!layer) return;
  const source = document.createElement('canvas');
  source.width = clipboardCanvas.width;
  source.height = clipboardCanvas.height;
  source.getContext('2d').drawImage(clipboardCanvas, 0, 0);
  selection = {
    layerId: layer.id,
    source,
    x: latestEngine.width / 2,
    y: latestEngine.height / 2,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    originalDataUrl: layer.canvas.toDataURL('image/png'),
    createdFromLayer: false,
    duplicateCount: 0,
  };
  enableSelection();
  updateTransformUi();
  redrawSelectionOverlay();
  setStatus('Clipboard pasted as a movable selection');
}

function duplicateSelection() {
  if (!selection) return setStatus('Make a selection first');
  const layer = layerForSelection();
  if (!layer) return;
  drawSelectionToLayer(selection, layer);
  selection.x += 28;
  selection.y += 28;
  selection.duplicateCount += 1;
  redrawSelectionOverlay();
  setStatus(`Selection duplicated${selection.duplicateCount > 1 ? ` ×${selection.duplicateCount}` : ''}`);
}

function setScale(next) {
  if (!selection) return;
  const value = clamp(Number(next) / 100, 0.1, 5);
  selection.scaleX = Math.sign(selection.scaleX || 1) * value;
  selection.scaleY = Math.sign(selection.scaleY || 1) * value;
  updateTransformUi();
  redrawSelectionOverlay();
}

function setRotationDegrees(next) {
  if (!selection) return;
  selection.rotation = Number(next) * Math.PI / 180;
  updateTransformUi();
  redrawSelectionOverlay();
}

function nudge(dx, dy) {
  if (!selection) return;
  selection.x += dx;
  selection.y += dy;
  redrawSelectionOverlay();
}

function rotateBy(degrees) {
  if (!selection) return;
  selection.rotation += degrees * Math.PI / 180;
  updateTransformUi();
  redrawSelectionOverlay();
}

function flip(axis) {
  if (!selection) return;
  if (axis === 'x') selection.scaleX *= -1;
  else selection.scaleY *= -1;
  updateTransformUi();
  redrawSelectionOverlay();
}

function enableSelection() {
  if (!ensureSelectionCanvas()) return;
  selectionEnabled = true;
  selectionCanvas.style.pointerEvents = 'auto';
  selectionCanvas.classList.add('active');
  const drawingOverlay = document.querySelector('#overlay');
  if (drawingOverlay) drawingOverlay.style.pointerEvents = 'none';
  document.querySelectorAll('[data-v04-select]').forEach((button) => button.classList.add('active'));
  activateTransformPanel();
  setStatus(selection ? 'Transform the selection, then Commit or Cancel' : `Draw a ${selectionMode} selection`);
}

function disableSelection() {
  selectionEnabled = false;
  if (selectionCanvas) {
    selectionCanvas.style.pointerEvents = 'none';
    selectionCanvas.classList.remove('active');
  }
  const drawingOverlay = document.querySelector('#overlay');
  if (drawingOverlay) drawingOverlay.style.pointerEvents = '';
  document.querySelectorAll('[data-v04-select]').forEach((button) => button.classList.remove('active'));
}

function activateTransformPanel() {
  if (!ui?.panel || !ui?.tab) return;
  document.querySelectorAll('.inspector-tabs button').forEach((button) => button.classList.toggle('active', button === ui.tab));
  document.querySelectorAll('.inspector-panel').forEach((panel) => panel.classList.toggle('active', panel === ui.panel));
  const studio = document.querySelector('#studio');
  if (window.matchMedia('(max-width:1000px)').matches) studio?.classList.add('brush-drawer-open');
}

function updateButtons() {
  if (!ui) return;
  ui.panel.querySelectorAll('[data-needs-selection]').forEach((button) => { button.disabled = !selection; });
  const paste = ui.panel.querySelector('#v04Paste');
  if (paste) paste.disabled = !clipboardCanvas;
  const info = ui.panel.querySelector('#v04SelectionInfo');
  if (info) {
    info.textContent = selection
      ? `${Math.round(selection.source.width * Math.abs(selection.scaleX))} × ${Math.round(selection.source.height * Math.abs(selection.scaleY))} px · ${Math.round(selection.rotation * 180 / Math.PI)}°`
      : 'No active selection';
  }
}

function updateTransformUi() {
  if (!ui) return;
  const scale = ui.panel.querySelector('#v04Scale');
  const rotation = ui.panel.querySelector('#v04Rotation');
  if (selection) {
    scale.value = String(Math.round(Math.abs(selection.scaleX) * 100));
    ui.panel.querySelector('#v04ScaleOut').textContent = `${scale.value}%`;
    let degrees = Math.round(selection.rotation * 180 / Math.PI);
    while (degrees > 180) degrees -= 360;
    while (degrees < -180) degrees += 360;
    rotation.value = String(degrees);
    ui.panel.querySelector('#v04RotationOut').textContent = `${degrees}°`;
  } else {
    scale.value = '100';
    rotation.value = '0';
    ui.panel.querySelector('#v04ScaleOut').textContent = '100%';
    ui.panel.querySelector('#v04RotationOut').textContent = '0°';
  }
  updateButtons();
}

function redrawSelectionOverlay() {
  if (!selectionCtx || !selectionCanvas) return;
  selectionCtx.clearRect(0, 0, selectionCanvas.width, selectionCanvas.height);

  if (drawingSelection) {
    selectionCtx.save();
    selectionCtx.strokeStyle = 'rgba(255,191,105,.95)';
    selectionCtx.fillStyle = 'rgba(255,191,105,.08)';
    selectionCtx.lineWidth = 2;
    selectionCtx.setLineDash([12, 8]);
    if (drawingSelection.mode === 'rectangle') {
      const bounds = normalizedBounds(drawingSelection.start, drawingSelection.current);
      selectionCtx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      selectionCtx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    } else if (drawingSelection.points.length > 1) {
      beginPath(selectionCtx, drawingSelection.points);
      selectionCtx.fill();
      selectionCtx.stroke();
    }
    selectionCtx.restore();
  }

  if (!selection) return;
  selectionCtx.save();
  selectionCtx.translate(selection.x, selection.y);
  selectionCtx.rotate(selection.rotation);
  selectionCtx.scale(selection.scaleX, selection.scaleY);
  selectionCtx.drawImage(selection.source, -selection.source.width / 2, -selection.source.height / 2);
  selectionCtx.restore();

  const corners = selectionCorners();
  const rotate = rotationHandle();
  selectionCtx.save();
  selectionCtx.strokeStyle = '#ffbf69';
  selectionCtx.fillStyle = '#18141d';
  selectionCtx.lineWidth = 2;
  selectionCtx.setLineDash([10, 7]);
  selectionCtx.beginPath();
  selectionCtx.moveTo(corners[0].x, corners[0].y);
  corners.slice(1).forEach((point) => selectionCtx.lineTo(point.x, point.y));
  selectionCtx.closePath();
  selectionCtx.stroke();
  const topCenter = { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 };
  selectionCtx.beginPath();
  selectionCtx.moveTo(topCenter.x, topCenter.y);
  selectionCtx.lineTo(rotate.x, rotate.y);
  selectionCtx.stroke();
  selectionCtx.setLineDash([]);
  for (const corner of corners) {
    selectionCtx.fillRect(corner.x - 7, corner.y - 7, 14, 14);
    selectionCtx.strokeRect(corner.x - 7, corner.y - 7, 14, 14);
  }
  selectionCtx.beginPath();
  selectionCtx.arc(rotate.x, rotate.y, 9, 0, Math.PI * 2);
  selectionCtx.fill();
  selectionCtx.stroke();
  selectionCtx.restore();
}

function bindSelectionEvents() {
  selectionCanvas.addEventListener('pointerdown', (event) => {
    if (!selectionEnabled) return;
    const point = canvasPoint(event);
    selectionCanvas.setPointerCapture(event.pointerId);
    if (selection) {
      const hit = hitSelection(point);
      if (!hit) return;
      if (hit.type === 'move') {
        interaction = { type: 'move', pointerId: event.pointerId, start: point, x: selection.x, y: selection.y };
      } else if (hit.type === 'scale') {
        interaction = {
          type: 'scale',
          pointerId: event.pointerId,
          startDistance: Math.max(1, distance(point, selection)),
          scaleX: selection.scaleX,
          scaleY: selection.scaleY,
        };
      } else if (hit.type === 'rotate') {
        interaction = {
          type: 'rotate',
          pointerId: event.pointerId,
          startAngle: Math.atan2(point.y - selection.y, point.x - selection.x),
          rotation: selection.rotation,
        };
      }
      return;
    }
    drawingSelection = selectionMode === 'lasso'
      ? { mode: 'lasso', pointerId: event.pointerId, points: [point] }
      : { mode: 'rectangle', pointerId: event.pointerId, start: point, current: point };
    redrawSelectionOverlay();
  });

  selectionCanvas.addEventListener('pointermove', (event) => {
    const point = canvasPoint(event);
    if (interaction?.pointerId === event.pointerId && selection) {
      if (interaction.type === 'move') {
        selection.x = interaction.x + point.x - interaction.start.x;
        selection.y = interaction.y + point.y - interaction.start.y;
      } else if (interaction.type === 'scale') {
        const factor = clamp(distance(point, selection) / interaction.startDistance, 0.05, 20);
        selection.scaleX = Math.sign(interaction.scaleX || 1) * Math.max(0.05, Math.abs(interaction.scaleX) * factor);
        selection.scaleY = Math.sign(interaction.scaleY || 1) * Math.max(0.05, Math.abs(interaction.scaleY) * factor);
        updateTransformUi();
      } else if (interaction.type === 'rotate') {
        const angle = Math.atan2(point.y - selection.y, point.x - selection.x);
        selection.rotation = interaction.rotation + angle - interaction.startAngle;
        updateTransformUi();
      }
      redrawSelectionOverlay();
      return;
    }
    if (!drawingSelection || drawingSelection.pointerId !== event.pointerId) return;
    if (drawingSelection.mode === 'rectangle') drawingSelection.current = point;
    else if (distance(point, drawingSelection.points.at(-1)) > 3) drawingSelection.points.push(point);
    redrawSelectionOverlay();
  });

  async function finish(event) {
    if (interaction?.pointerId === event.pointerId) {
      interaction = null;
      updateTransformUi();
      return;
    }
    if (!drawingSelection || drawingSelection.pointerId !== event.pointerId) return;
    const pending = drawingSelection;
    drawingSelection = null;
    if (pending.mode === 'rectangle') await extractSelection(normalizedBounds(pending.start, pending.current));
    else if (pending.points.length >= 3) await extractSelection(pointBounds(pending.points), pending.points);
    redrawSelectionOverlay();
  }
  selectionCanvas.addEventListener('pointerup', finish);
  selectionCanvas.addEventListener('pointercancel', finish);
  selectionCanvas.addEventListener('contextmenu', (event) => event.preventDefault());
}

function createStyles() {
  if (document.querySelector('#domistikaV04Styles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV04Styles';
  style.textContent = `
    .inspector-tabs{grid-template-columns:repeat(5,1fr)!important}.v04-selection-canvas{position:absolute;inset:0;z-index:1002;width:100%;height:100%;pointer-events:none;touch-action:none;cursor:crosshair}.v04-selection-canvas.active{pointer-events:auto}.v04-launch{display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--ink);font-weight:700;cursor:pointer;white-space:nowrap}.v04-section{display:grid;gap:10px;padding:12px 0;border-bottom:1px solid var(--line)}.v04-section:last-child{border-bottom:0}.v04-section h3{margin:0;font-size:13px}.v04-section p{margin:2px 0 0;color:var(--muted);font-size:10px;line-height:1.45}.v04-row{display:flex;flex-wrap:wrap;gap:6px}.v04-button{padding:7px 9px;border:1px solid var(--line);border-radius:9px;background:var(--panel2);color:var(--ink);cursor:pointer;font-size:10px}.v04-button.active{border-color:rgba(255,191,105,.5);background:rgba(255,191,105,.14)}.v04-button:disabled{opacity:.4;cursor:not-allowed}.v04-primary{border-color:transparent;color:#171019;font-weight:800;background:linear-gradient(135deg,var(--warm),#ff9a71)}.v04-danger{border-color:rgba(255,96,120,.32);color:#ff9aab}.v04-transform-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.v04-transform-grid button{min-height:36px}.v04-slider{display:grid;grid-template-columns:auto auto;gap:5px 8px;color:var(--muted);font-size:10px}.v04-slider output{justify-self:end;color:var(--ink)}.v04-slider input{grid-column:1/-1;width:100%;accent-color:var(--warm)}.v04-info{padding:9px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.03);color:var(--muted);font-size:10px}.v04-badge{padding:5px 8px;border:1px solid rgba(255,191,105,.28);border-radius:999px;color:#ffd39a;background:rgba(255,191,105,.08);font-size:9px}.v04-tool span{font-size:18px}@media(max-width:1000px){.inspector-tabs{grid-template-columns:repeat(5,minmax(70px,1fr))!important;overflow-x:auto}}@media(max-width:680px){.v04-launch strong{display:none}.v04-launch{padding:7px 9px}}
  `;
  document.head.appendChild(style);
}

function initUi() {
  const studio = document.querySelector('#studio');
  const inspector = document.querySelector('.inspector');
  const tabs = document.querySelector('.inspector-tabs');
  const controlDeck = document.querySelector('.control-deck');
  const toolList = document.querySelector('.tool-list');
  if (!studio || !inspector || !tabs || !controlDeck || !toolList || !latestEngine) return false;
  if (document.querySelector('#selectionTransformPanel')) return true;
  createStyles();
  ensureSelectionCanvas();

  const tab = document.createElement('button');
  tab.dataset.panel = 'selectionTransformPanel';
  tab.textContent = 'Transform';
  tabs.appendChild(tab);

  const launch = document.createElement('button');
  launch.className = 'v04-launch';
  launch.type = 'button';
  launch.dataset.v04Select = 'true';
  launch.innerHTML = '<span>⬚</span><strong>Select</strong>';
  controlDeck.appendChild(launch);

  const toolButton = document.createElement('button');
  toolButton.className = 'tool-button v04-tool';
  toolButton.type = 'button';
  toolButton.dataset.v04Select = 'true';
  toolButton.title = 'Selection & Transform (S)';
  toolButton.innerHTML = '<span>⬚</span><small>Select</small>';
  toolList.insertBefore(toolButton, toolList.querySelector('[data-tool="line"]'));

  const panel = document.createElement('section');
  panel.id = 'selectionTransformPanel';
  panel.className = 'inspector-panel';
  panel.innerHTML = `
    <div class="panel-heading"><div><h2>Selection & Transform</h2><p>Lift, move, resize, rotate, and duplicate pixels</p></div><span class="v04-badge">v0.4</span></div>
    <div class="v04-section">
      <div><h3>Selection mode</h3><p>Draw around pixels on the active layer. Drag inside to move, corners to scale, and the round handle to rotate.</p></div>
      <div class="v04-row"><button class="v04-button active" data-v04-mode="rectangle">Rectangle</button><button class="v04-button" data-v04-mode="lasso">Lasso</button><button class="v04-button" id="v04SelectAll">Select all</button></div>
      <div class="v04-info" id="v04SelectionInfo">No active selection</div>
    </div>
    <div class="v04-section">
      <div><h3>Clipboard</h3><p>Domistika keeps an internal image clipboard for fast creative iteration.</p></div>
      <div class="v04-row"><button class="v04-button" id="v04Copy" data-needs-selection>Copy</button><button class="v04-button" id="v04Cut" data-needs-selection>Cut</button><button class="v04-button" id="v04Paste" disabled>Paste</button><button class="v04-button" id="v04Duplicate" data-needs-selection>Duplicate</button><button class="v04-button v04-danger" id="v04Delete" data-needs-selection>Delete</button></div>
    </div>
    <div class="v04-section">
      <div><h3>Transform</h3><p>Use precise controls or manipulate the selection directly on the canvas.</p></div>
      <label class="v04-slider">Scale <output id="v04ScaleOut">100%</output><input id="v04Scale" type="range" min="10" max="300" value="100"></label>
      <label class="v04-slider">Rotation <output id="v04RotationOut">0°</output><input id="v04Rotation" type="range" min="-180" max="180" value="0"></label>
      <div class="v04-row"><button class="v04-button" id="v04RotateLeft" data-needs-selection>−15°</button><button class="v04-button" id="v04RotateRight" data-needs-selection>+15°</button><button class="v04-button" id="v04Rotate90" data-needs-selection>90°</button><button class="v04-button" id="v04FlipH" data-needs-selection>Flip H</button><button class="v04-button" id="v04FlipV" data-needs-selection>Flip V</button></div>
      <div class="v04-transform-grid"><span></span><button class="v04-button" data-nudge="0,-10" data-needs-selection>↑</button><span></span><button class="v04-button" data-nudge="-10,0" data-needs-selection>←</button><button class="v04-button" data-nudge="0,10" data-needs-selection>↓</button><button class="v04-button" data-nudge="10,0" data-needs-selection>→</button></div>
    </div>
    <div class="v04-section">
      <div class="v04-row"><button class="v04-button v04-primary" id="v04Commit" data-needs-selection>Commit transform</button><button class="v04-button" id="v04Cancel" data-needs-selection>Cancel & restore</button></div>
      <p><strong>Shortcuts:</strong> S select · Ctrl/Cmd+C/X/V · Ctrl/Cmd+D duplicate · Enter commit · Esc cancel · arrows nudge.</p>
    </div>
  `;
  inspector.appendChild(panel);
  ui = { studio, inspector, tabs, controlDeck, toolList, tab, launch, toolButton, panel };

  tab.addEventListener('click', () => { activateTransformPanel(); enableSelection(); });
  launch.addEventListener('click', enableSelection);
  toolButton.addEventListener('click', enableSelection);
  panel.querySelectorAll('[data-v04-mode]').forEach((button) => button.addEventListener('click', () => {
    selectionMode = button.dataset.v04Mode;
    panel.querySelectorAll('[data-v04-mode]').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
    enableSelection();
    setStatus(`Draw a ${selectionMode} selection`);
  }));
  panel.querySelector('#v04SelectAll').addEventListener('click', () => {
    enableSelection();
    extractSelection({ x: 0, y: 0, width: latestEngine.width, height: latestEngine.height });
  });
  panel.querySelector('#v04Copy').addEventListener('click', copySelection);
  panel.querySelector('#v04Cut').addEventListener('click', cutSelection);
  panel.querySelector('#v04Paste').addEventListener('click', pasteSelection);
  panel.querySelector('#v04Duplicate').addEventListener('click', duplicateSelection);
  panel.querySelector('#v04Delete').addEventListener('click', () => commitSelection(false));
  panel.querySelector('#v04Commit').addEventListener('click', () => commitSelection(true));
  panel.querySelector('#v04Cancel').addEventListener('click', cancelSelection);
  panel.querySelector('#v04Scale').addEventListener('input', (event) => {
    panel.querySelector('#v04ScaleOut').textContent = `${event.target.value}%`;
    setScale(event.target.value);
  });
  panel.querySelector('#v04Rotation').addEventListener('input', (event) => {
    panel.querySelector('#v04RotationOut').textContent = `${event.target.value}°`;
    setRotationDegrees(event.target.value);
  });
  panel.querySelector('#v04RotateLeft').addEventListener('click', () => rotateBy(-15));
  panel.querySelector('#v04RotateRight').addEventListener('click', () => rotateBy(15));
  panel.querySelector('#v04Rotate90').addEventListener('click', () => rotateBy(90));
  panel.querySelector('#v04FlipH').addEventListener('click', () => flip('x'));
  panel.querySelector('#v04FlipV').addEventListener('click', () => flip('y'));
  panel.querySelectorAll('[data-nudge]').forEach((button) => button.addEventListener('click', () => {
    const [dx, dy] = button.dataset.nudge.split(',').map(Number);
    nudge(dx, dy);
  }));

  document.addEventListener('click', (event) => {
    const normalTool = event.target.closest('[data-tool]');
    if (!normalTool || !selectionEnabled) return;
    if (selection) commitSelection(true);
    disableSelection();
  }, true);

  window.addEventListener('keydown', (event) => {
    if (event.target.matches('input,select,textarea')) return;
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (!mod && key === 's') {
      event.preventDefault();
      enableSelection();
      return;
    }
    if (mod && key === 'c' && selection) { event.preventDefault(); copySelection(); return; }
    if (mod && key === 'x' && selection) { event.preventDefault(); cutSelection(); return; }
    if (mod && key === 'v') { event.preventDefault(); pasteSelection(); return; }
    if (mod && key === 'd' && selection) { event.preventDefault(); duplicateSelection(); return; }
    if (event.key === 'Enter' && selection) { event.preventDefault(); commitSelection(true); return; }
    if (event.key === 'Escape' && selection) { event.preventDefault(); cancelSelection(); return; }
    if (selection && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const amount = event.shiftKey ? 10 : 1;
      if (event.key === 'ArrowLeft') nudge(-amount, 0);
      if (event.key === 'ArrowRight') nudge(amount, 0);
      if (event.key === 'ArrowUp') nudge(0, -amount);
      if (event.key === 'ArrowDown') nudge(0, amount);
    }
  });

  updateTransformUi();
  return true;
}

function waitForUi(attempt = 0) {
  if (initUi()) return;
  if (attempt < 240) requestAnimationFrame(() => waitForUi(attempt + 1));
}

window.domistikaSelectionV04 = {
  enable: enableSelection,
  commit: () => commitSelection(true),
  cancel: cancelSelection,
  copy: copySelection,
  paste: pasteSelection,
  get active() { return !!selection; },
};

document.documentElement.dataset.selectionEngine = 'v0.4';
waitForUi();
