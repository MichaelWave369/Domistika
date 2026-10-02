import './v0940/layeredExitRuntime.js';

export const VERSION = '0.9.40';
export const SCHEMA = 'domistika.layered-exit.v1';

if (typeof document !== 'undefined') {
  document.documentElement.dataset.layeredExit = VERSION;
}
