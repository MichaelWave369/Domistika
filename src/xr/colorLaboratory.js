/**
 * Color Laboratory: deterministic artist-style RYB pigment approximation.
 * Not a measured model of real pigments; never uses network or storage.
 */
export const PIGMENTS=Object.freeze([
  Object.freeze({name:'Titanium white',color:'#ffffff'}),
  Object.freeze({name:'Carbon black',color:'#202125'}),
  Object.freeze({name:'Vermilion',color:'#e54b39'}),
  Object.freeze({name:'Cadmium yellow',color:'#f5d54c'}),
  Object.freeze({name:'Ultramarine',color:'#3756ba'}),
  Object.freeze({name:'Sap green',color:'#547b51'}),
  Object.freeze({name:'Burnt umber',color:'#87553c'}),
  Object.freeze({name:'Magenta',color:'#cf65a7'})
]);
export const CANVAS_BRUSHES=Object.freeze(['solid','dry','wash','marker']);
export const DEFAULT_MIX=Object.freeze({a:'#e54b39',b:'#3756ba',ratio:50});
const HEX=/^#[\da-f]{6}$/i;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function normalizePigment(value,fallback='#68e4ff'){
  return typeof value==='string'&&HEX.test(value)?value.toLowerCase():fallback;
}
export function normalizeBrush(brush){
  return CANVAS_BRUSHES.includes(brush)?brush:'solid';
}
export function normalizeMix(input={}){
  return {
    a:normalizePigment(input?.a,DEFAULT_MIX.a),
    b:normalizePigment(input?.b,DEFAULT_MIX.b),
    ratio:clamp(Number.isFinite(input?.ratio)?Math.round(input.ratio):DEFAULT_MIX.ratio,0,100)
  };
}
function fromHex(hex){
  const n=parseInt(hex.slice(1),16);
  return [(n>>16)&255,(n>>8)&255,n&255];
}
function toHex(channels){
  return '#'+channels.map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join('');
}
// Compact red-yellow-blue color-wheel conversion.
function rgbToRyb([r,g,b]){
  const white=Math.min(r,g,b);r-=white;g-=white;b-=white;
  const maximum=Math.max(r,g,b);
  let yellow=Math.min(r,g);r-=yellow;g-=yellow;
  if(b>0&&g>0){b/=2;g/=2;}
  yellow+=g;b+=g;
  const rybMax=Math.max(r,yellow,b);
  if(rybMax>0){const scale=maximum/rybMax;r*=scale;yellow*=scale;b*=scale;}
  return [r+white,yellow+white,b+white];
}
function rybToRgb([r,y,b]){
  const white=Math.min(r,y,b);r-=white;y-=white;b-=white;
  const maximum=Math.max(r,y,b);
  let green=Math.min(y,b);y-=green;b-=green;
  if(b>0&&green>0){b*=2;green*=2;}
  r+=y;green+=y;
  const rgbMax=Math.max(r,green,b);
  if(rgbMax>0){const scale=maximum/rgbMax;r*=scale;green*=scale;b*=scale;}
  return [r+white,green+white,b+white];
}
/** Ratio 0 = pigment A; 100 = pigment B. */
export function mixPigments(a,b,ratio=50){
  const first=normalizePigment(a,DEFAULT_MIX.a),second=normalizePigment(b,DEFAULT_MIX.b);
  const t=clamp(Number.isFinite(ratio)?ratio:50,0,100)/100;
  if(t===0)return first;
  if(t===1)return second;
  const left=rgbToRyb(fromHex(first)),right=rgbToRyb(fromHex(second));
  return toHex(rybToRgb(left.map((v,i)=>v*(1-t)+right[i]*t)));
}
