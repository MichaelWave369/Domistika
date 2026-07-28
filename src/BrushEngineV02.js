import { CanvasEngine } from './core/CanvasEngine.js';
import { clamp, hexToRgba } from './core/utils.js';

const DEFAULT_PROFILE = Object.freeze({
  spacing: 0.18,
  scatter: 0,
  rotationJitter: 0,
  grain: 0.08,
  hardness: 0.84,
  flow: 1,
  tip: 'round',
  tiltInfluence: 0,
  pressureOpacity: true,
  pressureSize: true,
  wetMix: 0,
});

const originalEventPoint = CanvasEngine.prototype.eventPoint;
const originalSerialize = CanvasEngine.prototype.serialize;
const originalRestore = CanvasEngine.prototype.restore;

function profileFor(engine) {
  return { ...DEFAULT_PROFILE, ...(engine.brushProfile || CanvasEngine.prototype.brushProfile || {}) };
}

CanvasEngine.prototype.brushProfile = { ...DEFAULT_PROFILE };
CanvasEngine.prototype.setBrushProfile = function setBrushProfile(profile = {}) {
  this.brushProfile = { ...profileFor(this), ...profile };
  this.onChange?.({ reason: 'brush-profile', engine: this, brushProfile: this.getBrushProfile() });
};
CanvasEngine.prototype.getBrushProfile = function getBrushProfile() {
  return profileFor(this);
};

CanvasEngine.prototype.eventPoint = function eventPointV02(event) {
  const point = originalEventPoint.call(this, event);
  return {
    ...point,
    tiltX: Number.isFinite(event.tiltX) ? event.tiltX : 0,
    tiltY: Number.isFinite(event.tiltY) ? event.tiltY : 0,
    altitudeAngle: Number.isFinite(event.altitudeAngle) ? event.altitudeAngle : Math.PI / 2,
    azimuthAngle: Number.isFinite(event.azimuthAngle) ? event.azimuthAngle : 0,
  };
};

function interpolate(from, to, t) {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    pressure: from.pressure + (to.pressure - from.pressure) * t,
    tiltX: (from.tiltX || 0) + ((to.tiltX || 0) - (from.tiltX || 0)) * t,
    tiltY: (from.tiltY || 0) + ((to.tiltY || 0) - (from.tiltY || 0)) * t,
  };
}

function resolveColor(engine, x, y, profile) {
  const base = hexToRgba(engine.settings.color);
  const wetMix = clamp(profile.wetMix || 0, 0, 1);
  if (!wetMix || engine.tool === 'eraser' || !engine.activeLayer) return base;
  try {
    const pixel = engine.activeLayer.ctx.getImageData(
      clamp(Math.floor(x), 0, engine.width - 1),
      clamp(Math.floor(y), 0, engine.height - 1),
      1,
      1,
    ).data;
    if (!pixel[3]) return base;
    const mix = wetMix * (pixel[3] / 255);
    return {
      r: Math.round(base.r * (1 - mix) + pixel[0] * mix),
      g: Math.round(base.g * (1 - mix) + pixel[1] * mix),
      b: Math.round(base.b * (1 - mix) + pixel[2] * mix),
    };
  } catch {
    return base;
  }
}

function ellipseDab(ctx, x, y, rx, ry, alpha, color, hardness, grain) {
  if (alpha <= 0) return;
  const radius = Math.max(rx, ry);
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  const core = clamp(hardness, 0.02, 1) * 0.78;
  gradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${alpha})`);
  gradient.addColorStop(core, `rgba(${color.r},${color.g},${color.b},${alpha * (0.9 - grain * 0.2)})`);
  gradient.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.25, rx), Math.max(0.25, ry), 0, 0, Math.PI * 2);
  ctx.fill();
  if (grain > 0.04) {
    const specks = Math.max(2, Math.round((rx + ry) * grain * 0.28));
    for (let index = 0; index < specks; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha * grain * Math.random() * 0.5})`;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 0.5 + Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintStamp(engine, ctx, point, pathAngle) {
  const profile = profileFor(engine);
  const pressure = profile.pressureSize === false ? 1 : Math.max(0.18, point.pressure || 1);
  const size = Math.max(0.5, Number(engine.settings.size) * pressure);
  let alpha = clamp(Number(engine.settings.opacity), 0.01, 1) * clamp(profile.flow, 0.04, 1.2);
  if (profile.pressureOpacity !== false) alpha *= Math.max(0.12, point.pressure || 1);
  if (engine.tool === 'marker') alpha *= 0.62;
  if (engine.tool === 'pencil') alpha *= 0.86;

  const scatterRadius = size * clamp(profile.scatter, 0, 2.4);
  const scatterAngle = Math.random() * Math.PI * 2;
  const x = point.x + Math.cos(scatterAngle) * scatterRadius * Math.random();
  const y = point.y + Math.sin(scatterAngle) * scatterRadius * Math.random();
  const tiltAngle = Math.atan2(point.tiltY || 0, point.tiltX || 1);
  const rotation = pathAngle
    + (Math.random() - 0.5) * clamp(profile.rotationJitter, 0, 360) * Math.PI / 180
    + tiltAngle * clamp(profile.tiltInfluence, 0, 1);
  const color = resolveColor(engine, x, y, profile);

  ctx.save();
  ctx.globalCompositeOperation = engine.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.translate(x, y);
  ctx.rotate(rotation);

  if (engine.tool === 'airbrush') {
    const dots = Math.max(8, Math.round(size * 0.48));
    for (let index = 0; index < dots; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * size * 1.35;
      const dab = Math.max(0.4, size * (0.03 + Math.random() * 0.07));
      ellipseDab(ctx, Math.cos(angle) * radius, Math.sin(angle) * radius, dab, dab, alpha * (0.02 + Math.random() * 0.05), color, 0.14, Math.max(profile.grain, 0.18));
    }
    ctx.restore();
    return;
  }

  if (profile.tip === 'rake') {
    for (let strand = -2; strand <= 2; strand += 1) {
      ellipseDab(ctx, strand * size * 0.13, 0, size * 0.09, size * 0.5, alpha * 0.72, color, profile.hardness, profile.grain);
    }
  } else if (profile.tip === 'splatter') {
    const dots = Math.max(6, Math.round(size * 0.22));
    for (let index = 0; index < dots; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * size * 0.86;
      const dab = Math.max(0.6, size * (0.04 + Math.random() * 0.16));
      ellipseDab(ctx, Math.cos(angle) * radius, Math.sin(angle) * radius, dab, dab, alpha * (0.2 + Math.random() * 0.5), color, profile.hardness * 0.5, profile.grain);
    }
  } else if (profile.tip === 'square') {
    ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
    ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
  } else if (profile.tip === 'flat') {
    ellipseDab(ctx, 0, 0, size * 0.26, size * 0.52, alpha, color, profile.hardness, profile.grain);
  } else if (profile.tip === 'chisel') {
    ctx.rotate(Math.PI / 8);
    ellipseDab(ctx, 0, 0, size * 0.2, size * 0.56, alpha, color, profile.hardness, profile.grain);
  } else {
    ellipseDab(ctx, 0, 0, size * 0.5, size * 0.5, alpha, color, profile.hardness, profile.grain);
  }
  ctx.restore();
}

CanvasEngine.prototype.drawSingleSegment = function drawSingleSegmentV02(from, to) {
  const layer = this.activeLayer;
  if (!layer) return;
  const profile = profileFor(this);
  const distance = Math.max(0.001, Math.hypot(to.x - from.x, to.y - from.y));
  const averagePressure = ((from.pressure || 1) + (to.pressure || 1)) / 2;
  const effectiveSize = Number(this.settings.size) * (profile.pressureSize === false ? 1 : Math.max(0.18, averagePressure));
  const step = Math.max(0.8, effectiveSize * clamp(profile.spacing, 0.02, 3));
  const count = Math.max(1, Math.ceil(distance / step));
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  for (let index = 0; index <= count; index += 1) {
    paintStamp(this, layer.ctx, interpolate(from, to, index / count), angle);
  }
};

CanvasEngine.prototype.serialize = function serializeV02() {
  const project = originalSerialize.call(this);
  project.version = Math.max(2, Number(project.version) || 1);
  project.brushProfile = this.getBrushProfile();
  return project;
};

CanvasEngine.prototype.restore = async function restoreV02(project) {
  await originalRestore.call(this, project);
  this.brushProfile = { ...DEFAULT_PROFILE, ...(project?.brushProfile || {}) };
};

window.domistikaBrushV02 = {
  apply(profile = {}) {
    CanvasEngine.prototype.brushProfile = { ...profileFor(CanvasEngine.prototype), ...profile };
    document.dispatchEvent(new CustomEvent('domistika:v02-profile', { detail: { ...CanvasEngine.prototype.brushProfile } }));
  },
  get() {
    return { ...profileFor(CanvasEngine.prototype) };
  },
  defaults() {
    return { ...DEFAULT_PROFILE };
  },
};

document.documentElement.dataset.brushEngine = 'v0.2';
document.dispatchEvent(new CustomEvent('domistika:v02-ready'));
