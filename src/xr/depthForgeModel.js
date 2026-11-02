/**
 * Session-only, bounded Depth Forge settings. True parallax comes from
 * real separate translucent planes, not a stereoscopic image effect.
 */
export const DEPTH_DEFAULT_GAP=.055; // meters per visible layer
export const DEPTH_MIN_GAP=.01;
export const DEPTH_MAX_GAP=.15;
export const DEPTH_STEP=.015;
const clamp=(n,a,b)=>Math.max(a,Math.min(n,b));
export function normalizeDepthGap(value){
  const n=typeof value==='number'&&Number.isFinite(value)?value:DEPTH_DEFAULT_GAP;
  return Math.round(clamp(n,DEPTH_MIN_GAP,DEPTH_MAX_GAP)*1000)/1000;
}
export function changeDepthGap(current,action){
  if(action==='depth-reset')return DEPTH_DEFAULT_GAP;
  if(action==='depth-more')return normalizeDepthGap(normalizeDepthGap(current)+DEPTH_STEP);
  if(action==='depth-less')return normalizeDepthGap(normalizeDepthGap(current)-DEPTH_STEP);
  throw Error('Unknown depth adjustment.');
}
export function layerDepths(layerCount,gap=DEPTH_DEFAULT_GAP){
  if(!Number.isInteger(layerCount)||layerCount<0||layerCount>8)
    throw Error('Invalid depth layer count.');
  const step=normalizeDepthGap(gap);
  return Array.from({length:layerCount},(_,i)=>Math.round((.02+i*step)*1000)/1000);
}
