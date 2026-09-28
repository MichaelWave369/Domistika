const VERSION = '0.9.24';
const SCHEMA = 'domistika.color-studio.v1';
const INSTALL_FLAG = '__domistikaColorStudioV0924Installed';
const RECENT_KEY = 'domistika-v0924-recent-colors';
const MAX_RECENTS = 18;

const CSS_COLORS = Object.freeze([
  ['Black','#000000'],['White','#ffffff'],['Slate','#708090'],['Silver','#c0c0c0'],
  ['Crimson','#dc143c'],['Tomato','#ff6347'],['Coral','#ff7f50'],['Orange','#ffa500'],
  ['Gold','#ffd700'],['Khaki','#f0e68c'],['Lime','#00ff00'],['Forest','#228b22'],
  ['Teal','#008080'],['Cyan','#00ffff'],['Sky','#87ceeb'],['Dodger Blue','#1e90ff'],
  ['Navy','#000080'],['Indigo','#4b0082'],['Violet','#ee82ee'],['Orchid','#da70d6'],
  ['Hot Pink','#ff69b4'],['Chocolate','#d2691e'],['Sienna','#a0522d'],['Beige','#f5f5dc']
]);

const GRADIENTS = Object.freeze([
  {id:'sunset',name:'Sunset',type:'linear',angle:20,stops:[['#ff512f',0],['#f09819',0.5],['#8a2387',1]]},
  {id:'aurora',name:'Aurora',type:'linear',angle:135,stops:[['#00f5a0',0],['#00d9f5',0.48],['#7b2cff',1]]},
  {id:'ocean',name:'Deep Ocean',type:'linear',angle:110,stops:[['#020024',0],['#065a82',0.52],['#00d4ff',1]]},
  {id:'ember',name:'Ember',type:'linear',angle:35,stops:[['#130f0c',0],['#b73a17',0.5],['#ffd166',1]]},
  {id:'rose',name:'Rose Glass',type:'linear',angle:145,stops:[['#3a132f',0],['#d45d9f',0.52],['#ffd6e8',1]]},
  {id:'forest',name:'Forest Light',type:'linear',angle:90,stops:[['#071b12',0],['#18784c',0.5],['#b7e66c',1]]},
  {id:'ultraviolet',name:'Ultraviolet',type:'linear',angle:45,stops:[['#10002b',0],['#5a189a',0.46],['#f72585',1]]},
  {id:'portal-core',name:'Portal Core',type:'radial',stops:[['#fff4b3',0],['#ff7a18',0.24],['#7a29e8',0.62],['#090014',1]]},
  {id:'moon',name:'Moon Glass',type:'radial',stops:[['#ffffff',0],['#a8dadc',0.35],['#457b9d',0.7],['#1d3557',1]]},
  {id:'charcoal',name:'Charcoal',type:'linear',angle:90,stops:[['#f5f5f5',0],['#777777',0.5],['#111111',1]]}
]);

const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const pad=(v)=>Math.round(clamp(Number(v)||0,0,255)).toString(16).padStart(2,'0');

function normalizeHex(value){
  const raw=String(value||'').trim().toLowerCase();
  const short=/^#([0-9a-f]{3})$/.exec(raw);
  if(short) return '#'+Array.from(short[1]).map((c)=>c+c).join('');
  return /^#[0-9a-f]{6}$/.test(raw)?raw:null;
}
function rgbToHex(r,g,b){return '#'+pad(r)+pad(g)+pad(b);}
function hexToRgb(hex){
  const v=normalizeHex(hex); if(!v) return null;
  return {r:parseInt(v.slice(1,3),16),g:parseInt(v.slice(3,5),16),b:parseInt(v.slice(5,7),16)};
}
function rgbToHsl(r,g,b){
  r=clamp(Number(r),0,255)/255; g=clamp(Number(g),0,255)/255; b=clamp(Number(b),0,255)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;
  let h=0,s=0;
  if(d!==0){
    s=d/(1-Math.abs(2*l-1));
    if(max===r) h=60*(((g-b)/d)%6);
    else if(max===g) h=60*((b-r)/d+2);
    else h=60*((r-g)/d+4);
  }
  if(h<0) h+=360;
  return {h:Math.round(h),s:Math.round(s*100),l:Math.round(l*100)};
}
function hslToRgb(h,s,l){
  h=((Number(h)%360)+360)%360; s=clamp(Number(s),0,100)/100; l=clamp(Number(l),0,100)/100;
  const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
  let rp=0,gp=0,bp=0;
  if(h<60){rp=c;gp=x;} else if(h<120){rp=x;gp=c;} else if(h<180){gp=c;bp=x;}
  else if(h<240){gp=x;bp=c;} else if(h<300){rp=x;bp=c;} else {rp=c;bp=x;}
  return {r:Math.round((rp+m)*255),g:Math.round((gp+m)*255),b:Math.round((bp+m)*255)};
}
function hslToHex(h,s,l){const rgb=hslToRgb(h,s,l);return rgbToHex(rgb.r,rgb.g,rgb.b);}
function harmonyColors(hex){
  const rgb=hexToRgb(hex); if(!rgb) return [];
  const hsl=rgbToHsl(rgb.r,rgb.g,rgb.b);
  return [
    {name:'Analog -30',color:hslToHex(hsl.h-30,hsl.s,hsl.l)},
    {name:'Current',color:normalizeHex(hex)},
    {name:'Analog +30',color:hslToHex(hsl.h+30,hsl.s,hsl.l)},
    {name:'Triad',color:hslToHex(hsl.h+120,hsl.s,hsl.l)},
    {name:'Complement',color:hslToHex(hsl.h+180,hsl.s,hsl.l)}
  ];
}
function gradientCss(preset){
  if(!preset) return '';
  const stops=preset.stops.map((stop)=>stop[0]+' '+Math.round(stop[1]*100)+'%').join(', ');
  return preset.type==='radial'
    ? 'radial-gradient(circle at center, '+stops+')'
    : 'linear-gradient('+(Number(preset.angle)||0)+'deg, '+stops+')';
}

let recents=[];
let panel=null;
let selectedGradientId='sunset';

function colorInput(){return document.querySelector('#colorInput');}
function currentColor(){return normalizeHex(colorInput()?.value)||'#1b1820';}
function loadRecents(){
  try{
    const parsed=JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(parsed)?Array.from(new Set(parsed.map(normalizeHex).filter(Boolean))).slice(0,MAX_RECENTS):[];
  }catch{return [];}
}
function saveRecents(){try{localStorage.setItem(RECENT_KEY,JSON.stringify(recents));}catch{}}
function rememberColor(color){
  const value=normalizeHex(color); if(!value) return;
  recents=[value].concat(recents.filter((candidate)=>candidate!==value)).slice(0,MAX_RECENTS);
  saveRecents(); renderRecents();
}
function setColor(color,options={}){
  const value=normalizeHex(color),input=colorInput(); if(!value||!input) return false;
  input.value=value;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
  if(options.remember!==false) rememberColor(value);
  if(options.status!==false){
    const node=document.querySelector('#statusMessage');
    if(node) node.textContent='Drawing color · '+value;
  }
  syncEditor(value); renderHarmony(); return true;
}
function parseCssName(value){
  const name=String(value||'').trim().toLowerCase();
  const match=CSS_COLORS.find((item)=>item[0].toLowerCase()===name);
  return match?match[1]:normalizeHex(name);
}
function activeEngine(){return window.__domistikaEngine||globalThis.domistikaEngine||null;}
function makeCanvasGradient(ctx,preset,width,height){
  if(preset.type==='radial'){
    const radius=Math.hypot(width,height)/2;
    const gradient=ctx.createRadialGradient(width/2,height/2,0,width/2,height/2,radius);
    preset.stops.forEach((stop)=>gradient.addColorStop(stop[1],stop[0]));
    return gradient;
  }
  const angle=(Number(preset.angle)||0)*Math.PI/180,cx=width/2,cy=height/2,half=Math.hypot(width,height)/2;
  const dx=Math.cos(angle)*half,dy=Math.sin(angle)*half;
  const gradient=ctx.createLinearGradient(cx-dx,cy-dy,cx+dx,cy+dy);
  preset.stops.forEach((stop)=>gradient.addColorStop(stop[1],stop[0]));
  return gradient;
}
function applyGradient(id=selectedGradientId,options={}){
  const engine=activeEngine(),preset=GRADIENTS.find((item)=>item.id===id),layer=engine?.activeLayer;
  const mode=options.mode||'behind';
  if(!engine||!layer||!preset) throw new Error('DOMISTIKA_COLOR_GRADIENT_UNAVAILABLE');
  if(!['behind','replace'].includes(mode)) throw new Error('DOMISTIKA_COLOR_GRADIENT_MODE_INVALID');
  engine.captureHistory();
  const ctx=layer.ctx; ctx.save();
  if(mode==='replace') ctx.clearRect(0,0,engine.width,engine.height);
  ctx.globalCompositeOperation=mode==='behind'?'destination-over':'source-over';
  ctx.fillStyle=makeCanvasGradient(ctx,preset,engine.width,engine.height);
  ctx.fillRect(0,0,engine.width,engine.height);
  ctx.restore();
  engine.markChanged('Gradient applied · '+preset.name);
  window.dispatchEvent(new CustomEvent('domistika:gradient-applied',{detail:{version:VERSION,schema:SCHEMA,gradient:preset.id,mode,layerId:layer.id}}));
  const node=document.querySelector('#statusMessage');
  if(node) node.textContent=preset.name+' gradient applied '+(mode==='behind'?'behind existing pixels':'to active layer');
  return {gradient:preset.id,mode,layerId:layer.id};
}

function syncEditor(hex=currentColor()){
  if(!panel) return;
  const rgb=hexToRgb(hex); if(!rgb) return;
  const hsl=rgbToHsl(rgb.r,rgb.g,rgb.b);
  const native=panel.querySelector('#colorStudioNative'),hexInput=panel.querySelector('#colorStudioHex');
  if(native) native.value=hex; if(hexInput) hexInput.value=hex;
  ['r','g','b'].forEach((key)=>{const input=panel.querySelector('#colorStudio'+key.toUpperCase());if(input) input.value=String(rgb[key]);});
  ['h','s','l'].forEach((key)=>{const input=panel.querySelector('#colorStudio'+key.toUpperCase());if(input) input.value=String(hsl[key]);});
  const swatch=panel.querySelector('#colorStudioCurrent');if(swatch) swatch.style.setProperty('--color',hex);
  const label=panel.querySelector('#colorStudioCurrentCode');if(label) label.textContent=hex;
}
function swatchesHtml(items,kind){
  return items.map((item)=>{
    const color=typeof item==='string'?item:item.color,name=typeof item==='string'?item:(item.name||color);
    return '<button type="button" class="color-studio-swatch" data-'+kind+'="'+color+'" title="'+name+' · '+color+'" aria-label="Use '+name+' '+color+'" style="--swatch:'+color+'"></button>';
  }).join('');
}
function renderRecents(){
  if(!panel) return; const node=panel.querySelector('#colorStudioRecents'); if(!node) return;
  node.innerHTML=recents.length?swatchesHtml(recents,'recent'):'<span class="color-studio-empty">Colors you use will appear here.</span>';
}
function renderHarmony(){
  if(!panel) return; const node=panel.querySelector('#colorStudioHarmony'); if(node) node.innerHTML=swatchesHtml(harmonyColors(currentColor()),'harmony');
}
function renderGradients(){
  if(!panel) return; const node=panel.querySelector('#colorStudioGradients'); if(!node) return;
  node.innerHTML=GRADIENTS.map((preset)=>{
    const active=preset.id===selectedGradientId?' active':'';
    return '<button type="button" class="color-studio-gradient'+active+'" data-gradient="'+preset.id+'" title="'+preset.name+'"><span style="--gradient:'+gradientCss(preset)+'"></span><strong>'+preset.name+'</strong></button>';
  }).join('');
}
function activatePanel(){
  const tab=document.querySelector('[data-panel="favoriteColorsPanel"]'); if(!panel||!tab) return false;
  document.querySelectorAll('.inspector-tabs button[data-panel]').forEach((button)=>button.classList.toggle('active',button===tab));
  document.querySelectorAll('.inspector-panel').forEach((candidate)=>candidate.classList.toggle('active',candidate===panel));
  if(window.matchMedia('(max-width:1000px)').matches) document.querySelector('#studio')?.classList.add('brush-drawer-open');
  syncEditor(); renderRecents(); renderHarmony(); renderGradients(); return true;
}
function addStyles(){
  if(document.querySelector('#domistikaColorStudioV0924Styles')) return;
  const style=document.createElement('style');style.id='domistikaColorStudioV0924Styles';
  style.textContent=[
    '.color-studio-block{margin:0 0 13px;padding:11px;border:1px solid var(--line);border-radius:13px;background:rgba(255,255,255,.025)}',
    '.color-studio-kicker{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.color-studio-kicker strong{font-size:11px}.color-studio-kicker small{color:var(--muted);font-size:8px}',
    '.color-studio-current{display:grid;grid-template-columns:62px 1fr;gap:10px;align-items:center}.color-studio-current-swatch{width:62px;height:62px;border:2px solid rgba(255,255,255,.38);border-radius:15px;background:var(--color);box-shadow:inset 0 0 0 1px rgba(0,0,0,.28)}',
    '.color-studio-current code{display:block;margin-top:4px;color:var(--muted);font-size:9px}.color-studio-native{width:100%!important;height:34px!important;border:1px solid var(--line)!important;border-radius:9px!important;padding:2px!important;background:var(--panel2)!important}',
    '.color-studio-field{display:grid;gap:4px;color:var(--muted);font-size:8px}.color-studio-field input{width:100%;min-width:0;padding:7px 8px;color:var(--ink);border:1px solid var(--line);border-radius:8px;background:var(--panel2)}',
    '.color-studio-triplet{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:7px}.color-studio-css{display:grid;grid-template-columns:1fr auto;gap:6px;margin-top:7px}.color-studio-css button,.color-studio-actions button{border:1px solid var(--line);border-radius:8px;padding:7px 9px;color:var(--ink);background:var(--panel2);cursor:pointer}',
    '.color-studio-swatches{display:flex;gap:6px;flex-wrap:wrap}.color-studio-swatch{width:27px;height:27px;padding:0;border:2px solid rgba(255,255,255,.32);border-radius:8px;background:var(--swatch);cursor:pointer;box-shadow:inset 0 0 0 1px rgba(0,0,0,.18)}.color-studio-swatch:hover{transform:scale(1.08)}',
    '.color-studio-empty{color:var(--muted);font-size:9px}.color-studio-named{display:grid;grid-template-columns:repeat(8,1fr);gap:5px}.color-studio-named .color-studio-swatch{width:100%;aspect-ratio:1/1}',
    '.color-studio-gradient-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.color-studio-gradient{display:grid;gap:5px;padding:5px;border:1px solid var(--line);border-radius:10px;color:var(--ink);background:var(--panel2);cursor:pointer;text-align:left}.color-studio-gradient span{height:34px;border-radius:7px;background:var(--gradient)}.color-studio-gradient strong{padding:0 3px 2px;font-size:8px}.color-studio-gradient.active{border-color:rgba(255,191,105,.55);box-shadow:0 0 0 1px rgba(255,191,105,.18)}',
    '.color-studio-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.color-studio-actions button:first-child{border-color:rgba(141,108,255,.45);background:rgba(141,108,255,.14)}',
    '.favorite-colors-panel>.panel-heading h2{font-size:17px}.favorite-colors-panel>.color-bank-current{display:none!important}.color-studio-favorites-title{margin:13px 0 0;font-size:11px}',
    '@media(max-width:680px){.color-studio-named{grid-template-columns:repeat(6,1fr)}.color-studio-gradient-grid{grid-template-columns:1fr}.color-studio-triplet{gap:4px}}'
  ].join('');
  document.head.appendChild(style);
}
function buildUi(){
  panel=document.querySelector('#favoriteColorsPanel'); if(!panel) return false;
  if(document.querySelector('#colorStudioEditor')) return true;
  addStyles();
  const heading=panel.querySelector('.panel-heading');
  if(heading?.querySelector('h2')) heading.querySelector('h2').textContent='Color Studio';
  if(heading?.querySelector('p')) heading.querySelector('p').textContent='Wheel · numbers · CSS colors · harmonies · gradients';

  const editor=document.createElement('div');editor.id='colorStudioEditor';
  editor.innerHTML=[
    '<section class="color-studio-block"><div class="color-studio-kicker"><strong>Current color</strong><small>native picker + exact values</small></div>',
    '<div class="color-studio-current"><span id="colorStudioCurrent" class="color-studio-current-swatch"></span><div><input id="colorStudioNative" class="color-studio-native" type="color" aria-label="Native color picker"><code id="colorStudioCurrentCode"></code></div></div>',
    '<label class="color-studio-field" style="margin-top:8px">HEX / HTML color<input id="colorStudioHex" autocomplete="off" spellcheck="false" maxlength="7" placeholder="#ff7a18"></label>',
    '<div class="color-studio-triplet"><label class="color-studio-field">R<input id="colorStudioR" type="number" min="0" max="255"></label><label class="color-studio-field">G<input id="colorStudioG" type="number" min="0" max="255"></label><label class="color-studio-field">B<input id="colorStudioB" type="number" min="0" max="255"></label></div>',
    '<div class="color-studio-triplet"><label class="color-studio-field">Hue °<input id="colorStudioH" type="number" min="0" max="359"></label><label class="color-studio-field">Sat %<input id="colorStudioS" type="number" min="0" max="100"></label><label class="color-studio-field">Light %<input id="colorStudioL" type="number" min="0" max="100"></label></div>',
    '<div class="color-studio-css"><label class="color-studio-field">CSS / named color<input id="colorStudioCss" list="colorStudioCssNames" placeholder="coral"></label><button id="colorStudioCssApply" type="button">Use</button></div>',
    '<datalist id="colorStudioCssNames">'+CSS_COLORS.map((item)=>'<option value="'+item[0]+'"></option>').join('')+'</datalist></section>',
    '<section class="color-studio-block"><div class="color-studio-kicker"><strong>Recent</strong><small>local</small></div><div id="colorStudioRecents" class="color-studio-swatches"></div></section>',
    '<section class="color-studio-block"><div class="color-studio-kicker"><strong>Harmony</strong><small>from current color</small></div><div id="colorStudioHarmony" class="color-studio-swatches"></div></section>',
    '<section class="color-studio-block"><div class="color-studio-kicker"><strong>CSS colors</strong><small>click to use</small></div><div id="colorStudioNamed" class="color-studio-named">'+CSS_COLORS.map((item)=>'<button type="button" class="color-studio-swatch" data-named="'+item[1]+'" title="'+item[0]+' · '+item[1]+'" aria-label="Use '+item[0]+'" style="--swatch:'+item[1]+'"></button>').join('')+'</div></section>',
    '<section class="color-studio-block"><div class="color-studio-kicker"><strong>Gradients</strong><small>real layer paint</small></div><div id="colorStudioGradients" class="color-studio-gradient-grid"></div><div class="color-studio-actions"><button id="colorStudioGradientBehind" type="button">Paint behind art</button><button id="colorStudioGradientReplace" type="button">Fill active layer</button></div><p class="reference-tip">Gradient actions create one undo checkpoint. “Behind art” fills only transparent space; “Fill active layer” replaces the active layer.</p></section>',
    '<h3 class="color-studio-favorites-title">Favorites</h3>'
  ].join('');
  heading?.insertAdjacentElement('afterend',editor);

  panel.querySelector('#colorStudioNative')?.addEventListener('input',(event)=>setColor(event.target.value,{remember:false,status:false}));
  panel.querySelector('#colorStudioNative')?.addEventListener('change',(event)=>setColor(event.target.value));
  panel.querySelector('#colorStudioHex')?.addEventListener('change',(event)=>{const color=normalizeHex(event.target.value);if(color)setColor(color);else syncEditor();});

  const applyRgb=()=>{
    const values=['R','G','B'].map((key)=>Number(panel.querySelector('#colorStudio'+key)?.value));
    if(values.every(Number.isFinite)) setColor(rgbToHex(values[0],values[1],values[2]));
  };
  ['R','G','B'].forEach((key)=>panel.querySelector('#colorStudio'+key)?.addEventListener('change',applyRgb));
  const applyHsl=()=>{
    const values=['H','S','L'].map((key)=>Number(panel.querySelector('#colorStudio'+key)?.value));
    if(values.every(Number.isFinite)) setColor(hslToHex(values[0],values[1],values[2]));
  };
  ['H','S','L'].forEach((key)=>panel.querySelector('#colorStudio'+key)?.addEventListener('change',applyHsl));

  const useCss=()=>{const color=parseCssName(panel.querySelector('#colorStudioCss')?.value);if(color)setColor(color);};
  panel.querySelector('#colorStudioCssApply')?.addEventListener('click',useCss);
  panel.querySelector('#colorStudioCss')?.addEventListener('keydown',(event)=>{if(event.key==='Enter'){event.preventDefault();useCss();}});

  panel.addEventListener('click',(event)=>{
    const swatch=event.target.closest('[data-recent],[data-harmony],[data-named]');
    if(swatch){setColor(swatch.dataset.recent||swatch.dataset.harmony||swatch.dataset.named);return;}
    const gradient=event.target.closest('[data-gradient]');
    if(gradient){selectedGradientId=gradient.dataset.gradient;renderGradients();}
  });
  panel.querySelector('#colorStudioGradientBehind')?.addEventListener('click',()=>applyGradient(selectedGradientId,{mode:'behind'}));
  panel.querySelector('#colorStudioGradientReplace')?.addEventListener('click',()=>applyGradient(selectedGradientId,{mode:'replace'}));

  const compactOpen=document.querySelector('.color-bank-open');
  if(compactOpen){compactOpen.textContent='◐';compactOpen.title='Open Color Studio';compactOpen.setAttribute('aria-label','Open Color Studio');}
  const tab=document.querySelector('[data-panel="favoriteColorsPanel"]');if(tab) tab.textContent='Colors';

  colorInput()?.addEventListener('input',()=>{syncEditor();renderHarmony();});
  colorInput()?.addEventListener('change',()=>rememberColor(currentColor()));
  syncEditor();renderRecents();renderHarmony();renderGradients();return true;
}
function install(){
  if(window[INSTALL_FLAG]) return true;
  recents=loadRecents();
  if(!buildUi()) return false;
  window[INSTALL_FLAG]=true;
  window.domistikaColorStudioV0924=Object.freeze({
    version:VERSION,schema:SCHEMA,current:currentColor,set:setColor,normalizeHex,hexToRgb,rgbToHex,rgbToHsl,hslToRgb,
    harmony:()=>Object.freeze(harmonyColors(currentColor()).map((item)=>Object.freeze({...item}))),
    recent:()=>Object.freeze([...recents]),
    cssColors:()=>Object.freeze(CSS_COLORS.map((item)=>Object.freeze({name:item[0],color:item[1]}))),
    gradients:()=>Object.freeze(GRADIENTS.map((preset)=>Object.freeze({...preset,stops:Object.freeze(preset.stops.map((stop)=>Object.freeze([...stop])))}))),
    applyGradient,open:activatePanel
  });
  window.dispatchEvent(new CustomEvent('domistika:color-studio-ready',{detail:{version:VERSION,schema:SCHEMA,gradientCount:GRADIENTS.length,cssColorCount:CSS_COLORS.length}}));
  return true;
}
function wait(attempt=0){
  if(typeof window==='undefined') return;
  if(install()) return;
  if(attempt<1200) requestAnimationFrame(()=>wait(attempt+1));
}
if(typeof window!=='undefined') wait();

export {VERSION,SCHEMA,CSS_COLORS,GRADIENTS,normalizeHex,rgbToHex,hexToRgb,rgbToHsl,hslToRgb,hslToHex,harmonyColors,gradientCss};
