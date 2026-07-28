import { CanvasEngine } from './core/CanvasEngine.js';

const originalCreateLayer = CanvasEngine.prototype.createLayer;
if (!CanvasEngine.prototype.__spiroEngineBridge) {
  CanvasEngine.prototype.__spiroEngineBridge = true;
  CanvasEngine.prototype.createLayer = function (...args) {
    globalThis.domistikaEngine = this;
    return originalCreateLayer.apply(this, args);
  };
}

const state = {
  preset: 'classic', mode: 'hypotrochoid', R: 84, r: 35, d: 54,
  diameter: 360, turns: 24, lineWidth: 4, opacity: 0.92,
  rotation: 0, quality: 2400, placementArmed: false,
};

const presets = {
  classic: { mode: 'hypotrochoid', R: 84, r: 35, d: 54, diameter: 360, turns: 24, lineWidth: 4, opacity: 0.92, rotation: 0, quality: 2400 },
  flower: { mode: 'hypotrochoid', R: 96, r: 32, d: 74, diameter: 380, turns: 26, lineWidth: 3, opacity: 0.88, rotation: 0, quality: 2600 },
  starburst: { mode: 'epitrochoid', R: 54, r: 18, d: 37, diameter: 340, turns: 28, lineWidth: 3, opacity: 0.95, rotation: 8, quality: 2800 },
  orbit: { mode: 'epitrochoid', R: 65, r: 27, d: 20, diameter: 320, turns: 20, lineWidth: 5, opacity: 0.72, rotation: 0, quality: 2200 },
  gear: { mode: 'hypotrochoid', R: 110, r: 44, d: 18, diameter: 360, turns: 18, lineWidth: 4, opacity: 0.9, rotation: 0, quality: 2100 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const engine = () => globalThis.domistikaEngine || null;
const status = (message) => {
  const active = engine();
  if (active?.onStatus) active.onStatus(message);
  else document.querySelector('#statusMessage')?.replaceChildren(message);
};

function activatePanel(panelId) {
  document.querySelectorAll('.inspector-tabs button').forEach((button) => button.classList.toggle('active', button.dataset.panel === panelId));
  document.querySelectorAll('.inspector-panel').forEach((panel) => panel.classList.toggle('active', panel.id === panelId));
}

function currentColor() { return engine()?.settings?.color || '#1b1820'; }
function currentOpacity() { return clamp(Number(engine()?.settings?.opacity ?? 1), 0.04, 1); }

function computePoints(overrides = {}) {
  const config = { ...state, ...overrides };
  const total = clamp(Math.round(config.quality || 2400), 360, 10000);
  const maxT = Math.PI * 2 * Math.max(1, config.turns);
  const raw = [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i <= total; i += 1) {
    const t = maxT * (i / total);
    let x, y;
    if (config.mode === 'epitrochoid') {
      const k = (config.R + config.r) / config.r;
      x = (config.R + config.r) * Math.cos(t) - config.d * Math.cos(k * t);
      y = (config.R + config.r) * Math.sin(t) - config.d * Math.sin(k * t);
    } else {
      const k = (config.R - config.r) / config.r;
      x = (config.R - config.r) * Math.cos(t) + config.d * Math.cos(k * t);
      y = (config.R - config.r) * Math.sin(t) - config.d * Math.sin(k * t);
    }
    raw.push({ x, y });
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const scale = Math.max(10, config.diameter) / Math.max(1, maxX - minX, maxY - minY);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const angle = (config.rotation * Math.PI) / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return raw.map((point) => {
    const x = (point.x - cx) * scale, y = (point.y - cy) * scale;
    return { x: x * cos - y * sin, y: x * sin + y * cos };
  });
}

function trace(ctx, centerX, centerY, options = {}) {
  const points = computePoints(options.config);
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(((options.rotation || 0) * Math.PI) / 180);
  ctx.scale((options.scaleX ?? options.scale ?? 1), (options.scaleY ?? options.scale ?? 1));
  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.stroke();
  ctx.restore();
}

function drawAt(x, y, options = {}) {
  const active = engine();
  const layer = active?.activeLayer;
  if (!active || !layer) { status('Choose an active layer first'); return false; }
  if (options.capture !== false) active.captureHistory?.();
  const ctx = layer.ctx;
  ctx.save();
  ctx.globalCompositeOperation = options.blendMode || 'source-over';
  ctx.strokeStyle = options.color || currentColor();
  ctx.globalAlpha = clamp((options.opacity ?? state.opacity) * currentOpacity(), 0.02, 1);
  ctx.lineWidth = Math.max(0.5, options.lineWidth ?? state.lineWidth);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  trace(ctx, x, y, options);
  ctx.restore();
  if (options.mark !== false) active.markChanged?.(options.message || `Spirograph drawn on ${layer.name}`);
  return true;
}

function drawBatch(items, options = {}) {
  const active = engine();
  if (!active?.activeLayer || !items.length) return false;
  active.captureHistory?.();
  for (const item of items) drawAt(item.x, item.y, { ...options, ...item, capture: false, mark: false });
  active.markChanged?.(options.message || `${items.length} spirographs drawn`);
  return true;
}

function preview() {
  const canvas = document.querySelector('#spiroPreview');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fffafc'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.strokeStyle = currentColor();
  ctx.globalAlpha = state.opacity * currentOpacity();
  ctx.lineWidth = Math.max(1, state.lineWidth * 0.65);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const points = computePoints({ diameter: Math.min(190, state.diameter) });
  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.stroke(); ctx.restore();
}

function syncControls() {
  document.querySelector('#spiroMode').value = state.mode;
  document.querySelector('#spiroPreset').value = state.preset;
  document.querySelectorAll('[data-spiro-key]').forEach((input) => {
    input.value = state[input.dataset.spiroKey];
    const output = document.querySelector(`[data-spiro-output="${input.id}"]`);
    if (output) output.textContent = `${input.value}${input.dataset.suffix || ''}`;
  });
  document.querySelectorAll('[data-spiro-preset]').forEach((button) => button.classList.toggle('active', button.dataset.spiroPreset === state.preset));
  const place = document.querySelector('#spiroPlace');
  if (place) { place.classList.toggle('active', state.placementArmed); place.textContent = state.placementArmed ? 'Cancel placement' : 'Place on canvas'; }
  preview();
}

function applyPreset(name) {
  if (!presets[name]) return;
  Object.assign(state, structuredClone(presets[name]), { preset: name, placementArmed: false });
  syncControls();
}

function randomize() {
  Object.assign(state, {
    preset: 'custom', mode: Math.random() > 0.5 ? 'epitrochoid' : 'hypotrochoid',
    R: Math.round(45 + Math.random() * 100), r: Math.round(10 + Math.random() * 55),
    d: Math.round(8 + Math.random() * 105), diameter: Math.round(220 + Math.random() * 340),
    turns: Math.round(10 + Math.random() * 36), lineWidth: Math.round(1 + Math.random() * 7),
    opacity: Number((0.5 + Math.random() * 0.48).toFixed(2)), rotation: Math.round(Math.random() * 360),
    quality: Math.round(1300 + Math.random() * 3000), placementArmed: false,
  });
  syncControls(); status('Random spirograph generated');
}

function injectStyles() {
  if (document.querySelector('#spiroV07Styles')) return;
  const style = document.createElement('style');
  style.id = 'spiroV07Styles';
  style.textContent = `
    .spiro-open,.spiro-btn,.spiro-chip,.spiro-select{border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--ink);cursor:pointer}
    .spiro-open{display:flex;align-items:center;gap:7px;padding:8px 10px;font-weight:700}.spiro-open span{font-size:18px}
    .spiro-shell{display:grid;gap:11px}.spiro-preview{width:100%;height:auto;border:1px solid var(--line);border-radius:14px;background:#fff}
    .spiro-chips{display:flex;gap:6px;flex-wrap:wrap}.spiro-chip{padding:6px 8px;font-size:10px}.spiro-chip.active{background:rgba(127,90,240,.15);border-color:rgba(127,90,240,.4)}
    .spiro-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.spiro-grid label,.spiro-stack{display:grid;gap:5px;color:var(--muted);font-size:10px}.spiro-grid output{justify-self:end;color:var(--ink)}
    .spiro-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.spiro-btn{padding:9px}.spiro-btn.primary{background:rgba(255,191,105,.15);border-color:rgba(255,191,105,.4)}.spiro-btn.active{background:rgba(127,90,240,.16)}
    .spiro-note{font-size:10px;color:var(--muted);line-height:1.5;margin:0}@media(max-width:900px){.spiro-grid,.spiro-actions{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function buildUI() {
  if (document.querySelector('#spiroPanel')) return;
  const deck = document.querySelector('.control-deck');
  const tabs = document.querySelector('.inspector-tabs');
  const inspector = document.querySelector('.inspector');
  if (!deck || !tabs || !inspector) return;
  injectStyles();
  const launcher = document.createElement('button');
  launcher.className = 'spiro-open'; launcher.innerHTML = '<span>🌀</span><strong>Spiro</strong>';
  launcher.onclick = () => activatePanel('spiroPanel'); deck.appendChild(launcher);
  const tab = document.createElement('button');
  tab.dataset.panel = 'spiroPanel'; tab.textContent = 'Spiro Lab'; tab.onclick = () => activatePanel('spiroPanel'); tabs.appendChild(tab);
  const panel = document.createElement('section');
  panel.id = 'spiroPanel'; panel.className = 'inspector-panel';
  panel.innerHTML = `<div class="spiro-shell">
    <div class="panel-heading"><div><h2>Spiro Lab</h2><p>Generative curves drawn directly onto the active layer.</p></div></div>
    <canvas id="spiroPreview" class="spiro-preview" width="320" height="220"></canvas>
    <div class="spiro-stack">Preset<select id="spiroPreset" class="spiro-select"><option value="classic">Classic</option><option value="flower">Flower</option><option value="starburst">Starburst</option><option value="orbit">Orbit</option><option value="gear">Gear</option><option value="custom">Custom</option></select></div>
    <div class="spiro-chips">${Object.keys(presets).map((name) => `<button class="spiro-chip" data-spiro-preset="${name}">${name[0].toUpperCase()+name.slice(1)}</button>`).join('')}</div>
    <div class="spiro-grid">
      <label>Curve family<select id="spiroMode" class="spiro-select"><option value="hypotrochoid">Hypotrochoid</option><option value="epitrochoid">Epitrochoid</option></select></label>
      ${[['R','Ring radius',20,160,1,''],['r','Wheel radius',5,120,1,''],['d','Pen offset',0,160,1,''],['diameter','Diameter',100,1000,5,'px'],['turns','Turns',4,72,1,''],['lineWidth','Line width',1,20,1,'px'],['opacity','Opacity',0.05,1,0.01,''],['rotation','Rotation',0,360,1,'°'],['quality','Quality',700,5000,100,'']].map(([key,label,min,max,step,suffix]) => `<label>${label}<output data-spiro-output="spiro-${key}"></output><input id="spiro-${key}" data-spiro-key="${key}" data-suffix="${suffix}" type="range" min="${min}" max="${max}" step="${step}"></label>`).join('')}
    </div>
    <div class="spiro-actions"><button id="spiroRandom" class="spiro-btn">Randomize</button><button id="spiroCenter" class="spiro-btn">Draw at center</button><button id="spiroPlace" class="spiro-btn primary">Place on canvas</button><button id="spiroRefresh" class="spiro-btn">Use current color</button></div>
    <p class="spiro-note">Place mode stamps the current form wherever you click. Every stamp or batch remains a normal undoable layer operation.</p>
  </div>`;
  inspector.appendChild(panel);
  document.querySelector('#spiroPreset').onchange = (event) => event.target.value !== 'custom' && applyPreset(event.target.value);
  document.querySelector('#spiroMode').onchange = (event) => { state.mode = event.target.value; state.preset = 'custom'; syncControls(); };
  document.querySelectorAll('[data-spiro-preset]').forEach((button) => button.onclick = () => applyPreset(button.dataset.spiroPreset));
  document.querySelectorAll('[data-spiro-key]').forEach((input) => input.oninput = () => { state[input.dataset.spiroKey] = Number(input.value); state.preset = 'custom'; syncControls(); });
  document.querySelector('#spiroRandom').onclick = randomize;
  document.querySelector('#spiroCenter').onclick = () => { const active = engine(); if (active) drawAt(active.width/2, active.height/2); };
  document.querySelector('#spiroRefresh').onclick = () => { preview(); status(`Spiro preview uses ${currentColor()}`); };
  document.querySelector('#spiroPlace').onclick = () => { state.placementArmed = !state.placementArmed; syncControls(); status(state.placementArmed ? 'Click the canvas to place the spirograph' : 'Spiro placement canceled'); };
  const overlay = document.querySelector('#overlay');
  overlay?.addEventListener('pointerdown', (event) => {
    if (!state.placementArmed || event.button !== 0) return;
    const active = engine(); if (!active) return;
    const rect = overlay.getBoundingClientRect();
    const x = clamp((event.clientX-rect.left)*(active.width/rect.width),0,active.width);
    const y = clamp((event.clientY-rect.top)*(active.height/rect.height),0,active.height);
    state.placementArmed = false; syncControls();
    event.preventDefault(); event.stopImmediatePropagation(); drawAt(x,y);
  }, true);
  syncControls();
}

function waitForStudio() {
  if (!document.querySelector('.control-deck') || !document.querySelector('.inspector-tabs')) return requestAnimationFrame(waitForStudio);
  buildUI();
}

const api = { state, presets, computePoints, drawAt, drawBatch, preview, applyPreset, activatePanel, engine, currentColor };
globalThis.domistikaSpiroV07 = api;
document.dispatchEvent(new CustomEvent('domistika:spiro-ready', { detail: api }));
waitForStudio();
