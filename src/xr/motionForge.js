import {AUDIO_BANDS,selectObjectAudio} from './beatForge.js';
/**
 * Motion Forge v0.5: deterministic visual transforms sampled from saved REST poses.
 * No effects on Framefield timelines, OpenBlueprint CAD, runtime physics, or audio.
 */
export const MOTION_MODES=['none','spin','bob','orbit','pulse'];
export const defaultMotion=()=>({mode:'spin',speed:1,amplitude:.4,phase:0,band:'full'});
const numeric=(v,min,max,label)=>{
  if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid motion '+label+'.');
  return v;
};
export function validateMotion(input){
  if(input===undefined||input===null)return null;
  if(!input||typeof input!=='object'||Array.isArray(input)||!MOTION_MODES.includes(input.mode))
    throw Error('Invalid motion mode.');
  const speed=numeric(input.speed,.1,3,'speed');
  const amplitude=numeric(input.amplitude,0,1.5,'amplitude');
  const phase=numeric(input.phase,0,Math.PI*2,'phase');
  const band=input.band??'full';
  if(!AUDIO_BANDS.includes(band))throw Error('Invalid motion audio band.');
  return {mode:input.mode,speed,amplitude,phase,band};
}
export function sampleMotion(object,timeSeconds,audioEnergy=0){
  if(!object||!Array.isArray(object.position)||!Array.isArray(object.rotation)||!Array.isArray(object.scale))
    throw Error('Missing rest-pose transform.');
  if(typeof timeSeconds!=='number'||!Number.isFinite(timeSeconds)||timeSeconds<0)
    throw Error('Invalid motion preview time.');
  const position=[...object.position],rotation=[...object.rotation],scale=[...object.scale];
  const motion=validateMotion(object.motion);
  const selectedEnergy=selectObjectAudio(audioEnergy,motion?.band??'full');
  if(!motion||motion.mode==='none')return {position,rotation,scale};
  // Offset 0 exactly equals rest pose for EVERY mode, including orbit.
  const a=((timeSeconds*motion.speed*2*Math.PI)%(2*Math.PI))+motion.phase;
  const zero=motion.phase;
  const sin=Math.sin(a)-Math.sin(zero),cos=Math.cos(a)-Math.cos(zero);
  if(motion.mode==='spin')rotation[1]+=timeSeconds*motion.speed*2*Math.PI+selectedEnergy*.45*sin;
  if(motion.mode==='bob')position[1]+=(motion.amplitude+selectedEnergy*.35)*sin;
  if(motion.mode==='orbit'){
    position[0]+=(motion.amplitude+selectedEnergy*.4)*cos;
    position[2]+=(motion.amplitude+selectedEnergy*.4)*sin;
  }
  if(motion.mode==='pulse'){
    const factor=1+(motion.amplitude*.35+audioEnergy*.35)*sin;
    for(let i=0;i<3;i++)scale[i]*=factor;
  }
  return {position,rotation,scale};
}
