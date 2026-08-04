import { getLatestEngine } from './guideLayer.js';

const GOAL_KEY = 'domistika-v090-project-goal';

export function setProjectGoal(goal) {
  const value = String(goal || '').trim().slice(0, 240);
  try { localStorage.setItem(GOAL_KEY, value); } catch {}
  document.dispatchEvent(new CustomEvent('domistika:v090-goal', { detail: { goal: value } }));
  return value;
}

export function getProjectGoal() {
  try { return localStorage.getItem(GOAL_KEY) || ''; } catch { return ''; }
}

function activeTool() {
  return document.querySelector('[data-tool].active')?.dataset.tool || getLatestEngine()?.tool || 'unknown';
}

function activeBrush() {
  return document.querySelector('#selectedBrushName')?.textContent?.trim()
    || document.querySelector('.brush-card.active .brush-name')?.textContent?.trim()
    || activeTool();
}

function activeLayerSummary(engine) {
  const layer = engine?.activeLayer;
  if (!layer) return null;
  return {
    id: layer.id,
    name: layer.name,
    kind: layer.kind || 'art',
    visible: layer.visible !== false,
    opacity: Number(layer.opacity ?? 1),
    blendMode: layer.blendMode || 'normal',
    locked: Boolean(layer.locked),
  };
}

export function collectStudioContext() {
  const engine = getLatestEngine();
  const color = document.querySelector('#colorInput')?.value || engine?.settings?.color || '#000000';
  const symmetrySelect = document.querySelector('#symmetryInput');
  const layers = engine?.layers || [];
  return {
    schema: 'domistika-context-v1',
    collectedAt: new Date().toISOString(),
    privacy: {
      mode: 'local-only',
      providerConfigured: false,
      artworkPixelsIncluded: false,
      note: 'This context contains settings and interface state only.',
    },
    project: {
      name: document.querySelector('#projectName')?.value?.trim() || 'Untitled Domistika',
      goal: getProjectGoal(),
      width: engine?.width || null,
      height: engine?.height || null,
    },
    tool: {
      active: activeTool(),
      brush: activeBrush(),
      color,
      size: Number(document.querySelector('#sizeInput')?.value ?? engine?.settings?.size ?? 0),
      opacity: Number(document.querySelector('#opacityInput')?.value ?? (engine?.settings?.opacity || 1) * 100),
      smoothing: Number(document.querySelector('#smoothingInput')?.value ?? engine?.settings?.smoothing ?? 0),
      pressure: document.querySelector('#pressureToggle')?.getAttribute('aria-pressed') === 'true',
    },
    pattern: {
      mode: symmetrySelect?.value || engine?.settings?.symmetry || 'none',
      label: symmetrySelect?.selectedOptions?.[0]?.textContent || 'Off',
      grid: document.querySelector('#gridToggle')?.getAttribute('aria-pressed') === 'true',
    },
    layers: {
      count: layers.length,
      artCount: layers.filter((layer) => layer.kind !== 'guide').length,
      guideCount: layers.filter((layer) => layer.kind === 'guide').length,
      active: activeLayerSummary(engine),
    },
    viewport: window.domistikaNavigation?.getState?.() || null,
  };
}

export function contextSummary(context = collectStudioContext()) {
  const parts = [
    `${context.tool.brush} (${context.tool.active})`,
    `${context.pattern.label} pattern`,
    `${context.layers.artCount} art layer${context.layers.artCount === 1 ? '' : 's'}`,
  ];
  if (context.layers.guideCount) parts.push(`${context.layers.guideCount} guide layer${context.layers.guideCount === 1 ? '' : 's'}`);
  if (context.project.goal) parts.push(`goal: ${context.project.goal}`);
  return parts.join(' · ');
}
