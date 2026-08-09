const VERSION = '0.9.17';
const INSTALL_FLAG = '__domistikaMindMeltV0917Installed';

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;

  const state = {
    blackStage: false,
    quickSeconds: 12,
    lastAction: 'ready',
    syncTimer: 0,
  };

  const $ = (selector) => document.querySelector(selector);
  const composer = () => window.domistikaKineticComposerV0916 || null;
  const runtime = () => window.domistikaKineticExpansionV0914 || window.domistikaKineticRuntime || null;
  const status = (message) => window.__domistikaStatus?.(message);

  function injectStyles() {
    if ($('#mindMeltStyles')) return;
    const style = document.createElement('style');
    style.id = 'mindMeltStyles';
    style.textContent = `
      .mind-melt{display:grid;gap:10px;padding-top:11px;border-top:1px solid var(--line)}
      .mind-melt h3{margin:0;font-size:12px}.mind-melt p{margin:0;color:var(--muted);font-size:10px;line-height:1.45}
      .mind-melt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
      .mind-melt-grid.two{grid-template-columns:repeat(2,1fr)}
      .mind-melt button,.mind-melt select{border:1px solid var(--line);border-radius:9px;background:var(--panel2);color:var(--ink);padding:8px;cursor:pointer}
      .mind-melt button.active{background:rgba(127,90,240,.18);border-color:rgba(127,90,240,.58)}
      .mind-melt button.recording{background:rgba(255,76,108,.16);border-color:rgba(255,76,108,.62);color:#ffadc0}
      .mind-melt-readout{padding:8px;border:1px dashed var(--line);border-radius:9px;color:var(--muted);font-size:10px}
      .mind-melt-void{background:linear-gradient(135deg,rgba(127,90,240,.2),rgba(255,76,108,.13))!important;font-weight:700}
      #artboard.mind-melt-black-stage{background:#000!important;background-color:#000!important;background-image:none!important;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 0 42px rgba(127,90,240,.18)!important}
      @media(max-width:900px){.mind-melt-grid,.mind-melt-grid.two{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensurePlaying() {
    const rt = runtime();
    if (!rt?.state) return false;
    window.domistikaKineticLiveSourceV0915?.refreshNow?.();
    if (!rt.state.visible || !rt.state.playing) rt.play?.();
    return true;
  }

  function setCheckbox(id, checked) {
    const input = $(`#${id}`);
    if (!input) return;
    input.checked = Boolean(checked);
  }

  function setRange(id, value) {
    const input = $(`#${id}`);
    if (!input) return;
    input.value = String(value);
    const output = document.querySelector(`[data-kinetic-composer-output="${id}"]`);
    if (output) output.textContent = `${input.value}${input.dataset.suffix || ''}`;
  }

  function setSelect(id, value) {
    const input = $(`#${id}`);
    if (input) input.value = value;
  }

  function syncComposerUi() {
    const cp = composer();
    if (!cp?.state) return;
    setCheckbox('kineticTrailsEnabled', cp.state.trails.enabled);
    setCheckbox('kineticKaleidoEnabled', cp.state.kaleido.enabled);
    setCheckbox('kineticKaleidoMirror', cp.state.kaleido.mirror);
    setCheckbox('kineticOrbitEnabled', cp.state.orbit.enabled);
    setCheckbox('kineticSequenceEnabled', cp.state.sequencer.enabled);
    setRange('kineticTrailMemory', cp.state.trails.memory);
    setRange('kineticTrailMix', cp.state.trails.mix);
    setRange('kineticKaleidoSlices', cp.state.kaleido.slices);
    setRange('kineticKaleidoSpin', cp.state.kaleido.spin);
    setRange('kineticOrbitRadiusX', cp.state.orbit.radiusX);
    setRange('kineticOrbitRadiusY', cp.state.orbit.radiusY);
    setRange('kineticOrbitSpeed', cp.state.orbit.speed);
    setSelect('kineticOrbitMode', cp.state.orbit.mode);
  }

  function markAction(text) {
    state.lastAction = text;
    const readout = $('#mindMeltReadout');
    if (readout) readout.textContent = text;
  }

  function slowTrails() {
    const cp = composer();
    const rt = runtime();
    if (!cp?.state || !rt?.state) return;

    rt.applyPreset?.('slow-drift');
    Object.assign(cp.state.trails, { enabled: true, memory: 0.92, mix: 0.48 });
    cp.state.kaleido.enabled = false;
    cp.state.sequencer.enabled = false;
    if (cp.state.orbit.enabled) cp.setOrbitEnabled?.(false);
    cp.clearTrails?.();
    syncComposerUi();
    ensurePlaying();
    cp.render?.();
    markAction('SLOW TRAILS · long ghost memory · slow drift');
    status('Slow Trails engaged');
  }

  function kaleidoQuick(slices) {
    const cp = composer();
    if (!cp?.state) return;
    cp.state.kaleido.enabled = true;
    cp.state.kaleido.slices = slices;
    cp.state.kaleido.mirror = true;
    if (Math.abs(cp.state.kaleido.spin) < 0.5) cp.state.kaleido.spin = 2;
    syncComposerUi();
    ensurePlaying();
    cp.render?.();
    markAction(`KALEIDO ${slices} · mirrored radial lens`);
    status(`Kaleidoscope set to ${slices} mirrored slices`);
  }

  function orbitQuick(mode) {
    const cp = composer();
    if (!cp?.state) return;

    if (mode === 'circle') {
      Object.assign(cp.state.orbit, { mode: 'circle', radiusX: 72, radiusY: 72, speed: 0.08 });
    } else if (mode === 'ellipse') {
      Object.assign(cp.state.orbit, { mode: 'circle', radiusX: 118, radiusY: 62, speed: 0.075 });
    } else {
      Object.assign(cp.state.orbit, { mode: 'figure8', radiusX: 92, radiusY: 52, speed: 0.065 });
    }

    cp.setOrbitEnabled?.(true);
    syncComposerUi();
    ensurePlaying();
    markAction(`ORBIT · ${mode === 'figure8' ? 'figure 8' : mode}`);
    status(`Orbit Pivot: ${mode === 'figure8' ? 'Figure 8' : mode}`);
  }

  function setBlackStage(enabled) {
    state.blackStage = Boolean(enabled);
    $('#artboard')?.classList.toggle('mind-melt-black-stage', state.blackStage);
    const button = $('#mindMeltBlackStage');
    if (button) {
      button.classList.toggle('active', state.blackStage);
      button.textContent = state.blackStage ? '⬛ Black Stage ON' : '⬛ Black Stage';
    }
    markAction(state.blackStage ? 'BLACK STAGE · void background enabled' : 'BLACK STAGE · off');
    status(state.blackStage ? 'Black Stage enabled' : 'Black Stage disabled');
  }

  function compositorActive() {
    const cp = composer();
    return Boolean(cp?.state?.trails?.enabled || cp?.state?.kaleido?.enabled);
  }

  function recordingActive() {
    const cp = composer();
    const rt = runtime();
    return Boolean(cp?.state?.recorder?.active || rt?.state?.recorder?.active);
  }

  function startQuickRecord() {
    const cp = composer();
    const rt = runtime();
    if (!cp?.state || !rt?.state) return;
    const secondsInput = $('#kineticRecordSeconds');
    if (secondsInput) secondsInput.value = String(state.quickSeconds);
    ensurePlaying();

    if (compositorActive()) cp.startRecording?.();
    else rt.startRecording?.();

    markAction(`QUICK WEBM · recording up to ${state.quickSeconds}s`);
    syncRecordButton();
  }

  function stopQuickRecord() {
    const cp = composer();
    const rt = runtime();
    if (cp?.state?.recorder?.active) cp.stopRecording?.();
    else if (rt?.state?.recorder?.active) rt.stopRecording?.();
    markAction('QUICK WEBM · stop requested · exporting');
    syncRecordButton();
  }

  function toggleQuickRecord() {
    if (recordingActive()) stopQuickRecord();
    else startQuickRecord();
  }

  function syncRecordButton() {
    const button = $('#mindMeltQuickRecord');
    if (!button) return;
    const active = recordingActive();
    button.classList.toggle('recording', active);
    button.textContent = active ? '■ Stop & Export WebM' : `● Quick WebM · ${state.quickSeconds}s`;
  }

  function mindMelt() {
    const cp = composer();
    const rt = runtime();
    if (!cp?.state || !rt?.state) return;

    rt.applyPreset?.('hypnosis');
    Object.assign(cp.state.trails, { enabled: true, memory: 0.91, mix: 0.54 });
    Object.assign(cp.state.kaleido, { enabled: true, slices: 12, mirror: true, spin: 2.5 });
    Object.assign(cp.state.orbit, { enabled: true, mode: 'figure8', radiusX: 78, radiusY: 46, speed: 0.06 });
    cp.state.sequencer.enabled = false;
    cp.clearTrails?.();
    cp.setOrbitEnabled?.(true);
    setBlackStage(true);
    syncComposerUi();
    ensurePlaying();
    cp.render?.();
    markAction('MIND MELT · Slow Ghost + Kaleido 12 + Figure 8 + Black Stage');
    status('Mind Melt engaged');
  }

  function resetQuickLayer() {
    const cp = composer();
    if (!cp?.state) return;
    cp.state.trails.enabled = false;
    cp.state.kaleido.enabled = false;
    cp.state.sequencer.enabled = false;
    if (cp.state.orbit.enabled) cp.setOrbitEnabled?.(false);
    cp.clearTrails?.();
    setBlackStage(false);
    syncComposerUi();
    cp.render?.();
    markAction('MIND MELT controls reset · base kinetic motion preserved');
    status('Mind Melt add-ons reset');
  }

  function buildUi() {
    const shell = $('#kineticRotationPanel .kinetic-shell');
    if (!shell || $('#mindMeltSection')) return false;
    injectStyles();

    const section = document.createElement('div');
    section.id = 'mindMeltSection';
    section.className = 'mind-melt';
    section.innerHTML = `
      <h3>🌀 Mind Melt Pack v0.9.17</h3>
      <p>Fast performance controls for the things that are hardest to stop staring at.</p>

      <div class="mind-melt-grid two">
        <button id="mindMeltSlowTrails">👻 Slow Trails</button>
        <button id="mindMeltBlackStage">⬛ Black Stage</button>
      </div>

      <h3>Kaleidoscope Quick Slices</h3>
      <div class="mind-melt-grid">
        <button data-mind-melt-kaleido="8">Kaleido 8</button>
        <button data-mind-melt-kaleido="12">Kaleido 12</button>
        <button data-mind-melt-kaleido="16">Kaleido 16</button>
      </div>

      <h3>Orbit Quick Paths</h3>
      <div class="mind-melt-grid">
        <button data-mind-melt-orbit="circle">Circle</button>
        <button data-mind-melt-orbit="ellipse">Ellipse</button>
        <button data-mind-melt-orbit="figure8">Figure 8</button>
      </div>

      <h3>Quick Capture</h3>
      <div class="mind-melt-grid two">
        <select id="mindMeltRecordSeconds" aria-label="Quick WebM duration"><option value="10">10 sec</option><option value="12" selected>12 sec</option><option value="20">20 sec</option><option value="30">30 sec</option></select>
        <button id="mindMeltQuickRecord">● Quick WebM · 12s</button>
      </div>

      <button id="mindMeltGo" class="mind-melt-void">🌀 MIND MELT — Ghost + 12 + Figure 8 + Void</button>
      <button id="mindMeltReset">Reset Mind Melt add-ons</button>
      <div id="mindMeltReadout" class="mind-melt-readout">ready</div>
    `;
    shell.appendChild(section);

    $('#mindMeltSlowTrails').addEventListener('click', slowTrails);
    $('#mindMeltBlackStage').addEventListener('click', () => setBlackStage(!state.blackStage));
    document.querySelectorAll('[data-mind-melt-kaleido]').forEach((button) => {
      button.addEventListener('click', () => kaleidoQuick(Number(button.dataset.mindMeltKaleido)));
    });
    document.querySelectorAll('[data-mind-melt-orbit]').forEach((button) => {
      button.addEventListener('click', () => orbitQuick(button.dataset.mindMeltOrbit));
    });
    $('#mindMeltRecordSeconds').addEventListener('change', (event) => {
      state.quickSeconds = Number(event.target.value) || 12;
      syncRecordButton();
    });
    $('#mindMeltQuickRecord').addEventListener('click', toggleQuickRecord);
    $('#mindMeltGo').addEventListener('click', mindMelt);
    $('#mindMeltReset').addEventListener('click', resetQuickLayer);

    if (!state.syncTimer) state.syncTimer = window.setInterval(syncRecordButton, 250);
    syncRecordButton();
    return true;
  }

  function install() {
    if (!composer()?.state || !runtime()?.state || !$('#kineticRotationPanel')) return false;
    if (!buildUi()) return false;

    window.domistikaMindMeltV0917 = {
      version: VERSION,
      state,
      slowTrails,
      kaleidoQuick,
      orbitQuick,
      setBlackStage,
      startQuickRecord,
      stopQuickRecord,
      mindMelt,
      reset: resetQuickLayer,
    };
    document.documentElement.dataset.mindMelt = VERSION;
    window.dispatchEvent(new CustomEvent('domistika:mind-melt-ready', { detail: { version: VERSION } }));
    return true;
  }

  function wait(attempt = 0) {
    if (install()) return;
    if (attempt < 1200) requestAnimationFrame(() => wait(attempt + 1));
  }

  window.addEventListener('domistika:kinetic-composer-ready', () => requestAnimationFrame(() => wait()), { once: true });
  wait();
}
