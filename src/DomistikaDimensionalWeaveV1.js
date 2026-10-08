import './v0942/dimensionalWeaveRuntime.js';
import './v0942/dimensionalWeavePanel.js';

export { SCHEMA, VERSION } from './v0942/dimensionalWeave.js';

if (typeof document !== 'undefined') {
  document.documentElement.dataset.dimensionalWeave = 'v1';
}
