const VERSION = '0.9.20';
const SCHEMA = 'domistika.clean-art-capture.v1';
const MAX_DIMENSION = 2048;
const INSTALL_FLAG = '__domistikaCleanCaptureV0920Installed';

function normalizeOptions(input = {}) {
  const value = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const allowed = new Set(['maxDimension', 'includeBackground']);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new Error('DOMISTIKA_CLEAN_CAPTURE_FIELDS_INVALID');
  }

  const maxDimension = Math.round(Number(value.maxDimension ?? MAX_DIMENSION));
  if (!Number.isFinite(maxDimension) || maxDimension < 64 || maxDimension > MAX_DIMENSION) {
    throw new Error('DOMISTIKA_CLEAN_CAPTURE_DIMENSION_INVALID');
  }

  return {
    maxDimension,
    includeBackground: value.includeBackground !== false,
  };
}

function scaledComposite(engine, { maxDimension, includeBackground }) {
  if (!engine || typeof engine.compositeCanvas !== 'function') {
    throw new Error('DOMISTIKA_CLEAN_CAPTURE_ENGINE_NOT_READY');
  }

  const source = engine.compositeCanvas(includeBackground);
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));

  const context = canvas.getContext('2d');
  if (!context) throw new Error('DOMISTIKA_CLEAN_CAPTURE_CONTEXT_UNAVAILABLE');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function capture(input = {}, engine = window.__domistikaEngine) {
  const options = normalizeOptions(input);
  const canvas = scaledComposite(engine, options);
  const dataUrl = canvas.toDataURL('image/png');
  const prefix = 'data:image/png;base64,';
  if (!dataUrl.startsWith(prefix)) throw new Error('DOMISTIKA_CLEAN_CAPTURE_ENCODING_INVALID');

  return {
    schema: SCHEMA,
    version: VERSION,
    contentType: 'image/png',
    encoding: 'base64',
    width: canvas.width,
    height: canvas.height,
    includeBackground: options.includeBackground,
    dataBase64: dataUrl.slice(prefix.length),
  };
}

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;
  window.domistikaCleanCaptureV0920 = Object.freeze({
    version: VERSION,
    schema: SCHEMA,
    maxDimension: MAX_DIMENSION,
    capture,
  });

  window.dispatchEvent(new CustomEvent('domistika:clean-capture-ready', {
    detail: { version: VERSION, schema: SCHEMA, maxDimension: MAX_DIMENSION },
  }));
}

export {
  VERSION,
  SCHEMA,
  MAX_DIMENSION,
  normalizeOptions,
  scaledComposite,
  capture,
};
