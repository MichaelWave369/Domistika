import {
  VERSION,
  SCHEMA,
  PSD_MIME,
  layeredExitDecision,
  layeredExitManifest,
  exportLayeredPsd,
} from './layeredExit.js';
import { getEngine } from '../v093/runtime.js';

function engine() {
  const current = getEngine();
  if (!current) throw new Error('DOMISTIKA_LAYERED_EXIT_ENGINE_UNAVAILABLE');
  return current;
}

export function inspectLayeredExit() {
  return layeredExitManifest(engine());
}

export function exportCurrentLayeredPsd() {
  return exportLayeredPsd(engine());
}

if (typeof window !== 'undefined') {
  window.domistikaLayeredExitV0940 = Object.freeze({
    version: VERSION,
    schema: SCHEMA,
    mime: PSD_MIME,
    inspect: inspectLayeredExit,
    exportPsd: exportCurrentLayeredPsd,
    decision: layeredExitDecision,
  });
}
