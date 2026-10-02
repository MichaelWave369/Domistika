export const VERSION = '0.9.39';
export const RECENT_BRUSH_KEY = 'domistika-recent-brushes-v1';
export const RECENT_BRUSH_LIMIT = 5;

export function rememberRecentBrush(ids, id, limit = RECENT_BRUSH_LIMIT) {
  const next = [String(id || '').trim(), ...(Array.isArray(ids) ? ids : [])]
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, Math.max(1, Number(limit) || RECENT_BRUSH_LIMIT));
  return Object.freeze(next);
}

function readRecent() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_BRUSH_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeRecent(ids) {
  try { localStorage.setItem(RECENT_BRUSH_KEY, JSON.stringify(ids)); } catch {}
}

function library() {
  return window.domistikaBrushLibraryV0939 || null;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;',
  })[character]);
}

function addStyles() {
  if (document.querySelector('#domistikaV0939RecentBrushStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV0939RecentBrushStyles';
  style.textContent = [
    '.v0939-recent-brush-strip{display:flex;gap:5px;overflow-x:auto;min-height:31px;padding:2px 0}',
    '.v0939-recent-brush{flex:0 0 auto;max-width:110px;padding:6px 8px;border:1px solid var(--line);border-radius:999px;background:var(--panel2);color:var(--ink);font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}',
    '.v0939-recent-brush:hover{border-color:rgba(255,191,105,.5);background:rgba(255,191,105,.08)}',
    '.v0939-recent-empty{color:var(--muted);font-size:8px;padding:6px 0}',
  ].join('');
  document.head.appendChild(style);
}

function render() {
  const host = document.querySelector('#v0939RecentBrushStrip');
  const api = library();
  if (!host || !api?.list) return false;

  let recent = readRecent();
  if (!recent.length) {
    const active = api.active?.();
    if (active?.id) {
      recent = rememberRecentBrush([], active.id);
      writeRecent(recent);
    }
  }

  const brushes = api.list();
  const byId = new Map(brushes.map((brush) => [brush.id, brush]));
  recent = recent.filter((id) => byId.has(id));
  writeRecent(recent);

  host.innerHTML = '';
  if (!recent.length) {
    host.innerHTML = '<span class="v0939-recent-empty">Recent brushes appear here.</span>';
    return true;
  }

  for (const id of recent) {
    const brush = byId.get(id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'v0939-recent-brush';
    button.title = `${brush.name} · ${brush.tool} · ${brush.size}px · ${brush.opacity}%`;
    button.textContent = brush.name;
    button.addEventListener('click', () => api.apply?.(id));
    host.appendChild(button);
  }
  return true;
}

function remember(detail) {
  const id = detail?.id;
  if (!id) return;
  const next = rememberRecentBrush(readRecent(), id);
  writeRecent(next);
  render();
}

function init(attempt = 0) {
  if (typeof document === 'undefined') return;
  addStyles();
  if (render()) return;
  if (attempt < 720) requestAnimationFrame(() => init(attempt + 1));
}

if (typeof window !== 'undefined') {
  window.addEventListener('domistika:brush-selected', (event) => remember(event.detail));
  window.domistikaRecentBrushesV0939 = Object.freeze({
    version: VERSION,
    list: () => Object.freeze([...readRecent()]),
    remember: (id) => {
      const next = rememberRecentBrush(readRecent(), id);
      writeRecent(next);
      render();
      return next;
    },
    render,
  });
}

init();
