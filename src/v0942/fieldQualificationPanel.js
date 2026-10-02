import { runFieldQualification, lastFieldQualification } from './fieldQualificationRuntime.js';

function addStyles() {
  if (document.querySelector('#domistikaV0942QualificationStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV0942QualificationStyles';
  style.textContent = [
    '.field-qualification{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}',
    '.field-qualification h3{margin:0;font-size:11px}.field-qualification p{margin:3px 0 8px;color:var(--muted);font-size:8px;line-height:1.45}',
    '.field-qualification-actions{display:flex;flex-wrap:wrap;gap:6px}',
    '.field-qualification-state{margin-top:7px;padding:8px;border:1px solid var(--line);border-radius:8px;color:var(--muted);font-size:8px;line-height:1.4}',
    '.field-qualification-state.pass{border-color:rgba(52,211,153,.35);color:#86efac}',
    '.field-qualification-state.fail{border-color:rgba(248,113,113,.38);color:#fca5a5}',
  ].join('');
  document.head.appendChild(style);
}

function downloadReceipt(receipt) {
  if (!receipt) return;
  const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `domistika-field-qualification-${receipt.status.toLowerCase()}-${receipt.contentHash.slice(-12)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function render(section, receipt = lastFieldQualification()) {
  const state = section.querySelector('.field-qualification-state');
  const download = section.querySelector('[data-qualification-download]');
  if (!receipt) {
    state.className = 'field-qualification-state';
    state.textContent = 'Not run in this session.';
    download.disabled = true;
    return;
  }
  state.className = `field-qualification-state ${receipt.status.toLowerCase()}`;
  state.textContent = `${receipt.status} · ${receipt.summary.passed}/${receipt.summary.total} checks · ${receipt.contentHash}`;
  download.disabled = false;
}

function init() {
  const parent = document.querySelector('#compositionPlatesSection');
  if (!parent) return false;
  if (document.querySelector('#fieldQualificationSection')) return true;
  addStyles();

  const section = document.createElement('section');
  section.id = 'fieldQualificationSection';
  section.className = 'field-qualification';
  section.innerHTML = `
    <h3>Field qualification</h3>
    <p>Run the complete creative-authority acceptance protocol on a disposable project, then restore your current work.</p>
    <div class="field-qualification-actions">
      <button type="button" data-qualification-run>Run qualification</button>
      <button type="button" data-qualification-download disabled>Download receipt</button>
    </div>
    <div class="field-qualification-state">Not run in this session.</div>
  `;
  parent.appendChild(section);

  const run = section.querySelector('[data-qualification-run]');
  run.addEventListener('click', async () => {
    run.disabled = true;
    const state = section.querySelector('.field-qualification-state');
    state.className = 'field-qualification-state';
    state.textContent = 'RUNNING · disposable project';
    try {
      const receipt = await runFieldQualification();
      render(section, receipt);
    } catch (error) {
      state.className = 'field-qualification-state fail';
      state.textContent = `ERROR · ${error.message}`;
    } finally {
      run.disabled = false;
    }
  });

  section.querySelector('[data-qualification-download]').addEventListener('click', () => {
    downloadReceipt(lastFieldQualification());
  });

  window.addEventListener('domistika:v0942-field-qualification', (event) => render(section, event.detail));
  render(section);
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 720) return;
  requestAnimationFrame(() => wait(attempt + 1));
}

wait();
