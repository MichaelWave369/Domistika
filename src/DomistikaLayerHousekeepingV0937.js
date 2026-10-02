const VERSION = '0.9.37';
const SCHEMA = 'domistika.layer-housekeeping.v1';

function addStyles() {
  if (document.querySelector('#domistikaV0937LayerHousekeepingStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV0937LayerHousekeepingStyles';
  style.textContent = [
    '.layer-lock-button{min-width:28px;padding:4px 5px!important;font-size:12px;line-height:1}',
    '.layer-row.locked{box-shadow:inset 0 0 0 1px rgba(244,63,94,.2)}',
    '.layer-row.locked .layer-name{font-weight:700}',
    '.layer-group-badge{display:block;margin-top:3px;color:var(--muted);font-size:8px;line-height:1.2;letter-spacing:.02em}',
    '.layer-actions{flex-wrap:wrap}',
  ].join('');
  document.head.appendChild(style);
}

addStyles();
document.documentElement.dataset.layerHousekeeping = VERSION;

if (typeof window !== 'undefined') {
  window.domistikaLayerHousekeepingV0937 = Object.freeze({
    version: VERSION,
    schema: SCHEMA,
  });
}

export { VERSION, SCHEMA };
