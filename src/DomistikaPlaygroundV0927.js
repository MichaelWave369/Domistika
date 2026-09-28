const VERSION='0.9.28';
const SCHEMA='domistika.playground.v1';
const INSTALL_FLAG='__domistikaPlaygroundV0927Installed';

let running=false;
let returnProject=null;
let lastClip=null;

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const delay=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));

function status(message){
  const node=document.querySelector('#statusMessage');
  if(node) node.textContent=message;
}

function clipSummary(clip){
  if(!clip) return null;
  return Object.freeze({
    id:String(clip.id||''),
    name:String(clip.name||'Motion clip'),
    kind:String(clip.kind||'motion'),
    mimeType:String(clip.mimeType||'video/webm'),
    bytes:Math.max(0,Number(clip.bytes)||0),
    durationSeconds:Math.max(0,Number(clip.durationSeconds)||0),
    fps:Math.max(0,Number(clip.fps)||0),
    createdAt:String(clip.createdAt||''),
  });
}

function ensurePlaygroundUi(){
  let chip=document.querySelector('#playgroundQuickAction');
  let notice=document.querySelector('#playgroundReturnNotice');

  if(!chip){
    chip=document.createElement('button');
    chip.id='playgroundQuickAction';
    chip.type='button';
    chip.className='soft-button playground-quick-action';
    const actions=document.querySelector('.top-actions');
    const commands=document.querySelector('#commandPaletteLauncher');
    if(actions){
      if(commands?.nextSibling) actions.insertBefore(chip,commands.nextSibling);
      else actions.appendChild(chip);
    }
  }

  if(!notice){
    notice=document.createElement('div');
    notice.id='playgroundReturnNotice';
    notice.className='playground-return-notice';
    notice.hidden=true;
    notice.innerHTML='<strong>Playground complete.</strong><span>Your previous artwork is safe.</span><button type="button" id="playgroundReturnNow">Return to my artwork</button><small>or ⌘K / Ctrl+K → Playground · Return to Previous Artwork</small>';
    document.body.appendChild(notice);
    notice.querySelector('#playgroundReturnNow')?.addEventListener('click',()=>restorePrevious().catch((error)=>{
      console.warn('Domistika Playground return failed',error);
      status('Could not return to previous artwork · '+String(error?.message||error));
    }));
  }

  if(!document.querySelector('#domistikaPlaygroundV0928Styles')){
    const style=document.createElement('style');
    style.id='domistikaPlaygroundV0928Styles';
    style.textContent=[
      '.playground-quick-action{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}',
      '.playground-quick-action[data-return="true"]{border-color:rgba(255,191,105,.55);background:rgba(255,191,105,.12)}',
      '.playground-return-notice{position:fixed;left:50%;bottom:24px;z-index:1900;transform:translateX(-50%);width:min(680px,calc(100vw - 30px));display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:11px 13px;border:1px solid rgba(255,191,105,.5);border-radius:14px;color:var(--ink);background:rgba(24,18,26,.97);box-shadow:0 18px 60px rgba(0,0,0,.48)}',
      '.playground-return-notice[hidden]{display:none!important}.playground-return-notice strong{font-size:11px}.playground-return-notice span{font-size:10px;color:var(--muted)}.playground-return-notice button{padding:8px 10px;border:1px solid rgba(255,191,105,.5);border-radius:9px;color:#171019;background:var(--warm);font-weight:800;cursor:pointer}.playground-return-notice small{grid-column:1/-1;color:var(--muted);font-size:8px}',
      '@media(max-width:760px){.playground-return-notice{grid-template-columns:1fr}.playground-return-notice button{width:100%}.playground-quick-action{max-width:125px;overflow:hidden;text-overflow:ellipsis}}'
    ].join('');
    document.head.appendChild(style);
  }

  return {chip,notice};
}

function syncPlaygroundUi(){
  const {chip,notice}=ensurePlaygroundUi();
  const canRestore=Boolean(returnProject);
  chip.disabled=running;
  chip.dataset.return=String(canRestore);
  chip.textContent=running?'Playground…':canRestore?'↩ Return to Artwork':'▶ Playground';
  chip.title=canRestore?'Restore the artwork open before Playground':'Run the Domistika Playground demo';
  notice.hidden=!canRestore||running;
}

function emit(name,detail={}){
  window.dispatchEvent(new CustomEvent('domistika:'+name,{
    detail:{version:VERSION,schema:SCHEMA,...detail},
  }));
}

function api(){
  const value=window.Domistika;
  if(!value?.ready?.()) throw new Error('DOMISTIKA_PLAYGROUND_SDK_NOT_READY');
  return value;
}

function waitForMotionClip(timeoutMs=9000){
  return new Promise((resolve)=>{
    let settled=false;
    const finish=(value)=>{
      if(settled) return;
      settled=true;
      clearTimeout(timer);
      window.removeEventListener('domistika:motion-clip-added',onClip);
      resolve(value||null);
    };
    const onClip=(event)=>finish(event.detail?.clip||null);
    const timer=setTimeout(()=>finish(null),timeoutMs);
    window.addEventListener('domistika:motion-clip-added',onClip,{once:true});
  });
}

async function saveReturnProject(){
  if(returnProject) return returnProject;
  returnProject=await api().project.serialize({embedMotion:false});
  return returnProject;
}

async function buildDemoCanvas(){
  const d=api();
  await d.canvas.new({width:1200,height:1200,name:'Domistika Playground'});
  d.brush.symmetry('none');

  d.colors.applyGradient('portal-core',{mode:'replace'});

  const spiro=d.layers.create('Playground · Spiro');
  d.layers.activate(spiro.id);
  d.layers.role(spiro.id,'paint');

  d.colors.set('#fff4b3');
  d.spiro.place('flower',{
    x:0.5,y:0.5,space:'normalized',
    lineWidth:7,opacity:0.94,
  });

  d.colors.set('#49d8ff');
  d.spiro.place('gear',{
    x:0.5,y:0.5,space:'normalized',
    lineWidth:3,opacity:0.72,scale:0.72,rotation:15,
  });

  const frame=d.layers.create('Playground · Static Frame');
  d.layers.activate(frame.id);
  d.layers.role(frame.id,'motion-ignore');

  d.stroke([
    {x:0.08,y:0.08},{x:0.92,y:0.08},{x:0.92,y:0.92},
    {x:0.08,y:0.92},{x:0.08,y:0.08},
  ],{
    tool:'ink',
    color:'#fff6d2',
    size:6,
    opacity:0.9,
    smoothing:0,
    symmetry:'none',
    space:'normalized',
    message:'Playground static frame',
  });

  d.layers.activate(spiro.id);
  return {spiroLayerId:spiro.id,frameLayerId:frame.id};
}

async function run(options={}){
  if(running) throw new Error('DOMISTIKA_PLAYGROUND_ALREADY_RUNNING');
  running=true;
  lastClip=null;
  const seconds=clamp(Number(options.recordSeconds)||3,2,8);
  const shouldRecord=options.record!==false;

  emit('playground-start',{recordSeconds:seconds});
  syncPlaygroundUi();
  status('Playground · saving your current artwork…');

  try{
    await saveReturnProject();
    status('Playground · building the demo canvas…');
    const layers=await buildDemoCanvas();

    status('Playground · opening the 3·6·9 Portal…');
    api().motion.play('portal-369');
    await delay(350);

    if(shouldRecord){
      try{
        status('Playground · recording a short Kinetic clip…');
        api().motion.record.start({source:'kinetic'});
        const clipPromise=waitForMotionClip(Math.max(9000,(seconds+5)*1000));
        await delay(seconds*1000);
        api().motion.record.stop({source:'kinetic'});
        lastClip=await clipPromise;
      }catch(error){
        console.warn('Domistika Playground recording skipped',error);
        try{api().motion.record.stop({source:'kinetic'});}catch{}
        status('Playground · motion works; recording is unavailable in this browser');
      }
    }

    api().motion.stop();

    const result=Object.freeze({
      ok:true,
      recordSeconds:seconds,
      recorded:Boolean(lastClip),
      clip:clipSummary(lastClip),
      layers:Object.freeze({...layers}),
      canRestore:Boolean(returnProject),
    });

    emit('playground-complete',result);
    syncPlaygroundUi();
    status(lastClip
      ? 'Playground complete · motion clip saved · ⌘K / Ctrl+K → Playground · Return to Previous Artwork'
      : 'Playground complete · ⌘K / Ctrl+K → Playground · Return to Previous Artwork');
    return result;
  }catch(error){
    try{api().motion.record.stop({source:'kinetic'});}catch{}
    try{api().motion.stop();}catch{}
    emit('playground-failed',{message:String(error?.message||error)});
    status('Playground failed · '+String(error?.message||error));
    throw error;
  }finally{
    running=false;
    syncPlaygroundUi();
  }
}

async function restorePrevious(){
  if(running) throw new Error('DOMISTIKA_PLAYGROUND_BUSY');
  if(!returnProject) throw new Error('DOMISTIKA_PLAYGROUND_NO_RETURN_PROJECT');
  const d=api();
  try{d.motion.stop();}catch{}
  const project=returnProject;
  returnProject=null;
  lastClip=null;
  const result=await d.project.restore(project);
  emit('playground-returned',{projectName:project.name||'Restored Domistika'});
  syncPlaygroundUi();
  status('Returned to previous artwork · '+String(project.name||'Domistika'));
  return result;
}

function state(){
  return Object.freeze({
    available:true,
    running,
    canRestore:Boolean(returnProject),
    lastClip:clipSummary(lastClip),
  });
}

function install(){
  if(window[INSTALL_FLAG]) return true;
  if(!window.Domistika?.ready?.()) return false;
  window[INSTALL_FLAG]=true;

  window.domistikaPlaygroundV0927=Object.freeze({
    version:VERSION,
    schema:SCHEMA,
    run,
    restorePrevious,
    state,
  });

  const {chip}=ensurePlaygroundUi();
  chip.addEventListener('click',()=>{
    const action=returnProject?restorePrevious():run();
    Promise.resolve(action).catch((error)=>{
      console.warn('Domistika Playground quick action failed',error);
      status('Playground action failed · '+String(error?.message||error));
    });
  });
  syncPlaygroundUi();

  emit('playground-ready',{});
  return true;
}

function wait(attempt=0){
  if(typeof window==='undefined') return;
  if(install()) return;
  if(attempt<1200) requestAnimationFrame(()=>wait(attempt+1));
}

if(typeof window!=='undefined') wait();

export {VERSION,SCHEMA,run,restorePrevious,state};
