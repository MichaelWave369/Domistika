/** Local-first editable assembly model; never modifies Framefield/OpenBlue source files. */
export const WORKSHOP_SCHEMA='domistika.xr.workshop.v1';
export const WORKSHOP_STORE_KEY='domistika.xr.workshop.v1';
export const WORKSHOP_MAX_BYTES=2_000_000;
export const WORKSHOP_MAX_OBJECTS=48;
export const WORKSHOP_MAX_TRIANGLES=6000;
export const WORKSHOP_TYPES=['box','sphere','cylinder','torus','tube','mesh'];
const hex=/^#[0-9a-f]{6}$/i;
const finite=(x,min,max,label)=>{
  if(typeof x!=='number'||!Number.isFinite(x)||x<min||x>max)throw Error('Invalid '+label);
  return x;
};
const array=(x,n,min,max,label)=>{
  if(!Array.isArray(x)||x.length!==n)throw Error('Invalid '+label);
  return x.map(v=>finite(v,min,max,label));
};
const makeId=()=>('work-'+Math.random().toString(36).slice(2,10)+'-'+Date.now().toString(36));
export const emptyWorkshop=()=>({schema:WORKSHOP_SCHEMA,objects:[]});
export const snapValue=(value,step=0)=>step>0?Math.round(value/step)*step:value;
export function snapPosition(position,step=0){return position.map(v=>snapValue(v,step));}
export function snapAngle(radians,degrees=0){return snapValue(radians,degrees*Math.PI/180);}
export function createWorkshopObject(kind,color='#68e4ff',position=[0,1.5,-1.5]){
  if(!WORKSHOP_TYPES.includes(kind)||kind==='mesh')throw Error('Unsupported workshop primitive.');
  return {id:makeId(),name:kind[0].toUpperCase()+kind.slice(1),kind,color,
    position:[...position],rotation:[0,0,0],scale:[1,1,1],source:null};
}
/** Meshes are explicit local editable COPIES of validated BPC preview triangles.
 *  Source IDs are labels only, never a claim of geometry preservation or rights. */
export function createWorkshopMesh(positions,color,sourceName='Framefield snapshot',position=[0,1.5,-1.5],rotation=[0,0,0],scale=[1,1,1]){
  const result={id:makeId(),name:String(sourceName).slice(0,65),kind:'mesh',color,
    position:[...position],rotation:[...rotation],scale:[...scale],
    source:{app:'FramefieldStudio',ref:String(sourceName).slice(0,80)},positions};
  return validateObject(result);
}
export function validateObject(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid workshop object.');
  if(typeof input.id!=='string'||!/^work-[a-z0-9-]{4,65}$/.test(input.id))throw Error('Invalid workshop ID.');
  if(typeof input.name!=='string'||input.name.length>65)throw Error('Invalid workshop object name.');
  if(!WORKSHOP_TYPES.includes(input.kind))throw Error('Unknown workshop object type.');
  if(typeof input.color!=='string'||!hex.test(input.color))throw Error('Invalid workshop color.');
  const position=array(input.position,3,-25,25,'position');
  const rotation=array(input.rotation,3,-Math.PI*8,Math.PI*8,'rotation');
  const scale=array(input.scale,3,.1,8,'scale');
  let positions;
  if(input.kind==='mesh'){
    const p=input.positions;
    if(!Array.isArray(p)||p.length<9||p.length>10800||p.length%9!==0)throw Error('Invalid mesh triangle array.');
    positions=p.map(v=>finite(v,-30,30,'mesh coordinate'));
  }else if(input.positions!==undefined)throw Error('Unexpected mesh geometry on primitive.');
  let source=null;
  if(input.source!==null&&input.source!==undefined){
    if(!input.source||input.source.app!=='FramefieldStudio'||typeof input.source.ref!=='string'||input.source.ref.length>80)
      throw Error('Invalid source label.');
    source={app:'FramefieldStudio',ref:input.source.ref};
  }
  return {id:input.id,name:input.name,kind:input.kind,color:input.color.toLowerCase(),
    position,rotation,scale,source,...(positions?{positions}:{})};
}
export function validateWorkshop(input){
  if(!input||input.schema!==WORKSHOP_SCHEMA||!Array.isArray(input.objects)||input.objects.length>WORKSHOP_MAX_OBJECTS)
    throw Error('Invalid or oversized workshop scene.');
  const objects=input.objects.map(validateObject);
  if(new Set(objects.map(o=>o.id)).size!==objects.length)throw Error('Duplicate workshop ID.');
  const triangles=objects.reduce((sum,o)=>sum+(o.kind==='mesh'?o.positions.length/9:0),0);
  if(triangles>WORKSHOP_MAX_TRIANGLES)throw Error('Workshop triangle budget exceeded.');
  return {schema:WORKSHOP_SCHEMA,objects};
}
export function readWorkshop(text){
  if(typeof text!=='string'||text.length>WORKSHOP_MAX_BYTES)throw Error('Workshop JSON exceeds 2 MB.');
  return validateWorkshop(JSON.parse(text));
}
export function writeWorkshop(data){
  const text=JSON.stringify(validateWorkshop(data));
  if(text.length>WORKSHOP_MAX_BYTES)throw Error('Workshop JSON exceeds 2 MB.');
  return text;
}
/** Authoritative transform validator: never silently clamp imported data. */
export function withTransform(object,patch){return validateObject({...object,...patch});}
export const formatMeters=v=>Number(v).toFixed(3)+' m';
