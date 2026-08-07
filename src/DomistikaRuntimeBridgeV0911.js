import { CanvasEngine } from './core/CanvasEngine.js';

const INSTALL_FLAG = '__domistikaRuntimeBridgeV0911Installed';

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;

  const originalCreateLayer = CanvasEngine.prototype.createLayer;
  CanvasEngine.prototype.createLayer = function domistikaRuntimeBridgeCreateLayer(...args) {
    const layer = originalCreateLayer.apply(this, args);

    if (!window.__domistikaEngine) {
      window.__domistikaEngine = this;
      window.__domistikaStatus = (message) => this.onStatus?.(message);
      queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent('domistika:ready', {
          detail: { engine: this, status: window.__domistikaStatus },
        }));
      });
    }

    return layer;
  };
}
