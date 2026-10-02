import { writePsdUint8Array } from 'ag-psd';

export const VERSION = '0.9.40';
export const SCHEMA = 'domistika.layered-exit.v1';
export const PSD_MIME = 'image/vnd.adobe.photoshop';

const SUPPORTED_BLEND_MODES = Object.freeze({
  normal: 'normal',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
  'color-dodge': 'color dodge',
  'color-burn': 'color burn',
  'hard-light': 'hard light',
  'soft-light': 'soft light',
  difference: 'difference',
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

export function layeredExitDecision(layer = {}) {
  const role = String(layer.role || (layer.kind === 'guide' ? 'guide' : 'paint')).trim().toLowerCase();
  const motionPolicy = String(layer.motionPolicy || 'inherit').trim().toLowerCase();
  const exportPolicy = String(layer.exportPolicy || '').trim().toLowerCase();

  if (layer.kind === 'guide' || layer.guide === true || role === 'guide') {
    return Object.freeze({ include: false, reason: 'guide' });
  }
  if (motionPolicy === 'ignore') {
    return Object.freeze({ include: false, reason: 'motion-ignore' });
  }
  if (exportPolicy === 'exclude' || exportPolicy === 'exclude-guide') {
    return Object.freeze({ include: false, reason: 'export-excluded' });
  }
  if (role !== 'paint') {
    return Object.freeze({ include: false, reason: 'non-paint-role' });
  }
  return Object.freeze({ include: true, reason: 'paint' });
}

export function psdBlendMode(mode) {
  return SUPPORTED_BLEND_MODES[String(mode || 'normal').trim().toLowerCase()] || 'normal';
}

export function layeredExitManifest(engine) {
  if (!engine || !Array.isArray(engine.layers)) throw new Error('DOMISTIKA_LAYERED_EXIT_ENGINE_REQUIRED');
  const included = [];
  const excluded = [];

  for (const [index, layer] of engine.layers.entries()) {
    const decision = layeredExitDecision(layer);
    const entry = Object.freeze({
      id: String(layer.id || ''),
      name: String(layer.name || `Layer ${index + 1}`),
      role: String(layer.role || (layer.kind === 'guide' ? 'guide' : 'paint')),
      motionPolicy: String(layer.motionPolicy || 'inherit'),
      visible: layer.visible !== false,
      locked: layer.locked === true,
      groupId: layer.groupId || null,
      reason: decision.reason,
    });
    (decision.include ? included : excluded).push(entry);
  }

  return Object.freeze({
    schema: SCHEMA,
    version: VERSION,
    canonicalFormat: 'domistika-project',
    canonicalSourceOfTruth: true,
    interchangeFormat: 'psd',
    width: Number(engine.width),
    height: Number(engine.height),
    included: Object.freeze(included),
    excluded: Object.freeze(excluded),
  });
}

function compositeIncluded(engine, includedIds) {
  const canvas = document.createElement('canvas');
  canvas.width = engine.width;
  canvas.height = engine.height;
  const ctx = canvas.getContext('2d');
  const ids = new Set(includedIds);

  for (const layer of engine.layers) {
    if (!ids.has(layer.id) || layer.visible === false) continue;
    ctx.save();
    ctx.globalAlpha = clamp(layer.opacity ?? 1, 0, 1);
    ctx.globalCompositeOperation = engine.mapBlendMode?.(layer.blendMode) || 'source-over';
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
  }
  return canvas;
}

export function buildLayeredPsd(engine) {
  if (typeof document === 'undefined') throw new Error('DOMISTIKA_LAYERED_EXIT_BROWSER_REQUIRED');
  const manifest = layeredExitManifest(engine);
  if (!manifest.included.length) throw new Error('DOMISTIKA_LAYERED_EXIT_NO_PAINT_LAYERS');

  const includedIds = new Set(manifest.included.map((entry) => entry.id));
  const eligible = engine.layers.filter((layer) => includedIds.has(layer.id));

  const children = [...eligible].reverse().map((layer) => ({
    name: String(layer.name || 'Paint layer').slice(0, 255),
    canvas: layer.canvas,
    opacity: clamp(layer.opacity ?? 1, 0, 1),
    blendMode: psdBlendMode(layer.blendMode),
    hidden: layer.visible === false,
    transparencyProtected: false,
    protected: {
      transparency: false,
      composite: layer.locked === true,
      position: false,
    },
  }));

  return Object.freeze({
    psd: {
      width: engine.width,
      height: engine.height,
      children,
      canvas: compositeIncluded(engine, manifest.included.map((entry) => entry.id)),
    },
    manifest,
  });
}

export function exportLayeredPsd(engine) {
  const { psd, manifest } = buildLayeredPsd(engine);
  const bytes = writePsdUint8Array(psd, {
    generateThumbnail: false,
    trimImageData: false,
    noBackground: true,
  });
  const blob = new Blob([bytes], { type: PSD_MIME });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('domistika:v0940-layered-export', {
      detail: {
        schema: SCHEMA,
        version: VERSION,
        format: 'psd',
        bytes: blob.size,
        includedLayerCount: manifest.included.length,
        excludedLayerCount: manifest.excluded.length,
      },
    }));
  }

  return Object.freeze({ blob, bytes: blob.size, manifest });
}
