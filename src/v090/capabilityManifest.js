export const AUTHORITY = Object.freeze({
  COACH: 'coach',
  ASSISTANT: 'assistant',
  COLLABORATOR: 'collaborator',
});

export const PANEL_CAPABILITIES = Object.freeze([
  { id: 'brushesPanel', label: 'Brushes', keywords: ['brush', 'pencil', 'pen', 'charcoal', 'paint', 'eraser'], selector: '#brushesPanel' },
  { id: 'layersPanel', label: 'Layers', keywords: ['layer', 'opacity', 'blend', 'duplicate'], selector: '#layersPanel' },
  { id: 'referencePanel', label: '3D Form Lab', keywords: ['3d', 'form', 'lighting', 'sphere', 'head'], selector: '#referencePanel' },
  { id: 'artistStudioPanel', label: 'Artist Studio', keywords: ['reference image', 'palette', 'color harmony', 'timelapse'], selector: '#artistStudioPanel' },
  { id: 'selectionTransformPanel', label: 'Transform', keywords: ['selection', 'lasso', 'move', 'scale', 'rotate'], selector: '#selectionTransformPanel' },
  { id: 'advancedLayersPanel', label: 'Layers+', keywords: ['warp', 'mesh', 'perspective', 'clipping', 'mask paint'], selector: '#advancedLayersPanel' },
  { id: 'smartMasksPanel', label: 'Smart Masks', keywords: ['magic wand', 'color range', 'feather', 'mask'], selector: '#smartMasksPanel' },
  { id: 'spiroPanel', label: 'Spiro Lab', keywords: ['spiro', 'hypotrochoid', 'epitrochoid', 'mandala'], selector: '#spiroPanel' },
  { id: 'spiroAssistPanel', label: 'Spiro Assist', keywords: ['array', 'golden angle', 'ring layout', 'hue cycle'], selector: '#spiroAssistPanel' },
  { id: 'effectsPanel', label: 'Effects', keywords: ['effect', 'glow', 'film', 'pixel', 'finishing'], selector: '#effectsPanel' },
  { id: 'tikaPanel', label: 'Tika', keywords: ['help', 'guide', 'lesson', 'suggestion', 'receipt'], selector: '#tikaPanel' },
]);

export const COMMAND_CAPABILITIES = Object.freeze([
  { id: 'ui.openPanel', authority: AUTHORITY.COACH, mutatesProject: false, description: 'Open a registered workspace panel.' },
  { id: 'ui.highlightControl', authority: AUTHORITY.COACH, mutatesProject: false, description: 'Open, scroll to, and visibly highlight a live control.' },
  { id: 'ui.openHelpTopic', authority: AUTHORITY.COACH, mutatesProject: false, description: 'Open a local help topic.' },
  { id: 'canvas.fit', authority: AUTHORITY.COLLABORATOR, mutatesProject: false, description: 'Fit the canvas inside the viewport.' },
  { id: 'tool.select', authority: AUTHORITY.COLLABORATOR, mutatesProject: false, description: 'Select a drawing or shape tool.' },
  { id: 'brush.select', authority: AUTHORITY.COLLABORATOR, mutatesProject: false, description: 'Select a registered brush preset.' },
  { id: 'setting.set', authority: AUTHORITY.COLLABORATOR, mutatesProject: true, description: 'Change an approved visible studio setting.' },
  { id: 'guide.create', authority: AUTHORITY.ASSISTANT, mutatesProject: true, description: 'Create a persistent guide layer excluded from exports.' },
  { id: 'guide.remove', authority: AUTHORITY.COLLABORATOR, mutatesProject: true, description: 'Remove one guide layer.' },
  { id: 'lesson.setStep', authority: AUTHORITY.COACH, mutatesProject: false, description: 'Move within an active local lesson.' },
  { id: 'receipt.undo', authority: AUTHORITY.COLLABORATOR, mutatesProject: true, description: 'Invoke a stored undo strategy and record the result.' },
]);

export const HELP_TOPICS = Object.freeze([
  {
    id: 'symmetry',
    title: 'Symmetry and pattern modes',
    summary: 'Repeat each mark as a mirror, radial pattern, kaleidoscope, spiral, orbit, echo, drift, or ripple field.',
    keywords: ['symmetry', 'radial', 'mirror', 'mandala', 'kaleidoscope', 'spiral', 'orbit', 'echo', 'drift', 'ripple', 'pattern'],
    target: '#symmetryInput',
    panelId: null,
    tip: 'Radial 8 or 12 is a friendly starting point for mandalas. Orbit, Echo, Drift, and Ripple deliberately create controlled irregularity.',
  },
  {
    id: 'brush-library',
    title: 'Brush Library',
    summary: 'Browse illustrated pencils, pens, paint tools, texture brushes, airbrushes, and erasers.',
    keywords: ['brush', 'pencil', 'pen', 'charcoal', 'paint', 'airbrush', 'eraser', 'brush library'],
    target: '#brushShelfButton',
    panelId: 'brushesPanel',
    tip: 'Graphite HB is forgiving for sketching. Technical Pen Fine is useful for clean outlines. Soft Airbrush builds gentle value changes.',
  },
  {
    id: 'brush-size',
    title: 'Brush size',
    summary: 'Change the diameter of the active drawing tool.',
    keywords: ['size', 'thicker', 'thinner', 'line width', 'brush width'],
    target: '#sizeInput',
    panelId: null,
    tip: 'Use [ and ] for quick size changes while drawing.',
  },
  {
    id: 'steady-stroke',
    title: 'Steady stroke',
    summary: 'Smooth pointer movement to make cleaner curves and slower, more controlled lines.',
    keywords: ['steady', 'smooth', 'smoothing', 'wobbly', 'clean line', 'stabilizer'],
    target: '#smoothingInput',
    panelId: null,
    tip: 'Higher values feel steadier but less immediate. Try 55–75% for controlled outlines.',
  },
  {
    id: 'layers',
    title: 'Layers',
    summary: 'Keep sketch, ink, color, effects, and experiments separate so they remain editable.',
    keywords: ['layer', 'duplicate', 'opacity', 'blend', 'separate', 'non destructive'],
    target: '#layersPanel',
    panelId: 'layersPanel',
    tip: 'A simple workflow is Sketch → Ink → Color → Effects, with each phase on its own layer.',
  },
  {
    id: 'guide-layers',
    title: 'Guide Layers',
    summary: 'Instructional construction layers stay in the project but are excluded from image exports by default.',
    keywords: ['guide', 'tracing', 'construction', 'lesson', 'scaffold', 'non exporting'],
    target: '#tikaGuideSection',
    panelId: 'tikaPanel',
    tip: 'Guide layers are locked against drawing. Select a normal art layer before making marks.',
  },
  {
    id: 'selection-transform',
    title: 'Selection and Transform',
    summary: 'Lift pixels, move them, resize them, rotate them, flip them, copy them, or paste them.',
    keywords: ['select', 'selection', 'lasso', 'move pixels', 'resize', 'rotate', 'copy', 'paste'],
    target: '[data-v04-select]',
    panelId: 'selectionTransformPanel',
    tip: 'Commit creates one clean undo step. Cancel restores the original layer snapshot.',
  },
  {
    id: 'smart-masks',
    title: 'Smart Select and Masks',
    summary: 'Select connected or similar colors, refine edges, and preserve pixels with non-destructive masks.',
    keywords: ['mask', 'magic wand', 'color range', 'feather', 'grow', 'shrink', 'smart select'],
    target: '[data-panel="smartMasksPanel"]',
    panelId: 'smartMasksPanel',
    tip: 'A mask hides pixels without deleting them, making later correction much safer.',
  },
  {
    id: 'effects',
    title: 'Effects and Finishing',
    summary: 'Preview color, glow, film, haze, pixel, and tonal treatments before applying them.',
    keywords: ['effect', 'glow', 'finish', 'contrast', 'saturation', 'hue', 'film', 'pixel'],
    target: '[data-panel="effectsPanel"]',
    panelId: 'effectsPanel',
    tip: 'Apply to Copy protects the original layer while you compare finishing ideas.',
  },
  {
    id: 'spiro',
    title: 'Spiro Lab',
    summary: 'Generate editable spirograph curves, medallions, arrays, and pattern fields.',
    keywords: ['spiro', 'spirograph', 'flower', 'gear', 'medallion', 'array'],
    target: '[data-panel="spiroPanel"]',
    panelId: 'spiroPanel',
    tip: 'Place-on-canvas mode lets you stamp one generated design wherever you choose.',
  },
  {
    id: 'reference-board',
    title: 'Reference image and palette',
    summary: 'Load a floating reference, mirror or rotate it, and extract a clickable color palette.',
    keywords: ['reference', 'photo', 'palette', 'colors from image', 'mirror image'],
    target: '[data-panel="artistStudioPanel"]',
    panelId: 'artistStudioPanel',
    tip: 'A reference is information, not an obligation. Simplify it to the shapes useful for your idea.',
  },
  {
    id: 'canvas-navigation',
    title: 'Move and zoom the canvas',
    summary: 'Pan with Space, the arrow or number-pad keys, or the on-canvas navigation pad. Zoom with + and −.',
    keywords: ['move canvas', 'pan', 'zoom', 'fit', 'arrow keys', 'numpad', 'plus', 'minus'],
    target: '.domistika-nav-pad',
    panelId: null,
    tip: 'Press 0 to fit the full canvas. Hold Shift while moving with keys for a larger step.',
  },
  {
    id: 'export',
    title: 'Export artwork',
    summary: 'Flatten visible art layers into PNG or JPEG while keeping guide layers out of the result.',
    keywords: ['export', 'png', 'jpeg', 'save image', 'transparent'],
    target: '#exportImage',
    panelId: null,
    tip: 'Download the editable .domistika project separately when you want to keep layers and guides.',
  },
  {
    id: 'left-handed-layout',
    title: 'Left- and right-handed layout',
    summary: 'Move the main tool rail to the side that keeps it away from your drawing hand.',
    keywords: ['left handed', 'right handed', 'lefty', 'handedness', 'tool side'],
    target: '#handedToggle',
    panelId: null,
    tip: 'The layout switch changes the workspace arrangement without altering the artwork.',
  },
]);

const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function searchHelp(query, limit = 8) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return HELP_TOPICS.slice(0, limit).map((topic) => ({ topic, score: 1 }));
  return HELP_TOPICS
    .map((topic) => {
      const haystack = normalize([topic.title, topic.summary, topic.tip, ...topic.keywords].join(' '));
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 3 : 0), 0)
        + (normalize(topic.title).includes(normalize(query)) ? 8 : 0)
        + (topic.keywords.some((keyword) => normalize(keyword) === normalize(query)) ? 6 : 0);
      return { topic, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.topic.title.localeCompare(b.topic.title))
    .slice(0, limit);
}

export function capabilitySnapshot() {
  const livePanels = [...document.querySelectorAll('.inspector-tabs button[data-panel]')].map((button) => ({
    id: button.dataset.panel,
    label: button.textContent.trim(),
    available: Boolean(document.getElementById(button.dataset.panel)),
  }));
  return {
    version: '0.9.0',
    panels: livePanels,
    commands: COMMAND_CAPABILITIES,
    helpTopics: HELP_TOPICS.map(({ id, title, keywords, panelId, target }) => ({ id, title, keywords, panelId, target })),
  };
}
