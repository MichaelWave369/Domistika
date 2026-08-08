const VERSION = '0.9.14';
const INSTALL_FLAG = '__domistikaKineticExpansionV0914Installed';

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;

  const state = {
    playing: false,
    visible: false,
    frameId: 0,
    lastTime: 0,
    phaseTime: 0,
    source: null,
    background: null,
    selectionLayer: null,
    displayCanvas: null,
    baseFrame: null,
    selectionOverlay: null,
    selectionDraft: null,
    selection: null,
    sourceMode: 'rings-3',
    pivot: null,
    tunnel: { enabled: false, echoes: 6, scale: 0.82, rotation: 14, fade: 0.55 },
    recorder: { active: false, mediaRecorder: null, chunks: [], fps: 30, maxSeconds: 20, timer: null },
    audioProvider: null,
    audioReactive: false,
    audioSensitivity: 1,
    visualFilter: 'none',
    overlayPointerEvents: '',
    selectionCanvasVisibility: '',
  };

  const $ = (selector) => document.querySelector(selector);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const engine = () => window.__domistikaEngine || null;
  const kinetic = () => window.domistikaKineticRotationV0912 || null;
  const motion = () => kinetic()?.state || null;
  const status = (message) => window.__domistikaStatus?.(message);

  function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
  }

  function copyCanvas(source) {
    const canvas = createCanvas(source.width, source.height);
    canvas.getContext('2d').drawImage(source, 0, 0);
    return canvas;
  }

  function ensureCanvases() {
    const active = engine();
    const artboard = $('#artboard');
    const overlay = $('#overlay');
    if (!active || !artboard || !overlay) return false;

    if (!state.displayCanvas?.isConnected) {
      const canvas = document.createElement('canvas');
      canvas.id = 'kineticExpansionCanvas';
      canvas.className = 'kinetic-expansion-canvas';
      canvas.hidden = true;
      artboard.insertBefore(canvas, overlay);
      state.displayCanvas = canvas;
    }

    if (!state.selectionOverlay?.isConnected) {
      const canvas = document.createElement('canvas');
      canvas.id = 'kineticRegionOverlay';
      canvas.className = 'kinetic-region-overlay';
      canvas.style.pointerEvents = 'none';
      artboard.appendChild(canvas);
      state.selectionOverlay = canvas;
      bindRegionSelection();
    }

    for (const canvas of [state.displayCanvas, state.selectionOverlay]) {
      if (canvas.width !== active.width) canvas.width = active.width;
      if (canvas.height !== active.height) canvas.height = active.height;
      canvas.style.width = `${active.width}px`;
      canvas.style.height = `${active.height}px`;
    }

    if (!state.baseFrame || state.baseFrame.width !== active.width || state.baseFrame.height !== active.height) {
      state.baseFrame = createCanvas(active.width, active.height);
    }
    return true;
  }

  function injectStyles() {
    if ($('#kineticExpansionStyles')) return;
    const style = document.createElement('style');
    style.id = 'kineticExpansionStyles';
    style.textContent = `
      .kinetic-expansion-canvas{position:absolute;inset:0;z-index:7;width:100%;height:100%;pointer-events:none;transform-origin:50% 50%}
      .kinetic-region-overlay{position:absolute;inset:0;z-index:1005;width:100%;height:100%;touch-action:none;cursor:crosshair}
      .kinetic-advanced{display:grid;gap:10px;padding-top:10px;border-top:1px solid var(--line)}
      .kinetic-advanced h3{margin:0;font-size:12px}.kinetic-advanced p{margin:0;color:var(--muted);font-size:10px;line-height:1.45}
      .kinetic-advanced-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.kinetic-advanced-grid label{display:grid;gap:5px;color:var(--muted);font-size:10px}.kinetic-advanced-grid output{justify-self:end;color:var(--ink)}
      .kinetic-preset-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.kinetic-preset-grid button,.kinetic-advanced button,.kinetic-advanced select{border:1px solid var(--line);border-radius:9px;background:var(--panel2);color:var(--ink);padding:8px;cursor:pointer}
      .kinetic-advanced button.active{background:rgba(127,90,240,.16);border-color:rgba(127,90,240,.5)}.kinetic-advanced button.recording{background:rgba(255,76,108,.15);border-color:rgba(255,76,108,.55);color:#ff9caf}
      .kinetic-inline{display:flex;flex-wrap:wrap;gap:6px}.kinetic-inline>*{flex:1 1 105px}.kinetic-region-readout{padding:8px;border:1px dashed var(--line);border-radius:9px;color:var(--muted);font-size:10px}
      .artboard.kinetic-expanded-preview .paint-layer{visibility:hidden}.artboard.kinetic-expanded-preview #kineticRotationStage{display:none!important}
      @media(max-width:900px){.kinetic-advanced-grid,.kinetic-preset-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function currentPivot() {
    const active = engine();
    if (!active) return { x: 0, y: 0 };
    return state.pivot || { x: active.width / 2, y: active.height / 2 };
  }

  function setPivot(x, y, announce = true) {
    const active = engine();
    if (!active) return;
    state.pivot = {
      x: clamp(Number(x), 0, active.width),
      y: clamp(Number(y), 0, active.height),
    };
    syncPivotUi();
    if (state.visible) renderFrame();
    if (announce) status(`Kinetic pivot set to ${Math.round(state.pivot.x)}, ${Math.round(state.pivot.y)}`);
  }

  function resetPivot() {
    const active = engine();
    if (!active) return;
    setPivot(active.width / 2, active.height / 2, false);
    status('Kinetic pivot reset to canvas center');
  }

  function alphaCentroid(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    const stride = Math.max(1, Math.floor(Math.max(width, height) / 520));
    let sumX = 0;
    let sumY = 0;
    let weight = 0;
    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const alpha = data[(y * width + x) * 4 + 3] / 255;
        if (alpha < 0.04) continue;
        sumX += x * alpha;
        sumY += y * alpha;
        weight += alpha;
      }
    }
    return weight > 0 ? { x: sumX / weight, y: sumY / weight } : { x: width / 2, y: height / 2 };
  }

  function autoCenter() {
    if (!state.source) refreshSource(false);
    if (!state.source) return;
    const center = alphaCentroid(state.selectionLayer || state.source);
    setPivot(center.x, center.y, false);
    status(`Mandala center found at ${Math.round(center.x)}, ${Math.round(center.y)}`);
  }

  function centerOnSelection() {
    if (!state.selection) return status('Pick a Motion Region first');
    setPivot(state.selection.x + state.selection.width / 2, state.selection.y + state.selection.height / 2, false);
    status('Kinetic pivot centered on Motion Region');
  }

  function normalizedRect(a, b) {
    const active = engine();
    const x = clamp(Math.min(a.x, b.x), 0, active.width);
    const y = clamp(Math.min(a.y, b.y), 0, active.height);
    const right = clamp(Math.max(a.x, b.x), 0, active.width);
    const bottom = clamp(Math.max(a.y, b.y), 0, active.height);
    return { x, y, width: right - x, height: bottom - y };
  }

  function overlayPoint(event) {
    const canvas = state.selectionOverlay;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / rect.width,
      y: (event.clientY - rect.top) * canvas.height / rect.height,
    };
  }

  function drawRegionOverlay(rect = state.selection) {
    const canvas = state.selectionOverlay;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!rect) return;
    ctx.save();
    ctx.fillStyle = 'rgba(127,90,240,.11)';
    ctx.strokeStyle = 'rgba(255,191,105,.95)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 9]);
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }

  function bindRegionSelection() {
    const canvas = state.selectionOverlay;
    if (!canvas || canvas.dataset.bound === '1') return;
    canvas.dataset.bound = '1';
    canvas.addEventListener('pointerdown', (event) => {
      if (canvas.style.pointerEvents === 'none') return;
      const point = overlayPoint(event);
      state.selectionDraft = { pointerId: event.pointerId, start: point, current: point };
      canvas.setPointerCapture(event.pointerId);
      drawRegionOverlay(normalizedRect(point, point));
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!state.selectionDraft || state.selectionDraft.pointerId !== event.pointerId) return;
      state.selectionDraft.current = overlayPoint(event);
      drawRegionOverlay(normalizedRect(state.selectionDraft.start, state.selectionDraft.current));
    });
    const finish = (event) => {
      if (!state.selectionDraft || state.selectionDraft.pointerId !== event.pointerId) return;
      const rect = normalizedRect(state.selectionDraft.start, state.selectionDraft.current);
      state.selectionDraft = null;
      canvas.style.pointerEvents = 'none';
      if (rect.width < 4 || rect.height < 4) {
        drawRegionOverlay();
        return status('Motion Region was too small');
      }
      state.selection = rect;
      state.sourceMode = 'selection';
      $('#kineticAdvancedMode').value = 'selection';
      buildSelectionLayers();
      drawRegionOverlay(rect);
      updateRegionReadout();
      centerOnSelection();
      status(`Motion Region selected: ${Math.round(rect.width)} × ${Math.round(rect.height)} px`);
    };
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
  }

  function beginRegionSelection() {
    if (!ensureCanvases()) return;
    if (state.visible) pause();
    state.selectionOverlay.hidden = false;
    state.selectionOverlay.style.pointerEvents = 'auto';
    drawRegionOverlay(state.selection);
    status('Drag a rectangle around the part you want to spin');
  }

  function clearRegion() {
    state.selection = null;
    state.selectionLayer = null;
    state.background = null;
    drawRegionOverlay();
    updateRegionReadout();
    if (state.sourceMode === 'selection') {
      state.sourceMode = 'rings-3';
      const input = $('#kineticAdvancedMode');
      if (input) input.value = 'rings-3';
    }
    status('Motion Region cleared');
  }

  function buildSelectionLayers() {
    if (!state.source || !state.selection) return;
    const { x, y, width, height } = state.selection;
    state.background = copyCanvas(state.source);
    state.background.getContext('2d').clearRect(x, y, width, height);
    state.selectionLayer = createCanvas(state.source.width, state.source.height);
    state.selectionLayer.getContext('2d').drawImage(state.source, x, y, width, height, x, y, width, height);
  }

  function refreshSource(announce = true) {
    const active = engine();
    if (!active || !ensureCanvases()) return false;
    state.source = active.compositeCanvas(false);
    if (state.selection) buildSelectionLayers();
    if (!state.pivot) resetPivot();
    if (announce) status('Kinetic performance source refreshed');
    renderFrame();
    return true;
  }

  function showPreview() {
    const active = engine();
    const artboard = $('#artboard');
    const overlay = $('#overlay');
    if (!active || !artboard || !overlay || !ensureCanvases()) return false;
    if (!state.source && !refreshSource(false)) return false;

    kinetic()?.pause?.();
    if (motion()?.stage) motion().stage.style.display = 'none';
    state.visible = true;
    state.displayCanvas.hidden = false;
    artboard.classList.add('kinetic-expanded-preview');
    artboard.classList.add('kinetic-previewing');

    if (!overlay.dataset.kineticExpansionSaved) {
      state.overlayPointerEvents = overlay.style.pointerEvents || '';
      overlay.dataset.kineticExpansionSaved = '1';
    }
    overlay.style.pointerEvents = 'none';

    const selectionCanvas = $('#v04SelectionCanvas');
    if (selectionCanvas && !selectionCanvas.dataset.kineticExpansionSaved) {
      state.selectionCanvasVisibility = selectionCanvas.style.visibility || '';
      selectionCanvas.dataset.kineticExpansionSaved = '1';
      selectionCanvas.style.visibility = 'hidden';
    }
    $('#kineticOpen')?.classList.add('active');
    renderFrame();
    syncStatus();
    return true;
  }

  function hidePreview() {
    const artboard = $('#artboard');
    const overlay = $('#overlay');
    state.visible = false;
    state.playing = false;
    cancelAnimationFrame(state.frameId);
    state.frameId = 0;
    state.lastTime = 0;
    if (state.displayCanvas) state.displayCanvas.hidden = true;
    artboard?.classList.remove('kinetic-expanded-preview');
    artboard?.classList.remove('kinetic-previewing');
    if (overlay?.dataset.kineticExpansionSaved) {
      overlay.style.pointerEvents = state.overlayPointerEvents;
      delete overlay.dataset.kineticExpansionSaved;
    }
    const selectionCanvas = $('#v04SelectionCanvas');
    if (selectionCanvas?.dataset.kineticExpansionSaved) {
      selectionCanvas.style.visibility = state.selectionCanvasVisibility;
      delete selectionCanvas.dataset.kineticExpansionSaved;
    }
    if (motion()?.stage) motion().stage.style.display = '';
    $('#kineticOpen')?.classList.remove('active');
    syncStatus();
  }

  function audioLevels() {
    if (!state.audioReactive || typeof state.audioProvider !== 'function') return { low: 0, mid: 0, high: 0 };
    try {
      const levels = state.audioProvider() || {};
      return {
        low: clamp(Number(levels.low) || 0, 0, 1),
        mid: clamp(Number(levels.mid) || 0, 0, 1),
        high: clamp(Number(levels.high) || 0, 0, 1),
      };
    } catch {
      return { low: 0, mid: 0, high: 0 };
    }
  }

  function dynamicMotion() {
    const base = motion();
    const levels = audioLevels();
    const sensitivity = state.audioSensitivity;
    return {
      outer: (base?.speeds.outer || 0) + levels.low * 22 * sensitivity,
      middle: (base?.speeds.middle || 0) + (levels.mid - 0.3) * 44 * sensitivity,
      center: (base?.speeds.center || 0) + levels.high * 78 * sensitivity,
      pulse: (base?.pulse || 0) + levels.low * 7 * sensitivity,
      hueSpeed: (base?.hueSpeed || 0) + levels.high * 35 * sensitivity,
      levels,
    };
  }

  function drawTransformedSource(ctx, source, angleDegrees, scale, filter = 'none') {
    if (!source) return;
    const pivot = currentPivot();
    ctx.save();
    ctx.translate(pivot.x, pivot.y);
    ctx.rotate(angleDegrees * Math.PI / 180);
    ctx.scale(scale, scale);
    ctx.translate(-pivot.x, -pivot.y);
    ctx.filter = filter;
    ctx.drawImage(source, 0, 0);
    ctx.restore();
  }

  function radialClip(ctx, band, innerRadius, middleRadius) {
    const active = engine();
    const pivot = currentPivot();
    const corners = [[0,0],[active.width,0],[0,active.height],[active.width,active.height]];
    const maxRadius = Math.max(...corners.map(([x,y]) => Math.hypot(x - pivot.x, y - pivot.y)));
    const r1 = maxRadius * clamp(innerRadius, 5, 90) / 100;
    const r2 = maxRadius * clamp(middleRadius, innerRadius + 1, 98) / 100;
    ctx.beginPath();
    if (band === 'center') {
      ctx.arc(pivot.x, pivot.y, r1, 0, Math.PI * 2);
    } else if (band === 'middle') {
      ctx.arc(pivot.x, pivot.y, r2, 0, Math.PI * 2);
      ctx.arc(pivot.x, pivot.y, r1, 0, Math.PI * 2);
    } else {
      ctx.rect(0, 0, active.width, active.height);
      ctx.arc(pivot.x, pivot.y, r2, 0, Math.PI * 2);
    }
    ctx.clip(band === 'center' ? 'nonzero' : 'evenodd');
  }

  function renderBaseFrame() {
    if (!state.source || !state.baseFrame) return;
    const base = motion();
    const dyn = dynamicMotion();
    const ctx = state.baseFrame.getContext('2d');
    const width = state.baseFrame.width;
    const height = state.baseFrame.height;
    ctx.clearRect(0, 0, width, height);

    const pulseRate = base?.pulseRate || 0.22;
    const pulseScale = 1 + (dyn.pulse / 100) * Math.sin(state.phaseTime * Math.PI * 2 * pulseRate);
    const hue = state.phaseTime * dyn.hueSpeed;
    let filter = `hue-rotate(${hue}deg)`;
    if (state.visualFilter === 'invert') filter += ' invert(1)';
    if (state.visualFilter === 'contrast') filter += ' contrast(1.45) saturate(1.3)';

    if (state.sourceMode === 'selection' && state.selection && state.selectionLayer) {
      ctx.drawImage(state.background || state.source, 0, 0);
      drawTransformedSource(ctx, state.selectionLayer, state.angles?.selection || 0, pulseScale, filter);
      return;
    }

    if (state.sourceMode === 'whole') {
      drawTransformedSource(ctx, state.source, state.angles?.center || 0, pulseScale, filter);
      return;
    }

    const inner = base?.innerRadius || 34;
    const middle = base?.middleRadius || 68;
    const bands = [
      ['outer', state.angles?.outer || 0],
      ['middle', state.angles?.middle || 0],
      ['center', state.angles?.center || 0],
    ];
    for (const [band, angle] of bands) {
      ctx.save();
      radialClip(ctx, band, inner, middle);
      drawTransformedSource(ctx, state.source, angle, pulseScale, filter);
      ctx.restore();
    }
  }

  function drawTunnel(ctx) {
    const pivot = currentPivot();
    ctx.clearRect(0, 0, state.displayCanvas.width, state.displayCanvas.height);
    ctx.drawImage(state.baseFrame, 0, 0);
    if (!state.tunnel.enabled) return;
    for (let index = 1; index <= state.tunnel.echoes; index += 1) {
      const scale = Math.pow(state.tunnel.scale, index);
      const alpha = Math.pow(state.tunnel.fade, index);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(pivot.x, pivot.y);
      ctx.rotate(state.tunnel.rotation * index * Math.PI / 180);
      ctx.scale(scale, scale);
      ctx.translate(-pivot.x, -pivot.y);
      ctx.drawImage(state.baseFrame, 0, 0);
      ctx.restore();
    }
  }

  function renderFrame() {
    if (!state.source || !ensureCanvases()) return;
    renderBaseFrame();
    drawTunnel(state.displayCanvas.getContext('2d'));
    updateAudioMeters();
  }

  state.angles = { outer: 0, middle: 0, center: 0, selection: 0 };

  function frame(now) {
    if (!state.playing) return;
    const dt = state.lastTime ? Math.min(0.05, (now - state.lastTime) / 1000) : 0;
    state.lastTime = now;
    state.phaseTime += dt;
    const dyn = dynamicMotion();
    state.angles.outer += dyn.outer * dt;
    state.angles.middle += dyn.middle * dt;
    state.angles.center += dyn.center * dt;
    state.angles.selection += dyn.center * dt;
    renderFrame();
    state.frameId = requestAnimationFrame(frame);
  }

  function play() {
    if (!showPreview()) return;
    if (state.playing) return;
    state.playing = true;
    state.lastTime = 0;
    state.frameId = requestAnimationFrame(frame);
    syncStatus();
    status(state.audioReactive ? 'Kinetic performance playing — audio reactive' : 'Kinetic performance playing');
  }

  function pause() {
    state.playing = false;
    cancelAnimationFrame(state.frameId);
    state.frameId = 0;
    state.lastTime = 0;
    syncStatus();
    status('Kinetic performance paused');
  }

  function stop() {
    if (state.recorder.active) stopRecording();
    hidePreview();
    status('Kinetic performance stopped — original artwork unchanged');
  }

  function reverse() {
    const base = motion();
    if (!base) return;
    Object.keys(base.speeds).forEach((key) => { base.speeds[key] *= -1; });
    syncBaseSpeedInputs();
    status('Kinetic performance direction reversed');
  }

  function resetAngles() {
    state.angles = { outer: 0, middle: 0, center: 0, selection: 0 };
    state.phaseTime = 0;
    renderFrame();
    status('Kinetic performance angles reset');
  }

  function syncBaseSpeedInputs() {
    const base = motion();
    if (!base) return;
    const pairs = {
      kineticOuterSpeed: base.speeds.outer,
      kineticMiddleSpeed: base.speeds.middle,
      kineticCenterSpeed: base.speeds.center,
      kineticPulse: base.pulse,
      kineticPulseRate: base.pulseRate,
      kineticHueSpeed: base.hueSpeed,
      kineticInnerRadius: base.innerRadius,
      kineticMiddleRadius: base.middleRadius,
    };
    for (const [id, value] of Object.entries(pairs)) {
      const input = $(`#${id}`);
      if (!input) continue;
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  const PRESETS = {
    'slow-drift': { speeds: { outer: 2, middle: -3, center: 6 }, pulse: 0.8, pulseRate: 0.12, hueSpeed: 1, tunnel: false, filter: 'none' },
    portal: { speeds: { outer: 9, middle: -18, center: 36 }, pulse: 3, pulseRate: 0.369, hueSpeed: 6, tunnel: true, echoes: 5, scale: 0.84, rotation: 9, fade: 0.58, filter: 'none' },
    chaos: { speeds: { outer: 47, middle: -91, center: 143 }, pulse: 5.5, pulseRate: 0.93, hueSpeed: 26, tunnel: true, echoes: 7, scale: 0.78, rotation: -17, fade: 0.5, filter: 'contrast' },
    hypnosis: { speeds: { outer: 5, middle: -8, center: 13 }, pulse: 2.2, pulseRate: 0.22, hueSpeed: 3, tunnel: true, echoes: 8, scale: 0.86, rotation: 6, fade: 0.63, filter: 'none' },
    'inversion-storm': { speeds: { outer: -33, middle: 66, center: -132 }, pulse: 4.2, pulseRate: 0.66, hueSpeed: 44, tunnel: true, echoes: 9, scale: 0.8, rotation: 21, fade: 0.52, filter: 'invert' },
    'bass-bloom': { speeds: { outer: 4, middle: -7, center: 12 }, pulse: 1.5, pulseRate: 0.3, hueSpeed: 2, tunnel: true, echoes: 6, scale: 0.84, rotation: 8, fade: 0.56, filter: 'none', audio: true, sensitivity: 1.45 },
  };

  function applyPreset(name) {
    const preset = PRESETS[name];
    const base = motion();
    if (!preset || !base) return;
    Object.assign(base.speeds, preset.speeds);
    base.pulse = preset.pulse;
    base.pulseRate = preset.pulseRate;
    base.hueSpeed = preset.hueSpeed;
    state.tunnel.enabled = preset.tunnel;
    if (preset.echoes != null) state.tunnel.echoes = preset.echoes;
    if (preset.scale != null) state.tunnel.scale = preset.scale;
    if (preset.rotation != null) state.tunnel.rotation = preset.rotation;
    if (preset.fade != null) state.tunnel.fade = preset.fade;
    state.visualFilter = preset.filter || 'none';
    if (preset.sensitivity != null) state.audioSensitivity = preset.sensitivity;
    if (preset.audio) state.audioReactive = Boolean(state.audioProvider);
    syncBaseSpeedInputs();
    syncAdvancedInputs();
    showPreview();
    renderFrame();
    status(`${name.replace(/-/g, ' ')} performance preset loaded`);
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

  function startRecording() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      return status('Motion recording is unavailable in this browser');
    }
    if (!showPreview()) return;
    if (!state.playing) play();
    if (state.recorder.active) return;
    const fps = clamp(Number($('#kineticRecordFps')?.value) || 30, 10, 60);
    const maxSeconds = clamp(Number($('#kineticRecordSeconds')?.value) || 20, 2, 180);
    state.recorder.fps = fps;
    state.recorder.maxSeconds = maxSeconds;
    const stream = state.displayCanvas.captureStream(fps);
    const mimeType = preferredMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    state.recorder.chunks = [];
    state.recorder.mediaRecorder = recorder;
    recorder.ondataavailable = (event) => { if (event.data?.size) state.recorder.chunks.push(event.data); };
    recorder.onstop = () => {
      const blob = new Blob(state.recorder.chunks, { type: mimeType || 'video/webm' });
      const name = ($('#projectName')?.value || 'domistika-motion').trim().replace(/[^a-z0-9_-]+/gi, '-');
      downloadBlob(blob, `${name}-kinetic.webm`);
      state.recorder.active = false;
      state.recorder.mediaRecorder = null;
      clearTimeout(state.recorder.timer);
      state.recorder.timer = null;
      syncRecorderUi();
      status('Kinetic motion video exported');
    };
    recorder.start(250);
    state.recorder.active = true;
    state.recorder.timer = setTimeout(() => stopRecording(), maxSeconds * 1000);
    syncRecorderUi();
    status(`Recording kinetic motion at ${fps} fps`);
  }

  function stopRecording() {
    if (!state.recorder.active || !state.recorder.mediaRecorder) return;
    clearTimeout(state.recorder.timer);
    state.recorder.timer = null;
    if (state.recorder.mediaRecorder.state !== 'inactive') state.recorder.mediaRecorder.stop();
  }

  function exportStill() {
    if (!showPreview()) return;
    renderFrame();
    state.displayCanvas.toBlob((blob) => {
      if (!blob) return;
      const name = ($('#projectName')?.value || 'domistika-motion').trim().replace(/[^a-z0-9_-]+/gi, '-');
      downloadBlob(blob, `${name}-kinetic-frame.png`);
      status('Kinetic frame exported');
    }, 'image/png');
  }

  function setAudioProvider(provider) {
    state.audioProvider = typeof provider === 'function' ? provider : null;
    state.audioReactive = Boolean(state.audioProvider);
    syncAdvancedInputs();
  }

  function clearAudioProvider() {
    state.audioProvider = null;
    state.audioReactive = false;
    syncAdvancedInputs();
  }

  function updateAudioMeters() {
    const levels = audioLevels();
    ['low', 'mid', 'high'].forEach((key) => {
      const meter = $(`#kineticAudio${key[0].toUpperCase()}${key.slice(1)}`);
      if (meter) meter.value = levels[key];
    });
  }

  function syncPivotUi() {
    const active = engine();
    if (!active) return;
    const pivot = currentPivot();
    const x = $('#kineticPivotX');
    const y = $('#kineticPivotY');
    if (x) { x.max = String(active.width); x.value = String(Math.round(pivot.x)); }
    if (y) { y.max = String(active.height); y.value = String(Math.round(pivot.y)); }
    const readout = $('#kineticPivotReadout');
    if (readout) readout.textContent = `${Math.round(pivot.x)}, ${Math.round(pivot.y)}`;
  }

  function updateRegionReadout() {
    const node = $('#kineticRegionReadout');
    if (!node) return;
    node.textContent = state.selection
      ? `${Math.round(state.selection.x)}, ${Math.round(state.selection.y)} · ${Math.round(state.selection.width)} × ${Math.round(state.selection.height)} px`
      : 'No Motion Region selected';
  }

  function syncRecorderUi() {
    const button = $('#kineticRecord');
    if (!button) return;
    button.textContent = state.recorder.active ? '■ Stop & export' : '● Record WebM';
    button.classList.toggle('recording', state.recorder.active);
  }

  function syncStatus() {
    const badge = $('#kineticState');
    if (badge) badge.textContent = state.playing ? 'PLAYING+' : state.visible ? 'PAUSED+' : 'OFF';
    $('#kineticAdvancedPlay')?.classList.toggle('active', state.playing);
  }

  function syncAdvancedInputs() {
    const mode = $('#kineticAdvancedMode');
    if (mode) mode.value = state.sourceMode;
    const tunnel = $('#kineticTunnelEnabled');
    if (tunnel) tunnel.checked = state.tunnel.enabled;
    const audio = $('#kineticAudioReactive');
    if (audio) audio.checked = state.audioReactive;
    const mappings = {
      kineticTunnelEchoes: state.tunnel.echoes,
      kineticTunnelScale: state.tunnel.scale,
      kineticTunnelRotation: state.tunnel.rotation,
      kineticTunnelFade: state.tunnel.fade,
      kineticAudioSensitivity: state.audioSensitivity,
    };
    for (const [id, value] of Object.entries(mappings)) {
      const input = $(`#${id}`);
      if (!input) continue;
      input.value = String(value);
      const out = document.querySelector(`[data-kinetic-plus-output="${id}"]`);
      if (out) out.textContent = `${input.value}${input.dataset.suffix || ''}`;
    }
    syncPivotUi();
    updateRegionReadout();
    syncRecorderUi();
    syncStatus();
  }

  function bindAdvancedRange(id, setter) {
    const input = $(`#${id}`);
    if (!input) return;
    input.addEventListener('input', () => {
      setter(Number(input.value));
      const out = document.querySelector(`[data-kinetic-plus-output="${id}"]`);
      if (out) out.textContent = `${input.value}${input.dataset.suffix || ''}`;
      if (state.visible) renderFrame();
    });
  }

  function interceptBaseControls() {
    const intercept = (id, handler) => {
      const node = $(`#${id}`);
      if (!node || node.dataset.kineticExpandedIntercept === '1') return;
      node.dataset.kineticExpandedIntercept = '1';
      node.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        handler();
      }, true);
    };
    intercept('kineticPlay', play);
    intercept('kineticPause', pause);
    intercept('kineticStop', stop);
    intercept('kineticRefresh', () => refreshSource(true));
    intercept('kineticReverse', reverse);
    intercept('kineticReset', resetAngles);
    intercept('kinetic369', () => applyPreset('portal'));
    intercept('kineticRandom', () => {
      const base = motion();
      if (!base) return;
      base.speeds.outer = Math.round(-45 + Math.random() * 90);
      base.speeds.middle = Math.round(-90 + Math.random() * 180);
      base.speeds.center = Math.round(-150 + Math.random() * 300);
      base.pulse = Number((Math.random() * 6).toFixed(1));
      base.pulseRate = Number((0.1 + Math.random() * 0.9).toFixed(2));
      base.hueSpeed = Math.round(-24 + Math.random() * 48);
      state.tunnel.enabled = Math.random() > 0.45;
      state.tunnel.echoes = 3 + Math.floor(Math.random() * 8);
      state.tunnel.rotation = Math.round(-24 + Math.random() * 48);
      state.visualFilter = Math.random() > 0.82 ? 'contrast' : 'none';
      syncBaseSpeedInputs();
      syncAdvancedInputs();
      showPreview();
      renderFrame();
      status('Random kinetic performance generated');
    });
  }

  function buildUi() {
    const panel = $('#kineticRotationPanel .kinetic-shell');
    if (!panel || $('#kineticAdvancedSection')) return false;
    injectStyles();
    ensureCanvases();

    const section = document.createElement('div');
    section.id = 'kineticAdvancedSection';
    section.className = 'kinetic-advanced';
    section.innerHTML = `
      <h3>⚡ Kinetic Expansion v0.9.14</h3>
      <p>Selection spin, intelligent pivots, recursive tunnels, recording, presets, and audio-reactive performance.</p>

      <div class="kinetic-advanced-grid">
        <label>Source mode<select id="kineticAdvancedMode"><option value="rings-3">Three radial bands</option><option value="whole">Whole artwork</option><option value="selection">Motion Region only</option></select></label>
        <label>Audio sensitivity <output data-kinetic-plus-output="kineticAudioSensitivity"></output><input id="kineticAudioSensitivity" data-suffix="×" type="range" min="0.1" max="3" step="0.05"></label>
      </div>

      <div class="kinetic-inline"><button id="kineticPickRegion">▣ Pick Motion Region</button><button id="kineticClearRegion">Clear region</button><button id="kineticCenterSelection">Center on region</button></div>
      <div id="kineticRegionReadout" class="kinetic-region-readout">No Motion Region selected</div>

      <h3>Mandala pivot</h3>
      <div class="kinetic-inline"><button id="kineticAutoCenter">◎ Find art center</button><button id="kineticResetPivot">Canvas center</button></div>
      <div class="kinetic-advanced-grid"><label>Pivot X <input id="kineticPivotX" type="range" min="0" max="1600" step="1"></label><label>Pivot Y <input id="kineticPivotY" type="range" min="0" max="1200" step="1"></label></div>
      <div id="kineticPivotReadout" class="kinetic-region-readout">center</div>

      <h3>Mirror Tunnel</h3>
      <label class="kinetic-inline"><span><input id="kineticTunnelEnabled" type="checkbox"> Recursive echo tunnel</span></label>
      <div class="kinetic-advanced-grid">
        <label>Echoes <output data-kinetic-plus-output="kineticTunnelEchoes"></output><input id="kineticTunnelEchoes" type="range" min="1" max="16" step="1"></label>
        <label>Scale decay <output data-kinetic-plus-output="kineticTunnelScale"></output><input id="kineticTunnelScale" data-suffix="×" type="range" min="0.55" max="0.96" step="0.01"></label>
        <label>Rotation offset <output data-kinetic-plus-output="kineticTunnelRotation"></output><input id="kineticTunnelRotation" data-suffix="°" type="range" min="-45" max="45" step="1"></label>
        <label>Alpha decay <output data-kinetic-plus-output="kineticTunnelFade"></output><input id="kineticTunnelFade" data-suffix="×" type="range" min="0.2" max="0.9" step="0.01"></label>
      </div>

      <h3>Performance presets</h3>
      <div class="kinetic-preset-grid">
        <button data-kinetic-preset="slow-drift">Slow Drift</button><button data-kinetic-preset="portal">Portal 3·6·9</button>
        <button data-kinetic-preset="chaos">Chaos</button><button data-kinetic-preset="hypnosis">Hypnosis</button>
        <button data-kinetic-preset="inversion-storm">Inversion Storm</button><button data-kinetic-preset="bass-bloom">Bass Bloom</button>
      </div>

      <h3>Audio Reactive</h3>
      <label class="kinetic-inline"><span><input id="kineticAudioReactive" type="checkbox"> React to connected audio</span></label>
      <div class="kinetic-advanced-grid">
        <label>Bass<meter id="kineticAudioLow" min="0" max="1" value="0"></meter></label>
        <label>Mids<meter id="kineticAudioMid" min="0" max="1" value="0"></meter></label>
        <label>Highs<meter id="kineticAudioHigh" min="0" max="1" value="0"></meter></label>
      </div>
      <div id="kineticAudioMount"></div>

      <h3>Motion Recorder</h3>
      <div class="kinetic-advanced-grid">
        <label>FPS<select id="kineticRecordFps"><option>24</option><option selected>30</option><option>60</option></select></label>
        <label>Max seconds<input id="kineticRecordSeconds" type="number" min="2" max="180" value="20"></label>
      </div>
      <div class="kinetic-inline"><button id="kineticRecord">● Record WebM</button><button id="kineticExportStill">Export PNG frame</button></div>
      <p>Recording captures the animated canvas exactly as rendered by the Kinetic Expansion. Stop restores the untouched Domistika artwork.</p>
    `;
    panel.appendChild(section);

    $('#kineticAdvancedMode').addEventListener('change', (event) => {
      state.sourceMode = event.target.value;
      if (state.sourceMode === 'selection' && !state.selection) {
        state.sourceMode = 'rings-3';
        event.target.value = 'rings-3';
        beginRegionSelection();
      }
      if (state.visible) renderFrame();
    });
    $('#kineticPickRegion').addEventListener('click', beginRegionSelection);
    $('#kineticClearRegion').addEventListener('click', clearRegion);
    $('#kineticCenterSelection').addEventListener('click', centerOnSelection);
    $('#kineticAutoCenter').addEventListener('click', autoCenter);
    $('#kineticResetPivot').addEventListener('click', resetPivot);
    $('#kineticPivotX').addEventListener('input', () => setPivot(Number($('#kineticPivotX').value), currentPivot().y, false));
    $('#kineticPivotY').addEventListener('input', () => setPivot(currentPivot().x, Number($('#kineticPivotY').value), false));
    $('#kineticTunnelEnabled').addEventListener('change', (event) => { state.tunnel.enabled = event.target.checked; if (state.visible) renderFrame(); });
    $('#kineticAudioReactive').addEventListener('change', (event) => {
      if (event.target.checked && !state.audioProvider) {
        event.target.checked = false;
        state.audioReactive = false;
        return status('Connect microphone or audio file first');
      }
      state.audioReactive = event.target.checked;
    });
    bindAdvancedRange('kineticTunnelEchoes', (value) => { state.tunnel.echoes = Math.round(value); });
    bindAdvancedRange('kineticTunnelScale', (value) => { state.tunnel.scale = value; });
    bindAdvancedRange('kineticTunnelRotation', (value) => { state.tunnel.rotation = value; });
    bindAdvancedRange('kineticTunnelFade', (value) => { state.tunnel.fade = value; });
    bindAdvancedRange('kineticAudioSensitivity', (value) => { state.audioSensitivity = value; });
    document.querySelectorAll('[data-kinetic-preset]').forEach((button) => button.addEventListener('click', () => applyPreset(button.dataset.kineticPreset)));
    $('#kineticRecord').addEventListener('click', () => state.recorder.active ? stopRecording() : startRecording());
    $('#kineticExportStill').addEventListener('click', exportStill);

    interceptBaseControls();
    refreshSource(false);
    syncAdvancedInputs();
    window.dispatchEvent(new CustomEvent('domistika:kinetic-expansion-ready', { detail: { version: VERSION } }));
    return true;
  }

  function install() {
    if (!engine() || !kinetic() || !$('#kineticRotationPanel')) return false;
    if (!buildUi()) return false;
    window.domistikaKineticExpansionV0914 = {
      version: VERSION,
      state,
      play,
      pause,
      stop,
      refresh: refreshSource,
      render: renderFrame,
      setPivot,
      resetPivot,
      autoCenter,
      centerOnSelection,
      beginRegionSelection,
      clearRegion,
      applyPreset,
      startRecording,
      stopRecording,
      exportStill,
      setAudioProvider,
      clearAudioProvider,
      setAudioReactive(enabled) { state.audioReactive = Boolean(enabled && state.audioProvider); syncAdvancedInputs(); },
    };
    window.domistikaKineticRuntime = window.domistikaKineticExpansionV0914;
    document.documentElement.dataset.kineticExpansion = VERSION;
    return true;
  }

  function wait(attempt = 0) {
    if (install()) return;
    if (attempt < 1200) requestAnimationFrame(() => wait(attempt + 1));
  }

  window.addEventListener('domistika:ready', () => requestAnimationFrame(() => wait()), { once: true });
  wait();
}
