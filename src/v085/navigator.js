function addStyles() {
  if (document.querySelector('#domistikaV085NavigatorStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV085NavigatorStyles';
  style.textContent = `
    .canvas-navigator{position:absolute;right:14px;bottom:14px;z-index:18;display:grid;grid-template-columns:repeat(3,30px);grid-template-rows:repeat(3,30px);gap:3px;padding:6px;border:1px solid rgba(255,255,255,.1);border-radius:15px;background:rgba(19,16,23,.84);backdrop-filter:blur(12px);box-shadow:0 12px 30px rgba(0,0,0,.3);opacity:.48;transition:opacity .18s ease}.canvas-navigator:hover,.canvas-navigator:focus-within{opacity:1}.canvas-nav-button{width:30px;height:30px;display:grid;place-items:center;padding:0;border:1px solid rgba(255,255,255,.09);border-radius:9px;color:#ddd3e2;background:#29222f;cursor:pointer;font-size:12px}.canvas-nav-button:hover{border-color:rgba(102,216,255,.45);background:#352b3e}.canvas-nav-center{color:#ffc56e}.canvas-nav-zoom{font-weight:800;font-size:16px}.canvas-nav-hint{position:absolute;right:0;bottom:104px;width:max-content;padding:4px 7px;border-radius:7px;color:var(--muted);background:rgba(15,12,18,.88);font-size:7px;opacity:0;pointer-events:none}.canvas-navigator:hover .canvas-nav-hint{opacity:1}
    @media(max-width:680px){.canvas-navigator{right:8px;bottom:9px;grid-template-columns:repeat(3,28px);grid-template-rows:repeat(3,28px);opacity:.68}.canvas-nav-button{width:28px;height:28px}}
  `;
  document.head.appendChild(style);
}

function addShortcutRows() {
  const grid = document.querySelector('#shortcutsDialog .shortcut-grid');
  if (!grid || grid.querySelector('[data-v085-shortcut]')) return;
  const rows = [
    ['Q', 'Workspace wheel'], ['Arrows', 'Move canvas'], ['Numpad', 'Move diagonally'], ['+ / −', 'Zoom canvas'], ['Shift', 'Larger move step'],
  ];
  for (const [key, label] of rows) {
    const row = document.createElement('span'); row.dataset.v085Shortcut = 'true'; row.innerHTML = `<kbd>${key}</kbd> ${label}`; grid.appendChild(row);
  }
}

function init() {
  const viewport = document.querySelector('#viewport');
  const nav = window.domistikaNavigation;
  if (!viewport || !nav) return false;
  if (viewport.querySelector('.canvas-navigator')) return true;
  addStyles(); addShortcutRows();
  const dock = document.createElement('div');
  dock.className = 'canvas-navigator';
  dock.setAttribute('aria-label', 'Canvas navigator');
  dock.innerHTML = `
    <button class="canvas-nav-button canvas-nav-zoom" data-action="out" title="Zoom out">−</button>
    <button class="canvas-nav-button" data-dx="0" data-dy="-42" title="Move canvas up">▲</button>
    <button class="canvas-nav-button canvas-nav-zoom" data-action="in" title="Zoom in">＋</button>
    <button class="canvas-nav-button" data-dx="-42" data-dy="0" title="Move canvas left">◀</button>
    <button class="canvas-nav-button canvas-nav-center" data-action="fit" title="Fit canvas">◇</button>
    <button class="canvas-nav-button" data-dx="42" data-dy="0" title="Move canvas right">▶</button>
    <button class="canvas-nav-button" data-dx="-34" data-dy="34" title="Move down-left">↙</button>
    <button class="canvas-nav-button" data-dx="0" data-dy="42" title="Move canvas down">▼</button>
    <button class="canvas-nav-button" data-dx="34" data-dy="34" title="Move down-right">↘</button>
    <span class="canvas-nav-hint">Arrows / numpad move · + − zoom</span>`;
  viewport.appendChild(dock);
  dock.addEventListener('click', (event) => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.action === 'in') nav.zoomBy(1.18);
    else if (button.dataset.action === 'out') nav.zoomBy(1 / 1.18);
    else if (button.dataset.action === 'fit') nav.fit();
    else nav.panBy(Number(button.dataset.dx), Number(button.dataset.dy));
  });
  return true;
}
function wait(attempt = 0) { if (init() || attempt > 480) return; requestAnimationFrame(() => wait(attempt + 1)); }
wait();
