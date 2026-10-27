/**
 * BPC Framefield → Domistika XR: read-only, bounded polygon preview.
 * Does not touch domistika.xr.scene.v1 or claim native editor interchange.
 * Requires an explicit local bpc.spatial-preview.v1 packet created in the BPC Bridge Lab.
 */
export const BPC_PREVIEW_SCHEMA='bpc.spatial-preview.v1';
// Framefield src/mesh.js transformVertex applies X then Y then Z rotations.
// In Three.js that is Euler 'ZYX' (matrix Rz * Ry * Rx), not default 'XYZ'.
export const FRAMEFIELD_EULER_ORDER='ZYX';
export const BPC_PREVIEW_MAX_BYTES=5*1024*1024;
export const BPC_PREVIEW_MAX_OBJECTS=12;
export const BPC_PREVIEW_MAX_VERTICES=3500;
export const BPC_PREVIEW_MAX_TRIANGLES=9000;
const HEX=/^#[0-9a-f]{6}$/i;
const EPS=1e-7;
function fail(reason){throw new Error(reason);}
function object(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))fail('Invalid '+label+'.');
  return value;
}
function between(value,min,max,label){
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail('Invalid '+label+'.');
  return value;
}
function vector(value,dim,min,max,label){
  if(!Array.isArray(value)||value.length!==dim)fail('Invalid '+label+'.');
  return value.map((v,i)=>between(v,min,max,label+' '+i));
}
function list(value,min,max,label){
  if(!Array.isArray(value)||value.length<min||value.length>max)fail('Invalid '+label+' count.');
  return value;
}
function integer(value,min,max,label){
  between(value,min,max,label);
  if(!Number.isInteger(value))fail('Invalid integer '+label+'.');
  return value;
}
function minus(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
function length(a){return Math.hypot(...a);}

/** Only planar, convex polygon source faces are supported; no guessed triangulation of concave geometry. */
export function triangulatePreview(vertices,faces){
  const triangles=[];
  for(const [fi,face] of faces.entries()){
    const p=face.map(i=>vertices[i]);
    // Newell normal is stable for convex planar polygons including quads.
    const raw=[0,0,0];
    for(let i=0;i<p.length;i++){
      const a=p[i],b=p[(i+1)%p.length];
      raw[0]+=(a[1]-b[1])*(a[2]+b[2]);
      raw[1]+=(a[2]-b[2])*(a[0]+b[0]);
      raw[2]+=(a[0]-b[0])*(a[1]+b[1]);
    }
    const magnitude=length(raw);
    if(magnitude<EPS)fail('Degenerate mesh face '+fi+'.');
    const normal=raw.map(x=>x/magnitude);
    const origin=p[0];
    for(const vertex of p){
      if(Math.abs(dot(minus(vertex,origin),normal))>0.001)
        fail('Mesh face '+fi+' is not planar; cannot preview it without altering geometry.');
    }
    for(let i=0;i<p.length;i++){
      const first=minus(p[(i+1)%p.length],p[i]);
      const second=minus(p[(i+2)%p.length],p[(i+1)%p.length]);
      if(dot(cross(first,second),normal)<-EPS)
        fail('Mesh face '+fi+' is concave or self-crossing; use a supported triangulated mesh.');
    }
    for(let i=1;i<face.length-1;i++){
      if(length(cross(minus(p[i],p[0]),minus(p[i+1],p[0])))<EPS)
        fail('Mesh face '+fi+' contains degenerate triangles.');
      for(const index of [0,i,i+1])triangles.push(...p[index]);
    }
  }
  return triangles;
}
function geometry(source,objectName){
  object(source,'mesh');
  if(source.representation!=='editable-source-cage')
    fail(objectName+' has a primitive reference. Convert to Editable Mesh in Framefield before exporting.');
  const vertices=list(source.vertices,3,800,'vertices').map((v,i)=>
    vector(v,3,-30,30,'mesh vertex '+i));
  const faces=list(source.faces,1,1200,'faces').map((f,i)=>{
    const indices=list(f,3,16,'face '+i).map(v=>integer(v,0,vertices.length-1,'face index'));
    if(new Set(indices).size!==indices.length)fail('Duplicate vertex index in face '+i+'.');
    return indices;
  });
  return {vertices,faces,positions:triangulatePreview(vertices,faces)};
}
function initialPose(value){
  const keys=list(value,1,600,'keyframes').map(key=>{
    object(key,'keyframe');
    const frame=integer(key.frame,0,600,'frame');
    const pose={frame,position:vector(key.position,3,-30,30,'position'),
      rotationRadians:vector(key.rotationRadians,3,-100,100,'radian rotation'),
      scale:vector(key.scale,3,-30,30,'scale')};
    if(pose.scale.some(s=>Math.abs(s)<0.001))fail('Non-invertible keyframe scale.');
    if(key.curves!==undefined){
      const curves=object(key.curves,'keyframe curves');
      if(Object.keys(curves).length>9)fail('Too many curve channels.');
      pose.curves={};
      for(const [channel,curve] of Object.entries(curves)){
        if(!/^(position|rotation|scale)\.[012]$/.test(channel))
          fail('Unsupported Framefield animation curve channel.');
        if(curve==='hold')pose.curves[channel]='hold';
        else pose.curves[channel]=vector(curve,4,0,1,'Bezier curve');
      }
    }
    return pose;
  });
  const frameIds=keys.map(k=>k.frame);
  if(new Set(frameIds).size!==frameIds.length)fail('Duplicate keyframe.');
  keys.sort((a,b)=>a.frame-b.frame);
  return {first:keys[0],keys};
}
function inspectObject(asset){
  object(asset,'asset');
  if(asset.kind!=='framefield-object')fail('Only Framefield polygon assets are supported.');
  const label=String(asset.label??'').slice(0,65)||'Untitled mesh';
  if(typeof asset.color!=='string'||!HEX.test(asset.color))fail('Invalid mesh color.');
  const modifierList=list(asset.modifiers??[],0,4,'modifiers');
  for(const mod of modifierList){
    object(mod,'modifier');
    if(!['mirror','subdivide'].includes(mod.type))fail('Unsupported mesh modifier.');
    if(mod.enabled!==false)
      fail(label+' has enabled modifiers. Disable/bake in Framefield before preview; BPC exports source cages only.');
  }
  const geometryData=geometry(asset.mesh,label);
  const {first:pose,keys:keyframes}=initialPose(asset.keyframes);
  return {label,sourceId:String(asset.sourceId??'').slice(0,80),color:asset.color.toLowerCase(),
    positions:geometryData.positions,sourceVertexCount:geometryData.vertices.length,
    triangleCount:geometryData.positions.length/9,pose,keyframes,visible:asset.visible!==false};
}
export function normalizeBpcFramefieldPacket(raw){
  object(raw,'BPC packet');
  if(raw.schema!==BPC_PREVIEW_SCHEMA||raw.purpose!=='inspection-only')
    fail('Unsupported BPC preview schema.');
  if(raw.source?.format!=='framefield.scene.v1')
    fail('Select a Framefield source in the BPC Bridge Lab and export its preview.');
  if(raw.coordinateSpace!=='source-native')fail('Unknown source coordinate space.');
  const permissions=object(raw.permissions,'authority declarations');
  const expected=['execute','importIntoEditor','publish','render'];
  if(Object.keys(permissions).sort().join(',')!==expected.join(',')||
    expected.some(key=>permissions[key]!==false))
    fail('BPC packet must explicitly deny execution, editor import, rendering and publication.');
  const assets=list(raw.assets,1,BPC_PREVIEW_MAX_OBJECTS,'preview assets');
  if(raw.source.sourceObjectCount!==assets.length)fail('BPC source asset count mismatch.');
  const normalized=assets.map(inspectObject);
  const vertices=normalized.reduce((n,a)=>n+a.sourceVertexCount,0);
  const triangles=normalized.reduce((n,a)=>n+a.triangleCount,0);
  if(vertices>BPC_PREVIEW_MAX_VERTICES||triangles>BPC_PREVIEW_MAX_TRIANGLES)
    fail('Quest preview geometry budget exceeded. Reduce meshes in Framefield.');
  // Older BPC preview fixtures may omit FPS/duration. Use explicit conservative defaults
  // without altering their original source files.
  const fps=raw.source.fps===undefined?24:integer(raw.source.fps,12,60,'FPS');
  if(![12,24,30,60].includes(fps))fail('Unsupported Framefield FPS.');
  const lastFrame=Math.max(0,...normalized.map(asset=>asset.keyframes.at(-1).frame));
  const duration=raw.source.duration===undefined?Math.max(12,lastFrame):integer(raw.source.duration,12,600,'duration');
  if(duration>600||normalized.some(asset=>asset.keyframes.some(key=>key.frame>duration)))
    fail('Keyframes exceed project duration.');
  return {schema:BPC_PREVIEW_SCHEMA,sourceName:String(raw.source.projectName??'Framefield').slice(0,80),
    assets:normalized,vertices,triangles,fps,duration,
    assumedTiming:raw.source.fps===undefined||raw.source.duration===undefined,
    limits:'Read-only transform animation preview. No modifier baking, asset edits, scene persistence or publishing.'};
}
export function readBpcFramefieldPreview(text){
  if(typeof text!=='string')fail('Choose a JSON preview file.');
  if(new TextEncoder().encode(text).byteLength>BPC_PREVIEW_MAX_BYTES)
    fail('BPC preview file exceeds 5 MiB.');
  let raw;
  try{raw=JSON.parse(text);}catch{fail('BPC preview is not valid JSON.');}
  return normalizeBpcFramefieldPacket(raw);
}


// Match Framefield Studio scene.js easing: curves live on the outgoing keyframe,
// each axis has its own interpolation, and explicit hold preserves the preceding pose.
const mix=(a,b,t)=>a+(b-a)*t;
const bezier=(t,p1,p2)=>{const s=1-t;return 3*s*s*t*p1+3*s*t*t*p2+t*t*t;};
export function framefieldEase(t,curve){
  t=Math.max(0,Math.min(1,t));
  if(t===0||t===1)return t;
  if(curve==='hold')return 0;
  if(!Array.isArray(curve)||curve.length!==4)return t;
  const [x1,y1,x2,y2]=curve;
  if(x1===0&&y1===0&&x2===1&&y2===1)return t;
  let low=0,high=1;
  for(let i=0;i<28;i++){
    const mid=(low+high)/2;
    if(bezier(mid,x1,x2)<t)low=mid;else high=mid;
  }
  return bezier((low+high)/2,y1,y2);
}
/** Sample only transform channels, not geometry, at a possibly fractional frame. */
export function sampleFramefieldPose(keyframes,frame){
  if(!Array.isArray(keyframes)||keyframes.length===0)fail('Missing animation keyframes.');
  if(typeof frame!=='number'||!Number.isFinite(frame))fail('Invalid playback frame.');
  const snapshot=k=>({position:[...k.position],rotationRadians:[...k.rotationRadians],scale:[...k.scale]});
  if(frame<=keyframes[0].frame)return snapshot(keyframes[0]);
  const last=keyframes.at(-1);
  if(frame>=last.frame)return snapshot(last);
  for(let i=0;i<keyframes.length-1;i++){
    const a=keyframes[i],b=keyframes[i+1];
    if(frame>=a.frame&&frame<=b.frame){
      const t=(frame-a.frame)/(b.frame-a.frame);
      const channels=[['position','position'],['rotationRadians','rotation'],['scale','scale']];
      return Object.fromEntries(channels.map(([field,channel])=>[
        field,a[field].map((value,axis)=>mix(value,b[field][axis],framefieldEase(t,a.curves?.[channel+'.'+axis])))
      ]));
    }
  }
  return snapshot(last);
}
