const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

export const FONT_STACKS = [
  ['Domistika Sans', 'Inter, ui-sans-serif, system-ui, sans-serif'],
  ['Editorial Serif', 'Georgia, Cambria, Times New Roman, serif'],
  ['Humanist', 'Trebuchet MS, Segoe UI, sans-serif'],
  ['Geometric', 'Avenir Next, Century Gothic, Futura, sans-serif'],
  ['Monospace', 'ui-monospace, SFMono-Regular, Consolas, monospace'],
  ['Handwritten', 'Segoe Print, Bradley Hand, Comic Sans MS, cursive'],
  ['Brush Script', 'Brush Script MT, Segoe Script, cursive'],
  ['Blackletter', 'UnifrakturCook, Old English Text MT, fantasy'],
  ['Poster', 'Impact, Haettenschweiler, Arial Narrow Bold, sans-serif'],
];

function shade(hex, amount) {
  const match = String(hex).match(/^#([0-9a-f]{6})$/i);
  if (!match) return hex;
  const value = Number.parseInt(match[1], 16);
  const parts = [value >> 16, (value >> 8) & 255, value & 255]
    .map((channel) => clamp(channel + amount, 0, 255).toString(16).padStart(2, '0'));
  return `#${parts.join('')}`;
}

function drawTrackedText(ctx, text, x, y, tracking, mode = 'fill') {
  if (!tracking) {
    if (mode === 'stroke') ctx.strokeText(text, x, y);
    else ctx.fillText(text, x, y);
    return;
  }
  const widths = [...text].map((character) => ctx.measureText(character).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, text.length - 1) * tracking;
  let cursor = x;
  if (ctx.textAlign === 'center') cursor -= total / 2;
  if (ctx.textAlign === 'right' || ctx.textAlign === 'end') cursor -= total;
  const previousAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((character, index) => {
    if (mode === 'stroke') ctx.strokeText(character, cursor, y);
    else ctx.fillText(character, cursor, y);
    cursor += widths[index] + tracking;
  });
  ctx.textAlign = previousAlign;
}

export async function recognizeLayerText(engine, scope = 'active') {
  if (!engine) throw new Error('Canvas engine is unavailable.');
  if (!('TextDetector' in window)) {
    throw new Error('Local handwriting recognition is not available in this browser yet. You can still type or paste the wording below.');
  }
  const source = scope === 'flattened' ? engine.compositeCanvas(true) : engine.copyCanvas(engine.activeLayer.canvas);
  const detector = new window.TextDetector();
  const bitmap = await createImageBitmap(source);
  try {
    const results = await detector.detect(bitmap);
    return results
      .map((result) => result.rawValue || result.text || '')
      .filter(Boolean)
      .join('\n')
      .trim();
  } finally {
    bitmap.close?.();
  }
}

export function renderTextPreview(canvas, options) {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(280, canvas.clientWidth || 320);
  const height = 150;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f5f0e7';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2 + options.size * .22);
  ctx.scale(Math.min(1, 260 / Math.max(260, ctx.measureText(options.text || 'Domistika').width)), 1);
  paintText(ctx, { ...options, x: 0, y: 0, rotation: 0, size: Math.min(options.size, 68), text: options.text || 'Domistika' });
  ctx.restore();
}

function paintText(ctx, options) {
  const text = String(options.text || '').replace(/\r/g, '');
  if (!text.trim()) return;
  const size = clamp(options.size, 6, 640);
  const weight = options.weight || '600';
  const style = options.italic ? 'italic' : 'normal';
  const family = options.font || FONT_STACKS[0][1];
  const lineHeight = size * clamp(options.lineHeight, .6, 3);
  const tracking = clamp(options.tracking, -10, 80);
  const lines = text.split('\n');
  ctx.font = `${style} ${weight} ${size}px ${family}`;
  ctx.textAlign = options.align || 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 3;

  const startY = -((lines.length - 1) * lineHeight) / 2;
  if (options.shadowBlur > 0) {
    ctx.shadowColor = options.shadowColor || 'rgba(0,0,0,.35)';
    ctx.shadowBlur = clamp(options.shadowBlur, 0, 80);
    ctx.shadowOffsetX = clamp(options.shadowX, -100, 100);
    ctx.shadowOffsetY = clamp(options.shadowY, -100, 100);
  }

  const depth = options.mode === '3d' ? clamp(options.depth, 1, 120) : 0;
  if (depth) {
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = shade(options.fill, -62);
    for (let z = depth; z >= 1; z -= 1) {
      lines.forEach((line, index) => drawTrackedText(ctx, line, z * .62, startY + index * lineHeight + z * .52, tracking));
    }
  }

  ctx.fillStyle = options.fill;
  lines.forEach((line, index) => drawTrackedText(ctx, line, 0, startY + index * lineHeight, tracking));
  if (options.strokeWidth > 0) {
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = clamp(options.strokeWidth, .5, 40);
    lines.forEach((line, index) => drawTrackedText(ctx, line, 0, startY + index * lineHeight, tracking, 'stroke'));
  }
}

export function placeText(engine, options) {
  if (!engine?.activeLayer) throw new Error('Select a paint layer first.');
  const text = String(options.text || '').trim();
  if (!text) throw new Error('Enter or capture some text first.');
  engine.captureHistory();
  const ctx = engine.activeLayer.ctx;
  ctx.save();
  ctx.globalAlpha = clamp(options.opacity, .01, 1);
  ctx.translate(engine.width * clamp(options.x, 0, 1), engine.height * clamp(options.y, 0, 1));
  ctx.rotate(clamp(options.rotation, -360, 360) * Math.PI / 180);
  paintText(ctx, options);
  ctx.restore();
  engine.markChanged(options.mode === '3d' ? 'Extruded text placed' : 'Text placed');
}
