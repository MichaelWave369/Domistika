import { listCompositionPlates } from './compositionPlates.js';
import {
  activeCompositionPlate,
  applyCompositionPlate,
  clearCompositionPlate,
} from './compositionPlateRuntime.js';

const plates = listCompositionPlates();

function escapeHtml(value) {
  return String(value).replace(/[&<>\'\"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character]);
}

function addStyles() {
  if (document.querySelector('#domistikaV0935PlateStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV0935PlateStyles';
  style.textContent = [
    '.composition-plates{border-top:1px solid rgba(255,255,255,.08);padding-top:12px}',
    '.composition-plate-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}',
    '.composition-plate-card{display:grid;gap:4px;padding:9px!important;min-height:88px;text-align:left!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:12px!important;background:rgba(255,255,255,.025)!important;box-shadow:none!important;transform:none!important}',
    '.composition-plate-card:hover,.composition-plate-card.active{border-color:rgba(34,211,238,.42)!important;background:rgba(34,211,238,.075)!important;filter:none!important}',
    '.composition-plate-card strong{font-size:10px}.composition-plate-card span{color:var(--muted);font-size:8px;line-height:1.35}.composition-plate-card b{color:#9ee9ff;font-size:8px;text-transform:uppercase;letter-spacing:.08em}',
    '.composition-plate-state{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--muted);font-size:8px}.composition-plate-state button{padding:5px 8px;font-size:8px}',
    'html.domistika-retro-basement .composition-plate-card{color:#2c2015!important;border-color:rgba(83,54,29,.25)!important;background:rgba(255,248,220,.28)!important}html.domistika-retro-basement .composition-plate-card span,html.domistika-retro-basement .composition-plate-state{color:#675238}',
    '@media(max-width:680px){.composition-plate-grid{grid-template-columns:1fr}}',
  ].join('');
  document.head.appendChild(style);
}

function cards() {
  return plates.map((plate) => {
    const protectedCount = plate.regions.filter((item) => item.excluded).length;
    const kicker = protectedCount ? protectedCount + ' protected region' + (protectedCount === 1 ? '' : 's') : plate.regions.length + ' region laws';
    return '<button type="button" class="composition-plate-card" data-composition-plate="' + escapeHtml(plate.id) + '">'
      + '<b>' + escapeHtml(kicker) + '</b>'
      + '<strong>' + escapeHtml(plate.label) + '</strong>'
      + '<span>' + escapeHtml(plate.description) + '</span>'
      + '</button>';
  }).join('');
}

function sync(section) {
  const active = activeCompositionPlate();
  section.querySelectorAll('[data-composition-plate]').forEach((button) => {
    button.classList.toggle('active', button.dataset.compositionPlate === active?.id);
  });
  const state = section.querySelector('#compositionPlateStateText');
  if (state) {
    state.textContent = active
      ? active.label + ' active · ' + active.regionCount + ' regions' + (active.excluded.length ? ' · protected: ' + active.excluded.join(', ') : '')
      : 'No plate active. Symmetry applies globally.';
  }
}

function init() {
  const panel = document.querySelector('#symmetryRecipesPanel');
  if (!panel) return false;
  if (document.querySelector('#compositionPlatesSection')) return true;
  addStyles();

  const section = document.createElement('section');
  section.id = 'compositionPlatesSection';
  section.className = 'recipe-section composition-plates';
  section.innerHTML = '<div class="recipe-section-head"><div><h3>Composition plates</h3><small>Different regions can obey different symmetry laws. Protected regions remain hand-authority only.</small></div></div>'
    + '<div class="composition-plate-grid">' + cards() + '</div>'
    + '<div class="composition-plate-state"><span id="compositionPlateStateText">No plate active.</span><button type="button" id="clearCompositionPlate">Clear plate</button></div>';

  panel.appendChild(section);
  section.querySelectorAll('[data-composition-plate]').forEach((button) => {
    button.addEventListener('click', () => {
      applyCompositionPlate(button.dataset.compositionPlate);
      sync(section);
    });
  });
  section.querySelector('#clearCompositionPlate')?.addEventListener('click', () => {
    clearCompositionPlate();
    sync(section);
  });
  document.addEventListener('domistika:v0935-composition-plate', () => sync(section));
  sync(section);
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 720) return;
  requestAnimationFrame(() => wait(attempt + 1));
}
wait();
