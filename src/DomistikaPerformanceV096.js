import { clamp, hexToRgba } from './core/utils.js';

const DRAW_TOOLS = new Set(['pencil', 'ink', 'marker', 'airbrush', 'eraser']);
const DEFAULT_PROFILE = Object.freeze({
  spacing: 0.18, scatter: 0, rotationJitter: 0, grain: 0.08, hardness: 0.84,
  flow: 1, tip: 'round', tiltInfluence: 0, pressureOpacity: true,
  pressureSize: true, wetMix: 0,
});
const MAX_FILL_PIXELS = 16_000_000;
const MAX_TOTAL_STAMPS_PER_FRAME = 720;

function clonePointerEvent(event) {
  return {
    clientX: event.clientX,
    clientY: event.clientY,
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    pressure: event.pressure,
    tiltX: event.tiltX,
    tiltY: event.tiltY,
    altitudeAngle: event.altitudeAngle,
    azimuthAngle: event.azimuthAngle,
    button: event.button,
    buttons: event.buttons,
    altKey: event.altKey,
  };
}

function releaseSnapshot(snapshot) {
  const canvas = snapshot?.canvas;
  if (!canvas) return;
  try {
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    // Some OffscreenCanvas implementations do not allow explicit release.
  }
}

function copyLayerCanvas(layer) {
  const source = layer.canvas;
  const canvas = typeof OffscreenCanvas === 'function'
    ? new OffscreenCanvas(source.width, source.height)
    : document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  let ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx && typeof OffscreenCanvas === 'function' && canvas instanceof OffscreenCanvas) {
    const fallback = document.createElement('canvas');
    fallback.width = source.width;
    fallback.height = source.height;
    ctx = fallback.getContext('2d', { alpha: true });
    ctx.drawImage(source, 0, 0);
    return { layerId: layer.id, canvas: fallback };
  }
  ctx.drawImage(source, 0, 0);
  return { layerId: layer.id, canvas };
}

function accelerateLayer(layer) {
  if (!layer?.canvas || layer.canvas.dataset.v096Accelerated === 'true') return layer;
  const oldCanvas = layer.canvas;
  const canvas = document.createElement('canvas');
  for (const attribute of [...oldCanvas.attributes]) canvas.setAttribute(attribute.name, attribute.value);
  canvas.width = oldCanvas.width;
  canvas.height = oldCanvas.height;
  canvas.hidden = oldCanvas.hidden;
  canvas.dataset.v096Accelerated = 'true';
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true })
    || canvas.getContext('2d', { alpha: true });
  if (!ctx) return layer;
  ctx.drawImage(oldCanvas, 0, 0);
  oldCanvas.replaceWith(canvas);
  layer.canvas = canvas;
  layer.ctx = ctx;
  return layer;
}

function installAcceleratedLayers(engine) {
  if (engine.__v096AcceleratedLayers) return;
  engine.__v096AcceleratedLayers = true;
  engine.layers.forEach(accelerateLayer);
  const originalCreateLayer = engine.createLayer.bind(engine);
  engine.createLayer = function createLayerV096(...args) {
    return accelerateLayer(originalCreateLayer(...args));
  };
}

function installFastHistory(engine) {
  if (engine.__v096FastHistory) return;
  engine.__v096FastHistory = true;

  const pixels = engine.width * engine.height;
  engine.maxHistory = pixels > 12_000_000 ? 3 : pixels > 6_000_000 ? 5 : pixels > 3_000_000 ? 8 : 16;

  const originalRestoreSnapshot = engine.restoreSnapshot.bind(engine);

  engine.captureHistory = function captureHistoryV096() {
    const layer = this.activeLayer;
    if (!layer?.canvas) return;
    this.undoStack.push(copyLayerCanvas(layer));
    while (this.undoStack.length > this.maxHistory) releaseSnapshot(this.undoStack.shift());
    this.redoStack.forEach(releaseSnapshot);
    this.redoStack.length = 0;
  };

  engine.restoreSnapshot = async function restoreSnapshotV096(snapshot) {
    if (!snapshot?.canvas) return originalRestoreSnapshot(snapshot);
    const layer = this.layers.find((candidate) => candidate.id === snapshot.layerId);
    if (!layer) return;
    layer.ctx.clearRect(0, 0, this.width, this.height);
    layer.ctx.drawImage(snapshot.canvas, 0, 0);
  };

  engine.undo = async function undoV096() {
    const snapshot = this.undoStack.pop();
    if (!snapshot) return this.onStatus('Nothing to undo');
    const layer = this.layers.find((candidate) => candidate.id === snapshot.layerId);
    if (!layer) return;
    this.redoStack.push(copyLayerCanvas(layer));
    await this.restoreSnapshot(snapshot);
    releaseSnapshot(snapshot);
    this.markChanged('Undo');
  };

  engine.redo = async function redoV096() {
    const snapshot = this.redoStack.pop();
    if (!snapshot) return this.onStatus('Nothing to redo');
    const layer = this.layers.find((candidate) => candidate.id === snapshot.layerId);
    if (!layer) return;
    this.undoStack.push(copyLayerCanvas(layer));
    await this.restoreSnapshot(snapshot);
    releaseSnapshot(snapshot);
    this.markChanged('Redo');
  };
}

function installSymmetryCache(engine) {
  if (engine.__v096SymmetryCache) return;
  engine.__v096SymmetryCache = true;
  const originalTransforms = engine.symmetryTransforms.bind(engine);
  let cacheKey = '';
  let cached = null;

  engine.symmetryTransforms = function symmetryTransformsV096() {
    const key = `${this.settings.symmetry}|${this.width}x${this.height}`;
    if (key === cacheKey && cached) return cached;
    cached = originalTransforms();
    cacheKey = key;
    return cached;
  };
}

function installFramePacing(engine) {
  if (engine.__v096FramePacing) return;
  engine.__v096FramePacing = true;
  const originalMove = engine.pointerMove.bind(engine);
  const originalUp = engine.pointerUp.bind(engine);
  let pending = null;
  let frame = 0;

  function shouldPace() {
    if (!engine.pointer || !DRAW_TOOLS.has(engine.pointer.mode)) return false;
    const copies = engine.symmetryTransforms().length;
    return copies > 4 || engine.width * engine.height > 4_000_000;
  }

  function flush() {
    frame = 0;
    if (!pending) return;
    const event = pending;
    pending = null;
    originalMove(event);
  }

  engine.pointerMove = function pointerMoveV096(event) {
    if (!shouldPace()) return originalMove(event);
    pending = clonePointerEvent(event);
    if (!frame) frame = requestAnimationFrame(flush);
  };

  engine.pointerUp = function pointerUpV096(event) {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (pending && this.pointer?.id === pending.pointerId) {
      const eventToFlush = pending;
      pending = null;
      originalMove(eventToFlush);
    } else {
      pending = null;
    }
    return originalUp(event);
  };
}

function profileFor(engine) {
  return engine.brushProfile || window.domistikaBrushV02?.get?.() || DEFAULT_PROFILE;
}

function colorFor(engine) {
  const color = engine.settings.color;
  if (engine.__v096ColorKey !== color) {
    engine.__v096ColorKey = color;
    engine.__v096Color = hexToRgba(color);
  }
  return engine.__v096Color;
}

function interpolate(from, to, t) {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    pressure: (from.pressure || 1) + ((to.pressure || 1) - (from.pressure || 1)) * t,
    tiltX: (from.tiltX || 0) + ((to.tiltX || 0) - (from.tiltX || 0)) * t,
    tiltY: (from.tiltY || 0) + ((to.tiltY || 0) - (from.tiltY || 0)) * t,
  };
}

function segmentColor(engine, profile, base, from, to) {
  const wetMix = clamp(profile.wetMix || 0, 0, 1);
  if (!wetMix || engine.tool === 'eraser' || !engine.activeLayer) return base;
  try {
    const x = clamp(Math.floor((from.x + to.x) / 2), 0, engine.width - 1);
    const y = clamp(Math.floor((from.y + to.y) / 2), 0, engine.height - 1);
    const pixel = engine.activeLayer.ctx.getImageData(x, y, 1, 1).data;
    if (!pixel[3]) return base;
    const mix = wetMix * (pixel[3] / 255);
    return {
      r: Math.round(base.r * (1 - mix) + pixel[0] * mix),
      g: Math.round(base.g * (1 - mix) + pixel[1] * mix),
      b: Math.round(base.b * (1 - mix) + pixel[2] * mix),
    };
  } catch {
    return base;
  }
}

function solidEllipse(ctx, rx, ry, alpha, color) {
  ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(0.25, rx), Math.max(0.25, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

function ellipseDab(ctx, rx, ry, alpha, color, hardness, grain, copyCount) {
  if (alpha <= 0) return;
  const hard = hardness >= 0.88 && grain <= 0.05;
  if (hard) {
    solidEllipse(ctx, rx, ry, alpha, color);
  } else {
    const radius = Math.max(rx, ry);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    const core = clamp(hardness, 0.02, 1) * 0.78;
    gradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${alpha})`);
    gradient.addColorStop(core, `rgba(${color.r},${color.g},${color.b},${alpha * (0.9 - grain * 0.2)})`);
    gradient.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(0.25, rx), Math.max(0.25, ry), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (grain <= 0.06) return;
  const radius = Math.max(rx, ry);
  const divisor = Math.max(1, Math.sqrt(copyCount));
  const specks = Math.min(10, Math.max(1, Math.round((rx + ry) * grain * 0.18 / divisor)));
  ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha * grain * 0.28})`;
  ctx.beginPath();
  for (let index = 0; index < specks; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    const dot = 0.45 + Math.random() * 0.8;
    ctx.moveTo(Math.cos(angle) * distance + dot, Math.sin(angle) * distance);
    ctx.arc(Math.cos(angle) * distance, Math.sin(angle) * distance, dot, 0, Math.PI * 2);
  }
  ctx.fill();
}

function paintStamp(engine, ctx, point, pathAngle, profile, color, copyCount) {
  const pressure = profile.pressureSize === false ? 1 : Math.max(0.18, point.pressure || 1);
  const size = Math.max(0.5, Number(engine.settings.size) * pressure);
  let alpha = clamp(Number(engine.settings.opacity), 0.01, 1) * clamp(profile.flow, 0.04, 1.2);
  if (profile.pressureOpacity !== false) alpha *= Math.max(0.12, point.pressure || 1);
  if (engine.tool === 'marker') alpha *= 0.62;
  if (engine.tool === 'pencil') alpha *= 0.86;

  const scatterRadius = size * clamp(profile.scatter, 0, 2.4);
  const scatterAngle = Math.random() * Math.PI * 2;
  const x = point.x + Math.cos(scatterAngle) * scatterRadius * Math.random();
  const y = point.y + Math.sin(scatterAngle) * scatterRadius * Math.random();
  const tiltAngle = Math.atan2(point.tiltY || 0, point.tiltX || 1);
  const rotation = pathAngle
    + (Math.random() - 0.5) * clamp(profile.rotationJitter, 0, 360) * Math.PI / 180
    + tiltAngle * clamp(profile.tiltInfluence, 0, 1);

  ctx.save();
  ctx.globalCompositeOperation = engine.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.translate(x, y);
  ctx.rotate(rotation);

  if (engine.tool === 'airbrush') {
    const divisor = Math.max(1, Math.sqrt(copyCount));
    const dots = Math.min(28, Math.max(5, Math.round(size * 0.22 / divisor)));
    ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha * 0.045})`;
    ctx.beginPath();
    for (let index = 0; index < dots; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * size * 1.35;
      const dab = Math.max(0.4, size * (0.025 + Math.random() * 0.05));
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;
      ctx.moveTo(dx + dab, dy);
      ctx.arc(dx, dy, dab, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
    return;
  }

  if (profile.tip === 'rake') {
    for (let strand = -2; strand <= 2; strand += 1) {
      ctx.save();
      ctx.translate(strand * size * 0.13, 0);
      ellipseDab(ctx, size * 0.09, size * 0.5, alpha * 0.72, color, profile.hardness, profile.grain, copyCount);
      ctx.restore();
    }
  } else if (profile.tip === 'splatter') {
    const divisor = Math.max(1, Math.sqrt(copyCount));
    const dots = Math.min(18, Math.max(4, Math.round(size * 0.16 / divisor)));
    ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha * 0.42})`;
    ctx.beginPath();
    for (let index = 0; index < dots; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * size * 0.86;
      const dab = Math.max(0.6, size * (0.035 + Math.random() * 0.11));
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;
      ctx.moveTo(dx + dab, dy);
      ctx.arc(dx, dy, dab, 0, Math.PI * 2);
    }
    ctx.fill();
  } else if (profile.tip === 'square') {
    ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
    ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
  } else if (profile.tip === 'flat') {
    ellipseDab(ctx, size * 0.26, size * 0.52, alpha, color, profile.hardness, profile.grain, copyCount);
  } else if (profile.tip === 'chisel') {
    ctx.rotate(Math.PI / 8);
    ellipseDab(ctx, size * 0.2, size * 0.56, alpha, color, profile.hardness, profile.grain, copyCount);
  } else {
    ellipseDab(ctx, size * 0.5, size * 0.5, alpha, color, profile.hardness, profile.grain, copyCount);
  }
  ctx.restore();
}

function canUseLineFastPath(engine, profile) {
  return engine.tool !== 'airbrush'
    && profile.tip === 'round'
    && clamp(profile.scatter, 0, 2.4) < 0.001
    && clamp(profile.rotationJitter, 0, 360) < 0.01
    && clamp(profile.grain, 0, 1) <= 0.025
    && clamp(profile.hardness, 0, 1) >= 0.92
    && clamp(profile.wetMix, 0, 1) <= 0;
}

function drawFastLine(engine, ctx, from, to, profile) {
  const averagePressure = ((from.pressure || 1) + (to.pressure || 1)) / 2;
  const pressure = profile.pressureSize === false ? 1 : Math.max(0.18, averagePressure);
  const width = Math.max(0.5, Number(engine.settings.size) * pressure);
  let alpha = clamp(Number(engine.settings.opacity), 0.01, 1) * clamp(profile.flow, 0.04, 1.2);
  if (profile.pressureOpacity !== false) alpha *= Math.max(0.12, averagePressure);
  if (engine.tool === 'marker') alpha *= 0.62;
  if (engine.tool === 'pencil') alpha *= 0.86;
  ctx.save();
  ctx.globalCompositeOperation = engine.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = engine.tool === 'eraser' ? '#000000' : engine.settings.color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function installFastBrush(engine) {
  if (engine.__v096FastBrush) return;
  engine.__v096FastBrush = true;

  engine.drawSegment = function drawSegmentV096(from, to) {
    const transforms = this.symmetryTransforms();
    this.__v096SymmetryCopies = Math.max(1, transforms.length);
    for (const transform of transforms) this.drawSingleSegment(transform(from), transform(to));
    this.__v096SymmetryCopies = 1;
  };

  engine.drawSingleSegment = function drawSingleSegmentV096(from, to) {
    const layer = this.activeLayer;
    if (!layer) return;
    const profile = profileFor(this);
    if (canUseLineFastPath(this, profile)) {
      drawFastLine(this, layer.ctx, from, to, profile);
      return;
    }

    const copyCount = Math.max(1, this.__v096SymmetryCopies || 1);
    const distance = Math.max(0.001, Math.hypot(to.x - from.x, to.y - from.y));
    const averagePressure = ((from.pressure || 1) + (to.pressure || 1)) / 2;
    const effectiveSize = Number(this.settings.size)
      * (profile.pressureSize === false ? 1 : Math.max(0.18, averagePressure));
    const densityScale = copyCount <= 4 ? 1 : 1 + Math.log2(copyCount / 4) * 0.34;
    const step = Math.max(0.9, effectiveSize * clamp(profile.spacing, 0.02, 3) * densityScale);
    const rawCount = Math.max(1, Math.ceil(distance / step));
    const budgetPerCopy = Math.max(2, Math.floor(MAX_TOTAL_STAMPS_PER_FRAME / copyCount));
    const count = Math.min(rawCount, budgetPerCopy);
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const color = segmentColor(this, profile, colorFor(this), from, to);
    for (let index = 0; index <= count; index += 1) {
      paintStamp(this, layer.ctx, interpolate(from, to, index / count), angle, profile, color, copyCount);
    }
  };
}

function colorMatches(data, offset, target, tolerance) {
  const alpha = data[offset + 3];
  if (target[3] <= 8) return alpha <= Math.min(255, 10 + tolerance * 2.2);
  if (Math.abs(alpha - target[3]) > Math.max(24, tolerance * 2)) return false;
  const difference = Math.abs(data[offset] - target[0])
    + Math.abs(data[offset + 1] - target[1])
    + Math.abs(data[offset + 2] - target[2]);
  return difference <= tolerance * 3.2;
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

function batchSymmetryFill(engine, point) {
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
  const source = sourceCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, width, height);
  const destination = layer.ctx.getImageData(0, 0, width, height);
  const tolerance = clamp(Number(engine.settings.fillTolerance ?? 28), 0, 100);
  const { r, g, b } = hexToRgba(engine.settings.color);
  const replacement = [r, g, b, Math.round(clamp(Number(engine.settings.opacity), 0.01, 1) * 255)];

  const claimed = new Uint8Array(pixelCount);
  const visited = new Uint32Array(pixelCount);
  const stack = new Int32Array(pixelCount);
  let visitId = 0;
  let changed = 0;
  let regions = 0;

  for (const seed of points) {
    const startIndex = seed.y * width + seed.x;
    if (claimed[startIndex]) continue;
    const startOffset = startIndex * 4;
    const target = [
      source.data[startOffset],
      source.data[startOffset + 1],
      source.data[startOffset + 2],
      source.data[startOffset + 3],
    ];

    visitId += 1;
    let stackSize = 0;
    let regionChanged = 0;
    stack[stackSize++] = startIndex;
    visited[startIndex] = visitId;

    while (stackSize > 0) {
      const index = stack[--stackSize];
      const offset = index * 4;
      if (!colorMatches(source.data, offset, target, tolerance)) continue;
      claimed[index] = 1;

      if (destination.data[offset] !== replacement[0]
        || destination.data[offset + 1] !== replacement[1]
        || destination.data[offset + 2] !== replacement[2]
        || destination.data[offset + 3] !== replacement[3]) {
        destination.data[offset] = replacement[0];
        destination.data[offset + 1] = replacement[1];
        destination.data[offset + 2] = replacement[2];
        destination.data[offset + 3] = replacement[3];
        changed += 1;
        regionChanged += 1;
      }

      const px = index % width;
      let next;
      if (px > 0) {
        next = index - 1;
        if (visited[next] !== visitId) { visited[next] = visitId; stack[stackSize++] = next; }
      }
      if (px < width - 1) {
        next = index + 1;
        if (visited[next] !== visitId) { visited[next] = visitId; stack[stackSize++] = next; }
      }
      if (index >= width) {
        next = index - width;
        if (visited[next] !== visitId) { visited[next] = visitId; stack[stackSize++] = next; }
      }
      if (index < pixelCount - width) {
        next = index + width;
        if (visited[next] !== visitId) { visited[next] = visitId; stack[stackSize++] = next; }
      }
    }
    if (regionChanged > 0) regions += 1;
  }

  if (!changed) {
    engine.onStatus('Those mirrored regions already use the selected fill color');
    return false;
  }
  engine.captureHistory();
  layer.ctx.putImageData(destination, 0, 0);
  engine.markChanged(`Symmetry fill committed across ${regions} region${regions === 1 ? '' : 's'} (${changed.toLocaleString()} pixels)`);
  document.dispatchEvent(new CustomEvent('domistika:v091-filled', {
    detail: { layerId: layer.id, changed, tolerance, sampleAll, color: engine.settings.color },
  }));
  document.dispatchEvent(new CustomEvent('domistika:v093-symmetry-fill', {
    detail: { symmetry: engine.settings.symmetry, regions },
  }));
  return true;
}

function installBatchSymmetryFill(engine) {
  if (engine.__v096BatchFill) return;
  engine.__v096BatchFill = true;
  const originalDown = engine.pointerDown.bind(engine);

  engine.pointerDown = function pointerDownV096(event) {
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
    batchSymmetryFill(this, this.eventPoint(event));
  };

  if (window.domistikaSymmetryFillV093) {
    window.domistikaSymmetryFillV093.fillAt = (x, y) => batchSymmetryFill(engine, { x, y, pressure: 1 });
  }
}

function patchTextMeshStage(attempt = 0) {
  const stage = window.domistikaTextMeshStage;
  if (!stage) {
    if (attempt < 240) setTimeout(() => patchTextMeshStage(attempt + 1), 50);
    return;
  }
  if (stage.__v096VisibilityPaced) return;
  stage.__v096VisibilityPaced = true;
  cancelAnimationFrame(stage.animationFrame);

  stage.animate = function animateV096() {
    this.animationFrame = requestAnimationFrame(() => this.animate());
    const visible = !document.hidden && this.canvas.isConnected && this.canvas.offsetParent !== null;
    if (!visible) {
      this.clock.getDelta();
      return;
    }
    const delta = Math.min(0.05, this.clock.getDelta());
    if (this.state.autoSpin && !this.transform.dragging) {
      this.textRoot.rotation.y += delta * clamp(this.state.spinSpeed, 0.02, 2);
      this.captureTransform(false);
    }
    this.orbit.update();
    this.renderer.render(this.scene, this.camera);
  };
  stage.animate();
}

function install(engine) {
  if (!engine || engine.__v096PerformanceInstalled) return;
  engine.__v096PerformanceInstalled = true;
  installSymmetryCache(engine);
  installAcceleratedLayers(engine);
  installFastHistory(engine);
  installFastBrush(engine);
  installFramePacing(engine);
  installBatchSymmetryFill(engine);
  patchTextMeshStage();
  document.documentElement.dataset.performancePass = 'v0.9.6';
  document.dispatchEvent(new CustomEvent('domistika:v096-ready', { detail: { engine } }));
  engine.onStatus('Domistika v0.9.6 performance pass active');
}

function wait(attempt = 0) {
  const engine = window.domistikaEngine;
  if (engine && window.domistikaBrushV02) return install(engine);
  if (attempt < 300) setTimeout(() => wait(attempt + 1), 50);
}

wait();

window.domistikaPerformanceV096 = {
  install,
  batchSymmetryFill: (x, y) => {
    const engine = window.domistikaEngine;
    return engine ? batchSymmetryFill(engine, { x, y, pressure: 1 }) : false;
  },
};
