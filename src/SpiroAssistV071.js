const assist = {
  layout: 'ring', count: 12, radius: 260, rows: 3, columns: 4,
  spacingX: 260, spacingY: 260, scaleStart: 0.55, scaleEnd: 1,
  rotationStep: 30, mirror: 'alternate-h', hueStep: 24,
  blendMode: 'source-over', placementArmed: false,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const spiro = () => globalThis.domistikaSpiroV07 || null;

function activate(panelId) { spiro()?.activatePanel(panelId); }
function status(message) {
  const active = spiro()?.engine();
  if (active?.onStatus) active.onStatus(message);
  else document.querySelector('#statusMessage')?.replaceChildren(message);
}

function hexToRgb(hex) {
  const clean = String(hex).replace('#','');
  const value = Number.parseInt(clean.length === 3 ? clean.split('').map((c)=>c+c).join('') : clean, 16);
  return { r:(value>>16)&255, g:(value>>8)&255, b:value&255 };
}
function rgbToHsl({r,g,b}) {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), l=(max+min)/2;
  if (max===min) return {h:0,s:0,l};
  const d=max-min, s=l>0.5?d/(2-max-min):d/(max+min);
  let h=max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4;
  return {h:h*60,s,l};
}
function hslToHex({h,s,l}) {
  h=((h%360)+360)%360/360;
  const hue=(p,q,t)=>{ if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p; };
  let r,g,b;
  if(!s) r=g=b=l;
  else { const q=l<0.5?l*(1+s):l+s-l*s,p=2*l-q;r=hue(p,q,h+1/3);g=hue(p,q,h);b=hue(p,q,h-1/3); }
  return `#${[r,g,b].map((v)=>Math.round(v*255).toString(16).padStart(2,'0')).join('')}`;
}
function shiftedColor(index) {
  const base = rgbToHsl(hexToRgb(spiro()?.currentColor() || '#1b1820'));
  return hslToHex({ ...base, h: base.h + index * assist.hueStep });
}

function mirrorVariants(index) {
  if (assist.mirror === 'quad') return [{scaleX:1,scaleY:1},{scaleX:-1,scaleY:1},{scaleX:1,scaleY:-1},{scaleX:-1,scaleY:-1}];
  if (assist.mirror === 'horizontal') return [{scaleX:1,scaleY:1},{scaleX:-1,scaleY:1}];
  if (assist.mirror === 'vertical') return [{scaleX:1,scaleY:1},{scaleX:1,scaleY:-1}];
  if (assist.mirror === 'alternate-h') return [{scaleX:index%2?-1:1,scaleY:1}];
  if (assist.mirror === 'alternate-v') return [{scaleX:1,scaleY:index%2?-1:1}];
  return [{scaleX:1,scaleY:1}];
}

function basePlacements(centerX, centerY) {
  const items=[];
  if (assist.layout === 'grid') {
    const rows=Math.max(1,assist.rows), cols=Math.max(1,assist.columns);
    for(let row=0;row<rows;row+=1) for(let col=0;col<cols;col+=1) {
      items.push({ x:centerX+(col-(cols-1)/2)*assist.spacingX, y:centerY+(row-(rows-1)/2)*assist.spacingY });
    }
  } else if (assist.layout === 'row') {
    for(let i=0;i<assist.count;i+=1) items.push({ x:centerX+(i-(assist.count-1)/2)*assist.spacingX, y:centerY });
  } else if (assist.layout === 'golden') {
    const angle=137.507764*Math.PI/180;
    for(let i=0;i<assist.count;i+=1) {
      const radius=Math.sqrt(i)*assist.radius/Math.sqrt(Math.max(1,assist.count-1));
      items.push({ x:centerX+Math.cos(i*angle)*radius, y:centerY+Math.sin(i*angle)*radius });
    }
  } else {
    for(let i=0;i<assist.count;i+=1) {
      const angle=Math.PI*2*i/assist.count-Math.PI/2;
      items.push({ x:centerX+Math.cos(angle)*assist.radius, y:centerY+Math.sin(angle)*assist.radius, rotation:angle*180/Math.PI+90 });
    }
  }
  return items;
}

function buildItems(centerX, centerY) {
  const bases=basePlacements(centerX,centerY), count=Math.max(1,bases.length), items=[];
  bases.forEach((base,index)=>{
    const t=count===1?0:index/(count-1);
    const scale=assist.scaleStart+(assist.scaleEnd-assist.scaleStart)*t;
    const rotation=(base.rotation||0)+index*assist.rotationStep;
    for(const mirror of mirrorVariants(index)) items.push({
      ...base, ...mirror, scale, rotation, color:shiftedColor(index), blendMode:assist.blendMode,
    });
  });
  return items;
}

function drawAssist(centerX, centerY) {
  const api=spiro(), active=api?.engine();
  if(!api||!active?.activeLayer) return status('Choose an active layer first');
  const items=buildItems(centerX,centerY);
  api.drawBatch(items,{ message:`Spiro Assist placed ${items.length} forms` });
}

function renderPreview() {
  const canvas=document.querySelector('#spiroAssistPreview');
  if(!canvas||!spiro()) return;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fffafc';ctx.fillRect(0,0,canvas.width,canvas.height);
  const items=buildItems(canvas.width/2,canvas.height/2);
  const maxExtent=Math.max(1,assist.radius+spiro().state.diameter/2,assist.spacingX*assist.columns/2,assist.spacingY*assist.rows/2);
  const fit=Math.min(0.9,Math.min(canvas.width,canvas.height)/(maxExtent*2.2));
  ctx.save();ctx.translate(canvas.width/2,canvas.height/2);ctx.scale(fit,fit);ctx.translate(-canvas.width/2,-canvas.height/2);
  for(const item of items.slice(0,80)) {
    const points=spiro().computePoints({ diameter:spiro().state.diameter*0.42, quality:500 });
    ctx.save();ctx.translate(item.x,item.y);ctx.rotate(item.rotation*Math.PI/180);ctx.scale(item.scaleX*item.scale,item.scaleY*item.scale);
    ctx.strokeStyle=item.color;ctx.globalAlpha=.72;ctx.lineWidth=Math.max(1,spiro().state.lineWidth/fit*.35);ctx.beginPath();
    points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.restore();
  }
  ctx.restore();
}

function sync() {
  document.querySelector('#assistLayout').value=assist.layout;
  document.querySelector('#assistMirror').value=assist.mirror;
  document.querySelector('#assistBlend').value=assist.blendMode;
  document.querySelectorAll('[data-assist-key]').forEach((input)=>{
    input.value=assist[input.dataset.assistKey];
    const out=document.querySelector(`[data-assist-output="${input.id}"]`);
    if(out) out.textContent=`${input.value}${input.dataset.suffix||''}`;
  });
  const place=document.querySelector('#assistPlace');
  if(place){place.classList.toggle('active',assist.placementArmed);place.textContent=assist.placementArmed?'Cancel placement':'Place array';}
  renderPreview();
}

function injectStyles() {
  if(document.querySelector('#spiroAssistStyles')) return;
  const style=document.createElement('style');style.id='spiroAssistStyles';style.textContent=`
    .assist-open,.assist-btn,.assist-select{border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--ink);cursor:pointer}.assist-open{padding:8px 10px;font-weight:700}
    .assist-shell{display:grid;gap:11px}.assist-preview{width:100%;height:auto;border:1px solid var(--line);border-radius:14px;background:#fff}.assist-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.assist-grid label{display:grid;gap:5px;color:var(--muted);font-size:10px}.assist-grid output{justify-self:end;color:var(--ink)}
    .assist-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.assist-btn{padding:9px}.assist-btn.primary{background:rgba(255,191,105,.15);border-color:rgba(255,191,105,.4)}.assist-btn.active{background:rgba(127,90,240,.16)}.assist-note{margin:0;font-size:10px;line-height:1.5;color:var(--muted)}
    @media(max-width:900px){.assist-grid,.assist-actions{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
}

function buildUI() {
  if(document.querySelector('#spiroAssistPanel')) return;
  const deck=document.querySelector('.control-deck'),tabs=document.querySelector('.inspector-tabs'),inspector=document.querySelector('.inspector');
  if(!deck||!tabs||!inspector||!spiro()) return;
  injectStyles();
  const open=document.createElement('button');open.className='assist-open';open.textContent='✨ Spiro+';open.onclick=()=>activate('spiroAssistPanel');deck.appendChild(open);
  const tab=document.createElement('button');tab.dataset.panel='spiroAssistPanel';tab.textContent='Spiro Assist';tab.onclick=()=>activate('spiroAssistPanel');tabs.appendChild(tab);
  const panel=document.createElement('section');panel.id='spiroAssistPanel';panel.className='inspector-panel';panel.innerHTML=`<div class="assist-shell">
    <div class="panel-heading"><div><h2>Spiro Assist</h2><p>Arrays, mirrors, golden-angle fields, and palette cycling.</p></div></div>
    <canvas id="spiroAssistPreview" class="assist-preview" width="320" height="220"></canvas>
    <div class="assist-grid">
      <label>Layout<select id="assistLayout" class="assist-select"><option value="ring">Ring</option><option value="golden">Golden angle</option><option value="grid">Grid</option><option value="row">Row</option></select></label>
      <label>Mirror<select id="assistMirror" class="assist-select"><option value="none">None</option><option value="alternate-h">Alternate horizontal</option><option value="alternate-v">Alternate vertical</option><option value="horizontal">Double horizontal</option><option value="vertical">Double vertical</option><option value="quad">Four-way</option></select></label>
      <label>Blend<select id="assistBlend" class="assist-select"><option value="source-over">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="lighter">Add glow</option><option value="difference">Difference</option></select></label>
      ${[['count','Count',1,48,1,''],['radius','Radius',20,900,5,'px'],['rows','Rows',1,10,1,''],['columns','Columns',1,10,1,''],['spacingX','Horizontal spacing',40,800,5,'px'],['spacingY','Vertical spacing',40,800,5,'px'],['scaleStart','Start scale',0.1,2,0.05,'×'],['scaleEnd','End scale',0.1,2,0.05,'×'],['rotationStep','Rotation step',-180,180,1,'°'],['hueStep','Hue step',0,180,1,'°']].map(([key,label,min,max,step,suffix])=>`<label>${label}<output data-assist-output="assist-${key}"></output><input id="assist-${key}" data-assist-key="${key}" data-suffix="${suffix}" type="range" min="${min}" max="${max}" step="${step}"></label>`).join('')}
    </div>
    <div class="assist-actions"><button id="assistCenter" class="assist-btn">Draw at center</button><button id="assistPlace" class="assist-btn primary">Place array</button><button id="assistRandom" class="assist-btn">Random layout</button><button id="assistOpenLab" class="assist-btn">Open Spiro Lab</button></div>
    <p class="assist-note">Each complete array is captured as one undo step. Palette cycling begins with the current Domistika color.</p>
  </div>`;inspector.appendChild(panel);
  document.querySelector('#assistLayout').onchange=(e)=>{assist.layout=e.target.value;sync();};
  document.querySelector('#assistMirror').onchange=(e)=>{assist.mirror=e.target.value;sync();};
  document.querySelector('#assistBlend').onchange=(e)=>{assist.blendMode=e.target.value;sync();};
  document.querySelectorAll('[data-assist-key]').forEach((input)=>input.oninput=()=>{assist[input.dataset.assistKey]=Number(input.value);sync();});
  document.querySelector('#assistCenter').onclick=()=>{const active=spiro().engine();if(active)drawAssist(active.width/2,active.height/2);};
  document.querySelector('#assistPlace').onclick=()=>{assist.placementArmed=!assist.placementArmed;sync();status(assist.placementArmed?'Click the canvas to place the Spiro Assist array':'Spiro Assist placement canceled');};
  document.querySelector('#assistOpenLab').onclick=()=>activate('spiroPanel');
  document.querySelector('#assistRandom').onclick=()=>{Object.assign(assist,{layout:['ring','golden','grid','row'][Math.floor(Math.random()*4)],count:5+Math.floor(Math.random()*22),radius:100+Math.floor(Math.random()*500),rows:2+Math.floor(Math.random()*4),columns:2+Math.floor(Math.random()*5),scaleStart:Number((.25+Math.random()).toFixed(2)),scaleEnd:Number((.25+Math.random()).toFixed(2)),rotationStep:-90+Math.floor(Math.random()*180),hueStep:8+Math.floor(Math.random()*70),mirror:['none','alternate-h','alternate-v','horizontal','vertical','quad'][Math.floor(Math.random()*6)]});sync();status('Random Spiro Assist field generated');};
  const overlay=document.querySelector('#overlay');overlay?.addEventListener('pointerdown',(event)=>{if(!assist.placementArmed||event.button!==0)return;const active=spiro().engine();if(!active)return;const rect=overlay.getBoundingClientRect(),x=clamp((event.clientX-rect.left)*(active.width/rect.width),0,active.width),y=clamp((event.clientY-rect.top)*(active.height/rect.height),0,active.height);assist.placementArmed=false;sync();event.preventDefault();event.stopImmediatePropagation();drawAssist(x,y);},true);
  sync();
}

function wait() {
  if(!spiro()||!document.querySelector('.control-deck')) return requestAnimationFrame(wait);
  buildUI();
}

document.addEventListener('domistika:spiro-ready',wait,{once:true});
wait();
