import { CanvasEngine } from '../core/CanvasEngine.js';
import { clamp, hexToRgba } from '../core/utils.js';

const MAX_FILL_PIXELS = 16_000_000;
let latestEngine = null;

const originalBindEvents = CanvasEngine.prototype.bindEvents;
const originalPointerDown = CanvasEngine.prototype.pointerDown;

function addStyles() {
  if (document.querySelector('#domistikaV091FillStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV091FillStyles';
  style.textContent = `
    .fill-tool-button span{font-size:19px!important}
    .fill-controls{display:flex;align-items:center;gap:6px;padding:4px 6px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}
    .fill-controls[hidden]{display:none!important}
    .fill-controls label{display:grid!important;grid-template-columns:auto auto!important;gap:1px 5px!important;font-size:8px!important}
    .fill-controls input[type="range"]{grid-column:1/-1!important;width:72px!important;height:10px!important}
    .fill-controls output{font-size:8px!important}
    .fill-sample-toggle{min-height:28px!important;padding:5px 7px!important;font-size:8px!important}
    html.domistika-retro-basement .fill-controls{border-color:#71543a;background:#dfd0a7;box-shadow:inset 0 2px 3px rgba(72,45,22,.18)}
    @media(max-width:680px){.fill-controls{display:none!important}}
  `;
  document.head.appendChild(style);
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

function fillRegion(engine, point) {
  const layer = engine.activeLayer;
  if (!layer) return false;
  const width = engine.width;
  const height = engine.height;
  const pixelCount = width * height;
  if (pixelCount > MAX_FILL_PIXELS) {
    engine.onStatus('Fill is limited to 16 million pixels to protect browser memory. Resize the canvas or fill a smaller project.');
    return false;
  }

  const x = clamp(Math.floor(point.x), 0, width - 1);
  const y = clamp(Math.floor(point.y), 0, height - 1);
  const sampleAll = engine.settings.fillSampleAll !== false;
  const sourceCanvas = sampleAll ? engine.compositeCanvas(false) : layer.canvas;
  const source = sourceCanvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, width, height);
  const destination = layer.ctx.getImageData(0, 0, width, height);
  const startIndex = y * width + x;
  const startOffset = startIndex * 4;
  const target = [source.data[startOffset], source.data[startOffset + 1], source.data[startOffset + 2], source.data[startOffset + 3]];
  const tolerance = clamp(Number(engine.settings.fillTolerance ?? 28), 0, 100);
  const { r, g, b } = hexToRgba(engine.settings.color);
  const replacement = [r, g, b, Math.round(clamp(Number(engine.settings.opacity), 0.01, 1) * 255)];

  const visited = new Uint8Array(pixelCount);
  const stack = new Int32Array(pixelCount);
  let stackSize = 0;
  let changed = 0;
  stack[stackSize++] = startIndex;
  visited[startIndex] = 1;

  while (stackSize > 0) {
    const index = stack[--stackSize];
    const offset = index * 4;
    if (!colorMatches(source.data, offset, target, tolerance)) continue;

    if (destination.data[offset] !== replacement[0]
      || destination.data[offset + 1] !== replacement[1]
      || destination.data[offset + 2] !== replacement[2]
      || destination.data[offset + 3] !== replacement[3]) {
      destination.data[offset] = replacement[0];
      destination.data[offset + 1] = replacement[1];
      destination.data[offset + 2] = replacement[2];
      destination.data[offset + 3] = replacement[3];
      changed += 1;
    }

    const px = index % width;
    if (px > 0) {
      const next = index - 1;
      if (!visited[next]) { visited[next] = 1; stack[stackSize++] = next; }
    }
    if (px < width - 1) {
      const next = index + 1;
      if (!visited[next]) { visited[next] = 1; stack[stackSize++] = next; }
    }
    if (index >= width) {
      const next = index - width;
      if (!visited[next]) { visited[next] = 1; stack[stackSize++] = next; }
    }
    if (index < pixelCount - width) {
      const next = index + width;
      if (!visited[next]) { visited[next] = 1; stack[stackSize++] = next; }
    }
  }

  if (!changed) {
    engine.onStatus('That region already uses the selected fill color');
    return false;
  }
  engine.captureHistory();
  layer.ctx.putImageData(destination, 0, 0);
  engine.markChanged(`Filled ${changed.toLocaleString()} pixels`);
  document.dispatchEvent(new CustomEvent('domistika:v091-filled', {
    detail: { layerId: layer.id, changed, tolerance, sampleAll, color: engine.settings.color },
  }));
  return true;
}

CanvasEngine.prototype.bindEvents = function bindEventsV091Fill() {
  latestEngine = this;
  this.settings.fillTolerance ??= 28;
  this.settings.fillSampleAll ??= true;
  const result = originalBindEvents.call(this);
  document.dispatchEvent(new CustomEvent('domistika:v091-fill-engine', { detail: { engine: this } }));
  return result;
};

CanvasEngine.prototype.pointerDown = function pointerDownV091Fill(event) {
  if (this.tool !== 'fill') return originalPointerDown.call(this, event);
  if (event.button === 1 || event.button === 2 || event.altKey || this.spacePan) return originalPointerDown.call(this, event);
  if (this.activeLayer?.kind === 'guide' && this.activeLayer.locked) {
    this.onStatus('Guide layers are locked. Select an art layer before filling.');
    return;
  }
  event.preventDefault();
  fillRegion(this, this.eventPoint(event));
};

function selectFill(button, controls) {
  if (!latestEngine) return;
  latestEngine.setTool('fill');
  document.querySelectorAll('[data-tool]').forEach((candidate) => candidate.classList.toggle('active', candidate === button));
  controls.hidden = false;
  latestEngine.onStatus('Fill selected — click a bounded area. Press Alt or right-click to pick a color.');
}

function addShortcutRow() {
  const grid = document.querySelector('#shortcutsDialog .shortcut-grid');
  if (!grid || grid.querySelector('[data-v091-fill-shortcut]')) return;
  const row = document.createElement('span');
  row.dataset.v091FillShortcut = 'true';
  row.innerHTML = '<kbd>F</kbd> Fill bounded area';
  grid.appendChild(row);
}

function init() {
  const toolList = document.querySelector('.tool-list');
  const controlDeck = document.querySelector('.control-deck');
  if (!toolList || !controlDeck || !latestEngine) return false;
  if (document.querySelector('[data-tool="fill"]')) return true;
  addStyles();

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tool-button fill-tool-button';
  button.dataset.tool = 'fill';
  button.title = 'Fill (F)';
  button.innerHTML = '<span>▣</span><small>Fill</small>';
  const eraser = toolList.querySelector('[data-tool="eraser"]');
  eraser ? eraser.insertAdjacentElement('afterend', button) : toolList.appendChild(button);

  const controls = document.createElement('div');
  controls.id = 'fillControls';
  controls.className = 'fill-controls';
  controls.hidden = true;
  controls.innerHTML = `<label>Fill tolerance <output id="fillToleranceOutput">${Math.round(latestEngine.settings.fillTolerance)}</output><input id="fillToleranceInput" type="range" min="0" max="100" value="${Math.round(latestEngine.settings.fillTolerance)}"></label><button type="button" class="toggle-button fill-sample-toggle" id="fillSampleToggle" aria-pressed="${latestEngine.settings.fillSampleAll !== false}">All visible</button>`;
  controlDeck.appendChild(controls);

  button.addEventListener('click', () => selectFill(button, controls));
  controls.querySelector('#fillToleranceInput').addEventListener('input', (event) => {
    latestEngine.settings.fillTolerance = Number(event.target.value);
    controls.querySelector('#fillToleranceOutput').textContent = event.target.value;
  });
  controls.querySelector('#fillSampleToggle').addEventListener('click', (event) => {
    const enabled = event.currentTarget.getAttribute('aria-pressed') !== 'true';
    event.currentTarget.setAttribute('aria-pressed', String(enabled));
    event.currentTarget.classList.toggle('active', enabled);
    event.currentTarget.textContent = enabled ? 'All visible' : 'Active layer';
    latestEngine.settings.fillSampleAll = enabled;
  });
  controls.querySelector('#fillSampleToggle').classList.toggle('active', latestEngine.settings.fillSampleAll !== false);

  document.addEventListener('click', (event) => {
    const selected = event.target.closest('[data-tool]');
    if (!selected) return;
    requestAnimationFrame(() => { controls.hidden = selected.dataset.tool !== 'fill'; });
  });
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input,select,textarea') || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      selectFill(button, controls);
    }
  });
  addShortcutRow();
  window.domistikaFillV091 = {
    select: () => selectFill(button, controls),
    fillAt: (x, y) => fillRegion(latestEngine, { x, y }),
    getSettings: () => ({ tolerance: latestEngine.settings.fillTolerance, sampleAll: latestEngine.settings.fillSampleAll }),
  };
  document.documentElement.dataset.fillTool = 'v0.9.1';
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 540) return;
  requestAnimationFrame(() => wait(attempt + 1));
}

wait();
