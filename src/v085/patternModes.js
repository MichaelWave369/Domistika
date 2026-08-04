import { CanvasEngine } from '../core/CanvasEngine.js';

const CUSTOM = new Set([
  'kaleido-6', 'kaleido-8', 'kaleido-12',
  'spiral-5', 'spiral-8', 'spiral-12',
  'orbit-7', 'orbit-11', 'echo-5', 'echo-9', 'drift-7', 'ripple-6',
]);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function transform(point, cx, cy, angle, scale = 1, mirror = false, dx = 0, dy = 0) {
  let x = point.x - cx;
  let y = point.y - cy;
  if (mirror) x *= -1;
  x *= scale;
  y *= scale;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { ...point, x: cx + x * cos - y * sin + dx, y: cy + x * sin + y * cos + dy };
}

const originalTransforms = CanvasEngine.prototype.symmetryTransforms;
CanvasEngine.prototype.symmetryTransforms = function symmetryTransformsV085() {
  const mode = this.settings.symmetry;
  if (!CUSTOM.has(mode)) return originalTransforms.call(this);
  const cx = this.width / 2;
  const cy = this.height / 2;

  if (mode.startsWith('kaleido-')) {
    const count = Number(mode.split('-')[1]) || 8;
    return Array.from({ length: count }, (_, i) => {
      const angle = Math.PI * 2 * i / count;
      return (point) => transform(point, cx, cy, angle, 1, i % 2 === 1);
    });
  }
  if (mode.startsWith('spiral-')) {
    const count = Number(mode.split('-')[1]) || 8;
    return Array.from({ length: count }, (_, i) => {
      const t = count <= 1 ? 0 : i / (count - 1);
      return (point) => transform(point, cx, cy, t * Math.PI * 1.72, 1 - t * 0.58);
    });
  }
  if (mode.startsWith('orbit-')) {
    const count = Number(mode.split('-')[1]) || 7;
    const px = cx - this.width * 0.11;
    const py = cy + this.height * 0.07;
    return Array.from({ length: count }, (_, i) => {
      const angle = Math.PI * 2 * i / count;
      const scale = 0.88 + (i % 3) * 0.065;
      const dx = Math.cos(angle * 1.7) * this.width * 0.018 * i;
      const dy = Math.sin(angle * 1.35) * this.height * 0.014 * i;
      return (point) => transform(point, px, py, angle, scale, false, dx, dy);
    });
  }
  if (mode.startsWith('echo-')) {
    const count = Number(mode.split('-')[1]) || 5;
    const center = (count - 1) / 2;
    return Array.from({ length: count }, (_, i) => {
      const step = i - center;
      return (point) => transform(point, cx, cy, step * 0.035, 1 - Math.abs(step) * 0.025, false,
        step * this.width * 0.055, step * this.height * 0.038);
    });
  }
  if (mode === 'drift-7') {
    return Array.from({ length: 7 }, (_, i) => {
      const t = i / 6;
      return (point) => transform(point, cx, cy, t * Math.PI * 0.64, 1 - t * 0.3, i % 3 === 2,
        (t - 0.5) * this.width * 0.22, Math.sin(t * Math.PI * 2) * this.height * 0.08);
    });
  }
  return Array.from({ length: 6 }, (_, i) => {
    const phase = Math.PI * 2 * i / 6;
    return (point) => ({
      ...point,
      x: clamp(point.x + Math.sin(point.y / this.height * Math.PI * 3 + phase) * this.width * (0.012 + i * 0.006)
        + (i - 2.5) * this.width * 0.012, 0, this.width),
      y: clamp(point.y + Math.cos(point.x / this.width * Math.PI * 2.4 + phase) * this.height * (0.012 + i * 0.006), 0, this.height),
    });
  });
};

const originalGuides = CanvasEngine.prototype.drawSymmetryGuides;
CanvasEngine.prototype.drawSymmetryGuides = function drawSymmetryGuidesV085(ctx) {
  originalGuides.call(this, ctx);
  const mode = this.settings.symmetry;
  if (!CUSTOM.has(mode)) return;
  const cx = this.width / 2;
  const cy = this.height / 2;
  const length = Math.hypot(this.width, this.height);
  ctx.save();
  ctx.strokeStyle = 'rgba(102,216,255,.48)';
  ctx.fillStyle = 'rgba(102,216,255,.72)';
  ctx.lineWidth = 2;
  ctx.setLineDash([15, 12]);

  if (mode.startsWith('kaleido-')) {
    const count = Number(mode.split('-')[1]) || 8;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.PI * 2 * i / count;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length); ctx.stroke();
    }
  } else if (mode.startsWith('spiral-')) {
    const turns = Number(mode.split('-')[1]) >= 10 ? 3.5 : 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 180; i += 1) {
      const t = i / 180;
      const angle = t * Math.PI * 2 * turns;
      const radius = t * Math.min(this.width, this.height) * 0.46;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  } else if (mode.startsWith('orbit-')) {
    const px = cx - this.width * 0.11;
    const py = cy + this.height * 0.07;
    ctx.beginPath(); ctx.arc(px, py, Math.min(this.width, this.height) * 0.22, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
  } else if (mode === 'ripple-6') {
    for (let row = 0; row < 5; row += 1) {
      ctx.beginPath();
      for (let x = 0; x <= this.width; x += 18) {
        const y = this.height * (0.18 + row * 0.16) + Math.sin(x / this.width * Math.PI * 4 + row) * this.height * 0.018;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  } else {
    const count = mode.startsWith('echo-') ? Number(mode.split('-')[1]) : 7;
    for (let i = 0; i < count; i += 1) {
      const t = count <= 1 ? 0.5 : i / (count - 1);
      ctx.beginPath(); ctx.arc(this.width * (0.25 + t * 0.5), cy + Math.sin(t * Math.PI * 2) * this.height * 0.08, 7, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
};

const GROUPS = [
  ['Core Symmetry', [['none', 'Off'], ['vertical', 'Vertical'], ['horizontal', 'Horizontal'], ['quad', 'Four-way']]],
  ['Radial', [3, 4, 5, 6, 8, 10, 12, 16, 24].map((n) => [`radial-${n}`, `Radial ${n}`])],
  ['Kaleidoscope', [6, 8, 12].map((n) => [`kaleido-${n}`, `Kaleido ${n}`])],
  ['Spiral', [5, 8, 12].map((n) => [`spiral-${n}`, `Spiral ${n}`])],
  ['Controlled Weirdness', [['orbit-7', 'Orbit 7'], ['orbit-11', 'Orbit 11'], ['echo-5', 'Echo 5'], ['echo-9', 'Echo 9'], ['drift-7', 'Drift Field'], ['ripple-6', 'Ripple Field']]],
];

function upgradeSelect() {
  const select = document.querySelector('#symmetryInput');
  if (!select || select.dataset.v085) return false;
  const value = select.value;
  select.innerHTML = '';
  for (const [label, options] of GROUPS) {
    const group = document.createElement('optgroup');
    group.label = label;
    for (const [optionValue, text] of options) group.appendChild(new Option(text, optionValue));
    select.appendChild(group);
  }
  select.value = [...select.options].some((option) => option.value === value) ? value : 'none';
  select.dataset.v085 = 'true';
  return true;
}

function wait(attempt = 0) {
  if (upgradeSelect() || attempt > 300) return;
  requestAnimationFrame(() => wait(attempt + 1));
}
wait();
