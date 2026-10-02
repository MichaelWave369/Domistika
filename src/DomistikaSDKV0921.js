const APP_VERSION = '0.9.35';
const SDK_VERSION = '0.1.12';
const SCHEMA = 'domistika.sdk.v1';
const INSTALL_FLAG = '__domistikaStableSdkV0921Installed';

const DRAW_TOOLS = new Set(['pencil', 'ink', 'marker', 'airbrush', 'eraser']);
const TOOLS = new Set([
  ...DRAW_TOOLS,
  'line', 'rectangle', 'ellipse', 'eyedropper', 'pan',
]);
const SETTINGS = new Set(['color', 'size', 'opacity', 'smoothing', 'pressure', 'symmetry', 'grid', 'gridSize']);
const BLEND_MODES = new Set(['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference']);
const MOTION_PRESETS = new Set(['slow-drift', 'portal', 'portal-369', 'chaos', 'hypnosis', 'inversion-storm', 'bass-bloom']);
const COMPOSER_PRESETS = new Set(['ghost-mandala', 'orbit-bloom', 'infinite-dream', 'calm-drift']);
const VISUAL_SCENES = new Set(['particle-portal', 'fractal-bloom', 'aurora-breath', 'cosmic-pulse']);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function currentEngine() {
  return window.__domistikaEngine || globalThis.domistikaEngine || null;
}

function requireEngine() {
  const engine = currentEngine();
  if (!engine) throw new Error('DOMISTIKA_SDK_ENGINE_NOT_READY');
  return engine;
}

function projectName() {
  return String(document.querySelector('#projectName')?.value || 'Untitled Domistika').trim() || 'Untitled Domistika';
}

function emit(name, detail = {}) {
  const type = String(name || '').startsWith('domistika:') ? String(name) : `domistika:${name}`;
  window.dispatchEvent(new CustomEvent(type, {
    detail: {
      sdkVersion: SDK_VERSION,
      appVersion: APP_VERSION,
      ...detail,
    },
  }));
}

function safeLayer(layer) {
  if (!layer) return null;
  return Object.freeze({
    id: String(layer.id || ''),
    name: String(layer.name || ''),
    visible: layer.visible !== false,
    opacity: Number(layer.opacity ?? 1),
    blendMode: String(layer.blendMode || 'normal'),
    role: String(layer.role || (layer.kind === 'guide' ? 'guide' : 'paint')),
    motionPolicy: String(layer.motionPolicy || 'inherit'),
  });
}

function syncToolUi(tool) {
  document.querySelectorAll('[data-tool]').forEach((button) => {
    button.classList.toggle('active', button.dataset.tool === tool);
  });
}

function syncSettingUi(key, value) {
  const bindings = {
    color: ['#colorInput', '#colorLabel', (raw) => String(raw)],
    size: ['#sizeInput', '#sizeOutput', (raw) => String(raw)],
    opacity: ['#opacityInput', '#opacityOutput', (raw) => `${Math.round(Number(raw) * 100)}%`, (raw) => String(Math.round(Number(raw) * 100))],
    smoothing: ['#smoothingInput', '#smoothingOutput', (raw) => `${Math.round(Number(raw))}%`],
    symmetry: ['#symmetryInput', null, null],
  };
  const binding = bindings[key];
  if (!binding) return;
  const [inputSelector, outputSelector, format = (raw) => String(raw), inputFormat = (raw) => String(raw)] = binding;
  const input = document.querySelector(inputSelector);
  if (input) input.value = inputFormat(value);
  const output = outputSelector ? document.querySelector(outputSelector) : null;
  if (output) output.textContent = format(value);
}

function findToolButton(labels = []) {
  const wanted = labels.map((value) => String(value).trim().toLowerCase()).filter(Boolean);
  if (!wanted.length) return null;
  return [...document.querySelectorAll('button')].find((button) => {
    const haystack = [
      button.dataset?.tool,
      button.dataset?.v04Select ? 'select' : '',
      button.id,
      button.getAttribute('aria-label'),
      button.title,
      button.textContent,
    ].filter(Boolean).join(' ').toLowerCase();
    return wanted.some((label) => haystack.includes(label));
  }) || null;
}

function liveToolIds() {
  const tools = new Set(TOOLS);

  if (window.domistikaFillV091?.select || document.querySelector('[data-tool="fill"]')) {
    tools.add('fill');
  }

  if (window.domistikaSelectionV04?.enable || document.querySelector('[data-v04-select]')) {
    tools.add('select');
  }

  const smartMasksReady = document.documentElement.dataset.smartMasks
    && document.documentElement.dataset.smartMasks !== 'unavailable';
  if (smartMasksReady || findToolButton(['smart select', 'smart mask', 'magic wand'])) {
    tools.add('smart');
  }

  return Object.freeze([...tools]);
}

function setTool(tool) {
  const requested = String(tool || '').trim().toLowerCase();
  const name = requested === 'smart-select' ? 'smart' : requested;
  const engine = requireEngine();

  if (TOOLS.has(name)) {
    engine.setTool(name);
  } else if (name === 'fill' && window.domistikaFillV091?.select) {
    window.domistikaFillV091.select();
  } else if (name === 'select' && window.domistikaSelectionV04?.enable) {
    window.domistikaSelectionV04.enable();
  } else if (name === 'smart') {
    const button = findToolButton(['smart select', 'smart mask', 'magic wand']);
    if (!button) throw new Error('DOMISTIKA_SDK_TOOL_UNAVAILABLE');
    button.click();
  } else {
    throw new Error('DOMISTIKA_SDK_TOOL_INVALID');
  }

  syncToolUi(name);
  emit('sdk-tool', { tool: name });
  return name;
}

function setSetting(key, value) {
  const name = String(key || '').trim();
  if (!SETTINGS.has(name)) throw new Error('DOMISTIKA_SDK_SETTING_INVALID');
  const engine = requireEngine();

  let normalized = value;
  if (name === 'color') {
    normalized = String(value || '').trim().toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(normalized)) throw new Error('DOMISTIKA_SDK_COLOR_INVALID');
  } else if (name === 'size') {
    normalized = clamp(Number(value), 1, 180);
  } else if (name === 'opacity') {
    normalized = clamp(Number(value), 0.01, 1);
  } else if (name === 'smoothing') {
    normalized = clamp(Number(value), 0, 95);
  } else if (name === 'pressure' || name === 'grid') {
    normalized = Boolean(value);
  } else if (name === 'gridSize') {
    normalized = clamp(Math.round(Number(value)), 8, 512);
  } else if (name === 'symmetry') {
    normalized = String(value || 'none').trim().toLowerCase() || 'none';
  }

  if (typeof normalized === 'number' && !Number.isFinite(normalized)) {
    throw new Error('DOMISTIKA_SDK_SETTING_VALUE_INVALID');
  }

  engine.setSetting(name, normalized);
  syncSettingUi(name, normalized);
  emit('sdk-setting', { key: name, value: normalized });
  return normalized;
}

function normalizePoint(point, engine, space = 'canvas') {
  if (!point || typeof point !== 'object' || Array.isArray(point)) {
    throw new Error('DOMISTIKA_SDK_POINT_INVALID');
  }

  let x = Number(point.x);
  let y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('DOMISTIKA_SDK_POINT_INVALID');

  if (space === 'normalized') {
    if (x < 0 || x > 1 || y < 0 || y > 1) throw new Error('DOMISTIKA_SDK_POINT_OUT_OF_RANGE');
    x *= engine.width;
    y *= engine.height;
  } else if (space === 'canvas') {
    if (x < 0 || x > engine.width || y < 0 || y > engine.height) throw new Error('DOMISTIKA_SDK_POINT_OUT_OF_RANGE');
  } else {
    throw new Error('DOMISTIKA_SDK_COORDINATE_SPACE_INVALID');
  }

  const rawPressure = Number(point.pressure ?? point.p ?? 1);
  const pressure = Number.isFinite(rawPressure) ? clamp(rawPressure, 0.08, 1) : 1;
  return { x, y, pressure };
}

function stroke(points, options = {}) {
  const engine = requireEngine();
  if (!Array.isArray(points) || points.length < 1 || points.length > 4096) {
    throw new Error('DOMISTIKA_SDK_STROKE_POINTS_INVALID');
  }

  const allowed = new Set(['tool', 'color', 'size', 'opacity', 'smoothing', 'symmetry', 'space', 'history', 'message']);
  if (Object.keys(options || {}).some((key) => !allowed.has(key))) {
    throw new Error('DOMISTIKA_SDK_STROKE_OPTIONS_INVALID');
  }

  if (options.tool != null) setTool(options.tool);
  if (options.color != null) setSetting('color', options.color);
  if (options.size != null) setSetting('size', options.size);
  if (options.opacity != null) setSetting('opacity', options.opacity);
  if (options.smoothing != null) setSetting('smoothing', options.smoothing);
  if (options.symmetry != null) setSetting('symmetry', options.symmetry);

  if (!DRAW_TOOLS.has(engine.tool)) throw new Error('DOMISTIKA_SDK_STROKE_TOOL_NOT_DRAWABLE');
  if (!engine.activeLayer) throw new Error('DOMISTIKA_SDK_ACTIVE_LAYER_REQUIRED');

  const space = options.space || 'canvas';
  const normalized = points.map((point) => normalizePoint(point, engine, space));
  if (options.history !== false) engine.captureHistory?.();

  engine.drawDot(normalized[0]);
  for (let index = 1; index < normalized.length; index += 1) {
    engine.drawSegment(normalized[index - 1], normalized[index]);
  }

  engine.markChanged?.(String(options.message || `SDK stroke committed · ${normalized.length} points`));
  emit('stroke', {
    tool: engine.tool,
    pointCount: normalized.length,
    layerId: engine.activeLayerId,
    space,
  });

  return Object.freeze({
    ok: true,
    tool: engine.tool,
    pointCount: normalized.length,
    layerId: engine.activeLayerId,
    space,
  });
}

function canvasInfo() {
  const engine = requireEngine();
  return Object.freeze({
    width: engine.width,
    height: engine.height,
    projectName: projectName(),
    activeLayerId: engine.activeLayerId,
    layerCount: engine.layers.length,
  });
}

async function newCanvas({ width = 1600, height = 1200, name = 'Untitled Domistika' } = {}) {
  const engine = requireEngine();
  const w = clamp(Math.round(Number(width)), 64, 8192);
  const h = clamp(Math.round(Number(height)), 64, 8192);
  if (!Number.isFinite(w) || !Number.isFinite(h)) throw new Error('DOMISTIKA_SDK_CANVAS_SIZE_INVALID');

  await engine.restore({
    format: 'domistika-project',
    version: 1,
    width: w,
    height: h,
    activeLayerId: 'base-layer',
    settings: { ...engine.settings },
    layers: [{
      id: 'base-layer',
      name: 'Sketch 1',
      visible: true,
      opacity: 1,
      blendMode: 'normal',
      image: null,
    }],
  });

  const project = document.querySelector('#projectName');
  if (project) {
    project.value = String(name || 'Untitled Domistika').trim().slice(0, 120) || 'Untitled Domistika';
    project.dispatchEvent(new Event('input', { bubbles: true }));
  }
  window.domistikaNavigation?.fit?.();
  emit('sdk-canvas-new', { width: w, height: h, name: projectName() });
  return canvasInfo();
}

function layerList() {
  const engine = requireEngine();
  return Object.freeze(engine.layers.map((layer) => safeLayer(layer)));
}

function layerCreate(name) {
  const engine = requireEngine();
  const layer = engine.createLayer(String(name || `Layer ${engine.layers.length + 1}`).trim().slice(0, 120));
  emit('sdk-layer', { action: 'create', layer: safeLayer(layer) });
  return safeLayer(layer);
}

function layerActivate(id) {
  const engine = requireEngine();
  const target = engine.layers.find((layer) => layer.id === id);
  if (!target) throw new Error('DOMISTIKA_SDK_LAYER_NOT_FOUND');
  engine.setActiveLayer(id);
  emit('sdk-layer', { action: 'activate', layer: safeLayer(target) });
  return safeLayer(target);
}

function layerRename(id, name) {
  const engine = requireEngine();
  const target = engine.layers.find((layer) => layer.id === id);
  if (!target) throw new Error('DOMISTIKA_SDK_LAYER_NOT_FOUND');
  engine.renameLayer(id, String(name || '').trim().slice(0, 120));
  emit('sdk-layer', { action: 'rename', layer: safeLayer(target) });
  return safeLayer(target);
}

function layerVisibility(id, visible) {
  const engine = requireEngine();
  const target = engine.layers.find((layer) => layer.id === id);
  if (!target) throw new Error('DOMISTIKA_SDK_LAYER_NOT_FOUND');
  engine.setLayerVisibility(id, Boolean(visible));
  emit('sdk-layer', { action: 'visibility', layer: safeLayer(target) });
  return safeLayer(target);
}

function layerOpacity(id, opacity) {
  const engine = requireEngine();
  const target = engine.layers.find((layer) => layer.id === id);
  if (!target) throw new Error('DOMISTIKA_SDK_LAYER_NOT_FOUND');
  const value = Number(opacity);
  if (!Number.isFinite(value)) throw new Error('DOMISTIKA_SDK_LAYER_OPACITY_INVALID');
  engine.setLayerOpacity(id, clamp(value, 0, 1));
  emit('sdk-layer', { action: 'opacity', layer: safeLayer(target) });
  return safeLayer(target);
}

function layerBlend(id, blendMode) {
  const engine = requireEngine();
  const target = engine.layers.find((layer) => layer.id === id);
  if (!target) throw new Error('DOMISTIKA_SDK_LAYER_NOT_FOUND');
  const mode = String(blendMode || 'normal').trim().toLowerCase();
  if (!BLEND_MODES.has(mode)) throw new Error('DOMISTIKA_SDK_LAYER_BLEND_INVALID');
  engine.setLayerBlendMode(id, mode);
  emit('sdk-layer', { action: 'blend', layer: safeLayer(target) });
  return safeLayer(target);
}

function layerClear(id = requireEngine().activeLayerId) {
  const engine = requireEngine();
  layerActivate(id);
  engine.clearActiveLayer();
  emit('sdk-layer', { action: 'clear', layerId: id });
  return true;
}
function layerRole(id, role) {
  const engine = requireEngine();
  const target = engine.layers.find((layer) => layer.id === id);
  if (!target) throw new Error('DOMISTIKA_SDK_LAYER_NOT_FOUND');
  if (typeof engine.setLayerRole !== 'function') throw new Error('DOMISTIKA_SDK_LAYER_ROLE_UNAVAILABLE');
  const result = engine.setLayerRole(id, role);
  emit('sdk-layer', { action: 'role', layer: safeLayer(target) });
  return result;
}

function layerMotionPolicy(id, policy) {
  const engine = requireEngine();
  const target = engine.layers.find((layer) => layer.id === id);
  if (!target) throw new Error('DOMISTIKA_SDK_LAYER_NOT_FOUND');
  if (typeof engine.setLayerMotionPolicy !== 'function') throw new Error('DOMISTIKA_SDK_LAYER_MOTION_POLICY_UNAVAILABLE');
  const result = engine.setLayerMotionPolicy(id, policy);
  emit('sdk-layer', { action: 'motion-policy', layer: safeLayer(target) });
  return result;
}


function spiroApi() {
  return window.domistikaSpiroV07 || null;
}

function spiroPresets() {
  const api = spiroApi();
  return Object.freeze(api?.presets ? Object.keys(api.presets) : []);
}

function spiroPlace(preset, { x, y, space = 'canvas', ...options } = {}) {
  const engine = requireEngine();
  const api = spiroApi();
  if (!api?.drawAt) throw new Error('DOMISTIKA_SDK_SPIRO_UNAVAILABLE');
  const name = String(preset || '').trim();
  if (name) {
    if (!api.presets?.[name]) throw new Error('DOMISTIKA_SDK_SPIRO_PRESET_INVALID');
    api.applyPreset?.(name);
  }

  const point = normalizePoint({ x, y, pressure: 1 }, engine, space);
  const ok = api.drawAt(point.x, point.y, options);
  if (!ok) throw new Error('DOMISTIKA_SDK_SPIRO_DRAW_FAILED');
  emit('sdk-spiro', { preset: name || api.state?.preset || null, x: point.x, y: point.y, space });
  return true;
}

function kineticRuntime() {
  return window.domistikaKineticExpansionV0914 || window.domistikaKineticRuntime || window.domistikaKineticRotationV0912 || null;
}

function motionSummary() {
  const runtime = kineticRuntime();
  const rotation = window.domistikaKineticRotationV0912;
  return Object.freeze({
    available: Boolean(runtime || rotation),
    visible: Boolean(runtime?.state?.visible ?? rotation?.state?.visible),
    playing: Boolean(runtime?.state?.playing ?? rotation?.state?.playing),
    rotationVersion: rotation?.version || null,
    expansionVersion: window.domistikaKineticExpansionV0914?.version || null,
    composerVersion: window.domistikaKineticComposerV0916?.version || null,
    performanceVersion: window.domistikaVisualPerformanceV0918?.version || null,
  });
}

function motionPlay(preset = null) {
  const requested = preset == null ? null : String(preset).trim().toLowerCase();
  const runtime = window.domistikaKineticExpansionV0914 || window.domistikaKineticRuntime;
  const rotation = window.domistikaKineticRotationV0912;
  const composer = window.domistikaKineticComposerV0916;
  const performance = window.domistikaVisualPerformanceV0918;

  if (requested && VISUAL_SCENES.has(requested)) {
    if (!performance?.applyScene) throw new Error('DOMISTIKA_SDK_VISUAL_PERFORMANCE_UNAVAILABLE');
    performance.applyScene(requested);
  } else if (requested && COMPOSER_PRESETS.has(requested)) {
    if (!composer?.composerPreset) throw new Error('DOMISTIKA_SDK_COMPOSER_UNAVAILABLE');
    composer.composerPreset(requested);
    runtime?.play?.();
  } else if (requested) {
    const normalizedPreset = requested === 'portal-369' ? 'portal' : requested;
    if (!MOTION_PRESETS.has(requested) && !MOTION_PRESETS.has(normalizedPreset)) {
      throw new Error('DOMISTIKA_SDK_MOTION_PRESET_INVALID');
    }
    if (runtime?.applyPreset) {
      runtime.applyPreset(normalizedPreset);
      runtime.play?.();
    } else if (normalizedPreset === 'portal' && rotation?.portalPreset) {
      rotation.portalPreset();
      rotation.play?.();
    } else {
      throw new Error('DOMISTIKA_SDK_MOTION_PRESET_UNAVAILABLE');
    }
  } else if (runtime?.play) {
    runtime.play();
  } else if (rotation?.play) {
    rotation.play();
  } else {
    throw new Error('DOMISTIKA_SDK_MOTION_UNAVAILABLE');
  }

  emit('sdk-motion', { action: 'play', preset: requested, state: motionSummary() });
  return motionSummary();
}

function motionPause() {
  const runtime = kineticRuntime();
  if (!runtime?.pause) throw new Error('DOMISTIKA_SDK_MOTION_UNAVAILABLE');
  runtime.pause();
  emit('sdk-motion', { action: 'pause', state: motionSummary() });
  return motionSummary();
}

function motionStop() {
  const runtime = kineticRuntime();
  if (!runtime?.stop) throw new Error('DOMISTIKA_SDK_MOTION_UNAVAILABLE');
  runtime.stop();
  emit('sdk-motion', { action: 'stop', state: motionSummary() });
  return motionSummary();
}

function motionScene(name) {
  const performance = window.domistikaVisualPerformanceV0918;
  const scene = String(name || '').trim().toLowerCase();
  if (!VISUAL_SCENES.has(scene)) throw new Error('DOMISTIKA_SDK_VISUAL_SCENE_INVALID');
  if (!performance?.applyScene) throw new Error('DOMISTIKA_SDK_VISUAL_PERFORMANCE_UNAVAILABLE');
  performance.applyScene(scene);
  emit('sdk-motion', { action: 'scene', scene, state: motionSummary() });
  return motionSummary();
}

function motionComposer(name) {
  const composer = window.domistikaKineticComposerV0916;
  const preset = String(name || '').trim().toLowerCase();
  if (!COMPOSER_PRESETS.has(preset)) throw new Error('DOMISTIKA_SDK_COMPOSER_PRESET_INVALID');
  if (!composer?.composerPreset) throw new Error('DOMISTIKA_SDK_COMPOSER_UNAVAILABLE');
  composer.composerPreset(preset);
  emit('sdk-motion', { action: 'composer', preset, state: motionSummary() });
  return motionSummary();
}

function motionRecorderRuntime(source = 'auto') {
  const requested = String(source || 'auto').trim().toLowerCase();
  const runtimes = {
    visual: window.domistikaVisualPerformanceV0918 || null,
    composer: window.domistikaKineticComposerV0916 || null,
    kinetic: window.domistikaKineticExpansionV0914 || null,
  };

  if (requested === 'auto') {
    return runtimes.visual || runtimes.composer || runtimes.kinetic;
  }
  if (!(requested in runtimes)) throw new Error('DOMISTIKA_SDK_MOTION_RECORDING_SOURCE_INVALID');
  return runtimes[requested];
}

function motionRecordStart(options = {}) {
  const source = typeof options === 'string' ? options : options?.source || 'auto';
  const runtime = motionRecorderRuntime(source);
  if (!runtime?.startRecording) throw new Error('DOMISTIKA_SDK_MOTION_RECORDING_UNAVAILABLE');
  runtime.startRecording();
  emit('sdk-motion', { action: 'record-start', source: String(source) });
  return true;
}

function motionRecordStop(options = {}) {
  const source = typeof options === 'string' ? options : options?.source || 'auto';
  const runtime = motionRecorderRuntime(source);
  if (!runtime?.stopRecording) throw new Error('DOMISTIKA_SDK_MOTION_RECORDING_UNAVAILABLE');
  runtime.stopRecording();
  emit('sdk-motion', { action: 'record-stop', source: String(source) });
  return true;
}

function motionClipRuntime() {
  return window.domistikaMotionClipsV0922 || null;
}

function motionClipList() {
  const runtime = motionClipRuntime();
  if (!runtime?.list) return Object.freeze([]);
  return runtime.list();
}

function motionClipLatest() {
  return motionClipRuntime()?.latest?.() || null;
}

async function motionClipUrl(id) {
  const runtime = motionClipRuntime();
  if (!runtime?.playbackUrl) throw new Error('DOMISTIKA_SDK_MOTION_CLIPS_UNAVAILABLE');
  return runtime.playbackUrl(id);
}

async function motionClipDownload(id, filename = null) {
  const runtime = motionClipRuntime();
  if (!runtime?.download) throw new Error('DOMISTIKA_SDK_MOTION_CLIPS_UNAVAILABLE');
  return runtime.download(id, filename);
}

async function motionClipRemove(id, options = {}) {
  const runtime = motionClipRuntime();
  if (!runtime?.remove) throw new Error('DOMISTIKA_SDK_MOTION_CLIPS_UNAVAILABLE');
  return runtime.remove(id, options);
}

async function serializeProject({ embedMotion = true } = {}) {
  const engine = requireEngine();
  let project = engine.serialize();
  project.name = projectName();
  const runtime = motionClipRuntime();
  if (embedMotion && runtime?.embedProject) project = await runtime.embedProject(project);
  emit('sdk-project', {
    action: 'serialize',
    embedMotion: Boolean(embedMotion),
    motionClips: Array.isArray(project?.motionClips?.items) ? project.motionClips.items.length : 0,
  });
  return project;
}
async function restoreProject(project) {
  if (!project || typeof project !== 'object') throw new Error('DOMISTIKA_SDK_PROJECT_REQUIRED');
  const engine = requireEngine();
  await engine.restore(project);
  const input = document.querySelector('#projectName');
  if (input) {
    input.value = String(project.name || 'Restored Domistika');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  window.domistikaNavigation?.fit?.();
  emit('sdk-project', {
    action: 'restore',
    motionClips: Array.isArray(project?.motionClips?.items) ? project.motionClips.items.length : 0,
  });
  return canvasInfo();
}

function playgroundRuntime() {
  return window.domistikaPlaygroundV0927 || null;
}

function playgroundRun(options = {}) {
  const runtime = playgroundRuntime();
  if (!runtime?.run) throw new Error('DOMISTIKA_SDK_PLAYGROUND_UNAVAILABLE');
  return runtime.run(options);
}

function playgroundReturn() {
  const runtime = playgroundRuntime();
  if (!runtime?.restorePrevious) throw new Error('DOMISTIKA_SDK_PLAYGROUND_UNAVAILABLE');
  return runtime.restorePrevious();
}

function playgroundState() {
  const runtime = playgroundRuntime();
  return runtime?.state?.() || Object.freeze({ available: false, running: false, canRestore: false });
}


function symmetryRecipeRuntime() {
  return window.domistikaSymmetryRecipesV0932 || null;
}

function symmetryRecipeList() {
  return symmetryRecipeRuntime()?.list?.() || Object.freeze([]);
}

function symmetryRecipeApply(id) {
  const runtime = symmetryRecipeRuntime();
  if (!runtime?.apply) throw new Error('DOMISTIKA_SDK_SYMMETRY_RECIPES_UNAVAILABLE');
  return runtime.apply(id);
}

function symmetryRecipeApplyFormula(formula, label = 'Custom') {
  const runtime = symmetryRecipeRuntime();
  if (!runtime?.applyFormula) throw new Error('DOMISTIKA_SDK_SYMMETRY_RECIPES_UNAVAILABLE');
  return runtime.applyFormula(formula, label);
}

function symmetryRecipeActive() {
  return symmetryRecipeRuntime()?.active?.() || null;
}

function compositionPlateRuntime() {
  return window.domistikaCompositionPlatesV0935 || null;
}

function compositionPlateList() {
  return compositionPlateRuntime()?.list?.() || Object.freeze([]);
}

function compositionPlateApply(id) {
  const runtime = compositionPlateRuntime();
  if (!runtime?.apply) throw new Error('DOMISTIKA_SDK_COMPOSITION_PLATES_UNAVAILABLE');
  return runtime.apply(id);
}

function compositionPlateClear() {
  const runtime = compositionPlateRuntime();
  if (!runtime?.clear) throw new Error('DOMISTIKA_SDK_COMPOSITION_PLATES_UNAVAILABLE');
  return runtime.clear();
}

function compositionPlateActive() {
  return compositionPlateRuntime()?.active?.() || null;
}

function compositionPlateRegionAt(point) {
  const runtime = compositionPlateRuntime();
  if (!runtime?.regionAt) throw new Error('DOMISTIKA_SDK_COMPOSITION_PLATES_UNAVAILABLE');
  return runtime.regionAt(point);
}

function recipeArtifactRuntime() {
  return window.domistikaRecipeArtifactsV0933 || null;
}

function recipeArtifactPresets() {
  return recipeArtifactRuntime()?.presets?.() || Object.freeze([]);
}

async function drawRecipeArtifact(options = {}) {
  const runtime = recipeArtifactRuntime();
  if (!runtime?.draw) throw new Error('DOMISTIKA_SDK_RECIPE_ARTIFACTS_UNAVAILABLE');
  return runtime.draw(options, window.Domistika);
}

function artDirectorRuntime() {
  return window.domistikaArtDirectorV0934 || null;
}

function artDirectorProfiles() {
  return artDirectorRuntime()?.profiles?.() || Object.freeze([]);
}

function artDirectorPalettes() {
  return artDirectorRuntime()?.palettes?.() || Object.freeze([]);
}

function planArtDirection(options = {}) {
  const runtime = artDirectorRuntime();
  if (!runtime?.plan) throw new Error('DOMISTIKA_SDK_ART_DIRECTOR_UNAVAILABLE');
  return runtime.plan(options);
}

async function directArt(options = {}) {
  const runtime = artDirectorRuntime();
  if (!runtime?.direct) throw new Error('DOMISTIKA_SDK_ART_DIRECTOR_UNAVAILABLE');
  return runtime.direct(options, window.Domistika);
}

function colorStudioRuntime() {
  return window.domistikaColorStudioV0924 || null;
}

function colorStudioOpen() {
  const runtime = colorStudioRuntime();
  if (!runtime?.open) throw new Error('DOMISTIKA_SDK_COLOR_STUDIO_UNAVAILABLE');
  return runtime.open();
}

function colorStudioSet(value) {
  const runtime = colorStudioRuntime();
  if (!runtime?.set) return setSetting('color', value);
  if (!runtime.set(value)) throw new Error('DOMISTIKA_SDK_COLOR_INVALID');
  return runtime.current();
}

function colorStudioRecent() {
  return colorStudioRuntime()?.recent?.() || Object.freeze([]);
}

function colorStudioHarmony() {
  return colorStudioRuntime()?.harmony?.() || Object.freeze([]);
}

function colorStudioCssColors() {
  return colorStudioRuntime()?.cssColors?.() || Object.freeze([]);
}

function colorStudioGradients() {
  return colorStudioRuntime()?.gradients?.() || Object.freeze([]);
}

function colorStudioApplyGradient(id, options = {}) {
  const runtime = colorStudioRuntime();
  if (!runtime?.applyGradient) throw new Error('DOMISTIKA_SDK_COLOR_STUDIO_UNAVAILABLE');
  return runtime.applyGradient(id, options);
}

function cleanCapture(options = {}) {
  const capture = window.domistikaCleanCaptureV0920;
  if (!capture?.capture) throw new Error('DOMISTIKA_SDK_CLEAN_CAPTURE_UNAVAILABLE');
  return capture.capture(options);
}

async function exportPng({ transparent = false } = {}) {
  const engine = requireEngine();
  const blob = await engine.exportImage('image/png', 0.94, Boolean(transparent));
  emit('sdk-export', { kind: 'png', transparent: Boolean(transparent), bytes: blob?.size || null });
  return blob;
}

function auralithBridgeRuntime() {
  return window.domistikaAuralithBridgeV093 || null;
}

async function transferToAuralith() {
  const bridge = auralithBridgeRuntime();
  if (!bridge?.transfer) throw new Error('DOMISTIKA_SDK_AURALITH_BRIDGE_UNAVAILABLE');
  const result = await bridge.transfer();
  emit('sdk-bridge', {
    action: 'transfer',
    target: 'auralith369',
    version: result?.version || bridge.protocolVersion || null,
    overlayCount: result?.overlayCount || 0,
    contentHash: result?.contentHash || null,
  });
  return result;
}

function eventName(name) {
  const raw = String(name || '').trim();
  if (!raw) throw new Error('DOMISTIKA_SDK_EVENT_NAME_REQUIRED');
  return raw.startsWith('domistika:') ? raw : `domistika:${raw}`;
}

function on(name, handler, options) {
  if (typeof handler !== 'function') throw new Error('DOMISTIKA_SDK_EVENT_HANDLER_REQUIRED');
  const type = eventName(name);
  window.addEventListener(type, handler, options);
  return () => window.removeEventListener(type, handler, options);
}

function once(name, handler) {
  return on(name, handler, { once: true });
}

const commandMap = new Map();
const commandMeta = new Map();

function registerSdkCommand(id, meta, handler) {
  commandMap.set(id, handler);
  commandMeta.set(id, Object.freeze({
    id,
    label: String(meta.label || id),
    category: String(meta.category || 'General'),
    description: String(meta.description || ''),
    keywords: Object.freeze([...(meta.keywords || [])].map(String)),
    shortcut: meta.shortcut ? String(meta.shortcut) : null,
  }));
}

registerSdkCommand('undo', {
  label: 'Undo',
  category: 'Canvas',
  description: 'Undo the last canvas operation.',
  keywords: ['back', 'history'],
  shortcut: 'Ctrl/Cmd+Z',
}, async () => requireEngine().undo());

registerSdkCommand('redo', {
  label: 'Redo',
  category: 'Canvas',
  description: 'Redo the last undone canvas operation.',
  keywords: ['forward', 'history'],
  shortcut: 'Ctrl/Cmd+Shift+Z',
}, async () => requireEngine().redo());

registerSdkCommand('canvas.fit', {
  label: 'Fit Canvas',
  category: 'Canvas',
  description: 'Fit the artwork into the current viewport.',
  keywords: ['zoom', 'center', 'viewport'],
  shortcut: '0',
}, async () => window.domistikaNavigation?.fit?.());

registerSdkCommand('layer.clear', {
  label: 'Clear Active Layer',
  category: 'Layers',
  description: 'Clear the active paint layer.',
  keywords: ['erase', 'empty', 'layer'],
}, async ({ id } = {}) => layerClear(id || requireEngine().activeLayerId));
registerSdkCommand('layer.role.paint', {
  label: 'Layer Role · Paint',
  category: 'Layers',
  description: 'Mark the active layer as normal paint.',
  keywords: ['layer', 'role', 'paint', 'motion'],
}, async () => layerRole(requireEngine().activeLayerId, 'paint'));

registerSdkCommand('layer.role.type', {
  label: 'Layer Role · Type',
  category: 'Layers',
  description: 'Mark the active layer as type/text content.',
  keywords: ['layer', 'role', 'type', 'text', 'title'],
}, async () => layerRole(requireEngine().activeLayerId, 'type'));

registerSdkCommand('layer.role.motion-ignore', {
  label: 'Exclude Active Layer from Motion · Legacy Alias',
  category: 'Layers',
  description: 'Compatibility alias. Sets motionPolicy=ignore without replacing the semantic layer role.',
  keywords: ['layer', 'legacy', 'motion', 'ignore', 'static', 'title'],
}, async () => layerMotionPolicy(requireEngine().activeLayerId, 'ignore'));

registerSdkCommand('layer.motion.ignore', {
  label: 'Layer Motion · Ignore',
  category: 'Layers',
  description: 'Keep the active layer static while preserving its semantic role.',
  keywords: ['layer', 'motion', 'ignore', 'static', 'title'],
}, async () => layerMotionPolicy(requireEngine().activeLayerId, 'ignore'));

registerSdkCommand('layer.motion.animate', {
  label: 'Layer Motion · Animate',
  category: 'Layers',
  description: 'Explicitly include the active layer in Kinetic Motion.',
  keywords: ['layer', 'motion', 'animate', 'include'],
}, async () => layerMotionPolicy(requireEngine().activeLayerId, 'animate'));

registerSdkCommand('layer.motion.inherit', {
  label: 'Layer Motion · Inherit',
  category: 'Layers',
  description: 'Return the active layer to the default motion policy.',
  keywords: ['layer', 'motion', 'inherit', 'default'],
}, async () => layerMotionPolicy(requireEngine().activeLayerId, 'inherit'));


for (const [tool, label, shortcut] of [
  ['pencil', 'Pencil', 'B'],
  ['ink', 'Ink', 'I'],
  ['marker', 'Marker', 'M'],
  ['airbrush', 'Airbrush', 'A'],
  ['eraser', 'Eraser', 'E'],
]) {
  registerSdkCommand(`tool.${tool}`, {
    label: `Select ${label}`,
    category: 'Tools',
    description: `Switch the active drawing tool to ${label}.`,
    keywords: ['brush', 'draw', tool],
    shortcut,
  }, async () => setTool(tool));
}

for (const [preset, label] of [
  ['portal-bloom', 'Portal Bloom'],
  ['counterspin-flower', 'Counterspin Flower'],
  ['gear-halo', 'Gear Halo'],
  ['fracture-iris', 'Fracture Iris'],
]) {
  registerSdkCommand(`art.recipe.${preset}`, {
    label: `Create Recipe Artifact · ${label}`,
    category: 'Art',
    description: `Create the ${label} recipe artifact on a fresh canvas.`,
    keywords: ['art', 'recipe', 'symmetry', 'artifact', preset],
  }, async ({ name = label, freshCanvas = true } = {}) => drawRecipeArtifact({
    preset,
    name,
    freshCanvas: freshCanvas !== false,
  }));
}

registerSdkCommand('art.direct', {
  label: 'Direct an Artwork',
  category: 'Art',
  description: 'Compile a high-level visual intent into a symmetry recipe, palette, and bounded stroke program, then render it.',
  keywords: ['art', 'director', 'intent', 'mood', 'symmetry', 'palette', 'agent'],
}, async (options = {}) => directArt(options));

registerSdkCommand('playground.run', {
  label: 'Playground · Demo the Studio',
  category: 'Rooms',
  description: 'Build a demo canvas, place a Spiro form, run 3·6·9 Portal, and record a short motion clip.',
  keywords: ['playground', 'demo', 'tour', 'spiro', 'portal', 'record', 'first run'],
}, async () => playgroundRun());

registerSdkCommand('playground.return', {
  label: 'Playground · Return to Previous Artwork',
  category: 'Rooms',
  description: 'Restore the artwork that was open before the Playground demo.',
  keywords: ['playground', 'restore', 'return', 'previous artwork'],
}, async () => playgroundReturn());

registerSdkCommand('bridge.auralith.transfer', {
  label: 'Send to Auralith',
  category: 'Bridge',
  description: 'Create a hash-bound Creative Bridge v2 package with protected semantic overlays and open Auralith369.',
  keywords: ['auralith', 'bridge', 'transfer', 'finish', 'type', 'semantic overlay'],
}, async () => transferToAuralith());

registerSdkCommand('room.colors', {
  label: 'Open Color Studio',
  category: 'Rooms',
  description: 'Open exact color controls, harmonies, favorites, and gradients.',
  keywords: ['color', 'colour', 'hex', 'rgb', 'hsl', 'css', 'gradient', 'palette', 'wheel'],
}, async () => colorStudioOpen());

registerSdkCommand('room.spiro', {
  label: 'Open Spiro Lab',
  category: 'Rooms',
  description: 'Open the generative Spiro Lab.',
  keywords: ['spirograph', 'generative', 'curves', 'flower', 'gear'],
}, async () => {
  const api = window.domistikaSpiroV07;
  if (!api?.activatePanel) throw new Error('DOMISTIKA_SDK_SPIRO_UNAVAILABLE');
  api.activatePanel('spiroPanel');
  return true;
});

registerSdkCommand('room.motion', {
  label: 'Open Motion Studio',
  category: 'Rooms',
  description: 'Open the non-destructive Kinetic Motion workspace.',
  keywords: ['kinetic', 'animate', 'rotation', 'composer', 'mind melt'],
}, async () => {
  const button = document.querySelector('#kineticOpen');
  if (!button) throw new Error('DOMISTIKA_SDK_MOTION_ROOM_UNAVAILABLE');
  button.click();
  return true;
});

registerSdkCommand('room.gallery', {
  label: 'Open Gallery',
  category: 'Rooms',
  description: 'Open the local Domistika Art Gallery.',
  keywords: ['art', 'saved', 'motion clip', 'house'],
}, async () => {
  const gallery = window.domistikaGalleryV093;
  if (!gallery?.open) throw new Error('DOMISTIKA_SDK_GALLERY_UNAVAILABLE');
  gallery.open();
  return true;
});

registerSdkCommand('room.creature', {
  label: 'Open Creature Lab',
  category: 'Rooms',
  description: 'Open Creature Lab for mirrored and multiplied characters.',
  keywords: ['character', 'mask', 'crowd', 'mirror'],
}, async () => {
  const button = document.querySelector('#creatureLabToggle');
  if (!button) throw new Error('DOMISTIKA_SDK_CREATURE_UNAVAILABLE');
  button.click();
  return true;
});

registerSdkCommand('motion.play', {
  label: 'Play Motion',
  category: 'Motion',
  description: 'Play the current Motion setup.',
  keywords: ['kinetic', 'animate', 'start'],
}, async ({ preset } = {}) => motionPlay(preset));

registerSdkCommand('motion.stop', {
  label: 'Stop Motion',
  category: 'Motion',
  description: 'Stop Motion and return to the untouched artwork.',
  keywords: ['kinetic', 'restore', 'still'],
}, async () => motionStop());

for (const [id, preset, label] of [
  ['motion.portal', 'portal-369', 'Play 3·6·9 Portal'],
  ['motion.hypnosis', 'hypnosis', 'Play Hypnosis'],
  ['motion.slow-drift', 'slow-drift', 'Play Slow Drift'],
  ['motion.chaos', 'chaos', 'Play Chaos'],
]) {
  registerSdkCommand(id, {
    label,
    category: 'Motion',
    description: `Load and play the ${label.replace(/^Play /, '')} preset.`,
    keywords: ['kinetic', 'preset', 'animate'],
  }, async () => motionPlay(preset));
}

registerSdkCommand('motion.composer.ghost-mandala', {
  label: 'Composer · Ghost Mandala',
  category: 'Motion',
  description: 'Load the Ghost Mandala Composer preset.',
  keywords: ['trails', 'kaleido', 'composer', 'mandala'],
}, async () => motionComposer('ghost-mandala'));

registerSdkCommand('motion.scene.particle-portal', {
  label: 'Visual Scene · Particle Portal',
  category: 'Motion',
  description: 'Load the Particle Portal Visual Performance scene.',
  keywords: ['particles', 'portal', 'visual performance'],
}, async () => motionScene('particle-portal'));

registerSdkCommand('motion.record.start', {
  label: 'Record Motion Clip',
  category: 'Motion',
  description: 'Start recording the current Motion performance.',
  keywords: ['webm', 'capture', 'video', 'clip'],
}, async () => motionRecordStart());

registerSdkCommand('motion.record.stop', {
  label: 'Stop Motion Recording',
  category: 'Motion',
  description: 'Stop the active Motion recording and save its clip.',
  keywords: ['webm', 'capture', 'video', 'clip'],
}, async () => motionRecordStop());

registerSdkCommand('motion.clip.download-latest', {
  label: 'Download Latest Motion Clip',
  category: 'Motion',
  description: 'Download the newest project motion clip as WebM.',
  keywords: ['webm', 'video', 'latest', 'export'],
}, async () => {
  const latestClip = motionClipLatest();
  if (!latestClip) throw new Error('DOMISTIKA_SDK_MOTION_CLIP_NOT_FOUND');
  return motionClipDownload(latestClip.id);
});

registerSdkCommand('export.png', {
  label: 'Export PNG Blob',
  category: 'Export',
  description: 'Create a PNG blob from the visible artwork.',
  keywords: ['image', 'save', 'png'],
}, async (args = {}) => exportPng(args));

registerSdkCommand('ui.export', {
  label: 'Open Export',
  category: 'Export',
  description: 'Open the artwork export dialog.',
  keywords: ['png', 'jpeg', 'download'],
}, async () => {
  const button = document.querySelector('#exportImage');
  if (!button) throw new Error('DOMISTIKA_SDK_EXPORT_UI_UNAVAILABLE');
  button.click();
  return true;
});

registerSdkCommand('ui.new-canvas', {
  label: 'New Canvas',
  category: 'Canvas',
  description: 'Open the New Canvas dialog.',
  keywords: ['new', 'project', 'size'],
}, async () => {
  const button = document.querySelector('#newProject');
  if (!button) throw new Error('DOMISTIKA_SDK_NEW_CANVAS_UI_UNAVAILABLE');
  button.click();
  return true;
});

registerSdkCommand('ui.shortcuts', {
  label: 'Keyboard Shortcuts',
  category: 'Help',
  description: 'Open the keyboard shortcut reference.',
  keywords: ['keys', 'help', 'controls'],
}, async () => {
  const button = document.querySelector('#shortcutsButton');
  if (!button) throw new Error('DOMISTIKA_SDK_SHORTCUTS_UI_UNAVAILABLE');
  button.click();
  return true;
});

function commandList() {
  return Object.freeze([...commandMap.keys()]);
}

function commandCatalog() {
  return Object.freeze([...commandMeta.values()].map((entry) => Object.freeze({
    ...entry,
    keywords: Object.freeze([...entry.keywords]),
  })));
}

function commandSearch(query = '', limit = 32) {
  const raw = String(query || '').trim().toLowerCase();
  const max = Math.max(1, Math.min(100, Math.round(Number(limit) || 32)));
  const catalog = commandCatalog();
  if (!raw) return Object.freeze(catalog.slice(0, max));

  const tokens = raw.split(/\s+/).filter(Boolean);
  const score = (command) => {
    const id = String(command.id || '').toLowerCase();
    const label = String(command.label || '').toLowerCase();
    const category = String(command.category || '').toLowerCase();
    const description = String(command.description || '').toLowerCase();
    const keywords = (command.keywords || []).map((value) => String(value).toLowerCase());
    const haystack = [id, label, category, description, ...keywords, command.shortcut || ''].join(' ').toLowerCase();

    if (label === raw) return 120;
    if (id === raw) return 115;
    if (label.startsWith(raw)) return 100;
    if (id.startsWith(raw)) return 94;
    if (keywords.some((keyword) => keyword === raw)) return 90;
    if (keywords.some((keyword) => keyword.startsWith(raw))) return 82;
    if (label.includes(raw)) return 76;
    if (id.includes(raw)) return 70;
    if (category.includes(raw)) return 55;
    if (description.includes(raw)) return 46;
    if (tokens.length > 1 && tokens.every((token) => haystack.includes(token))) return 36 + tokens.length;
    return 0;
  };

  return Object.freeze(
    catalog
      .map((command, index) => ({ command, index, score: score(command) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score
        || String(a.command.category).localeCompare(String(b.command.category))
        || a.index - b.index)
      .slice(0, max)
      .map((entry) => entry.command),
  );
}

async function commandExecute(name, args = {}) {
  const key = String(name || '').trim();
  const command = commandMap.get(key);
  if (!command) throw new Error('DOMISTIKA_SDK_COMMAND_UNKNOWN');
  const result = await command(args);
  emit('sdk-command', { command: key });
  return result;
}

function capabilities() {
  const engine = currentEngine();
  const spiro = spiroApi();
  return Object.freeze({
    schema: SCHEMA,
    sdkVersion: SDK_VERSION,
    appVersion: APP_VERSION,
    ready: Boolean(engine),
    tools: liveToolIds(),
    drawTools: Object.freeze([...DRAW_TOOLS]),
    commands: commandList(),
    commandCatalog: commandCatalog(),
    layerRoles: Object.freeze(['paint', 'guide', 'type']),
    motionPolicies: Object.freeze(['inherit', 'animate', 'ignore']),
    playground: playgroundState(),
    symmetryRecipes: Object.freeze({
      available: Boolean(symmetryRecipeRuntime()?.apply),
      version: symmetryRecipeRuntime()?.version || null,
      schema: symmetryRecipeRuntime()?.schema || null,
      presets: Object.freeze(symmetryRecipeList().map((recipe) => recipe.id)),
      active: symmetryRecipeActive(),
    }),
    compositionPlates: Object.freeze({
      available: Boolean(compositionPlateRuntime()?.apply),
      version: compositionPlateRuntime()?.version || null,
      schema: compositionPlateRuntime()?.schema || null,
      plates: Object.freeze(compositionPlateList().map((plate) => plate.id)),
      active: compositionPlateActive(),
    }),
    art: Object.freeze({
      available: Boolean(recipeArtifactRuntime()?.draw),
      version: recipeArtifactRuntime()?.version || null,
      schema: recipeArtifactRuntime()?.schema || null,
      recipeArtifact: Boolean(recipeArtifactRuntime()?.draw),
      presets: Object.freeze(recipeArtifactPresets().map((preset) => preset.id)),
      director: Object.freeze({
        available: Boolean(artDirectorRuntime()?.direct),
        version: artDirectorRuntime()?.version || null,
        schema: artDirectorRuntime()?.schema || null,
        profiles: Object.freeze(artDirectorProfiles().map((profile) => profile.id)),
        palettes: Object.freeze(artDirectorPalettes().map((palette) => palette.id)),
      }),
    }),
    spiro: Object.freeze({
      available: Boolean(spiro),
      version: spiro?.version || '0.7',
      presets: spiroPresets(),
    }),
    colors: Object.freeze({
      available: Boolean(colorStudioRuntime()?.open),
      version: colorStudioRuntime()?.version || null,
      schema: colorStudioRuntime()?.schema || null,
      current: engine?.settings?.color || null,
      gradients: colorStudioGradients().length,
    }),
    motion: Object.freeze({
      ...motionSummary(),
      presets: Object.freeze([...MOTION_PRESETS]),
      composerPresets: Object.freeze([...COMPOSER_PRESETS]),
      visualScenes: Object.freeze([...VISUAL_SCENES]),
      clips: Object.freeze({
        available: Boolean(motionClipRuntime()?.list),
        version: motionClipRuntime()?.version || null,
        schema: motionClipRuntime()?.schema || null,
        count: motionClipList().length,
      }),
    }),
    capture: Object.freeze({
      available: Boolean(window.domistikaCleanCaptureV0920?.capture),
      version: window.domistikaCleanCaptureV0920?.version || null,
      schema: window.domistikaCleanCaptureV0920?.schema || null,
    }),
    bridge: Object.freeze({
      auralith: Object.freeze({
        available: Boolean(auralithBridgeRuntime()?.transfer),
        protocol: 'parallax-creative-bridge',
        version: auralithBridgeRuntime()?.protocolVersion || 2,
        semanticOverlays: true,
        maxOverlays: 16,
      }),
    }),
  });
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;

  const api = {
    schema: SCHEMA,
    sdkVersion: SDK_VERSION,
    appVersion: APP_VERSION,
    ready: () => Boolean(currentEngine()),
    capabilities,

    setTool,
    color: (value) => value == null ? requireEngine().settings.color : colorStudioSet(value),
    stroke,

    canvas: {
      info: canvasInfo,
      new: newCanvas,
      fit: () => window.domistikaNavigation?.fit?.(),
      undo: () => requireEngine().undo(),
      redo: () => requireEngine().redo(),
    },

    tool: {
      get: () => requireEngine().tool,
      set: setTool,
      list: liveToolIds,
    },

    brush: {
      color: (value) => value == null ? requireEngine().settings.color : colorStudioSet(value),
      size: (value) => value == null ? requireEngine().settings.size : setSetting('size', value),
      opacity: (value) => value == null ? requireEngine().settings.opacity : setSetting('opacity', value),
      smoothing: (value) => value == null ? requireEngine().settings.smoothing : setSetting('smoothing', value),
      symmetry: (value) => value == null ? requireEngine().settings.symmetry : setSetting('symmetry', value),
    },

    symmetryRecipes: {
      list: symmetryRecipeList,
      apply: symmetryRecipeApply,
      applyFormula: symmetryRecipeApplyFormula,
      active: symmetryRecipeActive,
    },

    compositionPlates: {
      list: compositionPlateList,
      apply: compositionPlateApply,
      clear: compositionPlateClear,
      active: compositionPlateActive,
      regionAt: compositionPlateRegionAt,
    },

    art: {
      presets: recipeArtifactPresets,
      drawRecipeArtifact,
      profiles: artDirectorProfiles,
      palettes: artDirectorPalettes,
      plan: planArtDirection,
      direct: directArt,
    },

    colors: {
      open: colorStudioOpen,
      current: () => requireEngine().settings.color,
      set: colorStudioSet,
      recent: colorStudioRecent,
      harmony: colorStudioHarmony,
      css: colorStudioCssColors,
      gradients: colorStudioGradients,
      applyGradient: colorStudioApplyGradient,
    },

    layers: {
      list: layerList,
      create: layerCreate,
      activate: layerActivate,
      rename: layerRename,
      visibility: layerVisibility,
      opacity: layerOpacity,
      blend: layerBlend,
      role: layerRole,
      motionPolicy: layerMotionPolicy,
      clear: layerClear,
      roles: () => Object.freeze(['paint', 'guide', 'type']),
      motionPolicies: () => Object.freeze(['inherit', 'animate', 'ignore']),
    },

    spiro: {
      presets: spiroPresets,
      place: spiroPlace,
    },

    motion: {
      state: motionSummary,
      play: motionPlay,
      pause: motionPause,
      stop: motionStop,
      scene: motionScene,
      composer: motionComposer,
      record: {
        start: motionRecordStart,
        stop: motionRecordStop,
      },
      clips: {
        list: motionClipList,
        latest: motionClipLatest,
        url: motionClipUrl,
        download: motionClipDownload,
        remove: motionClipRemove,
      },
    },

    project: {
      serialize: serializeProject,
      restore: restoreProject,
    },

    playground: {
      run: playgroundRun,
      restorePrevious: playgroundReturn,
      state: playgroundState,
    },

    export: {
      png: exportPng,
      capture: cleanCapture,
    },

    bridge: {
      auralith: {
        transfer: transferToAuralith,
      },
    },

    events: {
      on,
      once,
      off(name, handler, options) {
        window.removeEventListener(eventName(name), handler, options);
      },
    },

    commands: {
      list: commandList,
      catalog: commandCatalog,
      search: commandSearch,
      execute: commandExecute,
    },
  };

  window.Domistika = deepFreeze(api);

  emit('sdk-ready', {
    schema: SCHEMA,
    sdkVersion: SDK_VERSION,
    appVersion: APP_VERSION,
  });
}

export {
  APP_VERSION,
  SDK_VERSION,
  SCHEMA,
  DRAW_TOOLS,
  TOOLS,
  SETTINGS,
  currentEngine,
  liveToolIds,
  normalizePoint,
  stroke,
  commandSearch,
  capabilities,
};
