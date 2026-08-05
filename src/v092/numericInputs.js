const NUMBER_CLASS = 'precision-number-input';

function decimalPlaces(step) {
  const text = String(step ?? '1');
  if (text.includes('e-')) return Number(text.split('e-')[1]) || 0;
  return text.includes('.') ? text.split('.')[1].length : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatValue(value, step) {
  const places = Math.min(6, decimalPlaces(step));
  return places ? Number(value).toFixed(places).replace(/0+$/, '').replace(/\.$/, '') : String(Math.round(Number(value)));
}

function decorateRange(range) {
  if (!(range instanceof HTMLInputElement) || range.type !== 'range' || range.dataset.numericCompanion === 'true') return;
  if (!range.id && !range.closest('label')) return;

  const min = Number.isFinite(Number(range.min)) ? Number(range.min) : 0;
  const max = Number.isFinite(Number(range.max)) ? Number(range.max) : 100;
  const step = range.step && range.step !== 'any' ? Number(range.step) : 1;
  const wrapper = document.createElement('span');
  wrapper.className = 'precision-range-row';
  range.parentNode.insertBefore(wrapper, range);
  wrapper.appendChild(range);

  const number = document.createElement('input');
  number.type = 'number';
  number.className = NUMBER_CLASS;
  number.min = String(min);
  number.max = String(max);
  number.step = String(step || 1);
  number.value = formatValue(range.value, step);
  number.inputMode = step < 1 ? 'decimal' : 'numeric';
  number.setAttribute('aria-label', `${range.getAttribute('aria-label') || range.closest('label')?.textContent?.trim() || range.id || 'Control'} exact value`);
  number.title = 'Type an exact value';
  wrapper.appendChild(number);
  range.dataset.numericCompanion = 'true';

  const syncFromRange = () => {
    if (document.activeElement !== number) number.value = formatValue(range.value, step);
  };
  const commitNumber = () => {
    const parsed = Number(number.value);
    if (!Number.isFinite(parsed)) {
      number.value = formatValue(range.value, step);
      return;
    }
    const next = clamp(parsed, min, max);
    range.value = String(next);
    number.value = formatValue(next, step);
    range.dispatchEvent(new Event('input', { bubbles: true }));
    range.dispatchEvent(new Event('change', { bubbles: true }));
  };

  range.addEventListener('input', syncFromRange);
  range.addEventListener('change', syncFromRange);
  number.addEventListener('change', commitNumber);
  number.addEventListener('blur', commitNumber);
  number.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitNumber();
      number.blur();
    }
    if (event.key === 'Escape') {
      number.value = formatValue(range.value, step);
      number.blur();
    }
  });
}

function addStyles() {
  if (document.querySelector('#domistikaV092NumericStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV092NumericStyles';
  style.textContent = `
    .precision-range-row{grid-column:1/-1;display:flex;align-items:center;gap:5px;min-width:0}
    .precision-range-row>input[type=range]{flex:1;min-width:46px;width:auto!important}
    .precision-number-input{width:48px;min-width:48px;height:24px;padding:2px 4px;border:1px solid var(--line);border-radius:7px;color:var(--ink);background:var(--panel2);font:800 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;text-align:center}
    .precision-number-input:focus{background:var(--panel3)}
    .control-deck .precision-number-input{width:42px;min-width:42px;height:22px;font-size:8px}
    html.domistika-retro-basement .precision-number-input{color:#2c2115;border-color:#75583a;background:#e3d4ad;box-shadow:inset 0 1px 3px rgba(65,39,19,.24)}
    html.domistika-retro-basement .precision-number-input:focus{background:#f2e5bf}
    @media(max-width:680px){.precision-number-input{width:44px;min-width:44px}.control-deck .precision-number-input{width:40px;min-width:40px}}
  `;
  document.head.appendChild(style);
}

function scan(root = document) {
  root.querySelectorAll?.('input[type="range"]').forEach(decorateRange);
}

function init() {
  if (!document.body) return false;
  addStyles();
  scan();
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches?.('input[type="range"]')) decorateRange(node);
        scan(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  document.documentElement.dataset.numericInputs = 'v0.9.2';
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 360) return;
  requestAnimationFrame(() => wait(attempt + 1));
}
wait();
