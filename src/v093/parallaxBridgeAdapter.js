export function normalizeCreativeBridgeV1(payload, { contentHash = null } = {}) {
  if (!payload || payload.protocol !== 'parallax-creative-bridge') {
    throw new TypeError('Expected parallax-creative-bridge payload');
  }
  if (payload.version !== 1 || payload.source !== 'domistika' || payload.target !== 'auralith369') {
    throw new TypeError('Unsupported creative bridge route/version');
  }
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
