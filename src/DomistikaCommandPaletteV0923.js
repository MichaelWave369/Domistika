const VERSION = '0.9.23';
const SCHEMA = 'domistika.command-palette.v1';
const INSTALL_FLAG = '__domistikaCommandPaletteV0923Installed';
const MAX_RESULTS = 32;

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function searchableText(command) {
  return [
    command.id,
    command.label,
    command.category,
    command.description,
    ...(Array.isArray(command.keywords) ? command.keywords : []),
    command.shortcut || '',
  ].map(normalize).join(' ');
}

function scoreCommand(command, query) {
  const q = normalize(query);
  if (!q) return 1;

  const label = normalize(command.label);
  const id = normalize(command.id);
  const category = normalize(command.category);
  const description = normalize(command.description);
  const keywords = (command.keywords || []).map(normalize);
  const haystack = searchableText(command);

  if (label === q) return 120;
  if (id === q) return 115;
  if (label.startsWith(q)) return 100;
  if (id.startsWith(q)) return 94;
  if (keywords.some((keyword) => keyword === q)) return 90;
  if (keywords.some((keyword) => keyword.startsWith(q))) return 82;
  if (label.includes(q)) return 76;
  if (id.includes(q)) return 70;
  if (category.includes(q)) return 55;
  if (description.includes(q)) return 46;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1 && tokens.every((token) => haystack.includes(token))) {
    return 36 + tokens.length;
  }
  return 0;
}

function filterCommands(commands, query, limit = MAX_RESULTS) {
  return [...commands]
    .map((command, index) => ({ command, index, score: scoreCommand(command, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score
      || String(a.command.category).localeCompare(String(b.command.category))
      || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.command);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function categoryIcon(category) {
  const map = {
    Canvas: '▣',
    Tools: '✎',
    Layers: '▱',
    Rooms: '⌂',
    Motion: '◉',
    Export: '⇩',
    Help: '?',
  };
  return map[category] || '•';
}

function setStatus(message) {
  const node = document.querySelector('#statusMessage');
  if (node) node.textContent = message;
}

function commandCatalog() {
  const api = window.Domistika;
  if (!api?.commands?.catalog) return [];
  try {
    return api.commands.catalog();
  } catch {
    return [];
  }
}

function installStyles() {
  if (document.querySelector('#domistikaCommandPaletteV0923Styles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaCommandPaletteV0923Styles';
  style.textContent = `
    .command-palette-launcher{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
    .command-palette-launcher kbd{min-width:auto;padding:2px 5px;border-bottom-width:1px;font-size:8px;color:var(--muted)}
    .command-palette-dialog{width:min(720px,calc(100vw - 28px));max-height:min(680px,82vh);padding:0;border:1px solid rgba(255,191,105,.35);border-radius:18px;color:var(--ink);background:rgba(20,16,24,.98);box-shadow:0 32px 120px rgba(0,0,0,.72);overflow:hidden}
    .command-palette-dialog::backdrop{background:rgba(5,4,7,.62);backdrop-filter:blur(6px)}
    .command-palette-shell{display:grid;grid-template-rows:auto minmax(0,1fr) auto;max-height:min(680px,82vh)}
    .command-palette-search-wrap{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,rgba(255,191,105,.06),transparent)}
    .command-palette-mark{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;color:#171019;font-weight:900;background:linear-gradient(135deg,var(--warm),#ff9a71)}
    .command-palette-search{width:100%;border:0!important;outline:0!important;padding:8px 0!important;color:var(--ink)!important;background:transparent!important;font-size:18px!important;font-weight:650}
    .command-palette-close{width:31px;height:31px;border:1px solid var(--line);border-radius:9px;color:var(--muted);background:var(--panel2);cursor:pointer}
    .command-palette-list{min-height:120px;overflow:auto;padding:8px}
    .command-palette-empty{padding:38px 18px;text-align:center;color:var(--muted);font-size:12px}
    .command-palette-item{width:100%;display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px;border:1px solid transparent;border-radius:12px;color:var(--ink);background:transparent;text-align:left;cursor:pointer}
    .command-palette-item:hover,.command-palette-item.active{border-color:rgba(255,191,105,.25);background:linear-gradient(90deg,rgba(255,191,105,.11),rgba(141,108,255,.08))}
    .command-palette-icon{display:grid;place-items:center;width:34px;height:34px;border:1px solid var(--line);border-radius:10px;color:var(--warm);background:var(--panel2);font-size:16px}
    .command-palette-copy{min-width:0;display:grid;gap:3px}
    .command-palette-title{display:flex;align-items:center;gap:7px;min-width:0}
    .command-palette-title strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
    .command-palette-category{padding:2px 5px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:7px;text-transform:uppercase;letter-spacing:.07em}
    .command-palette-description{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:10px}
    .command-palette-shortcut{padding:4px 6px;border:1px solid var(--line);border-bottom-width:2px;border-radius:7px;color:var(--muted);background:var(--panel2);font-size:8px;white-space:nowrap}
    .command-palette-footer{display:flex;justify-content:space-between;gap:12px;padding:9px 14px;border-top:1px solid var(--line);color:var(--muted);font-size:9px}
    .command-palette-footer span{display:flex;align-items:center;gap:7px}
    .command-palette-footer kbd{min-width:auto;padding:2px 5px;font-size:8px}
    @media(max-width:680px){
      .command-palette-launcher span{display:none}
      .command-palette-dialog{max-height:88vh}
      .command-palette-description{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
      .command-palette-footer{display:none}
    }
    @media(prefers-reduced-motion:reduce){.command-palette-dialog::backdrop{backdrop-filter:none}}
  `;
  document.head.appendChild(style);
}

function createPalette() {
  if (document.querySelector('#domistikaCommandPalette')) {
    return {
      dialog: document.querySelector('#domistikaCommandPalette'),
      launcher: document.querySelector('#commandPaletteLauncher'),
    };
  }

  installStyles();

  const launcher = document.createElement('button');
  launcher.id = 'commandPaletteLauncher';
  launcher.type = 'button';
  launcher.className = 'soft-button command-palette-launcher';
  launcher.title = 'Command Palette (Ctrl/Cmd+K)';
  launcher.innerHTML = '<span>Commands</span><kbd>⌘K</kbd>';

  const topActions = document.querySelector('.top-actions');
  if (topActions) topActions.insertBefore(launcher, topActions.firstChild);

  const dialog = document.createElement('dialog');
  dialog.id = 'domistikaCommandPalette';
  dialog.className = 'command-palette-dialog';
  dialog.setAttribute('aria-label', 'Domistika command palette');
  dialog.innerHTML = `
    <div class="command-palette-shell">
      <div class="command-palette-search-wrap">
        <div class="command-palette-mark">⌘</div>
        <input id="commandPaletteSearch" class="command-palette-search" type="search" autocomplete="off" spellcheck="false" placeholder="Search tools, rooms, motion, export…" aria-label="Search Domistika commands">
        <button type="button" id="commandPaletteClose" class="command-palette-close" aria-label="Close command palette">×</button>
      </div>
      <div id="commandPaletteList" class="command-palette-list" role="listbox" aria-label="Domistika commands"></div>
      <div class="command-palette-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>Enter</kbd> run</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);

  return { dialog, launcher };
}

function install() {
  const api = window.Domistika;
  const topActions = document.querySelector('.top-actions');
  if (!api?.commands?.catalog || !api?.commands?.execute || !topActions) return false;

  if (window[INSTALL_FLAG]) return true;
  window[INSTALL_FLAG] = true;

  const { dialog, launcher } = createPalette();
  const search = dialog.querySelector('#commandPaletteSearch');
  const list = dialog.querySelector('#commandPaletteList');
  const close = dialog.querySelector('#commandPaletteClose');

  let visibleCommands = [];
  let activeIndex = 0;
  let executing = false;

  const setActive = (index, { scroll = true } = {}) => {
    if (!visibleCommands.length) {
      activeIndex = 0;
      return;
    }
    activeIndex = Math.max(0, Math.min(visibleCommands.length - 1, index));
    list.querySelectorAll('.command-palette-item').forEach((item, itemIndex) => {
      const active = itemIndex === activeIndex;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', String(active));
      if (active && scroll) item.scrollIntoView({ block: 'nearest' });
    });
  };

  const render = () => {
    const commands = commandCatalog();
    visibleCommands = filterCommands(commands, search.value);
    activeIndex = Math.min(activeIndex, Math.max(0, visibleCommands.length - 1));

    if (!visibleCommands.length) {
      list.innerHTML = '<div class="command-palette-empty">No matching command. Domistika has many secret doors, but apparently not that one.</div>';
      return;
    }

    list.innerHTML = visibleCommands.map((command, index) => `
      <button type="button"
        class="command-palette-item${index === activeIndex ? ' active' : ''}"
        role="option"
        aria-selected="${index === activeIndex}"
        data-command-index="${index}">
        <span class="command-palette-icon">${escapeHtml(categoryIcon(command.category))}</span>
        <span class="command-palette-copy">
          <span class="command-palette-title">
            <strong>${escapeHtml(command.label)}</strong>
            <span class="command-palette-category">${escapeHtml(command.category)}</span>
          </span>
          <span class="command-palette-description">${escapeHtml(command.description || command.id)}</span>
        </span>
        ${command.shortcut ? `<span class="command-palette-shortcut">${escapeHtml(command.shortcut)}</span>` : ''}
      </button>
    `).join('');
  };

  const closePalette = () => {
    if (dialog.open) dialog.close();
  };

  const openPalette = (query = '') => {
    if (!dialog.open) dialog.showModal();
    search.value = String(query || '');
    activeIndex = 0;
    render();
    requestAnimationFrame(() => {
      search.focus();
      search.select();
    });
    window.dispatchEvent(new CustomEvent('domistika:command-palette-open', {
      detail: { version: VERSION, schema: SCHEMA },
    }));
  };

  const executeIndex = async (index) => {
    const command = visibleCommands[index];
    if (!command || executing) return;
    executing = true;
    const label = command.label || command.id;
    closePalette();
    setStatus(`Running · ${label}`);
    try {
      await window.Domistika.commands.execute(command.id);
      setStatus(`Command complete · ${label}`);
      window.dispatchEvent(new CustomEvent('domistika:command-palette-executed', {
        detail: { version: VERSION, schema: SCHEMA, command: command.id },
      }));
    } catch (error) {
      console.warn('Domistika command palette command failed', error);
      setStatus(`Command failed · ${label} · ${error?.message || error}`);
    } finally {
      executing = false;
    }
  };

  launcher.addEventListener('click', () => openPalette());
  close.addEventListener('click', closePalette);
  search.addEventListener('input', () => {
    activeIndex = 0;
    render();
  });

  search.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex - 1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      executeIndex(activeIndex);
    }
  });

  list.addEventListener('mousemove', (event) => {
    const item = event.target.closest('[data-command-index]');
    if (!item) return;
    setActive(Number(item.dataset.commandIndex), { scroll: false });
  });

  list.addEventListener('click', (event) => {
    const item = event.target.closest('[data-command-index]');
    if (!item) return;
    executeIndex(Number(item.dataset.commandIndex));
  });

  window.addEventListener('keydown', (event) => {
    const paletteShortcut = (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k';
    if (!paletteShortcut) return;
    event.preventDefault();
    event.stopPropagation();
    if (dialog.open) closePalette();
    else openPalette();
  }, true);

  dialog.addEventListener('close', () => {
    search.value = '';
    activeIndex = 0;
    render();
    window.dispatchEvent(new CustomEvent('domistika:command-palette-close', {
      detail: { version: VERSION, schema: SCHEMA },
    }));
  });

  render();

  window.domistikaCommandPaletteV0923 = Object.freeze({
    version: VERSION,
    schema: SCHEMA,
    open: openPalette,
    close: closePalette,
    search(query = '') {
      return Object.freeze(filterCommands(commandCatalog(), query));
    },
  });

  window.dispatchEvent(new CustomEvent('domistika:command-palette-ready', {
    detail: {
      version: VERSION,
      schema: SCHEMA,
      commandCount: commandCatalog().length,
    },
  }));

  return true;
}

function wait(attempt = 0) {
  if (typeof window === 'undefined') return;
  if (install()) return;
  if (attempt < 1200) requestAnimationFrame(() => wait(attempt + 1));
}

if (typeof window !== 'undefined') wait();

export {
  VERSION,
  SCHEMA,
  MAX_RESULTS,
  normalize,
  searchableText,
  scoreCommand,
  filterCommands,
};
