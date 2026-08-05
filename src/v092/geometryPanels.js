import { PHI, FIBONACCI, SACRED_MODES, PHI_MODES, setPatternMode } from './geometryModes.js';

const SACRED_COPY = Object.freeze({
  'sacred-vesica': ['Two living circles', 'Mirrored offset copies form a vesica field.'],
  'sacred-trinity': ['Threefold balance', 'Three related centers rotate around one shared origin.'],
  'sacred-seed-6': ['Seed of Life', 'A center copy and six surrounding copies build a seven-cell seed.'],
  'sacred-flower-12': ['Flower of Life', 'Layered inner and outer rings create a dense living lattice.'],
  'sacred-metatron-13': ['Metatron Field', 'Thirteen scaled placements create a structured sacred-tech network.'],
  'sacred-hexgrid-7': ['Hex Cell Lattice', 'Seven equal cells repeat without rotating the original mark.'],
});

const PHI_COPY = Object.freeze({
  'phi-spiral-13': ['Phi Spiral 13', 'Thirteen copies rotate, shrink, and travel along a golden spiral.'],
  'phi-bloom-21': ['Phi Bloom 21', 'Golden-angle placement builds an organic phyllotaxis bloom.'],
  'golden-angle-34': ['Golden Angle 34', 'Thirty-four compact copies form a dense sunflower-like field.'],
  'fib-ring-13': ['Fibonacci Ring', 'Thirteen arms vary using Fibonacci-scaled proportions.'],
  'fib-echo-8': ['Fibonacci Echo', 'Eight copies travel through space using Fibonacci-weighted offsets.'],
  'phi-mirror-12': ['Phi Mirror 12', 'Alternating mirrored arms shift between full and golden-ratio scale.'],
});

function addStyles() {
  if (document.querySelector('#domistikaV092GeometryPanelStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV092GeometryPanelStyles';
  style.textContent = `
    .geometry-panel{padding:12px!important;background:linear-gradient(180deg,rgba(255,197,110,.035),transparent)}
    .geometry-hero{display:grid;gap:6px;margin-bottom:11px;padding:12px;border:1px solid rgba(255,197,110,.18);border-radius:14px;background:radial-gradient(circle at 88% 15%,rgba(102,216,255,.12),transparent 42%),rgba(255,255,255,.025)}
    .geometry-hero strong{font-size:16px}.geometry-hero p{margin:0;color:var(--muted);font-size:9px;line-height:1.5}.geometry-formula{color:#ffd18b;font:900 14px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em}
    .geometry-section{display:grid;gap:7px;margin-top:12px}.geometry-section-head{display:flex;align-items:end;justify-content:space-between;gap:8px}.geometry-section h3{margin:0;font-size:12px}.geometry-section small{color:var(--muted);font-size:8px}
    .geometry-card-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.geometry-mode-card{display:grid;gap:4px;min-height:82px;padding:9px!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:12px!important;text-align:left!important;background:rgba(255,255,255,.025)!important;box-shadow:none!important;transform:none!important}.geometry-mode-card:hover{border-color:rgba(102,216,255,.34)!important;background:rgba(102,216,255,.07)!important;filter:none!important}.geometry-mode-card strong{font-size:10px}.geometry-mode-card span{color:var(--muted);font-size:8px;line-height:1.35}.geometry-mode-card b{color:#9ee9ff;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
    .radial-count-row{display:grid;grid-template-columns:1fr auto;gap:6px}.radial-count-row input{width:100%;padding:8px;border:1px solid var(--line);border-radius:9px;color:var(--ink);background:var(--panel2);font:800 11px ui-monospace,SFMono-Regular,Menlo,monospace}.radial-count-row button{padding:7px 10px;font-size:9px}.radial-quick-row{display:flex;flex-wrap:wrap;gap:5px}.radial-quick-row button{padding:5px 7px;font-size:8px}
    html.domistika-retro-basement .geometry-panel{color:#2e2114!important;background:linear-gradient(#d5c499,#b9a477)!important}
    html.domistika-retro-basement .geometry-hero{border-color:#82603b;background:radial-gradient(circle at 88% 15%,rgba(117,132,55,.24),transparent 45%),rgba(255,248,220,.25)}
    html.domistika-retro-basement .geometry-hero p,html.domistika-retro-basement .geometry-section small,html.domistika-retro-basement .geometry-mode-card span{color:#675238}
    html.domistika-retro-basement .geometry-formula{color:#9b491e;text-shadow:0 1px 0 rgba(255,255,255,.42)}
    html.domistika-retro-basement .geometry-mode-card{color:#2c2015!important;border-color:rgba(83,54,29,.25)!important;background:rgba(255,248,220,.28)!important}.domistika-retro-basement .geometry-mode-card b{color:#8d4a22}
    html.domistika-retro-basement .radial-count-row input{color:#2c2115;border-color:#74573a;background:#e5d6ae}
    @media(max-width:680px){.geometry-card-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function cards(modes, copy) {
  return modes.map(([mode]) => {
    const [title, description] = copy[mode];
    return `<button type="button" class="geometry-mode-card" data-geometry-mode="${mode}"><b>Apply pattern</b><strong>${title}</strong><span>${description}</span></button>`;
  }).join('');
}

function activate(tab, panel) {
  document.querySelectorAll('.inspector-tabs button[data-panel]').forEach((button) => button.classList.toggle('active', button === tab));
  document.querySelectorAll('.inspector-panel').forEach((candidate) => candidate.classList.toggle('active', candidate === panel));
}

function applyMode(mode, label = null) {
  if (!setPatternMode(mode, label)) return;
  const status = document.querySelector('#statusMessage');
  const select = document.querySelector('#symmetryInput');
  const text = select?.selectedOptions?.[0]?.textContent || label || mode;
  if (status) status.textContent = `${text} pattern active`;
}

function bindPanel(panel) {
  panel.querySelectorAll('[data-geometry-mode]').forEach((button) => button.addEventListener('click', () => applyMode(button.dataset.geometryMode)));
  panel.querySelectorAll('[data-radial-count]').forEach((button) => button.addEventListener('click', () => applyMode(`radial-${button.dataset.radialCount}`, `Radial ${button.dataset.radialCount}`)));
  const input = panel.querySelector('#customRadialCount');
  const apply = panel.querySelector('#applyCustomRadial');
  if (input && apply) {
    const commit = () => {
      const count = Math.max(2, Math.min(96, Math.round(Number(input.value) || 12)));
      input.value = String(count);
      applyMode(`radial-${count}`, `Radial ${count}`);
    };
    apply.addEventListener('click', commit);
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } });
  }
}

function init() {
  const inspector = document.querySelector('.inspector');
  const tabs = inspector?.querySelector('.inspector-tabs');
  if (!inspector || !tabs) return false;
  if (document.querySelector('#sacredGeometryPanel')) return true;
  addStyles();

  const sacredTab = document.createElement('button');
  sacredTab.dataset.panel = 'sacredGeometryPanel';
  sacredTab.textContent = 'Sacred Geometry';
  const phiTab = document.createElement('button');
  phiTab.dataset.panel = 'phiFibonacciPanel';
  phiTab.textContent = 'Phi + Fib';
  tabs.append(sacredTab, phiTab);

  const sacredPanel = document.createElement('section');
  sacredPanel.id = 'sacredGeometryPanel';
  sacredPanel.className = 'inspector-panel geometry-panel';
  sacredPanel.innerHTML = `
    <div class="geometry-hero"><strong>Sacred Geometry Lab</strong><div class="geometry-formula">○ · △ · ⬡ · ✺</div><p>Repeat one Carbon-drawn mark through circles, triads, hex cells, seeds, flowers, and connected fields.</p></div>
    <section class="geometry-section"><div class="geometry-section-head"><div><h3>Sacred pattern engines</h3><small>Each mode changes how every new stroke is repeated.</small></div></div><div class="geometry-card-grid">${cards(SACRED_MODES, SACRED_COPY)}</div></section>
    <section class="geometry-section"><div class="geometry-section-head"><div><h3>Exact radial symmetry</h3><small>Type any arm count from 2 to 96.</small></div></div><div class="radial-count-row"><input id="customRadialCount" type="number" min="2" max="96" step="1" value="24" aria-label="Custom radial arm count"><button id="applyCustomRadial" type="button">Apply</button></div><div class="radial-quick-row">${[7,9,14,18,20,30,32,36,48].map((count) => `<button type="button" data-radial-count="${count}">${count}</button>`).join('')}</div></section>`;

  const phiPanel = document.createElement('section');
  phiPanel.id = 'phiFibonacciPanel';
  phiPanel.className = 'inspector-panel geometry-panel';
  phiPanel.innerHTML = `
    <div class="geometry-hero"><strong>Phi + Fibonacci Lab</strong><div class="geometry-formula">φ = ${PHI.toFixed(10)}…</div><p>${FIBONACCI.join(' · ')} · Golden-angle and Fibonacci placement create growth-like repetition rather than perfect mechanical sameness.</p></div>
    <section class="geometry-section"><div class="geometry-section-head"><div><h3>Growth pattern engines</h3><small>Spirals, blooms, rings, echoes, and proportional mirrors.</small></div></div><div class="geometry-card-grid">${cards(PHI_MODES, PHI_COPY)}</div></section>
    <section class="geometry-section"><div class="geometry-section-head"><div><h3>Extended families</h3><small>Also available in the top pattern selector.</small></div></div><div class="radial-quick-row"><button type="button" data-geometry-mode="spiral-13">Spiral 13</button><button type="button" data-geometry-mode="spiral-21">Spiral 21</button><button type="button" data-geometry-mode="kaleido-16">Kaleido 16</button><button type="button" data-geometry-mode="kaleido-24">Kaleido 24</button></div></section>`;

  inspector.append(sacredPanel, phiPanel);
  sacredTab.addEventListener('click', () => activate(sacredTab, sacredPanel));
  phiTab.addEventListener('click', () => activate(phiTab, phiPanel));
  bindPanel(sacredPanel);
  bindPanel(phiPanel);
  document.documentElement.dataset.geometryPanels = 'v0.9.2';
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 480) return;
  requestAnimationFrame(() => wait(attempt + 1));
}
wait();
