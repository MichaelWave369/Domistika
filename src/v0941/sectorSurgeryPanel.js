import { getEngine, setStatus } from '../v093/runtime.js';
import {
  beginSectorSurgery,
  activeSectorSurgery,
  refoldSectorSurgery,
  sealSectorSurgery,
  cancelSectorSurgery,
} from './sectorSurgeryRuntime.js';

let pickArmed = false;

function addStyles() {
  if (document.querySelector('#domistikaV0941SectorSurgeryStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV0941SectorSurgeryStyles';
  style.textContent = [
    '.sector-surgery{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}',
    '.sector-surgery h3{margin:0;font-size:11px}.sector-surgery p{margin:3px 0 8px;color:var(--muted);font-size:8px;line-height:1.4}',
    '.sector-surgery-actions{display:flex;flex-wrap:wrap;gap:6px}',
    '.sector-surgery-state{margin-top:7px;padding:7px;border:1px solid rgba(250,204,21,.2);border-radius:8px;color:var(--muted);font-size:8px}',
    '.sector-surgery [data-sector-pick].active{border-color:rgba(250,204,21,.7)!important;background:rgba(250,204,21,.12)!important}',
  ].join('');
  document.head.appendChild(style);
}

function canvasPoint(event, engine) {
  const rect = engine.overlay.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(engine.width, (event.clientX - rect.left) * (engine.width / rect.width))),
    y: Math.max(0, Math.min(engine.height, (event.clientY - rect.top) * (engine.height / rect.height))),
  };
}

function render(section) {
  const state = activeSectorSurgery();
  const pick = section.querySelector('[data-sector-pick]');
  pick.classList.toggle('active', pickArmed);
  pick.textContent = pickArmed ? 'Click a plate sector…' : 'Pick one sector';

  section.querySelector('[data-sector-refold]').disabled = !state;
  section.querySelector('[data-sector-seal]').disabled = !state;
  section.querySelector('[data-sector-cancel]').disabled = !state;

  section.querySelector('.sector-surgery-state').textContent = state
    ? `${state.plateLabel} · ${state.regionLabel} · sector ${state.sectorIndex + 1}/${state.sectorCount} · repair layer unlocked`
    : 'No sector repair active.';
}

async function armPick(section) {
  const engine = getEngine();
  if (!engine?.settings?.compositionPlateId) {
    setStatus('Apply a Composition Plate before picking a repair sector');
    return;
  }
  if (activeSectorSurgery()) {
    setStatus('Finish or cancel the active sector repair first');
    return;
  }
  if (window.domistikaSelectionV04?.active) await window.domistikaSelectionV04.cancel?.();
  window.domistikaSelectionV04?.disable?.();
  pickArmed = true;
  render(section);
  setStatus('Sector Surgery armed · click one radial plate region');
}

function init() {
  const parent = document.querySelector('#compositionPlatesSection');
  const engine = getEngine();
  if (!parent || !engine) return false;
  if (document.querySelector('#sectorSurgerySection')) return true;
  addStyles();

  const section = document.createElement('section');
  section.id = 'sectorSurgerySection';
  section.className = 'sector-surgery';
  section.innerHTML = `
    <h3>Sector surgery</h3>
    <p>Lock the source. Redraw one radial sector on a repair layer. Refold only when you choose.</p>
    <div class="sector-surgery-actions">
      <button type="button" data-sector-pick>Pick one sector</button>
      <button type="button" data-sector-refold disabled>Refold + lock</button>
      <button type="button" data-sector-seal disabled>Seal only</button>
      <button type="button" data-sector-cancel disabled>Cancel</button>
    </div>
    <div class="sector-surgery-state">No sector repair active.</div>
  `;
  parent.appendChild(section);

  section.querySelector('[data-sector-pick]').addEventListener('click', () => { void armPick(section); });
  section.querySelector('[data-sector-refold]').addEventListener('click', () => {
    try { refoldSectorSurgery(); } catch (error) { setStatus(error.message); }
    render(section);
  });
  section.querySelector('[data-sector-seal]').addEventListener('click', () => {
    try { sealSectorSurgery(); } catch (error) { setStatus(error.message); }
    render(section);
  });
  section.querySelector('[data-sector-cancel]').addEventListener('click', () => {
    cancelSectorSurgery();
    render(section);
  });

  engine.overlay.addEventListener('pointerdown', (event) => {
    if (!pickArmed) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pickArmed = false;
    try {
      beginSectorSurgery(canvasPoint(event, engine));
    } catch (error) {
      setStatus(error.message);
    }
    render(section);
  }, true);

  document.addEventListener('domistika:v0941-sector-surgery', () => render(section));
  render(section);
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 720) return;
  requestAnimationFrame(() => wait(attempt + 1));
}

wait();
