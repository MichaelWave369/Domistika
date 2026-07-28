const PROFILE_KEY = 'domistika-v02-custom-profiles';

const NAMED_PROFILES = {
  'Graphite HB': { spacing: .15, grain: .14, hardness: .72, flow: .76, rotationJitter: 12 },
  'Graphite 2B': { spacing: .14, grain: .24, hardness: .68, flow: .74, rotationJitter: 18 },
  'Graphite 6B': { spacing: .12, grain: .34, hardness: .52, flow: .66, tip: 'flat', rotationJitter: 24 },
  'Mechanical 0.3': { spacing: .08, grain: .02, hardness: 1, flow: 1, pressureOpacity: false },
  'Mechanical 0.7': { spacing: .1, grain: .04, hardness: .96, flow: .96, pressureOpacity: false },
  'Charcoal Stick': { spacing: .3, scatter: .08, grain: .56, hardness: .26, flow: .62, tip: 'square', rotationJitter: 45 },
  'Compressed Charcoal': { spacing: .22, scatter: .04, grain: .46, hardness: .38, flow: .78, tip: 'flat' },
  'Soft Chalk': { spacing: .26, scatter: .1, grain: .52, hardness: .22, flow: .48, tip: 'square' },
  'Technical Pen Fine': { spacing: .06, grain: 0, hardness: 1, flow: 1, pressureOpacity: false, pressureSize: false },
  'Technical Pen Bold': { spacing: .06, grain: 0, hardness: 1, flow: 1, pressureOpacity: false, pressureSize: false },
  'Fountain Pen': { spacing: .09, grain: .03, hardness: .96, flow: .98, tip: 'chisel', tiltInfluence: .4 },
  'Comic Nib': { spacing: .08, grain: .02, hardness: .98, flow: 1 },
  'Dry Ink': { spacing: .16, scatter: .04, grain: .3, hardness: .62, flow: .78, tip: 'rake' },
  'Sumi Line': { spacing: .16, grain: .08, hardness: .7, flow: .72, tip: 'flat', tiltInfluence: .48 },
  'Round Painter': { spacing: .14, grain: .12, hardness: .78, flow: .88, wetMix: .08 },
  'Broad Painter': { spacing: .2, grain: .12, hardness: .7, flow: .72, tip: 'flat', wetMix: .08 },
  'Gouache Detail': { spacing: .12, grain: .08, hardness: .88, flow: .92, tip: 'flat', wetMix: .12 },
  'Gouache Block': { spacing: .24, grain: .1, hardness: .84, flow: .92, tip: 'square', wetMix: .1 },
  'Watercolor Detail': { spacing: .16, grain: .18, hardness: .36, flow: .42, wetMix: .32 },
  'Watercolor Wash': { spacing: .28, grain: .18, hardness: .2, flow: .24, tip: 'flat', wetMix: .38 },
  'Oil Bristle': { spacing: .16, grain: .32, hardness: .7, flow: .72, tip: 'rake', wetMix: .14, rotationJitter: 18 },
  'Acrylic Round': { spacing: .14, grain: .08, hardness: .82, flow: .9, wetMix: .06 },
  'Color Glaze': { spacing: .22, grain: .14, hardness: .24, flow: .18, tip: 'flat', wetMix: .22, pressureOpacity: false },
  'Block-In Brush': { spacing: .26, grain: .1, hardness: .74, flow: .68, tip: 'square' },
  'Soft Airbrush': { spacing: .12, scatter: .12, grain: .12, hardness: .16, flow: .76 },
  'Mist Airbrush': { spacing: .12, scatter: .26, grain: .24, hardness: .08, flow: .36 },
  'Grain Shader': { spacing: .1, scatter: .18, grain: .62, hardness: .16, flow: .46, tip: 'splatter' },
  'Charcoal Dust': { spacing: .13, scatter: .4, grain: .8, hardness: .12, flow: .34, tip: 'splatter' },
  'Pastel Side': { spacing: .22, scatter: .1, grain: .66, hardness: .2, flow: .38, tip: 'square' },
  'Splatter Ink': { spacing: .34, scatter: .48, grain: .3, hardness: .4, flow: .66, tip: 'splatter', rotationJitter: 180 },
  'Cloud Fog': { spacing: .15, scatter: .12, grain: .18, hardness: .04, flow: .18, pressureOpacity: false },
  'Precision Eraser': { spacing: .08, grain: 0, hardness: 1, flow: 1 },
  'Hard Eraser': { spacing: .12, grain: 0, hardness: .92, flow: 1, tip: 'square' },
  'Soft Eraser': { spacing: .14, grain: .04, hardness: .16, flow: .42 },
  'Large Eraser': { spacing: .18, grain: 0, hardness: .82, flow: 1, tip: 'square' },
  'Kneaded Lifter': { spacing: .16, grain: .26, hardness: .1, flow: .22 },
};

function readProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'); } catch { return {}; }
}
function writeProfiles(value) { localStorage.setItem(PROFILE_KEY, JSON.stringify(value)); }

function fallbackProfile(name = '') {
  const text = name.toLowerCase();
  if (text.includes('splatter')) return { tip: 'splatter', scatter: .45, rotationJitter: 180, grain: .35 };
  if (text.includes('watercolor')) return { hardness: .22, flow: .3, wetMix: .35, grain: .16 };
  if (text.includes('charcoal') || text.includes('chalk') || text.includes('pastel')) return { hardness: .28, grain: .55, spacing: .24, rotationJitter: 30 };
  if (text.includes('airbrush') || text.includes('mist') || text.includes('fog')) return { hardness: .1, scatter: .18, flow: .4 };
  if (text.includes('technical') || text.includes('liner')) return { hardness: 1, spacing: .07, grain: 0, pressureOpacity: false };
  if (text.includes('eraser')) return { hardness: .8, flow: .9 };
  return { spacing: .16, grain: .08, hardness: .82, flow: .9 };
}

function waitForLibrary(attempt = 0) {
  const panel = document.querySelector('#brushesPanel');
  const selection = panel?.querySelector('.brush-selection');
  if (!panel || !selection || !window.domistikaBrushV02) {
    if (attempt < 80) setTimeout(() => waitForLibrary(attempt + 1), 50);
    return;
  }
  if (panel.querySelector('#brushLabV02')) return;

  const style = document.createElement('style');
  style.textContent = `
    .brush-v02-badge{display:inline-flex;margin-top:7px;padding:4px 7px;border:1px solid rgba(116,231,170,.25);border-radius:999px;color:#9de3bb;background:rgba(67,179,120,.08);font-size:9px}
    .brush-lab-v02{display:grid;gap:10px;margin-top:12px;padding:12px;border:1px solid var(--line);border-radius:14px;background:rgba(255,255,255,.025)}
    .brush-lab-v02-head{display:flex;align-items:start;justify-content:space-between;gap:10px}.brush-lab-v02 h3{margin:0;font-size:13px}.brush-lab-v02 p{margin:3px 0 0;color:var(--muted);font-size:10px;line-height:1.45}
    .brush-lab-v02 button{padding:6px 9px;border:1px solid var(--line);border-radius:9px;color:var(--ink);background:var(--panel2);cursor:pointer}
    .brush-lab-v02-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.brush-lab-v02-grid label{display:grid;grid-template-columns:1fr auto;gap:5px;color:var(--muted);font-size:10px}.brush-lab-v02-grid input,.brush-lab-v02-grid select{grid-column:1/-1;width:100%;accent-color:var(--warm)}.brush-lab-v02-grid output{color:var(--ink)}
    .brush-lab-v02-checks{display:grid;grid-template-columns:1fr 1fr;gap:7px}.brush-lab-v02-checks label{display:flex;align-items:center;gap:7px;padding:7px;border:1px solid var(--line);border-radius:9px;color:var(--muted);font-size:9px}
    @media(max-width:1000px){.brush-lab-v02-grid,.brush-lab-v02-checks{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const intro = panel.querySelector('.brush-library-head p');
  if (intro) intro.insertAdjacentHTML('afterend', '<span class="brush-v02-badge">Brush Engine v0.2 active</span>');

  const lab = document.createElement('div');
  lab.id = 'brushLabV02';
  lab.className = 'brush-lab-v02';
  lab.innerHTML = `
    <div class="brush-lab-v02-head"><div><h3>Brush Lab</h3><p>Shape the stroke live, then use “Save current” to preserve it.</p></div><button id="v02Reset">Reset</button></div>
    <div class="brush-lab-v02-grid">
      <label>Spacing <output data-out="spacing">18%</output><input data-v02="spacing" type="range" min="2" max="80" value="18"></label>
      <label>Scatter <output data-out="scatter">0%</output><input data-v02="scatter" type="range" min="0" max="120" value="0"></label>
      <label>Rotation <output data-out="rotationJitter">0°</output><input data-v02="rotationJitter" type="range" min="0" max="180" value="0"></label>
      <label>Grain <output data-out="grain">8%</output><input data-v02="grain" type="range" min="0" max="100" value="8"></label>
      <label>Hardness <output data-out="hardness">84%</output><input data-v02="hardness" type="range" min="4" max="100" value="84"></label>
      <label>Flow <output data-out="flow">100%</output><input data-v02="flow" type="range" min="4" max="120" value="100"></label>
      <label>Tip shape<select data-v02="tip"><option value="round">Round</option><option value="flat">Flat</option><option value="chisel">Chisel</option><option value="square">Square</option><option value="rake">Rake</option><option value="splatter">Splatter</option></select></label>
      <label>Tilt <output data-out="tiltInfluence">0%</output><input data-v02="tiltInfluence" type="range" min="0" max="100" value="0"></label>
      <label>Wet mix <output data-out="wetMix">0%</output><input data-v02="wetMix" type="range" min="0" max="100" value="0"></label>
    </div>
    <div class="brush-lab-v02-checks"><label><input data-v02="pressureOpacity" type="checkbox" checked> Pressure → opacity</label><label><input data-v02="pressureSize" type="checkbox" checked> Pressure → size</label></div>
  `;
  selection.insertAdjacentElement('afterend', lab);

  let activeName = panel.querySelector('#selectedBrushName')?.textContent || 'Graphite HB';
  let activeProfile = {};

  function setUi(profile) {
    const merged = { ...window.domistikaBrushV02.defaults(), ...profile };
    const percentages = ['spacing', 'scatter', 'grain', 'hardness', 'flow', 'tiltInfluence', 'wetMix'];
    percentages.forEach((key) => {
      const input = lab.querySelector(`[data-v02="${key}"]`);
      const value = Math.round(merged[key] * 100);
      input.value = String(value);
      lab.querySelector(`[data-out="${key}"]`).textContent = `${value}%`;
    });
    lab.querySelector('[data-v02="rotationJitter"]').value = String(Math.round(merged.rotationJitter));
    lab.querySelector('[data-out="rotationJitter"]').textContent = `${Math.round(merged.rotationJitter)}°`;
    lab.querySelector('[data-v02="tip"]').value = merged.tip;
    lab.querySelector('[data-v02="pressureOpacity"]').checked = merged.pressureOpacity !== false;
    lab.querySelector('[data-v02="pressureSize"]').checked = merged.pressureSize !== false;
    activeProfile = merged;
  }

  function readUi() {
    const value = (key) => Number(lab.querySelector(`[data-v02="${key}"]`).value);
    return {
      spacing: value('spacing') / 100,
      scatter: value('scatter') / 100,
      rotationJitter: value('rotationJitter'),
      grain: value('grain') / 100,
      hardness: value('hardness') / 100,
      flow: value('flow') / 100,
      tip: lab.querySelector('[data-v02="tip"]').value,
      tiltInfluence: value('tiltInfluence') / 100,
      wetMix: value('wetMix') / 100,
      pressureOpacity: lab.querySelector('[data-v02="pressureOpacity"]').checked,
      pressureSize: lab.querySelector('[data-v02="pressureSize"]').checked,
    };
  }

  function apply(profile, tuned = false) {
    activeProfile = { ...window.domistikaBrushV02.defaults(), ...profile };
    window.domistikaBrushV02.apply(activeProfile);
    setUi(activeProfile);
    if (tuned) {
      const description = panel.querySelector('#selectedBrushDescription');
      if (description) description.textContent = 'Brush Lab is overriding this preset. Save current to keep the tuned version.';
    }
  }

  panel.addEventListener('click', (event) => {
    const card = event.target.closest('.brush-card');
    if (!card || event.target.closest('.brush-favorite,.brush-delete')) return;
    setTimeout(() => {
      activeName = card.querySelector('.brush-name')?.textContent || activeName;
      const custom = readProfiles()[activeName];
      apply(custom || NAMED_PROFILES[activeName] || fallbackProfile(activeName));
    });
  });

  lab.addEventListener('input', (event) => {
    if (!event.target.matches('[data-v02]')) return;
    const key = event.target.dataset.v02;
    const output = lab.querySelector(`[data-out="${key}"]`);
    if (output) output.textContent = key === 'rotationJitter' ? `${event.target.value}°` : `${event.target.value}%`;
    apply(readUi(), true);
  });
  lab.addEventListener('change', (event) => {
    if (event.target.matches('select[data-v02],input[type=checkbox][data-v02]')) apply(readUi(), true);
  });

  lab.querySelector('#v02Reset').addEventListener('click', () => {
    const custom = readProfiles()[activeName];
    apply(custom || NAMED_PROFILES[activeName] || fallbackProfile(activeName));
    document.querySelector('#statusMessage').textContent = 'Brush Lab reset to the selected preset';
  });

  const saveButton = panel.querySelector('#saveCurrentBrush');
  saveButton?.addEventListener('click', () => {
    const snapshot = { ...activeProfile };
    setTimeout(() => {
      const brushes = (() => { try { return JSON.parse(localStorage.getItem('domistika-custom-brushes') || '[]'); } catch { return []; } })();
      const newest = brushes.at(-1);
      if (!newest?.name) return;
      const profiles = readProfiles();
      profiles[newest.name] = snapshot;
      writeProfiles(profiles);
    }, 100);
  }, true);

  apply(NAMED_PROFILES[activeName] || fallbackProfile(activeName));
}

waitForLibrary();
