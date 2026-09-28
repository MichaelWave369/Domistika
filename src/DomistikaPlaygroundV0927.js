const VERSION='0.9.27';
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
      clip:lastClip,
      layers:Object.freeze({...layers}),
      canRestore:Boolean(returnProject),
    });

    emit('playground-complete',result);
    status(lastClip
      ? 'Playground complete · motion clip saved · use “Playground · Return to Previous Artwork” when ready'
      : 'Playground complete · use “Playground · Return to Previous Artwork” when ready');
    return result;
  }catch(error){
    try{api().motion.record.stop({source:'kinetic'});}catch{}
    try{api().motion.stop();}catch{}
    emit('playground-failed',{message:String(error?.message||error)});
    status('Playground failed · '+String(error?.message||error));
    throw error;
  }finally{
    running=false;
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
  status('Returned to previous artwork · '+String(project.name||'Domistika'));
  return result;
}

function state(){
  return Object.freeze({
    available:true,
    running,
    canRestore:Boolean(returnProject),
    lastClip:lastClip?Object.freeze({...lastClip}):null,
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
