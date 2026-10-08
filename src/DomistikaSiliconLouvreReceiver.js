import { KEY, inspectHandoff, sha256Hex, validateStaticSvg, importedProject } from './v0943/siliconLouvreBridge.js';
import './v0943/siliconLouvreReceiver.css';

function removeHandoff() {
  try { localStorage.removeItem(KEY); } catch {}
  if (window.location.hash === '#silicon-louvre-import') {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

function initiateDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.download = filename;
  anchor.href = url;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

async function pngFromSvg(objectUrl) {
  const image = new Image();
  image.src = objectUrl;
  await image.decode();
  if (image.naturalWidth !== 800 || image.naturalHeight !== 800) throw Error('UNEXPECTED_DIMENSIONS');
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 800;
  const ctx = canvas.getContext('2d', {willReadFrequently:false});
  if (!ctx) throw Error('CANVAS_UNAVAILABLE');
  ctx.drawImage(image, 0, 0, 800, 800);
  return canvas.toDataURL('image/png');
}

async function showReceiver() {
  if (window.location.hash !== '#silicon-louvre-import') return;
  let raw;
  try { raw = localStorage.getItem(KEY); } catch { return; }
  const packet = inspectHandoff(raw);
  if (!packet) { removeHandoff(); return; }
  const svgParser = new DOMParser();
  if (!validateStaticSvg(packet.svg, svgParser)) { removeHandoff(); return; }
  try {
    if ((await sha256Hex(packet.svg)) !== packet.svgSha256) { removeHandoff(); return; }
  } catch { return; }

  // Render SVG only as a browser image, never as executable document markup.
  const objectUrl = URL.createObjectURL(new Blob([packet.svg], {type:'image/svg+xml'}));
  const dialog = document.createElement('dialog');
  dialog.className = 'silicon-louvre-receiver';
  dialog.setAttribute('aria-labelledby','sl-receiver-title');
  dialog.innerHTML = `
    <div class="sl-receiver__head">
      <span>THE SILICON LOUVRE → DOMISTIKA</span>
      <button type="button" data-action="decline" aria-label="Decline artwork transfer">×</button>
    </div>
    <div class="sl-receiver__body">
      <div class="sl-receiver__preview">
        <img alt="Preview of your static Silicon Louvre optical-art composition"/>
        <span>STATIC SVG PREVIEW · YOUR ARTWORK</span>
      </div>
      <div class="sl-receiver__details">
        <span class="sl-receiver__eyebrow">EXPLICIT LOCAL TRANSFER / 800 × 800</span>
        <h2 id="sl-receiver-title">Continue creating in <em>Domistika.</em></h2>
        <p class="sl-receiver__name"></p>
        <p>Your museum artwork can become a new Domistika paint-layer project. SVG geometry is rasterized into 800×800 pixels on import, so individual vector paths are not editable here.</p>
        <p class="sl-receiver__warning"><strong>Preserve your current project.</strong> Importing replaces the active canvas. Download a complete .domistika backup before continuing.</p>
        <button type="button" data-action="backup">1 · DOWNLOAD CURRENT PROJECT BACKUP</button>
        <label class="sl-receiver__confirm"><input type="checkbox" data-action="ack"/> I have saved my backup file and understand the active project will be replaced.</label>
        <button type="button" class="sl-receiver__import" data-action="import" disabled>2 · IMPORT TO NEW CANVAS</button>
        <button type="button" data-action="decline" class="sl-receiver__skip">DECLINE & KEEP WORKING HERE</button>
        <p class="sl-receiver__status" role="status" aria-live="polite">No artwork has been imported. Nothing is published.</p>
      </div>
    </div>`;
  document.body.appendChild(dialog);
  const preview = dialog.querySelector('img');
  preview.src = objectUrl;
  dialog.querySelector('.sl-receiver__name').textContent = packet.name;

  let snapshot = null;
  let backedUp = false;
  let working = false;
  const status = dialog.querySelector('.sl-receiver__status');
  const backupButton = dialog.querySelector('[data-action="backup"]');
  const importButton = dialog.querySelector('[data-action="import"]');
  const confirm = dialog.querySelector('[data-action="ack"]');
  const declineButtons = dialog.querySelectorAll('[data-action="decline"]');

  function updateReady() { importButton.disabled = working || !(backedUp && confirm.checked); }
  function cleanup(clearTransfer) {
    dialog.close();
    dialog.remove();
    URL.revokeObjectURL(objectUrl);
    if (clearTransfer) removeHandoff();
  }
  confirm.addEventListener('change',updateReady);
  dialog.addEventListener('cancel', (event) => {
    if (working) event.preventDefault();
    else { event.preventDefault(); cleanup(true); }
  });
  declineButtons.forEach(btn=>btn.addEventListener('click',()=>{ if (!working) cleanup(true); }));

  backupButton.addEventListener('click', async()=>{
    if (working) return;
    working=true;
    backupButton.disabled=true;
    updateReady();
    status.textContent='Capturing the current Domistika project…';
    try {
      const sdk = window.Domistika;
      if (!sdk?.capabilities?.().ready || typeof sdk.project?.serialize !== 'function')
        throw Error('DOMISTIKA_NOT_READY');
      snapshot = await sdk.project.serialize({embedMotion:true});
      const text = JSON.stringify(snapshot);
      initiateDownload(new Blob([text],{type:'application/json'}),'domistika-before-silicon-louvre.domistika');
      backedUp=true;
      status.textContent='Backup download requested. Confirm the .domistika file exists on your device before importing.';
    } catch(error) {
      backedUp=false;
      status.textContent='Backup unavailable. Your project was not changed. ('+(error?.message||'unknown error')+')';
    } finally { working=false; backupButton.disabled=false; updateReady(); }
  });

  importButton.addEventListener('click',async()=>{
    if (working || !backedUp || !confirm.checked || !snapshot) return;
    working=true;
    importButton.disabled=true;
    backupButton.disabled=true;
    status.textContent='Preparing your artwork as a paint layer…';
    const sdk=window.Domistika;
    try {
      if (!sdk?.capabilities?.().ready) throw Error('DOMISTIKA_NOT_READY');
      const raster=await pngFromSvg(objectUrl);
      const project=importedProject(snapshot,raster,packet);
      await sdk.project.restore(project);
      status.textContent='Artwork imported into a new 800 × 800 Domistika project.';
      cleanup(true);
    } catch(error) {
      try { await sdk?.project?.restore?.(snapshot); }
      catch { status.textContent='Import failed and automatic rollback failed. Restore the downloaded .domistika backup manually.'; return; }
      status.textContent='Import failed; previous project restored. ('+(error?.message||'unknown error')+')';
    } finally { working=false; backupButton.disabled=false; updateReady(); }
  });

  dialog.showModal();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',showReceiver,{once:true});
else showReceiver();
