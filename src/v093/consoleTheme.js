const THEME_KEY = 'domistika-v093-theme';
const THEMES = ['grandmas-basement', '16-bit-console', 'night-studio'];

function addStyles() {
  if (document.querySelector('#domistikaV093ConsoleStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV093ConsoleStyles';
  style.textContent = `
    html.domistika-16bit-console{background:#050910;color-scheme:dark}
    html.domistika-16bit-console body{background:#050910;color:#e2e8f0}
    html.domistika-16bit-console .studio{
      --panel:#090e1b;--panel2:#0b1120;--panel3:#0d142c;--line:#26355f;--muted:#7085a8;--ink:#e2e8f0;--warm:#d4a017;--violet:#8b5cf6;
      color:#e2e8f0;
      font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;
      background:
        linear-gradient(rgba(5,9,16,.94),rgba(5,9,16,.94)),
        repeating-linear-gradient(90deg,transparent 0 31px,rgba(0,212,170,.055) 31px 32px),
        repeating-linear-gradient(0deg,transparent 0 31px,rgba(139,92,246,.045) 31px 32px),
        #050910;
      image-rendering:auto;
    }
    html.domistika-16bit-console .studio::after{content:"";position:fixed;inset:0;z-index:3000;pointer-events:none;opacity:.065;background:repeating-linear-gradient(to bottom,transparent 0,transparent 2px,rgba(255,255,255,.18) 3px,transparent 4px);mix-blend-mode:screen}
    html.domistika-16bit-console .topbar{
      color:#e2e8f0;border-bottom:2px solid #00d4aa;
      background:linear-gradient(180deg,#101a38,#080d1a 70%,#050910);
      box-shadow:inset 0 1px rgba(255,255,255,.1),inset 0 -3px #121a2f,0 4px 0 #02040a,0 8px 20px rgba(0,0,0,.62);
      backdrop-filter:none;
    }
    html.domistika-16bit-console .brand-mark{border:2px solid #00d4aa;border-radius:4px;color:#f5c542;background:linear-gradient(135deg,#172249,#090e1b);box-shadow:inset 1px 1px rgba(255,255,255,.14),inset -2px -2px rgba(0,0,0,.7),0 0 15px rgba(0,212,170,.25);text-shadow:2px 2px #000}
    html.domistika-16bit-console .brand-block h1{color:#fff;letter-spacing:.08em;text-transform:uppercase;text-shadow:2px 2px #000,0 0 10px rgba(125,211,252,.32)}
    html.domistika-16bit-console .brand-block p{color:#00d4aa;letter-spacing:.12em}
    html.domistika-16bit-console .retro-console-label{display:block!important;color:#d4a017;border-color:#26355f;border-radius:3px;background:#080d1a;box-shadow:inset 1px 1px rgba(255,255,255,.08),inset -2px -2px rgba(0,0,0,.7);text-shadow:1px 1px #000}
    html.domistika-16bit-console .project-strip input{color:#e2e8f0;border:1px solid #26355f;border-radius:3px;background:#050910;box-shadow:inset 2px 2px #02040a,inset -1px -1px rgba(125,211,252,.08)}
    html.domistika-16bit-console .save-state{color:#00d4aa;text-shadow:0 0 7px rgba(0,212,170,.45)}

    html.domistika-16bit-console button,
    html.domistika-16bit-console .soft-button,
    html.domistika-16bit-console .toggle-button,
    html.domistika-16bit-console .statusbar button,
    html.domistika-16bit-console .zoom-dock button{
      color:#dce8ff;border:1px solid #344777;border-radius:3px;background:linear-gradient(#172249,#0b1120);
      box-shadow:inset 1px 1px rgba(255,255,255,.12),inset -2px -2px rgba(0,0,0,.72),1px 1px #02040a;
      text-shadow:1px 1px #000;letter-spacing:.02em;
    }
    html.domistika-16bit-console button:hover{color:#fff;border-color:#00d4aa;background:linear-gradient(#1b2c5a,#10182e);filter:none}
    html.domistika-16bit-console button:active{transform:translate(1px,1px);box-shadow:inset 2px 2px rgba(0,0,0,.75),inset -1px -1px rgba(255,255,255,.07)}
    html.domistika-16bit-console .primary-button{color:#07110f;border-color:#19f0c2;background:linear-gradient(#4ff2d1,#00a886);box-shadow:inset 1px 1px #baffef,inset -2px -2px #006d59,1px 1px #000;text-shadow:1px 1px rgba(255,255,255,.26)}
    html.domistika-16bit-console .retro-theme-toggle{color:#f5c542;border-color:#8b5cf6;background:linear-gradient(#33216a,#17113d)}

    html.domistika-16bit-console .workspace{background:#050910}
    html.domistika-16bit-console .tool-rail,
    html.domistika-16bit-console .inspector{border-color:#26355f;background:linear-gradient(90deg,#080d1a,#0b1120);box-shadow:inset 0 0 0 2px #050910,inset 0 0 0 3px rgba(0,212,170,.11)}
    html.domistika-16bit-console .tool-button,
    html.domistika-16bit-console .handed-button{color:#8fa6cc;border-color:transparent;background:transparent;box-shadow:none}
    html.domistika-16bit-console .tool-button:hover{color:#7dd3fc;border-color:#26355f;background:#121b3a}
    html.domistika-16bit-console .tool-button.active,
    html.domistika-16bit-console .handed-button.active{color:#fff;border-color:#00d4aa;background:linear-gradient(90deg,#172249,#121b3a);box-shadow:inset 4px 0 #8b5cf6,0 0 10px rgba(0,212,170,.22)}
    html.domistika-16bit-console .lefty-mode .tool-button.active{box-shadow:inset -4px 0 #8b5cf6,0 0 10px rgba(0,212,170,.22)}

    html.domistika-16bit-console .center-stage{padding:7px;background:linear-gradient(135deg,#0b1120,#050910);box-shadow:inset 0 0 0 2px #121a2f}
    html.domistika-16bit-console .control-deck{margin-bottom:7px;color:#dce8ff;border:2px solid #26355f;border-radius:5px;background:linear-gradient(#121b3a,#090e1b);box-shadow:inset 1px 1px rgba(255,255,255,.09),inset -2px -2px #02040a,0 3px #02040a}
    html.domistika-16bit-console .control-deck label{color:#7085a8;text-transform:uppercase;letter-spacing:.06em}
    html.domistika-16bit-console .control-deck output{color:#f5c542}
    html.domistika-16bit-console .color-control{border-color:#344777;background:#050910;box-shadow:inset 2px 2px #02040a}
    html.domistika-16bit-console .select-control select,
    html.domistika-16bit-console .layer-properties select,
    html.domistika-16bit-console input[type="number"]{color:#e2e8f0;border-color:#344777;background:#080d1a}
    html.domistika-16bit-console input[type="range"]{accent-color:#00d4aa}

    html.domistika-16bit-console .viewport{border:10px solid #121a2f;border-radius:7px;background:#02040a;box-shadow:inset 0 0 0 2px #00d4aa,inset 0 0 0 5px #050910,inset 0 0 35px rgba(0,0,0,.82),0 4px 0 #000,0 0 28px rgba(139,92,246,.18)}
    html.domistika-16bit-console .viewport::before{content:"";position:absolute;inset:4px;z-index:1100;pointer-events:none;border:1px solid rgba(125,211,252,.12);background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(6,182,212,.025) 3px 4px)}
    html.domistika-16bit-console .artboard{box-shadow:0 0 0 2px #02040a,0 12px 45px rgba(0,0,0,.8)}
    html.domistika-16bit-console .zoom-dock,
    html.domistika-16bit-console .canvas-navigator{border:1px solid #344777;border-radius:4px;background:#090e1b;box-shadow:inset 1px 1px rgba(255,255,255,.08),inset -2px -2px #02040a,0 2px #000}
    html.domistika-16bit-console .zoom-dock span{color:#00d4aa}

    html.domistika-16bit-console .inspector{color:#dce8ff}
    html.domistika-16bit-console .inspector-tabs button.active{color:#f5c542;border-color:#8b5cf6;background:#172249}
    html.domistika-16bit-console .inspector-panel{color:#dce8ff;background:#090e1b}
    html.domistika-16bit-console .panel-heading h2{color:#fff;text-transform:uppercase;letter-spacing:.08em}
    html.domistika-16bit-console .panel-heading p,
    html.domistika-16bit-console .reference-tip{color:#7085a8}
    html.domistika-16bit-console .layer-row{border-color:#1d2a4b;background:#0b1120}
    html.domistika-16bit-console .layer-row.active{border-color:#00d4aa;background:#121b3a;box-shadow:inset 3px 0 #8b5cf6}
    html.domistika-16bit-console .layer-name{color:#e2e8f0}

    html.domistika-16bit-console .studio-wheel-host{border-color:#26355f!important;background:#080d1a!important}
    html.domistika-16bit-console .studio-wheel-toggle{border-color:#00d4aa!important;color:#e2e8f0!important;background:linear-gradient(#172249,#090e1b)!important;box-shadow:inset 1px 1px rgba(255,255,255,.1),inset -2px -2px #02040a!important}
    html.domistika-16bit-console .studio-wheel-toggle small{color:#00d4aa!important}
    html.domistika-16bit-console .studio-wheel-toggle-icon{border-radius:4px!important;background:linear-gradient(135deg,#8b5cf6,#00d4aa)!important}
    html.domistika-16bit-console .studio-wheel-popover{border-color:#00d4aa!important;background:radial-gradient(circle,#172249,#090e1b 58%,#050910)!important;box-shadow:0 0 30px rgba(0,212,170,.22)!important}
    html.domistika-16bit-console .studio-wheel-item{border-radius:4px!important;border-color:#344777!important;color:#dce8ff!important;background:linear-gradient(#172249,#0b1120)!important;box-shadow:inset 1px 1px rgba(255,255,255,.08),inset -2px -2px #02040a!important}
    html.domistika-16bit-console .studio-wheel-item:hover{border-color:#00d4aa!important;color:#fff!important}
    html.domistika-16bit-console .studio-wheel-hub{border-radius:5px!important;color:#f5c542!important;border-color:#8b5cf6!important;background:#090e1b!important}

    html.domistika-16bit-console .tika-panel{color:#e2e8f0!important;background:#090e1b!important;border-color:#344777!important}
    html.domistika-16bit-console .tika-head{border-color:#26355f;background:linear-gradient(#172249,#0b1120)}
    html.domistika-16bit-console .tika-title p,
    html.domistika-16bit-console .tika-context,
    html.domistika-16bit-console .tika-section small{color:#7085a8}
    html.domistika-16bit-console .tika-goal input,
    html.domistika-16bit-console .tika-ask-input{color:#e2e8f0;border-color:#344777;background:#050910}
    html.domistika-16bit-console .tika-card,
    html.domistika-16bit-console .tika-answer,
    html.domistika-16bit-console .tika-receipt,
    html.domistika-16bit-console .tika-guide{border-color:#26355f;background:#0b1120}
    html.domistika-16bit-console .tika-orb{color:#fff;border:2px solid #00d4aa;border-radius:5px;background:linear-gradient(135deg,#8b5cf6,#172249);box-shadow:inset 1px 1px rgba(255,255,255,.18),inset -2px -2px #050910,0 0 14px rgba(0,212,170,.38)}

    html.domistika-16bit-console .statusbar{color:#7dd3fc;border-color:#26355f;background:#080d1a;box-shadow:inset 0 2px #121a2f}
    html.domistika-16bit-console .statusbar #statusMessage{text-shadow:0 0 7px rgba(125,211,252,.32)}
    html.domistika-16bit-console .studio-dialog{color:#e2e8f0;border:2px solid #00d4aa;border-radius:5px;background:#090e1b;box-shadow:inset 0 0 0 2px #121a2f,0 25px 90px rgba(0,0,0,.8)}
    html.domistika-16bit-console .studio-dialog input:not([type=checkbox]),
    html.domistika-16bit-console .studio-dialog select{color:#e2e8f0;border-color:#344777;background:#050910}

    @media(max-width:1000px){html.domistika-16bit-console .retro-console-label{display:none!important}}
    @media(prefers-reduced-motion:reduce){html.domistika-16bit-console button:active{transform:none}}
  `;
  document.head.appendChild(style);
}

function readTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (THEMES.includes(saved)) return saved;
  } catch {}
  return document.documentElement.classList.contains('domistika-retro-basement')
    ? 'grandmas-basement'
    : 'night-studio';
}

function writeTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}

function themePresentation(theme) {
  if (theme === 'grandmas-basement') return { icon: '📺', label: 'Basement', color: '#4e2a19', console: 'BasementVision<br>Color Creative Console' };
  if (theme === '16-bit-console') return { icon: '🕹️', label: '16-Bit', color: '#050910', console: 'Domistika 16-Bit<br>Creative Workstation' };
  return { icon: '🌙', label: 'Night', color: '#151218', console: 'Domistika Studio<br>Modern Night System' };
}

function applyTheme(theme, button) {
  const root = document.documentElement;
  root.classList.remove('domistika-retro-basement', 'domistika-16bit-console');
  if (theme === 'grandmas-basement') root.classList.add('domistika-retro-basement');
  if (theme === '16-bit-console') root.classList.add('domistika-16bit-console');
  root.dataset.domistikaTheme = theme;

  const view = themePresentation(theme);
  if (button) {
    button.innerHTML = `<span>${view.icon}</span><span>${view.label}</span>`;
    button.title = `Current style: ${view.label}. Click to cycle visual styles.`;
    button.setAttribute('aria-label', button.title);
    button.dataset.theme = theme;
  }
  const label = document.querySelector('.retro-console-label');
  if (label) label.innerHTML = view.console;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = view.color;
  writeTheme(theme);
  window.dispatchEvent(new CustomEvent('domistika:v093-theme', { detail: { theme } }));
}

function init() {
  const oldButton = document.querySelector('#retroThemeToggle');
  if (!oldButton) return false;
  if (oldButton.dataset.v093Cycle === 'true') return true;
  addStyles();

  const button = oldButton.cloneNode(true);
  button.dataset.v093Cycle = 'true';
  oldButton.replaceWith(button);
  let theme = readTheme();
  applyTheme(theme, button);
  button.addEventListener('click', () => {
    const index = THEMES.indexOf(theme);
    theme = THEMES[(index + 1) % THEMES.length];
    applyTheme(theme, button);
  });
  window.domistikaThemeV093 = {
    set: (nextTheme) => {
      if (!THEMES.includes(nextTheme)) return false;
      theme = nextTheme;
      applyTheme(theme, button);
      return true;
    },
    get: () => theme,
    themes: [...THEMES],
  };
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 720) return;
  requestAnimationFrame(() => wait(attempt + 1));
}

wait();
