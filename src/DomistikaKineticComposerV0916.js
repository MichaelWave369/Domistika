const VERSION = '0.9.16';
const INSTALL_FLAG = '__domistikaKineticComposerV0916Installed';

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;

  const state = {
    frameId: 0,
    lastTime: 0,
    elapsed: 0,
    canvas: null,
    trailBuffer: null,
    trails: { enabled: false, memory: 0.84, mix: 0.72 },
    kaleido: { enabled: false, slices: 8, mirror: true, spin: 5, angle: 0 },
    orbit: { enabled: false, mode: 'circle', radiusX: 72, radiusY: 48, speed: 0.12, phase: 0, origin: null },
    sequencer: {
      enabled: false,
      cycle: 'dream',
      seconds: 8,
      shuffle: false,
      index: -1,
      lastSwitch: 0,
    },
    recorder: { active: false, mediaRecorder: null, chunks: [], timer: null },
  };

  const CYCLES = {
    dream: ['slow-drift', 'hypnosis', 'portal'],
    energy: ['portal', 'bass-bloom', 'chaos'],
    storm: ['hypnosis', 'inversion-storm', 'chaos', 'portal'],
    meditation: ['slow-drift', 'hypnosis', 'slow-drift', 'portal'],
  };

  const $ = (selector) => document.querySelector(selector);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const runtime = () => window.domistikaKineticExpansionV0914 || window.domistikaKineticRuntime || null;
  const status = (message) => window.__domistikaStatus?.(message);
  const compositorActive = () => state.trails.enabled || state.kaleido.enabled;

  function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
  }

  function injectStyles() {
    if ($('#kineticComposerStyles')) return;
    const style = document.createElement('style');
    style.id = 'kineticComposerStyles';
    style.textContent = `
      .kinetic-composer-canvas{position:absolute;inset:0;z-index:8;width:100%;height:100%;pointer-events:none}
      .kinetic-composer{display:grid;gap:10px;padding-top:11px;border-top:1px solid var(--line)}
      .kinetic-composer h3{margin:0;font-size:12px}.kinetic-composer p{margin:0;color:var(--muted);font-size:10px;line-height:1.45}
      .kinetic-composer-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.kinetic-composer-grid label{display:grid;gap:5px;color:var(--muted);font-size:10px}.kinetic-composer-grid output{justify-self:end;color:var(--ink)}
      .kinetic-composer-inline{display:flex;flex-wrap:wrap;gap:6px}.kinetic-composer-inline>*{flex:1 1 105px}
      .kinetic-composer button,.kinetic-composer select{border:1px solid var(--line);border-radius:9px;background:var(--panel2);color:var(--ink);padding:8px;cursor:pointer}
      .kinetic-composer button.active{background:rgba(127,90,240,.16);border-color:rgba(127,90,240,.5)}
      .kinetic-composer button.recording{background:rgba(255,76,108,.15);border-color:rgba(255,76,108,.55);color:#ff9caf}
      .kinetic-composer-preset-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}
      .kinetic-composer-note{padding:8px;border:1px dashed var(--line);border-radius:9px;color:var(--muted);font-size:10px}
      @media(max-width:900px){.kinetic-composer-grid,.kinetic-composer-preset-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureCanvas() {
    const rt = runtime();
    const source = rt?.state?.displayCanvas;
    const artboard = $('#artboard');
    const overlay = $('#overlay');
    if (!rt?.state || !source || !artboard || !overlay) return false;

    if (!state.canvas?.isConnected) {
      const canvas = document.createElement('canvas');
      canvas.id = 'kineticComposerCanvas';
      canvas.className = 'kinetic-composer-canvas';
      canvas.hidden = true;
      artboard.insertBefore(canvas, overlay);
      state.canvas = canvas;
    }

    if (state.canvas.width !== source.width || state.canvas.height !== source.height) {
      state.canvas.width = source.width;
      state.canvas.height = source.height;
      state.canvas.style.width = `${source.width}px`;
      state.canvas.style.height = `${source.height}px`;
      state.trailBuffer = createCanvas(source.width, source.height);
    } else if (!state.trailBuffer) {
      state.trailBuffer = createCanvas(source.width, source.height);
    }
    return true;
  }

  function clearTrails() {
    if (!state.trailBuffer) return;
    state.trailBuffer.getContext('2d').clearRect(0, 0, state.trailBuffer.width, state.trailBuffer.height);
  }

  function trailSource(source) {
    if (!state.trails.enabled || !state.trailBuffer) return source;
    const ctx = state.trailBuffer.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = `rgba(0,0,0,${clamp(state.trails.memory, 0.05, 0.98)})`;
    ctx.fillRect(0, 0, state.trailBuffer.width, state.trailBuffer.height);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = clamp(state.trails.mix, 0.05, 1);
    ctx.drawImage(source, 0, 0);
    ctx.restore();
    return state.trailBuffer;
  }

  function drawKaleidoscope(ctx, source) {
    const rt = runtime();
    const pivot = rt?.state?.pivot || { x: source.width / 2, y: source.height / 2 };
    const slices = clamp(Math.round(state.kaleido.slices), 3, 18);
    const step = Math.PI * 2 / slices;
    const radius = Math.hypot(source.width, source.height) * 1.25;
    const spin = state.kaleido.angle * Math.PI / 180;

    for (let index = 0; index < slices; index += 1) {
      const angle = index * step + spin;
      ctx.save();
      ctx.translate(pivot.x, pivot.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(-step / 2) * radius, Math.sin(-step / 2) * radius);
      ctx.lineTo(Math.cos(step / 2) * radius, Math.sin(step / 2) * radius);
      ctx.closePath();
      ctx.clip();
      if (state.kaleido.mirror && index % 2 === 1) ctx.scale(1, -1);
      ctx.rotate(-angle);
      ctx.translate(-pivot.x, -pivot.y);
      ctx.drawImage(source, 0, 0);
      ctx.restore();
    }
  }

  function renderComposer() {
    const rt = runtime();
    if (!ensureCanvas() || !rt?.state?.visible || !compositorActive()) {
      if (state.canvas) state.canvas.hidden = true;
      return;
    }
    const source = rt.state.displayCanvas;
    const processed = trailSource(source);
    const ctx = state.canvas.getContext('2d');
    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    if (state.kaleido.enabled) drawKaleidoscope(ctx, processed);
    else ctx.drawImage(processed, 0, 0);
    state.canvas.hidden = false;
  }

  function captureOrbitOrigin() {
    const rt = runtime();
    if (!rt?.state) return;
    const pivot = rt.state.pivot || { x: rt.state.displayCanvas.width / 2, y: rt.state.displayCanvas.height / 2 };
    state.orbit.origin = { x: pivot.x, y: pivot.y };
    state.orbit.phase = 0;
  }

  function setOrbitEnabled(enabled) {
    const rt = runtime();
    state.orbit.enabled = Boolean(enabled);
    if (state.orbit.enabled) {
      captureOrbitOrigin();
      status('Orbit Pivot engaged');
    } else if (rt?.state && state.orbit.origin) {
      rt.state.pivot = { ...state.orbit.origin };
      rt.render?.();
      status('Orbit Pivot returned to its origin');
    }
    syncUi();
  }

  function updateOrbit(dt) {
    const rt = runtime();
    if (!state.orbit.enabled || !rt?.state?.visible || !rt.state.playing) return;
    if (!state.orbit.origin) captureOrbitOrigin();
    state.orbit.phase += dt * Math.PI * 2 * clamp(state.orbit.speed, 0.01, 1.2);
    const origin = state.orbit.origin;
    let x;
    let y;
    if (state.orbit.mode === 'figure8') {
      x = origin.x + Math.sin(state.orbit.phase) * state.orbit.radiusX;
      y = origin.y + Math.sin(state.orbit.phase * 2) * state.orbit.radiusY;
    } else {
      x = origin.x + Math.cos(state.orbit.phase) * state.orbit.radiusX;
      y = origin.y + Math.sin(state.orbit.phase) * state.orbit.radiusY;
    }
    rt.state.pivot = {
      x: clamp(x, 0, rt.state.displayCanvas.width),
      y: clamp(y, 0, rt.state.displayCanvas.height),
    };
  }

  function cycleList() {
    return CYCLES[state.sequencer.cycle] || CYCLES.dream;
  }

  function nextScene(announce = true) {
    const rt = runtime();
    const scenes = cycleList();
    if (!rt?.applyPreset || !scenes.length) return;
    if (state.sequencer.shuffle) {
      let next = state.sequencer.index;
      while (scenes.length > 1 && next === state.sequencer.index) next = Math.floor(Math.random() * scenes.length);
      state.sequencer.index = next;
    } else {
      state.sequencer.index = (state.sequencer.index + 1) % scenes.length;
    }
    const name = scenes[state.sequencer.index];
    rt.applyPreset(name);
    state.sequencer.lastSwitch = performance.now();
    if (state.orbit.enabled) captureOrbitOrigin();
    if (announce) status(`Kinetic scene: ${name.replace(/-/g, ' ')}`);
    updateSceneReadout(name);
  }

  function updateSequencer(now) {
    const rt = runtime();
    if (!state.sequencer.enabled || !rt?.state?.playing) return;
    if (!state.sequencer.lastSwitch) state.sequencer.lastSwitch = now;
    if (now - state.sequencer.lastSwitch >= state.sequencer.seconds * 1000) nextScene(true);
  }

  function updateSceneReadout(name = null) {
    const node = $('#kineticComposerScene');
    if (!node) return;
    const scenes = cycleList();
    const current = name || (state.sequencer.index >= 0 ? scenes[state.sequencer.index] : 'ready');
    node.textContent = `${state.sequencer.cycle.toUpperCase()} · ${current.replace(/-/g, ' ')}`;
  }

  function frame(now) {
    const dt = state.lastTime ? Math.min(0.05, (now - state.lastTime) / 1000) : 0;
    state.lastTime = now;
    state.elapsed += dt;
    const rt = runtime();

    if (rt?.state?.visible) {
      updateOrbit(dt);
      if (state.kaleido.enabled && rt.state.playing) state.kaleido.angle += state.kaleido.spin * dt;
      updateSequencer(now);
      renderComposer();
    } else if (state.canvas) {
      state.canvas.hidden = true;
      clearTrails();
      state.sequencer.lastSwitch = 0;
    }

    state.frameId = requestAnimationFrame(frame);
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
    const button = $('#kineticRecord');
    if (!button || !compositorActive()) return;
    button.textContent = state.recorder.active ? '■ Stop & export' : '● Record WebM';
    button.classList.toggle('recording', state.recorder.active);
  }

  function startComposerRecording() {
    const rt = runtime();
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return status('Motion recording is unavailable in this browser');
    if (!rt?.state) return;
    window.domistikaKineticLiveSourceV0915?.refreshNow?.();
    if (!rt.state.visible) rt.play?.();
    if (!rt.state.playing) rt.play?.();
    renderComposer();
    if (!state.canvas || state.canvas.hidden) return status('Enable Trails or Kaleidoscope before Composer recording');

    const fps = clamp(Number($('#kineticRecordFps')?.value) || 30, 10, 60);
    const maxSeconds = clamp(Number($('#kineticRecordSeconds')?.value) || 20, 2, 180);
    const mimeType = preferredMimeType();
    const stream = state.canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    state.recorder.mediaRecorder = recorder;
    state.recorder.chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) state.recorder.chunks.push(event.data); };
    recorder.onstop = () => {
      clearTimeout(state.recorder.timer);
      state.recorder.timer = null;
      state.recorder.active = false;
      const blob = new Blob(state.recorder.chunks, { type: mimeType || 'video/webm' });
      const name = ($('#projectName')?.value || 'domistika-composer').trim().replace(/[^a-z0-9_-]+/gi, '-');
      downloadBlob(blob, `${name}-kinetic-composer.webm`);
      syncRecordButton();
      status('Kinetic Composer video exported');
    };
    recorder.start(250);
    state.recorder.active = true;
    state.recorder.timer = setTimeout(stopComposerRecording, maxSeconds * 1000);
    syncRecordButton();
    status(`Recording Kinetic Composer at ${fps} fps`);
  }

  function stopComposerRecording() {
    if (!state.recorder.active || !state.recorder.mediaRecorder) return;
    clearTimeout(state.recorder.timer);
    state.recorder.timer = null;
    if (state.recorder.mediaRecorder.state !== 'inactive') state.recorder.mediaRecorder.stop();
  }

  function exportComposerStill() {
    const rt = runtime();
    if (!rt?.state) return;
    window.domistikaKineticLiveSourceV0915?.refreshNow?.();
    if (!rt.state.visible) rt.play?.();
    renderComposer();
    if (!state.canvas || state.canvas.hidden) return status('Enable Trails or Kaleidoscope before Composer frame export');
    state.canvas.toBlob((blob) => {
      if (!blob) return;
      const name = ($('#projectName')?.value || 'domistika-composer').trim().replace(/[^a-z0-9_-]+/gi, '-');
      downloadBlob(blob, `${name}-kinetic-composer.png`);
      status('Kinetic Composer frame exported');
    }, 'image/png');
  }

  function interceptExports() {
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('#kineticRecord,#kineticExportStill') : null;
      if (!target || !compositorActive()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (target.id === 'kineticRecord') {
        if (state.recorder.active) stopComposerRecording();
        else startComposerRecording();
      } else {
        exportComposerStill();
      }
    }, true);
  }

  function composerPreset(name) {
    if (name === 'ghost-mandala') {
      Object.assign(state.trails, { enabled: true, memory: 0.88, mix: 0.62 });
      Object.assign(state.kaleido, { enabled: true, slices: 9, mirror: true, spin: 3 });
      state.orbit.enabled = false;
      state.sequencer.enabled = false;
    } else if (name === 'orbit-bloom') {
      Object.assign(state.trails, { enabled: true, memory: 0.76, mix: 0.78 });
      Object.assign(state.kaleido, { enabled: true, slices: 6, mirror: true, spin: -4 });
      Object.assign(state.orbit, { enabled: true, mode: 'circle', radiusX: 90, radiusY: 64, speed: 0.09 });
      state.sequencer.enabled = false;
      captureOrbitOrigin();
    } else if (name === 'infinite-dream') {
      Object.assign(state.trails, { enabled: true, memory: 0.91, mix: 0.56 });
      Object.assign(state.kaleido, { enabled: true, slices: 12, mirror: true, spin: 2 });
      Object.assign(state.orbit, { enabled: true, mode: 'figure8', radiusX: 54, radiusY: 34, speed: 0.07 });
      Object.assign(state.sequencer, { enabled: true, cycle: 'dream', seconds: 10, shuffle: false, index: -1, lastSwitch: 0 });
      captureOrbitOrigin();
    } else if (name === 'calm-drift') {
      Object.assign(state.trails, { enabled: true, memory: 0.68, mix: 0.86 });
      state.kaleido.enabled = false;
      state.orbit.enabled = false;
      state.sequencer.enabled = false;
      runtime()?.applyPreset?.('slow-drift');
    }
    clearTrails();
    syncUi();
    renderComposer();
    status(`${name.replace(/-/g, ' ')} Composer preset loaded`);
  }

  function syncOutput(id, value) {
    const input = $(`#${id}`);
    if (input) input.value = String(value);
    const output = document.querySelector(`[data-kinetic-composer-output="${id}"]`);
    if (output) output.textContent = `${value}${input?.dataset.suffix || ''}`;
  }

  function syncUi() {
    const checks = {
      kineticTrailsEnabled: state.trails.enabled,
      kineticKaleidoEnabled: state.kaleido.enabled,
      kineticKaleidoMirror: state.kaleido.mirror,
      kineticOrbitEnabled: state.orbit.enabled,
      kineticSequenceEnabled: state.sequencer.enabled,
      kineticSequenceShuffle: state.sequencer.shuffle,
    };
    for (const [id, checked] of Object.entries(checks)) {
      const input = $(`#${id}`);
      if (input) input.checked = checked;
    }
    const selects = {
      kineticOrbitMode: state.orbit.mode,
      kineticSequenceCycle: state.sequencer.cycle,
    };
    for (const [id, value] of Object.entries(selects)) {
      const input = $(`#${id}`);
      if (input) input.value = value;
    }
    syncOutput('kineticTrailMemory', state.trails.memory);
    syncOutput('kineticTrailMix', state.trails.mix);
    syncOutput('kineticKaleidoSlices', state.kaleido.slices);
    syncOutput('kineticKaleidoSpin', state.kaleido.spin);
    syncOutput('kineticOrbitRadiusX', state.orbit.radiusX);
    syncOutput('kineticOrbitRadiusY', state.orbit.radiusY);
    syncOutput('kineticOrbitSpeed', state.orbit.speed);
    syncOutput('kineticSequenceSeconds', state.sequencer.seconds);
    updateSceneReadout();
    syncRecordButton();
  }

  function bindRange(id, setter) {
    const input = $(`#${id}`);
    if (!input) return;
    input.addEventListener('input', () => {
      const value = Number(input.value);
      setter(value);
      syncOutput(id, input.value);
      if (id.startsWith('kineticTrail')) clearTrails();
    });
  }

  function buildUi() {
    const shell = $('#kineticRotationPanel .kinetic-shell');
    if (!shell || $('#kineticComposerSection')) return false;
    injectStyles();
    ensureCanvas();

    const section = document.createElement('div');
    section.id = 'kineticComposerSection';
    section.className = 'kinetic-composer';
    section.innerHTML = `
      <h3>🎛️ Kinetic Composer v0.9.16</h3>
      <p>Temporal trails, kaleidoscope optics, moving pivots, and automatic motion-scene sequencing.</p>

      <h3>Ghost Trails</h3>
      <label><input id="kineticTrailsEnabled" type="checkbox"> Motion afterimages</label>
      <div class="kinetic-composer-grid">
        <label>Trail memory <output data-kinetic-composer-output="kineticTrailMemory"></output><input id="kineticTrailMemory" data-suffix="×" type="range" min="0.05" max="0.97" step="0.01"></label>
        <label>New-frame mix <output data-kinetic-composer-output="kineticTrailMix"></output><input id="kineticTrailMix" data-suffix="×" type="range" min="0.1" max="1" step="0.01"></label>
      </div>
      <div class="kinetic-composer-inline"><button id="kineticClearTrails">Clear trails</button></div>

      <h3>Kaleidoscope Lens</h3>
      <label><input id="kineticKaleidoEnabled" type="checkbox"> Enable radial lens</label>
      <label><input id="kineticKaleidoMirror" type="checkbox"> Mirror alternating slices</label>
      <div class="kinetic-composer-grid">
        <label>Slices <output data-kinetic-composer-output="kineticKaleidoSlices"></output><input id="kineticKaleidoSlices" type="range" min="3" max="18" step="1"></label>
        <label>Lens spin <output data-kinetic-composer-output="kineticKaleidoSpin"></output><input id="kineticKaleidoSpin" data-suffix="°/s" type="range" min="-60" max="60" step="1"></label>
      </div>

      <h3>Orbit Pivot</h3>
      <label><input id="kineticOrbitEnabled" type="checkbox"> Move the kinetic center while playing</label>
      <div class="kinetic-composer-grid">
        <label>Path<select id="kineticOrbitMode"><option value="circle">Ellipse orbit</option><option value="figure8">Figure 8</option></select></label>
        <label>Speed <output data-kinetic-composer-output="kineticOrbitSpeed"></output><input id="kineticOrbitSpeed" data-suffix=" Hz" type="range" min="0.01" max="1.2" step="0.01"></label>
        <label>Radius X <output data-kinetic-composer-output="kineticOrbitRadiusX"></output><input id="kineticOrbitRadiusX" data-suffix=" px" type="range" min="0" max="400" step="1"></label>
        <label>Radius Y <output data-kinetic-composer-output="kineticOrbitRadiusY"></output><input id="kineticOrbitRadiusY" data-suffix=" px" type="range" min="0" max="400" step="1"></label>
      </div>
      <div class="kinetic-composer-inline"><button id="kineticOrbitRecenter">Use current pivot as orbit center</button></div>

      <h3>Scene Sequencer</h3>
      <label><input id="kineticSequenceEnabled" type="checkbox"> Auto-cycle performance scenes</label>
      <div class="kinetic-composer-grid">
        <label>Cycle<select id="kineticSequenceCycle"><option value="dream">Dream Cycle</option><option value="energy">Energy Run</option><option value="storm">Storm Ride</option><option value="meditation">Meditation Loop</option></select></label>
        <label>Scene length <output data-kinetic-composer-output="kineticSequenceSeconds"></output><input id="kineticSequenceSeconds" data-suffix=" s" type="range" min="2" max="60" step="1"></label>
      </div>
      <label><input id="kineticSequenceShuffle" type="checkbox"> Shuffle scenes</label>
      <div class="kinetic-composer-inline"><button id="kineticNextScene">Next scene</button></div>
      <div id="kineticComposerScene" class="kinetic-composer-note">DREAM · ready</div>

      <h3>Composer Presets</h3>
      <div class="kinetic-composer-preset-grid">
        <button data-kinetic-composer-preset="ghost-mandala">Ghost Mandala</button>
        <button data-kinetic-composer-preset="orbit-bloom">Orbit Bloom</button>
        <button data-kinetic-composer-preset="infinite-dream">Infinite Dream</button>
        <button data-kinetic-composer-preset="calm-drift">Calm Drift</button>
      </div>
      <p>When Trails or Kaleidoscope are active, WebM and PNG export automatically capture the Composer output you actually see.</p>
    `;
    shell.appendChild(section);

    $('#kineticTrailsEnabled').addEventListener('change', (event) => { state.trails.enabled = event.target.checked; clearTrails(); renderComposer(); syncRecordButton(); });
    $('#kineticKaleidoEnabled').addEventListener('change', (event) => { state.kaleido.enabled = event.target.checked; renderComposer(); syncRecordButton(); });
    $('#kineticKaleidoMirror').addEventListener('change', (event) => { state.kaleido.mirror = event.target.checked; });
    $('#kineticClearTrails').addEventListener('click', () => { clearTrails(); status('Kinetic trails cleared'); });
    $('#kineticOrbitEnabled').addEventListener('change', (event) => setOrbitEnabled(event.target.checked));
    $('#kineticOrbitMode').addEventListener('change', (event) => { state.orbit.mode = event.target.value; captureOrbitOrigin(); });
    $('#kineticOrbitRecenter').addEventListener('click', () => { captureOrbitOrigin(); status('Current pivot saved as Orbit Pivot center'); });
    $('#kineticSequenceEnabled').addEventListener('change', (event) => { state.sequencer.enabled = event.target.checked; state.sequencer.lastSwitch = performance.now(); if (state.sequencer.enabled && state.sequencer.index < 0) nextScene(false); });
    $('#kineticSequenceCycle').addEventListener('change', (event) => { state.sequencer.cycle = event.target.value; state.sequencer.index = -1; state.sequencer.lastSwitch = performance.now(); updateSceneReadout(); });
    $('#kineticSequenceShuffle').addEventListener('change', (event) => { state.sequencer.shuffle = event.target.checked; });
    $('#kineticNextScene').addEventListener('click', () => nextScene(true));
    document.querySelectorAll('[data-kinetic-composer-preset]').forEach((button) => button.addEventListener('click', () => composerPreset(button.dataset.kineticComposerPreset)));

    bindRange('kineticTrailMemory', (value) => { state.trails.memory = value; });
    bindRange('kineticTrailMix', (value) => { state.trails.mix = value; });
    bindRange('kineticKaleidoSlices', (value) => { state.kaleido.slices = Math.round(value); });
    bindRange('kineticKaleidoSpin', (value) => { state.kaleido.spin = value; });
    bindRange('kineticOrbitRadiusX', (value) => { state.orbit.radiusX = value; });
    bindRange('kineticOrbitRadiusY', (value) => { state.orbit.radiusY = value; });
    bindRange('kineticOrbitSpeed', (value) => { state.orbit.speed = value; });
    bindRange('kineticSequenceSeconds', (value) => { state.sequencer.seconds = Math.round(value); });

    syncUi();
    return true;
  }

  function install() {
    const rt = runtime();
    if (!rt?.state || !$('#kineticRotationPanel')) return false;
    if (!buildUi()) return false;
    interceptExports();
    if (!state.frameId) state.frameId = requestAnimationFrame(frame);

    window.domistikaKineticComposerV0916 = {
      version: VERSION,
      state,
      render: renderComposer,
      clearTrails,
      setOrbitEnabled,
      nextScene,
      composerPreset,
      startRecording: startComposerRecording,
      stopRecording: stopComposerRecording,
      exportStill: exportComposerStill,
    };
    document.documentElement.dataset.kineticComposer = VERSION;
    window.dispatchEvent(new CustomEvent('domistika:kinetic-composer-ready', { detail: { version: VERSION } }));
    return true;
  }

  function wait(attempt = 0) {
    if (install()) return;
    if (attempt < 1200) requestAnimationFrame(() => wait(attempt + 1));
  }

  window.addEventListener('domistika:kinetic-expansion-ready', () => requestAnimationFrame(() => wait()), { once: true });
  wait();
}
