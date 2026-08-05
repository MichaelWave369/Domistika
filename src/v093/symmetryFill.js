import { CanvasEngine } from '../core/CanvasEngine.js';
import { getEngine, setStatus } from './runtime.js';

const originalPointerDown = CanvasEngine.prototype.pointerDown;

function uniqueSymmetryPoints(engine, point) {
  const seen = new Set();
  const points = [];
  for (const transform of engine.symmetryTransforms()) {
    const transformed = transform(point);
    const x = Math.max(0, Math.min(engine.width - 1, Math.floor(transformed.x)));
    const y = Math.max(0, Math.min(engine.height - 1, Math.floor(transformed.y)));
    const key = `${x}:${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({ ...transformed, x, y });
  }
  return points;
}

function symmetryFill(engine, point) {
  const fillApi = window.domistikaFillV091;
  if (!fillApi?.fillAt) return false;
  const points = uniqueSymmetryPoints(engine, point);
  const originalCaptureHistory = engine.captureHistory;
  const originalMarkChanged = engine.markChanged;
  let captured = false;
  let completed = 0;

  engine.captureHistory = function captureSymmetryFillHistory() {
    if (captured) return;
    captured = true;
    return originalCaptureHistory.call(engine);
  };
  engine.markChanged = () => {};

  try {
    for (const target of points) {
      if (fillApi.fillAt(target.x, target.y)) completed += 1;
    }
  } finally {
    engine.captureHistory = originalCaptureHistory;
    engine.markChanged = originalMarkChanged;
  }

  if (completed > 0) {
    originalMarkChanged.call(engine, `Symmetry fill committed across ${completed} region${completed === 1 ? '' : 's'}`);
    document.dispatchEvent(new CustomEvent('domistika:v093-symmetry-fill', {
      detail: { symmetry: engine.settings.symmetry, regions: completed },
    }));
    return true;
  }
  engine.onStatus('No new mirrored regions were filled');
  return false;
}

CanvasEngine.prototype.pointerDown = function pointerDownV093SymmetryFill(event) {
  const symmetryEnabled = this.settings.fillSymmetry === true && this.settings.symmetry !== 'none';
  const normalFillClick = this.tool === 'fill'
    && event.button !== 1
    && event.button !== 2
    && !event.altKey
    && !this.spacePan;
  if (!symmetryEnabled || !normalFillClick) return originalPointerDown.call(this, event);
  if (this.activeLayer?.kind === 'guide' && this.activeLayer.locked) {
    this.onStatus('Guide layers are locked. Select an art layer before filling.');
    return;
  }
  event.preventDefault();
  symmetryFill(this, this.eventPoint(event));
};

function addStyles() {
  if (document.querySelector('#domistikaV093SymmetryFillStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV093SymmetryFillStyles';
  style.textContent = `
    .fill-symmetry-toggle{min-height:28px!important;padding:5px 7px!important;font-size:8px!important;white-space:nowrap}
    .fill-symmetry-toggle.active{box-shadow:inset 0 0 0 1px currentColor,0 0 8px rgba(127,90,240,.22)}
    html.domistika-16bit-console .fill-symmetry-toggle.active{color:#f5c542!important;border-color:#8b5cf6!important;background:#172249!important;box-shadow:inset 1px 1px rgba(255,255,255,.12),inset -2px -2px rgba(0,0,0,.65),0 0 10px rgba(139,92,246,.38)!important}
  `;
  document.head.appendChild(style);
}

function syncButton(button, engine) {
  const enabled = engine.settings.fillSymmetry === true;
  button.setAttribute('aria-pressed', String(enabled));
  button.classList.toggle('active', enabled);
  button.textContent = enabled ? 'Symmetry fill ✓' : 'Symmetry fill';
  button.title = enabled
    ? 'One click fills every matching symmetry region'
    : 'Fill only the clicked region';
}

function init() {
  const controls = document.querySelector('#fillControls');
  const engine = getEngine();
  if (!controls || !engine) return false;
  if (document.querySelector('#fillSymmetryToggle')) return true;
  addStyles();
  engine.settings.fillSymmetry ??= false;

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'fillSymmetryToggle';
  button.className = 'toggle-button fill-symmetry-toggle';
  controls.appendChild(button);
  syncButton(button, engine);

  button.addEventListener('click', () => {
    engine.settings.fillSymmetry = engine.settings.fillSymmetry !== true;
    syncButton(button, engine);
    setStatus(engine.settings.fillSymmetry
      ? 'Symmetry fill enabled — one click will fill every mirrored region'
      : 'Symmetry fill disabled — only the clicked region will fill');
  });

  document.addEventListener('domistika:v091-filled', () => syncButton(button, engine));
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 720) return;
  requestAnimationFrame(() => wait(attempt + 1));
}

wait();

window.domistikaSymmetryFillV093 = {
  fillAt: (x, y) => {
    const engine = getEngine();
    return engine ? symmetryFill(engine, { x, y, pressure: 1 }) : false;
  },
};
