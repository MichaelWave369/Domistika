import './styles.css';
import { CanvasEngine } from './core/CanvasEngine.js';
import { clearAutosave, loadAutosave, saveAutosave } from './core/storage.js';
import { downloadBlob } from './core/utils.js';
import { ReferenceStage } from './three/ReferenceStage.js';

const TOOLS = [
  ['pencil', 'Pencil', 'B', '✎'], ['ink', 'Ink', 'I', '✦'], ['marker', 'Marker', 'M', '▰'],
  ['airbrush', 'Airbrush', 'A', '◌'], ['eraser', 'Eraser', 'E', '⌫'], ['line', 'Line', 'L', '╱'],
  ['rectangle', 'Rectangle', 'R', '□'], ['ellipse', 'Ellipse', 'O', '○'],
  ['eyedropper', 'Eyedropper', 'Alt', '◉'], ['pan', 'Pan canvas', 'H / Space', '✋'],
];

const app = document.querySelector('#app');
app.innerHTML = `
<div class="studio lefty-mode" id="studio">
<header class="topbar">
  <div class="brand-block"><div class="brand-mark">D</div><div><h1>Domistika</h1><p>draw your way</p></div></div>
  <div class="project-strip"><input id="projectName" value="Josh's First Canvas" aria-label="Project name"><span class="save-state" id="saveState">Ready</span></div>
  <div class="top-actions"><button class="soft-button" id="newProject">New</button><button class="soft-button" id="openFile">Open</button><button class="soft-button" id="saveProject">Project</button><button class="primary-button" id="exportImage">Export</button></div>
</header>
<main class="workspace">
  <aside class="tool-rail"><div class="tool-list">${TOOLS.map(([tool,label,shortcut,icon]) => `<button class="tool-button ${tool === 'pencil' ? 'active' : ''}" data-tool="${tool}" title="${label} (${shortcut})"><span>${icon}</span><small>${label}</small></button>`).join('')}</div><button class="handed-button active" id="handedToggle"><span>✋</span><small>Lefty</small></button></aside>
  <section class="center-stage">
    <div class="control-deck">
      <label class="color-control"><input id="colorInput" type="color" value="#1b1820"><span id="colorLabel">#1b1820</span></label>
      <label>Size <output id="sizeOutput">12</output><input id="sizeInput" type="range" min="1" max="180" value="12"></label>
      <label>Opacity <output id="opacityOutput">100%</output><input id="opacityInput" type="range" min="1" max="100" value="100"></label>
      <label>Steady <output id="smoothingOutput">35%</output><input id="smoothingInput" type="range" min="0" max="95" value="35"></label>
      <label class="select-control">Symmetry<select id="symmetryInput"><option value="none">Off</option><option value="vertical">Vertical</option><option value="horizontal">Horizontal</option><option value="quad">Four-way</option><option value="radial-6">Radial 6</option><option value="radial-8">Radial 8</option><option value="radial-12">Radial 12</option></select></label>
      <button class="toggle-button active" id="pressureToggle" aria-pressed="true">Pressure</button><button class="toggle-button" id="gridToggle" aria-pressed="false">Grid</button>
    </div>
    <div class="viewport" id="viewport"><div class="artboard" id="artboard"><div class="paper-background"></div><canvas id="overlay" class="drawing-overlay"></canvas></div><div class="zoom-dock"><button id="zoomOut">−</button><button id="fitCanvas">Fit</button><span id="zoomLabel">100%</span><button id="zoomIn">+</button></div></div>
  </section>
  <aside class="inspector">
    <div class="inspector-tabs"><button class="active" data-panel="layersPanel">Layers</button><button data-panel="referencePanel">3D Form Lab</button></div>
    <section id="layersPanel" class="inspector-panel active">
      <div class="panel-heading"><div><h2>Layers</h2><p>Non-destructive building blocks</p></div><button id="addLayer" class="icon-button">＋</button></div>
      <div class="layer-actions"><button id="duplicateLayer">Duplicate</button><button id="layerUp">Up</button><button id="layerDown">Down</button><button id="deleteLayer">Delete</button></div>
      <div id="layerList" class="layer-list"></div>
      <div class="layer-properties"><label>Layer opacity <output id="layerOpacityOutput">100%</output><input id="layerOpacity" type="range" min="0" max="100" value="100"></label><label>Blend mode<select id="blendMode"><option value="normal">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="soft-light">Soft light</option><option value="hard-light">Hard light</option><option value="difference">Difference</option></select></label></div>
    </section>
    <section id="referencePanel" class="inspector-panel">
      <div class="panel-heading"><div><h2>3D Form Lab</h2><p>Rotate forms and study light</p></div><span class="gpu-badge" id="gpuStatus">Starting…</span></div>
      <div class="reference-canvas-wrap"><canvas id="referenceCanvas"></canvas></div>
      <div class="shape-picker"><button data-shape="head" class="active">Head</button><button data-shape="figure">Figure</button><button data-shape="sphere">Sphere</button><button data-shape="cube">Cube</button><button data-shape="cylinder">Cylinder</button></div>
      <label class="light-control">Light direction<input id="lightAngle" type="range" min="0" max="1" step="0.01" value="0.12"></label>
      <p class="reference-tip">Drag to orbit · wheel to zoom · use the form as a lighting reference while you draw.</p>
    </section>
  </aside>
</main>
<footer class="statusbar"><span id="statusMessage">Welcome to Domistika.</span><div><button id="undoButton">Undo</button><button id="redoButton">Redo</button><button id="clearLayer">Clear layer</button><button id="shortcutsButton">Shortcuts</button></div></footer>
</div>
<input id="fileInput" type="file" accept="image/*,.domistika,.json" hidden>
<dialog id="newDialog" class="studio-dialog"><form method="dialog" id="newForm"><div class="dialog-head"><div><h2>New canvas</h2><p>Pick a starting surface. You can resize later.</p></div><button value="cancel">×</button></div><div class="preset-grid"><button type="button" data-size="1600x1200">Landscape<br><small>1600 × 1200</small></button><button type="button" data-size="1200x1600">Portrait<br><small>1200 × 1600</small></button><button type="button" data-size="2048x2048">Square<br><small>2048 × 2048</small></button><button type="button" data-size="1920x1080">Screen<br><small>1920 × 1080</small></button></div><div class="size-fields"><label>Width<input id="newWidth" type="number" min="64" max="8192" value="1600"></label><label>Height<input id="newHeight" type="number" min="64" max="8192" value="1200"></label></div><div class="dialog-actions"><button value="cancel">Cancel</button><button class="primary-button" id="createProject" value="default">Create canvas</button></div></form></dialog>
<dialog id="exportDialog" class="studio-dialog"><form method="dialog" id="exportForm"><div class="dialog-head"><div><h2>Export artwork</h2><p>Flatten visible layers into an image.</p></div><button value="cancel">×</button></div><label>File name<input id="exportName" value="domistika-artwork"></label><label>Format<select id="exportFormat"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option></select></label><label class="check-row"><input id="transparentExport" type="checkbox"> Transparent background (PNG)</label><div class="dialog-actions"><button value="cancel">Cancel</button><button class="primary-button" id="confirmExport" value="default">Export image</button></div></form></dialog>
<dialog id="shortcutsDialog" class="studio-dialog"><form method="dialog"><div class="dialog-head"><div><h2>Keyboard shortcuts</h2><p>Keep your drawing hand moving.</p></div><button value="cancel">×</button></div><div class="shortcut-grid"><span><kbd>B</kbd> Pencil</span><span><kbd>I</kbd> Ink</span><span><kbd>M</kbd> Marker</span><span><kbd>A</kbd> Airbrush</span><span><kbd>E</kbd> Eraser</span><span><kbd>L</kbd> Line</span><span><kbd>R</kbd> Rectangle</span><span><kbd>O</kbd> Ellipse</span><span><kbd>H</kbd> Pan</span><span><kbd>Space</kbd> Temporary pan</span><span><kbd>Alt</kbd> Pick color</span><span><kbd>Ctrl Z</kbd> Undo</span><span><kbd>[</kbd> Smaller</span><span><kbd>]</kbd> Larger</span><span><kbd>0</kbd> Fit canvas</span><span><kbd>G</kbd> Toggle grid</span></div></form></dialog>`;

const $ = (selector) => document.querySelector(selector);
const studio = $('#studio');
const viewport = $('#viewport');
const artboard = $('#artboard');
const overlay = $('#overlay');
let autosaveTimer = null;
let pan = { x: 0, y: 0 };
let zoom = 1;
let panning = null;
const status = (message) => { $('#statusMessage').textContent = message; };

function queueAutosave() {
  $('#saveState').textContent = 'Unsaved';
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    try {
      const payload = engine.serialize();
      payload.name = $('#projectName').value.trim() || 'Untitled';
      await saveAutosave(payload);
      $('#saveState').textContent = 'Saved locally';
    } catch (error) {
      console.error(error);
      $('#saveState').textContent = 'Autosave failed';
    }
  }, 900);
}

function handleEngineChange(event) {
  if (event.reason === 'color-picked') {
    $('#colorInput').value = event.color;
    $('#colorLabel').textContent = event.color;
  }
  renderLayers();
  updateCanvasDimensions();
  if (event.reason === 'content' || event.reason === 'project-restored') queueAutosave();
}

const engine = new CanvasEngine({
  artboard, overlay, onChange: handleEngineChange, onStatus: status,
  onPan: {
    start(event) { panning = { clientX: event.clientX, clientY: event.clientY, x: pan.x, y: pan.y }; viewport.classList.add('dragging'); },
    move(event) { if (!panning) return; pan.x = panning.x + event.clientX - panning.clientX; pan.y = panning.y + event.clientY - panning.clientY; applyTransform(); },
    end() { panning = null; viewport.classList.remove('dragging'); },
  },
});

function updateCanvasDimensions() { artboard.style.width = `${engine.width}px`; artboard.style.height = `${engine.height}px`; }
function applyTransform() { artboard.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`; $('#zoomLabel').textContent = `${Math.round(zoom * 100)}%`; }
function fitCanvas() {
  const padding = 72;
  zoom = Math.max(0.05, Math.min(1, (viewport.clientWidth - padding) / engine.width, (viewport.clientHeight - padding) / engine.height));
  pan.x = (viewport.clientWidth - engine.width * zoom) / 2;
  pan.y = (viewport.clientHeight - engine.height * zoom) / 2;
  applyTransform();
}
function setZoom(next, focalX = viewport.clientWidth / 2, focalY = viewport.clientHeight / 2) {
  const previous = zoom;
  zoom = Math.max(0.05, Math.min(6, next));
  const worldX = (focalX - pan.x) / previous;
  const worldY = (focalY - pan.y) / previous;
  pan.x = focalX - worldX * zoom;
  pan.y = focalY - worldY * zoom;
  applyTransform();
}
function selectTool(tool) {
  engine.setTool(tool);
  document.querySelectorAll('[data-tool]').forEach((button) => button.classList.toggle('active', button.dataset.tool === tool));
}

document.querySelectorAll('[data-tool]').forEach((button) => button.addEventListener('click', () => selectTool(button.dataset.tool)));
$('#colorInput').addEventListener('input', (event) => { engine.setSetting('color', event.target.value); $('#colorLabel').textContent = event.target.value; });
function bindRange(inputSelector, outputSelector, setting, formatter = (value) => value) {
  const input = $(inputSelector);
  input.addEventListener('input', () => {
    const value = Number(input.value);
    engine.setSetting(setting, setting === 'opacity' ? value / 100 : value);
    $(outputSelector).textContent = formatter(value);
  });
}
bindRange('#sizeInput', '#sizeOutput', 'size');
bindRange('#opacityInput', '#opacityOutput', 'opacity', (value) => `${value}%`);
bindRange('#smoothingInput', '#smoothingOutput', 'smoothing', (value) => `${value}%`);
$('#symmetryInput').addEventListener('change', (event) => engine.setSetting('symmetry', event.target.value));
$('#pressureToggle').addEventListener('click', (event) => { const enabled = event.currentTarget.getAttribute('aria-pressed') !== 'true'; event.currentTarget.setAttribute('aria-pressed', String(enabled)); event.currentTarget.classList.toggle('active', enabled); engine.setSetting('pressure', enabled); });
$('#gridToggle').addEventListener('click', (event) => { const enabled = event.currentTarget.getAttribute('aria-pressed') !== 'true'; event.currentTarget.setAttribute('aria-pressed', String(enabled)); event.currentTarget.classList.toggle('active', enabled); engine.setSetting('grid', enabled); });
$('#handedToggle').addEventListener('click', (event) => { studio.classList.toggle('lefty-mode'); const lefty = studio.classList.contains('lefty-mode'); event.currentTarget.classList.toggle('active', lefty); event.currentTarget.querySelector('small').textContent = lefty ? 'Lefty' : 'Righty'; status(lefty ? 'Left-handed layout active' : 'Right-handed layout active'); setTimeout(fitCanvas, 50); });
$('#zoomIn').addEventListener('click', () => setZoom(zoom * 1.18));
$('#zoomOut').addEventListener('click', () => setZoom(zoom / 1.18));
$('#fitCanvas').addEventListener('click', fitCanvas);
viewport.addEventListener('wheel', (event) => { event.preventDefault(); const rect = viewport.getBoundingClientRect(); setZoom(zoom * (event.deltaY > 0 ? 0.9 : 1.1), event.clientX - rect.left, event.clientY - rect.top); }, { passive: false });

$('#addLayer').addEventListener('click', () => engine.createLayer());
$('#duplicateLayer').addEventListener('click', () => engine.duplicateActiveLayer());
$('#deleteLayer').addEventListener('click', () => engine.deleteActiveLayer());
$('#layerUp').addEventListener('click', () => engine.moveActiveLayer(1));
$('#layerDown').addEventListener('click', () => engine.moveActiveLayer(-1));
$('#clearLayer').addEventListener('click', () => engine.clearActiveLayer());
$('#undoButton').addEventListener('click', () => engine.undo());
$('#redoButton').addEventListener('click', () => engine.redo());

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character]); }
function renderLayers() {
  if (!engine?.layers) return;
  const list = $('#layerList');
  list.innerHTML = '';
  [...engine.layers].reverse().forEach((layer) => {
    const row = document.createElement('div');
    row.className = `layer-row ${layer.id === engine.activeLayerId ? 'active' : ''}`;
    row.innerHTML = `<button class="visibility-button">${layer.visible ? '◉' : '○'}</button><div class="layer-thumb"><canvas width="54" height="42"></canvas></div><input class="layer-name" value="${escapeHtml(layer.name)}">`;
    row.addEventListener('click', (event) => { if (!event.target.closest('.visibility-button')) engine.setActiveLayer(layer.id); });
    row.querySelector('.visibility-button').addEventListener('click', () => engine.setLayerVisibility(layer.id, !layer.visible));
    row.querySelector('.layer-name').addEventListener('change', (event) => engine.renameLayer(layer.id, event.target.value));
    const thumb = row.querySelector('canvas');
    const ctx = thumb.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, thumb.width, thumb.height); ctx.drawImage(layer.canvas, 0, 0, thumb.width, thumb.height);
    list.appendChild(row);
  });
  const active = engine.activeLayer;
  if (active) { $('#layerOpacity').value = String(Math.round(active.opacity * 100)); $('#layerOpacityOutput').textContent = `${Math.round(active.opacity * 100)}%`; $('#blendMode').value = active.blendMode; }
}
$('#layerOpacity').addEventListener('input', (event) => { const value = Number(event.target.value); $('#layerOpacityOutput').textContent = `${value}%`; engine.setLayerOpacity(engine.activeLayerId, value / 100); });
$('#blendMode').addEventListener('change', (event) => engine.setLayerBlendMode(engine.activeLayerId, event.target.value));

document.querySelectorAll('.inspector-tabs button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.inspector-tabs button').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
  document.querySelectorAll('.inspector-panel').forEach((panel) => panel.classList.toggle('active', panel.id === button.dataset.panel));
  if (button.dataset.panel === 'referencePanel') referenceStage?.resize();
}));
let referenceStage;
try { referenceStage = new ReferenceStage($('#referenceCanvas'), $('#gpuStatus')); } catch (error) { console.error(error); $('#gpuStatus').textContent = '3D unavailable'; }
document.querySelectorAll('[data-shape]').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('[data-shape]').forEach((candidate) => candidate.classList.toggle('active', candidate === button)); referenceStage?.setSubject(button.dataset.shape); }));
$('#lightAngle').addEventListener('input', (event) => referenceStage?.setLightAngle(event.target.value));

$('#openFile').addEventListener('click', () => $('#fileInput').click());
$('#fileInput').addEventListener('change', async (event) => {
  const [file] = event.target.files; event.target.value = ''; if (!file) return;
  try {
    if (file.name.endsWith('.domistika') || file.type === 'application/json' || file.name.endsWith('.json')) {
      const project = JSON.parse(await file.text()); await engine.restore(project); $('#projectName').value = project.name || file.name.replace(/\.(domistika|json)$/i, ''); fitCanvas(); status('Domistika project opened');
    } else if (file.type.startsWith('image/')) { await engine.importImage(file); status(`${file.name} added as a layer`); }
  } catch (error) { console.error(error); status(`Could not open file: ${error.message}`); }
});
function safeFilename(value) { return value.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'domistika-artwork'; }
$('#saveProject').addEventListener('click', () => { const project = engine.serialize(); project.name = $('#projectName').value.trim() || 'Untitled'; downloadBlob(new Blob([JSON.stringify(project)], { type: 'application/json' }), `${safeFilename(project.name)}.domistika`); status('Editable Domistika project downloaded'); });
$('#exportImage').addEventListener('click', () => { $('#exportName').value = safeFilename($('#projectName').value.trim() || 'domistika-artwork'); $('#exportDialog').showModal(); });
$('#exportForm').addEventListener('submit', async (event) => {
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  const type = $('#exportFormat').value;
  const blob = await engine.exportImage(type, 0.94, type === 'image/png' && $('#transparentExport').checked);
  const extension = type === 'image/jpeg' ? 'jpg' : 'png';
  downloadBlob(blob, `${safeFilename($('#exportName').value || 'domistika-artwork')}.${extension}`);
  $('#exportDialog').close(); status(`Artwork exported as ${extension.toUpperCase()}`);
});
$('#newProject').addEventListener('click', () => $('#newDialog').showModal());
document.querySelectorAll('[data-size]').forEach((button) => button.addEventListener('click', () => { const [width, height] = button.dataset.size.split('x'); $('#newWidth').value = width; $('#newHeight').value = height; }));
$('#newForm').addEventListener('submit', async (event) => {
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  const width = Number($('#newWidth').value); const height = Number($('#newHeight').value);
  await engine.restore({ format: 'domistika-project', version: 1, width, height, activeLayerId: 'base-layer', settings: { ...engine.settings }, layers: [{ id: 'base-layer', name: 'Sketch 1', visible: true, opacity: 1, blendMode: 'normal', image: null }] });
  $('#projectName').value = 'Untitled Domistika'; await clearAutosave(); $('#newDialog').close(); fitCanvas(); queueAutosave(); status(`New ${width} × ${height} canvas created`);
});
$('#shortcutsButton').addEventListener('click', () => $('#shortcutsDialog').showModal());
$('#projectName').addEventListener('input', queueAutosave);

window.addEventListener('keydown', (event) => {
  if (event.target.matches('input, select, textarea')) return;
  if (event.code === 'Space') { event.preventDefault(); engine.setSpacePan(true); return; }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? engine.redo() : engine.undo(); return; }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); engine.redo(); return; }
  const shortcuts = { b: 'pencil', i: 'ink', m: 'marker', a: 'airbrush', e: 'eraser', l: 'line', r: 'rectangle', o: 'ellipse', h: 'pan' };
  const key = event.key.toLowerCase();
  if (shortcuts[key]) selectTool(shortcuts[key]);
  if (key === 'g') $('#gridToggle').click();
  if (key === '0') fitCanvas();
  if (key === '[' || key === ']') { const input = $('#sizeInput'); input.value = String(Math.max(1, Math.min(180, Number(input.value) + (key === '[' ? -2 : 2)))); input.dispatchEvent(new Event('input')); }
});
window.addEventListener('keyup', (event) => { if (event.code === 'Space') engine.setSpacePan(false); });
window.addEventListener('resize', fitCanvas);

async function restoreAutosave() {
  try {
    const saved = await loadAutosave(); if (!saved) return;
    await engine.restore(saved); $('#projectName').value = saved.name || 'Recovered artwork';
    $('#colorInput').value = engine.settings.color; $('#colorLabel').textContent = engine.settings.color;
    $('#sizeInput').value = engine.settings.size; $('#sizeOutput').textContent = engine.settings.size;
    $('#opacityInput').value = Math.round(engine.settings.opacity * 100); $('#opacityOutput').textContent = `${Math.round(engine.settings.opacity * 100)}%`;
    $('#smoothingInput').value = engine.settings.smoothing; $('#smoothingOutput').textContent = `${engine.settings.smoothing}%`;
    $('#symmetryInput').value = engine.settings.symmetry; $('#gridToggle').setAttribute('aria-pressed', String(engine.settings.grid)); $('#gridToggle').classList.toggle('active', engine.settings.grid);
    status(`Recovered local autosave from ${new Date(saved.savedAt).toLocaleString()}`);
  } catch (error) { console.warn('Autosave restore skipped', error); }
}

updateCanvasDimensions();
renderLayers();
await restoreAutosave();
requestAnimationFrame(fitCanvas);
