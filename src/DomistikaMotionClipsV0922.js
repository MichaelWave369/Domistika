import { CanvasEngine } from './core/CanvasEngine.js';

const VERSION = '0.9.22';
const SCHEMA = 'domistika.motion-clips.v1';
const INSTALL_FLAG = '__domistikaMotionClipsV0922Installed';
const DB_NAME = 'domistika-motion-clips-db';
const DB_VERSION = 1;
const STORE = 'clips';
const MAX_CLIP_BYTES = 24 * 1024 * 1024;
const MAX_PROJECT_CLIPS = 8;
const MAX_POSTER_DIMENSION = 640;

let projectClips = [];

function cloneMetadata(value) {
  return {
    id: String(value.id || ''),
    name: String(value.name || 'Motion clip'),
    kind: String(value.kind || 'motion'),
    mimeType: String(value.mimeType || 'video/webm'),
    bytes: Math.max(0, Number(value.bytes) || 0),
    createdAt: String(value.createdAt || new Date().toISOString()),
    durationSeconds: Math.max(0, Number(value.durationSeconds) || 0),
    fps: Math.max(0, Number(value.fps) || 0),
    poster: typeof value.poster === 'string' && value.poster.startsWith('data:image/') ? value.poster : '',
  };
}

function freezeMetadata(value) {
  return Object.freeze(cloneMetadata(value));
}

function emit(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(`domistika:${name}`, {
    detail: { version: VERSION, schema: SCHEMA, ...detail },
  }));
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('DOMISTIKA_MOTION_DB_OPEN_FAILED'));
  });
}

async function withStore(mode, action) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let result;
      try {
        result = action(store);
      } catch (error) {
        reject(error);
        return;
      }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error('DOMISTIKA_MOTION_DB_TRANSACTION_FAILED'));
      tx.onabort = () => reject(tx.error || new Error('DOMISTIKA_MOTION_DB_TRANSACTION_ABORTED'));
    });
  } finally {
    db.close();
  }
}

async function putRecord(record) {
  await withStore('readwrite', (store) => store.put(record));
}

async function getRecord(id) {
  const key = String(id || '');
  if (!key) return null;
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('DOMISTIKA_MOTION_DB_READ_FAILED'));
    });
  } finally {
    db.close();
  }
}

async function deleteRecord(id) {
  const key = String(id || '');
  if (!key) return false;
  await withStore('readwrite', (store) => store.delete(key));
  return true;
}

function safeClipName(value) {
  return String(value || 'Motion clip').trim().slice(0, 120) || 'Motion clip';
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return `motion-${crypto.randomUUID()}`;
  return `motion-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function posterFromCanvas(source, maxDimension = MAX_POSTER_DIMENSION) {
  if (!(source instanceof HTMLCanvasElement) || !source.width || !source.height) return '';
  const scale = Math.min(1, maxDimension / Math.max(source.width, source.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return '';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.82);
}

function fallbackPoster() {
  const engine = window.__domistikaEngine || globalThis.domistikaEngine;
  if (!engine?.compositeCanvas) return '';
  return posterFromCanvas(engine.compositeCanvas(true));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('DOMISTIKA_MOTION_BLOB_READ_FAILED'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const value = String(dataUrl || '');
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(value);
  if (!match) throw new Error('DOMISTIKA_MOTION_DATA_URL_INVALID');
  const binary = atob(match[2]);
  if (binary.length > MAX_CLIP_BYTES) throw new Error('DOMISTIKA_MOTION_CLIP_TOO_LARGE');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: match[1] || 'video/webm' });
}

function list() {
  return Object.freeze(projectClips.map(freezeMetadata));
}

function latest() {
  return projectClips.length ? freezeMetadata(projectClips[0]) : null;
}

function findMetadata(id) {
  return projectClips.find((item) => item.id === id) || null;
}

async function addBlob(blob, {
  id = null,
  name = 'Motion clip',
  kind = 'motion',
  durationSeconds = 0,
  fps = 0,
  sourceCanvas = null,
  poster = '',
} = {}) {
  if (!(blob instanceof Blob)) throw new Error('DOMISTIKA_MOTION_CLIP_BLOB_REQUIRED');
  if (!blob.size || blob.size > MAX_CLIP_BYTES) throw new Error('DOMISTIKA_MOTION_CLIP_SIZE_INVALID');
  if (!String(blob.type || 'video/webm').startsWith('video/webm')) {
    throw new Error('DOMISTIKA_MOTION_CLIP_TYPE_INVALID');
  }

  const metadata = cloneMetadata({
    id: id || makeId(),
    name: safeClipName(name),
    kind: String(kind || 'motion').trim().slice(0, 64) || 'motion',
    mimeType: blob.type || 'video/webm',
    bytes: blob.size,
    createdAt: new Date().toISOString(),
    durationSeconds: Math.max(0, Number(durationSeconds) || 0),
    fps: Math.max(0, Number(fps) || 0),
    poster: poster || posterFromCanvas(sourceCanvas) || fallbackPoster(),
  });

  await putRecord({ ...metadata, blob });

  projectClips = [
    metadata,
    ...projectClips.filter((item) => item.id !== metadata.id),
  ].slice(0, MAX_PROJECT_CLIPS);

  const engine = window.__domistikaEngine || globalThis.domistikaEngine;
  engine?.onChange?.({ reason: 'content', engine, motionClip: freezeMetadata(metadata) });
  engine?.onStatus?.(`Motion clip saved to project · ${metadata.name}`);

  emit('motion-clip-added', { clip: freezeMetadata(metadata), count: projectClips.length });
  return freezeMetadata(metadata);
}

async function getBlob(id) {
  const record = await getRecord(id);
  if (!record?.blob) return null;
  return record.blob;
}

async function playbackUrl(id) {
  const blob = await getBlob(id);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

async function download(id, filename = null) {
  const metadata = findMetadata(id);
  const blob = await getBlob(id);
  if (!metadata || !blob) throw new Error('DOMISTIKA_MOTION_CLIP_NOT_FOUND');
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    const safe = String(filename || metadata.name || 'domistika-motion')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'domistika-motion';
    anchor.download = safe.endsWith('.webm') ? safe : `${safe}.webm`;
    anchor.click();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  emit('motion-clip-download', { clipId: metadata.id });
  return true;
}

async function remove(id, { deleteStoredBlob = false } = {}) {
  const key = String(id || '');
  const before = projectClips.length;
  projectClips = projectClips.filter((item) => item.id !== key);
  if (deleteStoredBlob) await deleteRecord(key);
  if (projectClips.length !== before) {
    const engine = window.__domistikaEngine || globalThis.domistikaEngine;
    engine?.onChange?.({ reason: 'content', engine });
    emit('motion-clip-removed', { clipId: key, count: projectClips.length });
    return true;
  }
  return false;
}

function metadataEnvelope() {
  return {
    version: 1,
    schema: SCHEMA,
    embedded: false,
    items: projectClips.map(cloneMetadata),
  };
}

async function embeddedEnvelope() {
  const items = [];
  for (const metadata of projectClips) {
    const record = await getRecord(metadata.id);
    if (!record?.blob) {
      items.push({ ...cloneMetadata(metadata), missingMedia: true });
      continue;
    }
    const dataUrl = await blobToDataUrl(record.blob);
    items.push({ ...cloneMetadata(metadata), dataUrl });
  }
  return {
    version: 1,
    schema: SCHEMA,
    embedded: true,
    items,
  };
}

async function embedProject(project) {
  if (!project || typeof project !== 'object') throw new Error('DOMISTIKA_MOTION_PROJECT_REQUIRED');
  return {
    ...project,
    motionClips: await embeddedEnvelope(),
  };
}

async function restoreProjectClips(envelope) {
  const items = Array.isArray(envelope?.items) ? envelope.items.slice(0, MAX_PROJECT_CLIPS) : [];
  const restored = [];

  for (const item of items) {
    if (!item?.id) continue;
    const metadata = cloneMetadata(item);

    if (item.dataUrl) {
      try {
        const blob = await dataUrlToBlob(item.dataUrl);
        if (blob.size && blob.size <= MAX_CLIP_BYTES) {
          metadata.mimeType = blob.type || metadata.mimeType;
          metadata.bytes = blob.size;
          await putRecord({ ...metadata, blob });
        }
      } catch (error) {
        console.warn('Domistika motion clip restore skipped embedded media', error);
      }
    }

    const record = await getRecord(metadata.id);
    if (record?.blob) restored.push(cloneMetadata({ ...metadata, bytes: record.blob.size, mimeType: record.blob.type || metadata.mimeType }));
  }

  projectClips = restored.slice(0, MAX_PROJECT_CLIPS);
  emit('motion-clips-restored', { count: projectClips.length });
  return list();
}

function installProjectHooks() {
  if (CanvasEngine.prototype.__domistikaMotionClipsV0922) return;
  CanvasEngine.prototype.__domistikaMotionClipsV0922 = true;

  const originalSerialize = CanvasEngine.prototype.serialize;
  CanvasEngine.prototype.serialize = function serializeWithMotionClips(...args) {
    const project = originalSerialize.apply(this, args);
    project.motionClips = metadataEnvelope();
    return project;
  };

  const originalRestore = CanvasEngine.prototype.restore;
  CanvasEngine.prototype.restore = async function restoreWithMotionClips(project, ...args) {
    const result = await originalRestore.call(this, project, ...args);
    await restoreProjectClips(project?.motionClips);
    return result;
  };
}

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;
  installProjectHooks();

  window.domistikaMotionClipsV0922 = Object.freeze({
    version: VERSION,
    schema: SCHEMA,
    maxClipBytes: MAX_CLIP_BYTES,
    maxProjectClips: MAX_PROJECT_CLIPS,
    list,
    latest,
    addBlob,
    getBlob,
    playbackUrl,
    download,
    remove,
    embedProject,
    restoreProjectClips,
  });

  emit('motion-clips-ready', {
    maxClipBytes: MAX_CLIP_BYTES,
    maxProjectClips: MAX_PROJECT_CLIPS,
  });
}

export {
  VERSION,
  SCHEMA,
  MAX_CLIP_BYTES,
  MAX_PROJECT_CLIPS,
  list,
  latest,
  addBlob,
  getBlob,
  playbackUrl,
  download,
  remove,
  embedProject,
  restoreProjectClips,
};
