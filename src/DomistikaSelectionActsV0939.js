import './v0939/recentBrushes.js';

export const VERSION = '0.9.39';
export const SCHEMA = 'domistika.selection-acts.v1';

if (typeof document !== 'undefined') {
  document.documentElement.dataset.selectionActs = VERSION;
}
if (typeof window !== 'undefined') {
  window.domistikaSelectionActsV0939 = Object.freeze({
    version: VERSION,
    schema: SCHEMA,
  });
}
