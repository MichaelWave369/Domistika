/**
 * Session-only ergonomics for the presentation easel. Canvas scenes keep their
 * original stored transforms and schema. All public values are bounded.
 */
export const DEFAULT_EASEL_FIT=Object.freeze({height:1.5,tilt:0,distance:1.33});
export const EASEL_FIT_BOUNDS=Object.freeze({
  height:Object.freeze([1.1,1.85]),
  tilt:Object.freeze([-25,25]), // degrees
  distance:Object.freeze([1.05,2.0])
});
export const EASEL_FIT_STEPS=Object.freeze({
  up:Object.freeze(['height',.05]),
  down:Object.freeze(['height',-.05]),
  'tilt-up':Object.freeze(['tilt',5]),
  'tilt-down':Object.freeze(['tilt',-5]),
  nearer:Object.freeze(['distance',-.1]),
  farther:Object.freeze(['distance',.1])
});
const clamp=(value,[min,max])=>Math.max(min,Math.min(max,value));
export function normalizeEaselFit(input={}){
  const result={};
  for(const [key,bounds] of Object.entries(EASEL_FIT_BOUNDS)){
    const value=input?.[key];
    result[key]=clamp(typeof value==='number'&&Number.isFinite(value)?value:DEFAULT_EASEL_FIT[key],bounds);
    result[key]=Math.round(result[key]*1000)/1000;
  }
  return result;
}
export function stepEaselFit(current,action){
  if(action==='reset')return {...DEFAULT_EASEL_FIT};
  const rule=EASEL_FIT_STEPS[action];
  if(!rule)throw Error('Unsupported easel adjustment.');
  const fit=normalizeEaselFit(current),[key,delta]=rule;
  return normalizeEaselFit({...fit,[key]:fit[key]+delta});
}
export function poseForEaselFit(input){
  const {height,tilt,distance}=normalizeEaselFit(input);
  return {position:[0,height,-distance],rotation:[tilt*Math.PI/180,0,0],scale:[1,1,1]};
}
