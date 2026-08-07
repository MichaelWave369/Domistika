import { CanvasEngine } from './core/CanvasEngine.js';

const INSTALL_FLAG = '__domistikaSignatureLabV099Installed';
const VERSION = '0.9.9';
const DRAW_TOOLS = new Set(['pencil', 'ink', 'marker', 'airbrush', 'eraser']);
const MODES = [
  ['signature-mandala', 'Signature Mandala'],
  ['name-vortex', 'Name Vortex'],
  ['phrase-bloom', 'Phrase Bloom'],
  ['replay-build', 'Replay Build'],
];

const runtime = {
  version: VERSION,
  engine: null,
  armed: false,
  currentStroke: null,
  currentPointerId: null,
  strokes: [],
  lastArtifact: null,
  replayFrame: 0,
  settings: {
    mode: 'signature-mandala',
    repetitions: 48,
    spiralPull: 0.28,
    rotationDrift: 0.12,
    ringSpacing: 1,
    inkScale: 0.72,
    replaySpeed: 1,
    view: 'split',
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function allPoints(strokes = runtime.strokes) {
  return strokes.flatMap((stroke) => stroke);
}

function strokeBounds(strokes = runtime.strokes) {
  const points = allPoints(strokes);
  if (!points.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return {
    minX, minY, maxX, maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function modeLabel(mode = runtime.settings.mode) {
  return MODES.find(([value]) => value === mode)?.[1] ?? mode;
}

function status(message) {
  const target = document.querySelector('#statusMessage');
  if (target) target.textContent = message;
}

function waitFor(selector, callback) {
  const immediate = document.querySelector(selector);
  if (immediate) {
    callback(immediate);
    return;
  }
  const observer = new MutationObserver(() => {
    const target = document.querySelector(selector);
    if (!target) return;
    observer.disconnect();
    callback(target);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function capturePoint(engine, event) {
  const point = engine.eventPoint(event);
  return {
    x: point.x,
    y: point.y,
    pressure: Number.isFinite(point.pressure) ? point.pressure : 1,
    tiltX: Number(event.tiltX) || 0,
    tiltY: Number(event.tiltY) || 0,
    twist: Number(event.twist) || 0,
    t: performance.now(),
  };
}

function installCaptureHooks() {
  const originalDown = CanvasEngine.prototype.pointerDown;
  const originalMove = CanvasEngine.prototype.pointerMove;
  const originalUp = CanvasEngine.prototype.pointerUp;

  CanvasEngine.prototype.pointerDown = function signatureLabPointerDown(event) {
    runtime.engine = this;
    if (
      runtime.armed
      && event.button === 0
      && !this.spacePan
      && DRAW_TOOLS.has(this.tool)
    ) {
      runtime.currentPointerId = event.pointerId;
      runtime.currentStroke = [capturePoint(this, event)];
      runtime.strokes.push(runtime.currentStroke);
      refreshStats();
    }
    return originalDown.call(this, event);
  };

  CanvasEngine.prototype.pointerMove = function signatureLabPointerMove(event) {
    runtime.engine = this;
    if (runtime.armed && runtime.currentStroke && runtime.currentPointerId === event.pointerId) {
      const samples = event.pointerType === 'pen' && typeof event.getCoalescedEvents === 'function'
        ? (event.getCoalescedEvents().length ? event.getCoalescedEvents() : [event])
        : [event];
      for (const sample of samples) runtime.currentStroke.push(capturePoint(this, sample));
      refreshStats();
    }
    return originalMove.call(this, event);
  };

  CanvasEngine.prototype.pointerUp = function signatureLabPointerUp(event) {
    runtime.engine = this;
    if (runtime.armed && runtime.currentStroke && runtime.currentPointerId === event.pointerId) {
      runtime.currentStroke.push(capturePoint(this, event));
      runtime.currentStroke = null;
      runtime.currentPointerId = null;
      refreshStats();
    }
    return originalUp.call(this, event);
  };
}

function injectStyles() {
  if (document.querySelector('#signatureLabV099Styles')) return;
  const style = document.createElement('style');
  style.id = 'signatureLabV099Styles';
  style.textContent = `
    #signatureLabToggle.siglab-pill{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
    #signatureLabToggle .sig-dot{width:7px;height:7px;border-radius:50%;background:#8e78ff;box-shadow:0 0 0 2px rgba(142,120,255,.18)}
    #signatureLabToggle[data-armed="true"] .sig-dot{background:#ffb24d;box-shadow:0 0 12px rgba(255,178,77,.66)}
    #signatureLabPanel{position:fixed;z-index:2147482500;width:min(390px,calc(100vw - 24px));right:18px;bottom:74px;padding:12px;border:1px solid rgba(179,150,255,.24);border-radius:16px;background:rgba(13,10,19,.975);box-shadow:0 20px 60px rgba(0,0,0,.5);color:#f4efff;font:12px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;backdrop-filter:blur(18px)}
    #signatureLabPanel[hidden]{display:none}
    #signatureLabPanel .sl-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
    #signatureLabPanel .sl-kicker{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#bca7ff;font-weight:850}
    #signatureLabPanel .sl-title{font-size:16px;font-weight:850}
    #signatureLabPanel .sl-close{border:0;background:#1c1726;color:#c8bdd8;border-radius:8px;width:30px;height:30px;cursor:pointer}
    #signatureLabPanel .sl-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    #signatureLabPanel label{display:grid;gap:4px;color:#a99fba;font-size:10px;font-weight:700}
    #signatureLabPanel select,#signatureLabPanel input[type="range"]{width:100%}
    #signatureLabPanel select{border:1px solid #332b42;background:#181320;color:#f5efff;border-radius:9px;padding:7px 8px}
    #signatureLabPanel .sl-range{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:center}
    #signatureLabPanel output{font-variant-numeric:tabular-nums;color:#d8ccff;min-width:42px;text-align:right}
    #signatureLabPanel .sl-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0}
    #signatureLabPanel button{border:1px solid #352d45;background:#191421;color:#eee8f8;border-radius:9px;padding:8px 7px;cursor:pointer;font:inherit}
    #signatureLabPanel button:hover{border-color:#a88fff;color:#d8ccff}
    #signatureLabPanel button.active{border-color:#ffb24d;background:rgba(255,178,77,.12);color:#ffd08d}
    #signatureLabPreview{height:210px;border:1px solid #30293d;border-radius:12px;overflow:hidden;background:
      linear-gradient(45deg,#17131d 25%,transparent 25%) 0 0/18px 18px,
      linear-gradient(45deg,transparent 75%,#17131d 75%) 0 0/18px 18px,
      linear-gradient(45deg,transparent 75%,#17131d 75%) 9px -9px/18px 18px,
      linear-gradient(45deg,#17131d 25%,#100d15 25%) 9px -9px/18px 18px}
    #signatureLabPreview canvas{display:block;width:100%;height:100%}
    #signatureLabStats{display:flex;gap:8px;flex-wrap:wrap;margin-top:7px;color:#8f859f;font-size:10px}
    #signatureLabStats strong{color:#d8ccff}
    #signatureLabPanel .sl-help{margin-top:8px;color:#82788f;font-size:10px}
    #signatureLabPanel .sl-help kbd{background:#241d30;border:1px solid #3d324f;border-bottom-width:2px;border-radius:5px;padding:1px 5px;color:#fff}
    #pendeckPanel .pd-actions #pendeckSignatureLab{border-color:rgba(188,167,255,.45)}
    @media (max-width:720px){#signatureLabPanel{right:12px;bottom:64px;width:calc(100vw - 24px)}#signatureLabPreview{height:180px}}
  `;
  document.head.appendChild(style);
}

function createUI(controlDeck) {
  if (document.querySelector('#signatureLabToggle')) return;
  injectStyles();

  const toggle = document.createElement('button');
  toggle.id = 'signatureLabToggle';
  toggle.className = 'toggle-button siglab-pill';
  toggle.type = 'button';
  toggle.dataset.armed = 'false';
  toggle.title = 'Signature Lab — turn handwriting into geometry (F9)';
  toggle.innerHTML = '<span class="sig-dot"></span><span>Signature</span>';
  controlDeck.appendChild(toggle);

  const panel = document.createElement('section');
  panel.id = 'signatureLabPanel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="sl-head">
      <div><div class="sl-kicker">Gesture Geometry</div><div class="sl-title">Signature Lab v0.9.9</div></div>
      <button class="sl-close" type="button" aria-label="Close">×</button>
    </div>
    <label>Mode
      <select id="signatureMode">
        ${MODES.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}
      </select>
    </label>
    <div class="sl-grid">
      <label>Copies
        <span class="sl-range"><input id="signatureRepetitions" type="range" min="6" max="96" step="6" value="48"><output id="signatureRepetitionsOut">48</output></span>
      </label>
      <label>Spiral pull
        <span class="sl-range"><input id="signatureSpiral" type="range" min="0" max="100" value="28"><output id="signatureSpiralOut">28%</output></span>
      </label>
      <label>Rotation drift
        <span class="sl-range"><input id="signatureDrift" type="range" min="0" max="100" value="12"><output id="signatureDriftOut">12%</output></span>
      </label>
      <label>Ring spacing
        <span class="sl-range"><input id="signatureSpacing" type="range" min="25" max="250" value="100"><output id="signatureSpacingOut">1.00×</output></span>
      </label>
      <label>Ink scale
        <span class="sl-range"><input id="signatureInk" type="range" min="20" max="160" value="72"><output id="signatureInkOut">0.72×</output></span>
      </label>
      <label>Replay speed
        <span class="sl-range"><input id="signatureReplaySpeed" type="range" min="25" max="300" value="100"><output id="signatureReplaySpeedOut">1.00×</output></span>
      </label>
    </div>
    <label>Preview
      <select id="signatureView">
        <option value="split">Original + Result</option>
        <option value="generated">Generated</option>
        <option value="original">Original gesture</option>
        <option value="overlay">Overlay</option>
      </select>
    </label>
    <div class="sl-actions">
      <button id="signatureCapture" type="button">Capture New</button>
      <button id="signatureGenerate" type="button">Generate</button>
      <button id="signatureReplay" type="button">Replay</button>
      <button id="signatureCommit" type="button">Commit</button>
      <button id="signatureExport" type="button">Export PNG</button>
      <button id="signatureClear" type="button">Clear</button>
    </div>
    <div id="signatureLabPreview"><canvas id="signaturePreviewCanvas" width="720" height="420"></canvas></div>
    <div id="signatureLabStats"><span>strokes <strong id="signatureStrokeCount">0</strong></span><span>samples <strong id="signatureSampleCount">0</strong></span><span>pressure <strong id="signatureAvgPressure">0.000</strong></span></div>
    <div class="sl-help">Press <kbd>Capture New</kbd>, write your name or phrase on the Domistika canvas, then Generate. <kbd>F9</kbd> opens the lab.</div>
  `;
  document.body.appendChild(panel);

  const $ = (selector) => panel.querySelector(selector);
  const openPanel = () => { panel.hidden = false; renderPreview(); };
  const closePanel = () => { panel.hidden = true; };

  toggle.addEventListener('click', () => panel.hidden ? openPanel() : closePanel());
  $('.sl-close').addEventListener('click', closePanel);

  const bindRange = (inputSelector, outputSelector, setting, parse, format) => {
    const input = $(inputSelector);
    const output = $(outputSelector);
    const sync = () => {
      runtime.settings[setting] = parse(input.value);
      output.textContent = format(runtime.settings[setting]);
      if (runtime.lastArtifact) {
        generateArtifact({ emit: false });
        renderPreview();
      }
    };
    input.addEventListener('input', sync);
  };

  $('#signatureMode').addEventListener('change', (event) => {
    runtime.settings.mode = event.target.value;
    if (runtime.lastArtifact) generateArtifact({ emit: false });
    renderPreview();
  });
  $('#signatureView').addEventListener('change', (event) => {
    runtime.settings.view = event.target.value;
    renderPreview();
  });

  bindRange('#signatureRepetitions', '#signatureRepetitionsOut', 'repetitions', Number, (v) => String(v));
  bindRange('#signatureSpiral', '#signatureSpiralOut', 'spiralPull', (v) => Number(v) / 100, (v) => `${Math.round(v * 100)}%`);
  bindRange('#signatureDrift', '#signatureDriftOut', 'rotationDrift', (v) => Number(v) / 100, (v) => `${Math.round(v * 100)}%`);
  bindRange('#signatureSpacing', '#signatureSpacingOut', 'ringSpacing', (v) => Number(v) / 100, (v) => `${v.toFixed(2)}×`);
  bindRange('#signatureInk', '#signatureInkOut', 'inkScale', (v) => Number(v) / 100, (v) => `${v.toFixed(2)}×`);
  bindRange('#signatureReplaySpeed', '#signatureReplaySpeedOut', 'replaySpeed', (v) => Number(v) / 100, (v) => `${v.toFixed(2)}×`);

  $('#signatureCapture').addEventListener('click', () => {
    runtime.strokes = [];
    runtime.lastArtifact = null;
    runtime.armed = true;
    runtime.currentStroke = null;
    runtime.currentPointerId = null;
    toggle.dataset.armed = 'true';
    $('#signatureCapture').classList.add('active');
    $('#signatureCapture').textContent = 'Capturing…';
    refreshStats();
    clearPreviewCanvas();
    status('Signature Lab capture armed — write your gesture on the canvas');
  });

  $('#signatureGenerate').addEventListener('click', () => {
    stopCapture();
    if (!generateArtifact()) return;
    renderPreview();
    status(`${modeLabel()} generated from ${runtime.strokes.length} stroke${runtime.strokes.length === 1 ? '' : 's'}`);
  });

  $('#signatureReplay').addEventListener('click', () => {
    stopCapture();
    replayArtifact();
  });

  $('#signatureCommit').addEventListener('click', commitArtifact);
  $('#signatureExport').addEventListener('click', exportArtifact);
  $('#signatureClear').addEventListener('click', () => {
    stopCapture();
    runtime.strokes = [];
    runtime.lastArtifact = null;
    refreshStats();
    clearPreviewCanvas();
    status('Signature Lab cleared');
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'F9' || event.target?.matches?.('input,select,textarea,[contenteditable="true"]')) return;
    event.preventDefault();
    panel.hidden ? openPanel() : closePanel();
  });

  window.domistikaSignatureLab = {
    version: VERSION,
    runtime,
    open: openPanel,
    close: closePanel,
    captureNew: () => $('#signatureCapture').click(),
    generate: () => $('#signatureGenerate').click(),
    replay: () => $('#signatureReplay').click(),
    commit: () => $('#signatureCommit').click(),
    exportPNG: () => $('#signatureExport').click(),
  };

  integratePenDeck(openPanel);
  refreshStats();
}

function stopCapture() {
  runtime.armed = false;
  runtime.currentStroke = null;
  runtime.currentPointerId = null;
  const toggle = document.querySelector('#signatureLabToggle');
  if (toggle) toggle.dataset.armed = 'false';
  const button = document.querySelector('#signatureCapture');
  if (button) {
    button.classList.remove('active');
    button.textContent = 'Capture New';
  }
}

function refreshStats() {
  const strokeCount = document.querySelector('#signatureStrokeCount');
  const sampleCount = document.querySelector('#signatureSampleCount');
  const avgPressure = document.querySelector('#signatureAvgPressure');
  if (!strokeCount || !sampleCount || !avgPressure) return;
  const points = allPoints();
  strokeCount.textContent = String(runtime.strokes.length);
  sampleCount.textContent = String(points.length);
  avgPressure.textContent = average(points.map((point) => Number(point.pressure) || 0)).toFixed(3);
}

function clearPreviewCanvas() {
  const canvas = document.querySelector('#signaturePreviewCanvas');
  const ctx = canvas?.getContext('2d');
  if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function normalizedStrokes(engine) {
  const bounds = strokeBounds();
  if (!bounds) return null;
  const minDim = Math.min(engine.width, engine.height);
  const fitScale = Math.min(
    1,
    (minDim * 0.42) / Math.max(bounds.width, bounds.height, 1),
  );
  return {
    bounds,
    fitScale,
    strokes: runtime.strokes.map((stroke) => stroke.map((point) => ({
      ...point,
      localX: (point.x - bounds.centerX) * fitScale,
      localY: (point.y - bounds.centerY) * fitScale,
    }))),
  };
}

function transformSample(sample, center, angle, scale, radialOffset = 0) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = sample.localX * scale;
  const y = sample.localY * scale;
  return {
    ...sample,
    x: center.x + x * cos - y * sin + Math.cos(angle) * radialOffset,
    y: center.y + x * sin + y * cos + Math.sin(angle) * radialOffset,
  };
}

function drawStroke(ctx, stroke, color, baseWidth, alpha = 1) {
  if (stroke.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = alpha;
  for (let index = 1; index < stroke.length; index += 1) {
    const from = stroke[index - 1];
    const to = stroke[index];
    const pressure = clamp(((Number(from.pressure) || 1) + (Number(to.pressure) || 1)) / 2, 0.06, 1);
    ctx.lineWidth = Math.max(0.45, baseWidth * (0.28 + pressure * 0.72));
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }
  ctx.restore();
}

function renderOriginal(engine, normalized, color) {
  const canvas = createCanvas(engine.width, engine.height);
  const ctx = canvas.getContext('2d');
  const center = { x: engine.width / 2, y: engine.height / 2 };
  const baseWidth = Math.max(0.7, Number(engine.settings?.size || 4) * runtime.settings.inkScale * 0.7);
  for (const stroke of normalized.strokes) {
    const centered = stroke.map((sample) => ({
      ...sample,
      x: center.x + sample.localX,
      y: center.y + sample.localY,
    }));
    drawStroke(ctx, centered, color, baseWidth, 0.92);
  }
  return canvas;
}

function geometryForCopy(index, count, minDim) {
  const phase = count <= 1 ? 0 : index / (count - 1);
  const baseAngle = (Math.PI * 2 * index) / count;
  const { mode, spiralPull, rotationDrift, ringSpacing } = runtime.settings;
  if (mode === 'name-vortex') {
    return {
      angle: baseAngle + phase * rotationDrift * Math.PI * 2 + phase * spiralPull * 1.4,
      scale: Math.max(0.3, 1 - phase * spiralPull * 0.72),
      radialOffset: -phase * minDim * 0.07 * spiralPull * ringSpacing,
    };
  }
  if (mode === 'phrase-bloom') {
    const bloom = Math.sin(phase * Math.PI);
    return {
      angle: baseAngle + phase * rotationDrift * Math.PI,
      scale: 0.82 + bloom * 0.25,
      radialOffset: minDim * 0.08 * ringSpacing * (0.2 + bloom),
    };
  }
  if (mode === 'replay-build') {
    return {
      angle: baseAngle + phase * rotationDrift * Math.PI * 1.25,
      scale: 0.92 + Math.sin(phase * Math.PI * 2) * 0.08 * spiralPull,
      radialOffset: minDim * 0.025 * ringSpacing * Math.sin(phase * Math.PI),
    };
  }
  return {
    angle: baseAngle + phase * rotationDrift * Math.PI * 0.5,
    scale: 1,
    radialOffset: minDim * 0.015 * ringSpacing * Math.sin(phase * Math.PI * 2),
  };
}

function renderGenerated(engine, normalized, copies = runtime.settings.repetitions) {
  const canvas = createCanvas(engine.width, engine.height);
  const ctx = canvas.getContext('2d');
  const center = { x: engine.width / 2, y: engine.height / 2 };
  const minDim = Math.min(engine.width, engine.height);
  const color = engine.settings?.color || '#1b1820';
  const baseWidth = Math.max(0.7, Number(engine.settings?.size || 4) * runtime.settings.inkScale * 0.62);
  const count = Math.max(1, Math.round(runtime.settings.repetitions));
  const activeCopies = Math.max(1, Math.min(count, Math.round(copies)));

  for (let index = 0; index < activeCopies; index += 1) {
    const geometry = geometryForCopy(index, count, minDim);
    for (const stroke of normalized.strokes) {
      const transformed = stroke.map((sample) => transformSample(
        sample,
        center,
        geometry.angle,
        geometry.scale,
        geometry.radialOffset,
      ));
      drawStroke(ctx, transformed, color, baseWidth, 0.78);
    }
  }
  return canvas;
}

function generateArtifact({ emit = true, copies = runtime.settings.repetitions } = {}) {
  const engine = runtime.engine;
  const points = allPoints();
  if (!engine || points.length < 2) {
    status('Signature Lab needs a captured gesture first');
    return null;
  }
  const normalized = normalizedStrokes(engine);
  if (!normalized) return null;
  const color = engine.settings?.color || '#1b1820';
  const originalCanvas = renderOriginal(engine, normalized, color);
  const generatedCanvas = renderGenerated(engine, normalized, copies);
  const pressures = points.map((point) => Number(point.pressure) || 0);
  const artifact = {
    version: VERSION,
    mode: runtime.settings.mode,
    settings: { ...runtime.settings },
    bounds: normalized.bounds,
    strokes: runtime.strokes.map((stroke) => stroke.map((point) => ({ ...point }))),
    originalCanvas,
    generatedCanvas,
    metadata: {
      strokeCount: runtime.strokes.length,
      sampleCount: points.length,
      averagePressure: average(pressures),
      maxPressure: pressures.length ? Math.max(...pressures) : 0,
      durationMs: points.length > 1 ? points.at(-1).t - points[0].t : 0,
    },
  };
  runtime.lastArtifact = artifact;
  if (emit) emitArtifact(artifact);
  return artifact;
}

function emitArtifact(artifact) {
  window.dispatchEvent(new CustomEvent('signaturelab:artifact', { detail: artifact }));
  let snapshotDataUrl = null;
  try { snapshotDataUrl = artifact.generatedCanvas.toDataURL('image/png'); } catch {}
  window.dispatchEvent(new CustomEvent('domistika:cc-sketch', {
    detail: {
      source: 'domistika-signature-lab-v099',
      version: VERSION,
      mode: artifact.mode,
      settings: artifact.settings,
      snapshotDataUrl,
      stroke: artifact.metadata,
    },
  }));
}

function renderPreview() {
  const preview = document.querySelector('#signaturePreviewCanvas');
  if (!preview) return;
  const ctx = preview.getContext('2d');
  ctx.clearRect(0, 0, preview.width, preview.height);
  const artifact = runtime.lastArtifact;
  if (!artifact) return;

  const drawFit = (source, x, y, width, height, alpha = 1) => {
    const scale = Math.min(width / source.width, height / source.height);
    const dw = source.width * scale;
    const dh = source.height * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(source, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh);
    ctx.restore();
  };

  const view = runtime.settings.view;
  if (view === 'split') {
    const half = preview.width / 2;
    drawFit(artifact.originalCanvas, 0, 0, half, preview.height, 1);
    drawFit(artifact.generatedCanvas, half, 0, half, preview.height, 1);
    ctx.save();
    ctx.strokeStyle = 'rgba(188,167,255,.35)';
    ctx.beginPath();
    ctx.moveTo(half, 12);
    ctx.lineTo(half, preview.height - 12);
    ctx.stroke();
    ctx.restore();
  } else if (view === 'original') {
    drawFit(artifact.originalCanvas, 0, 0, preview.width, preview.height, 1);
  } else if (view === 'overlay') {
    drawFit(artifact.generatedCanvas, 0, 0, preview.width, preview.height, 0.76);
    drawFit(artifact.originalCanvas, 0, 0, preview.width, preview.height, 0.3);
  } else {
    drawFit(artifact.generatedCanvas, 0, 0, preview.width, preview.height, 1);
  }
}

function replayArtifact() {
  const engine = runtime.engine;
  if (!engine || allPoints().length < 2) {
    status('Capture a gesture before replaying it');
    return;
  }
  cancelAnimationFrame(runtime.replayFrame);
  const count = Math.max(1, Math.round(runtime.settings.repetitions));
  const duration = 2400 / clamp(runtime.settings.replaySpeed, 0.25, 3);
  const startedAt = performance.now();
  const tick = (now) => {
    const progress = clamp((now - startedAt) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const copies = Math.max(1, Math.ceil(count * eased));
    generateArtifact({ emit: false, copies });
    renderPreview();
    if (progress < 1) runtime.replayFrame = requestAnimationFrame(tick);
    else {
      emitArtifact(runtime.lastArtifact);
      status(`${modeLabel()} replay complete`);
    }
  };
  status(`${modeLabel()} replay started`);
  runtime.replayFrame = requestAnimationFrame(tick);
}

function commitArtifact() {
  const engine = runtime.engine;
  const artifact = runtime.lastArtifact || generateArtifact();
  const layer = engine?.activeLayer;
  if (!engine || !layer || !artifact) {
    status('Generate a Signature Lab artifact before committing');
    return;
  }
  engine.captureHistory?.();
  layer.ctx.drawImage(artifact.generatedCanvas, 0, 0);
  engine.redrawOverlay?.();
  engine.markChanged?.('Signature Lab artifact committed');
  status(`${modeLabel(artifact.mode)} committed to ${layer.name}`);
}

function exportArtifact() {
  const artifact = runtime.lastArtifact || generateArtifact();
  if (!artifact) return;
  artifact.generatedCanvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `domistika-${artifact.mode}-${Date.now()}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
    status('Signature Lab PNG exported');
  }, 'image/png');
}

function integratePenDeck(openPanel) {
  const addButton = () => {
    const actions = document.querySelector('#pendeckPanel .pd-actions');
    if (!actions || document.querySelector('#pendeckSignatureLab')) return false;
    const button = document.createElement('button');
    button.id = 'pendeckSignatureLab';
    button.type = 'button';
    button.textContent = 'Signature';
    button.addEventListener('click', () => {
      openPanel();
      window.dispatchEvent(new CustomEvent('pendeck:action', {
        detail: { action: 'signaturelab', source: 'domistika-v099' },
      }));
    });
    actions.appendChild(button);
    return true;
  };
  if (addButton()) return;
  const observer = new MutationObserver(() => {
    if (addButton()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;
  installCaptureHooks();
  waitFor('.control-deck', createUI);
}

export { runtime, generateArtifact, replayArtifact, commitArtifact };
