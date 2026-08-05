const THEME_KEY = 'domistika-v091-retro-basement';

function addStyles() {
  if (document.querySelector('#domistikaV091RetroStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV091RetroStyles';
  style.textContent = `
    .tika-orb{left:16px!important;right:auto!important;bottom:18px!important}
    .retro-theme-toggle{display:flex;align-items:center;gap:6px;white-space:nowrap}
    .retro-console-label{display:none;margin-left:8px;padding:4px 8px;border:1px solid rgba(255,227,165,.28);border-radius:4px;color:#f2d994;background:rgba(34,17,9,.28);font:800 8px/1.1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.13em;text-transform:uppercase;box-shadow:inset 0 0 0 1px rgba(0,0,0,.24)}

    html.domistika-retro-basement{background:#28160e}
    html.domistika-retro-basement body{color:#2d2115;background:#28160e}
    html.domistika-retro-basement .studio{
      --panel:#cdbc91;--panel2:#b4a175;--panel3:#d9c89d;--line:rgba(67,40,20,.34);--muted:#6f5b3f;--ink:#2e2114;--warm:#d96f2d;--violet:#75843a;
      color:#2e2114;
      font-family:"Trebuchet MS","Arial Rounded MT Bold",Arial,sans-serif;
      background:
        radial-gradient(circle at 45% 8%,rgba(255,229,168,.13),transparent 28%),
        repeating-linear-gradient(92deg,rgba(255,255,255,.025) 0 2px,rgba(0,0,0,.04) 3px 5px),
        linear-gradient(135deg,#4e2a19,#2c170f 52%,#442516);
    }
    html.domistika-retro-basement .topbar{
      color:#f5e1b7;
      border-bottom:3px solid #17100b;
      background:
        repeating-linear-gradient(7deg,rgba(255,255,255,.035) 0 1px,transparent 1px 6px),
        repeating-linear-gradient(92deg,#633821 0 13px,#5a301d 13px 28px,#704229 28px 42px);
      box-shadow:inset 0 -2px 0 #bb823d,0 4px 16px rgba(0,0,0,.48);
      backdrop-filter:none;
    }
    html.domistika-retro-basement .brand-mark{
      color:#2b160b;border:2px solid #1d120b;border-radius:50%;
      background:radial-gradient(circle at 36% 30%,#f6d782 0,#d69a37 42%,#8a4a22 70%,#31170c 100%);
      box-shadow:inset 0 0 0 3px rgba(255,239,183,.25),0 4px 0 #1c1009,0 8px 16px rgba(0,0,0,.36);
      text-shadow:0 1px 0 rgba(255,255,255,.35);
    }
    html.domistika-retro-basement .brand-block h1{color:#fff0c8;text-shadow:0 2px 0 #27140b;letter-spacing:.02em}
    html.domistika-retro-basement .brand-block p{color:#e1bd70}
    html.domistika-retro-basement .retro-console-label{display:block}
    html.domistika-retro-basement .project-strip input{color:#ffeec5;border-color:rgba(255,225,158,.12);background:rgba(23,13,8,.25);box-shadow:inset 0 2px 5px rgba(0,0,0,.35)}
    html.domistika-retro-basement .project-strip input:focus{color:#fff4d8;background:rgba(28,15,9,.5)}
    html.domistika-retro-basement .save-state{color:#c9df75;text-shadow:0 0 7px rgba(170,210,74,.28)}

    html.domistika-retro-basement button,
    html.domistika-retro-basement .soft-button,
    html.domistika-retro-basement .toggle-button,
    html.domistika-retro-basement .statusbar button,
    html.domistika-retro-basement .zoom-dock button{
      border-color:#5c4228;color:#2c2015;
      background:linear-gradient(#e1d0a6,#af986c);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.62),0 2px 0 #5a4028,0 3px 7px rgba(0,0,0,.24);
      text-shadow:0 1px 0 rgba(255,255,255,.35);
    }
    html.domistika-retro-basement button:hover{filter:brightness(1.06);background:linear-gradient(#eadcb7,#bca879)}
    html.domistika-retro-basement button:active{transform:translateY(1px);box-shadow:inset 0 2px 4px rgba(64,38,18,.32),0 1px 0 #513821}
    html.domistika-retro-basement .primary-button{color:#2c180c;border-color:#6c3518;background:linear-gradient(#ef9a49,#c75d25);box-shadow:inset 0 1px 0 #ffd6a4,0 2px 0 #703417,0 4px 9px rgba(0,0,0,.28)}
    html.domistika-retro-basement .retro-theme-toggle[aria-pressed="true"]{color:#fff1be;border-color:#d59b43;background:linear-gradient(#846027,#533519);text-shadow:0 1px 0 #241208}

    html.domistika-retro-basement .workspace{background:#372015}
    html.domistika-retro-basement .tool-rail,
    html.domistika-retro-basement .inspector{
      background:
        repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 2px,rgba(0,0,0,.03) 3px 5px),
        linear-gradient(180deg,#5d3723,#3b2116);
      border-color:#1e120c;
      box-shadow:inset 0 0 0 2px rgba(205,146,69,.22);
    }
    html.domistika-retro-basement .tool-button,
    html.domistika-retro-basement .handed-button{color:#ead7aa;border-color:rgba(222,178,103,.11);background:rgba(26,15,9,.24);box-shadow:none;text-shadow:0 1px 0 #160c07}
    html.domistika-retro-basement .tool-button:hover,
    html.domistika-retro-basement .tool-button.active,
    html.domistika-retro-basement .handed-button.active{color:#fff0bd;border-color:#d3923f;background:linear-gradient(135deg,rgba(213,115,44,.48),rgba(115,134,52,.43));box-shadow:inset 0 0 0 1px rgba(255,234,180,.14),0 3px 8px rgba(0,0,0,.28)}
    html.domistika-retro-basement .tool-button.active{box-shadow:inset 4px 0 0 #e5a546,0 3px 8px rgba(0,0,0,.28)}
    html.domistika-retro-basement .lefty-mode .tool-button.active{box-shadow:inset -4px 0 0 #e5a546,0 3px 8px rgba(0,0,0,.28)}

    html.domistika-retro-basement .center-stage{padding:8px;background:
      repeating-linear-gradient(92deg,#512d1c 0 15px,#603823 15px 30px,#472718 30px 46px);
      box-shadow:inset 0 0 0 2px #21130c;
    }
    html.domistika-retro-basement .control-deck{
      margin-bottom:7px;border:2px solid #2c1c11;border-radius:13px;
      color:#322515;background:
        linear-gradient(rgba(255,255,255,.16),transparent 25%),
        repeating-linear-gradient(90deg,rgba(75,55,29,.055) 0 1px,transparent 1px 4px),
        linear-gradient(#d7c595,#ae9868);
      box-shadow:inset 0 0 0 2px rgba(255,246,211,.3),0 3px 0 #2b1a10,0 7px 14px rgba(0,0,0,.3);
    }
    html.domistika-retro-basement .control-deck label{color:#675235}
    html.domistika-retro-basement .control-deck output{color:#2c1d11;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    html.domistika-retro-basement .color-control{border-color:#705338;background:#e1d3ad;box-shadow:inset 0 2px 3px rgba(72,45,22,.2)}
    html.domistika-retro-basement .select-control select,
    html.domistika-retro-basement .layer-properties select{color:#2b2015;border-color:#75593c;background:#d9cba6}

    html.domistika-retro-basement .viewport{
      border:13px solid #432719;border-radius:26px;
      background-color:#283126;
      background-image:radial-gradient(circle at 50% 45%,#3d4936 0,#20291f 68%,#141b14 100%);
      box-shadow:inset 0 0 0 3px #bd843f,inset 0 0 0 7px #17100b,inset 0 0 44px rgba(0,0,0,.72),0 5px 0 #1d110b,0 12px 28px rgba(0,0,0,.48);
    }
    html.domistika-retro-basement .viewport::before{content:"";position:absolute;inset:0;z-index:1100;pointer-events:none;border-radius:10px;background:repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,rgba(15,12,8,.045) 1px 3px);mix-blend-mode:multiply;opacity:.52}
    html.domistika-retro-basement .viewport::after{content:"";position:absolute;inset:1px;z-index:1101;pointer-events:none;border-radius:10px;background:radial-gradient(ellipse at 47% 38%,transparent 55%,rgba(10,9,6,.22) 92%),linear-gradient(118deg,rgba(255,255,255,.09),transparent 24%);box-shadow:inset 0 0 36px rgba(7,8,5,.45)}
    html.domistika-retro-basement .artboard{box-shadow:0 18px 55px rgba(0,0,0,.52),0 0 0 2px #20150e;border-radius:4px}
    html.domistika-retro-basement .zoom-dock,
    html.domistika-retro-basement .canvas-navigator{border-color:#49321f;background:linear-gradient(#d6c49a,#9d875d);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 3px 0 #352316,0 8px 16px rgba(0,0,0,.34)}
    html.domistika-retro-basement .zoom-dock span{color:#4d3a24;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800}
    html.domistika-retro-basement .canvas-nav-button{border-color:#5e442b;color:#2d2115;background:linear-gradient(#eadcb8,#ad976c)}
    html.domistika-retro-basement .canvas-nav-center{color:#9a431d}

    html.domistika-retro-basement .inspector{color:#f0dba8}
    html.domistika-retro-basement .inspector-panel{color:#2e2114;background:linear-gradient(180deg,#d6c59b,#bca77b)}
    html.domistika-retro-basement .panel-heading h2{font-family:Georgia,serif;letter-spacing:.01em}
    html.domistika-retro-basement .panel-heading p,
    html.domistika-retro-basement .reference-tip{color:#6a5437}
    html.domistika-retro-basement .layer-row{background:rgba(255,248,221,.24)}
    html.domistika-retro-basement .layer-row.active{border-color:#a95725;background:rgba(218,111,43,.18)}
    html.domistika-retro-basement .layer-name{color:#2b2015}
    html.domistika-retro-basement .studio-wheel-host{border-color:#21130c!important;background:repeating-linear-gradient(90deg,#5b3420 0 15px,#4a291a 15px 31px)!important}
    html.domistika-retro-basement .studio-wheel-toggle{border-color:#bf8138!important;color:#f6e4b7!important;background:linear-gradient(135deg,#6f4428,#49301e)!important;box-shadow:inset 0 1px 0 rgba(255,236,188,.2),0 3px 0 #20130c!important}
    html.domistika-retro-basement .studio-wheel-toggle small{color:#d7b779!important}
    html.domistika-retro-basement .studio-wheel-toggle-icon{background:radial-gradient(circle at 35% 30%,#f6dc8d,#d89a38 36%,#7a3f1d 75%,#261209)!important}
    html.domistika-retro-basement .studio-wheel-popover{border-color:#b77a35!important;background:radial-gradient(circle at 50% 50%,#b7a174,#72513a 45%,#2f1c12 80%)!important}
    html.domistika-retro-basement .studio-wheel-item{border-color:#8e6339!important;color:#342315!important;background:linear-gradient(#e0cda2,#9c8056)!important}
    html.domistika-retro-basement .studio-wheel-hub{color:#f8dda0!important;border-color:#dc9c43!important;background:radial-gradient(circle,#8d5d2d,#3b2214 74%)!important}

    html.domistika-retro-basement .tika-panel{background:#c7b584!important}
    html.domistika-retro-basement .tika-head{border-color:#766044;background:linear-gradient(155deg,#e0cf9e,#ab9567)}
    html.domistika-retro-basement .tika-title h2{font-family:Georgia,serif}
    html.domistika-retro-basement .tika-title p,
    html.domistika-retro-basement .tika-context,
    html.domistika-retro-basement .tika-section small{color:#6c583b}
    html.domistika-retro-basement .tika-goal input,
    html.domistika-retro-basement .tika-ask-input{color:#2b2015;border-color:#766044;background:#e7d8ae}
    html.domistika-retro-basement .tika-card,
    html.domistika-retro-basement .tika-answer,
    html.domistika-retro-basement .tika-receipt,
    html.domistika-retro-basement .tika-guide{border-color:rgba(72,48,27,.22);background:rgba(255,249,223,.28)}
    html.domistika-retro-basement .tika-answer p,
    html.domistika-retro-basement .tika-card p{color:#655137}
    html.domistika-retro-basement .tika-orb{color:#2a160b;border:3px solid #2b190e;background:radial-gradient(circle at 35% 30%,#f7dfa0 0,#d9a33c 35%,#7a4a27 70%,#2c170d 100%);box-shadow:inset 0 0 0 2px rgba(255,239,183,.24),0 4px 0 #1b1009,0 9px 18px rgba(0,0,0,.42)}

    html.domistika-retro-basement .statusbar{color:#e7c671;border-color:#17100b;background:repeating-linear-gradient(90deg,#4c2a1b 0 16px,#3a2116 16px 31px);box-shadow:inset 0 2px 0 rgba(217,153,68,.25)}
    html.domistika-retro-basement .statusbar #statusMessage{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;text-shadow:0 0 7px rgba(232,180,71,.28)}
    html.domistika-retro-basement .studio-dialog{color:#2f2215;border:3px solid #3c2517;background:#cdbb8e;box-shadow:inset 0 0 0 2px #efdcae,0 25px 90px rgba(0,0,0,.68)}
    html.domistika-retro-basement .studio-dialog input:not([type=checkbox]),
    html.domistika-retro-basement .studio-dialog select{color:#2d2115;border-color:#785d3e;background:#e4d4aa}

    @media(max-width:1000px){html.domistika-retro-basement .retro-console-label{display:none}}
    @media(max-width:680px){.tika-orb{left:9px!important;bottom:10px!important}html.domistika-retro-basement .center-stage{padding:5px}html.domistika-retro-basement .viewport{border-width:8px;border-radius:17px}}
    @media(prefers-reduced-motion:reduce){html.domistika-retro-basement button:active{transform:none}}
  `;
  document.head.appendChild(style);
}

function readEnabled() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

function writeEnabled(enabled) {
  try { localStorage.setItem(THEME_KEY, String(enabled)); } catch {}
}

function applyTheme(enabled, button) {
  document.documentElement.classList.toggle('domistika-retro-basement', enabled);
  document.documentElement.dataset.domistikaTheme = enabled ? 'grandmas-basement' : 'night-studio';
  if (button) {
    button.setAttribute('aria-pressed', String(enabled));
    button.innerHTML = enabled ? '<span>📺</span><span>Basement</span>' : '<span>🌙</span><span>Night</span>';
    button.title = enabled ? 'Switch to the modern night studio' : "Switch to Grandma's Basement";
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = enabled ? '#4e2a19' : '#151218';
  writeEnabled(enabled);
  window.dispatchEvent(new CustomEvent('domistika:v091-theme', { detail: { theme: enabled ? 'grandmas-basement' : 'night-studio' } }));
}

function init() {
  const topActions = document.querySelector('.top-actions');
  const brand = document.querySelector('.brand-block');
  if (!topActions || !brand) return false;
  if (document.querySelector('#retroThemeToggle')) return true;
  addStyles();

  const label = document.createElement('span');
  label.className = 'retro-console-label';
  label.innerHTML = 'BasementVision<br>Color Creative Console';
  brand.appendChild(label);

  const button = document.createElement('button');
  button.id = 'retroThemeToggle';
  button.type = 'button';
  button.className = 'soft-button retro-theme-toggle';
  topActions.insertBefore(button, topActions.firstChild);
  let enabled = readEnabled();
  applyTheme(enabled, button);
  button.addEventListener('click', () => {
    enabled = !enabled;
    applyTheme(enabled, button);
  });
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 480) return;
  requestAnimationFrame(() => wait(attempt + 1));
}

wait();
