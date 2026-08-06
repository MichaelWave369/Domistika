import { CanvasEngine } from './core/CanvasEngine.js';
import { downloadBlob, loadImage } from './core/utils.js';
import { TEXT_MESH_DEFAULTS, TEXT_MESH_FONTS, TextMeshStage } from './v095/TextMeshStage.js';

const originalSerialize = CanvasEngine.prototype.serialize;
const originalRestore = CanvasEngine.prototype.restore;
if (!CanvasEngine.prototype.__v095TextMeshPersistence) {
  CanvasEngine.prototype.__v095TextMeshPersistence = true;
  CanvasEngine.prototype.serialize = function serializeV095() {
    const project = originalSerialize.call(this);
    project.version = Math.max(3, Number(project.version) || 1);
    project.textMeshStudio = this.textMeshStudioState || window.domistikaTextMeshStage?.serializeState?.() || { ...TEXT_MESH_DEFAULTS };
    return project;
  };
  CanvasEngine.prototype.restore = async function restoreV095(project) {
    await originalRestore.call(this, project);
    this.textMeshStudioState = { ...TEXT_MESH_DEFAULTS, ...(project?.textMeshStudio || {}) };
    document.dispatchEvent(new CustomEvent('domistika:v095-state-restored', { detail: this.textMeshStudioState }));
  };
}

const $ = (selector, root = document) => root.querySelector(selector);
const status = (message) => { const node = $('#statusMessage'); if (node) node.textContent = message; };
const html = String.raw;

function safeFilename(value) {
  return String(value || 'domistika-text').toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'domistika-text';
}

function injectStyles() {
  if ($('#domistikaV095Styles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV095Styles';
  style.textContent = `
    .v094-subtabs{grid-template-columns:repeat(5,1fr)!important}.v095-stage-wrap{position:relative;height:270px;min-height:220px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:radial-gradient(circle at 50% 35%,#30233b,#151118 72%)}.v095-stage-wrap canvas{display:block;width:100%;height:100%;touch-action:none}.v095-stage-chip{position:absolute;left:8px;top:8px;z-index:2;padding:4px 7px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(15,12,18,.72);backdrop-filter:blur(8px);font-size:8px;color:#d8cbea;pointer-events:none}.v095-mode-row{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.v095-mode-row button,.v095-camera-row button{padding:8px;border:1px solid var(--line);border-radius:9px;background:var(--panel2);color:var(--muted);cursor:pointer}.v095-mode-row button.active{border-color:var(--warm);color:var(--ink);box-shadow:0 0 0 1px color-mix(in srgb,var(--warm) 32%,transparent)}.v095-camera-row{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.v095-two{display:grid;grid-template-columns:1fr 1fr;gap:7px}.v095-check{display:flex!important;grid-template-columns:none!important;align-items:center;gap:7px;padding:7px;border:1px solid var(--line);border-radius:9px;background:rgba(255,255,255,.02)}.v095-check input{width:auto!important}.v095-help{font-size:9px;color:var(--muted);line-height:1.5}.v095-output{padding:8px;border-radius:9px;background:rgba(255,255,255,.035);font-size:9px;color:var(--muted)}@media(max-width:1000px){.v095-two{grid-template-columns:1fr}.v095-camera-row{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);
}

function markup() {
  const fonts = TEXT_MESH_FONTS.map(([name, value]) => `<option value="${value}">${name}</option>`).join('');
  return html`
    <section class="v094-section" data-v094-view="mesh3d">
      <div class="v094-card"><div class="v094-set-head"><div><h3>Editable Three.js text</h3><p>Orbit the camera, drag the transform gizmo, then bake or export the real mesh.</p></div><span class="v094-badge">v0.9.5</span></div><div class="v095-stage-wrap"><canvas id="v095TextMeshCanvas" tabindex="0"></canvas><span class="v095-stage-chip">Drag gizmo · orbit empty space · wheel zoom</span></div><div class="v095-mode-row"><button class="active" data-v095-mode="translate">Move</button><button data-v095-mode="rotate">Rotate</button><button data-v095-mode="scale">Scale</button></div><div class="v095-camera-row"><button data-v095-camera="front">Front</button><button data-v095-camera="iso">Isometric</button><button data-v095-camera="side">Side</button><button data-v095-camera="top">Top</button></div></div>
      <div class="v094-card v094-stack"><h3>Geometry</h3><label>Text<textarea id="v095Text" rows="3">Domistika</textarea></label><div class="v094-actions"><button id="v095UseTypeText">Use Type-tab wording</button><button id="v095ResetTransform">Reset transform</button></div><div class="v094-grid">
        <label>Font<select id="v095Font">${fonts}</select></label><label>Alignment<select id="v095Align"><option value="center">Center</option><option value="left">Left</option><option value="right">Right</option></select></label>
        <label>Size <output id="v095SizeOut">0.92</output><input id="v095Size" type="range" min="12" max="300" value="92"></label><label>Depth <output id="v095DepthOut">0.24</output><input id="v095Depth" type="range" min="1" max="150" value="24"></label>
        <label>Tracking <output id="v095TrackingOut">0.04</output><input id="v095Tracking" type="range" min="-20" max="120" value="4"></label><label>Line height <output id="v095LineOut">1.22</output><input id="v095Line" type="range" min="70" max="250" value="122"></label>
        <label>Curve quality <output id="v095CurveOut">8</output><input id="v095Curve" type="range" min="2" max="18" value="8"></label><label>Bevel size <output id="v095BevelOut">0.025</output><input id="v095Bevel" type="range" min="0" max="20" value="5"></label>
      </div><div class="v095-two"><label class="v095-check"><input id="v095BevelEnabled" type="checkbox" checked> Bevel edges</label><label class="v095-check"><input id="v095Snap" type="checkbox"> Snap gizmo</label><label class="v095-check"><input id="v095Local" type="checkbox"> Local transform axes</label><label class="v095-check"><input id="v095Spin" type="checkbox"> Auto-spin preview</label></div></div>
      <div class="v094-card"><h3>Material + stage</h3><div class="v094-grid">
        <label>Material<select id="v095Material"><option value="matte">Matte</option><option value="chrome">Chrome</option><option value="neon">Neon</option><option value="glass">Glass</option><option value="toon">Toon</option></select></label><label>Background<input id="v095Background" type="color" value="#17131c"></label>
        <label>Front color<input id="v095Front" type="color" value="#f3c45b"></label><label>Side color<input id="v095Side" type="color" value="#6b3f8f"></label>
        <label>Roughness <input id="v095Roughness" type="range" min="0" max="100" value="56"></label><label>Metalness <input id="v095Metalness" type="range" min="0" max="100" value="14"></label>
        <label>Glow <input id="v095Emissive" type="range" min="0" max="200" value="18"></label><label>Glass transmission <input id="v095Transmission" type="range" min="0" max="100" value="62"></label>
      </div><label class="v095-check"><input id="v095Environment" type="checkbox" checked> Show floor and grid in editor</label></div>
      <div class="v094-card"><h3>Bake + export</h3><p>Canvas baking is transparent and undoable. GLB preserves the editable 3D geometry and materials.</p><div class="v094-grid"><label>Bake width <output id="v095BakeWidthOut">70%</output><input id="v095BakeWidth" type="range" min="10" max="150" value="70"></label><label>X position <input id="v095BakeX" type="range" min="0" max="100" value="50"></label><label>Y position <input id="v095BakeY" type="range" min="0" max="100" value="50"></label></div><div class="v094-actions"><button class="primary" id="v095Bake">Bake to active layer</button><button id="v095Png">Export transparent PNG</button><button id="v095Glb">Export GLB</button></div><div id="v095Output" class="v095-output">Ready.</div></div>
      <div class="v095-help">Keyboard while the 3D canvas is focused: <b>W</b> move, <b>E</b> rotate, <b>R</b> scale, <b>F</b> front camera, <b>I</b> isometric.</div>
    </section>`;
}

function readState(panel, stage) {
  const current = stage.serializeState();
  return {
    ...current,
    text: $('#v095Text', panel).value || 'Domistika', font: $('#v095Font', panel).value,
    align: $('#v095Align', panel).value, size: Number($('#v095Size', panel).value) / 100,
    depth: Number($('#v095Depth', panel).value) / 100, tracking: Number($('#v095Tracking', panel).value) / 100,
    lineHeight: Number($('#v095Line', panel).value) / 100, curveSegments: Number($('#v095Curve', panel).value),
    bevelEnabled: $('#v095BevelEnabled', panel).checked, bevelSize: Number($('#v095Bevel', panel).value) / 200,
    bevelThickness: Math.max(0.005, Number($('#v095Bevel', panel).value) / 150),
    material: $('#v095Material', panel).value, frontColor: $('#v095Front', panel).value,
    sideColor: $('#v095Side', panel).value, background: $('#v095Background', panel).value,
    roughness: Number($('#v095Roughness', panel).value) / 100, metalness: Number($('#v095Metalness', panel).value) / 100,
    emissive: Number($('#v095Emissive', panel).value) / 100, transmission: Number($('#v095Transmission', panel).value) / 100,
    environment: $('#v095Environment', panel).checked, autoSpin: $('#v095Spin', panel).checked,
  };
}

function writeState(panel, state) {
  const set = (selector, value) => { const node = $(selector, panel); if (node) node.value = String(value); };
  set('#v095Text', state.text); set('#v095Font', state.font); set('#v095Align', state.align);
  set('#v095Size', Math.round(state.size * 100)); set('#v095Depth', Math.round(state.depth * 100));
  set('#v095Tracking', Math.round(state.tracking * 100)); set('#v095Line', Math.round(state.lineHeight * 100));
  set('#v095Curve', state.curveSegments); set('#v095Bevel', Math.round(state.bevelSize * 200));
  set('#v095Material', state.material); set('#v095Front', state.frontColor); set('#v095Side', state.sideColor);
  set('#v095Background', state.background); set('#v095Roughness', Math.round(state.roughness * 100));
  set('#v095Metalness', Math.round(state.metalness * 100)); set('#v095Emissive', Math.round(state.emissive * 100));
  set('#v095Transmission', Math.round(state.transmission * 100));
  $('#v095BevelEnabled', panel).checked = state.bevelEnabled !== false;
  $('#v095Environment', panel).checked = state.environment !== false;
  $('#v095Spin', panel).checked = Boolean(state.autoSpin);
  $('#v095Snap', panel).checked = Boolean(state.snap);
  $('#v095Local', panel).checked = state.transformSpace === 'local';
  updateOutputs(panel);
}

function updateOutputs(panel) {
  $('#v095SizeOut', panel).textContent = (Number($('#v095Size', panel).value) / 100).toFixed(2);
  $('#v095DepthOut', panel).textContent = (Number($('#v095Depth', panel).value) / 100).toFixed(2);
  $('#v095TrackingOut', panel).textContent = (Number($('#v095Tracking', panel).value) / 100).toFixed(2);
  $('#v095LineOut', panel).textContent = (Number($('#v095Line', panel).value) / 100).toFixed(2);
  $('#v095CurveOut', panel).textContent = $('#v095Curve', panel).value;
  $('#v095BevelOut', panel).textContent = (Number($('#v095Bevel', panel).value) / 200).toFixed(3);
  $('#v095BakeWidthOut', panel).textContent = `${$('#v095BakeWidth', panel).value}%`;
}

async function bakeToCanvas(engine, stage, panel) {
  if (!engine.activeLayer) throw new Error('Select an active paint layer first.');
  const dataUrl = await stage.capturePng({ width: 1800, height: 1100, transparent: true });
  const image = await loadImage(dataUrl);
  const targetWidth = engine.width * (Number($('#v095BakeWidth', panel).value) / 100);
  const scale = targetWidth / image.width;
  const width = image.width * scale;
  const height = image.height * scale;
  const x = engine.width * (Number($('#v095BakeX', panel).value) / 100) - width / 2;
  const y = engine.height * (Number($('#v095BakeY', panel).value) / 100) - height / 2;
  engine.captureHistory();
  engine.activeLayer.ctx.drawImage(image, x, y, width, height);
  engine.markChanged('Editable 3D text baked to active layer');
}

function mount(engine) {
  if ($('#v095TextMeshCanvas')) return;
  const inkPanel = $('#inkTypePanel');
  const subtabs = $('.v094-subtabs', inkPanel);
  const shell = $('.v094-shell', inkPanel);
  if (!inkPanel || !subtabs || !shell) return;
  injectStyles();
  const button = document.createElement('button');
  button.dataset.v094Section = 'mesh3d';
  button.textContent = '3D Mesh';
  subtabs.appendChild(button);
  shell.insertAdjacentHTML('beforeend', markup());
  const panel = inkPanel;
  const view = $('[data-v094-view="mesh3d"]', panel);
  const stage = new TextMeshStage($('#v095TextMeshCanvas', panel), {
    onStatus: status,
    onStateChange(next) {
      engine.textMeshStudioState = next;
      clearTimeout(mount.persistTimer);
      mount.persistTimer = setTimeout(() => engine.onChange?.({ reason: 'content', engine }), 220);
    },
  });
  window.domistikaTextMeshStage = stage;
  const restored = { ...TEXT_MESH_DEFAULTS, ...(engine.textMeshStudioState || {}) };
  writeState(panel, restored);
  stage.applyState(restored, { rebuild: true, notify: false });

  button.addEventListener('click', () => {
    panel.querySelectorAll('[data-v094-section]').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
    panel.querySelectorAll('[data-v094-view]').forEach((candidate) => candidate.classList.toggle('active', candidate === view));
    requestAnimationFrame(() => stage.resize());
  });

  let rebuildTimer;
  const geometrySelectors = '#v095Text,#v095Font,#v095Align,#v095Size,#v095Depth,#v095Tracking,#v095Line,#v095Curve,#v095Bevel,#v095BevelEnabled,#v095Material,#v095Front,#v095Side,#v095Background,#v095Roughness,#v095Metalness,#v095Emissive,#v095Transmission,#v095Environment,#v095Spin';
  panel.addEventListener('input', (event) => {
    if (!event.target.matches(geometrySelectors)) return;
    updateOutputs(panel);
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => stage.applyState(readState(panel, stage), { rebuild: true }), event.target.id === 'v095Text' ? 180 : 40);
  });
  panel.addEventListener('change', (event) => {
    if (event.target.matches(geometrySelectors)) stage.applyState(readState(panel, stage), { rebuild: true });
  });

  $('[data-v095-mode="translate"]', panel).closest('.v095-mode-row').addEventListener('click', (event) => {
    const modeButton = event.target.closest('[data-v095-mode]');
    if (!modeButton) return;
    stage.setTransformMode(modeButton.dataset.v095Mode);
    panel.querySelectorAll('[data-v095-mode]').forEach((candidate) => candidate.classList.toggle('active', candidate === modeButton));
  });
  panel.querySelectorAll('[data-v095-camera]').forEach((cameraButton) => cameraButton.addEventListener('click', () => stage.cameraPreset(cameraButton.dataset.v095Camera)));
  $('#v095Snap', panel).addEventListener('change', (event) => { stage.setSnap(event.target.checked); stage.onStateChange(stage.serializeState()); });
  $('#v095Local', panel).addEventListener('change', (event) => stage.setTransformSpace(event.target.checked ? 'local' : 'world'));
  $('#v095ResetTransform', panel).addEventListener('click', () => stage.resetTransform());
  $('#v095UseTypeText', panel).addEventListener('click', () => {
    const source = $('#v094Text', panel)?.value || 'Domistika';
    $('#v095Text', panel).value = source;
    stage.applyState(readState(panel, stage), { rebuild: true });
    status('Type-tab wording sent to the editable 3D mesh');
  });
  $('#v095BakeWidth', panel).addEventListener('input', () => updateOutputs(panel));

  $('#v095Bake', panel).addEventListener('click', async () => {
    const output = $('#v095Output', panel);
    try { output.textContent = 'Rendering transparent mesh…'; await bakeToCanvas(engine, stage, panel); output.textContent = 'Baked to the active layer. Undo is available.'; }
    catch (error) { output.textContent = error.message; status(error.message); }
  });
  $('#v095Png', panel).addEventListener('click', async () => {
    const output = $('#v095Output', panel);
    try {
      output.textContent = 'Rendering PNG…';
      const dataUrl = await stage.capturePng({ width: 2400, height: 1400, transparent: true });
      const response = await fetch(dataUrl);
      downloadBlob(await response.blob(), `${safeFilename($('#projectName')?.value)}-3d-text.png`);
      output.textContent = 'Transparent PNG exported.';
    } catch (error) { output.textContent = error.message; status(error.message); }
  });
  $('#v095Glb', panel).addEventListener('click', async () => {
    const output = $('#v095Output', panel);
    try {
      output.textContent = 'Building GLB…';
      const buffer = await stage.exportGlb();
      downloadBlob(new Blob([buffer], { type: 'model/gltf-binary' }), `${safeFilename($('#projectName')?.value)}-3d-text.glb`);
      output.textContent = 'GLB exported with geometry, transforms, and materials.';
    } catch (error) { output.textContent = error.message; status(error.message); }
  });

  const canvas = $('#v095TextMeshCanvas', panel);
  canvas.addEventListener('keydown', (event) => {
    const keys = { w: 'translate', e: 'rotate', r: 'scale' };
    const key = event.key.toLowerCase();
    if (keys[key]) {
      event.preventDefault(); stage.setTransformMode(keys[key]);
      panel.querySelectorAll('[data-v095-mode]').forEach((candidate) => candidate.classList.toggle('active', candidate.dataset.v095Mode === keys[key]));
    } else if (key === 'f') stage.cameraPreset('front');
    else if (key === 'i') stage.cameraPreset('iso');
  });

  document.addEventListener('domistika:v095-state-restored', (event) => {
    const next = { ...TEXT_MESH_DEFAULTS, ...(event.detail || {}) };
    writeState(panel, next);
    stage.applyState(next, { rebuild: true, notify: false });
  });
  document.documentElement.dataset.textMeshStudio = 'v0.9.5';
  document.dispatchEvent(new CustomEvent('domistika:v095-ready', { detail: { engine, stage } }));
  status('Domistika v0.9.5 editable 3D Text Mesh Studio ready');
}

function waitForInkStudio(attempt = 0) {
  const engine = window.domistikaEngine;
  if (engine && $('#inkTypePanel .v094-subtabs')) return mount(engine);
  if (attempt < 240) setTimeout(() => waitForInkStudio(attempt + 1), 50);
}
waitForInkStudio();
