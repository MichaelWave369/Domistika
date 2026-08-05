import {
  currentArtworkDataUrl,
  downloadDataUrl,
  getProjectName,
  setStatus,
  slugify,
} from './runtime.js';

const STORAGE_KEY = 'domistika-v093-local-gallery';
const MAX_LOCAL_ARTWORKS = 8;
const CATEGORIES = ['All', 'Abstract', 'Mandala', 'Character', 'Sacred Geometry', 'Experimental', 'Pixel / Retro', 'Other'];
const BASE_URL = import.meta.env.BASE_URL || '/';

let curated = [];
let localArtwork = loadLocalArtwork();
let activeCategory = 'All';
let searchQuery = '';
let featuredOverride = null;
let pendingPreview = '';
let page = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeImageUrl(value) {
  const url = String(value || '');
  if (url.startsWith('data:image/')) return url;
  if (url.startsWith('https://')) return url;
  return `${BASE_URL}${url.replace(/^\/+/, '')}`;
}

function loadLocalArtwork() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.image).slice(0, MAX_LOCAL_ARTWORKS) : [];
  } catch {
    return [];
  }
}

function saveLocalArtwork() {
  let next = localArtwork.slice(0, MAX_LOCAL_ARTWORKS);
  while (next.length >= 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      localArtwork = next;
      return true;
    } catch {
      next = next.slice(0, -1);
      if (!next.length) break;
    }
  }
  setStatus('The local gallery is full. Remove an older local artwork and try again.');
  return false;
}

function allArtwork() {
  return [...localArtwork, ...curated];
}

function dateSeed() {
  const key = new Date().toISOString().slice(0, 10);
  let hash = 2166136261;
  for (const character of key) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function artOfTheDay(items) {
  if (!items.length) return null;
  if (featuredOverride) return items.find((item) => item.id === featuredOverride) || items[0];
  return items[dateSeed() % items.length];
}

function filteredArtwork() {
  const query = searchQuery.trim().toLowerCase();
  return allArtwork().filter((item) => {
    const categoryMatches = activeCategory === 'All' || item.category === activeCategory;
    const haystack = `${item.title} ${item.artist} ${item.description} ${item.category}`.toLowerCase();
    return categoryMatches && (!query || haystack.includes(query));
  });
}

function addStyles() {
  if (document.querySelector('#domistikaV093GalleryStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV093GalleryStyles';
  style.textContent = `
    .domistika-gallery-page{position:fixed;inset:0;z-index:4200;display:grid;grid-template-rows:auto 1fr;color:#f5ecdf;background:radial-gradient(circle at 20% 0,rgba(255,156,69,.16),transparent 32rem),linear-gradient(145deg,#1d100b,#0e0b11 54%,#151024);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow:hidden}
    .domistika-gallery-page[hidden]{display:none!important}
    .gallery-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 18px;border-bottom:2px solid rgba(255,184,91,.45);background:rgba(18,12,12,.92);box-shadow:0 5px 20px rgba(0,0,0,.45)}
    .gallery-brand{display:flex;align-items:center;gap:12px}.gallery-brand-mark{display:grid;place-items:center;width:42px;height:42px;border:2px solid #ffb45d;border-radius:50%;color:#2b1609;background:radial-gradient(circle at 35% 30%,#ffe0a1,#d98a2e 48%,#5b2813);font:900 20px/1 Georgia,serif;box-shadow:inset 0 0 0 3px rgba(255,255,255,.15),0 0 18px rgba(255,139,55,.25)}
    .gallery-brand h1{margin:0;font:900 clamp(18px,2vw,28px)/1.05 Georgia,serif;letter-spacing:.02em}.gallery-brand p{margin:3px 0 0;color:#d5b58e;font-size:10px;letter-spacing:.1em;text-transform:uppercase}
    .gallery-top-actions{display:flex;gap:8px;flex-wrap:wrap}.gallery-top-actions button{min-height:34px;padding:7px 11px;border:1px solid #775136;border-radius:7px;color:#f6e7cc;background:linear-gradient(#5b3723,#321e15);box-shadow:inset 0 1px rgba(255,255,255,.12),0 2px #100907}
    .gallery-main{overflow:auto;padding:18px}.gallery-shell{width:min(1440px,100%);margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px}
    .gallery-content{min-width:0}.gallery-feature{display:grid;grid-template-columns:minmax(220px,42%) 1fr;min-height:290px;border:1px solid rgba(255,180,90,.32);border-radius:16px;overflow:hidden;background:linear-gradient(135deg,rgba(86,47,30,.72),rgba(24,18,31,.9));box-shadow:0 18px 50px rgba(0,0,0,.35)}
    .gallery-feature-image{min-height:290px;background:#09080c center/cover no-repeat}.gallery-feature-copy{display:flex;flex-direction:column;justify-content:center;padding:26px}.gallery-kicker{color:#ffb45d;font-size:10px;letter-spacing:.18em;text-transform:uppercase}.gallery-feature h2{margin:8px 0 3px;font:900 clamp(25px,4vw,50px)/.98 Georgia,serif}.gallery-feature .artist{color:#8fd9ff}.gallery-feature p{max-width:620px;color:#d8c9bb;line-height:1.55}.gallery-chip{display:inline-flex;align-items:center;width:max-content;margin-top:8px;padding:5px 8px;border:1px solid rgba(143,217,255,.35);border-radius:999px;color:#8fd9ff;background:rgba(13,74,97,.2);font-size:9px;text-transform:uppercase;letter-spacing:.08em}
    .gallery-filters{display:flex;align-items:center;gap:8px;margin:18px 0 12px;flex-wrap:wrap}.gallery-search{flex:1;min-width:210px;height:38px;padding:0 12px;border:1px solid #60442f;border-radius:8px;color:#fff;background:#110d12}.gallery-category{padding:7px 9px;border:1px solid #60442f;border-radius:7px;color:#d8c9bb;background:#21151a;font-size:9px}.gallery-category.active{color:#211108;border-color:#ffbd68;background:#ffbd68}.gallery-count{margin-left:auto;color:#9b8c85;font-size:9px}
    .gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}.gallery-card{position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:#171117;box-shadow:0 8px 24px rgba(0,0,0,.28);cursor:pointer;transition:transform .16s ease,border-color .16s ease}.gallery-card:hover{transform:translateY(-3px);border-color:#ffb45d}.gallery-card img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#09080c}.gallery-card-copy{padding:11px}.gallery-card h3{margin:0 0 4px;color:#fff;font:800 15px/1.15 Georgia,serif}.gallery-card p{margin:0;color:#9f9290;font-size:9px}.gallery-card-category{display:inline-block;margin-top:8px;color:#8fd9ff;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.gallery-local-badge{position:absolute;top:8px;left:8px;padding:4px 6px;border-radius:5px;color:#15200e;background:#b7e66c;font-size:7px;font-weight:900;text-transform:uppercase}.gallery-delete{position:absolute;top:8px;right:8px;width:27px;height:27px;border:1px solid rgba(255,255,255,.35);border-radius:50%;color:#fff;background:rgba(70,15,20,.85);cursor:pointer}
    .gallery-empty{grid-column:1/-1;padding:60px 20px;text-align:center;border:1px dashed #60442f;border-radius:12px;color:#a99488}
    .gallery-submit{position:sticky;top:0;align-self:start;padding:16px;border:1px solid rgba(255,180,90,.35);border-radius:14px;background:linear-gradient(#2c1b18,#171119);box-shadow:0 14px 38px rgba(0,0,0,.35)}.gallery-submit h2{margin:0;font:900 22px/1 Georgia,serif}.gallery-submit>p{color:#b9a79c;font-size:10px;line-height:1.45}.gallery-preview{display:grid;place-items:center;min-height:170px;margin:12px 0;border:1px dashed #72503a;border-radius:10px;overflow:hidden;color:#8e7b72;background:#0d0b0f center/contain no-repeat}.gallery-preview.has-image{color:transparent;background-repeat:no-repeat}.gallery-submit form{display:grid;gap:9px}.gallery-submit label{display:grid;gap:4px;color:#c9b6a6;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.gallery-submit input,.gallery-submit textarea,.gallery-submit select{width:100%;padding:9px;border:1px solid #60442f;border-radius:7px;color:#fff;background:#100c11}.gallery-submit textarea{min-height:72px;resize:vertical}.gallery-submit .check-row{display:flex;grid-template-columns:none;align-items:flex-start;gap:8px;text-transform:none;letter-spacing:0;line-height:1.35}.gallery-submit .check-row input{width:auto;margin-top:2px}.gallery-submit-buttons{display:grid;grid-template-columns:1fr 1fr;gap:8px}.gallery-submit button{min-height:36px;padding:8px;border:1px solid #775136;border-radius:7px;color:#f6e7cc;background:linear-gradient(#5b3723,#321e15);cursor:pointer}.gallery-submit .gallery-public{grid-column:1/-1;color:#1a1008;border-color:#ffbd68;background:linear-gradient(#ffd18d,#e78c31);font-weight:900}.gallery-note{margin-top:10px;color:#8e7b72;font-size:8px;line-height:1.45}
    .gallery-viewer{width:min(930px,92vw);max-height:90vh;padding:0;border:2px solid #ffb45d;border-radius:13px;color:#f5ecdf;background:#100d12;box-shadow:0 30px 120px rgba(0,0,0,.8)}.gallery-viewer::backdrop{background:rgba(3,2,5,.82)}.gallery-viewer img{display:block;width:100%;max-height:68vh;object-fit:contain;background:#070608}.gallery-viewer-copy{padding:15px 18px}.gallery-viewer h2{margin:0;font:900 26px/1 Georgia,serif}.gallery-viewer p{color:#bbaaa0;line-height:1.5}.gallery-viewer-close{position:absolute;top:10px;right:10px;width:36px;height:36px;border:1px solid #fff;border-radius:50%;color:#fff;background:rgba(0,0,0,.72);cursor:pointer}
    html.domistika-16bit-console .domistika-gallery-page{color:#e2e8f0;background:radial-gradient(circle at 20% 0,rgba(139,92,246,.14),transparent 34rem),#050910}.domistika-16bit-console .gallery-topbar{border-color:#00d4aa;background:#080d1a}.domistika-16bit-console .gallery-brand-mark{border-radius:4px;border-color:#00d4aa;color:#f5c542;background:#172249}.domistika-16bit-console .gallery-feature,.domistika-16bit-console .gallery-submit{border-radius:5px;border-color:#26355f;background:linear-gradient(#121b3a,#090e1b)}.domistika-16bit-console .gallery-card{border-radius:4px;background:#090e1b}.domistika-16bit-console .gallery-category.active{color:#050910;border-color:#00d4aa;background:#00d4aa}.domistika-16bit-console .gallery-kicker{color:#00d4aa}.domistika-16bit-console .gallery-chip,.domistika-16bit-console .gallery-card-category{color:#7dd3fc}.domistika-16bit-console .gallery-public{border-color:#00d4aa!important;background:linear-gradient(#4ff2d1,#00a886)!important}
    @media(max-width:980px){.gallery-shell{grid-template-columns:1fr}.gallery-submit{position:static}.gallery-feature{grid-template-columns:1fr}.gallery-feature-image{min-height:260px}}
    @media(max-width:620px){.gallery-main{padding:10px}.gallery-topbar{padding:9px}.gallery-brand p{display:none}.gallery-feature-copy{padding:18px}.gallery-grid{grid-template-columns:1fr 1fr}.gallery-submit-buttons{grid-template-columns:1fr}.gallery-submit .gallery-public{grid-column:auto}}
    @media(prefers-reduced-motion:reduce){.gallery-card{transition:none}.gallery-card:hover{transform:none}}
  `;
  document.head.appendChild(style);
}

async function loadCurated() {
  try {
    const response = await fetch(`${BASE_URL}gallery/artworks.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Gallery returned ${response.status}`);
    const payload = await response.json();
    curated = Array.isArray(payload.artworks) ? payload.artworks : [];
  } catch (error) {
    console.warn('Domistika curated gallery could not be loaded', error);
    curated = [];
  }
  render();
}

function artworkCard(item) {
  return `<article class="gallery-card" data-art-id="${escapeHtml(item.id)}" tabindex="0">
    ${item.local ? '<span class="gallery-local-badge">My gallery</span>' : ''}
    ${item.local ? `<button class="gallery-delete" type="button" data-delete-art="${escapeHtml(item.id)}" title="Remove local artwork">×</button>` : ''}
    <img src="${escapeHtml(safeImageUrl(item.image))}" alt="${escapeHtml(item.title)}" loading="lazy">
    <div class="gallery-card-copy"><h3>${escapeHtml(item.title)}</h3><p>by ${escapeHtml(item.artist || 'Anonymous')}</p><span class="gallery-card-category">${escapeHtml(item.category || 'Other')}</span></div>
  </article>`;
}

function renderFeature(items) {
  const feature = artOfTheDay(items);
  const host = page?.querySelector('#galleryFeature');
  if (!host) return;
  if (!feature) {
    host.innerHTML = '<div class="gallery-empty">The gallery is waiting for its first artwork.</div>';
    return;
  }
  host.innerHTML = `<div class="gallery-feature-image" style="background-image:url('${escapeHtml(safeImageUrl(feature.image))}')"></div>
    <div class="gallery-feature-copy"><span class="gallery-kicker">Domistika Art of the Day</span><h2>${escapeHtml(feature.title)}</h2><strong class="artist">by ${escapeHtml(feature.artist || 'Anonymous')}</strong><span class="gallery-chip">${escapeHtml(feature.category || 'Other')}</span><p>${escapeHtml(feature.description || 'A creation from the Domistika community.')}</p><button type="button" id="shuffleGalleryFeature">Show me another</button></div>`;
  host.querySelector('#shuffleGalleryFeature')?.addEventListener('click', () => {
    const candidates = allArtwork();
    if (!candidates.length) return;
    featuredOverride = candidates[Math.floor(Math.random() * candidates.length)].id;
    renderFeature(candidates);
  });
}

function render() {
  if (!page) return;
  const items = filteredArtwork();
  renderFeature(allArtwork());
  page.querySelector('#galleryCount').textContent = `${items.length} artwork${items.length === 1 ? '' : 's'}`;
  const grid = page.querySelector('#galleryGrid');
  grid.innerHTML = items.length ? items.map(artworkCard).join('') : '<div class="gallery-empty">No artwork matches those filters yet.</div>';
  page.querySelectorAll('.gallery-category').forEach((button) => button.classList.toggle('active', button.dataset.category === activeCategory));
}

function showArtwork(item) {
  const dialog = page.querySelector('#galleryViewer');
  dialog.querySelector('img').src = safeImageUrl(item.image);
  dialog.querySelector('img').alt = item.title;
  dialog.querySelector('h2').textContent = item.title;
  dialog.querySelector('.gallery-viewer-artist').textContent = `by ${item.artist || 'Anonymous'} · ${item.category || 'Other'}`;
  dialog.querySelector('.gallery-viewer-description').textContent = item.description || 'A creation from the Domistika community.';
  dialog.showModal();
}

function removeLocal(id) {
  localArtwork = localArtwork.filter((item) => item.id !== id);
  saveLocalArtwork();
  render();
  setStatus('Artwork removed from your local gallery');
}

function scaleImage(image, maxDimension = 960) {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.84);
}

function filePreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('That file is not a supported image'));
      image.onload = () => resolve(scaleImage(image));
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function setPreview(dataUrl) {
  pendingPreview = dataUrl;
  const preview = page.querySelector('#galleryPreview');
  preview.classList.toggle('has-image', Boolean(dataUrl));
  preview.style.backgroundImage = dataUrl ? `url('${dataUrl}')` : '';
  preview.textContent = dataUrl ? 'Artwork preview ready' : 'Capture the current canvas or choose an image';
}

async function captureCurrent() {
  try {
    setPreview(currentArtworkDataUrl({ maxDimension: 960, type: 'image/webp', quality: 0.84, includeBackground: true }));
    const title = page.querySelector('#galleryTitle');
    if (!title.value.trim()) title.value = getProjectName();
    setStatus('Current canvas captured for the gallery');
  } catch (error) {
    setStatus(error.message);
  }
}

function formArtwork() {
  const form = page.querySelector('#gallerySubmitForm');
  const title = form.querySelector('#galleryTitle').value.trim();
  const artist = form.querySelector('#galleryArtist').value.trim() || 'Anonymous';
  const category = form.querySelector('#gallerySubmitCategory').value;
  const description = form.querySelector('#galleryDescription').value.trim();
  const consent = form.querySelector('#galleryConsent').checked;
  if (!title) throw new Error('Give the artwork a title first');
  if (!pendingPreview) throw new Error('Capture the canvas or choose an image first');
  if (!consent) throw new Error('Please confirm that you have permission to submit this artwork');
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    artist,
    category,
    description,
    image: pendingPreview,
    createdAt: new Date().toISOString(),
    local: true,
  };
}

function addLocalSubmission() {
  try {
    const item = formArtwork();
    localArtwork = [item, ...localArtwork].slice(0, MAX_LOCAL_ARTWORKS);
    if (!saveLocalArtwork()) return null;
    render();
    setStatus(`“${item.title}” added to your local Domistika gallery`);
    return item;
  } catch (error) {
    setStatus(error.message);
    return null;
  }
}

async function submitPublicly() {
  const item = addLocalSubmission();
  if (!item) return;
  downloadDataUrl(item.image, `${slugify(item.title)}-domistika-gallery.webp`);
  const metadata = `Domistika Art Gallery submission\nTitle: ${item.title}\nArtist: ${item.artist}\nCategory: ${item.category}\nDescription: ${item.description || '(none)'}\n\nAttach the downloaded WEBP image to the GitHub issue.`;
  try { await navigator.clipboard.writeText(metadata); } catch {}
  const title = encodeURIComponent(`Gallery Submission: ${item.title}`);
  const issueUrl = `https://github.com/MichaelWave369/Domistika/issues/new?template=art-gallery-submission.md&title=${title}`;
  window.open(issueUrl, '_blank', 'noopener,noreferrer');
  setStatus('Submission image downloaded and metadata copied. Attach it to the new GitHub issue.');
}

function openGallery(updateHash = true) {
  if (!page) return;
  page.hidden = false;
  page.setAttribute('aria-hidden', 'false');
  document.body.classList.add('domistika-gallery-open');
  if (updateHash && location.hash !== '#gallery') history.pushState({ domistikaGallery: true }, '', '#gallery');
  render();
}

function closeGallery(updateHash = true) {
  if (!page) return;
  page.hidden = true;
  page.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('domistika-gallery-open');
  if (updateHash && location.hash === '#gallery') history.replaceState({}, '', `${location.pathname}${location.search}`);
}

function bindPage() {
  page.querySelector('#closeGallery').addEventListener('click', () => closeGallery());
  page.querySelector('#captureGalleryCanvas').addEventListener('click', captureCurrent);
  page.querySelector('#gallerySubmitForm').addEventListener('submit', (event) => {
    event.preventDefault();
    addLocalSubmission();
  });
  page.querySelector('#submitGalleryPublic').addEventListener('click', submitPublicly);
  page.querySelector('#galleryImageFile').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { setPreview(await filePreview(file)); } catch (error) { setStatus(error.message); }
  });
  page.querySelector('#gallerySearch').addEventListener('input', (event) => {
    searchQuery = event.target.value;
    render();
  });
  page.querySelector('#galleryCategories').addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    render();
  });
  page.querySelector('#galleryGrid').addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-art]');
    if (deleteButton) {
      event.stopPropagation();
      removeLocal(deleteButton.dataset.deleteArt);
      return;
    }
    const card = event.target.closest('[data-art-id]');
    if (!card) return;
    const item = allArtwork().find((candidate) => candidate.id === card.dataset.artId);
    if (item) showArtwork(item);
  });
  page.querySelector('#galleryGrid').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('[data-art-id]');
    if (!card) return;
    event.preventDefault();
    const item = allArtwork().find((candidate) => candidate.id === card.dataset.artId);
    if (item) showArtwork(item);
  });
  page.querySelector('#galleryViewerClose').addEventListener('click', () => page.querySelector('#galleryViewer').close());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !page.hidden && !page.querySelector('#galleryViewer').open) closeGallery();
  });
  window.addEventListener('popstate', () => location.hash === '#gallery' ? openGallery(false) : closeGallery(false));
  window.addEventListener('hashchange', () => location.hash === '#gallery' ? openGallery(false) : closeGallery(false));
}

function init() {
  const topActions = document.querySelector('.top-actions');
  if (!topActions) return false;
  if (document.querySelector('#openGalleryButton')) return true;
  addStyles();

  const button = document.createElement('button');
  button.id = 'openGalleryButton';
  button.type = 'button';
  button.className = 'soft-button';
  button.innerHTML = '<span>🖼️</span><span>Gallery</span>';
  button.title = 'Open the Domistika Art Gallery';
  const newButton = topActions.querySelector('#newProject');
  topActions.insertBefore(button, newButton || topActions.firstChild);

  page = document.createElement('section');
  page.id = 'domistikaGalleryPage';
  page.className = 'domistika-gallery-page';
  page.hidden = true;
  page.setAttribute('aria-hidden', 'true');
  page.innerHTML = `<header class="gallery-topbar"><div class="gallery-brand"><div class="gallery-brand-mark">D</div><div><h1>Domistika Art Gallery</h1><p>Carbon-made art · shared with permission</p></div></div><div class="gallery-top-actions"><button type="button" id="closeGallery">Back to Studio</button></div></header>
    <main class="gallery-main"><div class="gallery-shell"><section class="gallery-content"><section class="gallery-feature" id="galleryFeature"></section><div class="gallery-filters"><input class="gallery-search" id="gallerySearch" type="search" placeholder="Search titles, artists, categories…"><div id="galleryCategories">${CATEGORIES.map((category) => `<button type="button" class="gallery-category${category === 'All' ? ' active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('')}</div><span class="gallery-count" id="galleryCount">0 artworks</span></div><section class="gallery-grid" id="galleryGrid"></section></section>
    <aside class="gallery-submit"><h2>Submit your art</h2><p>Add the current Domistika canvas or choose an image. Local submissions appear instantly on this device. Public submissions open a curated GitHub workflow.</p><div class="gallery-preview" id="galleryPreview">Capture the current canvas or choose an image</div><form id="gallerySubmitForm"><button type="button" id="captureGalleryCanvas">Use current canvas</button><label>Or choose an image<input id="galleryImageFile" type="file" accept="image/*"></label><label>Title<input id="galleryTitle" maxlength="80" placeholder="Artwork title" required></label><label>Artist<input id="galleryArtist" maxlength="60" placeholder="Name or alias"></label><label>Category<select id="gallerySubmitCategory">${CATEGORIES.filter((category) => category !== 'All').map((category) => `<option>${escapeHtml(category)}</option>`).join('')}</select></label><label>Description<textarea id="galleryDescription" maxlength="500" placeholder="Tell the gallery about this piece"></textarea></label><label class="check-row"><input id="galleryConsent" type="checkbox" required><span>I created this artwork or have permission to submit it, and I choose whether it stays local or enters public review.</span></label><div class="gallery-submit-buttons"><button type="submit">Add to My Gallery</button><button type="button" id="submitGalleryPublic" class="gallery-public">Submit to Public Gallery</button></div></form><p class="gallery-note">Public review is intentionally human-governed. The image is downloaded to your device and a GitHub submission form opens so you can attach it. Nothing is uploaded silently.</p></aside></div></main>
    <dialog class="gallery-viewer" id="galleryViewer"><button class="gallery-viewer-close" id="galleryViewerClose" type="button">×</button><img alt=""><div class="gallery-viewer-copy"><h2></h2><strong class="gallery-viewer-artist"></strong><p class="gallery-viewer-description"></p></div></dialog>`;
  document.body.appendChild(page);
  button.addEventListener('click', () => openGallery());
  bindPage();
  loadCurated();
  if (location.hash === '#gallery') openGallery(false);
  window.domistikaGalleryV093 = { open: openGallery, close: closeGallery, render, getAll: allArtwork };
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 720) return;
  requestAnimationFrame(() => wait(attempt + 1));
}

wait();
