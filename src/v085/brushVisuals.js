function addStyles() {
  if (document.querySelector('#domistikaV085BrushStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV085BrushStyles';
  style.textContent = `
    .brush-card{padding:7px!important;background:linear-gradient(155deg,rgba(255,255,255,.045),rgba(255,255,255,.018))!important}
    .brush-preview{height:54px!important;border:1px solid rgba(255,255,255,.07);background:#18151c!important;box-shadow:inset 0 0 22px rgba(0,0,0,.3)}
    .brush-card.active .brush-preview{border-color:rgba(255,191,105,.35);box-shadow:inset 0 0 22px rgba(0,0,0,.3),0 0 14px rgba(255,191,105,.08)}
  `;
  document.head.appendChild(style);
}

const roundRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
};

function line(ctx, x1, y1, x2, y2, width, color) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function rotate(ctx, angle, draw) {
  ctx.save(); ctx.translate(58, 22); ctx.rotate(angle); ctx.translate(-58, -22); draw(); ctx.restore();
}

function pencil(ctx, mechanical = false) {
  rotate(ctx, -0.18, () => {
    ctx.fillStyle = mechanical ? '#7d8794' : '#e0a850'; roundRect(ctx, 22, 7, 69, 10, 4);
    ctx.fillStyle = mechanical ? '#b9c2ce' : '#f4d08b'; roundRect(ctx, 25, 9, 56, 3, 2);
    ctx.fillStyle = '#dac8a7'; ctx.beginPath(); ctx.moveTo(91, 7); ctx.lineTo(107, 12); ctx.lineTo(91, 17); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#25222a'; ctx.beginPath(); ctx.moveTo(103, 10.7); ctx.lineTo(109, 12); ctx.lineTo(103, 13.3); ctx.closePath(); ctx.fill();
    if (mechanical) { ctx.fillStyle = '#3d4650'; roundRect(ctx, 14, 7, 14, 10, 3); ctx.fillStyle = '#c7d1dd'; roundRect(ctx, 10, 9, 8, 6, 2); }
    else { ctx.fillStyle = '#d87073'; roundRect(ctx, 12, 7, 14, 10, 4); ctx.fillStyle = '#b9a98c'; ctx.fillRect(24, 7, 4, 10); }
  });
}

function charcoal(ctx) {
  rotate(ctx, -0.2, () => {
    const gradient = ctx.createLinearGradient(19, 7, 96, 18);
    gradient.addColorStop(0, '#706875'); gradient.addColorStop(.45, '#29252d'); gradient.addColorStop(1, '#0e0c10');
    ctx.fillStyle = gradient; roundRect(ctx, 18, 6, 82, 13, 4);
    ctx.fillStyle = 'rgba(255,255,255,.13)'; roundRect(ctx, 27, 8, 48, 3, 2);
  });
}

function fountain(ctx, brushPen = false) {
  rotate(ctx, -0.16, () => {
    ctx.fillStyle = brushPen ? '#242129' : '#3f3350'; roundRect(ctx, 16, 6, 66, 12, 6);
    ctx.fillStyle = brushPen ? '#5e5665' : '#765ca0'; roundRect(ctx, 22, 8, 47, 3, 2);
    ctx.fillStyle = '#d9b36e'; ctx.beginPath(); ctx.moveTo(80, 6); ctx.lineTo(105, 12); ctx.lineTo(80, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#221d26'; ctx.beginPath(); ctx.moveTo(87, 9); ctx.lineTo(101, 12); ctx.lineTo(87, 15); ctx.closePath(); ctx.fill();
    line(ctx, 88, 12, 100, 12, 1, '#f3d595');
  });
}

function paintBrush(ctx, broad = false) {
  rotate(ctx, -0.16, () => {
    ctx.fillStyle = '#9b6038'; roundRect(ctx, 12, 9, 61, 8, 4);
    ctx.fillStyle = '#cfc9c4'; roundRect(ctx, 67, 6, 16, 14, 3);
    const gradient = ctx.createLinearGradient(80, 6, 109, 18);
    gradient.addColorStop(0, '#f2d79a'); gradient.addColorStop(.55, broad ? '#ff8d69' : '#c79b55'); gradient.addColorStop(1, '#59382f');
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.moveTo(81, 7); ctx.lineTo(108, broad ? 8 : 12); ctx.lineTo(81, 19); ctx.closePath(); ctx.fill();
    line(ctx, 72, 7, 72, 19, 1, 'rgba(80,80,85,.55)'); line(ctx, 77, 7, 77, 19, 1, 'rgba(80,80,85,.4)');
  });
}

function airbrush(ctx) {
  rotate(ctx, -0.1, () => {
    ctx.fillStyle = '#8d96a1'; roundRect(ctx, 22, 8, 63, 12, 6);
    ctx.fillStyle = '#c9d0d7'; roundRect(ctx, 30, 10, 39, 4, 2);
    ctx.fillStyle = '#4b535e'; roundRect(ctx, 12, 11, 14, 6, 3);
    ctx.fillStyle = '#aeb6bf'; ctx.beginPath(); ctx.moveTo(84, 10); ctx.lineTo(105, 14); ctx.lineTo(84, 18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6e7782'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(58, 21, 13, .2, 1.4); ctx.stroke();
    ctx.fillStyle = '#d4a260'; roundRect(ctx, 51, 1, 14, 9, 4);
  });
}

function eraser(ctx, kneaded = false) {
  rotate(ctx, -0.12, () => {
    if (kneaded) {
      ctx.fillStyle = '#9ba4af'; ctx.beginPath(); ctx.moveTo(26, 9); ctx.quadraticCurveTo(42, 2, 60, 8); ctx.quadraticCurveTo(78, 13, 92, 8); ctx.quadraticCurveTo(99, 17, 88, 22); ctx.quadraticCurveTo(62, 18, 31, 23); ctx.quadraticCurveTo(18, 18, 26, 9); ctx.fill();
    } else {
      ctx.fillStyle = '#e4879b'; roundRect(ctx, 24, 6, 72, 17, 6);
      ctx.fillStyle = '#f2acbb'; roundRect(ctx, 29, 8, 38, 5, 3);
      ctx.fillStyle = '#7d8190'; ctx.fillRect(75, 6, 5, 17);
    }
  });
}

function strokeSample(ctx, kind, opacity) {
  const alpha = Math.max(.2, Math.min(1, opacity / 100));
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const y = 39;
  if (kind === 'airbrush') {
    const gradient = ctx.createLinearGradient(8, 0, 108, 0); gradient.addColorStop(0, 'rgba(255,197,110,0)'); gradient.addColorStop(.5, 'rgba(255,197,110,.7)'); gradient.addColorStop(1, 'rgba(102,216,255,0)');
    ctx.strokeStyle = gradient; ctx.shadowColor = '#ffc56e'; ctx.shadowBlur = 7; ctx.lineWidth = 8;
  } else if (kind === 'charcoal') { ctx.strokeStyle = '#c7bccb'; ctx.lineWidth = 5; ctx.setLineDash([7, 2, 2, 2]); }
  else if (kind === 'eraser') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; }
  else { ctx.strokeStyle = kind === 'paint' ? '#ff9a71' : '#f4c77d'; ctx.lineWidth = kind === 'ink' ? 2.2 : 3.3; }
  ctx.beginPath(); ctx.moveTo(8, y); ctx.bezierCurveTo(34, 27, 55, 50, 82, 33); ctx.bezierCurveTo(95, 25, 105, 32, 110, 38); ctx.stroke(); ctx.restore();
}

function classify(name, meta) {
  const text = `${name} ${meta}`.toLowerCase();
  if (text.includes('eraser')) return ['eraser', text.includes('kneaded')];
  if (text.includes('airbrush') || text.includes('mist') || text.includes('fog') || text.includes('cloud')) return ['airbrush'];
  if (text.includes('charcoal') || text.includes('chalk') || text.includes('pastel')) return ['charcoal'];
  if (text.includes('paint') || text.includes('gouache') || text.includes('watercolor') || text.includes('oil') || text.includes('acrylic') || text.includes('glaze') || text.includes('block-in')) return ['paint', text.includes('broad') || text.includes('block') || text.includes('wash')];
  if (text.includes('ink') || text.includes('pen') || text.includes('nib') || text.includes('liner') || text.includes('sumi') || text.includes('letter')) return ['ink', text.includes('brush pen')];
  return ['pencil', text.includes('mechanical') || text.includes('technical')];
}

function render(canvas) {
  const card = canvas.closest('.brush-card');
  if (!card || canvas.dataset.v085Painted === card.textContent) return;
  const name = card.querySelector('.brush-name')?.textContent || 'Brush';
  const meta = card.querySelector('.brush-meta')?.textContent || '';
  const opacity = Number(meta.match(/(\d+)%/)?.[1] || 80);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = 116; const height = 54;
  canvas.width = width * dpr; canvas.height = height * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = ctx.createLinearGradient(0, 0, width, height); bg.addColorStop(0, '#302735'); bg.addColorStop(.58, '#1d1921'); bg.addColorStop(1, '#121016'); ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(255,255,255,.035)'; for (let x = 6; x < width; x += 12) for (let y = 6; y < height; y += 12) ctx.fillRect(x, y, 1, 1);
  const [kind, variant] = classify(name, meta);
  if (kind === 'pencil') pencil(ctx, variant); else if (kind === 'charcoal') charcoal(ctx); else if (kind === 'ink') fountain(ctx, variant); else if (kind === 'paint') paintBrush(ctx, variant); else if (kind === 'airbrush') airbrush(ctx); else eraser(ctx, variant);
  strokeSample(ctx, kind, opacity);
  canvas.dataset.v085Painted = card.textContent;
}

function repaint(root = document) { root.querySelectorAll?.('.brush-preview').forEach(render); }
function init() {
  const studio = document.querySelector('#studio');
  if (!studio) return false;
  addStyles(); repaint();
  new MutationObserver((mutations) => {
    for (const mutation of mutations) for (const node of mutation.addedNodes) if (node.nodeType === 1) repaint(node.matches?.('.brush-preview') ? node.parentElement : node);
  }).observe(studio, { childList: true, subtree: true });
  return true;
}
function wait(attempt = 0) { if (init() || attempt > 360) return; requestAnimationFrame(() => wait(attempt + 1)); }
wait();
