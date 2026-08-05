function addStyles() {
  if (document.querySelector('#domistikaV093ToolLayoutStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV093ToolLayoutStyles';
  style.textContent = `
    .tool-button.color-workflow-tool{position:relative}
    .tool-button.color-workflow-start{margin-top:7px}
    .tool-button.color-workflow-start::before{content:"COLOR";position:absolute;top:-8px;left:50%;transform:translateX(-50%);font:700 6px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;color:var(--muted);opacity:.8;pointer-events:none}
    .tool-button.color-workflow-tool + .tool-button.color-workflow-tool{margin-top:1px}
    html.domistika-retro-basement .tool-button.color-workflow-start::before{color:#e7c671}
    html.domistika-16bit-console .tool-button.color-workflow-start::before{color:#7dd3fc;text-shadow:0 0 5px rgba(125,211,252,.55)}
  `;
  document.head.appendChild(style);
}

function arrange() {
  const list = document.querySelector('.tool-list');
  const eyedropper = list?.querySelector('[data-tool="eyedropper"]');
  const fill = list?.querySelector('[data-tool="fill"]');
  if (!list || !eyedropper || !fill) return false;
  if (eyedropper.dataset.v093Grouped === 'true') return true;
  eyedropper.insertAdjacentElement('afterend', fill);
  eyedropper.classList.add('color-workflow-tool', 'color-workflow-start');
  fill.classList.add('color-workflow-tool');
  eyedropper.dataset.v093Grouped = 'true';
  fill.dataset.v093Grouped = 'true';
  addStyles();
  return true;
}

function wait(attempt = 0) {
  if (arrange() || attempt > 600) return;
  requestAnimationFrame(() => wait(attempt + 1));
}

wait();
