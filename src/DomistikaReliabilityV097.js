import { clamp, hexToRgba, loadImage } from './core/utils.js';
import { colorMatchesBounded, isEligibleSymmetryRegion } from './v097/fillMath.js';

const MAX_FILL_PIXELS = 16_000_000;
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', 'number']);

function createSnapshot(layer) {
  const canvas = document.createElement('canvas');
  canvas.width = layer.canvas.width;
  canvas.height = layer.canvas.height;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Canvas history is unavailable in this browser.');
  ctx.drawImage(layer.canvas, 0, 0);
  return { kind: 'domistika-history-v097', layerId: layer.id, canvas };
}

function releaseSnapshot(snapshot) {
  if (!snapshot?.canvas) return;
  snapshot.canvas.width = 0;
  snapshot.canvas.height = 0;
}

function trimHistory(stack, limit) {
  while (stack.length > limit) releaseSnapshot(stack.shift());
}

function installReliableHistory(engine) {
  if (engine.__v097ReliableHistory) return;
  engine.__v097ReliableHistory = true;
  let historyQueue = Promise.resolve();

  engine.undoStack.forEach((snapshot, index) => {
    if (!snapshot?.canvas || snapshot.canvas instanceof HTMLCanvasElement) return;
    const canvas = document.createElement('canvas');
    canvas.width = snapshot.canvas.width;
    canvas.height = snapshot.canvas.height;
    canvas.getContext('2d', { alpha: true })?.drawImage(snapshot.canvas, 0, 0);
    engine.undoStack[index] = { kind: 'domistika-history-v097', layerId: snapshot.layerId, canvas };
    releaseSnapshot(snapshot);
  });
  engine.redoStack.forEach(releaseSnapshot);
  engine.redoStack.length = 0;

  engine.captureHistory = function captureHistoryV097() {
    const layer = this.activeLayer;
    if (!layer?.canvas) return;
    this.undoStack.push(createSnapshot(layer));
    trimHistory(this.undoStack, this.maxHistory);
    this.redoStack.forEach(releaseSnapshot);
    this.redoStack.length = 0;
  };

  engine.restoreSnapshot = async function restoreSnapshotV097(snapshot) {
    const layer = this.layers.find((candidate) => candidate.id === snapshot?.layerId);
    if (!layer) return false;
    layer.ctx.clearRect(0, 0, this.width, this.height);
    if (snapshot.canvas) {
      layer.ctx.drawImage(snapshot.canvas, 0, 0);
    } else if (snapshot.dataUrl) {
      const image = await loadImage(snapshot.dataUrl);
      layer.ctx.drawImage(image, 0, 0);
    } else {
      return false;
    }
    this.redrawOverlay?.();
    return true;
  };

  function enqueue(operation) {
    historyQueue = historyQueue.then(operation, operation).catch((error) => {
      console.error(error);
      engine.onStatus(`History error: ${error.message}`);
    });
    return historyQueue;
  }

  engine.undo = function undoV097() {
    return enqueue(async () => {
      const snapshot = this.undoStack.pop();
      if (!snapshot) return this.onStatus('Nothing to undo');
      const layer = this.layers.find((candidate) => candidate.id === snapshot.layerId);
      if (!layer) {
        releaseSnapshot(snapshot);
        return this.onStatus('That undo layer no longer exists');
      }
      const current = createSnapshot(layer);
      try {
        const restored = await this.restoreSnapshot(snapshot);
        if (!restored) throw new Error('The undo snapshot could not be restored.');
        this.redoStack.push(current);
        trimHistory(this.redoStack, this.maxHistory);
        releaseSnapshot(snapshot);
        this.markChanged('Undo');
      } catch (error) {
        releaseSnapshot(current);
        this.undoStack.push(snapshot);
        throw error;
      }
    });
  };

  engine.redo = function redoV097() {
    return enqueue(async () => {
      const snapshot = this.redoStack.pop();
      if (!snapshot) return this.onStatus('Nothing to redo');
      const layer = this.layers.find((candidate) => candidate.id === snapshot.layerId);
      if (!layer) {
        releaseSnapshot(snapshot);
        return this.onStatus('That redo layer no longer exists');
      }
      const current = createSnapshot(layer);
      try {
        const restored = await this.restoreSnapshot(snapshot);
        if (!restored) throw new Error('The redo snapshot could not be restored.');
        this.undoStack.push(current);
        trimHistory(this.undoStack, this.maxHistory);
        releaseSnapshot(snapshot);
        this.markChanged('Redo');
      } catch (error) {
        releaseSnapshot(current);
        this.redoStack.push(snapshot);
        throw error;
      }
    });
  };
}

function isTextEditingTarget(target) {
  if (!(target instanceof Element)) return false;
  if (target.matches('textarea,[contenteditable="true"]')) return true;
  return target instanceof HTMLInputElement && TEXT_INPUT_TYPES.has(target.type);
}

function installUndoShortcuts(engine) {
  if (engine.__v097UndoShortcuts) return;
  engine.__v097UndoShortcuts = true;
  engine.overlay.tabIndex = -1;
  engine.overlay.addEventListener('pointerdown', () => {
    try { engine.overlay.focus({ preventScroll: true }); } catch { engine.overlay.focus(); }
  }, true);

  window.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || isTextEditingTarget(event.target)) return;
    const key = event.key.toLowerCase();
    const undo = key === 'z' && !event.shiftKey;
    const redo = key === 'y' || (key === 'z' && event.shiftKey);
    if (!undo && !redo) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (redo) void engine.redo();
    else void engine.undo();
  }, true);
}

function uniqueSymmetryPoints(engine, point) {
  const seen = new Set();
  const points = [];
  for (const transform of engine.symmetryTransforms()) {
    const transformed = transform(point);
    const x = clamp(Math.floor(transformed.x), 0, engine.width - 1);
    const y = clamp(Math.floor(transformed.y), 0, engine.height - 1);
    const key = y * engine.width + x;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({ x, y });
  }
  return points;
}

function boundedSymmetryFill(engine, point) {
  const layer = engine.activeLayer;
  if (!layer) return false;
  const width = engine.width;
  const height = engine.height;
  const pixelCount = width * height;
  if (pixelCount > MAX_FILL_PIXELS) {
    engine.onStatus('Fill is limited to 16 million pixels to protect browser memory.');
    return false;
  }

  const points = uniqueSymmetryPoints(engine, point);
  const sampleAll = engine.settings.fillSampleAll !== false;
  const sourceCanvas = sampleAll ? engine.compositeCanvas(false) : layer.canvas;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) return false;
  const source = sourceContext.getImageData(0, 0, width, height);
  const destination = layer.ctx.getImageData(0, 0, width, height);
  const tolerance = clamp(Number(engine.settings.fillTolerance ?? 28), 0, 100);
  const { r, g, b } = hexToRgba(engine.settings.color);
  const replacement = [r, g, b, Math.round(clamp(Number(engine.settings.opacity), 0.01, 1) * 255)];

  const labels = new Uint16Array(pixelCount);
  const visited = new Uint16Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  const eligible = [false];
  let visitId = 0;
  let skippedBackgrounds = 0;

  for (const seed of points) {
    const startIndex = seed.y * width + seed.x;
    if (labels[startIndex]) continue;
    const startOffset = startIndex * 4;
    const target = [
      source.data[startOffset],
      source.data[startOffset + 1],
      source.data[startOffset + 2],
      source.data[startOffset + 3],
    ];

    visitId += 1;
    let head = 0;
    let tail = 0;
    let matched = 0;
    let touchesEdge = false;
    queue[tail++] = startIndex;
    visited[startIndex] = visitId;

    while (head < tail) {
      const index = queue[head++];
      const offset = index * 4;
      if (!colorMatchesBounded(source.data, offset, target, tolerance)) continue;
      labels[index] = visitId;
      matched += 1;

      const x = index % width;
      const y = Math.floor(index / width);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true;

      let next;
      if (x > 0) {
        next = index - 1;
        if (visited[next] !== visitId) { visited[next] = visitId; queue[tail++] = next; }
      }
      if (x < width - 1) {
        next = index + 1;
        if (visited[next] !== visitId) { visited[next] = visitId; queue[tail++] = next; }
      }
      if (y > 0) {
        next = index - width;
        if (visited[next] !== visitId) { visited[next] = visitId; queue[tail++] = next; }
      }
      if (y < height - 1) {
        next = index + width;
        if (visited[next] !== visitId) { visited[next] = visitId; queue[tail++] = next; }
      }
    }

    eligible[visitId] = isEligibleSymmetryRegion({ touchesEdge, pixelCount: matched, totalPixels: pixelCount });
    if (!eligible[visitId] && matched > 0) skippedBackgrounds += 1;
  }

  const changedByRegion = new Uint32Array(visitId + 1);
  let changed = 0;
  for (let index = 0; index < pixelCount; index += 1) {
    const region = labels[index];
    if (!region || !eligible[region]) continue;
    const offset = index * 4;
    if (destination.data[offset] === replacement[0]
      && destination.data[offset + 1] === replacement[1]
      && destination.data[offset + 2] === replacement[2]
      && destination.data[offset + 3] === replacement[3]) continue;
    destination.data[offset] = replacement[0];
    destination.data[offset + 1] = replacement[1];
    destination.data[offset + 2] = replacement[2];
    destination.data[offset + 3] = replacement[3];
    changedByRegion[region] += 1;
    changed += 1;
  }

  if (!changed) {
    engine.onStatus(skippedBackgrounds
      ? 'No bounded mirrored regions found — shared background was protected'
      : 'Those mirrored regions already use the selected fill color');
    return false;
  }

  engine.captureHistory();
  layer.ctx.putImageData(destination, 0, 0);
  let regions = 0;
  for (let index = 1; index < changedByRegion.length; index += 1) if (changedByRegion[index]) regions += 1;
  engine.markChanged(`Bounded symmetry fill committed across ${regions} region${regions === 1 ? '' : 's'} (${changed.toLocaleString()} pixels)`);
  document.dispatchEvent(new CustomEvent('domistika:v091-filled', {
    detail: { layerId: layer.id, changed, tolerance, sampleAll, color: engine.settings.color },
  }));
  document.dispatchEvent(new CustomEvent('domistika:v093-symmetry-fill', {
    detail: { symmetry: engine.settings.symmetry, regions, bounded: true, skippedBackgrounds },
  }));
  return true;
}

function installBoundedSymmetryFill(engine) {
  if (engine.__v097BoundedFill) return;
  engine.__v097BoundedFill = true;
  const originalDown = engine.pointerDown.bind(engine);
  engine.pointerDown = function pointerDownV097(event) {
    const symmetryFill = this.tool === 'fill'
      && this.settings.fillSymmetry === true
      && this.settings.symmetry !== 'none'
      && event.button !== 1
      && event.button !== 2
      && !event.altKey
      && !this.spacePan;
    if (!symmetryFill) return originalDown(event);
    if (this.activeLayer?.kind === 'guide' && this.activeLayer.locked) {
      this.onStatus('Guide layers are locked. Select an art layer before filling.');
      return;
    }
    event.preventDefault?.();
    boundedSymmetryFill(this, this.eventPoint(event));
  };

  if (window.domistikaSymmetryFillV093) {
    window.domistikaSymmetryFillV093.fillAt = (x, y) => boundedSymmetryFill(engine, { x, y, pressure: 1 });
  }
  if (window.domistikaPerformanceV096) {
    window.domistikaPerformanceV096.batchSymmetryFill = (x, y) => boundedSymmetryFill(engine, { x, y, pressure: 1 });
  }
}

function install(engine) {
  if (!engine || engine.__v097ReliabilityInstalled) return;
  engine.__v097ReliabilityInstalled = true;
  installReliableHistory(engine);
  installUndoShortcuts(engine);
  installBoundedSymmetryFill(engine);
  document.documentElement.dataset.reliabilityPass = 'v0.9.7';
  document.dispatchEvent(new CustomEvent('domistika:v097-ready', { detail: { engine } }));
  engine.onStatus('Domistika v0.9.7 undo and bounded symmetry fill repair active');
}

function wait(attempt = 0) {
  const engine = window.domistikaEngine;
  if (engine && window.domistikaPerformanceV096) return install(engine);
  if (attempt < 300) setTimeout(() => wait(attempt + 1), 50);
}

wait();

window.domistikaReliabilityV097 = {
  install,
  boundedSymmetryFill: (x, y) => {
    const engine = window.domistikaEngine;
    return engine ? boundedSymmetryFill(engine, { x, y, pressure: 1 }) : false;
  },
};
