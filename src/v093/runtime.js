import { CanvasEngine } from '../core/CanvasEngine.js';

let latestEngine = null;
const originalBindEvents = CanvasEngine.prototype.bindEvents;

CanvasEngine.prototype.bindEvents = function bindEventsV093Runtime() {
  latestEngine = this;
  const result = originalBindEvents.call(this);
  document.dispatchEvent(new CustomEvent('domistika:v093-engine', { detail: { engine: this } }));
  return result;
};

export function getEngine() {
  return latestEngine;
}

export function getProjectName() {
  return document.querySelector('#projectName')?.value?.trim() || 'Untitled Domistika';
}

export function readFavoriteColors() {
  try {
    const parsed = JSON.parse(localStorage.getItem('domistika-v091-favorite-colors'));
    return Array.isArray(parsed) ? parsed.filter((value) => /^#[0-9a-f]{6}$/i.test(String(value))).slice(0, 24) : [];
  } catch {
    return [];
  }
}

export function setStatus(message) {
  const status = document.querySelector('#statusMessage');
  if (status) status.textContent = message;
  latestEngine?.onStatus?.(message);
}

export function waitForEngine(callback, attempt = 0) {
  if (latestEngine) {
    callback(latestEngine);
    return;
  }
  if (attempt > 600) return;
  requestAnimationFrame(() => waitForEngine(callback, attempt + 1));
}

export function scaledCanvas(source, maxDimension = 1400, includeBackground = true) {
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext('2d');
  if (includeBackground) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function currentArtworkDataUrl({ maxDimension = 1400, type = 'image/webp', quality = 0.9, includeBackground = true } = {}) {
  if (!latestEngine) throw new Error('Domistika canvas is not ready yet');
  const composite = latestEngine.compositeCanvas(includeBackground);
  return scaledCanvas(composite, maxDimension, false).toDataURL(type, quality);
}

export function downloadDataUrl(dataUrl, filename) {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function slugify(value) {
  return String(value || 'domistika-artwork')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'domistika-artwork';
}
