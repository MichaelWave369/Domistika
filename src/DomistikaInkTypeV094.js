import { CanvasEngine } from './core/CanvasEngine.js';
import { BRUSH_SETS, applyBrushPreset, installPenDynamics, setPenDynamics } from './v094/brushSets.js';
import { FONT_STACKS, placeText, recognizeLayerText, renderTextPreview } from './v094/textStudio.js';
import { MORPH_EFFECTS, applyMorph } from './v094/morphEffects.js';
import { STENCILS, stampStencil } from './v094/stencils.js';

const originalBindEvents = CanvasEngine.prototype.bindEvents;
if (!CanvasEngine.prototype.__v094CaptureInstalled) {
  CanvasEngine.prototype.__v094CaptureInstalled = true;
  CanvasEngine.prototype.bindEvents = function bindEventsV094(...args) {
    window.domistikaEngine = this;
    return originalBindEvents.apply(this, args);
  };
}

const html = String.raw;
const $ = (selector, root = document) => root.querySelector(selector);
const status = (message) => { const node = $('#statusMessage'); if (node) node.textContent = message; };

function injectStyles() {
  if ($('#domistikaV094Styles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV094Styles';
  style.textContent = `
  .v094-panel{display:none;min-height:0;overflow:auto}.v094-panel.active{display:block}.inspector-tabs{grid-template-columns:repeat(3,minmax(0,1fr))!important}.v094-shell{display:grid;gap:12px;padding-bottom:24px}.v094-badge{display:inline-flex;padding:4px 8px;border-radius:999px;border:1px solid rgba(101,220,170,.28);background:rgba(72,190,137,.08);color:#a8edc7;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}.v094-subtabs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;position:sticky;top:0;z-index:4;padding:8px 0;background:var(--panel)}.v094-subtabs button{padding:7px 4px;border:1px solid var(--line);border-radius:9px;background:var(--panel2);color:var(--muted);font-size:9px;cursor:pointer}.v094-subtabs button.active{color:var(--ink);border-color:var(--warm);box-shadow:0 0 0 1px color-mix(in srgb,var(--warm) 35%,transparent)}.v094-section{display:none;gap:11px}.v094-section.active{display:grid}.v094-card{display:grid;gap:9px;padding:11px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.025)}.v094-card h3{margin:0;font-size:13px}.v094-card p{margin:0;color:var(--muted);font-size:10px;line-height:1.45}.v094-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v094-grid label,.v094-stack label{display:grid;gap:5px;color:var(--muted);font-size:9px}.v094-grid input,.v094-grid select,.v094-stack input,.v094-stack select,.v094-stack textarea{width:100%;min-width:0;padding:7px;border:1px solid var(--line);border-radius:9px;background:var(--panel2);color:var(--ink);accent-color:var(--warm)}.v094-grid input[type=range],.v094-stack input[type=range]{padding:0;border:0}.v094-stack{display:grid;gap:8px}.v094-actions{display:flex;flex-wrap:wrap;gap:7px}.v094-actions button,.v094-preset,.v094-stencil{padding:8px 9px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--ink);cursor:pointer}.v094-actions button.primary{background:var(--warm);color:#fff;border-color:transparent}.v094-set{display:grid;gap:7px}.v094-set-head{display:flex;align-items:start;justify-content:space-between;gap:8px}.v094-presets{display:grid;grid-template-columns:1fr 1fr;gap:6px}.v094-preset{text-align:left;font-size:9px;line-height:1.2}.v094-preset strong{display:block;font-size:10px;margin-bottom:2px}.v094-preset span{color:var(--muted)}.v094-preview{width:100%;height:150px;border:1px solid var(--line);border-radius:12px;background:#f5f0e7}.v094-ocr-state{min-height:28px;padding:7px 8px;border-radius:9px;background:rgba(255,255,255,.035);color:var(--muted);font-size:9px;line-height:1.4}.v094-stencils{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.v094-stencil{display:grid;place-items:center;gap:3px;min-height:56px;font-size:9px}.v094-stencil span{font-size:20px}.v094-stencil.active{border-color:var(--warm);color:var(--warm)}.v094-note{padding:9px;border-left:3px solid var(--warm);background:rgba(255,255,255,.025);color:var(--muted);font-size:9px;line-height:1.5}@media(max-width:1000px){.v094-grid,.v094-presets{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function panelMarkup() {
  const fontOptions = FONT_STACKS.map(([name, value]) => `<option value="${value}">${name}</option>`).join('');
  const morphOptions = MORPH_EFFECTS.map(([id, name]) => `<option value="${id}">${name}</option>`).join('');
  return html`
    <div class="panel-heading"><div><h2>Ink + Type Studio</h2><p>Brushes, handwriting capture, type, morphs, and stencils.</p></div><span class="v094-badge">v0.9.4</span></div>
    <div class="v094-shell">
      <div class="v094-subtabs"><button class="active" data-v094-section="brush">Brushes</button><button data-v094-section="type">Type</button><button data-v094-section="morph">Morph</button><button data-v094-section="stencil">Stencil</button></div>
      <section class="v094-section active" data-v094-view="brush">
        <div class="v094-card"><h3>New brush sets</h3><p>Choose a tuned preset, then refine it with the pen dynamics below.</p><div id="v094BrushSets"></div></div>
        <div class="v094-card"><h3>Pen dynamics</h3><div class="v094-grid">
          <label>Pressure feel<select id="v094PressureCurve"><option value="soft">Soft</option><option value="linear" selected>Linear</option><option value="firm">Firm</option><option value="ink">Ink snap</option></select></label>
          <label>Minimum pressure <output id="v094MinPressureOut">8%</output><input id="v094MinPressure" type="range" min="2" max="60" value="8"></label>
          <label>Velocity taper <output id="v094VelocityOut">18%</output><input id="v094Velocity" type="range" min="0" max="80" value="18"></label>
          <label>Tilt boost <output id="v094TiltOut">20%</output><input id="v094Tilt" type="range" min="0" max="80" value="20"></label>
          <label>Stabilizer <output id="v094SteadyOut">35%</output><input id="v094Steady" type="range" min="0" max="95" value="35"></label>
          <label>Live size <output id="v094SizeOut">12px</output><input id="v094Size" type="range" min="1" max="180" value="12"></label>
        </div></div>
      </section>
      <section class="v094-section" data-v094-view="type">
        <div class="v094-card v094-stack"><h3>Writing → editable text</h3><p>Write on a clean layer, then ask Domistika to read that layer locally. Recognition uses the browser's on-device TextDetector when available.</p><div class="v094-actions"><button id="v094ReadLayer">Read active layer</button><button id="v094ReadFlattened">Read whole artwork</button></div><div id="v094OcrState" class="v094-ocr-state">Ready. Handwriting recognition availability depends on your browser.</div><label>Captured or typed wording<textarea id="v094Text" rows="4" placeholder="Write, capture, paste, or type here…">Domistika</textarea></label></div>
        <div class="v094-card"><h3>2D / 3D type controls</h3><canvas id="v094TextPreview" class="v094-preview"></canvas><div class="v094-grid">
          <label>Font<select id="v094Font">${fontOptions}</select></label><label>Mode<select id="v094TextMode"><option value="2d">2D</option><option value="3d">3D extruded</option></select></label>
          <label>Size <input id="v094TextSize" type="number" min="6" max="640" value="92"></label><label>Weight<select id="v094Weight"><option>400</option><option selected>600</option><option>700</option><option>800</option><option>900</option></select></label>
          <label>Tracking <input id="v094Tracking" type="number" min="-10" max="80" value="1"></label><label>Line height <input id="v094LineHeight" type="number" min="0.6" max="3" step="0.05" value="1.15"></label>
          <label>Rotation <input id="v094Rotation" type="number" min="-360" max="360" value="0"></label><label>3D depth <input id="v094Depth" type="number" min="1" max="120" value="18"></label>
          <label>Fill <input id="v094Fill" type="color" value="#1b1820"></label><label>Outline <input id="v094Stroke" type="color" value="#ffffff"></label>
          <label>Outline width <input id="v094StrokeWidth" type="number" min="0" max="40" step="0.5" value="0"></label><label>Opacity <input id="v094TextOpacity" type="range" min="1" max="100" value="100"></label>
          <label>X position <input id="v094TextX" type="range" min="0" max="100" value="50"></label><label>Y position <input id="v094TextY" type="range" min="0" max="100" value="50"></label>
        </div><label class="v094-note"><input id="v094Italic" type="checkbox"> Italic text</label><div class="v094-actions"><button class="primary" id="v094PlaceText">Place on active layer</button></div></div>
      </section>
      <section class="v094-section" data-v094-view="morph">
        <div class="v094-card"><h3>Layer morphs + effects</h3><p>Effects operate on the active layer and create one undo step.</p><div class="v094-stack"><label>Effect<select id="v094Morph">${morphOptions}</select></label><label>Strength <output id="v094MorphOut">50%</output><input id="v094MorphAmount" type="range" min="0" max="100" value="50"></label></div><div id="v094MorphDescription" class="v094-note"></div><div class="v094-actions"><button class="primary" id="v094ApplyMorph">Apply to active layer</button></div></div>
      </section>
      <section class="v094-section" data-v094-view="stencil">
        <div class="v094-card"><h3>Calligraphy + design stencils</h3><div class="v094-stencils" id="v094Stencils">${STENCILS.map(([id,name,icon], index) => `<button class="v094-stencil ${index === 0 ? 'active' : ''}" data-stencil="${id}"><span>${icon}</span>${name}</button>`).join('')}</div><div class="v094-grid">
          <label>Mode<select id="v094StencilMode"><option value="outline">Outline</option><option value="fill">Fill</option><option value="both">Fill + outline</option></select></label><label>Scale <input id="v094StencilScale" type="range" min="20" max="300" value="100"></label>
          <label>Rotation <input id="v094StencilRotation" type="number" min="-360" max="360" value="0"></label><label>Line width <input id="v094StencilLine" type="number" min="0.5" max="24" step="0.5" value="4"></label>
          <label>Fill <input id="v094StencilFill" type="color" value="#f3c45b"></label><label>Outline <input id="v094StencilStroke" type="color" value="#1b1820"></label>
          <label>X position <input id="v094StencilX" type="range" min="0" max="100" value="50"></label><label>Y position <input id="v094StencilY" type="range" min="0" max="100" value="50"></label>
          <label>Opacity <input id="v094StencilOpacity" type="range" min="1" max="100" value="100"></label>
        </div><div class="v094-actions"><button class="primary" id="v094StampStencil">Stamp on active layer</button></div></div>
      </section>
    </div>`;
}

function textOptions(panel) {
  return {
    text: $('#v094Text', panel).value,
    font: $('#v094Font', panel).value,
    mode: $('#v094TextMode', panel).value,
    size: Number($('#v094TextSize', panel).value),
    weight: $('#v094Weight', panel).value,
    italic: $('#v094Italic', panel).checked,
    tracking: Number($('#v094Tracking', panel).value),
    lineHeight: Number($('#v094LineHeight', panel).value),
    rotation: Number($('#v094Rotation', panel).value),
    depth: Number($('#v094Depth', panel).value),
    fill: $('#v094Fill', panel).value,
    stroke: $('#v094Stroke', panel).value,
    strokeWidth: Number($('#v094StrokeWidth', panel).value),
    opacity: Number($('#v094TextOpacity', panel).value) / 100,
    x: Number($('#v094TextX', panel).value) / 100,
    y: Number($('#v094TextY', panel).value) / 100,
    align: 'center', shadowBlur: 0, shadowX: 0, shadowY: 0,
  };
}

function mount(engine) {
  if ($('#inkTypePanel')) return;
  injectStyles();
  installPenDynamics(engine);
  const tabs = $('.inspector-tabs');
  const inspector = $('.inspector');
  if (!tabs || !inspector) return;
  const tab = document.createElement('button');
  tab.dataset.panel = 'inkTypePanel';
  tab.textContent = 'Ink + Type';
  tabs.appendChild(tab);
  const panel = document.createElement('section');
  panel.id = 'inkTypePanel'; panel.className = 'inspector-panel v094-panel'; panel.innerHTML = panelMarkup();
  inspector.appendChild(panel);

  tab.addEventListener('click', () => {
    tabs.querySelectorAll('button').forEach((button) => button.classList.toggle('active', button === tab));
    inspector.querySelectorAll('.inspector-panel').forEach((candidate) => candidate.classList.toggle('active', candidate === panel));
    renderTextPreview($('#v094TextPreview', panel), textOptions(panel));
  });
  panel.querySelectorAll('[data-v094-section]').forEach((button) => button.addEventListener('click', () => {
    panel.querySelectorAll('[data-v094-section]').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
    panel.querySelectorAll('[data-v094-view]').forEach((view) => view.classList.toggle('active', view.dataset.v094View === button.dataset.v094Section));
    if (button.dataset.v094Section === 'type') renderTextPreview($('#v094TextPreview', panel), textOptions(panel));
  }));

  const brushHost = $('#v094BrushSets', panel);
  brushHost.innerHTML = BRUSH_SETS.map((set) => `<div class="v094-set"><div class="v094-set-head"><div><strong>${set.name}</strong><p>${set.description}</p></div><small>${set.presets.length}</small></div><div class="v094-presets">${set.presets.map((preset) => `<button class="v094-preset" data-brush="${preset.name}"><strong>${preset.name}</strong><span>${preset.tool} · ${preset.size}px</span></button>`).join('')}</div></div>`).join('');
  brushHost.addEventListener('click', (event) => {
    const button = event.target.closest('[data-brush]'); if (!button) return;
    const preset = BRUSH_SETS.flatMap((set) => set.presets).find((candidate) => candidate.name === button.dataset.brush);
    applyBrushPreset(engine, preset); status(`${preset.name} brush selected`);
    $('#v094Size', panel).value = String(preset.size); $('#v094SizeOut', panel).textContent = `${preset.size}px`;
    $('#v094Steady', panel).value = String(preset.smoothing); $('#v094SteadyOut', panel).textContent = `${preset.smoothing}%`;
  });

  const penBindings = [
    ['#v094MinPressure', '#v094MinPressureOut', 'minimumPressure', (value) => Number(value) / 100],
    ['#v094Velocity', '#v094VelocityOut', 'velocityTaper', (value) => Number(value) / 100],
    ['#v094Tilt', '#v094TiltOut', 'tiltBoost', (value) => Number(value) / 100],
  ];
  penBindings.forEach(([inputSelector, outputSelector, key, transform]) => {
    const input = $(inputSelector, panel); input.addEventListener('input', () => { $(outputSelector, panel).textContent = `${input.value}%`; setPenDynamics(engine, { [key]: transform(input.value) }); });
  });
  $('#v094PressureCurve', panel).addEventListener('change', (event) => setPenDynamics(engine, { curve: event.target.value }));
  $('#v094Steady', panel).addEventListener('input', (event) => { $('#v094SteadyOut', panel).textContent = `${event.target.value}%`; const native = $('#smoothingInput'); if (native) { native.value = event.target.value; native.dispatchEvent(new Event('input')); } });
  $('#v094Size', panel).addEventListener('input', (event) => { $('#v094SizeOut', panel).textContent = `${event.target.value}px`; const native = $('#sizeInput'); if (native) { native.value = event.target.value; native.dispatchEvent(new Event('input')); } });

  const updatePreview = () => renderTextPreview($('#v094TextPreview', panel), textOptions(panel));
  panel.querySelectorAll('#v094Text,#v094Font,#v094TextMode,#v094TextSize,#v094Weight,#v094Tracking,#v094LineHeight,#v094Rotation,#v094Depth,#v094Fill,#v094Stroke,#v094StrokeWidth,#v094Italic').forEach((input) => input.addEventListener('input', updatePreview));
  async function runRecognition(scope) {
    const state = $('#v094OcrState', panel); state.textContent = 'Reading locally…';
    try {
      const result = await recognizeLayerText(engine, scope);
      if (!result) throw new Error('No readable text was detected. Try darker writing on a clean, high-contrast layer.');
      $('#v094Text', panel).value = result; state.textContent = `Captured ${result.length} characters locally.`; updatePreview(); status('Handwriting converted to editable text');
    } catch (error) { state.textContent = error.message; status(error.message); }
  }
  $('#v094ReadLayer', panel).addEventListener('click', () => runRecognition('active'));
  $('#v094ReadFlattened', panel).addEventListener('click', () => runRecognition('flattened'));
  $('#v094PlaceText', panel).addEventListener('click', () => { try { placeText(engine, textOptions(panel)); } catch (error) { status(error.message); } });

  function updateMorphDescription() {
    const effect = MORPH_EFFECTS.find(([id]) => id === $('#v094Morph', panel).value);
    $('#v094MorphDescription', panel).textContent = effect?.[2] || '';
  }
  $('#v094Morph', panel).addEventListener('change', updateMorphDescription); updateMorphDescription();
  $('#v094MorphAmount', panel).addEventListener('input', (event) => { $('#v094MorphOut', panel).textContent = `${event.target.value}%`; });
  $('#v094ApplyMorph', panel).addEventListener('click', () => { try { applyMorph(engine, $('#v094Morph', panel).value, Number($('#v094MorphAmount', panel).value) / 100); } catch (error) { status(error.message); } });

  let activeStencil = 'mandala';
  $('#v094Stencils', panel).addEventListener('click', (event) => { const button = event.target.closest('[data-stencil]'); if (!button) return; activeStencil = button.dataset.stencil; panel.querySelectorAll('[data-stencil]').forEach((candidate) => candidate.classList.toggle('active', candidate === button)); });
  $('#v094StampStencil', panel).addEventListener('click', () => {
    try {
      stampStencil(engine, activeStencil, {
        mode: $('#v094StencilMode', panel).value, scale: Number($('#v094StencilScale', panel).value) / 100,
        rotation: Number($('#v094StencilRotation', panel).value), lineWidth: Number($('#v094StencilLine', panel).value),
        fill: $('#v094StencilFill', panel).value, stroke: $('#v094StencilStroke', panel).value,
        x: Number($('#v094StencilX', panel).value) / 100, y: Number($('#v094StencilY', panel).value) / 100,
        opacity: Number($('#v094StencilOpacity', panel).value) / 100,
      });
    } catch (error) { status(error.message); }
  });

  document.documentElement.dataset.inkTypeStudio = 'v0.9.4';
  document.dispatchEvent(new CustomEvent('domistika:v094-ready', { detail: { engine } }));
  status('Domistika v0.9.4 Ink + Type Studio ready');
}

function waitForStudio(attempt = 0) {
  const engine = window.domistikaEngine;
  if (engine && $('.inspector') && window.domistikaBrushV02) return mount(engine);
  if (attempt < 160) setTimeout(() => waitForStudio(attempt + 1), 50);
}
waitForStudio();
