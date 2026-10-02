import {
  applyDraftingGuide,
  clearDraftingGuide,
  activeDraftingGuide,
  setDraftingGuideSnap,
  setDraftingGuideVisible,
} from './draftingGuideRuntime.js';

function addStyles() {
  if (document.querySelector('#domistikaV0938DraftingGuideStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV0938DraftingGuideStyles';
  style.textContent = [
    '.drafting-guides{margin-top:10px;padding:10px;border:1px solid rgba(148,163,184,.16);border-radius:10px}',
    '.drafting-guides h3{margin:0 0 3px;font-size:11px}',
    '.drafting-guides p{margin:0 0 8px;font-size:9px;color:var(--muted)}',
    '.drafting-guide-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}',
    '.drafting-guide-toggles{display:flex;gap:10px;margin-top:8px;font-size:9px;align-items:center}',
    '.drafting-guide-state{margin-top:7px;font-size:9px;color:var(--muted)}',
  ].join('');
  document.head.appendChild(style);
}

function label(kind) {
  return ({
    'horizontal-ruler': 'Horizontal ruler',
    'vertical-ruler': 'Vertical ruler',
    ellipse: 'Ellipse',
    'one-point': '1-point perspective',
  })[kind] || 'Off';
}

function render(root) {
  const active = activeDraftingGuide();
  root.querySelector('#draftingGuideSnap').checked = active?.snap !== false;
  root.querySelector('#draftingGuideVisible').checked = active?.visible !== false;
  root.querySelector('#draftingGuideSnap').disabled = !active;
  root.querySelector('#draftingGuideVisible').disabled = !active;
  root.querySelector('#draftingGuideClear').disabled = !active;
  root.querySelector('.drafting-guide-state').textContent = active
    ? label(active.kind) + ' · ' + (active.snap ? 'snap on' : 'snap off')
    : 'No active drafting guide';
}

function init() {
  const panel = document.querySelector('#layersPanel');
  if (!panel || document.querySelector('#draftingGuidesV0938')) return false;
  addStyles();
  const root = document.createElement('section');
  root.id = 'draftingGuidesV0938';
  root.className = 'drafting-guides';
  root.innerHTML = `
    <h3>Drafting guides</h3>
    <p>Guide-role overlays · excluded from export</p>
    <div class="drafting-guide-actions">
      <button data-guide="horizontal-ruler">H ruler</button>
      <button data-guide="vertical-ruler">V ruler</button>
      <button data-guide="ellipse">Ellipse</button>
      <button data-guide="one-point">1-point</button>
    </div>
    <div class="drafting-guide-toggles">
      <label><input id="draftingGuideSnap" type="checkbox" checked> Snap</label>
      <label><input id="draftingGuideVisible" type="checkbox" checked> Visible</label>
      <button id="draftingGuideClear" type="button">Clear</button>
    </div>
    <div class="drafting-guide-state"></div>
  `;
  panel.appendChild(root);

  root.querySelectorAll('[data-guide]').forEach((button) => {
    button.addEventListener('click', () => {
      applyDraftingGuide(button.dataset.guide, { snap: true, visible: true });
      render(root);
    });
  });
  root.querySelector('#draftingGuideSnap').addEventListener('change', (event) => {
    setDraftingGuideSnap(event.target.checked);
    render(root);
  });
  root.querySelector('#draftingGuideVisible').addEventListener('change', (event) => {
    setDraftingGuideVisible(event.target.checked);
    render(root);
  });
  root.querySelector('#draftingGuideClear').addEventListener('click', () => {
    clearDraftingGuide();
    render(root);
  });
  document.addEventListener('domistika:v0938-drafting-guide', () => render(root));
  render(root);
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 720) return;
  requestAnimationFrame(() => wait(attempt + 1));
}

wait();
