import './v0941/sectorSurgeryRuntime.js';
import './v0941/sectorSurgeryPanel.js';

export const VERSION = '0.9.41';
export const SCHEMA = 'domistika.sector-surgery.v1';

if (typeof document !== 'undefined') {
  document.documentElement.dataset.sectorSurgery = VERSION;
}
