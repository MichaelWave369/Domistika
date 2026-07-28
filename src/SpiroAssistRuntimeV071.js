function installScaleNormalizer() {
  const api = globalThis.domistikaSpiroV07;
  if (!api) return requestAnimationFrame(installScaleNormalizer);
  if (api.__assistScaleNormalizer) return;
  api.__assistScaleNormalizer = true;
  const originalDrawBatch = api.drawBatch.bind(api);
  api.drawBatch = (items, options = {}) => originalDrawBatch(items.map((item) => {
    if (item.scale == null) return item;
    const scale = Number(item.scale) || 1;
    const normalized = {
      ...item,
      scaleX: (item.scaleX ?? 1) * scale,
      scaleY: (item.scaleY ?? 1) * scale,
    };
    delete normalized.scale;
    return normalized;
  }), options);
}

installScaleNormalizer();
