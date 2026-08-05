import { CanvasEngine } from '../core/CanvasEngine.js';

export const PHI = (1 + Math.sqrt(5)) / 2;
export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export const FIBONACCI = Object.freeze([1, 1, 2, 3, 5, 8, 13, 21, 34]);

export const SACRED_MODES = Object.freeze([
  ['sacred-vesica', 'Vesica Piscis'],
  ['sacred-trinity', 'Trinity Circles'],
  ['sacred-seed-6', 'Seed of Life'],
  ['sacred-flower-12', 'Flower of Life'],
  ['sacred-metatron-13', 'Metatron Field'],
  ['sacred-hexgrid-7', 'Hex Cell Lattice'],
]);

export const PHI_MODES = Object.freeze([
  ['phi-spiral-13', 'Phi Spiral 13'],
  ['phi-bloom-21', 'Phi Bloom 21'],
  ['golden-angle-34', 'Golden Angle 34'],
  ['fib-ring-13', 'Fibonacci Ring 13'],
  ['fib-echo-8', 'Fibonacci Echo 8'],
  ['phi-mirror-12', 'Phi Mirror 12'],
]);

const ADVANCED = new Set([...SACRED_MODES, ...PHI_MODES].map(([value]) => value));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function move(point, cx, cy, angle = 0, scale = 1, mirror = false, dx = 0, dy = 0) {
  let x = point.x - cx;
  let y = point.y - cy;
  if (mirror) x *= -1;
  x *= scale;
  y *= scale;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { ...point, x: cx + x * cos - y * sin + dx, y: cy + x * sin + y * cos + dy };
}

function ringTransforms(count, cx, cy, radius, scale, options = {}) {
  return Array.from({ length: count }, (_, index) => {
    const angle = Math.PI * 2 * index / count + (options.phase || 0);
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;
    return (point) => move(point, cx, cy, options.rotate === false ? 0 : angle, scale, Boolean(options.mirror && index % 2), dx, dy);
  });
}

const originalTransforms = CanvasEngine.prototype.symmetryTransforms;
CanvasEngine.prototype.symmetryTransforms = function symmetryTransformsV092() {
  const mode = this.settings.symmetry;
  const cx = this.width / 2;
  const cy = this.height / 2;
  const unit = Math.min(this.width, this.height);

  if (mode.startsWith('kaleido-')) {
    const count = clamp(Number(mode.split('-')[1]) || 8, 2, 96);
    return Array.from({ length: count }, (_, index) => {
      const angle = Math.PI * 2 * index / count;
      return (point) => move(point, cx, cy, angle, 1, index % 2 === 1);
    });
  }
  if (mode.startsWith('spiral-')) {
    const count = clamp(Number(mode.split('-')[1]) || 8, 2, 55);
    return Array.from({ length: count }, (_, index) => {
      const t = count <= 1 ? 0 : index / (count - 1);
      return (point) => move(point, cx, cy, t * Math.PI * 1.82 * PHI, Math.pow(PHI, -t * 1.25));
    });
  }
  if (mode === 'sacred-vesica') {
    return [
      (point) => move(point, cx, cy, 0, 1, false, -unit * 0.085, 0),
      (point) => move(point, cx, cy, 0, 1, true, unit * 0.085, 0),
    ];
  }
  if (mode === 'sacred-trinity') return ringTransforms(3, cx, cy, unit * 0.09, 0.84, { rotate: true });
  if (mode === 'sacred-seed-6') {
    return [(point) => ({ ...point }), ...ringTransforms(6, cx, cy, unit * 0.105, 0.82, { rotate: true })];
  }
  if (mode === 'sacred-flower-12') {
    return [
      (point) => ({ ...point }),
      ...ringTransforms(6, cx, cy, unit * 0.09, 0.79, { rotate: true }),
      ...ringTransforms(12, cx, cy, unit * 0.19, 0.59, { rotate: true, phase: Math.PI / 12 }),
    ];
  }
  if (mode === 'sacred-metatron-13') {
    return [
      (point) => move(point, cx, cy, 0, 0.86),
      ...ringTransforms(6, cx, cy, unit * 0.105, 0.68, { rotate: true }),
      ...ringTransforms(6, cx, cy, unit * 0.215, 0.48, { rotate: true, phase: Math.PI / 6 }),
    ];
  }
  if (mode === 'sacred-hexgrid-7') {
    return [(point) => move(point, cx, cy, 0, 0.76), ...ringTransforms(6, cx, cy, unit * 0.145, 0.76, { rotate: false })];
  }
  if (mode === 'phi-spiral-13') {
    return Array.from({ length: 13 }, (_, index) => {
      const t = index / 12;
      const angle = index * GOLDEN_ANGLE;
      const radius = unit * 0.18 * t;
      const scale = Math.pow(PHI, -index / 9);
      return (point) => move(point, cx, cy, angle, scale, false, Math.cos(angle) * radius, Math.sin(angle) * radius);
    });
  }
  if (mode === 'phi-bloom-21' || mode === 'golden-angle-34') {
    const count = mode === 'phi-bloom-21' ? 21 : 34;
    const scale = mode === 'phi-bloom-21' ? 0.46 : 0.34;
    return Array.from({ length: count }, (_, index) => {
      const angle = index * GOLDEN_ANGLE;
      const radius = Math.sqrt(index / Math.max(1, count - 1)) * unit * 0.255;
      return (point) => move(point, cx, cy, angle, scale, false, Math.cos(angle) * radius, Math.sin(angle) * radius);
    });
  }
  if (mode === 'fib-ring-13') {
    const values = FIBONACCI.slice(0, 7);
    return Array.from({ length: 13 }, (_, index) => {
      const angle = Math.PI * 2 * index / 13;
      const fib = values[index % values.length] / 13;
      const scale = 0.55 + fib * 0.22;
      return (point) => move(point, cx, cy, angle, scale, false, Math.cos(angle) * unit * 0.12, Math.sin(angle) * unit * 0.12);
    });
  }
  if (mode === 'fib-echo-8') {
    const values = FIBONACCI.slice(0, 8);
    const total = values.reduce((sum, value) => sum + value, 0);
    let cursor = -0.5;
    return values.map((value, index) => {
      cursor += value / total;
      const offset = cursor;
      return (point) => move(point, cx, cy, index * 0.025, Math.pow(PHI, -index / 12), index % 3 === 2,
        offset * this.width * 0.48, Math.sin(index * GOLDEN_ANGLE) * this.height * 0.075);
    });
  }
  if (mode === 'phi-mirror-12') {
    return Array.from({ length: 12 }, (_, index) => {
      const angle = Math.PI * 2 * index / 12;
      const scale = index % 2 ? 1 / PHI : 1;
      return (point) => move(point, cx, cy, angle, scale, index % 2 === 1);
    });
  }
  return originalTransforms.call(this);
};

function circle(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function goldenSpiral(ctx, cx, cy, maxRadius) {
  ctx.beginPath();
  for (let index = 0; index <= 320; index += 1) {
    const theta = index / 320 * Math.PI * 8;
    const radius = Math.min(maxRadius, 2.5 * Math.pow(PHI, theta / (Math.PI * 2)));
    const x = cx + Math.cos(theta) * radius;
    const y = cy + Math.sin(theta) * radius;
    index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
}

const originalGuides = CanvasEngine.prototype.drawSymmetryGuides;
CanvasEngine.prototype.drawSymmetryGuides = function drawSymmetryGuidesV092(ctx) {
  originalGuides.call(this, ctx);
  const mode = this.settings.symmetry;
  if (!ADVANCED.has(mode)) return;
  const cx = this.width / 2;
  const cy = this.height / 2;
  const unit = Math.min(this.width, this.height);
  ctx.save();
  ctx.strokeStyle = 'rgba(225,173,76,.55)';
  ctx.fillStyle = 'rgba(225,173,76,.72)';
  ctx.lineWidth = Math.max(1.5, unit / 760);
  ctx.setLineDash([unit / 70, unit / 100]);

  if (mode === 'sacred-vesica') {
    circle(ctx, cx - unit * 0.085, cy, unit * 0.18);
    circle(ctx, cx + unit * 0.085, cy, unit * 0.18);
  } else if (mode === 'sacred-trinity') {
    for (let index = 0; index < 3; index += 1) {
      const angle = Math.PI * 2 * index / 3 - Math.PI / 2;
      circle(ctx, cx + Math.cos(angle) * unit * 0.09, cy + Math.sin(angle) * unit * 0.09, unit * 0.145);
    }
  } else if (mode === 'sacred-seed-6' || mode === 'sacred-flower-12' || mode === 'sacred-metatron-13') {
    circle(ctx, cx, cy, unit * 0.115);
    const rings = mode === 'sacred-seed-6' ? [[6, 0.115]] : mode === 'sacred-flower-12' ? [[6, 0.115], [12, 0.23]] : [[6, 0.115], [6, 0.23]];
    for (const [count, radius] of rings) {
      for (let index = 0; index < count; index += 1) {
        const angle = Math.PI * 2 * index / count + (count === 12 ? Math.PI / 12 : 0);
        const x = cx + Math.cos(angle) * unit * radius;
        const y = cy + Math.sin(angle) * unit * radius;
        circle(ctx, x, y, unit * 0.115);
        if (mode === 'sacred-metatron-13') { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); }
      }
    }
  } else if (mode === 'sacred-hexgrid-7') {
    const points = [[cx, cy]];
    for (let index = 0; index < 6; index += 1) {
      const angle = Math.PI * 2 * index / 6;
      points.push([cx + Math.cos(angle) * unit * 0.145, cy + Math.sin(angle) * unit * 0.145]);
    }
    for (const [x, y] of points) circle(ctx, x, y, unit * 0.055);
  } else if (mode === 'phi-spiral-13') {
    goldenSpiral(ctx, cx, cy, unit * 0.45);
  } else if (mode === 'phi-bloom-21' || mode === 'golden-angle-34') {
    const count = mode === 'phi-bloom-21' ? 21 : 34;
    for (let index = 0; index < count; index += 1) {
      const angle = index * GOLDEN_ANGLE;
      const radius = Math.sqrt(index / Math.max(1, count - 1)) * unit * 0.28;
      circle(ctx, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, Math.max(3, unit * 0.008));
    }
  } else if (mode === 'fib-ring-13') {
    FIBONACCI.slice(0, 7).forEach((value) => circle(ctx, cx, cy, unit * (0.025 + value / 80)));
  } else if (mode === 'fib-echo-8') {
    FIBONACCI.slice(0, 8).forEach((value, index) => {
      const x = this.width * (0.16 + index * 0.095);
      const y = cy + Math.sin(index * GOLDEN_ANGLE) * unit * 0.09;
      circle(ctx, x, y, Math.max(3, value / 21 * unit * 0.035));
    });
  } else if (mode === 'phi-mirror-12') {
    for (let index = 0; index < 12; index += 1) {
      const angle = Math.PI * 2 * index / 12;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(angle) * unit * 0.54, cy + Math.sin(angle) * unit * 0.54); ctx.stroke();
    }
    circle(ctx, cx, cy, unit / PHI / 4);
  }
  ctx.restore();
};

function findGroup(select, label) {
  return [...select.querySelectorAll('optgroup')].find((group) => group.label === label) || null;
}

function addOption(group, value, label) {
  if ([...group.querySelectorAll('option')].some((option) => option.value === value)) return;
  group.appendChild(new Option(label, value));
}

function ensureGroup(select, label, options) {
  let group = findGroup(select, label);
  if (!group) { group = document.createElement('optgroup'); group.label = label; select.appendChild(group); }
  options.forEach(([value, text]) => addOption(group, value, text));
  return group;
}

export function ensureModeOption(mode, label = null) {
  const select = document.querySelector('#symmetryInput');
  if (!select || !mode) return null;
  let option = [...select.options].find((candidate) => candidate.value === mode);
  if (option) return option;
  const group = ensureGroup(select, 'Custom', []);
  option = new Option(label || mode.replaceAll('-', ' '), mode);
  group.appendChild(option);
  return option;
}

export function setPatternMode(mode, label = null) {
  const select = document.querySelector('#symmetryInput');
  if (!select) return false;
  ensureModeOption(mode, label);
  select.value = mode;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function upgradeSelect() {
  const select = document.querySelector('#symmetryInput');
  if (!select) return false;
  ensureGroup(select, 'Extended Radial', [7, 9, 14, 18, 20, 30, 32, 36, 48].map((count) => [`radial-${count}`, `Radial ${count}`]));
  ensureGroup(select, 'Extended Kaleidoscope', [16, 18, 24].map((count) => [`kaleido-${count}`, `Kaleido ${count}`]));
  ensureGroup(select, 'Extended Spiral', [13, 21].map((count) => [`spiral-${count}`, `Spiral ${count}`]));
  ensureGroup(select, 'Sacred Geometry', SACRED_MODES);
  ensureGroup(select, 'Phi + Fibonacci', PHI_MODES);
  select.dataset.v092 = 'true';
  return true;
}

const originalRestore = CanvasEngine.prototype.restore;
CanvasEngine.prototype.restore = async function restoreV092(project) {
  await originalRestore.call(this, project);
  if (this.settings?.symmetry) ensureModeOption(this.settings.symmetry);
  const select = document.querySelector('#symmetryInput');
  if (select && this.settings?.symmetry) select.value = this.settings.symmetry;
};

function wait(attempt = 0) {
  if (upgradeSelect() || attempt > 420) return;
  requestAnimationFrame(() => wait(attempt + 1));
}
wait();

window.domistikaGeometryV092 = { PHI, GOLDEN_ANGLE, FIBONACCI, sacredModes: SACRED_MODES, phiModes: PHI_MODES, setPatternMode, ensureModeOption };
