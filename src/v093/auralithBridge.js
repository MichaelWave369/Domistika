import {
  getEngine,
  getProjectName,
  readFavoriteColors,
  scaledCanvas,
  setStatus,
} from './runtime.js';
import { bindCreativeBridgeV2ContentHash } from './parallaxBridgeAdapter.js';

const BRIDGE_KEY = 'parallax-creative-bridge-v2';
const AURALITH_URL = 'https://michaelwave369.github.io/Auralith369/#domistika-import';

function addStyles() {
  if (document.querySelector('#domistikaV093BridgeStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV093BridgeStyles';
  style.textContent = `
    .auralith-bridge-button{display:flex;align-items:center;gap:5px;white-space:nowrap}
    .auralith-bridge-button .bridge-glyph{color:#00d4aa;font-weight:900;text-shadow:0 0 7px rgba(0,212,170,.45)}
    html.domistika-retro-basement .auralith-bridge-button .bridge-glyph{color:#75843a;text-shadow:none}
    html.domistika-16bit-console .auralith-bridge-button{border-color:#8b5cf6;color:#7dd3fc;background:linear-gradient(#24184d,#10182e)}
  `;
  document.head.appendChild(style);
}

function storePayload(payload) {
  try {
    localStorage.setItem(BRIDGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function protectedOverlayLayers(engine) {
  return (engine?.layers || [])
    .filter((layer) => layer.visible !== false)
    .filter((layer) => layer.role === 'type' || layer.motionPolicy === 'ignore')
    .slice(0, 16);
}

function semanticSummary(layer) {
  const entries = Array.isArray(layer.semanticOverlays) ? layer.semanticOverlays : [];
  return entries
    .filter((entry) => entry?.kind === 'text')
    .slice(0, 16)
    .map((entry) => ({
      kind: 'text',
      schema: entry.schema || 'domistika.semantic-text.v1',
      text: String(entry.text || '').slice(0, 1000),
      font: String(entry.font || '').slice(0, 240),
      mode: entry.mode === '3d' ? '3d' : '2d',
      size: Number(entry.size || 0),
      weight: String(entry.weight || ''),
      italic: Boolean(entry.italic),
      tracking: Number(entry.tracking || 0),
      lineHeight: Number(entry.lineHeight || 1),
      rotation: Number(entry.rotation || 0),
      fill: String(entry.fill || ''),
      stroke: String(entry.stroke || ''),
      strokeWidth: Number(entry.strokeWidth || 0),
      opacity: Number(entry.opacity ?? 1),
      x: Number(entry.x ?? 0.5),
      y: Number(entry.y ?? 0.5),
      align: String(entry.align || 'center'),
      preserveDuringStyle: entry.preserveDuringStyle !== false,
    }));
}

function buildRaster(engine, protectedLayers, options) {
  const composite = engine.compositeCanvas(true, '#ffffff', {
    excludeLayerIds: protectedLayers.map((layer) => layer.id),
  });
  return scaledCanvas(composite, options.maxDimension, false)
    .toDataURL('image/webp', options.quality);
}

function buildOverlays(protectedLayers, options) {
  return protectedLayers.map((layer, index) => ({
    id: 'overlay-' + (index + 1),
    kind: 'raster-overlay',
    role: layer.role === 'type' ? 'type' : 'motion-ignore',
    name: layer.name || ('Overlay ' + (index + 1)),
    sourceLayerId: layer.id,
    preserveDuringStyle: true,
    opacity: Number(layer.opacity ?? 1),
    blendMode: String(layer.blendMode || 'normal'),
    semantic: semanticSummary(layer),
    image: scaledCanvas(layer.canvas, options.maxDimension, false)
      .toDataURL('image/webp', Math.min(0.98, Math.max(0.8, options.quality + 0.05))),
  }));
}

async function buildPayload(options) {
  const engine = getEngine();
  if (!engine) throw new Error('Domistika canvas is not ready yet');
  const protectedLayers = protectedOverlayLayers(engine);
  const image = buildRaster(engine, protectedLayers, options);
  const overlays = buildOverlays(protectedLayers, options);
  return bindCreativeBridgeV2ContentHash({
    protocol: 'parallax-creative-bridge',
    version: 2,
    source: 'domistika',
    target: 'auralith369',
    createdAt: new Date().toISOString(),
    name: getProjectName(),
    image,
    overlays,
    canvas: { width: engine.width, height: engine.height },
    palette: readFavoriteColors(),
    symmetry: engine.settings?.symmetry || 'none',
    note: 'Transferred locally by the user from Domistika to Auralith369 with protected semantic overlays.',
  });
}

async function transfer() {
  const attempts = [
    { maxDimension: 1400, quality: 0.9 },
    { maxDimension: 1100, quality: 0.83 },
    { maxDimension: 800, quality: 0.76 },
  ];
  for (const options of attempts) {
    try {
      const payload = await buildPayload(options);
      if (storePayload(payload)) {
        setStatus('Artwork bridged to Auralith369 — opening the visual alchemy studio');
        window.open(AURALITH_URL, '_blank', 'noopener,noreferrer');
        document.dispatchEvent(new CustomEvent('domistika:v093-bridge-sent', {
          detail: {
            target: 'auralith369',
            version: 2,
            maxDimension: options.maxDimension,
            overlayCount: payload.overlays.length,
            contentHash: payload.contentHash,
          },
        }));
        return {
          ok: true,
          protocol: payload.protocol,
          version: payload.version,
          key: BRIDGE_KEY,
          target: 'auralith369',
          maxDimension: options.maxDimension,
          overlayCount: payload.overlays.length,
          baseContentHash: payload.baseContentHash,
          contentHash: payload.contentHash,
        };
      }
    } catch (error) {
      console.warn('Domistika bridge attempt failed', error);
    }
  }
  setStatus('The bridge package was too large or could not be integrity-bound. Try a smaller canvas or export the image normally.');
  return {
    ok: false,
    protocol: 'parallax-creative-bridge',
    version: 2,
    key: BRIDGE_KEY,
    target: 'auralith369',
    reason: 'BRIDGE_STORE_FAILED',
  };
}

function init() {
  const topActions = document.querySelector('.top-actions');
  if (!topActions || !getEngine()) return false;
  if (document.querySelector('#auralithBridgeButton')) return true;
  addStyles();
  const button = document.createElement('button');
  button.id = 'auralithBridgeButton';
  button.type = 'button';
  button.className = 'soft-button auralith-bridge-button';
  button.innerHTML = '<span class="bridge-glyph">◇</span><span>Auralith</span>';
  button.title = 'Send artwork plus protected semantic overlays to Auralith369';
  const gallery = topActions.querySelector('#openGalleryButton');
  gallery?.insertAdjacentElement('afterend', button);
  if (!gallery) topActions.insertBefore(button, topActions.firstChild);
  button.addEventListener('click', () => { void transfer(); });
  window.domistikaAuralithBridgeV093 = {
    transfer,
    key: BRIDGE_KEY,
    target: AURALITH_URL,
    protocolVersion: 2,
  };
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 720) return;
  requestAnimationFrame(() => wait(attempt + 1));
}

wait();
