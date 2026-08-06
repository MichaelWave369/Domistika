const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

export const STENCILS = [
  ['mandala', 'Mandala', '✺'], ['burst', 'Sunburst', '✹'], ['flower', 'Flower', '❀'],
  ['vine', 'Leaf Vine', '❧'], ['cloud', 'Cloud', '☁'], ['speech', 'Speech Bubble', '◰'],
  ['arrow', 'Ribbon Arrow', '➜'], ['frame', 'Ornamental Frame', '▣'], ['waves', 'Wave Band', '≋'],
  ['guides', 'Lettering Guides', 'Aa'], ['circuit', 'Circuit Sigil', '⌘'], ['constellation', 'Constellation', '✧'],
];

function repeatRadial(ctx, count, draw) {
  for (let index = 0; index < count; index += 1) {
    ctx.save(); ctx.rotate(index * TAU / count); draw(index); ctx.restore();
  }
}

function pathStencil(ctx, id) {
  ctx.beginPath();
  if (id === 'mandala') {
    repeatRadial(ctx, 12, () => { ctx.moveTo(0, -16); ctx.bezierCurveTo(24, -34, 42, -70, 0, -100); ctx.bezierCurveTo(-42, -70, -24, -34, 0, -16); });
    ctx.moveTo(38, 0); ctx.arc(0, 0, 38, 0, TAU); ctx.moveTo(74, 0); ctx.arc(0, 0, 74, 0, TAU);
  } else if (id === 'burst') {
    repeatRadial(ctx, 24, (index) => { const length = index % 2 ? 78 : 108; ctx.moveTo(0, -34); ctx.lineTo(0, -length); });
    ctx.moveTo(28, 0); ctx.arc(0, 0, 28, 0, TAU);
  } else if (id === 'flower') {
    repeatRadial(ctx, 8, () => { ctx.moveTo(0, -8); ctx.bezierCurveTo(42, -28, 44, -82, 0, -102); ctx.bezierCurveTo(-44, -82, -42, -28, 0, -8); });
    ctx.moveTo(20, 0); ctx.arc(0, 0, 20, 0, TAU);
  } else if (id === 'vine') {
    ctx.moveTo(-112, 72); ctx.bezierCurveTo(-52, 22, 42, 58, 112, -72);
    for (let index = -4; index <= 4; index += 1) {
      const x = index * 24; const y = Math.sin(index * .8) * 34;
      ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 22, y - 36, x + 40, y - 8); ctx.quadraticCurveTo(x + 20, y + 2, x, y);
    }
  } else if (id === 'cloud') {
    ctx.moveTo(-100, 44); ctx.bezierCurveTo(-124, 12, -96, -26, -62, -20); ctx.bezierCurveTo(-56, -64, -2, -78, 24, -42); ctx.bezierCurveTo(64, -68, 112, -28, 98, 10); ctx.bezierCurveTo(130, 36, 104, 72, 68, 68); ctx.lineTo(-72, 68); ctx.bezierCurveTo(-102, 70, -118, 58, -100, 44);
  } else if (id === 'speech') {
    ctx.roundRect(-110, -70, 220, 126, 28); ctx.moveTo(-36, 56); ctx.lineTo(-62, 100); ctx.lineTo(8, 56);
  } else if (id === 'arrow') {
    ctx.moveTo(-116, -28); ctx.lineTo(42, -28); ctx.lineTo(42, -64); ctx.lineTo(116, 0); ctx.lineTo(42, 64); ctx.lineTo(42, 28); ctx.lineTo(-116, 28); ctx.closePath();
  } else if (id === 'frame') {
    ctx.roundRect(-116, -82, 232, 164, 18); ctx.roundRect(-94, -62, 188, 124, 12);
    repeatRadial(ctx, 4, () => { ctx.moveTo(0, -82); ctx.quadraticCurveTo(24, -112, 46, -82); ctx.quadraticCurveTo(22, -58, 0, -82); });
  } else if (id === 'waves') {
    for (let row = -3; row <= 3; row += 1) {
      const y = row * 22;
      ctx.moveTo(-120, y);
      for (let x = -120; x < 120; x += 40) ctx.bezierCurveTo(x + 10, y - 14, x + 30, y + 14, x + 40, y);
    }
  } else if (id === 'guides') {
    [-72, -24, 24, 72].forEach((y, index) => { ctx.moveTo(-120, y); ctx.lineTo(120, y); if (index === 1) ctx.setLineDash([8, 8]); });
    ctx.setLineDash([]); ctx.moveTo(-90, 72); ctx.lineTo(-54, -72); ctx.moveTo(54, 72); ctx.lineTo(90, -72);
  } else if (id === 'circuit') {
    repeatRadial(ctx, 8, (index) => { ctx.moveTo(0, 0); ctx.lineTo(0, -52); ctx.lineTo(index % 2 ? 26 : -26, -78); ctx.lineTo(index % 2 ? 26 : -26, -106); ctx.moveTo(index % 2 ? 26 : -26, -106); ctx.arc(index % 2 ? 26 : -26, -106, 6, 0, TAU); });
    ctx.moveTo(28, 0); ctx.arc(0, 0, 28, 0, TAU);
  } else if (id === 'constellation') {
    const points = [[-98,44],[-64,-42],[-12,-74],[24,-18],[72,-54],[104,38],[44,76],[-28,54]];
    points.forEach(([x,y], index) => { const next = points[(index + 1) % points.length]; ctx.moveTo(x,y); ctx.lineTo(next[0],next[1]); ctx.moveTo(x + 5,y); ctx.arc(x,y,5,0,TAU); });
  }
}

export function stampStencil(engine, id, options) {
  if (!engine?.activeLayer) throw new Error('Select a paint layer first.');
  engine.captureHistory();
  const ctx = engine.activeLayer.ctx;
  ctx.save();
  ctx.globalAlpha = clamp(options.opacity, .02, 1);
  ctx.translate(engine.width * clamp(options.x, 0, 1), engine.height * clamp(options.y, 0, 1));
  const scale = clamp(options.scale, .1, 8);
  ctx.scale(scale, scale);
  ctx.rotate(clamp(options.rotation, -360, 360) * Math.PI / 180);
  ctx.lineWidth = clamp(options.lineWidth, .5, 24) / scale;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  pathStencil(ctx, id);
  if (options.mode !== 'outline' && id !== 'guides' && id !== 'waves' && id !== 'circuit' && id !== 'constellation' && id !== 'burst') {
    ctx.fillStyle = options.fill;
    ctx.fill('evenodd');
  }
  if (options.mode !== 'fill') {
    ctx.strokeStyle = options.stroke;
    ctx.stroke();
  }
  ctx.restore();
  engine.markChanged(`${STENCILS.find(([key]) => key === id)?.[1] || 'Stencil'} stamped`);
}
