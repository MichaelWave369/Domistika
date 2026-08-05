const STORAGE_KEY = 'domistika-v091-favorite-colors';
const MAX_COLORS = 24;
const STARTER_COLORS = [
  '#ef2b1f', '#ff3f9d', '#7a29e8', '#1748e8', '#12d4d0',
  '#20d451', '#cce900', '#f0a20d', '#1b1820', '#ffffff',
];

let colors = [];
let panel = null;
let compact = null;

function normalizeColor(value) {
  const color = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : null;
}

function loadColors() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const valid = Array.isArray(parsed) ? parsed.map(normalizeColor).filter(Boolean) : [];
    return valid.length ? [...new Set(valid)].slice(0, MAX_COLORS) : [...STARTER_COLORS];
  } catch {
    return [...STARTER_COLORS];
  }
}

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(colors)); } catch {}
  document.dispatchEvent(new CustomEvent('domistika:v091-color-bank', { detail: { colors: [...colors] } }));
}

function colorInput() { return document.querySelector('#colorInput'); }

function currentColor() {
  return normalizeColor(colorInput()?.value) || '#1b1820';
}

function chooseColor(color) {
  const input = colorInput();
  if (!input) return;
  input.value = color;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  const status = document.querySelector('#statusMessage');
  if (status) status.textContent = `Favorite color selected: ${color}`;
  render();
}

function addCurrent() {
  const color = currentColor();
  colors = [color, ...colors.filter((candidate) => candidate !== color)].slice(0, MAX_COLORS);
  persist();
  render();
  const status = document.querySelector('#statusMessage');
  if (status) status.textContent = `${color} saved to Favorite Colors`;
}

function removeColor(color) {
  colors = colors.filter((candidate) => candidate !== color);
  persist();
  render();
}

function addStyles() {
  if (document.querySelector('#domistikaV091ColorBankStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV091ColorBankStyles';
  style.textContent = `
    .color-bank-compact{display:flex;align-items:center;gap:4px;padding:4px 5px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}
    .color-bank-open,.color-bank-save{width:27px;height:27px;display:grid;place-items:center;padding:0!important;border-radius:8px!important;font-size:11px!important}
    .color-bank-mini{width:20px;height:20px;padding:0!important;border:2px solid rgba(255,255,255,.36)!important;border-radius:50%!important;background:var(--swatch)!important;box-shadow:0 1px 0 rgba(0,0,0,.35),inset 0 0 0 1px rgba(0,0,0,.18)!important}
    .color-bank-mini:hover{transform:scale(1.12)!important;filter:none!important}
    .favorite-colors-panel{padding:13px!important}.color-bank-current{display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:9px;padding:9px;border:1px solid var(--line);border-radius:12px;background:rgba(255,255,255,.035)}
    .color-bank-current-swatch{width:48px;height:48px;border:3px solid rgba(255,255,255,.42);border-radius:12px;background:var(--current);box-shadow:inset 0 0 0 1px rgba(0,0,0,.25),0 4px 10px rgba(0,0,0,.18)}
    .color-bank-current strong{display:block;font-size:11px}.color-bank-current small{display:block;margin-top:3px;color:var(--muted);font:9px ui-monospace,SFMono-Regular,Menlo,monospace}.color-bank-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}
    .color-bank-card{position:relative;display:grid;gap:4px;padding:5px;border:1px solid var(--line);border-radius:11px;background:rgba(255,255,255,.025)}
    .color-bank-card-swatch{width:100%;aspect-ratio:1/1;border:2px solid rgba(255,255,255,.38)!important;border-radius:8px!important;background:var(--swatch)!important;box-shadow:inset 0 0 0 1px rgba(0,0,0,.2)!important}
    .color-bank-card code{overflow:hidden;text-overflow:ellipsis;color:var(--muted);font-size:7px;text-align:center}.color-bank-remove{position:absolute;right:1px;top:1px;width:18px;height:18px;padding:0!important;border-radius:50%!important;font-size:9px!important;opacity:0}.color-bank-card:hover .color-bank-remove,.color-bank-remove:focus{opacity:1}.color-bank-empty{padding:18px;border:1px dashed var(--line);border-radius:12px;color:var(--muted);font-size:10px;text-align:center}
    html.domistika-retro-basement .color-bank-compact{border-color:#71543a;background:#dfd0a7;box-shadow:inset 0 2px 3px rgba(72,45,22,.18)}
    html.domistika-retro-basement .color-bank-mini{border-color:#6b4b2e!important}
    html.domistika-retro-basement .favorite-colors-panel{background:linear-gradient(180deg,#d6c59b,#bca77b)!important}
    html.domistika-retro-basement .color-bank-current,html.domistika-retro-basement .color-bank-card{border-color:rgba(71,45,24,.25);background:rgba(255,248,220,.28)}
    @media(max-width:1120px){.color-bank-mini:nth-of-type(n+6){display:none}}
    @media(max-width:680px){.color-bank-compact{display:none}.color-bank-grid{grid-template-columns:repeat(5,minmax(0,1fr))}}
  `;
  document.head.appendChild(style);
}

function activatePanel(tab) {
  document.querySelectorAll('.inspector-tabs button[data-panel]').forEach((button) => button.classList.toggle('active', button === tab));
  document.querySelectorAll('.inspector-panel').forEach((candidate) => candidate.classList.toggle('active', candidate === panel));
  render();
  const studio = document.querySelector('#studio');
  if (window.matchMedia('(max-width:1000px)').matches) studio?.classList.add('brush-drawer-open');
}

function renderCompact() {
  if (!compact) return;
  compact.querySelectorAll('.color-bank-mini').forEach((node) => node.remove());
  const save = compact.querySelector('.color-bank-save');
  colors.slice(0, 7).forEach((color) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'color-bank-mini';
    button.style.setProperty('--swatch', color);
    button.title = `${color} · click to use · right-click to remove`;
    button.setAttribute('aria-label', `Use favorite color ${color}`);
    button.addEventListener('click', () => chooseColor(color));
    button.addEventListener('contextmenu', (event) => { event.preventDefault(); removeColor(color); });
    compact.insertBefore(button, save);
  });
  compact.querySelector('.color-bank-open').title = `Favorite Colors · ${colors.length} saved`;
}

function renderPanel() {
  if (!panel) return;
  const color = currentColor();
  panel.querySelector('.color-bank-current-swatch').style.setProperty('--current', color);
  panel.querySelector('#colorBankCurrentCode').textContent = color;
  const grid = panel.querySelector('#colorBankGrid');
  if (!colors.length) {
    grid.innerHTML = '<div class="color-bank-empty">No favorites yet. Pick a color, then press “Save current.”</div>';
    return;
  }
  grid.innerHTML = colors.map((favorite) => `<div class="color-bank-card"><button type="button" class="color-bank-card-swatch" data-color="${favorite}" style="--swatch:${favorite}" aria-label="Use favorite color ${favorite}"></button><code>${favorite}</code><button type="button" class="color-bank-remove" data-remove="${favorite}" aria-label="Remove ${favorite}">×</button></div>`).join('');
  grid.querySelectorAll('[data-color]').forEach((button) => button.addEventListener('click', () => chooseColor(button.dataset.color)));
  grid.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => removeColor(button.dataset.remove)));
}

function render() {
  renderCompact();
  renderPanel();
}

function init() {
  const deck = document.querySelector('.control-deck');
  const inspector = document.querySelector('.inspector');
  const tabs = inspector?.querySelector('.inspector-tabs');
  const colorControl = deck?.querySelector('.color-control');
  if (!deck || !inspector || !tabs || !colorControl || !colorInput()) return false;
  if (document.querySelector('#favoriteColorsPanel')) return true;
  addStyles();
  colors = loadColors();

  compact = document.createElement('div');
  compact.className = 'color-bank-compact';
  compact.setAttribute('aria-label', 'Favorite Colors bank');
  compact.innerHTML = '<button type="button" class="color-bank-open" aria-label="Open Favorite Colors">★</button><button type="button" class="color-bank-save" title="Save current color" aria-label="Save current color">＋</button>';
  colorControl.insertAdjacentElement('afterend', compact);

  const tab = document.createElement('button');
  tab.dataset.panel = 'favoriteColorsPanel';
  tab.textContent = 'Colors';
  tabs.appendChild(tab);

  panel = document.createElement('section');
  panel.id = 'favoriteColorsPanel';
  panel.className = 'inspector-panel favorite-colors-panel';
  panel.innerHTML = `<div class="panel-heading"><div><h2>Favorite Colors</h2><p>Your reusable personal color bank</p></div><span class="gpu-badge">Local</span></div><div class="color-bank-current"><span class="color-bank-current-swatch"></span><span><strong>Current drawing color</strong><small id="colorBankCurrentCode"></small></span><button type="button" class="primary-button" id="colorBankSaveCurrent">Save current</button></div><div class="color-bank-grid" id="colorBankGrid"></div><p class="reference-tip">Click a color to use it. Remove colors with ×, or right-click a compact swatch. Up to ${MAX_COLORS} favorites are stored locally.</p>`;
  inspector.appendChild(panel);

  const open = () => activatePanel(tab);
  compact.querySelector('.color-bank-open').addEventListener('click', open);
  compact.querySelector('.color-bank-save').addEventListener('click', addCurrent);
  panel.querySelector('#colorBankSaveCurrent').addEventListener('click', addCurrent);
  tab.addEventListener('click', open);
  colorInput().addEventListener('input', renderPanel);
  colorInput().addEventListener('change', renderPanel);
  document.addEventListener('domistika:v090-engine', render);
  render();

  window.domistikaColorBankV091 = {
    colors: () => [...colors],
    addCurrent,
    add: (color) => { const valid = normalizeColor(color); if (!valid) return false; colors = [valid, ...colors.filter((candidate) => candidate !== valid)].slice(0, MAX_COLORS); persist(); render(); return true; },
    remove: removeColor,
    choose: chooseColor,
    open,
  };
  document.documentElement.dataset.colorBank = 'v0.9.1';
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 540) return;
  requestAnimationFrame(() => wait(attempt + 1));
}

wait();
