/** Portable, bounded 3D stroke format. Independent of the flat-canvas scene v1. */
export const SPATIAL_SCHEMA='domistika.xr.spatial.v1';
export const MAX_SPATIAL_STROKES=160;
export const MAX_SPATIAL_POINTS=700;
export const MAX_SPATIAL_BYTES=2_000_000;
export const SPATIAL_STYLES=Object.freeze(['neon','ribbon','spark']);
const colorOK=/^#[0-9a-f]{6}$/i;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function validatePoint(p){
  if(!Array.isArray(p)||p.length!==3||!p.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=25)){
    throw Error('Invalid 3D coordinate (expected finite x/y/z within 25 m).');
  }
  return [...p];
}
export function emptySpatialScene(){return {schema:SPATIAL_SCHEMA,strokes:[]};}
export function newSpatialStroke(position,color='#68e4ff',width=12,style='neon',mirror=false){
  return {color:colorOK.test(color)?color.toLowerCase():'#68e4ff',
    width:clamp(Number.isFinite(width)?width:12,2,80),
    style:SPATIAL_STYLES.includes(style)?style:'neon',mirror:!!mirror,
    points:[validatePoint(position)]};
}
export function extendSpatialStroke(stroke,position){
  if(!stroke||!Array.isArray(stroke.points)||stroke.points.length>=MAX_SPATIAL_POINTS)return false;
  const p=validatePoint(position),last=stroke.points.at(-1);
  if(last&&Math.hypot(p[0]-last[0],p[1]-last[1],p[2]-last[2])<.008)return false;
  stroke.points.push(p);return true;
}
export function sanitizeSpatialScene(input){
  if(!input||input.schema!==SPATIAL_SCHEMA||!Array.isArray(input.strokes)||input.strokes.length>MAX_SPATIAL_STROKES){
    throw Error('Invalid or unsupported spatial sketch format.');
  }
  return {schema:SPATIAL_SCHEMA,strokes:input.strokes.map(s=>{
    if(!s||!Array.isArray(s.points)||!s.points.length||s.points.length>MAX_SPATIAL_POINTS){
      throw Error('Invalid spatial stroke or point limit exceeded.');
    }
    if(typeof s.color!=='string'||!colorOK.test(s.color))throw Error('Invalid spatial color.');
    if(!Number.isFinite(s.width)||s.width<2||s.width>80)throw Error('Invalid spatial width.');
    if(!SPATIAL_STYLES.includes(s.style)||typeof s.mirror!=='boolean')throw Error('Invalid spatial brush style.');
    return {color:s.color.toLowerCase(),width:s.width,style:s.style,mirror:s.mirror,
      points:s.points.map(validatePoint)};
  })};
}
export function readSpatialScene(text){
  if(typeof text!=='string'||text.length>MAX_SPATIAL_BYTES)throw Error('Spatial sketch exceeds 2 MB.');
  return sanitizeSpatialScene(JSON.parse(text));
}
export function writeSpatialScene(data){
  const text=JSON.stringify(sanitizeSpatialScene(data));
  if(text.length>MAX_SPATIAL_BYTES)throw Error('Spatial sketch exceeds 2 MB. Export a smaller sketch.');
  return text;
}
