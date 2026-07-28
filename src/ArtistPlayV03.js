import { CanvasEngine } from './core/CanvasEngine.js';

const RECENT_KEY = 'domistika-v03-recent-colors';
const MAX_RECENT = 18;
const MAX_FRAMES = 120;
let latestEngine = null;
let recording = false;
let frames = [];
let lastCaptureAt = 0;
let playbackTimer = null;

const originalMarkChanged = CanvasEngine.prototype.markChanged;
CanvasEngine.prototype.markChanged = function markChangedV03(message) {
  latestEngine = this;
  const result = originalMarkChanged.call(this, message);
  document.dispatchEvent(new CustomEvent('domistika:v03-content', { detail: { engine: this, message } }));
  if (recording) captureFrame(this);
  return result;
};

const originalSetTool = CanvasEngine.prototype.setTool;
CanvasEngine.prototype.setTool = function setToolV03(tool) {
  latestEngine = this;
  return originalSetTool.call(this, tool);
};

function readJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const value = Number.parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  s /= 100; l /= 100;
  if (s === 0) {
    const value = Math.round(l * 255);
    return { r: value, g: value, b: value };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: Math.round(hue(h + 1 / 3) * 255), g: Math.round(hue(h) * 255), b: Math.round(hue(h - 1 / 3) * 255) };
}

function harmonyColors(hex, mode) {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  let offsets = [0];
  if (mode === 'complement') offsets = [0, 180];
  if (mode === 'analogous') offsets = [-35, 0, 35];
  if (mode === 'triad') offsets = [0, 120, 240];
  if (mode === 'split') offsets = [0, 150, 210];
  return offsets.map((offset) => {
    const next = hslToRgb(hsl.h + offset, hsl.s, hsl.l);
    return rgbToHex(next.r, next.g, next.b);
  });
}

function setActiveColor(color, remember = true) {
  const input = document.querySelector('#colorInput');
  if (!input) return;
  input.value = color;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  if (remember) addRecentColor(color);
}

function addRecentColor(color) {
  const normalized = color.toLowerCase();
  const recent = readJson(RECENT_KEY, []).filter((entry) => entry !== normalized);
  recent.unshift(normalized);
  writeJson(RECENT_KEY, recent.slice(0, MAX_RECENT));
  renderRecentColors();
}

function makeSwatch(color, title = color) {
  const button = document.createElement('button');
  button.className = 'v03-swatch';
  button.type = 'button';
  button.title = title;
  button.style.background = color;
  button.setAttribute('aria-label', `Use color ${color}`);
  button.addEventListener('click', () => setActiveColor(color));
  return button;
}

function renderRecentColors() {
  const host = document.querySelector('#v03RecentColors');
  if (!host) return;
  const recent = readJson(RECENT_KEY, []);
  host.innerHTML = '';
  if (!recent.length) {
    host.innerHTML = '<span class="v03-empty-note">Colors you use will appear here.</span>';
    return;
  }
  recent.forEach((color) => host.appendChild(makeSwatch(color)));
}

function renderHarmony(mode = 'complement') {
  const host = document.querySelector('#v03HarmonyColors');
  const input = document.querySelector('#colorInput');
  if (!host || !input) return;
  host.innerHTML = '';
  harmonyColors(input.value, mode).forEach((color) => host.appendChild(makeSwatch(color, `${mode}: ${color}`)));
}

function extractPalette(image, count = 8) {
  const canvas = document.createElement('canvas');
  canvas.width = 72;
  canvas.height = 72;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const buckets = new Map();
  for (let index = 0; index < data.length; index += 16) {
    const alpha = data[index + 3];
    if (alpha < 180) continue;
    const r = Math.round(data[index] / 24) * 24;
    const g = Math.round(data[index + 1] / 24) * 24;
    const b = Math.round(data[index + 2] / 24) * 24;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max > 242 && min > 230) continue;
    const key = `${clamp(r, 0, 255)},${clamp(g, 0, 255)},${clamp(b, 0, 255)}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
  const selected = [];
  for (const [key] of sorted) {
    const [r, g, b] = key.split(',').map(Number);
    const distinct = selected.every((color) => {
      const other = hexToRgb(color);
      return Math.hypot(r - other.r, g - other.g, b - other.b) > 48;
    });
    if (distinct) selected.push(rgbToHex(r, g, b));
    if (selected.length >= count) break;
  }
  return selected;
}

function imageFromSource(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function setStatus(message) {
  const status = document.querySelector('#statusMessage');
  if (status) status.textContent = message;
}

function captureFrame(engine) {
  const now = performance.now();
  if (!recording || !engine || now - lastCaptureAt < 140 || frames.length >= MAX_FRAMES) return;
  lastCaptureAt = now;
  try {
    const source = engine.compositeCanvas(true);
    const scale = Math.min(1, 720 / Math.max(source.width, source.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    frames.push(canvas.toDataURL('image/jpeg', 0.76));
    updateTimelapseUi();
    if (frames.length >= MAX_FRAMES) {
      recording = false;
      setStatus(`Time-lapse stopped at ${MAX_FRAMES} frames`);
      updateTimelapseUi();
    }
  } catch (error) {
    console.warn('Domistika time-lapse frame skipped', error);
  }
}

function updateTimelapseUi() {
  const count = document.querySelector('#v03FrameCount');
  const record = document.querySelector('#v03RecordButton');
  if (count) count.textContent = `${frames.length} frame${frames.length === 1 ? '' : 's'}`;
  if (record) {
    record.textContent = recording ? '■ Stop recording' : '● Start recording';
    record.classList.toggle('recording', recording);
  }
  const exportVideo = document.querySelector('#v03ExportVideo');
  const exportBoard = document.querySelector('#v03ExportStoryboard');
  const play = document.querySelector('#v03PlayTimelapse');
  [exportVideo, exportBoard, play].forEach((button) => { if (button) button.disabled = frames.length < 2; });
}

async function renderStoryboard() {
  if (!frames.length) return;
  const images = await Promise.all(frames.map(imageFromSource));
  const columns = Math.min(4, images.length);
  const cellWidth = 320;
  const ratio = images[0].height / images[0].width;
  const cellHeight = Math.round(cellWidth * ratio);
  const rows = Math.ceil(images.length / columns);
  const canvas = document.createElement('canvas');
  canvas.width = columns * cellWidth;
  canvas.height = rows * cellHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#151218';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  images.forEach((image, index) => {
    const x = (index % columns) * cellWidth;
    const y = Math.floor(index / columns) * cellHeight;
    ctx.drawImage(image, x, y, cellWidth, cellHeight);
    ctx.fillStyle = 'rgba(15,13,18,.72)';
    ctx.fillRect(x + 8, y + 8, 42, 22);
    ctx.fillStyle = '#fff';
    ctx.font = '12px system-ui';
    ctx.fillText(String(index + 1), x + 18, y + 24);
  });
  canvas.toBlob((blob) => blob && downloadBlob(blob, 'domistika-storyboard.png'), 'image/png');
}

async function exportVideo() {
  if (frames.length < 2) return;
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    setStatus('Video export is unavailable in this browser; use Storyboard instead');
    return;
  }
  const images = await Promise.all(frames.map(imageFromSource));
  const canvas = document.createElement('canvas');
  canvas.width = images[0].width;
  canvas.height = images[0].height;
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(10);
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type)) || '';
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
  recorder.start();
  for (const image of images) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    await new Promise((resolve) => setTimeout(resolve, 110));
  }
  await new Promise((resolve) => setTimeout(resolve, 350));
  recorder.stop();
  await stopped;
  downloadBlob(new Blob(chunks, { type: mimeType || 'video/webm' }), 'domistika-timelapse.webm');
  setStatus('Time-lapse video exported');
}

function startPlayback() {
  const canvas = document.querySelector('#v03PlaybackCanvas');
  if (!canvas || frames.length < 2) return;
  clearInterval(playbackTimer);
  let index = 0;
  const ctx = canvas.getContext('2d');
  const draw = async () => {
    const image = await imageFromSource(frames[index]);
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);
    index = (index + 1) % frames.length;
  };
  draw();
  playbackTimer = setInterval(draw, 170);
  setTimeout(() => {
    clearInterval(playbackTimer);
    playbackTimer = null;
  }, Math.min(16000, frames.length * 340));
}

function createStyles() {
  if (document.querySelector('#domistikaV03Styles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV03Styles';
  style.textContent = `
    .inspector-tabs{grid-template-columns:repeat(4,1fr)!important}.v03-launch{display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--ink);font-weight:700;cursor:pointer;white-space:nowrap}.v03-panel-section{display:grid;gap:10px;padding:12px 0;border-bottom:1px solid var(--line)}.v03-panel-section:last-child{border-bottom:0}.v03-panel-section h3{margin:0;font-size:13px}.v03-panel-section p{margin:2px 0 0;color:var(--muted);font-size:10px;line-height:1.45}.v03-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.v03-button-row{display:flex;flex-wrap:wrap;gap:6px}.v03-button{padding:7px 9px;border:1px solid var(--line);border-radius:9px;background:var(--panel2);color:var(--ink);cursor:pointer;font-size:10px}.v03-button:disabled{opacity:.45;cursor:not-allowed}.v03-button.recording{border-color:#ff6c86;background:rgba(255,73,104,.15);color:#ff99aa}.v03-swatch-grid{display:flex;flex-wrap:wrap;gap:7px}.v03-swatch{width:30px;height:30px;border:2px solid rgba(255,255,255,.16);border-radius:9px;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.18)}.v03-empty-note{color:var(--muted);font-size:10px}.v03-harmony-select{padding:7px;border:1px solid var(--line);border-radius:9px;background:var(--panel2);color:var(--ink);font-size:10px}.v03-ref-preview{min-height:120px;display:grid;place-items:center;border:1px dashed var(--line);border-radius:12px;color:var(--muted);font-size:10px;background:rgba(255,255,255,.025);overflow:hidden}.v03-ref-preview img{display:block;max-width:100%;max-height:200px;object-fit:contain}.v03-timelapse-meta{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:10px}.v03-playback{width:100%;min-height:100px;max-height:190px;object-fit:contain;border:1px solid var(--line);border-radius:11px;background:#fff}.v03-reference-board{position:fixed;left:34%;top:18%;width:320px;z-index:85;border:1px solid rgba(255,255,255,.16);border-radius:15px;background:rgba(20,16,24,.94);backdrop-filter:blur(16px);box-shadow:0 22px 70px rgba(0,0,0,.48);overflow:hidden;display:none}.v03-reference-board.visible{display:block}.v03-reference-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;border-bottom:1px solid var(--line);cursor:move}.v03-reference-head strong{font-size:11px}.v03-reference-head button{border:0;background:transparent;color:var(--muted);cursor:pointer}.v03-reference-stage{height:280px;display:grid;place-items:center;overflow:hidden;background:#24202a}.v03-reference-stage img{max-width:100%;max-height:100%;transform-origin:center;user-select:none;pointer-events:none}.v03-reference-controls{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:9px}.v03-reference-controls label{display:grid;gap:4px;color:var(--muted);font-size:9px}.v03-reference-controls input{width:100%;accent-color:var(--warm)}.v03-reference-actions{display:flex;gap:5px;padding:0 9px 9px}.v03-reference-actions button{flex:1;padding:6px;border:1px solid var(--line);border-radius:8px;background:var(--panel2);color:var(--ink);cursor:pointer;font-size:9px}.v03-badge{padding:5px 8px;border:1px solid rgba(116,231,170,.25);border-radius:999px;color:#9de3bb;background:rgba(67,179,120,.08);font-size:9px}.v03-drop-active{outline:3px dashed var(--warm);outline-offset:-8px}@media(max-width:1000px){.inspector-tabs{grid-template-columns:repeat(4,minmax(70px,1fr))!important;overflow-x:auto}.v03-reference-board{left:12px;top:76px;width:min(340px,calc(100vw - 24px))}}@media(max-width:680px){.v03-launch strong{display:none}.v03-reference-board{top:62px}.v03-reference-stage{height:220px}}
  `;
  document.head.appendChild(style);
}

function initUi() {
  const studio = document.querySelector('#studio');
  const inspector = document.querySelector('.inspector');
  const tabs = document.querySelector('.inspector-tabs');
  const controlDeck = document.querySelector('.control-deck');
  const layersPanel = document.querySelector('#layersPanel');
  const viewport = document.querySelector('#viewport');
  if (!studio || !inspector || !tabs || !controlDeck || !layersPanel || !viewport) return false;
  if (document.querySelector('#artistStudioPanel')) return true;
  createStyles();

  const tab = document.createElement('button');
  tab.dataset.panel = 'artistStudioPanel';
  tab.textContent = 'Artist Studio';
  tabs.appendChild(tab);

  const launch = document.createElement('button');
  launch.className = 'v03-launch';
  launch.type = 'button';
  launch.innerHTML = '<span>🎨</span><strong>Studio</strong>';
  controlDeck.appendChild(launch);

  const panel = document.createElement('section');
  panel.id = 'artistStudioPanel';
  panel.className = 'inspector-panel';
  panel.innerHTML = `
    <div class="panel-heading"><div><h2>Artist Play Studio</h2><p>Reference, color, and creation capture</p></div><span class="v03-badge">v0.3</span></div>
    <div class="v03-panel-section">
      <div class="v03-section-head"><div><h3>Reference Board</h3><p>Keep inspiration beside the canvas without importing it as a layer.</p></div></div>
      <input id="v03ReferenceInput" type="file" accept="image/*" hidden>
      <div class="v03-button-row"><button class="v03-button" id="v03LoadReference">Load image</button><button class="v03-button" id="v03ShowReference">Show board</button><button class="v03-button" id="v03ClearReference">Clear</button></div>
      <div class="v03-ref-preview" id="v03ReferencePreview">Drop an image here or choose Load image.</div>
      <div><h3>Extracted palette</h3><p>Click any color to paint with it.</p></div>
      <div class="v03-swatch-grid" id="v03ExtractedPalette"><span class="v03-empty-note">Load a reference to extract colors.</span></div>
    </div>
    <div class="v03-panel-section">
      <div><h3>Color Intelligence</h3><p>Recent colors and instant harmony suggestions.</p></div>
      <div class="v03-swatch-grid" id="v03RecentColors"></div>
      <select class="v03-harmony-select" id="v03HarmonyMode"><option value="complement">Complementary</option><option value="analogous">Analogous</option><option value="triad">Triadic</option><option value="split">Split complementary</option></select>
      <div class="v03-swatch-grid" id="v03HarmonyColors"></div>
    </div>
    <div class="v03-panel-section">
      <div><h3>Time-lapse Recorder</h3><p>Capture finished strokes, replay the process, and export a video or storyboard.</p></div>
      <div class="v03-timelapse-meta"><span id="v03FrameCount">0 frames</span><span>Maximum ${MAX_FRAMES}</span></div>
      <div class="v03-button-row"><button class="v03-button" id="v03RecordButton">● Start recording</button><button class="v03-button" id="v03PlayTimelapse" disabled>Play</button><button class="v03-button" id="v03ClearTimelapse">Clear</button></div>
      <canvas class="v03-playback" id="v03PlaybackCanvas"></canvas>
      <div class="v03-button-row"><button class="v03-button" id="v03ExportVideo" disabled>Export WebM</button><button class="v03-button" id="v03ExportStoryboard" disabled>Export storyboard</button></div>
    </div>
  `;
  inspector.appendChild(panel);

  const board = document.createElement('div');
  board.className = 'v03-reference-board';
  board.id = 'v03ReferenceBoard';
  board.innerHTML = `
    <div class="v03-reference-head" id="v03ReferenceDrag"><strong>Reference Board</strong><button id="v03ReferenceClose" aria-label="Hide reference board">×</button></div>
    <div class="v03-reference-stage"><img id="v03ReferenceImage" alt="Artist reference"></div>
    <div class="v03-reference-controls"><label>Opacity<input id="v03ReferenceOpacity" type="range" min="15" max="100" value="100"></label><label>Scale<input id="v03ReferenceScale" type="range" min="25" max="240" value="100"></label></div>
    <div class="v03-reference-actions"><button id="v03RotateLeft">↶ Rotate</button><button id="v03MirrorReference">↔ Mirror</button><button id="v03RotateRight">Rotate ↷</button></div>
  `;
  studio.appendChild(board);

  function activateStudio() {
    document.querySelectorAll('.inspector-tabs button').forEach((button) => button.classList.toggle('active', button === tab));
    document.querySelectorAll('.inspector-panel').forEach((item) => item.classList.toggle('active', item === panel));
    if (window.matchMedia('(max-width:1000px)').matches) studio.classList.add('brush-drawer-open');
  }
  tab.addEventListener('click', activateStudio);
  launch.addEventListener('click', activateStudio);

  const referenceInput = panel.querySelector('#v03ReferenceInput');
  const preview = panel.querySelector('#v03ReferencePreview');
  const paletteHost = panel.querySelector('#v03ExtractedPalette');
  const referenceImage = board.querySelector('#v03ReferenceImage');
  let referenceUrl = '';
  let referenceRotation = 0;
  let referenceMirrored = false;

  function updateReferenceTransform() {
    const scale = Number(board.querySelector('#v03ReferenceScale').value) / 100;
    referenceImage.style.transform = `scale(${referenceMirrored ? -scale : scale},${scale}) rotate(${referenceRotation}deg)`;
    referenceImage.style.opacity = String(Number(board.querySelector('#v03ReferenceOpacity').value) / 100);
  }

  async function loadReferenceFile(file) {
    if (!file?.type?.startsWith('image/')) return;
    if (referenceUrl) URL.revokeObjectURL(referenceUrl);
    referenceUrl = URL.createObjectURL(file);
    referenceImage.src = referenceUrl;
    const previewImage = document.createElement('img');
    previewImage.src = referenceUrl;
    preview.innerHTML = '';
    preview.appendChild(previewImage);
    const image = await imageFromSource(referenceUrl);
    const colors = extractPalette(image);
    paletteHost.innerHTML = '';
    colors.forEach((color) => paletteHost.appendChild(makeSwatch(color, `Extracted ${color}`)));
    board.classList.add('visible');
    setStatus(`${file.name} loaded into the Reference Board`);
  }

  panel.querySelector('#v03LoadReference').addEventListener('click', () => referenceInput.click());
  referenceInput.addEventListener('change', () => {
    const [file] = referenceInput.files;
    referenceInput.value = '';
    loadReferenceFile(file);
  });
  panel.querySelector('#v03ShowReference').addEventListener('click', () => {
    if (!referenceUrl) return setStatus('Load a reference image first');
    board.classList.add('visible');
  });
  panel.querySelector('#v03ClearReference').addEventListener('click', () => {
    if (referenceUrl) URL.revokeObjectURL(referenceUrl);
    referenceUrl = '';
    referenceImage.removeAttribute('src');
    preview.innerHTML = 'Drop an image here or choose Load image.';
    paletteHost.innerHTML = '<span class="v03-empty-note">Load a reference to extract colors.</span>';
    board.classList.remove('visible');
  });
  board.querySelector('#v03ReferenceClose').addEventListener('click', () => board.classList.remove('visible'));
  board.querySelector('#v03ReferenceOpacity').addEventListener('input', updateReferenceTransform);
  board.querySelector('#v03ReferenceScale').addEventListener('input', updateReferenceTransform);
  board.querySelector('#v03RotateLeft').addEventListener('click', () => { referenceRotation -= 90; updateReferenceTransform(); });
  board.querySelector('#v03RotateRight').addEventListener('click', () => { referenceRotation += 90; updateReferenceTransform(); });
  board.querySelector('#v03MirrorReference').addEventListener('click', () => { referenceMirrored = !referenceMirrored; updateReferenceTransform(); });

  function dropHandler(event) {
    event.preventDefault();
    preview.classList.remove('v03-drop-active');
    const file = [...event.dataTransfer.files].find((entry) => entry.type.startsWith('image/'));
    if (file) loadReferenceFile(file);
  }
  preview.addEventListener('dragover', (event) => { event.preventDefault(); preview.classList.add('v03-drop-active'); });
  preview.addEventListener('dragleave', () => preview.classList.remove('v03-drop-active'));
  preview.addEventListener('drop', dropHandler);

  let drag = null;
  board.querySelector('#v03ReferenceDrag').addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    drag = { x: event.clientX, y: event.clientY, left: board.offsetLeft, top: board.offsetTop };
    board.setPointerCapture(event.pointerId);
  });
  board.querySelector('#v03ReferenceDrag').addEventListener('pointermove', (event) => {
    if (!drag) return;
    board.style.left = `${clamp(drag.left + event.clientX - drag.x, 0, window.innerWidth - 80)}px`;
    board.style.top = `${clamp(drag.top + event.clientY - drag.y, 56, window.innerHeight - 80)}px`;
  });
  board.querySelector('#v03ReferenceDrag').addEventListener('pointerup', () => { drag = null; });

  renderRecentColors();
  renderHarmony();
  const colorInput = document.querySelector('#colorInput');
  colorInput?.addEventListener('change', () => {
    addRecentColor(colorInput.value);
    renderHarmony(panel.querySelector('#v03HarmonyMode').value);
  });
  panel.querySelector('#v03HarmonyMode').addEventListener('change', (event) => renderHarmony(event.target.value));

  panel.querySelector('#v03RecordButton').addEventListener('click', () => {
    recording = !recording;
    if (recording) {
      frames = [];
      if (latestEngine) captureFrame(latestEngine);
      setStatus('Time-lapse recording started');
    } else {
      setStatus(`Time-lapse stopped with ${frames.length} frames`);
    }
    updateTimelapseUi();
  });
  panel.querySelector('#v03PlayTimelapse').addEventListener('click', startPlayback);
  panel.querySelector('#v03ClearTimelapse').addEventListener('click', () => {
    recording = false;
    frames = [];
    const canvas = panel.querySelector('#v03PlaybackCanvas');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    updateTimelapseUi();
    setStatus('Time-lapse cleared');
  });
  panel.querySelector('#v03ExportVideo').addEventListener('click', exportVideo);
  panel.querySelector('#v03ExportStoryboard').addEventListener('click', renderStoryboard);
  updateTimelapseUi();

  document.documentElement.dataset.artistStudio = 'v0.3';
  return true;
}

function waitForStudio() {
  if (initUi()) return;
  setTimeout(waitForStudio, 80);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForStudio, { once: true });
else waitForStudio();
