import { compileFormula, compileRecipePlan, listRecipes } from './symmetryRecipes.js';
import { activeRecipe, applyFormula, applyRecipe } from './symmetryRecipeRuntime.js';

const recipes = listRecipes();
const coreRecipes = recipes.filter((recipe) => recipe.family !== 'artists');
const artistRecipes = recipes.filter((recipe) => recipe.family === 'artists');
const PRIMITIVES = Object.freeze([
  ['RADIAL(12)', 'Radial'],
  ['MIRROR(15)', 'Mirror'],
  ['NEST(3,.82,.03)', 'Nest'],
  ['SPIRAL(4,.995,.002)', 'Spiral'],
  ['COUNTERSPIN(8)', 'Counterspin'],
  ['PERTURB(.04)', 'Perturb'],
  ['TILE(5,4,.22,.24,.5)', 'Tile'],
  ['GLIDE(x,.11)', 'Glide'],
  ['SHEAR(.25,-.1)', 'Shear'],
]);

function addStyles() {
  if (document.querySelector('#domistikaV0932SymmetryRecipeStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV0932SymmetryRecipeStyles';
  style.textContent = `
    .symmetry-recipes-panel{padding:12px!important;background:linear-gradient(180deg,rgba(117,95,255,.05),transparent)}
    .recipe-hero{display:grid;gap:6px;padding:12px;border:1px solid rgba(139,92,246,.24);border-radius:14px;background:radial-gradient(circle at 90% 10%,rgba(34,211,238,.13),transparent 44%),rgba(255,255,255,.025)}
    .recipe-hero strong{font-size:16px}.recipe-hero p{margin:0;color:var(--muted);font-size:9px;line-height:1.5}.recipe-hero code{color:#ffd18b;font:800 9px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:normal}
    .recipe-section{display:grid;gap:8px;margin-top:12px}.recipe-section-head{display:flex;align-items:end;justify-content:space-between;gap:8px}.recipe-section h3{margin:0;font-size:12px}.recipe-section small{color:var(--muted);font-size:8px}
    .recipe-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.recipe-card{display:grid;gap:4px;min-height:90px;padding:9px!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:12px!important;text-align:left!important;background:rgba(255,255,255,.025)!important;box-shadow:none!important;transform:none!important}.recipe-card:hover,.recipe-card.active{border-color:rgba(34,211,238,.4)!important;background:rgba(34,211,238,.075)!important;filter:none!important}.recipe-card b{color:#9ee9ff;font-size:8px;text-transform:uppercase;letter-spacing:.08em}.recipe-card strong{font-size:10px}.recipe-card span{color:var(--muted);font-size:8px;line-height:1.35}.recipe-card code{color:#ffd18b;font-size:7px;line-height:1.35;white-space:normal}
    .artist-series{padding:10px;border:1px solid rgba(125,211,252,.2);border-radius:14px;background:radial-gradient(circle at 10% 0%,rgba(120,119,198,.13),transparent 52%)}
    .artist-series .artist-intro{color:var(--muted);font-size:9px;line-height:1.5;margin:0}
    .recipe-preview{display:block;width:100%;height:67px;border-radius:7px;overflow:hidden;background:#151421;border:1px solid rgba(255,255,255,.08)}
    .artist-series .recipe-card{min-height:180px}
    .artist-note{display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:var(--muted);font-size:9px;line-height:1.5}
    .artist-note button{font-size:9px;padding:6px 9px}
    .recipe-primitives{display:flex;flex-wrap:wrap;gap:5px}.recipe-primitives button{padding:5px 7px;font-size:8px}
    .recipe-editor{display:grid;gap:7px}.recipe-editor textarea{width:100%;min-height:88px;resize:vertical;padding:9px;border:1px solid var(--line);border-radius:10px;color:var(--ink);background:var(--panel2);font:800 9px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}.recipe-editor-actions{display:flex;gap:6px;align-items:center}.recipe-editor-actions button{padding:7px 10px;font-size:9px}.recipe-editor-state{color:var(--muted);font-size:8px;line-height:1.4}
    html.domistika-retro-basement .symmetry-recipes-panel{color:#2e2114!important;background:linear-gradient(#d5c499,#b9a477)!important}html.domistika-retro-basement .recipe-hero{border-color:#82603b;background:rgba(255,248,220,.25)}html.domistika-retro-basement .recipe-card{color:#2c2015!important;border-color:rgba(83,54,29,.25)!important;background:rgba(255,248,220,.28)!important}html.domistika-retro-basement .recipe-card span,html.domistika-retro-basement .recipe-section small,html.domistika-retro-basement .recipe-editor-state{color:#675238}html.domistika-retro-basement .recipe-editor textarea{color:#2c2115;border-color:#74573a;background:#e5d6ae}
    @media(max-width:680px){.recipe-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function activate(tab, panel) {
  document.querySelectorAll('.inspector-tabs button[data-panel]').forEach((button) => button.classList.toggle('active', button === tab));
  document.querySelectorAll('.inspector-panel').forEach((candidate) => candidate.classList.toggle('active', candidate === panel));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\'\"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character]);
}

// Tiny original line motif, transformed by the exact same math as the canvas.
// These are visual previews, not sampled or reconstructed images from any artist.
function recipePreview(recipe) {
  const compiled = compileFormula(recipe.formula, { width: 140, height: 100, limit: 64 });
  const motif = [
    { x: 73, y: 43 }, { x: 81, y: 43 }, { x: 86, y: 50 },
    { x: 81, y: 57 }, { x: 73, y: 57 },
  ];
  const paths = compiled.transforms.map((transform) => {
    const points = motif.map(transform);
    if (points.every(({ x, y }) => x < -15 || x > 155 || y < -15 || y > 115)) return '';
    const d = points.map(({ x, y }, index) =>
      (index ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2)).join(' ') + ' Z';
    return '<path d="' + d + '" />';
  }).join('');
  return '<svg class="recipe-preview" viewBox="0 0 140 100" role="img" aria-label="Preview of repeated geometric motif">'
    + '<rect x="0" y="0" width="140" height="100" fill="#151421"/>'
    + '<g fill="none" stroke="#9ceef3" stroke-width=".7" opacity=".88">' + paths + '</g>'
    + '</svg>';
}

function recipeCards(collection) {
  return collection.map((recipe) => {
    const plan = compileRecipePlan(recipe.formula);
    const preview = recipe.family === 'artists' ? recipePreview(recipe) : '';
    const inspiration = recipe.inspiration ? '<b>' + escapeHtml(recipe.inspiration) + '</b>' : '';
    return '<button type="button" class="recipe-card" data-recipe-id="' + escapeHtml(recipe.id) + '">'
      + (inspiration || '<b>' + plan.count + ' copies</b>')
      + preview + '<strong>' + escapeHtml(recipe.label) + '</strong>'
      + '<span>' + escapeHtml(recipe.description) + '</span>'
      + '<code>' + escapeHtml(recipe.formula) + '</code>'
      + (inspiration ? '<span>' + plan.count + ' live copies</span>' : '')
      + '</button>';
  }).join('');
}

function sync(panel) {
  const active = activeRecipe();
  panel.querySelectorAll('[data-recipe-id]').forEach((button) => button.classList.toggle('active', button.dataset.recipeId === active?.id));
  const state = panel.querySelector('#symmetryRecipeState');
  if (state) state.textContent = active
    ? `${active.label} active · ${active.copies || '?'} copies${active.truncated ? ' · capped for performance' : ''}`
    : 'No symmetry recipe active. Your existing symmetry mode is untouched.';
  if (active?.formula && panel.querySelector('#symmetryRecipeFormula')?.dataset.dirty !== 'true') {
    panel.querySelector('#symmetryRecipeFormula').value = active.formula;
  }
}

function appendPrimitive(textarea, formula) {
  const current = textarea.value.trim();
  textarea.value = current ? `${current} | ${formula}` : formula;
  textarea.dataset.dirty = 'true';
  textarea.focus();
}

function bindPanel(panel) {
  const textarea = panel.querySelector('#symmetryRecipeFormula');
  const state = panel.querySelector('#symmetryRecipeState');

  panel.querySelectorAll('[data-recipe-id]').forEach((button) => button.addEventListener('click', () => {
    try {
      const result = applyRecipe(button.dataset.recipeId);
      textarea.value = result.formula;
      textarea.dataset.dirty = 'false';
      sync(panel);
    } catch (error) {
      if (state) state.textContent = `Recipe error · ${error.message}`;
    }
  }));

  panel.querySelectorAll('[data-recipe-op]').forEach((button) => button.addEventListener('click', () => appendPrimitive(textarea, button.dataset.recipeOp)));
  textarea.addEventListener('input', () => { textarea.dataset.dirty = 'true'; });

  panel.querySelector('#runSymmetryRecipeFormula')?.addEventListener('click', () => {
    try {
      const result = applyFormula(textarea.value, 'Custom');
      textarea.value = result.formula;
      textarea.dataset.dirty = 'false';
      sync(panel);
    } catch (error) {
      if (state) state.textContent = `Formula error · ${error.message}`;
    }
  });

  panel.querySelector('#loadActiveSymmetryRecipe')?.addEventListener('click', () => {
    const active = activeRecipe();
    if (!active) return;
    textarea.value = active.formula;
    textarea.dataset.dirty = 'false';
    sync(panel);
  });

  panel.querySelector('#artistOpenWeave')?.addEventListener('click', () => {
    const open = document.querySelector('#dimensionalWeaveOpen');
    if (open) open.click();
    else if (state) state.textContent = 'Dimensional Weave is not ready yet.';
  });
  document.addEventListener('domistika:v0932-symmetry-recipe', () => sync(panel));
}

function init() {
  const inspector = document.querySelector('.inspector');
  const tabs = inspector?.querySelector('.inspector-tabs');
  if (!inspector || !tabs) return false;
  if (document.querySelector('#symmetryRecipesPanel')) return true;
  addStyles();

  const tab = document.createElement('button');
  tab.dataset.panel = 'symmetryRecipesPanel';
  tab.textContent = 'Recipes';
  tabs.appendChild(tab);

  const panel = document.createElement('section');
  panel.id = 'symmetryRecipesPanel';
  panel.className = 'inspector-panel symmetry-recipes-panel';
  panel.innerHTML = `
    <div class="recipe-hero"><strong>Symmetry Recipes</strong><code>shape → repeat → mirror → nest → spiral → perturb</code><p>One button can now apply an entire mathematical flavor. Recipes stay live while you draw, and custom formulas are saved with the project.</p></div>
    <section class="recipe-section"><div class="recipe-section-head"><div><h3>Flavor rack</h3><small>Choose a complete transformation stack.</small></div></div><div class="recipe-grid">${recipeCards(coreRecipes)}</div></section>
    <section class="recipe-section artist-series" id="artistSeriesSection"><div class="recipe-section-head"><div><h3>Artists Series · Impossible Geometry</h3><small>Six original live geometry studies</small></div></div><p class="artist-intro">Inspired by the mathematical thinking behind tessellations, optical art, and impossible spaces. These are original generative patterns, not replicas of existing artworks. Choose a study, then draw a small motif near the center to see it multiply.</p><div class="recipe-grid">${recipeCards(artistRecipes)}</div><div class="artist-note"><span>Want dimensional contradictions and extruded faces? Combine these patterns with Domistika's existing Weave tool.</span><button type="button" id="artistOpenWeave">Open Dimensional Weave</button></div></section>
    <section class="recipe-section"><div class="recipe-section-head"><div><h3>Formula primitives</h3><small>Tap an operator to append it to the formula.</small></div></div><div class="recipe-primitives">${PRIMITIVES.map(([formula, label]) => `<button type="button" data-recipe-op="${escapeHtml(formula)}">${escapeHtml(label)}</button>`).join('')}</div></section>
    <section class="recipe-section recipe-editor"><div class="recipe-section-head"><div><h3>Formula bench</h3><small>Pipe operators with |. The runtime caps runaway recipes at 192 transforms.</small></div></div><textarea id="symmetryRecipeFormula" spellcheck="false" aria-label="Symmetry recipe formula">RADIAL(16) | MIRROR(5.625) | NEST(3,.76,.03) | COUNTERSPIN(5.625) | SPIRAL(2.8,.998,.001)</textarea><div class="recipe-editor-actions"><button type="button" id="runSymmetryRecipeFormula">Run formula</button><button type="button" id="loadActiveSymmetryRecipe">Load active</button></div><div class="recipe-editor-state" id="symmetryRecipeState">No symmetry recipe active.</div></section>`;

  inspector.appendChild(panel);
  tab.addEventListener('click', () => activate(tab, panel));
  bindPanel(panel);
  sync(panel);
  document.documentElement.dataset.symmetryRecipes = 'v0.9.43';
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 720) return;
  requestAnimationFrame(() => wait(attempt + 1));
}
wait();
