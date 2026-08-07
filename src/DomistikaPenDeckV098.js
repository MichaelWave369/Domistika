import { CanvasEngine } from './core/CanvasEngine.js';

const INSTALL_FLAG = '__domistikaPenDeckV098Installed';
const VERSION = '0.9.8';

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;

  const runtime = {
    version: VERSION,
    connected: false,
    phase: 'idle',
    pointerType: 'mouse',
    pressure: 0,
    lastContactPressure: 0,
    maxPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    width: 0,
    height: 0,
    speed: 0,
    mirror: false,
    pressureGamma: 1,
    lastClientX: window.innerWidth / 2,
    lastClientY: window.innerHeight / 2,
    lastSeenAt: 0,
    previousSample: null,
  };

  window.domistikaPenDeck = runtime;

  // Improve the native Domistika pen path without adding a device-specific SDK.
  // PointerEvent remains the hardware boundary, so XP-Pen, Wacom, Surface Pen,
  // Apple Pencil (where supported), and other styluses can all use the same path.
  const originalEventPoint = CanvasEngine.prototype.eventPoint;
  CanvasEngine.prototype.eventPoint = function pendeckEventPoint(event) {
    const point = originalEventPoint.call(this, event);
    if (event.pointerType === 'pen' && this.settings.pressure) {
      const raw = Number.isFinite(event.pressure) ? event.pressure : 0;
      const gamma = Math.max(0.55, Math.min(1.8, Number(runtime.pressureGamma) || 1));
      point.pressure = Math.max(0.04, Math.min(1, Math.pow(Math.max(0, raw), gamma)));
      point.tiltX = Number(event.tiltX) || 0;
      point.tiltY = Number(event.tiltY) || 0;
      point.twist = Number(event.twist) || 0;
      point.pointerType = 'pen';
    }
    return point;
  };

  const originalPointerMove = CanvasEngine.prototype.pointerMove;
  CanvasEngine.prototype.pointerMove = function pendeckPointerMove(event) {
    if (event.pointerType !== 'pen' || typeof event.getCoalescedEvents !== 'function') {
      return originalPointerMove.call(this, event);
    }
    const samples = event.getCoalescedEvents();
    if (!samples?.length) return originalPointerMove.call(this, event);
    for (const sample of samples) originalPointerMove.call(this, sample);
  };

  // PenDeck mirror is deliberately orthogonal to Domistika's existing symmetry selector.
  // Example: Radial 12 + Mirror becomes 24 reflected transforms without replacing the
  // user's chosen radial mode.
  const originalSymmetryTransforms = CanvasEngine.prototype.symmetryTransforms;
  CanvasEngine.prototype.symmetryTransforms = function pendeckSymmetryTransforms() {
    const base = originalSymmetryTransforms.call(this);
    if (!runtime.mirror) return base;
    if (this.settings.symmetry === 'vertical' || this.settings.symmetry === 'quad') return base;
    const mirrorX = (point) => ({ ...point, x: this.width - point.x });
    return [
      ...base,
      ...base.map((transform) => (point) => mirrorX(transform(point))),
    ];
  };

  function injectStyles() {
    if (document.querySelector('#pendeckV098Styles')) return;
    const style = document.createElement('style');
    style.id = 'pendeckV098Styles';
    style.textContent = `
      #pendeckToggle.pendeck-pill{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
      #pendeckToggle .pendeck-dot{width:7px;height:7px;border-radius:50%;background:#697386;box-shadow:0 0 0 2px rgba(105,115,134,.18)}
      #pendeckToggle[data-phase="hover"] .pendeck-dot{background:#55e8d0;box-shadow:0 0 10px rgba(85,232,208,.55)}
      #pendeckToggle[data-phase="contact"] .pendeck-dot{background:#d9ff28;box-shadow:0 0 12px rgba(217,255,40,.7)}
      #pendeckToggle.active{border-color:rgba(85,232,208,.8)!important;box-shadow:inset 0 0 0 1px rgba(85,232,208,.18)}
      #pendeckPanel{position:fixed;z-index:2147482000;width:min(320px,calc(100vw - 24px));padding:12px;border:1px solid rgba(113,255,232,.2);border-radius:14px;background:rgba(10,12,18,.97);box-shadow:0 18px 50px rgba(0,0,0,.45);color:#e9f2f2;font:12px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;backdrop-filter:blur(16px)}
      #pendeckPanel[hidden]{display:none}
      #pendeckPanel .pd-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
      #pendeckPanel .pd-kicker{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#55e8d0;font-weight:800}
      #pendeckPanel .pd-title{font-size:15px;font-weight:800;margin-top:1px}
      #pendeckPanel .pd-close{border:0;background:#171c26;color:#aeb8c7;border-radius:8px;width:28px;height:28px;cursor:pointer}
      #pendeckPanel .pd-pressure{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin:8px 0 10px}
      #pendeckPanel .pd-track{height:9px;background:#1d2430;border-radius:99px;overflow:hidden;border:1px solid #2b3443}
      #pendeckPressureFill{height:100%;width:0;background:linear-gradient(90deg,#55e8d0,#d9ff28);transition:width 45ms linear}
      #pendeckPressureValue{font-variant-numeric:tabular-nums;font-weight:800;color:#d9ff28;min-width:42px;text-align:right}
      #pendeckPanel .pd-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}
      #pendeckPanel .pd-stat{background:#111721;border:1px solid #232d3b;border-radius:9px;padding:7px;min-width:0}
      #pendeckPanel .pd-stat span{display:block;color:#728094;font-size:9px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px}
      #pendeckPanel .pd-stat strong{font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}
      #pendeckPanel .pd-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}
      #pendeckPanel .pd-actions button,#pendeckPanel .pd-mini{border:1px solid #2a3443;background:#151b25;color:#dbe4ec;border-radius:9px;padding:7px 6px;cursor:pointer;font:inherit}
      #pendeckPanel .pd-actions button:hover,#pendeckPanel .pd-mini:hover{border-color:#55e8d0}
      #pendeckPanel .pd-actions button.active{background:rgba(85,232,208,.12);border-color:#55e8d0;color:#7ff8e5}
      #pendeckPanel .pd-curve{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;margin:10px 0 8px}
      #pendeckPanel input[type="range"]{width:100%}
      #pendeckPanel details{border-top:1px solid #222b38;padding-top:8px;margin-top:8px;color:#aab5c3}
      #pendeckPanel summary{cursor:pointer;color:#dce7ef;font-weight:700}
      #pendeckPanel .pd-map{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin-top:7px}
      #pendeckPanel kbd{background:#202836;border:1px solid #344052;border-bottom-width:2px;border-radius:5px;padding:1px 5px;color:#fff;font-size:10px}
      #pendeckPanel .pd-note{color:#8190a3;font-size:10px;margin-top:8px}
      #pendeckRadial{position:fixed;z-index:2147483000;width:224px;height:224px;transform:translate(-50%,-50%);pointer-events:none}
      #pendeckRadial[hidden]{display:none}
      #pendeckRadial::before{content:"";position:absolute;inset:42px;border-radius:50%;background:radial-gradient(circle,rgba(15,20,29,.98) 0 37%,rgba(10,14,21,.94) 38% 68%,rgba(85,232,208,.13) 69% 70%,transparent 71%);box-shadow:0 15px 45px rgba(0,0,0,.48)}
      #pendeckRadial button{position:absolute;left:50%;top:50%;width:58px;height:38px;margin:-19px -29px;border-radius:11px;border:1px solid #334052;background:#121823;color:#e8f0f3;font:700 10px/1 system-ui;cursor:pointer;pointer-events:auto;box-shadow:0 4px 18px rgba(0,0,0,.3)}
      #pendeckRadial button:hover{border-color:#55e8d0;color:#7ff8e5;background:#17222b}
      #pendeckRadial .pd-radial-center{width:52px;height:52px;margin:-26px;border-radius:50%;border-color:#55e8d0;background:#0d151b;color:#55e8d0;font-size:11px}
      @media (max-width:720px){#pendeckPanel{font-size:11px}#pendeckPanel .pd-grid{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function setStatus(message) {
    const target = document.querySelector('#statusMessage');
    if (target) target.textContent = message;
  }

  function setInputValue(selector, value) {
    const input = document.querySelector(selector);
    if (!input) return false;
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function click(selector) {
    const target = document.querySelector(selector);
    if (!target) return false;
    target.click();
    return true;
  }

  function selectTool(tool) {
    return click(`[data-tool="${tool}"]`);
  }

  function cycleSymmetry() {
    const select = document.querySelector('#symmetryInput');
    if (!select || !select.options.length) return false;
    const options = [...select.options].filter((option) => !option.disabled);
    const current = Math.max(0, options.findIndex((option) => option.value === select.value));
    const next = options[(current + 1) % options.length];
    select.value = next.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    setStatus(`PenDeck symmetry: ${next.textContent.trim()}`);
    return true;
  }

  function toggleMirror(force) {
    runtime.mirror = typeof force === 'boolean' ? force : !runtime.mirror;
    document.querySelectorAll('[data-pendeck-action="mirror"]').forEach((button) => {
      button.classList.toggle('active', runtime.mirror);
      button.setAttribute('aria-pressed', String(runtime.mirror));
    });
    setStatus(runtime.mirror ? 'PenDeck mirror reflection enabled' : 'PenDeck mirror reflection disabled');
    window.dispatchEvent(new CustomEvent('domistika:pendeck-mirror', { detail: { enabled: runtime.mirror } }));
    return runtime.mirror;
  }

  function adjustBrushSize(delta) {
    const input = document.querySelector('#sizeInput');
    if (!input) return false;
    const min = Number(input.min) || 1;
    const max = Number(input.max) || 180;
    const next = Math.max(min, Math.min(max, Number(input.value) + delta));
    return setInputValue('#sizeInput', next);
  }

  function captureComposite() {
    const artboard = document.querySelector('#artboard');
    const layers = [...artboard?.querySelectorAll('canvas.paint-layer') ?? []].filter((canvas) => !canvas.hidden);
    const first = layers[0];
    if (!first) return null;
    const output = document.createElement('canvas');
    output.width = first.width;
    output.height = first.height;
    const ctx = output.getContext('2d');
    for (const layer of layers) {
      const style = getComputedStyle(layer);
      ctx.save();
      ctx.globalAlpha = Number.parseFloat(style.opacity || '1') || 1;
      const blend = style.mixBlendMode || 'normal';
      ctx.globalCompositeOperation = blend === 'normal' ? 'source-over' : blend;
      try { ctx.drawImage(layer, 0, 0); } catch (error) { console.warn('PenDeck snapshot skipped a layer', error); }
      ctx.restore();
    }
    try { return output.toDataURL('image/png'); } catch (error) { console.warn('PenDeck snapshot unavailable', error); return null; }
  }

  function emitCCSketch() {
    const detail = {
      source: 'domistika-pendeck-v098',
      version: VERSION,
      snapshotDataUrl: captureComposite(),
      pen: {
        pressure: runtime.pressure,
        lastContactPressure: runtime.lastContactPressure,
        maxPressure: runtime.maxPressure,
        tiltX: runtime.tiltX,
        tiltY: runtime.tiltY,
        twist: runtime.twist,
      },
      drawing: {
        color: document.querySelector('#colorInput')?.value ?? null,
        size: Number(document.querySelector('#sizeInput')?.value) || null,
        symmetry: document.querySelector('#symmetryInput')?.value ?? 'none',
        mirror: runtime.mirror,
      },
    };
    window.dispatchEvent(new CustomEvent('domistika:cc-sketch', { detail }));
    setStatus(detail.snapshotDataUrl ? 'CC sketch context emitted from PenDeck' : 'CC hook emitted (snapshot unavailable)');
    return detail;
  }

  function emitAction(action, detail = {}) {
    window.dispatchEvent(new CustomEvent('pendeck:action', {
      detail: { action, detail, source: 'domistika-v098' },
    }));
  }

  function runAction(action, detail = {}, { emit = true } = {}) {
    let handled = true;
    switch (action) {
      case 'brush': handled = selectTool('pencil'); break;
      case 'eraser': handled = selectTool('eraser'); break;
      case 'undo': handled = click('#undoButton'); break;
      case 'redo': handled = click('#redoButton'); break;
      case 'smaller': handled = adjustBrushSize(-2); break;
      case 'larger': handled = adjustBrushSize(2); break;
      case 'pan': handled = selectTool('pan'); break;
      case 'mirror': toggleMirror(detail?.enabled); break;
      case 'symmetry': handled = cycleSymmetry(); break;
      case 'geometry': handled = click('#gridToggle'); break;
      case 'cc': emitCCSketch(); break;
      case 'radial': toggleRadial(); break;
      default: handled = false;
    }
    if (handled && emit) emitAction(action, detail);
    return handled;
  }

  function createPanel() {
    if (document.querySelector('#pendeckPanel')) return;
    const controlDeck = document.querySelector('.control-deck');
    if (!controlDeck) return;

    const toggle = document.createElement('button');
    toggle.id = 'pendeckToggle';
    toggle.className = 'toggle-button pendeck-pill';
    toggle.type = 'button';
    toggle.dataset.phase = 'idle';
    toggle.title = 'PenDeck — native stylus controls (F8 radial menu)';
    toggle.innerHTML = '<span class="pendeck-dot"></span><span>PenDeck</span><small id="pendeckPillValue">—</small>';
    controlDeck.appendChild(toggle);

    const panel = document.createElement('section');
    panel.id = 'pendeckPanel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="pd-head"><div><div class="pd-kicker">Parallax · native pen</div><div class="pd-title">PenDeck <small>v${VERSION}</small></div></div><button class="pd-close" type="button" aria-label="Close PenDeck">×</button></div>
      <div class="pd-pressure"><div class="pd-track"><div id="pendeckPressureFill"></div></div><strong id="pendeckPressureValue">0.000</strong></div>
      <div class="pd-grid">
        <div class="pd-stat"><span>Signal</span><strong id="pendeckSignal">waiting</strong></div>
        <div class="pd-stat"><span>Last</span><strong id="pendeckLast">0.000</strong></div>
        <div class="pd-stat"><span>Max</span><strong id="pendeckMax">0.000</strong></div>
        <div class="pd-stat"><span>Tilt X</span><strong id="pendeckTiltX">0°</strong></div>
        <div class="pd-stat"><span>Tilt Y</span><strong id="pendeckTiltY">0°</strong></div>
        <div class="pd-stat"><span>Speed</span><strong id="pendeckSpeed">0 px/s</strong></div>
      </div>
      <div class="pd-actions">
        <button type="button" data-pendeck-action="brush">Brush</button>
        <button type="button" data-pendeck-action="eraser">Eraser</button>
        <button type="button" data-pendeck-action="mirror" aria-pressed="false">Mirror</button>
        <button type="button" data-pendeck-action="symmetry">Symmetry</button>
        <button type="button" data-pendeck-action="geometry">Grid</button>
        <button type="button" data-pendeck-action="undo">Undo</button>
        <button type="button" data-pendeck-action="redo">Redo</button>
        <button type="button" data-pendeck-action="cc">CC Hook</button>
      </div>
      <label class="pd-curve"><span>Pressure curve</span><input id="pendeckCurve" type="range" min="55" max="180" value="100"><output id="pendeckCurveValue">1.00×</output></label>
      <details><summary>Deco 640 easy mapping</summary><div class="pd-map">
        <kbd>1</kbd><span>Ctrl+Z · Undo</span><kbd>2</kbd><span>Ctrl+Shift+Z · Redo</span>
        <kbd>3</kbd><span>B · Brush</span><kbd>4</kbd><span>E · Eraser</span>
        <kbd>5</kbd><span>[ · Smaller</span><kbd>6</kbd><span>] · Larger</span>
        <kbd>7</kbd><span>G · Grid</span><kbd>8</kbd><span>F8 · PenDeck radial</span>
      </div><div class="pd-note">No AutoHotkey required. Keep XP-Pen Pressure, Tilt and Windows Ink enabled.</div></details>
    `;
    document.body.appendChild(panel);

    const radial = document.createElement('div');
    radial.id = 'pendeckRadial';
    radial.hidden = true;
    const radialActions = [
      ['brush', 'Brush'], ['eraser', 'Eraser'], ['mirror', 'Mirror'], ['symmetry', 'Sym'],
      ['geometry', 'Grid'], ['undo', 'Undo'], ['redo', 'Redo'], ['cc', 'CC'],
    ];
    radialActions.forEach(([action, label], index) => {
      const angle = (-90 + index * 45) * Math.PI / 180;
      const radius = 88;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.pendeckAction = action;
      button.textContent = label;
      button.style.transform = `translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px)`;
      radial.appendChild(button);
    });
    const center = document.createElement('button');
    center.type = 'button';
    center.className = 'pd-radial-center';
    center.textContent = 'Pen';
    center.addEventListener('click', () => { radial.hidden = true; });
    radial.appendChild(center);
    document.body.appendChild(radial);

    toggle.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      toggle.classList.toggle('active', !panel.hidden);
      if (!panel.hidden) placePanel();
    });
    panel.querySelector('.pd-close').addEventListener('click', () => {
      panel.hidden = true;
      toggle.classList.remove('active');
    });
    panel.querySelectorAll('[data-pendeck-action]').forEach((button) => {
      button.addEventListener('click', () => runAction(button.dataset.pendeckAction));
    });
    radial.querySelectorAll('[data-pendeck-action]').forEach((button) => {
      button.addEventListener('click', () => {
        runAction(button.dataset.pendeckAction);
        radial.hidden = true;
      });
    });
    const curve = panel.querySelector('#pendeckCurve');
    curve.addEventListener('input', () => {
      runtime.pressureGamma = Number(curve.value) / 100;
      panel.querySelector('#pendeckCurveValue').textContent = `${runtime.pressureGamma.toFixed(2)}×`;
      setStatus(`PenDeck pressure curve ${runtime.pressureGamma.toFixed(2)}×`);
    });
    window.addEventListener('resize', () => { if (!panel.hidden) placePanel(); });
  }

  function placePanel() {
    const toggle = document.querySelector('#pendeckToggle');
    const panel = document.querySelector('#pendeckPanel');
    if (!toggle || !panel || panel.hidden) return;
    const rect = toggle.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left));
    const top = Math.max(12, Math.min(window.innerHeight - 360, rect.bottom + 8));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  function toggleRadial(force) {
    const radial = document.querySelector('#pendeckRadial');
    if (!radial) return false;
    const nextHidden = typeof force === 'boolean' ? !force : !radial.hidden;
    radial.hidden = nextHidden;
    if (!radial.hidden) {
      const pad = 120;
      const x = Math.max(pad, Math.min(window.innerWidth - pad, runtime.lastClientX || window.innerWidth / 2));
      const y = Math.max(pad, Math.min(window.innerHeight - pad, runtime.lastClientY || window.innerHeight / 2));
      radial.style.left = `${x}px`;
      radial.style.top = `${y}px`;
    }
    return !radial.hidden;
  }

  let telemetryFrame = 0;
  let idleTimer = 0;

  function renderTelemetry() {
    telemetryFrame = 0;
    const toggle = document.querySelector('#pendeckToggle');
    if (!toggle) return;
    toggle.dataset.phase = runtime.phase;
    const pill = document.querySelector('#pendeckPillValue');
    if (pill) pill.textContent = runtime.connected ? (runtime.phase === 'contact' ? runtime.pressure.toFixed(2) : 'pen') : '—';
    const fill = document.querySelector('#pendeckPressureFill');
    if (fill) fill.style.width = `${Math.round(runtime.pressure * 100)}%`;
    const value = document.querySelector('#pendeckPressureValue');
    if (value) value.textContent = runtime.pressure.toFixed(3);
    const signal = document.querySelector('#pendeckSignal');
    if (signal) signal.textContent = runtime.connected ? runtime.phase : 'waiting';
    const last = document.querySelector('#pendeckLast');
    if (last) last.textContent = runtime.lastContactPressure.toFixed(3);
    const max = document.querySelector('#pendeckMax');
    if (max) max.textContent = runtime.maxPressure.toFixed(3);
    const tiltX = document.querySelector('#pendeckTiltX');
    if (tiltX) tiltX.textContent = `${Math.round(runtime.tiltX)}°`;
    const tiltY = document.querySelector('#pendeckTiltY');
    if (tiltY) tiltY.textContent = `${Math.round(runtime.tiltY)}°`;
    const speed = document.querySelector('#pendeckSpeed');
    if (speed) speed.textContent = `${Math.round(runtime.speed)} px/s`;
  }

  function scheduleTelemetry() {
    if (!telemetryFrame) telemetryFrame = requestAnimationFrame(renderTelemetry);
  }

  function observePen(event) {
    if (event.pointerType !== 'pen') return;
    const now = performance.now();
    const pressure = Math.max(0, Math.min(1, Number(event.pressure) || 0));
    runtime.connected = true;
    runtime.pointerType = 'pen';
    runtime.pressure = pressure;
    runtime.phase = pressure > 0 || (event.buttons & 1) === 1 ? 'contact' : 'hover';
    runtime.tiltX = Number(event.tiltX) || 0;
    runtime.tiltY = Number(event.tiltY) || 0;
    runtime.twist = Number(event.twist) || 0;
    runtime.width = Number(event.width) || 0;
    runtime.height = Number(event.height) || 0;
    runtime.lastClientX = event.clientX;
    runtime.lastClientY = event.clientY;
    runtime.lastSeenAt = now;
    if (pressure > 0) {
      runtime.lastContactPressure = pressure;
      runtime.maxPressure = Math.max(runtime.maxPressure, pressure);
    }
    if (runtime.previousSample) {
      const dt = Math.max(1, now - runtime.previousSample.t) / 1000;
      runtime.speed = Math.hypot(event.clientX - runtime.previousSample.x, event.clientY - runtime.previousSample.y) / dt;
    }
    runtime.previousSample = { x: event.clientX, y: event.clientY, t: now };
    scheduleTelemetry();

    window.dispatchEvent(new CustomEvent('pendeck:pen', {
      detail: {
        pointerType: 'pen', pressure, tiltX: runtime.tiltX, tiltY: runtime.tiltY,
        twist: runtime.twist, width: runtime.width, height: runtime.height, speed: runtime.speed,
      },
    }));

    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (performance.now() - runtime.lastSeenAt >= 650) {
        runtime.phase = 'idle';
        runtime.pressure = 0;
        runtime.speed = 0;
        runtime.previousSample = null;
        scheduleTelemetry();
      }
    }, 700);
  }

  function bindPenTelemetry() {
    const overlay = document.querySelector('#overlay');
    if (!overlay || overlay.dataset.pendeckTelemetry === '1') return;
    overlay.dataset.pendeckTelemetry = '1';
    ['pointerenter', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach((type) => {
      overlay.addEventListener(type, observePen, { capture: true, passive: true });
    });
    if ('onpointerrawupdate' in window) {
      overlay.addEventListener('pointerrawupdate', observePen, { capture: true, passive: true });
    }
  }

  function bindKeyboard() {
    window.addEventListener('keydown', (event) => {
      if (event.key === 'F8') {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleRadial();
        return;
      }
      if (event.key === 'Escape' && !document.querySelector('#pendeckRadial')?.hidden) {
        document.querySelector('#pendeckRadial').hidden = true;
      }
    }, { capture: true });
  }

  function bindBridge() {
    window.addEventListener('pendeck:action', (event) => {
      if (event.detail?.source === 'domistika-v098') return;
      const action = event.detail?.action;
      if (action) runAction(action, event.detail?.detail ?? {}, { emit: false });
    });
  }

  function install() {
    injectStyles();
    createPanel();
    bindPenTelemetry();
    bindKeyboard();
    bindBridge();
    runtime.actions = {
      run: runAction,
      toggleMirror,
      toggleRadial,
      captureComposite,
      emitCCSketch,
    };
    window.dispatchEvent(new CustomEvent('domistika:pendeck-ready', {
      detail: { version: VERSION, runtime },
    }));
    setStatus('PenDeck v0.9.8 ready · F8 opens the radial pen menu');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(install), { once: true });
  } else {
    requestAnimationFrame(install);
  }
}
