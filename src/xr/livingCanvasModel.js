/**
 * Presentation-only art panels. No persisted project data, generated depth,
 * or import/export schema changes. All user-facing transformations are bounded.
 */
export const MAX_LIVING_PANELS=6;
export const LIVING_PANEL_SIZE=Object.freeze([1.6,1.125]);
export const LIVING_PANEL_LIMITS=Object.freeze({
  x:Object.freeze([-4,4]),y:Object.freeze([.6,3.1]),z:Object.freeze([-5,-.65]),
  scale:Object.freeze([.45,2.0])
});
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
export function initialLivingPose(index=0){
  const n=Math.min(MAX_LIVING_PANELS-1,Math.max(0,Math.floor(Number.isFinite(index)?index:0)));
  return {
    position:[(n-2)*.62,1.55,-2.45-Math.floor(n/3)*.35],
    rotation:[0,0,0],
    scale:1
  };
}
export function clampLivingPose(input={}){
  const defaults=initialLivingPose();
  const position=LIVING_PANEL_LIMITS;
  const safe=(val,fallback,[min,max])=>clamp(typeof val==='number'&&Number.isFinite(val)?val:fallback,min,max);
  return {
    position:[
      safe(input.position?.[0],defaults.position[0],position.x),
      safe(input.position?.[1],defaults.position[1],position.y),
      safe(input.position?.[2],defaults.position[2],position.z)
    ],
    rotation:[0,1,2].map(i=>
      safe(input.rotation?.[i],0,[-Math.PI*4,Math.PI*4])
    ),
    scale:safe(input.scale,1,position.scale)
  };
}
export function adjustLivingPose(source,action){
  const input=clampLivingPose(source);
  if(action==='reset')return initialLivingPose(0);
  if(action==='left')input.rotation[1]-=Math.PI/12;
  else if(action==='right')input.rotation[1]+=Math.PI/12;
  else if(action==='larger')input.scale*=1.15;
  else if(action==='smaller')input.scale/=1.15;
  else if(action==='forward')input.position[2]+=.15;
  else if(action==='back')input.position[2]-=.15;
  else throw Error('Unknown art panel action.');
  return clampLivingPose(input);
}
