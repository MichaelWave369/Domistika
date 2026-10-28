/** Domistika XR Showrunner v1.0: authored local visual cues and portable scene packages.
 * Silent choreography only. No audio file, playback, external source, or media capture.
 */
import {readWorkshop,writeWorkshop} from './workshopModel.js';
import {LIGHT_PALETTES} from './lightForge.js';
import {sampleShowDemo} from './showForge.js';
export const SHOWPACK_SCHEMA='domistika.xr.showpack.v1';
export const SHOWPACK_MAX_BYTES=2_250_000;
export const DEFAULT_SHOW={
  title:'Enter the Field · Opening Night',
  cues:[
    {title:'Arrival',duration:12,palette:'aurora',gain:.55,energy:.65},
    {title:'Into the Field',duration:18,palette:'outrun',gain:.85,energy:1},
    {title:'Finale',duration:14,palette:'ember',gain:1.15,energy:1.15}
  ]
};
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
const keys=(value,allow)=>Object.keys(value).every(k=>allow.includes(k));
export function validateShow(value){
  if(!obj(value)||!keys(value,['title','cues'])||
     typeof value.title!=='string'||!value.title.trim()||value.title.length>65||
     !Array.isArray(value.cues)||value.cues.length<1||value.cues.length>8)
    throw Error('Invalid v1.0 Showrunner title or cues.');
  const cues=value.cues.map((cue,index)=>{
    if(!obj(cue)||!keys(cue,['title','duration','palette','gain','energy'])||
      typeof cue.title!=='string'||!cue.title.trim()||cue.title.length>45||
      !Number.isInteger(cue.duration)||cue.duration<4||cue.duration>120||
      typeof cue.palette!=='string'||!own(LIGHT_PALETTES,cue.palette)||
      typeof cue.gain!=='number'||!Number.isFinite(cue.gain)||cue.gain<0||cue.gain>1.5||
      typeof cue.energy!=='number'||!Number.isFinite(cue.energy)||cue.energy<.25||cue.energy>1.5)
      throw Error('Invalid Showrunner cue '+(index+1)+'.');
    return {title:cue.title,duration:cue.duration,palette:cue.palette,gain:cue.gain,energy:cue.energy};
  });
  return {title:value.title,cues};
}
export const showDuration=show=>validateShow(show).cues.reduce((sum,cue)=>sum+cue.duration,0);
export function writeShowPack(assemblyJson,show=DEFAULT_SHOW){
  const assembly=readWorkshop(assemblyJson),cues=validateShow(show);
  const pack={schema:SHOWPACK_SCHEMA,app:'Domistika XR',version:'1.0',
    show:cues,workshop:assembly};
  const text=JSON.stringify(pack);
  if(text.length>SHOWPACK_MAX_BYTES)throw Error('Showpack exceeds 2.25 MB.');
  return text;
}
export function readShowPack(text){
  if(typeof text!=='string'||text.length>SHOWPACK_MAX_BYTES)throw Error('Showpack exceeds 2.25 MB.');
  const pack=JSON.parse(text);
  if(!obj(pack)||!keys(pack,['schema','app','version','show','workshop'])||
    pack.schema!==SHOWPACK_SCHEMA||pack.app!=='Domistika XR'||pack.version!=='1.0')
    throw Error('Unsupported Showrunner package.');
  const show=validateShow(pack.show);
  // Re-run original workshop bounds exactly; no alternate authority or bypass.
  const workshop=readWorkshop(writeWorkshop(pack.workshop));
  return {schema:SHOWPACK_SCHEMA,app:'Domistika XR',version:'1.0',show,workshop};
}
/** Time advances at most 100 ms per rendered frame to avoid XR background jumps.
 * Cue transitions require no geometry writes or browser media permissions.
 */
export function createShowrunner(initial=DEFAULT_SHOW){
  let show=validateShow(initial),playing=false,elapsed=0;
  const starts=()=>show.cues.map((cue,i)=>show.cues.slice(0,i).reduce((n,c)=>n+c.duration,0));
  const total=()=>show.cues.reduce((n,c)=>n+c.duration,0);
  const cueIndex=()=>Math.min(show.cues.length-1,
    show.cues.findIndex((cue,i)=>elapsed<starts()[i]+cue.duration)===-1?
      show.cues.length-1:show.cues.findIndex((cue,i)=>elapsed<starts()[i]+cue.duration));
  const status=()=>{
    const index=cueIndex(),start=starts()[index],cue=show.cues[index];
    return {playing,elapsed,remaining:Math.max(0,total()-elapsed),total:total(),
      index,cue:{...cue},cueElapsed:Math.max(0,elapsed-start),count:show.cues.length,
      title:show.title};
  };
  function loadShow(next){show=validateShow(next);playing=false;elapsed=0;return status();}
  function updateCue(index,patch){
    if(playing)throw Error('Stop the show before editing its cues.');
    if(!Number.isInteger(index)||index<0||index>=show.cues.length||
      !obj(patch)||!keys(patch,['title','duration','palette','gain','energy']))
      throw Error('Invalid cue edit.');
    show=validateShow({...show,cues:show.cues.map((cue,i)=>i===index?{...cue,...patch}:cue)});
    elapsed=Math.min(elapsed,total());return status();
  }
  function rename(title){if(playing)throw Error('Stop the show before renaming.');return loadShow({...show,title});}
  function play(){if(elapsed>=total())elapsed=0;playing=true;return status();}
  function pause(){playing=false;return status();}
  function reset(){playing=false;elapsed=0;return status();}
  function jump(index){
    if(!Number.isInteger(index)||index<0||index>=show.cues.length)throw Error('Unknown show cue.');
    elapsed=starts()[index];return status();
  }
  function next(){return jump(Math.min(show.cues.length-1,cueIndex()+1));}
  function previous(){return jump(Math.max(0,cueIndex()-1));}
  function tick(dt){
    if(!Number.isFinite(dt)||dt<0)throw Error('Invalid show frame delta.');
    if(playing){elapsed=Math.min(total(),elapsed+Math.min(dt,.1));if(elapsed>=total())playing=false;}
    return status();
  }
  function frame(){
    const now=status(),s=sampleShowDemo(now.elapsed);
    const factor=now.cue.energy;
    const bound=v=>Math.max(0,Math.min(1,v*factor));
    return {energy:bound(s.energy),bass:bound(s.bass),mid:bound(s.mid),
      high:bound(s.high),beat:bound(s.beat)};
  }
  return {get show(){return validateShow(show);},get playing(){return playing;},
    get status(){return status();},play,pause,reset,next,previous,jump,tick,frame,
    loadShow,updateCue,rename};
}
