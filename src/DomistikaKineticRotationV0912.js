const VERSION = '0.9.12';
const INSTALL_FLAG = '__domistikaKineticRotationV0912Installed';

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;

  const motion = {
    mode: 'rings-3',
    playing: false,
    visible: false,
    frameId: 0,
    lastTime: 0,
    phaseTime: 0,
    source: null,
    stage: null,
    canvases: {},
    angles: { outer: 0, middle: 0, center: 0 },
    speeds: { outer: 8, middle: -14, center: 24 },
    innerRadius: 34,
    middleRadius: 68,
    pulse: 0,
    pulseRate: 0.22,
    hueSpeed: 0,
    overlayPointerEvents: '',
  };

  const $ = (selector) => document.querySelector(selector);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const engine = () => window.__domistikaEngine || null;
  const status = (message) => window.__domistikaStatus?.(message);

  function activatePanel(panelId) {
    document.querySelectorAll('.inspector-tabs [data-panel]').forEach((button) => {
      button.classList.toggle('active', button.dataset.panel === panelId);
    });
    document.querySelectorAll('.inspector-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === panelId);
    });
  }

  function injectStyles() {
    if ($('#kineticRotationStyles')) return;
    const style = document.createElement('style');
    style.id = 'kineticRotationStyles';
    style.textContent = `
      .kinetic-open,.kinetic-btn,.kinetic-select{border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--ink);cursor:pointer}
      .kinetic-open{padding:8px 10px;font-weight:800}.kinetic-open.active{background:rgba(127,90,240,.16);border-color:rgba(127,90,240,.46)}
      .kinetic-shell{display:grid;gap:11px}.kinetic-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.kinetic-grid label{display:grid;gap:5px;color:var(--muted);font-size:10px}.kinetic-grid output{justify-self:end;color:var(--ink)}
      .kinetic-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.kinetic-btn{padding:9px}.kinetic-btn.primary{background:rgba(255,191,105,.15);border-color:rgba(255,191,105,.4)}.kinetic-btn.active{background:rgba(127,90,240,.16)}
      .kinetic-live{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border:1px solid var(--line);border-radius:12px;background:rgba(127,90,240,.07)}.kinetic-live strong{font-size:11px}.kinetic-live span{font-size:10px;color:var(--muted)}
      .kinetic-note{margin:0;font-size:10px;line-height:1.5;color:var(--muted)}
      .kinetic-stage{position:absolute;inset:0;z-index:6;pointer-events:none;overflow:hidden;transform-origin:50% 50%}.kinetic-band{position:absolute;inset:0;width:100%;height:100%;transform-origin:50% 50%;will-change:transform}.artboard.kinetic-previewing .paint-layer{visibility:hidden}
      .artboard.kinetic-previewing .paper-background{z-index:0}.artboard.kinetic-previewing .kinetic-stage{display:block}
      @media(max-width:900px){.kinetic-grid,.kinetic-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureStage() {
    const active = engine();
    const artboard = $('#artboard');
    const overlay = $('#overlay');
    if (!active || !artboard || !overlay) return null;
    if (motion.stage?.isConnected) return motion.stage;

    const stage = document.createElement('div');
    stage.id = 'kineticRotationStage';
    stage.className = 'kinetic-stage';
    stage.hidden = true;

    for (const key of ['outer', 'middle', 'center']) {
      const canvas = document.createElement('canvas');
      canvas.className = `kinetic-band kinetic-${key}`;
      canvas.dataset.kineticBand = key;
      stage.appendChild(canvas);
      motion.canvases[key] = canvas;
    }

    artboard.insertBefore(stage, overlay);
    motion.stage = stage;
    return stage;
  }

  function sizeStage() {
    const active = engine();
    if (!active || !ensureStage()) return;
    for (const canvas of Object.values(motion.canvases)) {
      if (canvas.width !== active.width) canvas.width = active.width;
      if (canvas.height !== active.height) canvas.height = active.height;
    }
  }

  function drawClippedBand(canvas, source, band) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.hypot(width, height) / 2;
    const r1 = maxRadius * clamp(motion.innerRadius, 5, 90) / 100;
    const r2 = maxRadius * clamp(motion.middleRadius, motion.innerRadius + 1, 98) / 100;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.beginPath();

    if (motion.mode === 'whole') {
      ctx.rect(0, 0, width, height);
    } else if (band === 'center') {
      ctx.arc(cx, cy, r1, 0, Math.PI * 2);
    } else if (band === 'middle') {
      ctx.arc(cx, cy, r2, 0, Math.PI * 2);
      ctx.arc(cx, cy, r1, 0, Math.PI * 2);
    } else {
      ctx.rect(0, 0, width, height);
      ctx.arc(cx, cy, r2, 0, Math.PI * 2);
    }

    ctx.clip(motion.mode === 'whole' ? 'nonzero' : 'evenodd');
    ctx.drawImage(source, 0, 0);
    ctx.restore();
  }

  function prepareBands({ announce = false } = {}) {
    const active = engine();
    if (!active) return false;
    ensureStage();
    sizeStage();
    motion.source = active.compositeCanvas(false);

    if (motion.mode === 'whole') {
      drawClippedBand(motion.canvases.center, motion.source, 'center');
      motion.canvases.center.hidden = false;
      motion.canvases.middle.hidden = true;
      motion.canvases.outer.hidden = true;
    } else {
      for (const key of ['outer', 'middle', 'center']) {
        drawClippedBand(motion.canvases[key], motion.source, key);
        motion.canvases[key].hidden = false;
      }
    }

    applyTransforms();
    if (announce) status('Kinetic Rotation source refreshed');
    return true;
  }

  function applyTransforms() {
    if (!motion.stage) return;
    const whole = motion.mode === 'whole';
    motion.canvases.center.style.transform = `rotate(${motion.angles.center}deg)`;
    motion.canvases.middle.style.transform = whole ? 'none' : `rotate(${motion.angles.middle}deg)`;
    motion.canvases.outer.style.transform = whole ? 'none' : `rotate(${motion.angles.outer}deg)`;

    const pulseScale = 1 + (motion.pulse / 100) * Math.sin(motion.phaseTime * Math.PI * 2 * motion.pulseRate);
    motion.stage.style.transform = `scale(${pulseScale})`;
    const hueAngle = motion.hueSpeed ? motion.phaseTime * motion.hueSpeed : 0;
    motion.stage.style.filter = `hue-rotate(${hueAngle}deg)`;
  }

  function showStage() {
    const active = engine();
    const artboard = $('#artboard');
    const overlay = $('#overlay');
    if (!active || !artboard || !overlay) return false;
    if (!motion.source && !prepareBands()) return false;
    ensureStage();
    motion.visible = true;
    motion.stage.hidden = false;
    artboard.classList.add('kinetic-previewing');
    if (!overlay.dataset.kineticPointerSaved) {
      motion.overlayPointerEvents = overlay.style.pointerEvents || '';
      overlay.dataset.kineticPointerSaved = '1';
    }
    overlay.style.pointerEvents = 'none';
    $('#kineticOpen')?.classList.add('active');
    applyTransforms();
    return true;
  }

  function hideStage() {
    const artboard = $('#artboard');
    const overlay = $('#overlay');
    motion.visible = false;
    motion.playing = false;
    cancelAnimationFrame(motion.frameId);
    motion.frameId = 0;
    motion.lastTime = 0;
    artboard?.classList.remove('kinetic-previewing');
    if (motion.stage) motion.stage.hidden = true;
    if (overlay?.dataset.kineticPointerSaved) {
      overlay.style.pointerEvents = motion.overlayPointerEvents;
      delete overlay.dataset.kineticPointerSaved;
    }
    $('#kineticOpen')?.classList.remove('active');
    syncButtons();
  }

  function frame(now) {
    if (!motion.playing) return;
    const dt = motion.lastTime ? Math.min(0.05, (now - motion.lastTime) / 1000) : 0;
    motion.lastTime = now;
    motion.phaseTime += dt;
    motion.angles.center += motion.speeds.center * dt;
    if (motion.mode !== 'whole') {
      motion.angles.middle += motion.speeds.middle * dt;
      motion.angles.outer += motion.speeds.outer * dt;
    }
    applyTransforms();
    motion.frameId = requestAnimationFrame(frame);
  }

  function play() {
    if (!showStage()) return;
    if (motion.playing) return;
    motion.playing = true;
    motion.lastTime = 0;
    motion.frameId = requestAnimationFrame(frame);
    syncButtons();
    status(motion.mode === 'whole' ? 'Kinetic Rotation playing whole artwork' : 'Kinetic Rotation playing three radial bands');
  }

  function pause() {
    motion.playing = false;
    cancelAnimationFrame(motion.frameId);
    motion.frameId = 0;
    motion.lastTime = 0;
    syncButtons();
    status('Kinetic Rotation paused');
  }

  function stop() {
    hideStage();
    status('Kinetic Rotation preview stopped — original artwork unchanged');
  }

  function reverse() {
    for (const key of Object.keys(motion.speeds)) motion.speeds[key] *= -1;
    syncInputs();
    status('Kinetic Rotation direction reversed');
  }

  function resetAngles() {
    motion.angles = { outer: 0, middle: 0, center: 0 };
    motion.phaseTime = 0;
    applyTransforms();
    status('Kinetic Rotation angles reset');
  }

  function portalPreset() {
    Object.assign(motion.speeds, { outer: 9, middle: -18, center: 36 });
    motion.innerRadius = 33;
    motion.middleRadius = 69;
    motion.pulse = 3;
    motion.pulseRate = 0.369;
    motion.hueSpeed = 6;
    motion.mode = 'rings-3';
    syncInputs();
    prepareBands();
    showStage();
    status('3·6·9 Portal preset loaded');
  }

  function syncButtons() {
    const playButton = $('#kineticPlay');
    const pauseButton = $('#kineticPause');
    const stopButton = $('#kineticStop');
    if (playButton) playButton.classList.toggle('active', motion.playing);
    if (pauseButton) pauseButton.classList.toggle('active', motion.visible && !motion.playing);
    if (stopButton) stopButton.disabled = !motion.visible;
    const badge = $('#kineticState');
    if (badge) badge.textContent = motion.playing ? 'PLAYING' : motion.visible ? 'PAUSED' : 'OFF';
  }

  function syncInputs() {
    const pairs = {
      kineticMode: motion.mode,
      kineticOuterSpeed: motion.speeds.outer,
      kineticMiddleSpeed: motion.speeds.middle,
      kineticCenterSpeed: motion.speeds.center,
      kineticInnerRadius: motion.innerRadius,
      kineticMiddleRadius: motion.middleRadius,
      kineticPulse: motion.pulse,
      kineticPulseRate: motion.pulseRate,
      kineticHueSpeed: motion.hueSpeed,
    };
    for (const [id, value] of Object.entries(pairs)) {
      const input = $(`#${id}`);
      if (input) input.value = String(value);
    }
    document.querySelectorAll('[data-kinetic-output]').forEach((output) => {
      const input = $(`#${output.dataset.kineticOutput}`);
      if (!input) return;
      output.textContent = `${input.value}${input.dataset.suffix || ''}`;
    });
    syncButtons();
  }

  function bindRange(id, setter, { rebuild = false } = {}) {
    const input = $(`#${id}`);
    if (!input) return;
    input.addEventListener('input', () => {
      setter(Number(input.value));
      const output = document.querySelector(`[data-kinetic-output="${id}"]`);
      if (output) output.textContent = `${input.value}${input.dataset.suffix || ''}`;
      if (rebuild && motion.source) prepareBands();
      else applyTransforms();
    });
  }

  function buildUI() {
    if ($('#kineticRotationPanel')) return;
    const deck = $('.control-deck');
    const tabs = $('.inspector-tabs');
    const inspector = $('.inspector');
    if (!deck || !tabs || !inspector || !engine()) return;
    injectStyles();

    const open = document.createElement('button');
    open.id = 'kineticOpen';
    open.className = 'kinetic-open';
    open.textContent = '🌀 Motion';
    open.title = 'Kinetic Rotation Lab';
    open.addEventListener('click', () => activatePanel('kineticRotationPanel'));
    deck.appendChild(open);

    const tab = document.createElement('button');
    tab.dataset.panel = 'kineticRotationPanel';
    tab.textContent = 'Kinetic';
    tab.addEventListener('click', () => activatePanel('kineticRotationPanel'));
    tabs.appendChild(tab);

    const panel = document.createElement('section');
    panel.id = 'kineticRotationPanel';
    panel.className = 'inspector-panel';
    panel.innerHTML = `<div class="kinetic-shell">
      <div class="panel-heading"><div><h2>Kinetic Rotation</h2><p>Turn finished drawings into live rotating art.</p></div></div>
      <div class="kinetic-live"><strong>ARTBOARD PREVIEW</strong><span id="kineticState">OFF</span></div>
      <div class="kinetic-grid">
        <label>Motion layout<select id="kineticMode" class="kinetic-select"><option value="rings-3">Three radial bands</option><option value="whole">Whole artwork</option></select></label>
        <label>Outer speed <output data-kinetic-output="kineticOuterSpeed"></output><input id="kineticOuterSpeed" data-suffix="°/s" type="range" min="-180" max="180" step="1"></label>
        <label>Middle speed <output data-kinetic-output="kineticMiddleSpeed"></output><input id="kineticMiddleSpeed" data-suffix="°/s" type="range" min="-180" max="180" step="1"></label>
        <label>Core speed <output data-kinetic-output="kineticCenterSpeed"></output><input id="kineticCenterSpeed" data-suffix="°/s" type="range" min="-180" max="180" step="1"></label>
        <label>Core radius <output data-kinetic-output="kineticInnerRadius"></output><input id="kineticInnerRadius" data-suffix="%" type="range" min="10" max="70" step="1"></label>
        <label>Middle radius <output data-kinetic-output="kineticMiddleRadius"></output><input id="kineticMiddleRadius" data-suffix="%" type="range" min="30" max="92" step="1"></label>
        <label>Pulse depth <output data-kinetic-output="kineticPulse"></output><input id="kineticPulse" data-suffix="%" type="range" min="0" max="12" step="0.5"></label>
        <label>Pulse rate <output data-kinetic-output="kineticPulseRate"></output><input id="kineticPulseRate" data-suffix="Hz" type="range" min="0.05" max="2" step="0.01"></label>
        <label>Hue drift <output data-kinetic-output="kineticHueSpeed"></output><input id="kineticHueSpeed" data-suffix="°/s" type="range" min="-90" max="90" step="1"></label>
      </div>
      <div class="kinetic-actions">
        <button id="kineticPlay" class="kinetic-btn primary">▶ Play</button><button id="kineticPause" class="kinetic-btn">Ⅱ Pause</button>
        <button id="kineticStop" class="kinetic-btn">■ Stop</button><button id="kineticRefresh" class="kinetic-btn">↻ Refresh art</button>
        <button id="kineticReverse" class="kinetic-btn">⇄ Reverse</button><button id="kineticReset" class="kinetic-btn">0° Reset</button>
        <button id="kinetic369" class="kinetic-btn">3·6·9 Portal</button><button id="kineticRandom" class="kinetic-btn">✦ Random motion</button>
      </div>
      <p class="kinetic-note">Preview is non-destructive. Domistika snapshots the visible artwork, hides the paint layers only while Motion mode is active, and rotates the snapshot in independent radial bands. Stop returns instantly to the untouched drawing.</p>
    </div>`;
    inspector.appendChild(panel);

    $('#kineticMode').addEventListener('change', (event) => {
      motion.mode = event.target.value;
      if (motion.source) prepareBands();
      applyTransforms();
    });
    bindRange('kineticOuterSpeed', (value) => { motion.speeds.outer = value; });
    bindRange('kineticMiddleSpeed', (value) => { motion.speeds.middle = value; });
    bindRange('kineticCenterSpeed', (value) => { motion.speeds.center = value; });
    bindRange('kineticInnerRadius', (value) => {
      motion.innerRadius = Math.min(value, motion.middleRadius - 1);
      syncInputs();
    }, { rebuild: true });
    bindRange('kineticMiddleRadius', (value) => {
      motion.middleRadius = Math.max(value, motion.innerRadius + 1);
      syncInputs();
    }, { rebuild: true });
    bindRange('kineticPulse', (value) => { motion.pulse = value; });
    bindRange('kineticPulseRate', (value) => { motion.pulseRate = value; });
    bindRange('kineticHueSpeed', (value) => { motion.hueSpeed = value; });

    $('#kineticPlay').addEventListener('click', play);
    $('#kineticPause').addEventListener('click', pause);
    $('#kineticStop').addEventListener('click', stop);
    $('#kineticRefresh').addEventListener('click', () => { prepareBands({ announce: true }); showStage(); });
    $('#kineticReverse').addEventListener('click', reverse);
    $('#kineticReset').addEventListener('click', resetAngles);
    $('#kinetic369').addEventListener('click', portalPreset);
    $('#kineticRandom').addEventListener('click', () => {
      motion.mode = Math.random() > 0.18 ? 'rings-3' : 'whole';
      motion.speeds.outer = Math.round(-45 + Math.random() * 90);
      motion.speeds.middle = Math.round(-90 + Math.random() * 180);
      motion.speeds.center = Math.round(-140 + Math.random() * 280);
      motion.innerRadius = Math.round(24 + Math.random() * 22);
      motion.middleRadius = Math.round(Math.max(motion.innerRadius + 14, 58 + Math.random() * 22));
      motion.pulse = Number((Math.random() * 6).toFixed(1));
      motion.pulseRate = Number((0.1 + Math.random() * 0.8).toFixed(2));
      motion.hueSpeed = Math.round(-18 + Math.random() * 36);
      syncInputs();
      prepareBands();
      showStage();
      status('Random Kinetic Rotation motion generated');
    });

    syncInputs();
    window.dispatchEvent(new CustomEvent('domistika:kinetic-ready', { detail: { version: VERSION } }));
  }

  function install() {
    if (!engine() || !$('.control-deck')) return false;
    buildUI();
    window.domistikaKineticRotationV0912 = {
      version: VERSION,
      state: motion,
      play,
      pause,
      stop,
      reverse,
      resetAngles,
      refresh: () => prepareBands({ announce: true }),
      portalPreset,
      show: showStage,
    };
    return true;
  }

  function waitForRuntime() {
    if (install()) return;
    requestAnimationFrame(waitForRuntime);
  }

  window.addEventListener('domistika:ready', () => requestAnimationFrame(waitForRuntime), { once: true });
  waitForRuntime();
}
