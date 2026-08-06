const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

export const MORPH_EFFECTS = [
  ['wave', 'Wave', 'Bends the layer into a smooth horizontal wave.'],
  ['ripple', 'Ripple', 'Pushes pixels into concentric rings.'],
  ['twirl', 'Twirl', 'Rotates pixels progressively toward the center.'],
  ['bulge', 'Bulge / Pinch', 'Inflates or pinches the center of the layer.'],
  ['pixelate', 'Pixel Mosaic', 'Reduces the layer into chunky pixel blocks.'],
  ['posterize', 'Posterize', 'Compresses colors into graphic tonal bands.'],
  ['chromatic', 'Chromatic Echo', 'Offsets color channels for a dimensional glitch.'],
  ['halftone', 'Halftone', 'Rebuilds the layer from print-style dots.'],
];

function sourceCopy(layer) {
  const copy = document.createElement('canvas');
  copy.width = layer.canvas.width;
  copy.height = layer.canvas.height;
  copy.getContext('2d').drawImage(layer.canvas, 0, 0);
  return copy;
}

function remap(source, target, mapper) {
  const width = source.width;
  const height = source.height;
  const sourceData = source.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, width, height);
  const targetData = target.createImageData(width, height);
  const src = sourceData.data;
  const dst = targetData.data;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const mapped = mapper(x, y, width, height);
      const sx = Math.round(mapped.x);
      const sy = Math.round(mapped.y);
      if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
      const from = (sy * width + sx) * 4;
      const to = (y * width + x) * 4;
      dst[to] = src[from]; dst[to + 1] = src[from + 1]; dst[to + 2] = src[from + 2]; dst[to + 3] = src[from + 3];
    }
  }
  target.putImageData(targetData, 0, 0);
}

function applyPixelate(source, ctx, amount) {
  const block = Math.max(2, Math.round(2 + amount * 46));
  const width = Math.max(1, Math.round(source.width / block));
  const height = Math.max(1, Math.round(source.height / block));
  const tiny = document.createElement('canvas');
  tiny.width = width; tiny.height = height;
  tiny.getContext('2d').drawImage(source, 0, 0, width, height);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tiny, 0, 0, width, height, 0, 0, source.width, source.height);
}

function applyPosterize(source, ctx, amount) {
  const image = source.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, source.width, source.height);
  const levels = Math.max(2, Math.round(10 - amount * 7));
  const step = 255 / (levels - 1);
  for (let index = 0; index < image.data.length; index += 4) {
    image.data[index] = Math.round(image.data[index] / step) * step;
    image.data[index + 1] = Math.round(image.data[index + 1] / step) * step;
    image.data[index + 2] = Math.round(image.data[index + 2] / step) * step;
  }
  ctx.putImageData(image, 0, 0);
}

function applyChromatic(source, ctx, amount) {
  const offset = Math.round(2 + amount * 28);
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = .88;
  ctx.filter = 'url(#none)';
  ctx.drawImage(source, -offset, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = .68;
  ctx.drawImage(source, offset, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = .52;
  ctx.drawImage(source, 0, offset * .35);
}

function applyHalftone(source, ctx, amount) {
  const sample = Math.round(5 + amount * 24);
  const sourceCtx = source.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, source.width, source.height);
  for (let y = sample / 2; y < source.height; y += sample) {
    for (let x = sample / 2; x < source.width; x += sample) {
      const pixel = sourceCtx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
      if (!pixel[3]) continue;
      const luminance = (pixel[0] * .2126 + pixel[1] * .7152 + pixel[2] * .0722) / 255;
      const radius = (1 - luminance) * sample * .52 * (pixel[3] / 255);
      ctx.fillStyle = `rgba(${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3] / 255})`;
      ctx.beginPath(); ctx.arc(x, y, Math.max(.35, radius), 0, Math.PI * 2); ctx.fill();
    }
  }
}

export function applyMorph(engine, effect, amount = .5) {
  if (!engine?.activeLayer) throw new Error('Select a paint layer first.');
  amount = clamp(amount, 0, 1);
  const layer = engine.activeLayer;
  const source = sourceCopy(layer);
  engine.captureHistory();
  const ctx = layer.ctx;
  ctx.save();
  ctx.clearRect(0, 0, engine.width, engine.height);

  if (effect === 'pixelate') applyPixelate(source, ctx, amount);
  else if (effect === 'posterize') applyPosterize(source, ctx, amount);
  else if (effect === 'chromatic') applyChromatic(source, ctx, amount);
  else if (effect === 'halftone') applyHalftone(source, ctx, amount);
  else {
    const strength = amount;
    remap(source, ctx, (x, y, width, height) => {
      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const radius = Math.hypot(dx, dy);
      const maxRadius = Math.hypot(cx, cy);
      if (effect === 'wave') return { x, y: y - Math.sin((x / width) * Math.PI * 5) * height * .075 * strength };
      if (effect === 'ripple') {
        const displacement = Math.sin(radius / Math.max(4, 18 - strength * 12)) * 18 * strength;
        return { x: x - (dx / Math.max(1, radius)) * displacement, y: y - (dy / Math.max(1, radius)) * displacement };
      }
      if (effect === 'twirl') {
        const falloff = Math.max(0, 1 - radius / maxRadius);
        const angle = -falloff * falloff * strength * Math.PI * 2.2;
        return { x: cx + dx * Math.cos(angle) - dy * Math.sin(angle), y: cy + dx * Math.sin(angle) + dy * Math.cos(angle) };
      }
      const normalized = radius / maxRadius;
      const power = 1 + (strength - .5) * 1.8;
      const mappedRadius = Math.pow(normalized, power) * maxRadius;
      return { x: cx + (dx / Math.max(1, radius)) * mappedRadius, y: cy + (dy / Math.max(1, radius)) * mappedRadius };
    });
  }
  ctx.restore();
  engine.markChanged(`${effect[0].toUpperCase()}${effect.slice(1)} morph applied`);
}
