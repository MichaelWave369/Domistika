export function normalizeCreativeBridgeV1(payload, { contentHash = payload?.contentHash ?? null } = {}) {
  assertCreativeBridgeV1(payload);
  return {
    schema: 'parallax.bridge.v1',
    protocol: 'parallax-bridge',
    version: 1,
    transferId: `creative:${payload.createdAt}:${payload.name || 'untitled'}`,
    source: 'Domistika',
    target: 'Auralith369',
    createdAt: payload.createdAt,
    localOnly: true,
    payloadType: 'image/data-url+creative-metadata',
    payloadRefOrInline: { native: payload },
    contentHash,
    trustLabels: [],
    warnings: contentHash ? [] : ['No content hash supplied by caller; native payload preserved.'],
    compatibilityNotes: ['Compatibility wrapper for parallax-creative-bridge-v1.'],
    lineageRef: null,
    requiresUserAction: true,
  };
}

export async function sha256ImageDataUri(image) {
  if (!String(image || '').startsWith('data:image/')) {
    throw new TypeError('Expected data:image payload');
  }
  const comma = image.indexOf(',');
  if (comma < 0) throw new TypeError('Malformed image data URI');
  const header = image.slice(0, comma);
  if (!header.endsWith(';base64')) {
    throw new TypeError('Hash-bound creative bridge requires base64 image data URI');
  }
  let binary;
  try {
    binary = globalThis.atob(image.slice(comma + 1));
  } catch {
    throw new TypeError('Invalid base64 image data');
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const digestInput = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(digestInput).set(bytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', digestInput);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

export async function bindCreativeBridgeContentHash(payload) {
  assertCreativeBridgeV1(payload);
  const sha256 = await sha256ImageDataUri(payload.image);
  return { ...payload, contentHash: `sha256:${sha256}` };
}

function assertCreativeBridgeV1(payload) {
  if (!payload || payload.protocol !== 'parallax-creative-bridge') {
    throw new TypeError('Expected parallax-creative-bridge payload');
  }
  if (payload.version !== 1 || payload.source !== 'domistika' || payload.target !== 'auralith369') {
    throw new TypeError('Unsupported creative bridge route/version');
  }
}


function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

async function sha256Text(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (entry) => entry.toString(16).padStart(2, '0')).join('');
}

function assertCreativeBridgeV2(payload) {
  if (!payload || payload.protocol !== 'parallax-creative-bridge') {
    throw new TypeError('Expected parallax-creative-bridge payload');
  }
  if (payload.version !== 2 || payload.source !== 'domistika' || payload.target !== 'auralith369') {
    throw new TypeError('Unsupported creative bridge route/version');
  }
  if (!String(payload.image || '').startsWith('data:image/')) {
    throw new TypeError('Creative Bridge v2 requires base image data');
  }
  if (!Array.isArray(payload.overlays) || payload.overlays.length > 16) {
    throw new TypeError('Creative Bridge v2 overlays must be an array of at most 16 items');
  }
  for (const overlay of payload.overlays) {
    if (!overlay || overlay.kind !== 'raster-overlay') throw new TypeError('Unsupported Creative Bridge v2 overlay kind');
    if (!['type', 'motion-ignore'].includes(overlay.role)) throw new TypeError('Unsupported Creative Bridge v2 overlay role');
    if (!String(overlay.image || '').startsWith('data:image/')) throw new TypeError('Creative Bridge v2 overlay requires image data');
  }
}

function bridgeV2Manifest(payload) {
  return {
    protocol: payload.protocol,
    version: payload.version,
    source: payload.source,
    target: payload.target,
    createdAt: payload.createdAt,
    name: payload.name || '',
    canvas: payload.canvas || null,
    palette: Array.isArray(payload.palette) ? payload.palette : [],
    symmetry: payload.symmetry || 'none',
    note: payload.note || '',
    baseContentHash: payload.baseContentHash,
    overlays: (payload.overlays || []).map((overlay) => ({
      id: String(overlay.id || ''),
      kind: overlay.kind,
      role: overlay.role,
      name: String(overlay.name || ''),
      sourceLayerId: String(overlay.sourceLayerId || ''),
      preserveDuringStyle: Boolean(overlay.preserveDuringStyle),
      opacity: Number(overlay.opacity ?? 1),
      blendMode: String(overlay.blendMode || 'normal'),
      semantic: overlay.semantic ?? null,
      contentHash: overlay.contentHash,
    })),
  };
}

export async function bindCreativeBridgeV2ContentHash(payload) {
  assertCreativeBridgeV2(payload);
  const baseContentHash = 'sha256:' + await sha256ImageDataUri(payload.image);
  const overlays = [];
  for (const overlay of payload.overlays) {
    overlays.push({
      ...overlay,
      contentHash: 'sha256:' + await sha256ImageDataUri(overlay.image),
    });
  }
  const next = { ...payload, baseContentHash, overlays };
  const contentHash = 'sha256:' + await sha256Text(stableJson(bridgeV2Manifest(next)));
  return { ...next, contentHash };
}

export function normalizeCreativeBridgeV2(payload, { contentHash = payload?.contentHash ?? null } = {}) {
  assertCreativeBridgeV2(payload);
  return {
    schema: 'parallax.bridge.v2',
    protocol: 'parallax-bridge',
    version: 2,
    transferId: 'creative-v2:' + payload.createdAt + ':' + (payload.name || 'untitled'),
    source: 'Domistika',
    target: 'Auralith369',
    createdAt: payload.createdAt,
    localOnly: true,
    payloadType: 'image/data-url+semantic-overlays',
    payloadRefOrInline: { native: payload },
    contentHash,
    trustLabels: ['semantic-overlay-bound'],
    warnings: contentHash ? [] : ['No manifest content hash supplied by caller.'],
    compatibilityNotes: ['Creative Bridge v2 carries hash-bound protected overlay layers.'],
    lineageRef: null,
    requiresUserAction: true,
  };
}
