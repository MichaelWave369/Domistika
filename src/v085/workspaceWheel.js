const ICONS = [
  ['brush', '🖌'], ['layer', '◫'], ['3d', '◩'], ['artist', '✦'], ['studio', '✦'],
  ['transform', '⌖'], ['mask', '✣'], ['spiro assist', '✺'], ['spiro', '◎'], ['effect', '✧'],
];
const iconFor = (label) => ICONS.find(([key]) => label.toLowerCase().includes(key))?.[1] || '◆';

function addStyles() {
  if (document.querySelector('#domistikaV085WorkspaceStyles')) return;
  const style = document.createElement('style');
  style.id = 'domistikaV085WorkspaceStyles';
  style.textContent = `
    .studio{--pro-cyan:#66d8ff;--pro-gold:#ffc56e}.inspector{position:relative;overflow:visible}
    .inspector-tabs.wheel-source-tabs{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip-path:inset(50%)!important;opacity:0!important;pointer-events:none!important}
    .studio-wheel-host{position:relative;z-index:42;padding:9px 10px;border-bottom:1px solid var(--line);background:linear-gradient(180deg,rgba(28,22,34,.99),rgba(19,16,23,.97))}
    .studio-wheel-toggle{width:100%;height:46px;display:grid;grid-template-columns:36px minmax(0,1fr) 22px;align-items:center;gap:8px;padding:5px 8px;border:1px solid rgba(255,197,110,.24);border-radius:14px;color:var(--ink);background:linear-gradient(135deg,rgba(255,197,110,.1),rgba(102,216,255,.07));cursor:pointer;text-align:left;box-shadow:0 10px 28px rgba(0,0,0,.18)}
    .studio-wheel-toggle:hover{border-color:rgba(102,216,255,.42);background:linear-gradient(135deg,rgba(255,197,110,.14),rgba(102,216,255,.12))}
    .studio-wheel-toggle-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;font-size:18px;background:radial-gradient(circle at 35% 30%,#fff4c9 0,#ffc56e 24%,#a164ff 66%,#23192d 100%);color:#161019;box-shadow:0 0 20px rgba(255,197,110,.22)}
    .studio-wheel-toggle-copy{min-width:0}.studio-wheel-toggle-copy strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.studio-wheel-toggle-copy small{display:block;margin-top:1px;color:var(--muted);font-size:8px;letter-spacing:.12em;text-transform:uppercase}
    .studio-wheel-chevron{display:grid;place-items:center;color:var(--muted);transition:transform .28s ease}.inspector.wheel-open .studio-wheel-chevron{transform:rotate(180deg)}
    .studio-wheel-popover{position:absolute;left:8px;right:8px;top:66px;height:286px;z-index:80;opacity:0;visibility:hidden;transform:translateY(-10px) scale(.94);transition:opacity .22s ease,transform .26s cubic-bezier(.2,.8,.2,1),visibility .22s;background:radial-gradient(circle at 50% 50%,rgba(55,43,67,.98),rgba(17,14,21,.99) 69%);border:1px solid rgba(102,216,255,.24);border-radius:24px;box-shadow:0 24px 70px rgba(0,0,0,.58),inset 0 0 60px rgba(141,108,255,.08);overflow:hidden}
    .studio-wheel-popover::before,.studio-wheel-popover::after{content:"";position:absolute;inset:35px;border:1px solid rgba(255,255,255,.07);border-radius:50%;pointer-events:none}.studio-wheel-popover::after{inset:75px;border-color:rgba(255,197,110,.13)}
    .inspector.wheel-open .studio-wheel-popover{opacity:1;visibility:visible;transform:translateY(0) scale(1)}
    .studio-wheel-hub{position:absolute;left:50%;top:50%;width:78px;height:78px;transform:translate(-50%,-50%);display:grid;place-items:center;border:1px solid rgba(255,197,110,.32);border-radius:50%;background:radial-gradient(circle at 35% 30%,#4b3858,#201925 70%);box-shadow:0 0 40px rgba(141,108,255,.3);pointer-events:none}.studio-wheel-hub span{font-size:25px}.studio-wheel-hub small{position:absolute;bottom:12px;font-size:7px;color:var(--muted);letter-spacing:.14em;text-transform:uppercase}
    .studio-wheel-item{--radius:108px;position:absolute;left:50%;top:50%;width:48px;height:48px;margin:-24px;border:1px solid rgba(255,255,255,.13);border-radius:50%;display:grid;place-items:center;padding:0;color:var(--ink);background:linear-gradient(145deg,#2b2332,#17131c);cursor:pointer;transform:rotate(var(--angle)) translateY(calc(var(--radius)*-1)) rotate(calc(var(--angle)*-1)) scale(.72);opacity:0;transition:transform .38s cubic-bezier(.2,.9,.2,1),opacity .24s ease,border-color .2s ease,box-shadow .2s ease;transition-delay:calc(var(--index)*18ms)}
    .inspector.wheel-open .studio-wheel-item{opacity:1;transform:rotate(var(--angle)) translateY(calc(var(--radius)*-1)) rotate(calc(var(--angle)*-1)) scale(1)}.studio-wheel-item:hover,.studio-wheel-item.active{border-color:rgba(255,197,110,.72);box-shadow:0 0 22px rgba(255,197,110,.22);background:linear-gradient(145deg,rgba(255,197,110,.2),rgba(102,216,255,.13))}.studio-wheel-item span{font-size:18px}.studio-wheel-item em{position:absolute;top:51px;left:50%;transform:translateX(-50%);max-width:90px;padding:3px 6px;border:1px solid rgba(255,255,255,.1);border-radius:999px;color:#eee5f2;background:rgba(15,12,18,.94);font-style:normal;font-size:7px;white-space:nowrap;opacity:0;pointer-events:none}.studio-wheel-item:hover em,.studio-wheel-item:focus-visible em{opacity:1}
    .studio-wheel-backdrop{position:absolute;left:0;right:0;top:66px;height:calc(100vh - 168px);z-index:70;display:none;background:rgba(4,3,6,.46);backdrop-filter:blur(2px)}.inspector.wheel-open .studio-wheel-backdrop{display:block}
    .control-deck{min-height:62px!important;max-height:94px!important;display:flex!important;flex-wrap:wrap!important;align-content:center!important;align-items:center!important;gap:5px 7px!important;padding:6px 8px!important;overflow:hidden!important;scrollbar-width:none}.control-deck::-webkit-scrollbar{display:none}.control-deck label{font-size:8px!important;gap:1px 5px!important}.control-deck label input[type=range]{width:78px!important;height:12px}.control-deck output{font-size:8px}.control-deck button{min-height:30px;padding:6px 8px!important;font-size:9px!important;border-radius:9px!important}.control-deck .color-control{padding:4px 7px!important}.control-deck .color-control input{width:24px!important;height:24px!important}.control-deck .color-control span{display:none}.control-deck .select-control select{max-width:138px;padding:5px!important;font-size:9px}.control-deck [class*="launch"],.control-deck [id$="Button"]{gap:4px!important;white-space:nowrap}.control-deck [class*="launch"] span{font-size:13px!important}.control-deck .brush-open-button{padding:5px 8px!important}.control-deck .brush-open-button strong{font-size:9px!important}.topbar{gap:10px!important}.top-actions{gap:5px!important}.top-actions button{padding:7px 10px!important}.project-strip input{padding:6px 8px!important}
    .pattern-mode-badge{position:absolute;right:14px;top:12px;z-index:12;display:none;padding:5px 8px;border:1px solid rgba(102,216,255,.28);border-radius:999px;color:#cbefff;background:rgba(14,18,23,.82);backdrop-filter:blur(8px);font-size:8px;pointer-events:none}.pattern-mode-badge.visible{display:block}
    @media(max-width:1000px){.studio-wheel-host{display:none}.inspector-tabs.wheel-source-tabs{position:static!important;width:auto!important;height:auto!important;overflow:visible!important;clip-path:none!important;opacity:1!important;pointer-events:auto!important}.control-deck{flex-wrap:nowrap!important;max-height:none!important;overflow-x:auto!important}}
    @media(prefers-reduced-motion:reduce){.studio-wheel-popover,.studio-wheel-item,.studio-wheel-chevron{transition:none!important}}
  `;
  document.head.appendChild(style);
}

function init() {
  const studio = document.querySelector('#studio');
  const inspector = document.querySelector('.inspector');
  const tabs = inspector?.querySelector('.inspector-tabs');
  const viewport = document.querySelector('#viewport');
  if (!studio || !inspector || !tabs || !viewport) return false;
  if (inspector.querySelector('.studio-wheel-host')) return true;
  addStyles();
  tabs.classList.add('wheel-source-tabs');

  const host = document.createElement('div');
  host.className = 'studio-wheel-host';
  host.innerHTML = `<button type="button" class="studio-wheel-toggle" aria-expanded="false"><span class="studio-wheel-toggle-icon">◆</span><span class="studio-wheel-toggle-copy"><strong>Workspace</strong><small>Open tool wheel · Q</small></span><span class="studio-wheel-chevron">⌄</span></button><div class="studio-wheel-popover" role="menu"><div class="studio-wheel-hub"><span>✦</span><small>Domistika</small></div></div><div class="studio-wheel-backdrop"></div>`;
  inspector.insertBefore(host, tabs);
  const toggle = host.querySelector('.studio-wheel-toggle');
  const popover = host.querySelector('.studio-wheel-popover');
  const backdrop = host.querySelector('.studio-wheel-backdrop');
  const title = host.querySelector('.studio-wheel-toggle-copy strong');
  const titleIcon = host.querySelector('.studio-wheel-toggle-icon');

  const close = () => { inspector.classList.remove('wheel-open'); toggle.setAttribute('aria-expanded', 'false'); };
  const open = () => { inspector.classList.add('wheel-open'); toggle.setAttribute('aria-expanded', 'true'); };
  toggle.addEventListener('click', () => inspector.classList.contains('wheel-open') ? close() : open());
  backdrop.addEventListener('click', close);

  function rebuild() {
    const buttons = [...tabs.querySelectorAll('button[data-panel]')];
    popover.querySelectorAll('.studio-wheel-item').forEach((node) => node.remove());
    const active = buttons.find((button) => button.classList.contains('active')) || buttons[0];
    if (active) { title.textContent = active.textContent.trim(); titleIcon.textContent = iconFor(active.textContent); }
    buttons.forEach((source, index) => {
      const label = source.textContent.trim();
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `studio-wheel-item ${source.classList.contains('active') ? 'active' : ''}`;
      item.style.setProperty('--angle', `${index * 360 / Math.max(1, buttons.length)}deg`);
      item.style.setProperty('--index', String(index));
      item.innerHTML = `<span>${iconFor(label)}</span><em>${label}</em>`;
      item.setAttribute('aria-label', `Open ${label}`);
      item.addEventListener('click', () => { source.click(); title.textContent = label; titleIcon.textContent = iconFor(label); close(); requestAnimationFrame(rebuild); });
      popover.appendChild(item);
    });
  }
  rebuild();
  new MutationObserver(rebuild).observe(tabs, { childList: true });
  new MutationObserver(() => requestAnimationFrame(rebuild)).observe(tabs, { subtree: true, attributes: true, attributeFilter: ['class'] });
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input,select,textarea')) return;
    if (event.key.toLowerCase() === 'q' && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); inspector.classList.contains('wheel-open') ? close() : open(); }
    if (event.key === 'Escape') close();
  });

  const badge = document.createElement('div');
  badge.className = 'pattern-mode-badge';
  viewport.appendChild(badge);
  document.querySelector('#symmetryInput')?.addEventListener('change', (event) => {
    const label = event.target.selectedOptions[0]?.textContent || 'Off';
    const visible = event.target.value !== 'none';
    badge.textContent = `Pattern · ${label}`;
    badge.classList.toggle('visible', visible);
  });
  return true;
}

function wait(attempt = 0) {
  if (init() || attempt > 360) return;
  requestAnimationFrame(() => wait(attempt + 1));
}
wait();
