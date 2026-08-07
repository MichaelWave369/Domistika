const INSTALL_FLAG = '__domistikaCharacterLibraryV0911Installed';
const VERSION = '0.9.11';
const STORAGE_KEY = 'domistika-species-library-v0911';
const MAX_LIBRARY_ENTRIES = 24;

const runtime = {
  version: VERSION,
  engine: null,
  capture: null,
  library: loadLibrary(),
};

function status(message) {
  const fn = window.__domistikaStatus;
  if (typeof fn === 'function') fn(message);
  else {
    const node = document.querySelector('#statusMessage');
    if (node) node.textContent = message;
  }
}

function loadLibrary() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveLibrary() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runtime.library.slice(0, MAX_LIBRARY_ENTRIES)));
    return true;
  } catch (error) {
    console.warn('Species Library storage failed', error);
    status('Species Library is full in this browser — delete an older creature first');
    return false;
  }
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

function visibleBounds(canvas, padding = 24) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (data[(y * canvas.width + x) * 4 + 3] <= 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) return null;
  const x = Math.max(0, minX - padding);
  const y = Math.max(0, minY - padding);
  const right = Math.min(canvas.width, maxX + padding + 1);
  const bottom = Math.min(canvas.height, maxY + padding + 1);
  return { x, y, width: right - x, height: bottom - y };
}

function cropCanvas(source, rect) {
  const output = createCanvas(rect.width, rect.height);
  output.getContext('2d').drawImage(
    source,
    rect.x, rect.y, rect.width, rect.height,
    0, 0, rect.width, rect.height,
  );
  return output;
}

function compactDataUrl(source, maxSide = 640) {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const output = createCanvas(source.width * scale, source.height * scale);
  output.getContext('2d').drawImage(source, 0, 0, output.width, output.height);
  try {
    return output.toDataURL('image/webp', 0.9);
  } catch {
    return output.toDataURL('image/png');
  }
}

function captureActiveLayer() {
  const engine = runtime.engine || window.__domistikaEngine;
  const layer = engine?.activeLayer;
  if (!engine || !layer?.canvas) {
    status('Characters needs an active Domistika layer');
    return null;
  }

  const rect = visibleBounds(layer.canvas);
  if (!rect) {
    status('No visible creature found on the active layer');
    return null;
  }

  const canvas = cropCanvas(layer.canvas, rect);
  runtime.capture = {
    canvas,
    rect,
    dataUrl: compactDataUrl(canvas),
    capturedAt: new Date().toISOString(),
  };
  renderCapturePreview();
  status(`Character captured from ${layer.name}`);
  return runtime.capture;
}

function currentMetadata() {
  return {
    name: document.querySelector('#characterName')?.value.trim() || `Creature ${runtime.library.length + 1}`,
    species: document.querySelector('#characterSpecies')?.value.trim() || '',
    mood: document.querySelector('#characterMood')?.value.trim() || '',
    notes: document.querySelector('#characterNotes')?.value.trim() || '',
  };
}

function saveCurrentCreature() {
  const capture = runtime.capture || captureActiveLayer();
  if (!capture) return;

  const entry = {
    id: crypto.randomUUID?.() || `creature-${Date.now()}`,
    ...currentMetadata(),
    dataUrl: capture.dataUrl,
    createdAt: new Date().toISOString(),
  };

  runtime.library.unshift(entry);
  runtime.library = runtime.library.slice(0, MAX_LIBRARY_ENTRIES);
  if (!saveLibrary()) {
    runtime.library = runtime.library.filter((item) => item.id !== entry.id);
    return;
  }

  renderLibrary();
  window.dispatchEvent(new CustomEvent('specieslibrary:entry-added', { detail: entry }));
  status(`${entry.name} saved to Species Library`);
}

function deleteEntry(id) {
  runtime.library = runtime.library.filter((entry) => entry.id !== id);
  saveLibrary();
  renderLibrary();
  status('Creature removed from Species Library');
}

function loadEntry(id) {
  const entry = runtime.library.find((candidate) => candidate.id === id);
  const engine = runtime.engine || window.__domistikaEngine;
  if (!entry || !engine?.activeLayer) return;

  const image = new Image();
  image.onload = () => {
    engine.captureHistory?.();
    const layer = engine.activeLayer;
    layer.ctx.clearRect(0, 0, engine.width, engine.height);
    const scale = Math.min(engine.width / image.width, engine.height / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    layer.ctx.drawImage(image, (engine.width - width) / 2, (engine.height - height) / 2, width, height);
    engine.markChanged?.(`Loaded ${entry.name}`);
    setField('#characterName', entry.name);
    setField('#characterSpecies', entry.species);
    setField('#characterMood', entry.mood);
    setField('#characterNotes', entry.notes);
    runtime.capture = {
      canvas: imageToCanvas(image),
      rect: { x: 0, y: 0, width: image.width, height: image.height },
      dataUrl: entry.dataUrl,
      capturedAt: entry.createdAt,
    };
    renderCapturePreview();
    status(`${entry.name} loaded from Species Library`);
  };
  image.src = entry.dataUrl;
}

function imageToCanvas(image) {
  const canvas = createCanvas(image.width, image.height);
  canvas.getContext('2d').drawImage(image, 0, 0);
  return canvas;
}

function setField(selector, value = '') {
  const field = document.querySelector(selector);
  if (field) field.value = value || '';
}

function drawFit(ctx, source, x, y, width, height, options = {}) {
  const scale = Math.min(width / source.width, height / source.height);
  const dw = source.width * scale;
  const dh = source.height * scale;
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  if (options.flip) ctx.scale(-1, 1);
  if (options.rotate) ctx.rotate(options.rotate);
  ctx.drawImage(source, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function wrapText(ctx, text, x, y, width, lineHeight) {
  if (!text) return;
  const words = text.split(/\s+/);
  let line = '';
  let dy = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > width && line) {
      ctx.fillText(line, x, y + dy);
      line = word;
      dy += lineHeight;
    } else line = next;
  }
  if (line) ctx.fillText(line, x, y + dy);
}

async function dataUrlToCanvas(dataUrl) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  return imageToCanvas(image);
}

async function buildCharacterSheet(entry, layoutName = '4-up') {
  const layouts = {
    '1-up': { cols: 1, rows: 1, width: 1200, height: 1400 },
    '4-up': { cols: 2, rows: 2, width: 1400, height: 1400 },
    '9-up': { cols: 3, rows: 3, width: 1600, height: 1600 },
  };
  const layout = layouts[layoutName] || layouts['4-up'];
  const source = await dataUrlToCanvas(entry.dataUrl);
  const canvas = createCanvas(layout.width, layout.height);
  const ctx = canvas.getContext('2d');
  const title = document.querySelector('#sheetTitle')?.value.trim() || 'Creature Sheet';

  ctx.fillStyle = '#f4f1ea';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#211d26';
  ctx.font = '800 48px system-ui, sans-serif';
  ctx.fillText(title, 52, 72);
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillText(entry.name || 'Untitled Creature', 52, 112);
  ctx.font = '500 20px system-ui, sans-serif';
  if (entry.species) ctx.fillText(`Species: ${entry.species}`, 52, 145);
  if (entry.mood) ctx.fillText(`Mood / role: ${entry.mood}`, 52, 174);

  const margin = 48;
  const top = 220;
  const gap = 26;
  const cellWidth = (canvas.width - margin * 2 - gap * (layout.cols - 1)) / layout.cols;
  const cellHeight = (canvas.height - top - 170 - gap * (layout.rows - 1)) / layout.rows;

  let index = 0;
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      const x = margin + col * (cellWidth + gap);
      const y = top + row * (cellHeight + gap);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#2b2530';
      ctx.lineWidth = 3;
      ctx.fillRect(x, y, cellWidth, cellHeight);
      ctx.strokeRect(x, y, cellWidth, cellHeight);
      const rotate = layoutName === '1-up' ? 0 : ((index % 3) - 1) * 0.045;
      drawFit(ctx, source, x + 16, y + 16, cellWidth - 32, cellHeight - 32, {
        flip: index % 2 === 1,
        rotate,
      });
      index += 1;
    }
  }

  ctx.fillStyle = '#ffb24d';
  ctx.fillRect(canvas.width - 350, 48, 290, 10);
  ctx.fillStyle = '#3b3440';
  ctx.font = '500 18px system-ui, sans-serif';
  wrapText(ctx, entry.notes || '', 52, canvas.height - 115, canvas.width - 104, 25);
  return canvas;
}

function exportCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
  }, 'image/png');
}

async function exportCurrentSheet() {
  const capture = runtime.capture || captureActiveLayer();
  if (!capture) return;
  const entry = { ...currentMetadata(), dataUrl: capture.dataUrl };
  const layout = document.querySelector('#sheetLayout')?.value || '4-up';
  const sheet = await buildCharacterSheet(entry, layout);
  exportCanvas(sheet, `domistika-character-sheet-${Date.now()}.png`);
  window.dispatchEvent(new CustomEvent('charactersheet:exported', { detail: { entry, layout } }));
  status('Character Sheet exported');
}

async function exportLibrarySheet(id) {
  const entry = runtime.library.find((candidate) => candidate.id === id);
  if (!entry) return;
  const layout = document.querySelector('#sheetLayout')?.value || '4-up';
  const sheet = await buildCharacterSheet(entry, layout);
  const safeName = (entry.name || 'creature').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  exportCanvas(sheet, `domistika-${safeName || 'creature'}-sheet.png`);
  status(`${entry.name} sheet exported`);
}

function renderCapturePreview() {
  const host = document.querySelector('#characterCapturePreview');
  if (!host) return;
  host.innerHTML = '';
  if (!runtime.capture?.dataUrl) {
    host.innerHTML = '<span>No creature captured yet</span>';
    return;
  }
  const image = document.createElement('img');
  image.src = runtime.capture.dataUrl;
  image.alt = 'Captured creature';
  host.appendChild(image);
}

function renderLibrary() {
  const host = document.querySelector('#speciesLibraryList');
  const count = document.querySelector('#speciesLibraryCount');
  if (!host) return;
  if (count) count.textContent = String(runtime.library.length);

  const query = document.querySelector('#speciesSearch')?.value.trim().toLowerCase() || '';
  const entries = runtime.library.filter((entry) =>
    !query || `${entry.name} ${entry.species} ${entry.mood} ${entry.notes}`.toLowerCase().includes(query)
  );

  host.innerHTML = '';
  if (!entries.length) {
    host.innerHTML = `<div class="species-empty">${runtime.library.length ? 'No creatures match that search.' : 'Your weird little people will live here.'}</div>`;
    return;
  }

  for (const entry of entries) {
    const card = document.createElement('article');
    card.className = 'species-card';
    card.innerHTML = `
      <img src="${entry.dataUrl}" alt="">
      <div class="species-card-meta">
        <strong></strong>
        <span></span>
      </div>
      <div class="species-card-actions">
        <button type="button" data-load="${entry.id}">Load</button>
        <button type="button" data-sheet="${entry.id}">Sheet</button>
        <button type="button" data-delete="${entry.id}">Delete</button>
      </div>
    `;
    card.querySelector('strong').textContent = entry.name;
    card.querySelector('span').textContent = entry.species || 'Unknown species';
    host.appendChild(card);
  }

  host.querySelectorAll('[data-load]').forEach((button) =>
    button.addEventListener('click', () => loadEntry(button.dataset.load))
  );
  host.querySelectorAll('[data-sheet]').forEach((button) =>
    button.addEventListener('click', () => exportLibrarySheet(button.dataset.sheet))
  );
  host.querySelectorAll('[data-delete]').forEach((button) =>
    button.addEventListener('click', () => deleteEntry(button.dataset.delete))
  );
}

function injectStyles() {
  if (document.querySelector('#characterLibraryV0911Styles')) return;
  const style = document.createElement('style');
  style.id = 'characterLibraryV0911Styles';
  style.textContent = `
    #characterLibraryToggle.character-pill{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
    #characterLibraryToggle .character-dot{width:7px;height:7px;border-radius:50%;background:#7be07b;box-shadow:0 0 0 2px rgba(123,224,123,.16)}
    #characterLibraryPanel{position:fixed;right:18px;bottom:76px;z-index:2147482700;width:min(460px,calc(100vw - 24px));max-height:min(760px,calc(100vh - 100px));overflow:auto;padding:12px;border:1px solid rgba(123,224,123,.2);border-radius:16px;background:rgba(14,11,20,.975);box-shadow:0 22px 60px rgba(0,0,0,.5);color:#f5efff;font:12px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;backdrop-filter:blur(18px)}
    #characterLibraryPanel[hidden]{display:none}
    #characterLibraryPanel .character-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px}
    #characterLibraryPanel .character-kicker{font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#8eea8e;font-weight:850}
    #characterLibraryPanel .character-title{font-size:16px;font-weight:850}
    #characterLibraryPanel .character-close{border:0;background:#1d1726;color:#ccb7d6;border-radius:8px;width:30px;height:30px;cursor:pointer}
    #characterLibraryPanel .character-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    #characterLibraryPanel label{display:grid;gap:4px;color:#b8aec5;font-size:10px;font-weight:700}
    #characterLibraryPanel input,#characterLibraryPanel textarea,#characterLibraryPanel select{box-sizing:border-box;width:100%;border:1px solid #382f45;background:#191421;color:#f5efff;border-radius:9px;padding:7px 8px}
    #characterLibraryPanel textarea{min-height:62px;resize:vertical}
    #characterLibraryPanel button{border:1px solid #382f45;background:#191521;color:#efe8f8;border-radius:9px;padding:8px 7px;cursor:pointer;font:inherit}
    #characterLibraryPanel button:hover{border-color:#8de48d;color:#d9ffd9}
    #characterLibraryPanel .character-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0}
    #characterCapturePreview{height:170px;border:1px solid #30293a;border-radius:12px;background:#f1eef3;display:flex;align-items:center;justify-content:center;overflow:hidden;color:#706878}
    #characterCapturePreview img{display:block;max-width:100%;max-height:100%}
    #speciesLibraryHead{display:flex;align-items:center;justify-content:space-between;margin:12px 0 7px}
    #speciesLibraryList{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .species-card{display:grid;gap:6px;padding:8px;border:1px solid #30293a;border-radius:12px;background:#15111c}
    .species-card img{width:100%;height:116px;object-fit:contain;border-radius:8px;background:#f1eef3}
    .species-card-meta{display:grid;gap:2px;min-width:0}.species-card-meta strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.species-card-meta span{color:#9d93aa;font-size:10px}
    .species-card-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
    .species-empty{grid-column:1/-1;padding:16px;border:1px dashed #3b3247;border-radius:10px;color:#8c8298;text-align:center}
    #speciesSearch{margin-bottom:8px}
    @media(max-width:720px){#characterLibraryPanel{right:12px;bottom:64px;width:calc(100vw - 24px)}#speciesLibraryList{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function attachPenDeckAction() {
  const add = () => {
    const actions = document.querySelector('#pendeckPanel .pd-actions');
    if (!actions || document.querySelector('#pendeckCharacters')) return false;
    const button = document.createElement('button');
    button.id = 'pendeckCharacters';
    button.type = 'button';
    button.textContent = 'Characters';
    button.addEventListener('click', () => openPanel());
    actions.appendChild(button);
    return true;
  };

  if (add()) return;
  const observer = new MutationObserver(() => {
    if (add()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function openPanel() {
  const panel = document.querySelector('#characterLibraryPanel');
  if (!panel) return;
  panel.hidden = false;
  renderCapturePreview();
  renderLibrary();
}

function createUI() {
  if (document.querySelector('#characterLibraryPanel')) return;
  injectStyles();

  const deck = document.querySelector('.control-deck');
  if (!deck) return;

  const toggle = document.createElement('button');
  toggle.id = 'characterLibraryToggle';
  toggle.className = 'toggle-button character-pill';
  toggle.type = 'button';
  toggle.title = 'Character Sheet Mode + Species Library';
  toggle.innerHTML = '<span class="character-dot"></span><span>Characters</span>';
  deck.appendChild(toggle);

  const panel = document.createElement('section');
  panel.id = 'characterLibraryPanel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="character-head">
      <div><div class="character-kicker">Creature Keeping</div><div class="character-title">Characters v0.9.11</div></div>
      <button type="button" class="character-close" aria-label="Close">×</button>
    </div>
    <div class="character-grid">
      <label>Name<input id="characterName" placeholder="Creature name"></label>
      <label>Species<input id="characterSpecies" placeholder="Species / type"></label>
      <label>Mood / role<input id="characterMood" placeholder="Mood / role"></label>
      <label>Sheet layout<select id="sheetLayout"><option value="1-up">1-up</option><option value="4-up" selected>4-up</option><option value="9-up">9-up</option></select></label>
    </div>
    <label>Sheet title<input id="sheetTitle" value="Creature Sheet"></label>
    <label>Notes<textarea id="characterNotes" placeholder="Lore, personality, powers, weird habits..."></textarea></label>
    <div class="character-actions">
      <button id="characterCapture" type="button">Capture</button>
      <button id="characterSave" type="button">Save to Library</button>
      <button id="characterExportSheet" type="button">Export Sheet</button>
    </div>
    <div id="characterCapturePreview"><span>No creature captured yet</span></div>
    <div id="speciesLibraryHead"><strong>Species Library (<span id="speciesLibraryCount">0</span>)</strong><small>local-first</small></div>
    <input id="speciesSearch" type="search" placeholder="Search name, species, mood...">
    <div id="speciesLibraryList"></div>
  `;
  document.body.appendChild(panel);

  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      renderCapturePreview();
      renderLibrary();
    }
  });
  panel.querySelector('.character-close').addEventListener('click', () => { panel.hidden = true; });
  panel.querySelector('#characterCapture').addEventListener('click', captureActiveLayer);
  panel.querySelector('#characterSave').addEventListener('click', saveCurrentCreature);
  panel.querySelector('#characterExportSheet').addEventListener('click', exportCurrentSheet);
  panel.querySelector('#speciesSearch').addEventListener('input', renderLibrary);

  attachPenDeckAction();
  renderLibrary();
}

function boot(engine = window.__domistikaEngine) {
  if (!engine) return false;
  runtime.engine = engine;
  createUI();
  return true;
}

window.addEventListener('domistika:ready', (event) => boot(event.detail?.engine));

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;
  if (!boot()) {
    const observer = new MutationObserver(() => {
      if (boot()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}

export { runtime, captureActiveLayer, buildCharacterSheet };
