import { CanvasEngine } from './core/CanvasEngine.js';

const VERSION = '0.9.19';
const INSTALL_FLAG = '__domistikaAccessibleInputV0919Installed';
const DRAW_TOOLS = new Set(['pencil', 'ink', 'marker', 'airbrush', 'eraser']);

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;

  const states = new WeakMap();
  const stateFor = (engine) => {
    if (!states.has(engine)) {
      states.set(engine, {
        mode: 'normal',
        stickyDown: false,
        stickySuspended: false,
        polyline: {
          active: false,
          points: [],
          snapshot: null,
          layerId: null,
          tool: null,
          undoBefore: null,
          redoBefore: null,
        },
      });
    }
    return states.get(engine);
  };

  const originalPointerDown = CanvasEngine.prototype.pointerDown;
  const originalPointerMove = CanvasEngine.prototype.pointerMove;
  const originalPointerUp = CanvasEngine.prototype.pointerUp;
  const originalSetTool = CanvasEngine.prototype.setTool;
  const originalSetSpacePan = CanvasEngine.prototype.setSpacePan;
  const originalSetActiveLayer = CanvasEngine.prototype.setActiveLayer;

  function isPrimaryDrawEvent(engine, event) {
    return DRAW_TOOLS.has(engine.tool)
      && event.button !== 1
      && event.button !== 2
      && !event.altKey
      && !engine.spacePan;
  }

  function syncUi(engine) {
    const state = stateFor(engine);
    const sticky = document.querySelector('#stickyDrawToggle');
    const polyline = document.querySelector('#polylineToggle');
    const indicator = document.querySelector('#accessibleInputIndicator');

    if (sticky) {
      const active = state.mode === 'sticky';
      sticky.classList.toggle('active', active);
      sticky.setAttribute('aria-pressed', String(active));
    }
    if (polyline) {
      const active = state.mode === 'polyline';
      polyline.classList.toggle('active', active);
      polyline.setAttribute('aria-pressed', String(active));
    }

    engine.overlay?.classList.toggle('sticky-draw-mode', state.mode === 'sticky');
    engine.overlay?.classList.toggle('sticky-draw-down', state.mode === 'sticky' && state.stickyDown);
    engine.overlay?.classList.toggle('polyline-mode', state.mode === 'polyline');
    engine.overlay?.classList.toggle('polyline-active', state.mode === 'polyline' && state.polyline.active);

    if (indicator) {
      if (state.mode === 'sticky' && state.stickyDown) {
        indicator.hidden = false;
        indicator.textContent = 'Sticky Draw · pen down';
      } else if (state.mode === 'sticky') {
        indicator.hidden = false;
        indicator.textContent = 'Sticky Draw · click canvas to lower pen';
      } else if (state.mode === 'polyline' && state.polyline.active) {
        indicator.hidden = false;
        indicator.textContent = `Polyline · ${state.polyline.points.length} point${state.polyline.points.length === 1 ? '' : 's'}`;
      } else if (state.mode === 'polyline') {
        indicator.hidden = false;
        indicator.textContent = 'Polyline · click canvas to place first point';
      } else {
        indicator.hidden = true;
        indicator.textContent = '';
      }
    }
  }

  function finishSticky(engine, message = 'Sticky Draw stroke committed') {
    const state = stateFor(engine);
    if (!state.stickyDown) return false;
    state.stickyDown = false;
    state.stickySuspended = false;
    if (engine.pointer?.mode === 'pan') engine.onPan.end?.();
    engine.pointer = null;
    engine.redrawOverlay();
    engine.markChanged(message);
    syncUi(engine);
    return true;
  }

  function resetPolylineState(state) {
    state.polyline.active = false;
    state.polyline.points = [];
    state.polyline.snapshot = null;
    state.polyline.layerId = null;
    state.polyline.tool = null;
    state.polyline.undoBefore = null;
    state.polyline.redoBefore = null;
  }

  function finishPolyline(engine, message = null) {
    const state = stateFor(engine);
    const path = state.polyline;
    if (!path.active) return false;
    const count = path.points.length;
    resetPolylineState(state);
    engine.redrawOverlay();
    engine.markChanged(message || `Polyline committed (${count} point${count === 1 ? '' : 's'})`);
    syncUi(engine);
    return true;
  }

  function cancelPolyline(engine) {
    const state = stateFor(engine);
    const path = state.polyline;
    if (!path.active) return false;
    const layer = engine.layers.find((candidate) => candidate.id === path.layerId);
    if (layer && path.snapshot) {
      layer.ctx.clearRect(0, 0, engine.width, engine.height);
      layer.ctx.drawImage(path.snapshot, 0, 0);
    }
    if (Array.isArray(path.undoBefore)) engine.undoStack = [...path.undoBefore];
    if (Array.isArray(path.redoBefore)) engine.redoStack = [...path.redoBefore];
    resetPolylineState(state);
    engine.redrawOverlay();
    engine.onChange?.({ reason: 'active-layer', engine });
    engine.onStatus?.('Polyline canceled');
    syncUi(engine);
    return true;
  }

  function rerenderPolyline(engine) {
    const state = stateFor(engine);
    const path = state.polyline;
    const layer = engine.layers.find((candidate) => candidate.id === path.layerId);
    if (!path.active || !layer || !path.snapshot) return;
    layer.ctx.clearRect(0, 0, engine.width, engine.height);
    layer.ctx.drawImage(path.snapshot, 0, 0);
    if (!path.points.length) return;
    const previousTool = engine.tool;
    engine.tool = path.tool;
    engine.drawDot(path.points[0]);
    for (let index = 1; index < path.points.length; index += 1) {
      engine.drawSegment(path.points[index - 1], path.points[index]);
    }
    engine.tool = previousTool;
  }

  function removePolylinePoint(engine) {
    const state = stateFor(engine);
    if (!state.polyline.active || !state.polyline.points.length) return false;
    state.polyline.points.pop();
    if (!state.polyline.points.length) {
      cancelPolyline(engine);
      return true;
    }
    rerenderPolyline(engine);
    engine.redrawOverlay();
    engine.onStatus?.(`Polyline point removed · ${state.polyline.points.length} remaining`);
    syncUi(engine);
    return true;
  }

  function drawPolylinePreview(engine, point) {
    const state = stateFor(engine);
    const path = state.polyline;
    engine.redrawOverlay();
    if (!path.active || !path.points.length) return;
    const from = path.points.at(-1);
    const ctx = engine.overlayCtx;
    ctx.save();
    ctx.globalAlpha = 0.62;
    ctx.strokeStyle = engine.settings.color;
    ctx.lineWidth = Math.max(1, Math.min(8, Number(engine.settings.size) || 1));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([12, 9]);
    for (const transform of engine.symmetryTransforms()) {
      const start = transform(from);
      const end = transform(point);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function beginOrExtendPolyline(engine, event) {
    const state = stateFor(engine);
    const path = state.polyline;
    const point = engine.eventPoint(event);

    if (!path.active) {
      if (!engine.activeLayer) return;
      path.undoBefore = [...engine.undoStack];
      path.redoBefore = [...engine.redoStack];
      path.snapshot = engine.copyCanvas(engine.activeLayer.canvas);
      path.layerId = engine.activeLayerId;
      path.tool = engine.tool;
      engine.captureHistory();
      path.active = true;
      path.points = [point];
      engine.drawDot(point);
      engine.onStatus?.('Polyline started · click to add points · Enter/double-click to finish');
    } else {
      if (path.layerId !== engine.activeLayerId || path.tool !== engine.tool) {
        finishPolyline(engine);
        return beginOrExtendPolyline(engine, event);
      }
      const previous = path.points.at(-1);
      engine.drawSegment(previous, point);
      path.points.push(point);
      engine.onStatus?.(`Polyline · ${path.points.length} points · Enter/double-click to finish`);
    }
    drawPolylinePreview(engine, point);
    syncUi(engine);
  }

  function setMode(engine, mode) {
    const state = stateFor(engine);
    const next = ['normal', 'sticky', 'polyline'].includes(mode) ? mode : 'normal';
    if (state.mode === next) return next;
    if (state.stickyDown) finishSticky(engine);
    if (state.polyline.active) finishPolyline(engine);
    state.mode = next;
    engine.onStatus?.(
      next === 'sticky'
        ? 'Sticky Draw enabled · click once for pen down, click again for pen up'
        : next === 'polyline'
          ? 'Polyline enabled · click points, Enter or double-click to finish'
          : 'Alternative input drawing off',
    );
    syncUi(engine);
    window.dispatchEvent(new CustomEvent('domistika:accessible-input-mode', {
      detail: { mode: next, version: VERSION },
    }));
    return next;
  }

  CanvasEngine.prototype.pointerDown = function accessiblePointerDown(event) {
    const state = stateFor(this);

    if (state.mode === 'polyline' && isPrimaryDrawEvent(this, event)) {
      event.preventDefault();
      beginOrExtendPolyline(this, event);
      return;
    }

    if (state.mode === 'sticky' && isPrimaryDrawEvent(this, event)) {
      event.preventDefault();
      if (state.stickyDown) {
        if (this.pointer?.id === event.pointerId) originalPointerMove.call(this, event);
        finishSticky(this);
        return;
      }
      originalPointerDown.call(this, event);
      if (this.pointer && DRAW_TOOLS.has(this.pointer.mode)) {
        state.stickyDown = true;
        state.stickySuspended = false;
        this.onStatus?.('Sticky Draw pen down · move to draw · click canvas again to lift');
        syncUi(this);
      }
      return;
    }

    originalPointerDown.call(this, event);
  };

  CanvasEngine.prototype.pointerMove = function accessiblePointerMove(event) {
    const state = stateFor(this);
    if (state.mode === 'polyline' && state.polyline.active) {
      drawPolylinePreview(this, this.eventPoint(event));
      return;
    }
    if (state.mode === 'sticky' && state.stickyDown && state.stickySuspended) return;
    originalPointerMove.call(this, event);
  };

  CanvasEngine.prototype.pointerUp = function accessiblePointerUp(event) {
    const state = stateFor(this);
    if (state.mode === 'polyline' && state.polyline.active) return;
    if (state.mode === 'sticky' && state.stickyDown) {
      if (event.type === 'pointercancel') finishSticky(this, 'Sticky Draw stroke ended after pointer cancel');
      return;
    }
    originalPointerUp.call(this, event);
  };

  CanvasEngine.prototype.setTool = function accessibleSetTool(tool) {
    const state = stateFor(this);
    if (state.stickyDown) finishSticky(this);
    if (state.polyline.active) finishPolyline(this);
    return originalSetTool.call(this, tool);
  };

  CanvasEngine.prototype.setSpacePan = function accessibleSetSpacePan(enabled) {
    const state = stateFor(this);
    if (enabled && state.stickyDown) finishSticky(this);
    if (enabled && state.polyline.active) finishPolyline(this);
    return originalSetSpacePan.call(this, enabled);
  };

  CanvasEngine.prototype.setActiveLayer = function accessibleSetActiveLayer(id) {
    const state = stateFor(this);
    if (id !== this.activeLayerId && state.stickyDown) finishSticky(this);
    if (id !== this.activeLayerId && state.polyline.active) finishPolyline(this);
    return originalSetActiveLayer.call(this, id);
  };

  function injectStyles() {
    if (document.querySelector('#accessibleInputV0919Styles')) return;
    const style = document.createElement('style');
    style.id = 'accessibleInputV0919Styles';
    style.textContent = `
      #stickyDrawToggle,#polylineToggle{white-space:nowrap}
      #stickyDrawToggle.active,#polylineToggle.active{box-shadow:inset 0 0 0 1px currentColor}
      .drawing-overlay.sticky-draw-mode,.drawing-overlay.polyline-mode{cursor:crosshair}
      .drawing-overlay.sticky-draw-down{outline:3px solid rgba(236,113,43,.45);outline-offset:-3px}
      .drawing-overlay.polyline-active{outline:3px dashed rgba(85,160,230,.42);outline-offset:-3px}
      #accessibleInputIndicator{position:absolute;left:18px;bottom:18px;z-index:18;max-width:min(360px,calc(100% - 36px));padding:7px 10px;border:1px solid var(--line);border-radius:999px;background:color-mix(in srgb,var(--panel) 92%,transparent);color:var(--ink);box-shadow:0 6px 20px rgba(0,0,0,.16);font-size:10px;font-weight:700;letter-spacing:.02em;pointer-events:none}
      #accessibleInputIndicator[hidden]{display:none}
    `;
    document.head.appendChild(style);
  }

  function installUi(engine) {
    if (!engine || document.querySelector('#stickyDrawToggle')) return;
    injectStyles();
    const controlDeck = document.querySelector('.control-deck');
    const viewport = document.querySelector('#viewport');
    if (!controlDeck || !viewport) return;

    const sticky = document.createElement('button');
    sticky.id = 'stickyDrawToggle';
    sticky.type = 'button';
    sticky.className = 'toggle-button';
    sticky.textContent = 'Sticky Draw';
    sticky.title = 'Click once for pen down, move to draw, click again for pen up';
    sticky.setAttribute('aria-pressed', 'false');
    sticky.setAttribute('aria-keyshortcuts', 'Shift+D');

    const polyline = document.createElement('button');
    polyline.id = 'polylineToggle';
    polyline.type = 'button';
    polyline.className = 'toggle-button';
    polyline.textContent = 'Polyline';
    polyline.title = 'Click points to build a stroke; double-click or press Enter to finish';
    polyline.setAttribute('aria-pressed', 'false');
    polyline.setAttribute('aria-keyshortcuts', 'Shift+P');

    const indicator = document.createElement('div');
    indicator.id = 'accessibleInputIndicator';
    indicator.hidden = true;
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-live', 'polite');

    controlDeck.append(sticky, polyline);
    viewport.appendChild(indicator);

    sticky.addEventListener('click', () => {
      const state = stateFor(engine);
      setMode(engine, state.mode === 'sticky' ? 'normal' : 'sticky');
    });
    polyline.addEventListener('click', () => {
      const state = stateFor(engine);
      setMode(engine, state.mode === 'polyline' ? 'normal' : 'polyline');
    });

    engine.overlay.addEventListener('dblclick', (event) => {
      const state = stateFor(engine);
      if (state.mode !== 'polyline' || !state.polyline.active) return;
      event.preventDefault();
      finishPolyline(engine);
    });

    engine.overlay.addEventListener('pointerleave', () => {
      const state = stateFor(engine);
      if (state.mode === 'sticky' && state.stickyDown) state.stickySuspended = true;
    });
    engine.overlay.addEventListener('pointerenter', (event) => {
      const state = stateFor(engine);
      if (state.mode !== 'sticky' || !state.stickyDown || !engine.pointer) return;
      const point = engine.eventPoint(event);
      engine.pointer.last = point;
      engine.pointer.smoothed = point;
      state.stickySuspended = false;
    });

    document.addEventListener('pointerdown', (event) => {
      const state = stateFor(engine);
      if (state.mode === 'sticky' && state.stickyDown && event.target !== engine.overlay) {
        finishSticky(engine, 'Sticky Draw stroke committed before leaving canvas controls');
      }
    }, true);

    window.addEventListener('keydown', (event) => {
      const editable = event.target instanceof Element && event.target.matches('input, select, textarea, [contenteditable="true"]');
      if (editable) return;
      const state = stateFor(engine);
      const key = event.key.toLowerCase();

      if (event.shiftKey && key === 'd' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setMode(engine, state.mode === 'sticky' ? 'normal' : 'sticky');
        return;
      }
      if (event.shiftKey && key === 'p' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setMode(engine, state.mode === 'polyline' ? 'normal' : 'polyline');
        return;
      }
      if (key === 'escape') {
        if (state.stickyDown) {
          event.preventDefault();
          finishSticky(engine, 'Sticky Draw pen lifted');
        } else if (state.polyline.active) {
          event.preventDefault();
          cancelPolyline(engine);
        }
        return;
      }
      if (key === 'enter' && state.polyline.active) {
        event.preventDefault();
        finishPolyline(engine);
        return;
      }
      if (key === 'backspace' && state.polyline.active) {
        event.preventDefault();
        removePolylinePoint(engine);
      }
    });

    syncUi(engine);
    window.dispatchEvent(new CustomEvent('domistika:accessible-input-ready', {
      detail: { version: VERSION, modes: ['sticky', 'polyline'] },
    }));
  }

  window.domistikaAccessibleInputV0919 = {
    version: VERSION,
    install: installUi,
    getState(engine = window.__domistikaEngine) {
      if (!engine) return null;
      const state = stateFor(engine);
      return {
        mode: state.mode,
        stickyDown: state.stickyDown,
        polylineActive: state.polyline.active,
        polylinePoints: state.polyline.points.length,
      };
    },
    setMode(mode, engine = window.__domistikaEngine) {
      if (!engine) return null;
      return setMode(engine, mode);
    },
    finish(engine = window.__domistikaEngine) {
      if (!engine) return false;
      const state = stateFor(engine);
      if (state.stickyDown) return finishSticky(engine);
      if (state.polyline.active) return finishPolyline(engine);
      return false;
    },
    cancelPolyline(engine = window.__domistikaEngine) {
      if (!engine) return false;
      return cancelPolyline(engine);
    },
  };

  window.addEventListener('domistika:ready', (event) => installUi(event.detail?.engine || window.__domistikaEngine));
  if (window.__domistikaEngine) queueMicrotask(() => installUi(window.__domistikaEngine));
}
