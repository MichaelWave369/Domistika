import { CanvasEngine } from './core/CanvasEngine.js';

const VERSION = '1.0.0';
const INSTALL_FLAG = '__domistikaCreatureLabV100Installed';
const MODES = [
  ['mirror-creature', 'Mirror Creature'],
  ['totem-builder', 'Totem Builder'],
  ['mask-mode', 'Mask Mode'],
  ['inkblot-character-lab', 'Inkblot Character Lab'],
  ['little-people', 'Little People'],
  ['crowd-builder', 'Crowd Builder'],
];

const runtime = {
  version: VERSION,
  engine: null,
  lastArtifact: null,
  settings: {
    mode: 'mirror-creature', axis: 'vertical', rows: 3, cols: 4,
    scale: 1, spacing: 1, jitter: 0.12, padding: 36,
    outline: true, keepColors: true, palette: 'playful', view: 'generated',
  },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const status = (text) => { const n = document.querySelector('#statusMessage'); if (n) n.textContent = text; };
const createCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };

function rememberEngine() {
  const wrap = (name) => {
    const original = CanvasEngine.prototype[name];
    CanvasEngine.prototype[name] = function creatureLabEngineTap(...args) {
      runtime.engine = this;
      return original.apply(this, args);
    };
  };
  wrap('pointerDown');
  wrap('pointerMove');
}

function activeLayer() {
  return runtime.engine?.activeLayer ?? null;
}

function visibleBounds(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 8) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return null;
  const p = Math.max(0, Number(runtime.settings.padding) || 0);
  minX = Math.max(0, minX - p); minY = Math.max(0, minY - p);
  maxX = Math.min(width - 1, maxX + p); maxY = Math.min(height - 1, maxY + p);
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function crop(source, rect) {
  const out = createCanvas(rect.width, rect.height);
  out.getContext('2d').drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  return out;
}

function mirror(source) {
  const vertical = runtime.settings.axis === 'vertical';
  const out = createCanvas(vertical ? source.width * 2 : source.width, vertical ? source.height : source.height * 2);
  const ctx = out.getContext('2d');
  ctx.drawImage(source, 0, 0);
  ctx.save();
  if (vertical) { ctx.translate(out.width, 0); ctx.scale(-1, 1); }
  else { ctx.translate(0, out.height); ctx.scale(1, -1); }
  ctx.drawImage(source, 0, 0);
  ctx.restore();
  return out;
}

const PALETTES = {
  playful: ['#f33127', '#2550e6', '#f5f5f5', '#79de16', '#8b39ec'],
  totem: ['#f2ead8', '#d75c37', '#25242b', '#81906c', '#d4a744'],
  neon: ['#eaff22', '#02e7ed', '#ff51cf', '#16161a', '#ff6a24'],
  mask: ['#e8e2da', '#333641', '#c94742', '#627be0', '#c4a34b'],
};

function recolor(source) {
  if (runtime.settings.keepColors) return source;
  const palette = PALETTES[runtime.settings.palette] ?? PALETTES.playful;
  const out = createCanvas(source.width, source.height);
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, out.width, out.height);
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i + 3] <= 8) continue;
    if (image.data[i] < 45 && image.data[i + 1] < 45 && image.data[i + 2] < 45) continue;
    const pixel = i / 4;
    const color = palette[(pixel * 17) % palette.length];
    image.data[i] = parseInt(color.slice(1, 3), 16);
    image.data[i + 1] = parseInt(color.slice(3, 5), 16);
    image.data[i + 2] = parseInt(color.slice(5, 7), 16);
  }
  ctx.putImageData(image, 0, 0);
  return out;
}

function outline(source) {
  if (!runtime.settings.outline) return source;
  const out = createCanvas(source.width, source.height);
  const ctx = out.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, out.width, out.height);
  const copy = new Uint8ClampedArray(image.data);
  const alpha = (x, y) => (x < 0 || y < 0 || x >= out.width || y >= out.height) ? 0 : copy[(y * out.width + x) * 4 + 3];
  for (let y = 0; y < out.height; y += 1) {
    for (let x = 0; x < out.width; x += 1) {
      const i = (y * out.width + x) * 4;
      if (copy[i + 3] <= 8) continue;
      if (alpha(x - 1, y) <= 8 || alpha(x + 1, y) <= 8 || alpha(x, y - 1) <= 8 || alpha(x, y + 1) <= 8) {
        image.data[i] = 18; image.data[i + 1] = 18; image.data[i + 2] = 18; image.data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return out;
}

function crowd(source) {
  const { rows, cols, spacing, scale, jitter } = runtime.settings;
  const gap = 16 * spacing;
  const cw = source.width * scale, ch = source.height * scale;
  const out = createCanvas(cols * cw + (cols + 1) * gap, rows * ch + (rows + 1) * gap);
  const ctx = out.getContext('2d');
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const seed = row * cols + col + 1;
      const x = gap + col * (cw + gap) + Math.sin(seed * 11) * gap * jitter * 0.5;
      const y = gap + row * (ch + gap) + Math.cos(seed * 13) * gap * jitter * 0.5;
      ctx.save();
      ctx.translate(x + cw / 2, y + ch / 2);
      ctx.rotate(Math.sin(seed * 5) * 0.08 * jitter);
      if ((row + col) % 2) ctx.scale(-1, 1);
      ctx.drawImage(source, -cw / 2, -ch / 2, cw, ch);
      ctx.restore();
    }
  }
  return out;
}

function overlay(original, generated) {
  const out = createCanvas(Math.max(original.width, generated.width), Math.max(original.height, generated.height));
  const ctx = out.getContext('2d');
  ctx.drawImage(generated, (out.width - generated.width) / 2, (out.height - generated.height) / 2);
  ctx.save(); ctx.globalAlpha = 0.28;
  ctx.drawImage(original, (out.width - original.width) / 2, (out.height - original.height) / 2);
  ctx.restore();
  return out;
}

function buildArtifact() {
  const layer = activeLayer();
  if (!layer?.canvas) { status('Draw something first, then open Creature Lab'); return null; }
  const rect = visibleBounds(layer.canvas);
  if (!rect) { status('Creature Lab could not find visible pixels on this layer'); return null; }
  const original = crop(layer.canvas, rect);
  let seed = recolor(original);
  const groupMode = runtime.settings.mode === 'little-people' || runtime.settings.mode === 'crowd-builder';
  let generated = groupMode ? crowd(seed) : mirror(seed);
  if (runtime.settings.mode === 'inkblot-character-lab') generated = mirror(recolor(original));
  generated = outline(generated);
  const preview = runtime.settings.view === 'original' ? original : runtime.settings.view === 'overlay' ? overlay(original, generated) : generated;
  const artifact = { version: VERSION, mode: runtime.settings.mode, settings: { ...runtime.settings }, rect, original, generated, preview };
  runtime.lastArtifact = artifact;
  window.dispatchEvent(new CustomEvent('creaturelab:artifact', { detail: artifact }));
  window.dispatchEvent(new CustomEvent('domistika:cc-sketch', { detail: {
    source: 'domistika-creature-lab-v100', version: VERSION, mode: artifact.mode,
    settings: artifact.settings, snapshotDataUrl: generated.toDataURL('image/png'),
  }}));
  return artifact;
}

function renderPreview() {
  const canvas = document.querySelector('#creatureLabPreviewCanvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const source = runtime.lastArtifact?.preview;
  if (!source) return;
  const s = Math.min(canvas.width / source.width, canvas.height / source.height);
  const w = source.width * s, h = source.height * s;
  ctx.drawImage(source, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
}

function commitArtifact() {
  const artifact = runtime.lastArtifact ?? buildArtifact();
  const engine = runtime.engine;
  const layer = engine?.activeLayer;
  if (!artifact || !layer) return;
  engine.captureHistory?.();
  const s = Math.min(engine.width / artifact.generated.width, engine.height / artifact.generated.height, 1);
  const w = artifact.generated.width * s, h = artifact.generated.height * s;
  layer.ctx.drawImage(artifact.generated, (engine.width - w) / 2, (engine.height - h) / 2, w, h);
  engine.markChanged?.('Creature Lab artifact committed');
  status('Creature Lab result committed to the active layer');
}

function exportPNG() {
  const artifact = runtime.lastArtifact ?? buildArtifact();
  artifact?.generated.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `domistika-${artifact.mode}-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}

function injectStyles() {
  if (document.querySelector('#creatureLabV100Styles')) return;
  const style = document.createElement('style');
  style.id = 'creatureLabV100Styles';
  style.textContent = `
    #creatureLabToggle{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
    #creatureLabToggle .cl-dot{width:7px;height:7px;border-radius:50%;background:#ff9f43;box-shadow:0 0 0 2px rgba(255,159,67,.18)}
    #creatureLabPanel{position:fixed;right:24px;bottom:76px;z-index:2147482600;width:min(390px,calc(100vw - 24px));padding:12px;border:1px solid rgba(255,170,90,.25);border-radius:16px;background:rgba(15,12,22,.975);box-shadow:0 20px 55px rgba(0,0,0,.5);color:#f6f0ff;font:12px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;backdrop-filter:blur(16px)}
    #creatureLabPanel[hidden]{display:none}.cl-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.cl-kicker{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#ffbd75;font-weight:800}.cl-title{font-size:16px;font-weight:800}
    #creatureLabPanel label{display:grid;gap:4px;color:#b2a8c2;font-size:10px;font-weight:700}.cl-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cl-range{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:center}.cl-range output{color:#f7d8ad;min-width:42px;text-align:right}
    #creatureLabPanel select{width:100%;border:1px solid #332c40;background:#171320;color:#f6f0ff;border-radius:9px;padding:7px 8px}.cl-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0}#creatureLabPanel button{border:1px solid #382f45;background:#191521;color:#efe8f8;border-radius:9px;padding:8px 7px;cursor:pointer;font:inherit}#creatureLabPanel button:hover{border-color:#ffb45f;color:#ffd8a5}
    #creatureLabPreview{height:220px;border:1px solid #30293a;border-radius:12px;overflow:hidden;background:#f0eef3}#creatureLabPreview canvas{width:100%;height:100%;display:block}.cl-hint{margin-top:8px;color:#8b8199;font-size:10px}
    @media(max-width:720px){#creatureLabPanel{right:12px;bottom:64px;width:calc(100vw - 24px)}#creatureLabPreview{height:180px}}
  `;
  document.head.appendChild(style);
}

function createUI(deck) {
  if (document.querySelector('#creatureLabPanel')) return;
  injectStyles();
  const toggle = document.createElement('button');
  toggle.id = 'creatureLabToggle'; toggle.className = 'toggle-button'; toggle.type = 'button';
  toggle.innerHTML = '<span class="cl-dot"></span><span>Creature</span>';
  toggle.title = 'Creature Lab — mirror creatures, masks, little people and crowds';
  deck.appendChild(toggle);

  const panel = document.createElement('section');
  panel.id = 'creatureLabPanel'; panel.hidden = true;
  panel.innerHTML = `
    <div class="cl-head"><div><div class="cl-kicker">Character Discovery</div><div class="cl-title">Creature Lab v1.0.0</div></div><button class="cl-close" type="button">×</button></div>
    <label>Mode<select id="clMode">${MODES.map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>
    <div class="cl-grid">
      <label>Mirror axis<select id="clAxis"><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option></select></label>
      <label>Preview<select id="clView"><option value="generated">Generated</option><option value="original">Original</option><option value="overlay">Overlay</option></select></label>
      <label>Rows<span class="cl-range"><input id="clRows" type="range" min="1" max="8" value="3"><output>3</output></span></label>
      <label>Columns<span class="cl-range"><input id="clCols" type="range" min="1" max="8" value="4"><output>4</output></span></label>
      <label>Scale<span class="cl-range"><input id="clScale" type="range" min="50" max="180" value="100"><output>1.00×</output></span></label>
      <label>Spacing<span class="cl-range"><input id="clSpacing" type="range" min="50" max="250" value="100"><output>1.00×</output></span></label>
      <label>Jitter<span class="cl-range"><input id="clJitter" type="range" min="0" max="100" value="12"><output>12%</output></span></label>
      <label>Palette<select id="clPalette"><option value="playful">Playful</option><option value="totem">Totem</option><option value="neon">Neon</option><option value="mask">Mask</option></select></label>
    </div>
    <div class="cl-actions"><button id="clGenerate">Generate</button><button id="clCommit">Commit</button><button id="clExport">Export PNG</button><button id="clOutline">Outline On</button><button id="clColors">Keep Colors</button><button id="clClear">Clear</button></div>
    <div id="creatureLabPreview"><canvas id="creatureLabPreviewCanvas" width="720" height="420"></canvas></div>
    <div class="cl-hint">Draw a weird shape or little person on the active layer. Mirror Creature, Totem, Mask and Inkblot reflect it; Little People and Crowd Builder multiply it into a cast.</div>`;
  document.body.appendChild(panel);

  const $ = (s) => panel.querySelector(s);
  toggle.addEventListener('click', () => { panel.hidden = !panel.hidden; });
  $('.cl-close').addEventListener('click', () => { panel.hidden = true; });
  $('#clMode').addEventListener('change', (e) => { runtime.settings.mode = e.target.value; });
  $('#clAxis').addEventListener('change', (e) => { runtime.settings.axis = e.target.value; });
  $('#clView').addEventListener('change', (e) => { runtime.settings.view = e.target.value; if (runtime.lastArtifact) { runtime.lastArtifact.preview = e.target.value === 'original' ? runtime.lastArtifact.original : e.target.value === 'overlay' ? overlay(runtime.lastArtifact.original, runtime.lastArtifact.generated) : runtime.lastArtifact.generated; renderPreview(); } });
  $('#clPalette').addEventListener('change', (e) => { runtime.settings.palette = e.target.value; });
  const bind = (id, key, parse, format) => { const input = $(id); const out = input.nextElementSibling; const sync = () => { runtime.settings[key] = parse(input.value); out.textContent = format(runtime.settings[key]); }; input.addEventListener('input', sync); sync(); };
  bind('#clRows', 'rows', Number, String); bind('#clCols', 'cols', Number, String);
  bind('#clScale', 'scale', (v) => Number(v)/100, (v) => `${v.toFixed(2)}×`);
  bind('#clSpacing', 'spacing', (v) => Number(v)/100, (v) => `${v.toFixed(2)}×`);
  bind('#clJitter', 'jitter', (v) => Number(v)/100, (v) => `${Math.round(v*100)}%`);
  $('#clGenerate').addEventListener('click', () => { const a = buildArtifact(); if (a) { renderPreview(); status(`${MODES.find(([v]) => v === a.mode)?.[1] ?? a.mode} generated`); } });
  $('#clCommit').addEventListener('click', commitArtifact); $('#clExport').addEventListener('click', exportPNG);
  $('#clOutline').addEventListener('click', (e) => { runtime.settings.outline = !runtime.settings.outline; e.currentTarget.textContent = runtime.settings.outline ? 'Outline On' : 'Outline Off'; });
  $('#clColors').addEventListener('click', (e) => { runtime.settings.keepColors = !runtime.settings.keepColors; e.currentTarget.textContent = runtime.settings.keepColors ? 'Keep Colors' : 'Auto Palette'; });
  $('#clClear').addEventListener('click', () => { runtime.lastArtifact = null; renderPreview(); });

  const addPenDeckButton = () => {
    const actions = document.querySelector('#pendeckPanel .pd-actions');
    if (!actions || document.querySelector('#pendeckCreatureLab')) return false;
    const b = document.createElement('button'); b.id = 'pendeckCreatureLab'; b.type = 'button'; b.textContent = 'Creature';
    b.addEventListener('click', () => { panel.hidden = false; window.dispatchEvent(new CustomEvent('pendeck:action', { detail: { action: 'creaturelab', source: 'domistika-v100' } })); });
    actions.appendChild(b); return true;
  };
  if (!addPenDeckButton()) { const obs = new MutationObserver(() => { if (addPenDeckButton()) obs.disconnect(); }); obs.observe(document.documentElement, { childList: true, subtree: true }); }
}

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;
  rememberEngine();
  const boot = () => { const deck = document.querySelector('.control-deck'); if (!deck) return false; createUI(deck); return true; };
  if (!boot()) { const obs = new MutationObserver(() => { if (boot()) obs.disconnect(); }); obs.observe(document.documentElement, { childList: true, subtree: true }); }
}

export { runtime, buildArtifact, commitArtifact };
