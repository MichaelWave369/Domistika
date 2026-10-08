import {
  startWeave, stopWeave, clearWeave, undoWeaveAnchor,
  setWeaveOptions, weaveState, loadSelectedWeave,
  commitWeave, animateWeave, sendWeaveToAuralith,
} from './dimensionalWeaveRuntime.js';

const messages = {
  WEAVE_NEEDS_3_ANCHORS: 'Place at least 3 vertices before building a face.',
  WEAVE_FACE_TOO_SMALL: 'The face is too small or nearly flat. Spread the vertices apart.',
  WEAVE_CROSSED_FACE_EDGES: 'Face edges cross. Undo points or draw a simpler outline.',
  WEAVE_DUPLICATE_ANCHOR: 'Some vertices are too close together.',
  WEAVE_SELECT_GENERATED_LAYER: 'Select an existing Dimensional Weave layer first.',
  WEAVE_SECTOR_SURGERY_ACTIVE: 'Finish Sector Surgery before starting Weave.',
  WEAVE_KINETIC_UNAVAILABLE: 'Kinetic Rotation is not ready.',
  WEAVE_AURALITH_BRIDGE_UNAVAILABLE: 'Auralith bridge is not ready.',
};
function feedback(root, text, error = false) {
  const field = root.querySelector('[data-weave-feedback]');
  field.textContent = messages[text] || text;
  field.dataset.error = String(error);
}
function injectStyles() {
  if (document.querySelector('#dimensionalWeaveStyles')) return;
  const sheet = document.createElement('style');
  sheet.id = 'dimensionalWeaveStyles';
  sheet.textContent = [
    '.dimensional-weave{margin:14px 0 12px;padding:12px;border:1px solid rgba(34,211,238,.28);border-radius:12px;background:rgba(34,211,238,.035)}',
    '.dimensional-weave h3{margin:0;font-size:12px}.dimensional-weave p{margin:5px 0 10px;color:var(--muted);font-size:10px;line-height:1.5}',
    '.weave-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.weave-grid label{display:grid;gap:4px;font-size:10px;color:var(--muted);min-width:0}',
    '.weave-grid input[type=range]{width:100%;min-width:0}',
    '.weave-grid output{font-variant-numeric:tabular-nums;color:var(--ink)}',
    '.weave-checks{display:flex;gap:12px;flex-wrap:wrap;margin:10px 0;font-size:10px}',
    '.weave-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px}',
    '.weave-actions button{min-height:33px;white-space:normal;font-size:10px}',
    '.weave-feedback{margin-top:9px;padding:8px;border-radius:7px;background:rgba(148,163,184,.10);font-size:10px;line-height:1.45;overflow-wrap:anywhere}',
    '.weave-feedback[data-error=true]{color:#fca5a5}',
    '.weave-toggle[data-active=true]{background:rgba(34,211,238,.14);border-color:#22d3ee}',
    '@media(max-width:700px){.weave-grid{grid-template-columns:1fr}.weave-actions{grid-template-columns:1fr 1fr}}',
  ].join('');
  document.head.appendChild(sheet);
}
function sync(root) {
  const state = weaveState();
  const toggle = root.querySelector('[data-weave-action=capture]');
  toggle.dataset.active = String(state.armed);
  toggle.setAttribute('aria-pressed', String(state.armed));
  toggle.textContent = state.armed ? 'Pause capture' : 'Start / New face';
  root.querySelector('[data-weave-count]').textContent = String(state.anchors.length);
  root.querySelector('[data-weave-action=render]').disabled = state.anchors.length < 3;
  root.querySelector('[data-weave-action=undo]').disabled = state.anchors.length === 0;
  for (const [key, value] of Object.entries(state.options)) {
    const input = root.querySelector('[data-weave-option=' + key + ']');
    if (!input) continue;
    if (input.type === 'checkbox') input.checked = value;
    else input.value = String(value);
    const output = root.querySelector('[data-weave-output=' + key + ']');
    if (output) output.textContent = String(value);
  }
}
function activateLayers(root) {
  const tab = document.querySelector('.inspector-tabs [data-panel=layersPanel]');
  if (tab) tab.click();
  root.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function init() {
  const panel = document.querySelector('#layersPanel');
  const deck = document.querySelector('.control-deck');
  if (!panel || !deck) return false;
  if (document.querySelector('#dimensionalWeavePanel')) return true;
  injectStyles();
  const open = document.createElement('button');
  open.id = 'dimensionalWeaveOpen';
  open.type = 'button';
  open.className = 'soft-button';
  open.textContent = '◇ Weave';
  open.title = 'Create connected 2.5D geometry on an independent layer';
  deck.appendChild(open);
  const root = document.createElement('section');
  root.id = 'dimensionalWeavePanel';
  root.className = 'dimensional-weave';
  root.innerHTML = [
    '<h3>◇ Dimensional Weave</h3>',
    '<p>Click the canvas to define a polygon, then generate shaded front and side faces. ',
    'Radial copies turn a single shape into a gear. Your original drawing is never painted over.</p>',
    '<div class="weave-grid">',
    '<label>Radial repeats <output data-weave-output="copies">28</output><input data-weave-option="copies" type="range" min="1" max="32" step="1" value="28"></label>',
    '<label>Weave depth <output data-weave-output="depth">34</output><input data-weave-option="depth" type="range" min="0" max="160" step="1" value="34"></label>',
    '<label>Light / extrusion angle <output data-weave-output="direction">-45</output><input data-weave-option="direction" type="range" min="-180" max="180" step="5" value="-45"></label>',
    '<label>Face color <input aria-label="Weave face color" data-weave-option="color" type="color" value="#8b93a7"></label>',
    '<label>Highlight edges <input aria-label="Weave edge color" data-weave-option="edge" type="color" value="#eaf3ff"></label>',
    '</div>',
    '<div class="weave-checks">',
    '<label><input data-weave-option="fill" type="checkbox" checked> Face builder</label>',
    '<label><input data-weave-option="impossible" type="checkbox"> Escher / impossible depth</label>',
    '</div>',
    '<div class="weave-actions">',
    '<button type="button" data-weave-action="capture" class="weave-toggle" aria-pressed="false">Start / New face</button>',
    '<button type="button" data-weave-action="undo">Undo point</button>',
    '<button type="button" data-weave-action="render">Render new layer</button>',
    '<button type="button" data-weave-action="pause">Exit capture</button>',
    '<button type="button" data-weave-action="load">Load selected weave</button>',
    '<button type="button" data-weave-action="clear">Clear points</button>',
    '<button type="button" data-weave-action="motion">Animate rings</button>',
    '<button type="button" data-weave-action="auralith">Send to Auralith</button>',
    '</div>',
    '<div class="weave-feedback" data-weave-feedback aria-live="polite">',
    'Ready. <span data-weave-count>0</span> anchors. Start capture and click 3 or more vertices.',
    '</div>',
    '<p>Load selected weave restores its editable anchors. Render always creates a new version layer; ',
    'hide or delete previous versions with Layers. Motion and Auralith use the existing studio bridges.</p>',
  ].join('');
  panel.appendChild(root);
  open.addEventListener('click', () => activateLayers(root));
  const invoke = async (action) => {
    try {
      if (action === 'capture') {
        if (weaveState().armed) stopWeave();
        else startWeave();
      }
      if (action === 'undo') undoWeaveAnchor();
      if (action === 'pause') stopWeave();
      if (action === 'clear') clearWeave();
      if (action === 'load') loadSelectedWeave();
      if (action === 'render') {
        const receipt = commitWeave();
        feedback(root, 'Built ' + receipt.copies + ' copies on new layer ' + receipt.layerId + '. Source preserved.');
      }
      if (action === 'motion') animateWeave();
      if (action === 'auralith') {
        const receipt = await sendWeaveToAuralith();
        if (receipt?.ok !== true) throw new Error(receipt?.reason || 'Auralith transfer failed.');
      }
    } catch (error) { feedback(root, error.message, true); }
    sync(root);
  };
  root.querySelectorAll('[data-weave-action]').forEach((button) => {
    button.addEventListener('click', () => { void invoke(button.dataset.weaveAction); });
  });
  root.querySelectorAll('[data-weave-option]').forEach((input) => {
    input.addEventListener('input', () => {
      const key = input.dataset.weaveOption;
      try {
        setWeaveOptions({ [key]: input.type === 'checkbox' ? input.checked
          : input.type === 'range' ? Number(input.value) : input.value });
      } catch (error) { feedback(root, error.message, true); }
      sync(root);
    });
  });
  document.addEventListener('domistika:dimensional-weave', (event) => {
    // A status event may fire from the runtime before the panel is mounted.
    feedback(root, event.detail.message);
    sync(root);
  });
  sync(root);
  return true;
}
function wait(attempt = 0) {
  if (init() || attempt >= 720) return;
  requestAnimationFrame(() => wait(attempt + 1));
}
wait();
