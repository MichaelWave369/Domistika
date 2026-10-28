import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {MAX_SPATIAL_STROKES,emptySpatialScene,newSpatialStroke,extendSpatialStroke,readSpatialScene,writeSpatialScene} from './brushModel.js';

export const SPATIAL_STORE_KEY='domistika.xr.spatial.v1';
const vec=p=>new THREE.Vector3(...p);
const radiusFor=width=>Math.max(.0025,Math.min(.045,width*.00055));

function ribbonGeometry(points,radius){
  const vertices=[],indices=[];
  for(let i=0;i<points.length;i++){
    const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)];
    const tangent=b.clone().sub(a).normalize();
    const side=new THREE.Vector3(0,1,0).cross(tangent);
    if(side.lengthSq()<.00001)side.set(1,0,0).cross(tangent);
    side.normalize().multiplyScalar(radius*1.8);
    vertices.push(...points[i].clone().sub(side).toArray(),...points[i].clone().add(side).toArray());
    if(i){const k=i*2;indices.push(k-2,k-1,k,k-1,k+1,k);}
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}
function createStrokeObject(stroke){
  const points=stroke.points.map(vec),radius=radiusFor(stroke.width);
  const group=new THREE.Group();
  if(stroke.style==='spark'){
    const geom=new THREE.BufferGeometry().setFromPoints(points);
    group.add(new THREE.Points(geom,new THREE.PointsMaterial({
      color:stroke.color,size:radius*5,sizeAttenuation:true,transparent:true,
      opacity:.92,blending:THREE.AdditiveBlending,depthWrite:false
    })));
  }else if(stroke.style==='ribbon'&&points.length>1){
    group.add(new THREE.Mesh(ribbonGeometry(points,radius),new THREE.MeshBasicMaterial({
      color:stroke.color,side:THREE.DoubleSide,transparent:true,opacity:.95,depthWrite:false
    })));
  }else{
    const geom=points.length===1
      ?new THREE.SphereGeometry(radius,8,6)
      :new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.min((points.length-1)*3,1200),radius,5,false);
    const material=new THREE.MeshBasicMaterial({color:stroke.color,side:THREE.DoubleSide});
    group.add(new THREE.Mesh(geom,material));
    if(stroke.style==='neon'){
      const glow=points.length===1
        ?new THREE.SphereGeometry(radius*2.4,8,6)
        :new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.min((points.length-1)*3,1200),radius*2.4,5,false);
      group.add(new THREE.Mesh(glow,new THREE.MeshBasicMaterial({
        color:stroke.color,side:THREE.DoubleSide,transparent:true,opacity:.17,
        blending:THREE.AdditiveBlending,depthWrite:false
      })));
    }
  }
  if(stroke.mirror){
    const reflected=group.clone(true);
    reflected.scale.x=-1; // Mirror plane is the room's x=0 plane, not a camera-relative illusion.
    const pair=new THREE.Group();pair.add(group,reflected);return pair;
  }
  return group;
}
function disposeObject(object){
  const geometries=new Set(),materials=new Set();
  object.traverse(o=>{
    if(o.geometry)geometries.add(o.geometry);
    if(Array.isArray(o.material))o.material.forEach(m=>materials.add(m));
    else if(o.material)materials.add(o.material);
  });
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
export function createBrushStudio({scene,onStatus=()=>{},onCount=()=>{},storage=globalThis.localStorage}){
  const root=new THREE.Group();root.name='Domistika XR spatial paint';
  scene.add(root);
  let data=emptySpatialScene();
  const committed=[],redoStack=[],active=new Map();
  function redraw(){
    while(root.children.length){const child=root.children[0];root.remove(child);disposeObject(child);}
    committed.length=0;
    for(const stroke of data.strokes){const object=createStrokeObject(stroke);root.add(object);committed.push(object);}
    onCount(data.strokes.length);
  }
  try{const previous=storage?.getItem(SPATIAL_STORE_KEY);if(previous)data=readSpatialScene(previous);}
  catch(error){onStatus('3D sketch backup could not be read: '+error.message);}
  redraw();
  function save(){
    try{storage?.setItem(SPATIAL_STORE_KEY,writeSpatialScene(data));return true;}
    catch(error){onStatus('3D save failed: '+error.message+'. Export JSON for backup.');return false;}
  }
  function preview(state){
    if(state.preview){root.remove(state.preview);disposeObject(state.preview);}
    const points=state.stroke.points.map(vec);
    const geom=new THREE.BufferGeometry().setFromPoints(points);
    const line=new THREE.Line(geom,new THREE.LineBasicMaterial({color:state.stroke.color}));
    // A small glowing tip makes single-point strokes visible before the next sample.
    const tip=new THREE.Mesh(new THREE.SphereGeometry(radiusFor(state.stroke.width)*1.8,8,6),
      new THREE.MeshBasicMaterial({color:state.stroke.color}));
    tip.position.copy(points.at(-1));
    line.add(tip);
    state.preview=line;root.add(line);
  }
  function start(key,position,color,width,style,mirror){
    if(active.has(key))return false;
    if(data.strokes.length+active.size>=MAX_SPATIAL_STROKES){
      onStatus('3D limit reached (160 strokes). Export before clearing.');return false;
    }
    try{const state={stroke:newSpatialStroke(position,color,width,style,mirror),preview:null};active.set(key,state);preview(state);return true;}
    catch(error){onStatus('Cannot start 3D stroke: '+error.message);return false;}
  }
  function extend(key,position){
    const state=active.get(key);if(!state)return false;
    try{if(extendSpatialStroke(state.stroke,position)){preview(state);return true;}}
    catch(error){onStatus('3D sampling stopped: '+error.message);}
    return false;
  }
  function end(key){
    const state=active.get(key);if(!state)return;
    if(state.preview){root.remove(state.preview);disposeObject(state.preview);}
    active.delete(key);
    // Points are capped per stroke; release and press again to start another.
    data.strokes.push(state.stroke);
    const object=createStrokeObject(state.stroke);root.add(object);committed.push(object);
    redoStack.length=0;onCount(data.strokes.length);save();
  }
  function undo(){
    if(active.size){onStatus('Release the trigger before undo.');return;}
    if(!data.strokes.length)return;
    redoStack.push(data.strokes.pop());
    const object=committed.pop();root.remove(object);disposeObject(object);
    onCount(data.strokes.length);save();
  }
  function redo(){
    if(active.size||!redoStack.length||data.strokes.length>=MAX_SPATIAL_STROKES)return;
    const stroke=redoStack.pop();data.strokes.push(stroke);
    const object=createStrokeObject(stroke);root.add(object);committed.push(object);
    onCount(data.strokes.length);save();
  }
  function clear(){
    if(active.size)throw Error('Release the trigger first.');
    data=emptySpatialScene();redoStack.length=0;redraw();save();
  }
  function importJson(text){
    if(active.size)throw Error('Release the trigger before importing.');
    const next=readSpatialScene(text); // Validation before any existing creation is removed.
    data=next;redoStack.length=0;redraw();save();
  }
  async function exportGLB(){
    if(active.size)throw Error('Release the trigger before exporting.');
    if(!data.strokes.length)throw Error('No spatial strokes to export.');
    return new GLTFExporter().parseAsync(root,{binary:true,onlyVisible:true});
  }
  return {root,start,extend,end,undo,redo,clear,save,importJson,exportGLB,
    exportJson:()=>writeSpatialScene(data),count:()=>data.strokes.length,
    finishAll:()=>{for(const key of [...active.keys()])end(key);}};
}
