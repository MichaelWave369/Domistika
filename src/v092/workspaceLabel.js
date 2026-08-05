function addStyles() {
  if (document.querySelector('#domistikaV092WheelLabelStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV092WheelLabelStyles';
  style.textContent = `
    .studio-wheel-toggle-copy strong{font-size:15px!important;line-height:1.05;letter-spacing:.015em;transition:color .12s ease,text-shadow .12s ease}
    .inspector.wheel-open .studio-wheel-toggle-copy strong{color:var(--pro-gold,#ffc56e);text-shadow:0 0 16px rgba(255,197,110,.24)}
    .studio-wheel-item em{display:none!important}
    .studio-wheel-popover::after{pointer-events:none}
    html.domistika-retro-basement .studio-wheel-toggle-copy strong{font-family:Georgia,"Times New Roman",serif;font-size:16px!important;color:#fff0bd!important;text-shadow:0 1px 0 #211208}
  `;
  document.head.appendChild(style);
}

function itemLabel(item) {
  const aria = item?.getAttribute('aria-label') || '';
  return aria.replace(/^Open\s+/i, '').trim() || item?.querySelector('em')?.textContent?.trim() || 'Workspace';
}

function activeLabel() {
  return document.querySelector('.inspector-tabs button[data-panel].active')?.textContent?.trim() || 'Workspace';
}

function init() {
  const popover = document.querySelector('.studio-wheel-popover');
  const title = document.querySelector('.studio-wheel-toggle-copy strong');
  if (!popover || !title) return false;
  if (popover.dataset.v092Label === 'true') return true;
  addStyles();
  popover.dataset.v092Label = 'true';

  const preview = (item) => {
    if (!item) return;
    title.textContent = itemLabel(item);
    title.dataset.wheelPreview = 'true';
  };
  const restore = () => {
    title.textContent = activeLabel();
    delete title.dataset.wheelPreview;
  };

  popover.addEventListener('pointerover', (event) => preview(event.target.closest('.studio-wheel-item')));
  popover.addEventListener('focusin', (event) => preview(event.target.closest('.studio-wheel-item')));
  popover.addEventListener('pointerleave', restore);
  popover.addEventListener('focusout', (event) => {
    if (!popover.contains(event.relatedTarget)) restore();
  });
  popover.addEventListener('click', () => requestAnimationFrame(restore));

  const tabs = document.querySelector('.inspector-tabs');
  if (tabs) new MutationObserver(() => {
    if (!title.dataset.wheelPreview) restore();
  }).observe(tabs, { subtree: true, attributes: true, attributeFilter: ['class'] });

  restore();
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 480) return;
  requestAnimationFrame(() => wait(attempt + 1));
}
wait();
