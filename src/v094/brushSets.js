const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

export const BRUSH_SETS = [
  {
    name: 'Calligraphy',
    description: 'Expressive nibs for lettering, signs, flourishes, and ornamental marks.',
    presets: [
      ['Copperplate Flex', 'ink', 18, 1, 58, { tip: 'chisel', spacing: .055, hardness: .98, flow: .96, grain: .015, tiltInfluence: .7, pressureOpacity: true, pressureSize: true }],
      ['Broad Edge 30°', 'ink', 34, .96, 42, { tip: 'flat', spacing: .06, hardness: 1, flow: 1, grain: 0, tiltInfluence: .82, pressureOpacity: false, pressureSize: false }],
      ['Blackletter Nib', 'ink', 42, 1, 38, { tip: 'chisel', spacing: .05, hardness: 1, flow: 1, grain: .01, tiltInfluence: .5, pressureOpacity: false, pressureSize: false }],
      ['Brush Script', 'ink', 28, .92, 64, { tip: 'flat', spacing: .075, hardness: .84, flow: .88, grain: .04, wetMix: .08, tiltInfluence: .56 }],
      ['Dry Sign Brush', 'ink', 46, .86, 52, { tip: 'rake', spacing: .13, hardness: .62, flow: .72, grain: .42, rotationJitter: 8, tiltInfluence: .36 }],
      ['Flourish Liner', 'ink', 9, 1, 72, { tip: 'round', spacing: .045, hardness: 1, flow: 1, grain: 0, pressureOpacity: true, pressureSize: true }],
    ],
  },
  {
    name: 'Natural Media',
    description: 'Textured tools for sketching, painting, shading, and organic marks.',
    presets: [
      ['Willow Charcoal', 'pencil', 38, .78, 48, { tip: 'rake', spacing: .16, scatter: .05, hardness: .28, flow: .54, grain: .72, rotationJitter: 28 }],
      ['Graphite Powder', 'airbrush', 86, .36, 24, { tip: 'splatter', spacing: .11, scatter: .28, hardness: .08, flow: .3, grain: .76, rotationJitter: 180, pressureSize: false }],
      ['Wax Crayon', 'marker', 31, .82, 34, { tip: 'flat', spacing: .12, hardness: .62, flow: .76, grain: .48, rotationJitter: 12 }],
      ['Palette Knife', 'marker', 68, .92, 18, { tip: 'square', spacing: .2, hardness: .94, flow: .84, grain: .18, wetMix: .12, pressureOpacity: false }],
      ['Fan Bristle', 'marker', 74, .72, 26, { tip: 'rake', spacing: .15, hardness: .66, flow: .62, grain: .34, wetMix: .16, rotationJitter: 16 }],
      ['Water Bloom', 'airbrush', 110, .28, 46, { tip: 'round', spacing: .16, scatter: .08, hardness: .06, flow: .2, grain: .16, wetMix: .52, pressureSize: false }],
    ],
  },
  {
    name: 'Comic + Design',
    description: 'Clean production brushes for comics, layouts, lettering, and graphic forms.',
    presets: [
      ['G-Pen Snap', 'ink', 14, 1, 68, { tip: 'round', spacing: .04, hardness: 1, flow: 1, grain: 0, pressureOpacity: true, pressureSize: true }],
      ['Studio Technical', 'ink', 6, 1, 74, { tip: 'round', spacing: .035, hardness: 1, flow: 1, grain: 0, pressureOpacity: false, pressureSize: false }],
      ['Manga Fill', 'marker', 84, 1, 22, { tip: 'square', spacing: .12, hardness: 1, flow: 1, grain: 0, pressureOpacity: false, pressureSize: false }],
      ['Halftone Dust', 'airbrush', 92, .42, 18, { tip: 'splatter', spacing: .1, scatter: .38, hardness: .82, flow: .44, grain: .08, pressureSize: false }],
      ['Neon Sign', 'ink', 22, .88, 64, { tip: 'round', spacing: .05, hardness: .4, flow: .8, grain: 0, pressureOpacity: false, pressureSize: false }],
      ['Layout Blue', 'pencil', 8, .44, 72, { tip: 'round', spacing: .05, hardness: .84, flow: .6, grain: .08, pressureOpacity: false }],
    ],
  },
  {
    name: 'Experimental',
    description: 'Unpredictable, energetic brushes for texture, motion, and happy accidents.',
    presets: [
      ['Static Rake', 'marker', 48, .58, 28, { tip: 'rake', spacing: .11, scatter: .12, hardness: .76, flow: .5, grain: .82, rotationJitter: 46 }],
      ['Comet Tail', 'airbrush', 68, .52, 76, { tip: 'splatter', spacing: .08, scatter: .22, hardness: .14, flow: .44, grain: .24, rotationJitter: 120 }],
      ['Broken Pixel', 'marker', 26, .82, 12, { tip: 'square', spacing: .28, scatter: .24, hardness: 1, flow: .88, grain: 0, rotationJitter: 90, pressureOpacity: false }],
      ['Moss Scatter', 'marker', 52, .62, 24, { tip: 'splatter', spacing: .14, scatter: .54, hardness: .56, flow: .5, grain: .58, rotationJitter: 180 }],
      ['Ribbon Orbit', 'ink', 36, .8, 82, { tip: 'flat', spacing: .06, scatter: .02, hardness: .74, flow: .7, grain: .08, tiltInfluence: 1, rotationJitter: 8 }],
      ['Cloud Stamp', 'airbrush', 126, .24, 38, { tip: 'round', spacing: .22, scatter: .16, hardness: .03, flow: .18, grain: .12, pressureOpacity: false, pressureSize: false }],
    ],
  },
].map((set) => ({
  ...set,
  presets: set.presets.map(([name, tool, size, opacity, smoothing, profile]) => ({ name, tool, size, opacity, smoothing, profile })),
}));

export const PRESSURE_CURVES = {
  soft: (pressure) => Math.pow(pressure, .62),
  linear: (pressure) => pressure,
  firm: (pressure) => Math.pow(pressure, 1.55),
  ink: (pressure) => pressure < .42 ? pressure * .62 : .26 + pressure * .74,
};

function updateRange(selector, value) {
  const input = document.querySelector(selector);
  if (!input) return;
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export function applyBrushPreset(engine, preset) {
  if (!engine || !preset) return;
  engine.setTool(preset.tool);
  document.querySelectorAll('[data-tool]').forEach((button) => button.classList.toggle('active', button.dataset.tool === preset.tool));
  updateRange('#sizeInput', preset.size);
  updateRange('#opacityInput', Math.round(preset.opacity * 100));
  updateRange('#smoothingInput', preset.smoothing);
  if (typeof engine.setBrushProfile === 'function') engine.setBrushProfile(preset.profile);
  if (window.domistikaBrushV02?.apply) window.domistikaBrushV02.apply(preset.profile);
  document.dispatchEvent(new CustomEvent('domistika:v094-brush-applied', { detail: { preset } }));
}

export function installPenDynamics(engine) {
  if (!engine || engine.__v094PenDynamicsInstalled) return;
  engine.__v094PenDynamicsInstalled = true;
  engine.penDynamics = {
    curve: 'linear',
    minimumPressure: .08,
    velocityTaper: .18,
    tiltBoost: .2,
    ...engine.penDynamics,
  };

  const originalEventPoint = engine.eventPoint.bind(engine);
  let previous = null;
  engine.eventPoint = function eventPointV094(event) {
    const point = originalEventPoint(event);
    const now = performance.now();
    const distance = previous ? Math.hypot(point.x - previous.x, point.y - previous.y) : 0;
    const elapsed = Math.max(1, now - (previous?.time || now));
    const speed = distance / elapsed;
    const curve = PRESSURE_CURVES[this.penDynamics.curve] || PRESSURE_CURVES.linear;
    const minimum = clamp(this.penDynamics.minimumPressure, .02, .95);
    let pressure = minimum + (1 - minimum) * curve(clamp(point.pressure, 0, 1));
    const velocityTaper = clamp(this.penDynamics.velocityTaper, 0, .9);
    pressure *= 1 - Math.min(.7, speed / 3.6) * velocityTaper;
    const tiltMagnitude = Math.min(1, Math.hypot(point.tiltX || 0, point.tiltY || 0) / 90);
    pressure *= 1 + tiltMagnitude * clamp(this.penDynamics.tiltBoost, 0, .8);
    previous = { x: point.x, y: point.y, time: now };
    return { ...point, pressure: clamp(pressure, minimum, 1) };
  };

  const originalSerialize = engine.serialize.bind(engine);
  engine.serialize = function serializeV094() {
    const project = originalSerialize();
    project.version = Math.max(4, Number(project.version) || 1);
    project.penDynamics = { ...this.penDynamics };
    return project;
  };

  const originalRestore = engine.restore.bind(engine);
  engine.restore = async function restoreV094(project) {
    await originalRestore(project);
    this.penDynamics = { ...this.penDynamics, ...(project?.penDynamics || {}) };
    document.dispatchEvent(new CustomEvent('domistika:v094-pen-restored', { detail: { ...this.penDynamics } }));
  };
}

export function setPenDynamics(engine, patch) {
  if (!engine) return;
  engine.penDynamics = { ...engine.penDynamics, ...patch };
  engine.onChange?.({ reason: 'pen-dynamics', engine, penDynamics: { ...engine.penDynamics } });
}
