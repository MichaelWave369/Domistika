const EFFECTS_STORAGE_KEY = 'domistika-effects-v08';

const defaults = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  blur: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  glow: 0,
  vignette: 0,
  pixelate: 1,
  posterize: 0,
  noise: 0,
};

const state = { ...defaults, previewOriginal: false };

const presets = {
  none: { ...defaults },
  cleanPop: { ...defaults, brightness: 105, contrast: 116, saturation: 118 },
  warmFilm: { ...defaults, brightness: 104, contrast: 108, saturation: 92, hue: 4, sepia: 18, vignette: 16, noise: 5 },
  coolNight: { ...defaults, brightness: 92, contrast: 124, saturation: 112, hue: 196, vignette: 28 },
  neonGlow: { ...defaults, brightness: 110, contrast: 132, saturation: 165, glow: 34 },
  monoInk: { ...defaults, contrast: 155, saturation: 0, grayscale: 100, posterize: 4 },
  dreamHaze: { ...defaults, brightness: 110, contrast: 92, saturation: 108, blur: 2.4, glow: 20, vignette: 8 },
  vintagePrint: { ...defaults, brightness: 102, contrast: 112, saturation: 76, sepia: 32, posterize: 8, noise: 10, vignette: 22 },
  pixelPop: { ...defaults, contrast: 122, saturation: 135, pixelate: 12 },
  solarCandy: { ...defaults, brightness: 108, contrast: 145, saturation: 180, hue: 42, invert: 18, glow: 18 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const engine = () => globalThis.domistikaEngine || globalThis.domistikaApp?.engine || null;

function status(message) {
  const active = engine();
  if (active?.onStatus) active.onStatus(message);
  else document.querySelector('#statusMessage')?.replaceChildren(message);
}

function activatePanel(panelId) {
  document.querySelectorAll('.inspector-tabs button').forEach((button) => button.classList.toggle('active', button.dataset.panel === panelId));
  document.querySelectorAll('.inspector-panel').forEach((panel) => panel.classList.toggle('active', panel.id === panelId));
}

function readStoredState() {
  try {
    const saved = JSON.parse(localStorage.getItem(EFFECTS_STORAGE_KEY) || 'null');
    if (saved && typeof saved === 'object') Object.assign(state, defaults, saved);
  } catch {
    // Keep defaults when storage is unavailable or malformed.
  }
}

function saveState() {
  try {
    localStorage.setItem(EFFECTS_STORAGE_KEY, JSON.stringify(Object.fromEntries(Object.keys(defaults).map((key) => [key, state[key]]))));
  } catch {
    // Effects continue to work without persistence.
  }
}

function filterString() {
  return [
    `brightness(${state.brightness}%)`,
    `contrast(${state.contrast}%)`,
    `saturate(${state.saturation}%)`,
    `hue-rotate(${state.hue}deg)`,
    `blur(${state.blur}px)`,
    `grayscale(${state.grayscale}%)`,
    `sepia(${state.sepia}%)`,
    `invert(${state.invert}%)`,
  ].join(' ');
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function applyPixelate(source, amount) {
  const pixelSize = Math.max(1, Math.round(amount));
  if (pixelSize <= 1) return source;
  const small = createCanvas(Math.max(1, source.width / pixelSize), Math.max(1, source.height / pixelSize));
  const smallCtx = small.getContext('2d');
  smallCtx.imageSmoothingEnabled = true;
  smallCtx.drawImage(source, 0, 0, small.width, small.height);
  const result = createCanvas(source.width, source.height);
  const resultCtx = result.getContext('2d');
  resultCtx.imageSmoothingEnabled = false;
  resultCtx.drawImage(small, 0, 0, result.width, result.height);
  return result;
}

function applyPosterizeAndNoise(canvas) {
  const levels = Math.round(state.posterize);
  const noiseAmount = clamp(state.noise / 100, 0, 1);
  if (levels <= 1 && noiseAmount <= 0) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  const divisor = levels > 1 ? Math.max(1, levels - 1) : 1;
  const step = levels > 1 ? 255 / divisor : 255;
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    if (levels > 1) {
      data[index] = Math.round(data[index] / step) * step;
      data[index + 1] = Math.round(data[index + 1] / step) * step;
      data[index + 2] = Math.round(data[index + 2] / step) * step;
    }
    if (noiseAmount > 0) {
      const noise = (Math.random() - 0.5) * 90 * noiseAmount;
      data[index] = clamp(data[index] + noise, 0, 255);
      data[index + 1] = clamp(data[index + 1] + noise, 0, 255);
      data[index + 2] = clamp(data[index + 2] + noise, 0, 255);
    }
  }
  ctx.putImageData(image, 0, 0);
}

function addGlow(canvas) {
  const amount = clamp(state.glow / 100, 0, 1);
  if (!amount) return;
  const source = createCanvas(canvas.width, canvas.height);
  source.getContext('2d').drawImage(canvas, 0, 0);
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = amount * 0.9;
  ctx.filter = `blur(${Math.max(2, amount * 28)}px) saturate(${120 + amount * 100}%)`;
  ctx.drawImage(source, 0, 0);
  ctx.restore();
}

function addVignette(canvas) {
  const amount = clamp(state.vignette / 100, 0, 1);
  if (!amount) return;
  const ctx = canvas.getContext('2d');
  const radius = Math.hypot(canvas.width, canvas.height) * 0.58;
  const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, radius * 0.18, canvas.width / 2, canvas.height / 2, radius);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(0.58, `rgba(0,0,0,${amount * 0.06})`);
  gradient.addColorStop(1, `rgba(0,0,0,${amount * 0.82})`);
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function processCanvas(sourceCanvas, outputWidth = sourceCanvas.width, outputHeight = sourceCanvas.height) {
  const filtered = createCanvas(outputWidth, outputHeight);
  const ctx = filtered.getContext('2d');
  ctx.filter = filterString();
  ctx.drawImage(sourceCanvas, 0, 0, outputWidth, outputHeight);
  ctx.filter = 'none';

  const pixelated = applyPixelate(filtered, state.pixelate);
  const result = createCanvas(outputWidth, outputHeight);
  result.getContext('2d').drawImage(pixelated, 0, 0);
  applyPosterizeAndNoise(result);
  addGlow(result);
  addVignette(result);
  return result;
}

function renderPreview() {
  const canvas = document.querySelector('#effectsPreview');
  const active = engine();
  const layer = active?.activeLayer;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f9f5fb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!layer) {
    ctx.fillStyle = '#6e6674';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Choose an active layer', canvas.width / 2, canvas.height / 2);
    return;
  }
  const scale = Math.min(canvas.width / active.width, canvas.height / active.height);
  const width = Math.max(1, Math.round(active.width * scale));
  const height = Math.max(1, Math.round(active.height * scale));
  const x = (canvas.width - width) / 2;
  const y = (canvas.height - height) / 2;
  const processed = state.previewOriginal ? layer.canvas : processCanvas(layer.canvas, width, height);
  ctx.drawImage(processed, x, y, width, height);
  ctx.strokeStyle = 'rgba(127,90,240,.24)';
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
}

function syncControls() {
  document.querySelectorAll('[data-effect-key]').forEach((input) => {
    input.value = String(state[input.dataset.effectKey]);
    const output = document.querySelector(`[data-effect-output="${input.id}"]`);
    if (output) output.textContent = `${input.value}${input.dataset.suffix || ''}`;
  });
  const compare = document.querySelector('#effectsCompare');
  if (compare) {
    compare.classList.toggle('active', state.previewOriginal);
    compare.textContent = state.previewOriginal ? 'Showing original' : 'Compare original';
  }
  saveState();
  renderPreview();
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;
  Object.assign(state, defaults, preset, { previewOriginal: false });
  document.querySelectorAll('[data-effects-preset]').forEach((button) => button.classList.toggle('active', button.dataset.effectsPreset === name));
  const select = document.querySelector('#effectsPreset');
  if (select) select.value = name;
  syncControls();
  status(`${buttonLabel(name)} effect preview loaded`);
}

function buttonLabel(name) {
  return name.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

function markCustom() {
  const select = document.querySelector('#effectsPreset');
  if (select) select.value = 'custom';
  document.querySelectorAll('[data-effects-preset]').forEach((button) => button.classList.remove('active'));
}

function commitEffects() {
  const active = engine();
  const layer = active?.activeLayer;
  if (!active || !layer) return status('Choose an active layer first');
  state.previewOriginal = false;
  active.captureHistory?.();
  const processed = processCanvas(layer.canvas);
  layer.ctx.clearRect(0, 0, active.width, active.height);
  layer.ctx.drawImage(processed, 0, 0);
  active.markChanged?.(`Effects applied to ${layer.name}`);
  renderPreview();
}

function applyToCopy() {
  const active = engine();
  const source = active?.activeLayer;
  if (!active || !source) return status('Choose an active layer first');
  const processed = processCanvas(source.canvas);
  const newLayer = active.createLayer(`${source.name} FX`, {
    opacity: source.opacity,
    blendMode: source.blendMode,
    visible: true,
  });
  newLayer.ctx.drawImage(processed, 0, 0);
  active.markChanged?.(`Effects copy created from ${source.name}`);
  renderPreview();
}

function resetEffects() {
  Object.assign(state, defaults, { previewOriginal: false });
  const select = document.querySelector('#effectsPreset');
  if (select) select.value = 'none';
  document.querySelectorAll('[data-effects-preset]').forEach((button) => button.classList.toggle('active', button.dataset.effectsPreset === 'none'));
  syncControls();
  status('Effects reset');
}

function randomizeEffects() {
  Object.assign(state, {
    brightness: Math.round(85 + Math.random() * 35),
    contrast: Math.round(80 + Math.random() * 85),
    saturation: Math.round(55 + Math.random() * 145),
    hue: Math.round(Math.random() * 360),
    blur: Number((Math.random() * 3.5).toFixed(1)),
    grayscale: Math.random() > 0.75 ? Math.round(Math.random() * 100) : 0,
    sepia: Math.round(Math.random() * 42),
    invert: Math.random() > 0.85 ? Math.round(Math.random() * 45) : 0,
    glow: Math.round(Math.random() * 42),
    vignette: Math.round(Math.random() * 38),
    pixelate: Math.random() > 0.7 ? Math.round(2 + Math.random() * 14) : 1,
    posterize: Math.random() > 0.65 ? Math.round(3 + Math.random() * 9) : 0,
    noise: Math.round(Math.random() * 15),
    previewOriginal: false,
  });
  markCustom();
  syncControls();
  status('Random finishing look generated');
}

function injectStyles() {
  if (document.querySelector('#effectsV08Styles')) return;
  const style = document.createElement('style');
  style.id = 'effectsV08Styles';
  style.textContent = `
    .effects-open,.effects-btn,.effects-chip,.effects-select{border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--ink);cursor:pointer}
    .effects-open{display:flex;align-items:center;gap:7px;padding:8px 10px;font-weight:700}.effects-open span{font-size:17px}
    .effects-shell{display:grid;gap:11px}.effects-preview{width:100%;height:auto;border:1px solid var(--line);border-radius:14px;background:#fff}
    .effects-chips{display:flex;gap:6px;flex-wrap:wrap}.effects-chip{padding:6px 8px;font-size:10px}.effects-chip.active{background:rgba(127,90,240,.15);border-color:rgba(127,90,240,.4)}
    .effects-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.effects-grid label,.effects-stack{display:grid;gap:5px;color:var(--muted);font-size:10px}.effects-grid output{justify-self:end;color:var(--ink)}
    .effects-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.effects-btn{padding:9px}.effects-btn.primary{background:rgba(255,191,105,.15);border-color:rgba(255,191,105,.4)}.effects-btn.active{background:rgba(127,90,240,.16)}
    .effects-note{margin:0;font-size:10px;line-height:1.5;color:var(--muted)}
    @media(max-width:900px){.effects-grid,.effects-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function buildUI() {
  if (document.querySelector('#effectsPanel')) return;
  const deck = document.querySelector('.control-deck');
  const tabs = document.querySelector('.inspector-tabs');
  const inspector = document.querySelector('.inspector');
  if (!deck || !tabs || !inspector) return;
  injectStyles();

  const open = document.createElement('button');
  open.className = 'effects-open';
  open.innerHTML = '<span>✦</span><strong>Effects</strong>';
  open.onclick = () => { activatePanel('effectsPanel'); renderPreview(); };
  deck.appendChild(open);

  const tab = document.createElement('button');
  tab.dataset.panel = 'effectsPanel';
  tab.textContent = 'Effects';
  tab.onclick = () => { activatePanel('effectsPanel'); renderPreview(); };
  tabs.appendChild(tab);

  const panel = document.createElement('section');
  panel.id = 'effectsPanel';
  panel.className = 'inspector-panel';
  const presetButtons = ['none', 'cleanPop', 'warmFilm', 'coolNight', 'neonGlow', 'monoInk', 'dreamHaze', 'vintagePrint', 'pixelPop', 'solarCandy'];
  const controls = [
    ['brightness', 'Brightness', 20, 200, 1, '%'],
    ['contrast', 'Contrast', 20, 220, 1, '%'],
    ['saturation', 'Saturation', 0, 240, 1, '%'],
    ['hue', 'Hue rotation', 0, 360, 1, '°'],
    ['blur', 'Blur', 0, 18, 0.1, 'px'],
    ['grayscale', 'Grayscale', 0, 100, 1, '%'],
    ['sepia', 'Sepia', 0, 100, 1, '%'],
    ['invert', 'Invert', 0, 100, 1, '%'],
    ['glow', 'Glow', 0, 100, 1, '%'],
    ['vignette', 'Vignette', 0, 100, 1, '%'],
    ['pixelate', 'Pixel size', 1, 40, 1, 'px'],
    ['posterize', 'Posterize levels', 0, 16, 1, ''],
    ['noise', 'Film grain', 0, 100, 1, '%'],
  ];

  panel.innerHTML = `<div class="effects-shell">
    <div class="panel-heading"><div><h2>Effects & Finishing</h2><p>Preview a look, then commit it to the active layer.</p></div></div>
    <canvas id="effectsPreview" class="effects-preview" width="320" height="220"></canvas>
    <div class="effects-stack">Preset<select id="effectsPreset" class="effects-select">${presetButtons.map((name) => `<option value="${name}">${buttonLabel(name)}</option>`).join('')}<option value="custom">Custom</option></select></div>
    <div class="effects-chips">${presetButtons.slice(0, 7).map((name) => `<button class="effects-chip" data-effects-preset="${name}">${buttonLabel(name)}</button>`).join('')}</div>
    <div class="effects-grid">${controls.map(([key,label,min,max,step,suffix]) => `<label>${label}<output data-effect-output="effect-${key}"></output><input id="effect-${key}" data-effect-key="${key}" data-suffix="${suffix}" type="range" min="${min}" max="${max}" step="${step}"></label>`).join('')}</div>
    <div class="effects-actions"><button id="effectsApply" class="effects-btn primary">Apply to layer</button><button id="effectsCopy" class="effects-btn">Apply to copy</button><button id="effectsCompare" class="effects-btn">Compare original</button><button id="effectsRandom" class="effects-btn">Random look</button><button id="effectsReset" class="effects-btn">Reset</button><button id="effectsRefresh" class="effects-btn">Refresh preview</button></div>
    <p class="effects-note">Apply to layer creates one drawing-history checkpoint. Apply to copy preserves the original and creates a new FX layer. Transparent pixels remain transparent.</p>
  </div>`;
  inspector.appendChild(panel);

  document.querySelector('#effectsPreset').onchange = (event) => event.target.value !== 'custom' && applyPreset(event.target.value);
  document.querySelectorAll('[data-effects-preset]').forEach((button) => button.onclick = () => applyPreset(button.dataset.effectsPreset));
  document.querySelectorAll('[data-effect-key]').forEach((input) => {
    input.oninput = () => {
      state[input.dataset.effectKey] = Number(input.value);
      const output = document.querySelector(`[data-effect-output="${input.id}"]`);
      if (output) output.textContent = `${input.value}${input.dataset.suffix || ''}`;
      state.previewOriginal = false;
      markCustom();
      saveState();
      renderPreview();
    };
  });
  document.querySelector('#effectsApply').onclick = commitEffects;
  document.querySelector('#effectsCopy').onclick = applyToCopy;
  document.querySelector('#effectsCompare').onclick = () => { state.previewOriginal = !state.previewOriginal; syncControls(); };
  document.querySelector('#effectsRandom').onclick = randomizeEffects;
  document.querySelector('#effectsReset').onclick = resetEffects;
  document.querySelector('#effectsRefresh').onclick = () => { renderPreview(); status('Effects preview refreshed'); };

  syncControls();
}

function waitForStudio() {
  if (!document.querySelector('.control-deck') || !document.querySelector('.inspector-tabs') || !engine()) return requestAnimationFrame(waitForStudio);
  buildUI();
  let lastLayerId = engine()?.activeLayerId;
  setInterval(() => {
    const nextLayerId = engine()?.activeLayerId;
    if (nextLayerId !== lastLayerId) {
      lastLayerId = nextLayerId;
      renderPreview();
    }
  }, 500);
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, select, textarea')) return;
    if (event.key.toLowerCase() === 'j' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      activatePanel('effectsPanel');
      renderPreview();
    }
  });
}

readStoredState();
waitForStudio();
