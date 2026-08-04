import { COMMAND_CAPABILITIES } from './capabilityManifest.js';
import { collectStudioContext } from './contextBroker.js';
import { getLatestEngine } from './guideLayer.js';

const RECEIPTS_KEY = 'domistika-v090-action-receipts';
const MAX_RECEIPTS = 80;
const handlers = new Map();
const undoHandlers = new Map();
const listeners = new Set();
let highlightTimer = null;

const commandSpec = (id) => COMMAND_CAPABILITIES.find((command) => command.id === id) || {
  id, authority: 'assistant', mutatesProject: false, description: 'Extension command.',
};

function uid(prefix = 'receipt') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readReceipts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECEIPTS_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeReceipts(receipts) {
  try { localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts.slice(0, MAX_RECEIPTS))); } catch {}
}

function emit(receipt) {
  document.dispatchEvent(new CustomEvent('domistika:v090-receipt', { detail: { receipt } }));
  listeners.forEach((listener) => {
    try { listener(receipt); } catch (error) { console.warn('Tika receipt listener failed', error); }
  });
}

function saveReceipt(receipt) {
  const receipts = readReceipts();
  receipts.unshift(receipt);
  writeReceipts(receipts);
  emit(receipt);
  return receipt;
}

function status(message) {
  const node = document.querySelector('#statusMessage');
  if (node) node.textContent = message;
}

function dispatchInput(element) {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function sourcePanelButton(panelId) {
  return [...document.querySelectorAll('.inspector-tabs button[data-panel]')]
    .find((button) => button.dataset.panel === panelId);
}

export function openPanel(panelId) {
  const button = sourcePanelButton(panelId);
  const panel = document.getElementById(panelId);
  if (button) button.click();
  else if (panel) {
    document.querySelectorAll('.inspector-panel').forEach((candidate) => candidate.classList.toggle('active', candidate === panel));
    document.querySelectorAll('.inspector-tabs button[data-panel]').forEach((candidate) => candidate.classList.toggle('active', candidate.dataset.panel === panelId));
  }
  if (window.matchMedia('(max-width:1000px)').matches) document.querySelector('#studio')?.classList.add('brush-drawer-open');
  return Boolean(button || panel);
}

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function highlightControl(selector, label = 'Here it is', panelId = null) {
  if (panelId) openPanel(panelId);
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Control not found: ${selector}`);
  clearTimeout(highlightTimer);
  document.querySelectorAll('.tika-control-highlight').forEach((node) => node.classList.remove('tika-control-highlight'));
  document.querySelectorAll('.tika-highlight-label').forEach((node) => node.remove());
  element.classList.add('tika-control-highlight');
  element.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center', inline: 'center' });
  const tag = document.createElement('div');
  tag.className = 'tika-highlight-label';
  tag.textContent = label;
  document.body.appendChild(tag);
  const place = () => {
    const rect = element.getBoundingClientRect();
    tag.style.left = `${Math.max(8, Math.min(window.innerWidth - tag.offsetWidth - 8, rect.left + rect.width / 2 - tag.offsetWidth / 2))}px`;
    tag.style.top = `${Math.max(8, rect.top - tag.offsetHeight - 9)}px`;
  };
  requestAnimationFrame(place);
  window.addEventListener('resize', place, { once: true });
  highlightTimer = setTimeout(() => {
    element.classList.remove('tika-control-highlight');
    tag.remove();
  }, 5200);
  return { selector, panelId, label };
}

function waitFor(predicate, attempts = 80) {
  return new Promise((resolve, reject) => {
    const tick = (remaining) => {
      const result = predicate();
      if (result) return resolve(result);
      if (remaining <= 0) return reject(new Error('Timed out waiting for the requested studio control.'));
      requestAnimationFrame(() => tick(remaining - 1));
    };
    tick(attempts);
  });
}

function imageFromSource(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function restoreGuideSnapshot(engine, snapshot) {
  const restored = engine.createLayer(snapshot.name, snapshot);
  const image = await imageFromSource(snapshot.image);
  restored.ctx.drawImage(image, 0, 0);
  restored.visible = snapshot.visible;
  restored.canvas.hidden = !snapshot.visible;
  engine.markChanged(`${snapshot.name} restored`);
  return restored;
}

function restoreViewport(target) {
  if (!target || !window.domistikaNavigation) return;
  const current = window.domistikaNavigation.getState();
  if (current.zoom && target.zoom) window.domistikaNavigation.zoomBy(target.zoom / current.zoom);
  const afterZoom = window.domistikaNavigation.getState();
  window.domistikaNavigation.panBy(target.pan.x - afterZoom.pan.x, target.pan.y - afterZoom.pan.y);
}

function persistentUndoAvailable(descriptor) {
  if (!descriptor) return false;
  if (descriptor.type === 'command') return handlers.has(descriptor.command);
  return ['viewport.restore', 'guide.recreate'].includes(descriptor.type);
}

async function performPersistentUndo(descriptor) {
  if (!descriptor) throw new Error('No persistent undo descriptor is available.');
  if (descriptor.type === 'command') {
    const handler = handlers.get(descriptor.command);
    if (!handler) throw new Error(`Undo command is unavailable: ${descriptor.command}`);
    return handler(descriptor.args || {}, { undoing: true });
  }
  if (descriptor.type === 'viewport.restore') {
    restoreViewport(descriptor.state);
    return;
  }
  if (descriptor.type === 'guide.recreate') {
    const engine = getLatestEngine();
    if (!engine?.createGuideLayer) throw new Error('Guide Layer engine is not ready.');
    const layer = engine.createGuideLayer(descriptor.templateId, {
      lessonId: descriptor.lessonId, title: descriptor.title, opacity: descriptor.opacity,
    });
    layer.visible = descriptor.visible !== false;
    layer.canvas.hidden = !layer.visible;
    return layer;
  }
  throw new Error(`Unsupported persistent undo type: ${descriptor.type}`);
}

handlers.set('ui.openPanel', async ({ panelId }) => {
  if (!openPanel(panelId)) throw new Error(`Panel is unavailable: ${panelId}`);
  return { result: { panelId }, message: `Opened ${sourcePanelButton(panelId)?.textContent?.trim() || panelId}` };
});

handlers.set('ui.highlightControl', async ({ selector, label, panelId }) => ({
  result: highlightControl(selector, label, panelId),
  message: label || 'Highlighted the requested control',
}));

handlers.set('ui.openHelpTopic', async ({ topicId }) => {
  openPanel('tikaPanel');
  document.dispatchEvent(new CustomEvent('domistika:v090-open-help', { detail: { topicId } }));
  return { result: { topicId }, message: 'Opened local help' };
});

handlers.set('canvas.fit', async () => {
  const before = window.domistikaNavigation?.getState?.() || null;
  window.domistikaNavigation?.fit?.();
  return {
    result: { fitted: true },
    message: 'Canvas fitted to the viewport',
    undo: before && window.domistikaNavigation ? async () => restoreViewport(before) : null,
    undoDescriptor: before ? { type: 'viewport.restore', state: before } : null,
  };
});

handlers.set('tool.select', async ({ tool }) => {
  const previous = document.querySelector('[data-tool].active')?.dataset.tool || null;
  const target = document.querySelector(`[data-tool="${CSS.escape(tool)}"]`);
  if (!target) throw new Error(`Tool is unavailable: ${tool}`);
  target.click();
  return {
    result: { tool },
    message: `${target.querySelector('small')?.textContent || tool} selected`,
    undo: previous ? async () => document.querySelector(`[data-tool="${CSS.escape(previous)}"]`)?.click() : null,
    undoDescriptor: previous ? { type: 'command', command: 'tool.select', args: { tool: previous } } : null,
  };
});

handlers.set('brush.select', async ({ brushId, brushName }) => {
  const previousName = document.querySelector('#selectedBrushName')?.textContent?.trim() || null;
  openPanel('brushesPanel');
  const target = await waitFor(() => [...document.querySelectorAll('.brush-card')].find((card) => {
    const name = card.querySelector('.brush-name')?.textContent?.trim();
    return (brushName && name?.toLowerCase() === String(brushName).toLowerCase())
      || (brushId && card.dataset.brushId === brushId);
  }));
  target.click();
  return {
    result: { brushName: target.querySelector('.brush-name')?.textContent?.trim() || brushName || brushId },
    message: `${target.querySelector('.brush-name')?.textContent?.trim() || 'Brush'} selected`,
    undo: previousName ? async () => {
      openPanel('brushesPanel');
      const previous = [...document.querySelectorAll('.brush-card')].find((card) => card.querySelector('.brush-name')?.textContent?.trim() === previousName);
      previous?.click();
    } : null,
    undoDescriptor: previousName ? { type: 'command', command: 'brush.select', args: { brushName: previousName } } : null,
  };
});

handlers.set('setting.set', async ({ setting, value }) => {
  const map = {
    size: '#sizeInput', opacity: '#opacityInput', smoothing: '#smoothingInput', symmetry: '#symmetryInput', color: '#colorInput',
  };
  if (setting === 'grid' || setting === 'pressure') {
    const button = document.querySelector(setting === 'grid' ? '#gridToggle' : '#pressureToggle');
    if (!button) throw new Error(`${setting} control is unavailable.`);
    const previous = button.getAttribute('aria-pressed') === 'true';
    const next = Boolean(value);
    if (previous !== next) button.click();
    return {
      result: { setting, value: next },
      message: `${setting} ${next ? 'enabled' : 'disabled'}`,
      undo: async () => {
        const current = button.getAttribute('aria-pressed') === 'true';
        if (current !== previous) button.click();
      },
      undoDescriptor: { type: 'command', command: 'setting.set', args: { setting, value: previous } },
    };
  }
  const element = document.querySelector(map[setting]);
  if (!element) throw new Error(`Setting is unavailable: ${setting}`);
  const previous = element.value;
  element.value = String(value);
  dispatchInput(element);
  return {
    result: { setting, value: element.value },
    message: `${setting} changed to ${element.selectedOptions?.[0]?.textContent || element.value}`,
    undo: async () => { element.value = previous; dispatchInput(element); },
    undoDescriptor: { type: 'command', command: 'setting.set', args: { setting, value: previous } },
  };
});

handlers.set('guide.create', async ({ templateId, lessonId, title, opacity }) => {
  const engine = getLatestEngine();
  if (!engine?.createGuideLayer) throw new Error('Guide Layer engine is not ready.');
  const layer = engine.createGuideLayer(templateId, { lessonId, title, opacity });
  return {
    result: { layerId: layer.id, templateId, name: layer.name },
    message: `${layer.name} created and excluded from exports`,
    undo: async () => engine.removeGuideLayer(layer.id),
    undoDescriptor: { type: 'command', command: 'guide.remove', args: { layerId: layer.id } },
  };
});

handlers.set('guide.remove', async ({ layerId }) => {
  const engine = getLatestEngine();
  const layer = engine?.layers?.find((candidate) => candidate.id === layerId && candidate.kind === 'guide');
  if (!layer) throw new Error('Guide layer not found.');
  const snapshot = {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    opacity: layer.opacity,
    blendMode: layer.blendMode,
    kind: 'guide',
    guide: true,
    locked: layer.locked,
    exportPolicy: 'exclude-guide',
    guideMeta: layer.guideMeta,
    image: layer.canvas.toDataURL('image/png'),
  };
  engine.removeGuideLayer(layerId);
  return {
    result: { layerId },
    message: `${snapshot.name} removed`,
    undo: async () => restoreGuideSnapshot(engine, snapshot),
    undoDescriptor: snapshot.guideMeta?.templateId ? {
      type: 'guide.recreate',
      templateId: snapshot.guideMeta.templateId,
      lessonId: snapshot.guideMeta.lessonId || null,
      title: snapshot.name.replace(/^Guide · /, ''),
      opacity: snapshot.opacity,
      visible: snapshot.visible,
    } : null,
  };
});

handlers.set('lesson.setStep', async ({ lessonId, stepIndex }) => {
  document.dispatchEvent(new CustomEvent('domistika:v090-lesson-step', { detail: { lessonId, stepIndex } }));
  return { result: { lessonId, stepIndex }, message: `Lesson moved to step ${Number(stepIndex) + 1}` };
});

export function registerCommand(id, handler) {
  if (!id || typeof handler !== 'function') throw new Error('A command id and handler are required.');
  handlers.set(id, handler);
}

export async function executeCommand(id, args = {}, meta = {}) {
  const spec = commandSpec(id);
  const receipt = {
    id: uid(),
    timestamp: new Date().toISOString(),
    source: meta.source || 'tika-local',
    request: String(meta.request || ''),
    interpretation: String(meta.interpretation || spec.description),
    command: id,
    authority: spec.authority,
    mutatesProject: Boolean(spec.mutatesProject),
    args,
    before: collectStudioContext(),
    after: null,
    result: null,
    status: 'pending',
    undoAvailable: false,
    undoDescriptor: null,
    undoOf: meta.undoOf || null,
  };
  const handler = handlers.get(id);
  if (!handler) {
    receipt.status = 'failed';
    receipt.error = `Command is not registered: ${id}`;
    saveReceipt(receipt);
    throw new Error(receipt.error);
  }
  try {
    const outcome = await handler(args, meta) || {};
    receipt.result = outcome.result ?? null;
    receipt.after = collectStudioContext();
    receipt.status = 'applied';
    receipt.message = outcome.message || `${id} applied`;
    receipt.undoDescriptor = outcome.undoDescriptor || null;
    receipt.undoAvailable = typeof outcome.undo === 'function' || persistentUndoAvailable(receipt.undoDescriptor);
    if (typeof outcome.undo === 'function') undoHandlers.set(receipt.id, outcome.undo);
    saveReceipt(receipt);
    status(receipt.message);
    return receipt;
  } catch (error) {
    receipt.status = 'failed';
    receipt.error = error instanceof Error ? error.message : String(error);
    receipt.after = collectStudioContext();
    saveReceipt(receipt);
    status(`Tika could not complete that action: ${receipt.error}`);
    throw error;
  }
}

export async function undoReceipt(receiptId, request = 'Undo Tika action') {
  const original = readReceipts().find((receipt) => receipt.id === receiptId);
  const undo = undoHandlers.get(receiptId);
  if (!undo && !persistentUndoAvailable(original?.undoDescriptor)) throw new Error('This receipt has no valid undo route. Normal Domistika Undo may still be available.');
  const receipt = {
    id: uid('undo'),
    timestamp: new Date().toISOString(),
    source: 'tika-local',
    request,
    interpretation: `Undo ${original?.command || receiptId}`,
    command: 'receipt.undo',
    authority: 'collaborator',
    mutatesProject: true,
    args: { receiptId },
    before: collectStudioContext(),
    after: null,
    result: null,
    status: 'pending',
    undoAvailable: false,
    undoDescriptor: null,
    undoOf: receiptId,
  };
  try {
    if (undo) await undo();
    else await performPersistentUndo(original.undoDescriptor);
    undoHandlers.delete(receiptId);
    receipt.status = 'applied';
    receipt.message = `Undid ${original?.message || original?.command || 'Tika action'}`;
    receipt.after = collectStudioContext();
    saveReceipt(receipt);
    status(receipt.message);
    return receipt;
  } catch (error) {
    receipt.status = 'failed';
    receipt.error = error instanceof Error ? error.message : String(error);
    receipt.after = collectStudioContext();
    saveReceipt(receipt);
    throw error;
  }
}

export function getReceipts(limit = 20) {
  return readReceipts().slice(0, limit).map((receipt) => ({
    ...receipt,
    undoAvailable: Boolean(receipt.undoAvailable && (undoHandlers.has(receipt.id) || persistentUndoAvailable(receipt.undoDescriptor))),
  }));
}

export function clearReceipts() {
  writeReceipts([]);
  undoHandlers.clear();
  document.dispatchEvent(new CustomEvent('domistika:v090-receipts-cleared'));
}

export function subscribeReceipts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function registeredCommands() {
  return [...handlers.keys()];
}
