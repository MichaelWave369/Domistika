const VERSION = '0.9.18';
const INSTALL_FLAG = '__domistikaVisualPerformanceV0918Installed';
const STORAGE_KEY = 'domistika.visual-performance-slots.v0918';

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;

  const state = {
    frameId: 0,
    lastTime: 0,
    elapsed: 0,
    canvas: null,
    particles: { enabled: false, count: 72, speed: 0.34, size: 2.2, glow: 0.72, items: [] },
    breath: { enabled: false, rate: 0.08, hue: 20, saturation: 0.18, brightness: 0.08 },
    beat: { enabled: false, rate: 1, strength: 0.2, smoothing: 0.84, level: 0 },
    fractal: { enabled: false, copies: 5, scale: 0.78, rotation: 8, alpha: 0.6, spin: 1.2, angle: 0 },
    autoplay: { enabled: false, seconds: 12, index: -1, lastSwitch: 0, preferSaved: true },
    recorder: { active: false, mediaRecorder: null, chunks: [], timer: null },
    lastScene: 'ready',
  };

  const BUILTIN_SCENES = ['particle-portal', 'fractal-bloom', 'aurora-breath', 'cosmic-pulse'];
  const SLOT_NAMES = ['A', 'B', 'C', 'D'];
  const $ = (selector) => document.querySelector(selector);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const runtime = () => window.domistikaKineticExpansionV0914 || window.domistikaKineticRuntime || null;
  const motion = () => window.domistikaKineticRotationV0912?.state || null;
  const composer = () => window.domistikaKineticComposerV0916 || null;
  const mindMelt = () => window.domistikaMindMeltV0917 || null;
  const audio = () => window.domistikaKineticAudioV0914 || null;
  const status = (message) => window.__domistikaStatus?.(message);

  function injectStyles() {
    if ($('#visualPerformanceStyles')) return;
    const style = document.createElement('style');
    style.id = 'visualPerformanceStyles';
    style.textContent = `
      .visual-performance-canvas{position:absolute;inset:0;z-index:9;width:100%;height:100%;pointer-events:none}
      .artboard.visual-performance-active #kineticExpansionCanvas,
      .artboard.visual-performance-active #kineticComposerCanvas{visibility:hidden!important}
      .visual-performance{display:grid;gap:10px;padding-top:11px;border-top:1px solid var(--line)}
      .visual-performance h3{margin:0;font-size:12px}.visual-performance p{margin:0;color:var(--muted);font-size:10px;line-height:1.45}
      .visual-performance-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.visual-performance-grid label{display:grid;gap:5px;color:var(--muted);font-size:10px}.visual-performance-grid output{justify-self:end;color:var(--ink)}
      .visual-performance-buttons{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
      .visual-performance-slots{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.visual-performance-slot{display:grid;gap:5px}
      .visual-performance button,.visual-performance select{border:1px solid var(--line);border-radius:9px;background:var(--panel2);color:var(--ink);padding:8px;cursor:pointer}
      .visual-performance button.active{background:rgba(127,90,240,.18);border-color:rgba(127,90,240,.58)}
      .visual-performance button.recording{background:rgba(255,76,108,.16);border-color:rgba(255,76,108,.62);color:#ffadc0}
      .visual-performance-scene{padding:8px;border:1px dashed var(--line);border-radius:9px;color:var(--muted);font-size:10px}
      .visual-performance-warning{padding:8px;border-radius:9px;background:rgba(255,191,105,.08);border:1px solid rgba(255,191,105,.24);color:var(--muted);font-size:10px;line-height:1.45}
      @media(max-width:900px){.visual-performance-grid,.visual-performance-buttons,.visual-performance-slots{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function activeEffects() {
    return state.particles.enabled || state.breath.enabled || state.beat.enabled || state.fractal.enabled;
  }

  function sourceCanvas() {
    const cp = composer();
    const rt = runtime();
    if (cp?.state?.canvas && !cp.state.canvas.hidden && (cp.state.trails.enabled || cp.state.kaleido.enabled)) return cp.state.canvas;
    return rt?.state?.displayCanvas || null;
  }

  function ensureCanvas() {
    const source = sourceCanvas();
    const artboard = $('#artboard');
    const overlay = $('#overlay');
    if (!source || !artboard || !overlay) return false;

    if (!state.canvas?.isConnected) {
      const canvas = document.createElement('canvas');
      canvas.id = 'visualPerformanceCanvas';
      canvas.className = 'visual-performance-canvas';
      canvas.hidden = true;
      artboard.insertBefore(canvas, overlay);
      state.canvas = canvas;
    }

    if (state.canvas.width !== source.width || state.canvas.height !== source.height) {
      state.canvas.width = source.width;
      state.canvas.height = source.height;
      state.canvas.style.width = `${source.width}px`;
      state.canvas.style.height = `${source.height}px`;
      seedParticles(true);
    }
    return true;
  }

  function ensurePlaying() {
    const rt = runtime();
    if (!rt?.state) return false;
    window.domistikaKineticLiveSourceV0915?.refreshNow?.();
    if (!rt.state.visible || !rt.state.playing) rt.play?.();
    return Boolean(rt.state.visible);
  }

  function currentPivot(source) {
    const rt = runtime();
    return rt?.state?.pivot || { x: source.width / 2, y: source.height / 2 };
  }

  function seedParticles(force = false) {
    const canvas = state.canvas || sourceCanvas();
    if (!canvas) return;
    const count = clamp(Math.round(state.particles.count), 12, 180);
    if (!force && state.particles.items.length === count) return;
    state.particles.items = Array.from({ length: count }, (_, index) => ({
      angle: Math.random() * Math.PI * 2,
      radius: Math.pow(Math.random(), 0.62) * Math.hypot(canvas.width, canvas.height) * 0.48,
      depth: 0.25 + Math.random() * 0.95,
      direction: index % 2 ? 1 : -1,
      wobble: Math.random() * Math.PI * 2,
      twinkle: Math.random() * Math.PI * 2,
      size: 0.55 + Math.random() * 1.45,
    }));
  }

  function readBeatLevel() {
    let target;
    const api = audio();
    if (api?.connected) {
      const levels = api.levels?.() || { low: 0, mid: 0, high: 0 };
      target = clamp(levels.low * 0.68 + levels.mid * 0.24 + levels.high * 0.08, 0, 1);
    } else {
      const rate = clamp(state.beat.rate, 0.25, 2);
      target = 0.5 + Math.sin(state.elapsed * Math.PI * 2 * rate) * 0.5;
    }
    state.beat.level = state.beat.level * state.beat.smoothing + target * (1 - state.beat.smoothing);
    return state.beat.level;
  }

  function visualFilter() {
    let hue = 0;
    let saturation = 1;
    let brightness = 1;
    if (state.breath.enabled) {
      const wave = Math.sin(state.elapsed * Math.PI * 2 * clamp(state.breath.rate, 0.01, 0.5));
      hue += wave * state.breath.hue;
      saturation += (0.5 + wave * 0.5) * state.breath.saturation;
      brightness += wave * state.breath.brightness;
    }
    if (state.beat.enabled) {
      const beat = readBeatLevel();
      brightness += beat * clamp(state.beat.strength, 0, 0.35);
      saturation += beat * clamp(state.beat.strength * 0.65, 0, 0.25);
    }
    return `hue-rotate(${hue.toFixed(2)}deg) saturate(${Math.max(0.2, saturation).toFixed(3)}) brightness(${Math.max(0.3, brightness).toFixed(3)})`;
  }

  function drawFractal(ctx, source) {
    const pivot = currentPivot(source);
    const copies = clamp(Math.round(state.fractal.copies), 1, 10);
    const scaleStep = clamp(state.fractal.scale, 0.5, 0.94);
    const alphaStep = clamp(state.fractal.alpha, 0.15, 0.85);
    const rotation = state.fractal.rotation * Math.PI / 180;
    const spin = state.fractal.angle * Math.PI / 180;

    ctx.drawImage(source, 0, 0);
    for (let index = 1; index <= copies; index += 1) {
      const scale = Math.pow(scaleStep, index);
      ctx.save();
      ctx.globalAlpha = Math.pow(alphaStep, index);
      ctx.translate(pivot.x, pivot.y);
      ctx.rotate(rotation * index + spin);
      ctx.scale(scale, scale);
      ctx.translate(-pivot.x, -pivot.y);
      ctx.drawImage(source, 0, 0);
      ctx.restore();
    }
  }

  function drawParticles(ctx, source, dt) {
    if (!state.particles.enabled) return;
    seedParticles(false);
    const pivot = currentPivot(source);
    const baseSpeed = clamp(state.particles.speed, 0.02, 1.5);
    const baseSize = clamp(state.particles.size, 0.5, 8);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let index = 0; index < state.particles.items.length; index += 1) {
      const particle = state.particles.items[index];
      particle.angle += dt * baseSpeed * particle.direction * (0.45 + particle.depth);
      particle.wobble += dt * (0.35 + particle.depth * 0.4);
      particle.twinkle += dt * (1.2 + particle.depth);
      const wobble = Math.sin(particle.wobble) * (5 + particle.depth * 9);
      const radius = particle.radius + wobble;
      const x = pivot.x + Math.cos(particle.angle) * radius;
      const y = pivot.y + Math.sin(particle.angle) * radius;
      if (x < -12 || x > source.width + 12 || y < -12 || y > source.height + 12) continue;
      const alpha = clamp(0.22 + (0.5 + Math.sin(particle.twinkle) * 0.5) * state.particles.glow, 0.08, 0.92);
      const hue = (index * 23 + state.elapsed * 22 + particle.depth * 120) % 360;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${hue} 92% 68%)`;
      ctx.beginPath();
      ctx.arc(x, y, baseSize * particle.size * (0.65 + particle.depth * 0.45), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function render(dt = 0) {
    const rt = runtime();
    const artboard = $('#artboard');
    if (!rt?.state?.visible || !activeEffects() || !ensureCanvas()) {
      if (state.canvas) state.canvas.hidden = true;
      artboard?.classList.remove('visual-performance-active');
      return;
    }

    const source = sourceCanvas();
    if (!source) return;
    const ctx = state.canvas.getContext('2d');
    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    ctx.save();
    ctx.filter = visualFilter();
    if (state.fractal.enabled) drawFractal(ctx, source);
    else ctx.drawImage(source, 0, 0);
    ctx.restore();

    if (state.beat.enabled) {
      const beat = state.beat.level;
      const pivot = currentPivot(source);
      const radius = Math.hypot(source.width, source.height) * 0.55;
      const gradient = ctx.createRadialGradient(pivot.x, pivot.y, 0, pivot.x, pivot.y, radius);
      const glowAlpha = clamp(beat * state.beat.strength * 0.22, 0, 0.08);
      gradient.addColorStop(0, `rgba(255,255,255,${glowAlpha})`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, source.width, source.height);
    }

    drawParticles(ctx, source, dt);
    state.canvas.hidden = false;
    artboard?.classList.add('visual-performance-active');
  }

  function frame(now) {
    const dt = state.lastTime ? Math.min(0.05, (now - state.lastTime) / 1000) : 0;
    state.lastTime = now;
    state.elapsed += dt;
    const rt = runtime();
    if (state.fractal.enabled && rt?.state?.playing) state.fractal.angle += state.fractal.spin * dt;
    updateAutoplay(now);
    render(dt);
    state.frameId = requestAnimationFrame(frame);
  }

  function syncOutput(id, value) {
    const input = $(`#${id}`);
    if (input) input.value = String(value);
    const output = document.querySelector(`[data-visual-performance-output="${id}"]`);
    if (output) output.textContent = `${value}${input?.dataset.suffix || ''}`;
  }

  function syncUnderlyingUi() {
    const base = motion();
    const rt = runtime();
    const cp = composer();
    if (base) {
      const pairs = {
        kineticMode: base.mode,
        kineticOuterSpeed: base.speeds.outer,
        kineticMiddleSpeed: base.speeds.middle,
        kineticCenterSpeed: base.speeds.center,
        kineticInnerRadius: base.innerRadius,
        kineticMiddleRadius: base.middleRadius,
        kineticPulse: base.pulse,
        kineticPulseRate: base.pulseRate,
        kineticHueSpeed: base.hueSpeed,
      };
      for (const [id, value] of Object.entries(pairs)) {
        const input = $(`#${id}`);
        if (input) input.value = String(value);
      }
      document.querySelectorAll('[data-kinetic-output]').forEach((output) => {
        const input = $(`#${output.dataset.kineticOutput}`);
        if (input) output.textContent = `${input.value}${input.dataset.suffix || ''}`;
      });
    }
    if (rt?.state) {
      const tunnel = $('#kineticTunnelEnabled');
      if (tunnel) tunnel.checked = rt.state.tunnel.enabled;
      const advancedMode = $('#kineticAdvancedMode');
      if (advancedMode) advancedMode.value = rt.state.sourceMode;
      const map = {
        kineticTunnelEchoes: rt.state.tunnel.echoes,
        kineticTunnelScale: rt.state.tunnel.scale,
        kineticTunnelRotation: rt.state.tunnel.rotation,
        kineticTunnelFade: rt.state.tunnel.fade,
        kineticAudioSensitivity: rt.state.audioSensitivity,
      };
      for (const [id, value] of Object.entries(map)) {
        const input = $(`#${id}`);
        if (!input) continue;
        input.value = String(value);
        const output = document.querySelector(`[data-kinetic-plus-output="${id}"]`);
        if (output) output.textContent = `${input.value}${input.dataset.suffix || ''}`;
      }
    }
    if (cp?.state) {
      const checks = {
        kineticTrailsEnabled: cp.state.trails.enabled,
        kineticKaleidoEnabled: cp.state.kaleido.enabled,
        kineticKaleidoMirror: cp.state.kaleido.mirror,
        kineticOrbitEnabled: cp.state.orbit.enabled,
        kineticSequenceEnabled: cp.state.sequencer.enabled,
      };
      for (const [id, checked] of Object.entries(checks)) {
        const input = $(`#${id}`);
        if (input) input.checked = Boolean(checked);
      }
      const values = {
        kineticTrailMemory: cp.state.trails.memory,
        kineticTrailMix: cp.state.trails.mix,
        kineticKaleidoSlices: cp.state.kaleido.slices,
        kineticKaleidoSpin: cp.state.kaleido.spin,
        kineticOrbitRadiusX: cp.state.orbit.radiusX,
        kineticOrbitRadiusY: cp.state.orbit.radiusY,
        kineticOrbitSpeed: cp.state.orbit.speed,
      };
      for (const [id, value] of Object.entries(values)) {
        const input = $(`#${id}`);
        if (!input) continue;
        input.value = String(value);
        const output = document.querySelector(`[data-kinetic-composer-output="${id}"]`);
        if (output) output.textContent = `${input.value}${input.dataset.suffix || ''}`;
      }
      if ($('#kineticOrbitMode')) $('#kineticOrbitMode').value = cp.state.orbit.mode;
    }
  }

  function syncUi() {
    const checks = {
      visualParticlesEnabled: state.particles.enabled,
      visualBreathEnabled: state.breath.enabled,
      visualBeatEnabled: state.beat.enabled,
      visualFractalEnabled: state.fractal.enabled,
      visualAutoplayEnabled: state.autoplay.enabled,
      visualAutoplaySaved: state.autoplay.preferSaved,
    };
    for (const [id, checked] of Object.entries(checks)) {
      const input = $(`#${id}`);
      if (input) input.checked = Boolean(checked);
    }
    syncOutput('visualParticleCount', state.particles.count);
    syncOutput('visualParticleSpeed', state.particles.speed);
    syncOutput('visualParticleSize', state.particles.size);
    syncOutput('visualBreathRate', state.breath.rate);
    syncOutput('visualBreathHue', state.breath.hue);
    syncOutput('visualBeatRate', state.beat.rate);
    syncOutput('visualBeatStrength', state.beat.strength);
    syncOutput('visualFractalCopies', state.fractal.copies);
    syncOutput('visualFractalScale', state.fractal.scale);
    syncOutput('visualFractalRotation', state.fractal.rotation);
    syncOutput('visualAutoplaySeconds', state.autoplay.seconds);
    updateSceneReadout();
    updateSlotUi();
  }

  function bindRange(id, setter, { reseed = false } = {}) {
    const input = $(`#${id}`);
    if (!input) return;
    input.addEventListener('input', () => {
      const value = Number(input.value);
      setter(value);
      syncOutput(id, input.value);
      if (reseed) seedParticles(true);
      ensurePlaying();
    });
  }

  function snapshot() {
    const base = motion();
    const rt = runtime();
    const cp = composer();
    return {
      schema: 'domistika.visual-performance.v0918',
      createdAt: new Date().toISOString(),
      motion: base ? {
        mode: base.mode,
        speeds: { ...base.speeds },
        innerRadius: base.innerRadius,
        middleRadius: base.middleRadius,
        pulse: base.pulse,
        pulseRate: base.pulseRate,
        hueSpeed: base.hueSpeed,
      } : null,
      runtime: rt?.state ? {
        sourceMode: rt.state.sourceMode,
        pivot: rt.state.pivot ? { ...rt.state.pivot } : null,
        tunnel: { ...rt.state.tunnel },
        audioSensitivity: rt.state.audioSensitivity,
        visualFilter: rt.state.visualFilter,
      } : null,
      composer: cp?.state ? {
        trails: { ...cp.state.trails },
        kaleido: { ...cp.state.kaleido },
        orbit: {
          enabled: cp.state.orbit.enabled,
          mode: cp.state.orbit.mode,
          radiusX: cp.state.orbit.radiusX,
          radiusY: cp.state.orbit.radiusY,
          speed: cp.state.orbit.speed,
        },
        sequencer: {
          enabled: cp.state.sequencer.enabled,
          cycle: cp.state.sequencer.cycle,
          seconds: cp.state.sequencer.seconds,
          shuffle: cp.state.sequencer.shuffle,
        },
      } : null,
      blackStage: Boolean(mindMelt()?.state?.blackStage),
      visual: {
        particles: { enabled: state.particles.enabled, count: state.particles.count, speed: state.particles.speed, size: state.particles.size, glow: state.particles.glow },
        breath: { ...state.breath },
        beat: { enabled: state.beat.enabled, rate: state.beat.rate, strength: state.beat.strength, smoothing: state.beat.smoothing },
        fractal: { enabled: state.fractal.enabled, copies: state.fractal.copies, scale: state.fractal.scale, rotation: state.fractal.rotation, alpha: state.fractal.alpha, spin: state.fractal.spin },
      },
    };
  }

  function readSlots() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeSlots(slots) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(slots)); } catch {}
  }

  function saveSlot(name) {
    const slots = readSlots();
    slots[name] = snapshot();
    writeSlots(slots);
    updateSlotUi();
    status(`Performance preset ${name} saved locally`);
  }

  function applySnapshot(saved, announce = true) {
    if (!saved || typeof saved !== 'object') return false;
    const base = motion();
    const rt = runtime();
    const cp = composer();
    ensurePlaying();

    if (base && saved.motion) {
      base.mode = saved.motion.mode || base.mode;
      Object.assign(base.speeds, saved.motion.speeds || {});
      for (const key of ['innerRadius', 'middleRadius', 'pulse', 'pulseRate', 'hueSpeed']) {
        if (saved.motion[key] != null) base[key] = saved.motion[key];
      }
    }
    if (rt?.state && saved.runtime) {
      rt.state.sourceMode = saved.runtime.sourceMode || rt.state.sourceMode;
      rt.state.pivot = saved.runtime.pivot ? { ...saved.runtime.pivot } : rt.state.pivot;
      Object.assign(rt.state.tunnel, saved.runtime.tunnel || {});
      if (saved.runtime.audioSensitivity != null) rt.state.audioSensitivity = saved.runtime.audioSensitivity;
      if (saved.runtime.visualFilter != null) rt.state.visualFilter = saved.runtime.visualFilter;
    }
    if (cp?.state && saved.composer) {
      Object.assign(cp.state.trails, saved.composer.trails || {});
      Object.assign(cp.state.kaleido, saved.composer.kaleido || {});
      Object.assign(cp.state.orbit, saved.composer.orbit || {});
      Object.assign(cp.state.sequencer, saved.composer.sequencer || {});
      if (cp.state.orbit.enabled) cp.setOrbitEnabled?.(true);
      else cp.setOrbitEnabled?.(false);
      cp.clearTrails?.();
    }
    mindMelt()?.setBlackStage?.(Boolean(saved.blackStage));
    if (saved.visual) {
      Object.assign(state.particles, saved.visual.particles || {});
      Object.assign(state.breath, saved.visual.breath || {});
      Object.assign(state.beat, saved.visual.beat || {});
      Object.assign(state.fractal, saved.visual.fractal || {});
      state.beat.level = 0;
      seedParticles(true);
    }
    syncUnderlyingUi();
    syncUi();
    rt?.render?.();
    cp?.render?.();
    render(0);
    if (announce) status('Saved performance preset loaded');
    return true;
  }

  function loadSlot(name, announce = true) {
    const saved = readSlots()[name];
    if (!saved) {
      if (announce) status(`Performance preset ${name} is empty`);
      return false;
    }
    const loaded = applySnapshot(saved, false);
    if (loaded && announce) status(`Performance preset ${name} loaded`);
    return loaded;
  }

  function updateSlotUi() {
    const slots = readSlots();
    for (const name of SLOT_NAMES) {
      const load = $(`[data-visual-load-slot="${name}"]`);
      if (load) {
        load.disabled = !slots[name];
        load.textContent = slots[name] ? `Load ${name}` : `${name} empty`;
      }
    }
  }

  function setSceneLabel(label) {
    state.lastScene = label;
    updateSceneReadout();
  }

  function updateSceneReadout() {
    const node = $('#visualPerformanceScene');
    if (node) node.textContent = `${state.autoplay.enabled ? 'AUTO' : 'MANUAL'} · ${state.lastScene}`;
  }

  function applyBuiltinScene(name) {
    const rt = runtime();
    const cp = composer();
    if (!rt?.state || !cp?.state) return;
    ensurePlaying();
    cp.state.sequencer.enabled = false;

    if (name === 'particle-portal') {
      rt.applyPreset?.('portal');
      Object.assign(state.particles, { enabled: true, count: 96, speed: 0.42, size: 2.1, glow: 0.78 });
      Object.assign(state.breath, { enabled: true, rate: 0.055, hue: 10, saturation: 0.12, brightness: 0.04 });
      state.beat.enabled = false;
      state.fractal.enabled = false;
      cp.state.trails.enabled = true;
      Object.assign(cp.state.trails, { memory: 0.82, mix: 0.68 });
    } else if (name === 'fractal-bloom') {
      rt.applyPreset?.('hypnosis');
      Object.assign(state.fractal, { enabled: true, copies: 7, scale: 0.74, rotation: 11, alpha: 0.62, spin: 1.8 });
      Object.assign(state.particles, { enabled: true, count: 58, speed: 0.18, size: 1.6, glow: 0.64 });
      Object.assign(state.breath, { enabled: true, rate: 0.07, hue: 16, saturation: 0.15, brightness: 0.05 });
      state.beat.enabled = false;
    } else if (name === 'aurora-breath') {
      rt.applyPreset?.('slow-drift');
      state.fractal.enabled = false;
      state.beat.enabled = false;
      Object.assign(state.particles, { enabled: true, count: 84, speed: 0.12, size: 2.4, glow: 0.7 });
      Object.assign(state.breath, { enabled: true, rate: 0.045, hue: 34, saturation: 0.28, brightness: 0.08 });
      cp.state.trails.enabled = true;
      Object.assign(cp.state.trails, { memory: 0.9, mix: 0.5 });
    } else if (name === 'cosmic-pulse') {
      rt.applyPreset?.('bass-bloom');
      Object.assign(state.particles, { enabled: true, count: 112, speed: 0.5, size: 1.9, glow: 0.82 });
      Object.assign(state.beat, { enabled: true, rate: 1, strength: 0.22, smoothing: 0.82 });
      Object.assign(state.fractal, { enabled: true, copies: 3, scale: 0.82, rotation: -7, alpha: 0.48, spin: -0.8 });
      Object.assign(state.breath, { enabled: true, rate: 0.09, hue: 12, saturation: 0.12, brightness: 0.04 });
    }
    cp.clearTrails?.();
    seedParticles(true);
    syncUnderlyingUi();
    syncUi();
    cp.render?.();
    rt.render?.();
    setSceneLabel(name.replace(/-/g, ' '));
    status(`${name.replace(/-/g, ' ')} visual scene loaded`);
  }

  function availableAutoplayScenes() {
    if (state.autoplay.preferSaved) {
      const slots = readSlots();
      const names = SLOT_NAMES.filter((name) => Boolean(slots[name]));
      if (names.length) return names.map((name) => ({ kind: 'slot', name }));
    }
    return BUILTIN_SCENES.map((name) => ({ kind: 'builtin', name }));
  }

  function nextAutoplayScene(announce = true) {
    const scenes = availableAutoplayScenes();
    if (!scenes.length) return;
    state.autoplay.index = (state.autoplay.index + 1) % scenes.length;
    const scene = scenes[state.autoplay.index];
    if (scene.kind === 'slot') {
      loadSlot(scene.name, false);
      setSceneLabel(`saved slot ${scene.name}`);
    } else {
      applyBuiltinScene(scene.name);
    }
    state.autoplay.lastSwitch = performance.now();
    if (announce) status(`Performance autoplay: ${state.lastScene}`);
  }

  function updateAutoplay(now) {
    const rt = runtime();
    if (!state.autoplay.enabled || !rt?.state?.playing) return;
    if (!state.autoplay.lastSwitch) state.autoplay.lastSwitch = now;
    if (now - state.autoplay.lastSwitch >= state.autoplay.seconds * 1000) nextAutoplayScene(true);
  }

  function toggleAutoplay(enabled) {
    state.autoplay.enabled = Boolean(enabled);
    state.autoplay.lastSwitch = performance.now();
    state.autoplay.index = -1;
    if (state.autoplay.enabled) {
      ensurePlaying();
      nextAutoplayScene(false);
      status('Visual Performance autoplay started');
    } else {
      status('Visual Performance autoplay stopped');
    }
    syncUi();
  }

  function preferredMimeType() {
    if (!window.MediaRecorder) return '';
    return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find((type) => MediaRecorder.isTypeSupported(type)) || '';
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function syncRecordButton() {
    const button = $('#visualPerformanceRecord');
    if (!button) return;
    button.classList.toggle('recording', state.recorder.active);
    button.textContent = state.recorder.active ? '■ Stop & Export' : '● Record Final Performance';
  }

  function startRecording() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return status('Performance recording is unavailable in this browser');
    if (!activeEffects()) return status('Enable a Visual Performance effect first');
    ensurePlaying();
    render(0);
    if (!state.canvas || state.canvas.hidden || state.recorder.active) return;
    const fps = clamp(Number($('#kineticRecordFps')?.value) || 30, 10, 60);
    const maxSeconds = clamp(Number($('#kineticRecordSeconds')?.value) || 20, 2, 180);
    const mimeType = preferredMimeType();
    const recorder = new MediaRecorder(state.canvas.captureStream(fps), mimeType ? { mimeType } : undefined);
    state.recorder.mediaRecorder = recorder;
    state.recorder.chunks = [];
    recorder.ondataavailable = (event) => { if (event.data?.size) state.recorder.chunks.push(event.data); };
    recorder.onstop = () => {
      clearTimeout(state.recorder.timer);
      state.recorder.timer = null;
      state.recorder.active = false;
      const blob = new Blob(state.recorder.chunks, { type: mimeType || 'video/webm' });
      const name = ($('#projectName')?.value || 'domistika-performance').trim().replace(/[^a-z0-9_-]+/gi, '-');
      downloadBlob(blob, `${name}-visual-performance.webm`);
      syncRecordButton();
      status('Final visual performance video exported');
    };
    recorder.start(250);
    state.recorder.active = true;
    state.recorder.timer = setTimeout(stopRecording, maxSeconds * 1000);
    syncRecordButton();
    status(`Recording final visual performance at ${fps} fps`);
  }

  function stopRecording() {
    if (!state.recorder.active || !state.recorder.mediaRecorder) return;
    clearTimeout(state.recorder.timer);
    state.recorder.timer = null;
    if (state.recorder.mediaRecorder.state !== 'inactive') state.recorder.mediaRecorder.stop();
  }

  function resetVisualLayer() {
    state.particles.enabled = false;
    state.breath.enabled = false;
    state.beat.enabled = false;
    state.fractal.enabled = false;
    state.autoplay.enabled = false;
    state.beat.level = 0;
    $('#artboard')?.classList.remove('visual-performance-active');
    if (state.canvas) state.canvas.hidden = true;
    syncUi();
    status('Visual Performance effects reset — kinetic motion preserved');
  }

  function buildUi() {
    const shell = $('#kineticRotationPanel .kinetic-shell');
    if (!shell || $('#visualPerformanceSection')) return false;
    injectStyles();
    ensureCanvas();

    const section = document.createElement('div');
    section.id = 'visualPerformanceSection';
    section.className = 'visual-performance';
    section.innerHTML = `
      <h3>✨ Visual Performance Lab v0.9.18</h3>
      <p>Particles, palette breathing, gentle beat glow, recursive fractal echoes, saved performance slots, and autonomous scene evolution.</p>

      <h3>Particle Sparks</h3>
      <label><input id="visualParticlesEnabled" type="checkbox"> Orbiting luminous dust</label>
      <div class="visual-performance-grid">
        <label>Particles <output data-visual-performance-output="visualParticleCount"></output><input id="visualParticleCount" type="range" min="12" max="180" step="1"></label>
        <label>Orbit speed <output data-visual-performance-output="visualParticleSpeed"></output><input id="visualParticleSpeed" data-suffix="×" type="range" min="0.02" max="1.5" step="0.01"></label>
        <label>Spark size <output data-visual-performance-output="visualParticleSize"></output><input id="visualParticleSize" data-suffix=" px" type="range" min="0.5" max="8" step="0.1"></label>
      </div>

      <h3>Color Breathing</h3>
      <label><input id="visualBreathEnabled" type="checkbox"> Slowly breathe hue / saturation / brightness</label>
      <div class="visual-performance-grid">
        <label>Breath rate <output data-visual-performance-output="visualBreathRate"></output><input id="visualBreathRate" data-suffix=" Hz" type="range" min="0.01" max="0.5" step="0.005"></label>
        <label>Hue swing <output data-visual-performance-output="visualBreathHue"></output><input id="visualBreathHue" data-suffix="°" type="range" min="0" max="90" step="1"></label>
      </div>

      <h3>Beat Glow / Flash</h3>
      <label><input id="visualBeatEnabled" type="checkbox"> Audio-reactive glow when audio is connected; gentle oscillator otherwise</label>
      <div class="visual-performance-grid">
        <label>Fallback rate <output data-visual-performance-output="visualBeatRate"></output><input id="visualBeatRate" data-suffix=" Hz" type="range" min="0.25" max="2" step="0.05"></label>
        <label>Glow strength <output data-visual-performance-output="visualBeatStrength"></output><input id="visualBeatStrength" data-suffix="×" type="range" min="0" max="0.35" step="0.01"></label>
      </div>
      <div class="visual-performance-warning">Photosensitivity guard: this is a brightness glow, not a hard full-screen strobe. The fallback pulse is capped at 2 Hz and the brightness lift is capped at 35%.</div>

      <h3>Fractal Echo</h3>
      <label><input id="visualFractalEnabled" type="checkbox"> Recursive scaled copies around the live pivot</label>
      <div class="visual-performance-grid">
        <label>Copies <output data-visual-performance-output="visualFractalCopies"></output><input id="visualFractalCopies" type="range" min="1" max="10" step="1"></label>
        <label>Scale <output data-visual-performance-output="visualFractalScale"></output><input id="visualFractalScale" data-suffix="×" type="range" min="0.5" max="0.94" step="0.01"></label>
        <label>Rotation step <output data-visual-performance-output="visualFractalRotation"></output><input id="visualFractalRotation" data-suffix="°" type="range" min="-30" max="30" step="1"></label>
      </div>

      <h3>Visual Scenes</h3>
      <div class="visual-performance-buttons">
        <button data-visual-scene="particle-portal">Particle Portal</button>
        <button data-visual-scene="fractal-bloom">Fractal Bloom</button>
        <button data-visual-scene="aurora-breath">Aurora Breath</button>
        <button data-visual-scene="cosmic-pulse">Cosmic Pulse</button>
      </div>

      <h3>Saved Performance Slots</h3>
      <p>Slots save the current kinetic speeds, tunnel, trails, kaleidoscope, orbit, black stage, and all v0.9.18 effects locally in this browser.</p>
      <div class="visual-performance-slots">
        ${SLOT_NAMES.map((name) => `<div class="visual-performance-slot"><button data-visual-save-slot="${name}">Save ${name}</button><button data-visual-load-slot="${name}">${name} empty</button></div>`).join('')}
      </div>

      <h3>Performance Autoplay</h3>
      <label><input id="visualAutoplayEnabled" type="checkbox"> Evolve through performance scenes automatically</label>
      <label><input id="visualAutoplaySaved" type="checkbox"> Use my saved slots when any exist</label>
      <div class="visual-performance-grid">
        <label>Scene length <output data-visual-performance-output="visualAutoplaySeconds"></output><input id="visualAutoplaySeconds" data-suffix=" s" type="range" min="3" max="60" step="1"></label>
      </div>
      <div class="visual-performance-buttons"><button id="visualAutoplayNext">Next scene</button><button id="visualPerformanceRecord">● Record Final Performance</button></div>
      <div id="visualPerformanceScene" class="visual-performance-scene">MANUAL · ready</div>
      <button id="visualPerformanceReset">Reset v0.9.18 effects</button>
    `;
    shell.appendChild(section);

    $('#visualParticlesEnabled').addEventListener('change', (event) => { state.particles.enabled = event.target.checked; seedParticles(true); if (state.particles.enabled) ensurePlaying(); });
    $('#visualBreathEnabled').addEventListener('change', (event) => { state.breath.enabled = event.target.checked; if (state.breath.enabled) ensurePlaying(); });
    $('#visualBeatEnabled').addEventListener('change', (event) => { state.beat.enabled = event.target.checked; state.beat.level = 0; if (state.beat.enabled) ensurePlaying(); });
    $('#visualFractalEnabled').addEventListener('change', (event) => { state.fractal.enabled = event.target.checked; if (state.fractal.enabled) ensurePlaying(); });
    $('#visualAutoplayEnabled').addEventListener('change', (event) => toggleAutoplay(event.target.checked));
    $('#visualAutoplaySaved').addEventListener('change', (event) => { state.autoplay.preferSaved = event.target.checked; state.autoplay.index = -1; state.autoplay.lastSwitch = performance.now(); });
    $('#visualAutoplayNext').addEventListener('click', () => nextAutoplayScene(true));
    $('#visualPerformanceRecord').addEventListener('click', () => state.recorder.active ? stopRecording() : startRecording());
    $('#visualPerformanceReset').addEventListener('click', resetVisualLayer);

    document.querySelectorAll('[data-visual-scene]').forEach((button) => button.addEventListener('click', () => applyBuiltinScene(button.dataset.visualScene)));
    document.querySelectorAll('[data-visual-save-slot]').forEach((button) => button.addEventListener('click', () => saveSlot(button.dataset.visualSaveSlot)));
    document.querySelectorAll('[data-visual-load-slot]').forEach((button) => button.addEventListener('click', () => loadSlot(button.dataset.visualLoadSlot, true)));

    bindRange('visualParticleCount', (value) => { state.particles.count = Math.round(value); }, { reseed: true });
    bindRange('visualParticleSpeed', (value) => { state.particles.speed = value; });
    bindRange('visualParticleSize', (value) => { state.particles.size = value; });
    bindRange('visualBreathRate', (value) => { state.breath.rate = value; });
    bindRange('visualBreathHue', (value) => { state.breath.hue = value; });
    bindRange('visualBeatRate', (value) => { state.beat.rate = clamp(value, 0.25, 2); });
    bindRange('visualBeatStrength', (value) => { state.beat.strength = clamp(value, 0, 0.35); });
    bindRange('visualFractalCopies', (value) => { state.fractal.copies = Math.round(value); });
    bindRange('visualFractalScale', (value) => { state.fractal.scale = value; });
    bindRange('visualFractalRotation', (value) => { state.fractal.rotation = value; });
    bindRange('visualAutoplaySeconds', (value) => { state.autoplay.seconds = Math.round(value); state.autoplay.lastSwitch = performance.now(); });

    syncUi();
    syncRecordButton();
    return true;
  }

  function install() {
    if (!runtime()?.state || !composer()?.state || !mindMelt()?.state || !$('#kineticRotationPanel')) return false;
    if (!buildUi()) return false;
    if (!state.frameId) state.frameId = requestAnimationFrame(frame);

    window.domistikaVisualPerformanceV0918 = {
      version: VERSION,
      state,
      render,
      snapshot,
      saveSlot,
      loadSlot,
      applyScene: applyBuiltinScene,
      nextScene: nextAutoplayScene,
      setAutoplay: toggleAutoplay,
      startRecording,
      stopRecording,
      reset: resetVisualLayer,
    };
    document.documentElement.dataset.visualPerformance = VERSION;
    window.dispatchEvent(new CustomEvent('domistika:visual-performance-ready', { detail: { version: VERSION } }));
    return true;
  }

  function wait(attempt = 0) {
    if (install()) return;
    if (attempt < 1200) requestAnimationFrame(() => wait(attempt + 1));
  }

  window.addEventListener('domistika:mind-melt-ready', () => requestAnimationFrame(() => wait()), { once: true });
  wait();
}
