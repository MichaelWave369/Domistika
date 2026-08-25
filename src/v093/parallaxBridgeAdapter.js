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
