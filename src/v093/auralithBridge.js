import {
  currentArtworkDataUrl,
  getEngine,
  getProjectName,
  readFavoriteColors,
  setStatus,
} from './runtime.js';

const BRIDGE_KEY = 'parallax-creative-bridge-v1';
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

function buildPayload(image) {
  const engine = getEngine();
  return {
    protocol: 'parallax-creative-bridge',
    version: 1,
    source: 'domistika',
    target: 'auralith369',
    createdAt: new Date().toISOString(),
    name: getProjectName(),
    image,
    canvas: engine ? { width: engine.width, height: engine.height } : null,
    palette: readFavoriteColors(),
    symmetry: engine?.settings?.symmetry || 'none',
    note: 'Transferred locally by the user from Domistika to Auralith369.',
  };
}

function transfer() {
  const attempts = [
    { maxDimension: 1400, quality: 0.9 },
    { maxDimension: 1100, quality: 0.83 },
    { maxDimension: 800, quality: 0.76 },
  ];
  for (const options of attempts) {
    try {
      const image = currentArtworkDataUrl({ ...options, type: 'image/webp', includeBackground: true });
      if (storePayload(buildPayload(image))) {
        setStatus('Artwork bridged to Auralith369 — opening the visual alchemy studio');
        window.open(AURALITH_URL, '_blank', 'noopener,noreferrer');
        document.dispatchEvent(new CustomEvent('domistika:v093-bridge-sent', {
          detail: { target: 'auralith369', maxDimension: options.maxDimension },
        }));
        return;
      }
    } catch (error) {
      console.warn('Domistika bridge attempt failed', error);
    }
  }
  setStatus('The bridge package was too large for browser storage. Try a smaller canvas or export the image normally.');
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
  button.title = 'Send a local artwork preview and palette to Auralith369';
  const gallery = topActions.querySelector('#openGalleryButton');
  gallery?.insertAdjacentElement('afterend', button);
  if (!gallery) topActions.insertBefore(button, topActions.firstChild);
  button.addEventListener('click', transfer);
  window.domistikaAuralithBridgeV093 = { transfer, key: BRIDGE_KEY, target: AURALITH_URL };
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 720) return;
  requestAnimationFrame(() => wait(attempt + 1));
}

wait();
