const BUILT_IN_BRUSHES = [
  { id: 'graphite-hb', name: 'Graphite HB', category: 'Sketching', tool: 'pencil', size: 9, opacity: 72, smoothing: 34, pressure: true, description: 'Balanced everyday sketch pencil.' },
  { id: 'graphite-2b', name: 'Graphite 2B', category: 'Sketching', tool: 'pencil', size: 16, opacity: 62, smoothing: 30, pressure: true, description: 'Softer graphite for confident lines.' },
  { id: 'graphite-6b', name: 'Graphite 6B', category: 'Sketching', tool: 'pencil', size: 28, opacity: 46, smoothing: 24, pressure: true, description: 'Dark, broad graphite shading.' },
  { id: 'mechanical-03', name: 'Mechanical 0.3', category: 'Sketching', tool: 'pencil', size: 3, opacity: 92, smoothing: 72, pressure: true, description: 'Crisp construction and detail lines.' },
  { id: 'mechanical-07', name: 'Mechanical 0.7', category: 'Sketching', tool: 'pencil', size: 6, opacity: 86, smoothing: 66, pressure: true, description: 'Clean sketching with a little weight.' },
  { id: 'loose-pencil', name: 'Loose Pencil', category: 'Sketching', tool: 'pencil', size: 12, opacity: 54, smoothing: 10, pressure: true, description: 'Responsive, lively thumbnail strokes.' },
  { id: 'gesture-pencil', name: 'Gesture Pencil', category: 'Sketching', tool: 'pencil', size: 20, opacity: 42, smoothing: 5, pressure: true, description: 'Fast figure and motion studies.' },
  { id: 'charcoal-stick', name: 'Charcoal Stick', category: 'Sketching', tool: 'pencil', size: 44, opacity: 38, smoothing: 16, pressure: true, description: 'Broad charcoal-style blocking.' },
  { id: 'compressed-charcoal', name: 'Compressed Charcoal', category: 'Sketching', tool: 'pencil', size: 31, opacity: 64, smoothing: 20, pressure: true, description: 'Dense dark values and accents.' },
  { id: 'soft-chalk', name: 'Soft Chalk', category: 'Sketching', tool: 'pencil', size: 36, opacity: 34, smoothing: 12, pressure: true, description: 'Soft, low-opacity value building.' },

  { id: 'technical-fine', name: 'Technical Pen Fine', category: 'Inking', tool: 'ink', size: 3, opacity: 100, smoothing: 78, pressure: false, description: 'Uniform fine technical line.' },
  { id: 'technical-bold', name: 'Technical Pen Bold', category: 'Inking', tool: 'ink', size: 8, opacity: 100, smoothing: 74, pressure: false, description: 'Uniform bold technical line.' },
  { id: 'fountain-pen', name: 'Fountain Pen', category: 'Inking', tool: 'ink', size: 11, opacity: 94, smoothing: 58, pressure: true, description: 'Smooth expressive writing and linework.' },
  { id: 'comic-nib', name: 'Comic Nib', category: 'Inking', tool: 'ink', size: 14, opacity: 100, smoothing: 64, pressure: true, description: 'Pressure-led comic contours.' },
  { id: 'brush-pen-fine', name: 'Brush Pen Fine', category: 'Inking', tool: 'ink', size: 9, opacity: 96, smoothing: 52, pressure: true, description: 'Tapered-feeling detail strokes.' },
  { id: 'brush-pen-bold', name: 'Brush Pen Bold', category: 'Inking', tool: 'ink', size: 25, opacity: 92, smoothing: 42, pressure: true, description: 'Bold expressive ink strokes.' },
  { id: 'dry-ink', name: 'Dry Ink', category: 'Inking', tool: 'pencil', size: 13, opacity: 78, smoothing: 22, pressure: true, description: 'Rougher ink-like line quality.' },
  { id: 'sumi-line', name: 'Sumi Line', category: 'Inking', tool: 'ink', size: 34, opacity: 76, smoothing: 28, pressure: true, description: 'Large gestural black-ink marks.' },
  { id: 'lettering-pen', name: 'Lettering Pen', category: 'Inking', tool: 'ink', size: 17, opacity: 100, smoothing: 82, pressure: true, description: 'Controlled lettering and curves.' },
  { id: 'tattoo-liner', name: 'Tattoo Liner', category: 'Inking', tool: 'ink', size: 5, opacity: 100, smoothing: 88, pressure: false, description: 'Very steady, consistent outlines.' },

  { id: 'round-painter', name: 'Round Painter', category: 'Painting', tool: 'marker', size: 24, opacity: 68, smoothing: 44, pressure: true, description: 'General-purpose paint layering.' },
  { id: 'broad-painter', name: 'Broad Painter', category: 'Painting', tool: 'marker', size: 52, opacity: 48, smoothing: 28, pressure: true, description: 'Broad color and value masses.' },
  { id: 'gouache-detail', name: 'Gouache Detail', category: 'Painting', tool: 'marker', size: 16, opacity: 82, smoothing: 54, pressure: true, description: 'Opaque-feeling small paint strokes.' },
  { id: 'gouache-block', name: 'Gouache Block', category: 'Painting', tool: 'marker', size: 74, opacity: 72, smoothing: 22, pressure: true, description: 'Fast opaque color blocking.' },
  { id: 'watercolor-detail', name: 'Watercolor Detail', category: 'Painting', tool: 'marker', size: 18, opacity: 24, smoothing: 58, pressure: true, description: 'Transparent detail glazing.' },
  { id: 'watercolor-wash', name: 'Watercolor Wash', category: 'Painting', tool: 'marker', size: 96, opacity: 14, smoothing: 72, pressure: true, description: 'Large transparent washes.' },
  { id: 'oil-bristle', name: 'Oil Bristle', category: 'Painting', tool: 'marker', size: 38, opacity: 58, smoothing: 18, pressure: true, description: 'Heavier painterly marks.' },
  { id: 'acrylic-round', name: 'Acrylic Round', category: 'Painting', tool: 'marker', size: 29, opacity: 76, smoothing: 36, pressure: true, description: 'Clean opaque acrylic-style stroke.' },
  { id: 'color-glaze', name: 'Color Glaze', category: 'Painting', tool: 'marker', size: 82, opacity: 10, smoothing: 78, pressure: false, description: 'Build color slowly over an area.' },
  { id: 'block-in', name: 'Block-In Brush', category: 'Painting', tool: 'marker', size: 126, opacity: 42, smoothing: 16, pressure: true, description: 'Huge early-stage composition marks.' },

  { id: 'soft-airbrush', name: 'Soft Airbrush', category: 'Air & Texture', tool: 'airbrush', size: 42, opacity: 46, smoothing: 72, pressure: true, description: 'Soft shadows and smooth transitions.' },
  { id: 'large-airbrush', name: 'Large Airbrush', category: 'Air & Texture', tool: 'airbrush', size: 94, opacity: 30, smoothing: 78, pressure: true, description: 'Large atmospheric gradients.' },
  { id: 'glow-mist', name: 'Glow Mist', category: 'Air & Texture', tool: 'airbrush', size: 68, opacity: 18, smoothing: 84, pressure: false, description: 'Subtle glow and bloom buildup.' },
  { id: 'grain-shader', name: 'Grain Shader', category: 'Air & Texture', tool: 'airbrush', size: 22, opacity: 38, smoothing: 30, pressure: true, description: 'Compact soft shading texture.' },
  { id: 'charcoal-dust', name: 'Charcoal Dust', category: 'Air & Texture', tool: 'airbrush', size: 31, opacity: 54, smoothing: 12, pressure: true, description: 'Dark dusty value buildup.' },
  { id: 'pastel-soft', name: 'Pastel Soft', category: 'Air & Texture', tool: 'pencil', size: 48, opacity: 32, smoothing: 20, pressure: true, description: 'Soft pastel-like broad strokes.' },
  { id: 'cloud-builder', name: 'Cloud Builder', category: 'Air & Texture', tool: 'airbrush', size: 132, opacity: 16, smoothing: 86, pressure: true, description: 'Build clouds, haze, and soft forms.' },
  { id: 'background-fog', name: 'Background Fog', category: 'Air & Texture', tool: 'airbrush', size: 176, opacity: 9, smoothing: 90, pressure: false, description: 'Very broad atmospheric fog.' },

  { id: 'precision-eraser', name: 'Precision Eraser', category: 'Erasers', tool: 'eraser', size: 6, opacity: 100, smoothing: 82, pressure: true, description: 'Small controlled cleanup.' },
  { id: 'hard-eraser', name: 'Hard Eraser', category: 'Erasers', tool: 'eraser', size: 20, opacity: 100, smoothing: 58, pressure: true, description: 'Firm everyday erasing.' },
  { id: 'soft-eraser', name: 'Soft Eraser', category: 'Erasers', tool: 'eraser', size: 54, opacity: 38, smoothing: 76, pressure: true, description: 'Gradual soft cleanup.' },
  { id: 'large-eraser', name: 'Large Eraser', category: 'Erasers', tool: 'eraser', size: 118, opacity: 100, smoothing: 64, pressure: false, description: 'Clear large areas quickly.' },
  { id: 'kneaded-eraser', name: 'Kneaded Eraser', category: 'Erasers', tool: 'eraser', size: 34, opacity: 24, smoothing: 68, pressure: true, description: 'Lift values gradually.' },
];

const FAVORITES_KEY = 'domistika-brush-favorites-v1';
const CUSTOM_KEY = 'domistika-custom-brushes-v1';
const ACTIVE_KEY = 'domistika-active-brush-v1';

function readJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;',
  })[character]);
}

function setRange(selector, value) {
  const input = document.querySelector(selector);
  if (!input) return;
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function setPressure(enabled) {
  const button = document.querySelector('#pressureToggle');
  if (!button) return;
  const current = button.getAttribute('aria-pressed') === 'true';
  if (current !== enabled) button.click();
}

function activatePanel(panelId) {
  document.querySelectorAll('.inspector-tabs button').forEach((button) => {
    button.classList.toggle('active', button.dataset.panel === panelId);
  });
  document.querySelectorAll('.inspector-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === panelId);
  });
}

function drawPreview(canvas, brush) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = 116;
  const height = 38;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  if (brush.tool === 'eraser') {
    ctx.fillStyle = '#d7cedd';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#bdb2c5';
    for (let x = 0; x < width; x += 10) for (let y = 0; y < height; y += 10) {
      if ((x / 10 + y / 10) % 2 === 0) ctx.fillRect(x, y, 10, 10);
    }
  }

  const lineWidth = Math.max(2, Math.min(18, 2 + brush.size * 0.1));
  const alpha = Math.max(0.25, Math.min(1, brush.opacity / 100));
  const stroke = brush.tool === 'eraser' ? '#fff' : '#f4c77d';
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = brush.tool === 'marker' ? lineWidth * 1.35 : lineWidth;
  if (brush.tool === 'airbrush') {
    ctx.shadowColor = '#f4c77d';
    ctx.shadowBlur = 12;
    ctx.globalAlpha = Math.max(0.2, alpha * 0.72);
  }
  ctx.beginPath();
  ctx.moveTo(7, 27);
  ctx.bezierCurveTo(32, 4, 54, 36, 78, 12);
  ctx.bezierCurveTo(90, 2, 103, 10, 110, 20);
  ctx.stroke();
  ctx.restore();
}

function createStyles() {
  const style = document.createElement('style');
  style.id = 'domistika-brush-library-styles';
  style.textContent = `
    .inspector-tabs{grid-template-columns:repeat(3,1fr)!important}
    .brush-open-button{display:flex;align-items:center;gap:7px;border:1px solid rgba(255,191,105,.28);border-radius:10px;padding:8px 11px;cursor:pointer;color:var(--ink);background:linear-gradient(135deg,rgba(255,191,105,.13),rgba(141,108,255,.14));white-space:nowrap}
    .brush-open-button strong{font-size:12px}.brush-open-button span{font-size:17px}
    .brush-library-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:11px}
    .brush-library-head h2{margin:0;font-size:16px}.brush-library-head p{margin:3px 0 0;color:var(--muted);font-size:10px;line-height:1.4}
    .brush-close-button{display:none;width:34px;height:34px;border:1px solid var(--line);border-radius:10px;color:var(--ink);background:var(--panel2);cursor:pointer}
    .brush-search{width:100%;padding:9px 10px;border:1px solid var(--line);border-radius:10px;color:var(--ink);background:var(--panel2);font-size:11px}
    .brush-categories{display:flex;gap:6px;overflow-x:auto;padding:9px 0 8px;scrollbar-width:thin}
    .brush-category{flex:0 0 auto;border:1px solid var(--line);border-radius:999px;padding:6px 9px;color:var(--muted);background:transparent;cursor:pointer;font-size:9px}
    .brush-category.active{color:#1a131d;border-color:transparent;background:linear-gradient(135deg,var(--warm),#ff9a71);font-weight:800}
    .brush-summary{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:2px 0 9px;color:var(--muted);font-size:9px}
    .save-brush-button{border:1px solid var(--line);border-radius:8px;padding:5px 8px;color:var(--ink);background:var(--panel2);cursor:pointer;font-size:9px}
    .brush-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding-bottom:12px}
    .brush-card{position:relative;min-width:0;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:8px;color:var(--ink);background:rgba(255,255,255,.025);cursor:pointer;text-align:left}
    .brush-card:hover{border-color:rgba(255,191,105,.25);background:rgba(255,191,105,.06)}
    .brush-card:focus-visible{outline:2px solid var(--warm);outline-offset:2px}
    .brush-card.active{border-color:rgba(255,191,105,.62);background:linear-gradient(145deg,rgba(255,191,105,.11),rgba(141,108,255,.1));box-shadow:inset 0 0 0 1px rgba(255,191,105,.09)}
    .brush-preview{display:block;width:100%;height:36px;margin-bottom:5px;border-radius:7px;background:#29222f}
    .brush-name{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;font-weight:750;padding-right:17px}
    .brush-meta{display:block;margin-top:2px;color:var(--muted);font-size:8px}
    .brush-favorite,.brush-delete{position:absolute;right:5px;top:4px;width:24px;height:24px;border:0;border-radius:7px;color:#b5a8bd;background:rgba(20,16,24,.72);cursor:pointer;font-size:14px;line-height:1}
    .brush-favorite.on{color:var(--warm)}.brush-delete{color:#ff9a9a}
    .brush-empty{grid-column:1/-1;padding:24px 12px;color:var(--muted);border:1px dashed var(--line);border-radius:12px;text-align:center;font-size:11px;line-height:1.5}
    .brush-selection{padding:10px;border:1px solid var(--line);border-radius:11px;background:rgba(141,108,255,.07)}
    .brush-selection strong{display:block;font-size:11px}.brush-selection span{display:block;margin-top:3px;color:var(--muted);font-size:9px;line-height:1.4}
    .brush-drawer-backdrop{display:none}
    @media(max-width:1000px){
      .brush-close-button{display:block}
      .studio.brush-drawer-open .inspector{display:grid!important;position:fixed;top:64px;bottom:38px;z-index:151;width:min(370px,92vw);grid-template-rows:auto 1fr;background:rgba(21,17,25,.99);box-shadow:0 20px 80px rgba(0,0,0,.65)}
      .studio.lefty-mode.brush-drawer-open .inspector{left:0!important;right:auto!important}
      .studio:not(.lefty-mode).brush-drawer-open .inspector{right:0!important;left:auto!important}
      .studio.brush-drawer-open .brush-drawer-backdrop{display:block;position:fixed;inset:64px 0 38px;z-index:150;background:rgba(4,3,6,.58);backdrop-filter:blur(2px)}
    }
    @media(max-width:680px){
      .brush-open-button strong{display:none}.brush-open-button{padding:7px 9px}
      .studio.brush-drawer-open .inspector{top:56px}
      .studio.brush-drawer-open .brush-drawer-backdrop{inset:56px 0 38px}
      .brush-grid{grid-template-columns:1fr 1fr}
    }
  `;
  document.head.appendChild(style);
}

function initBrushLibrary() {
  const studio = document.querySelector('#studio');
  const inspector = document.querySelector('.inspector');
  const tabs = document.querySelector('.inspector-tabs');
  const layersPanel = document.querySelector('#layersPanel');
  const controlDeck = document.querySelector('.control-deck');
  if (!studio || !inspector || !tabs || !layersPanel || !controlDeck) return false;
  if (document.querySelector('#brushesPanel')) return true;

  createStyles();

  const state = {
    category: 'All',
    query: '',
    favorites: new Set(readJson(FAVORITES_KEY, [])),
    custom: readJson(CUSTOM_KEY, []),
    activeId: localStorage.getItem(ACTIVE_KEY) || 'graphite-hb',
  };

  const tab = document.createElement('button');
  tab.dataset.panel = 'brushesPanel';
  tab.textContent = 'Brushes';
  tabs.prepend(tab);

  const panel = document.createElement('section');
  panel.id = 'brushesPanel';
  panel.className = 'inspector-panel';
  panel.innerHTML = `
    <div class="brush-library-head">
      <div><h2>Brush Library</h2><p>43 built-in presets · favorites · your own saved brushes</p></div>
      <button class="brush-close-button" id="brushCloseButton" aria-label="Close brush library">×</button>
    </div>
    <input class="brush-search" id="brushSearch" type="search" placeholder="Search brushes…" autocomplete="off">
    <div class="brush-categories" id="brushCategories"></div>
    <div class="brush-summary"><span id="brushCount"></span><button class="save-brush-button" id="saveCurrentBrush">＋ Save current</button></div>
    <div class="brush-grid" id="brushGrid"></div>
    <div class="brush-selection"><strong id="selectedBrushName">Graphite HB</strong><span id="selectedBrushDescription">Balanced everyday sketch pencil.</span></div>
  `;
  inspector.insertBefore(panel, layersPanel);

  const openButton = document.createElement('button');
  openButton.id = 'brushShelfButton';
  openButton.className = 'brush-open-button';
  openButton.type = 'button';
  openButton.innerHTML = '<span>🖌</span><strong>Brushes</strong>';
  controlDeck.insertBefore(openButton, controlDeck.firstChild);

  const backdrop = document.createElement('div');
  backdrop.className = 'brush-drawer-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  studio.appendChild(backdrop);

  const allBrushes = () => [...BUILT_IN_BRUSHES, ...state.custom];
  const categories = () => ['All', 'Favorites', 'Sketching', 'Inking', 'Painting', 'Air & Texture', 'Erasers', 'My Brushes'];

  function closeDrawer() {
    studio.classList.remove('brush-drawer-open');
  }

  function openLibrary() {
    activatePanel('brushesPanel');
    if (window.matchMedia('(max-width: 1000px)').matches) studio.classList.add('brush-drawer-open');
  }

  function applyBrush(brush) {
    const toolButton = document.querySelector(`[data-tool="${brush.tool}"]`);
    toolButton?.click();
    setRange('#sizeInput', brush.size);
    setRange('#opacityInput', brush.opacity);
    setRange('#smoothingInput', brush.smoothing);
    setPressure(brush.pressure !== false);
    state.activeId = brush.id;
    localStorage.setItem(ACTIVE_KEY, brush.id);
    document.querySelector('#selectedBrushName').textContent = brush.name;
    document.querySelector('#selectedBrushDescription').textContent = brush.description;
    const status = document.querySelector('#statusMessage');
    if (status) status.textContent = `${brush.name} brush selected`;
    render();
    if (window.matchMedia('(max-width: 680px)').matches) closeDrawer();
  }

  function toggleFavorite(id) {
    if (state.favorites.has(id)) state.favorites.delete(id);
    else state.favorites.add(id);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...state.favorites]));
    render();
  }

  function deleteCustom(id) {
    state.custom = state.custom.filter((brush) => brush.id !== id);
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(state.custom));
    if (state.activeId === id) state.activeId = 'graphite-hb';
    render();
  }

  function visibleBrushes() {
    const query = state.query.trim().toLowerCase();
    return allBrushes().filter((brush) => {
      const categoryMatch = state.category === 'All'
        || (state.category === 'Favorites' && state.favorites.has(brush.id))
        || (state.category === 'My Brushes' && brush.custom)
        || brush.category === state.category;
      const searchMatch = !query || `${brush.name} ${brush.category} ${brush.description}`.toLowerCase().includes(query);
      return categoryMatch && searchMatch;
    });
  }

  function renderCategories() {
    const host = document.querySelector('#brushCategories');
    host.innerHTML = '';
    for (const category of categories()) {
      const button = document.createElement('button');
      button.className = `brush-category ${state.category === category ? 'active' : ''}`;
      button.type = 'button';
      button.textContent = category;
      button.addEventListener('click', () => { state.category = category; render(); });
      host.appendChild(button);
    }
  }

  function render() {
    renderCategories();
    const brushes = visibleBrushes();
    const grid = document.querySelector('#brushGrid');
    grid.innerHTML = '';
    document.querySelector('#brushCount').textContent = `${brushes.length} brush${brushes.length === 1 ? '' : 'es'}`;

    if (!brushes.length) {
      grid.innerHTML = '<div class="brush-empty">No brushes match this view.<br>Try another category or search.</div>';
      return;
    }

    for (const brush of brushes) {
      const card = document.createElement('div');
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      card.className = `brush-card ${brush.id === state.activeId ? 'active' : ''}`;
      card.title = `${brush.name} — ${brush.description}`;
      card.innerHTML = `
        <canvas class="brush-preview" aria-hidden="true"></canvas>
        <span class="brush-name">${escapeHtml(brush.name)}</span>
        <span class="brush-meta">${escapeHtml(brush.tool)} · ${brush.size}px · ${brush.opacity}%</span>
        ${brush.custom
          ? '<button type="button" class="brush-delete" aria-label="Delete custom brush">×</button>'
          : `<button type="button" class="brush-favorite ${state.favorites.has(brush.id) ? 'on' : ''}" aria-label="Favorite brush">★</button>`}
      `;
      card.addEventListener('click', (event) => {
        if (event.target.closest('.brush-favorite') || event.target.closest('.brush-delete')) return;
        applyBrush(brush);
      });
      card.addEventListener('keydown', (event) => {
        if (event.target !== card) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          applyBrush(brush);
        }
      });
      card.querySelector('.brush-favorite')?.addEventListener('click', () => toggleFavorite(brush.id));
      card.querySelector('.brush-delete')?.addEventListener('click', () => deleteCustom(brush.id));
      grid.appendChild(card);
      drawPreview(card.querySelector('canvas'), brush);
    }
  }

  tab.addEventListener('click', openLibrary);
  openButton.addEventListener('click', openLibrary);
  document.querySelector('#brushCloseButton').addEventListener('click', closeDrawer);
  backdrop.addEventListener('click', closeDrawer);
  document.querySelector('#brushSearch').addEventListener('input', (event) => {
    state.query = event.target.value;
    render();
  });
  document.querySelector('#saveCurrentBrush').addEventListener('click', () => {
    const activeTool = document.querySelector('[data-tool].active')?.dataset.tool;
    if (!['pencil', 'ink', 'marker', 'airbrush', 'eraser'].includes(activeTool)) {
      document.querySelector('#statusMessage').textContent = 'Choose a drawing brush before saving a preset';
      return;
    }
    const name = window.prompt('Name this brush preset:');
    if (!name?.trim()) return;
    const custom = {
      id: `custom-${Date.now()}`,
      name: name.trim().slice(0, 42),
      category: 'My Brushes',
      tool: activeTool,
      size: Number(document.querySelector('#sizeInput').value),
      opacity: Number(document.querySelector('#opacityInput').value),
      smoothing: Number(document.querySelector('#smoothingInput').value),
      pressure: document.querySelector('#pressureToggle').getAttribute('aria-pressed') === 'true',
      description: 'A locally saved custom Domistika brush.',
      custom: true,
    };
    state.custom.push(custom);
    state.category = 'My Brushes';
    state.activeId = custom.id;
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(state.custom));
    localStorage.setItem(ACTIVE_KEY, custom.id);
    render();
    document.querySelector('#selectedBrushName').textContent = custom.name;
    document.querySelector('#selectedBrushDescription').textContent = custom.description;
    document.querySelector('#statusMessage').textContent = `${custom.name} saved to My Brushes`;
  });

  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, select, textarea')) return;
    if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.metaKey && !event.altKey) openLibrary();
    if (event.key === 'Escape') closeDrawer();
  });

  render();
  activatePanel('brushesPanel');
  const selected = allBrushes().find((brush) => brush.id === state.activeId) || BUILT_IN_BRUSHES[0];
  document.querySelector('#selectedBrushName').textContent = selected.name;
  document.querySelector('#selectedBrushDescription').textContent = selected.description;
  return true;
}

function waitForStudio(attempt = 0) {
  if (initBrushLibrary()) return;
  if (attempt > 240) return;
  requestAnimationFrame(() => waitForStudio(attempt + 1));
}

waitForStudio();