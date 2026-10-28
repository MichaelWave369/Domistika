import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {emptyWorkshop,createWorkshopObject,createWorkshopMesh,validateWorkshop,readWorkshop,writeWorkshop,withTransform,snapPosition,snapAngle,WORKSHOP_STORE_KEY,WORKSHOP_MAX_OBJECTS} from './workshopModel.js';
import {duplicateObject,measureObjectCenters} from './objectLab.js';
import {linearPattern,radialPattern,alignObjectCenter} from './patternForge.js';

const clamp=THREE.MathUtils.clamp;
function shapeGeometry(o){
  const [x,y,z]=o.dimensions;
  switch(o.kind){
    case 'box':return new THREE.BoxGeometry(x,y,z);
    case 'sphere':return new THREE.SphereGeometry(x*.5,20,12);
    case 'cylinder':return new THREE.CylinderGeometry(x*.5,x*.5,y,20);
    case 'torus':return new THREE.TorusGeometry(x*.55,Math.min(x*.15,y*.3),9,28);
    case 'tube':return new THREE.TorusKnotGeometry(x*.36,Math.min(x*.10,y*.25),64,8,2,3);
    case 'mesh':{
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(o.positions,3));
      geometry.computeVertexNormals();return geometry;
    }
    default:throw Error('Unknown workshop geometry.');
  }
}
function disposeMesh(mesh){mesh.geometry.dispose();mesh.material.dispose();}
function mirroredGeometry(geometry){
  geometry.scale(-1,1,1);
  const index=geometry.getIndex();
  if(index){
    for(let i=0;i<index.count;i+=3){
      const a=index.getX(i+1),b=index.getX(i+2);
      index.setX(i+1,b);index.setX(i+2,a);
    }
    index.needsUpdate=true;
  }else{
    const attrs=Object.values(geometry.attributes);
    for(const attr of attrs){
      for(let i=0;i<attr.count;i+=3){
        for(let k=0;k<attr.itemSize;k++){
          const a=attr.array[(i+1)*attr.itemSize+k],b=attr.array[(i+2)*attr.itemSize+k];
          attr.array[(i+1)*attr.itemSize+k]=b;
          attr.array[(i+2)*attr.itemSize+k]=a;
        }
      }
      attr.needsUpdate=true;
    }
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
const rotationFromMesh=mesh=>[mesh.rotation.x,mesh.rotation.y,mesh.rotation.z];
export function createWorkshop({scene,storage=globalThis.localStorage,onStatus=()=>{},onChange=()=>{},paintRoot=()=>null}){
  const root=new THREE.Group();root.name='Editable Domistika XR Workshop assembly';
  scene.add(root);
  let data=emptyWorkshop(),selectedId=null,gridStep=.25,angleStep=15;
  const meshes=new Map(),active=new Map();
  let selectionBox=null,measurementPair=null,pendingMeasureId=null;
  const ruler=new THREE.Group();ruler.name='Workshop measurement overlay (not part of export)';scene.add(ruler);
  let measureInfo=null;
  const history=[],future=[];
  const get=id=>data.objects.find(o=>o.id===id);
  function selection(){
    if(selectionBox){scene.remove(selectionBox);selectionBox.geometry?.dispose();selectionBox.material?.dispose();selectionBox=null;}
    const mesh=meshes.get(selectedId);
    if(mesh){selectionBox=new THREE.BoxHelper(mesh,0xffd477);scene.add(selectionBox);}
  }
  function updateRuler(){
    while(ruler.children.length){
      const child=ruler.children[0];ruler.remove(child);
      child.geometry?.dispose();child.material?.map?.dispose();child.material?.dispose();
    }
    measureInfo=null;
    if(!measurementPair)return;
    const a=get(measurementPair[0]),b=get(measurementPair[1]);
    if(!a||!b){measurementPair=null;return;}
    measureInfo=measureObjectCenters(a,b);
    const first=new THREE.Vector3(...a.position),second=new THREE.Vector3(...b.position);
    const line=new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([first,second]),
      new THREE.LineBasicMaterial({color:0xffe49c,depthTest:false,transparent:true,opacity:.95}));
    line.renderOrder=10;ruler.add(line);
    const markerGeometry=new THREE.SphereGeometry(.035,8,6);
    const markerMaterial=new THREE.MeshBasicMaterial({color:0xffb970,depthTest:false});
    for(const pos of [first,second]){
      const marker=new THREE.Mesh(markerGeometry.clone(),markerMaterial.clone());
      marker.position.copy(pos);marker.renderOrder=11;ruler.add(marker);
    }
    markerGeometry.dispose();markerMaterial.dispose();
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext('2d');
    if(ctx){
      ctx.fillStyle='#0c1728';ctx.fillRect(0,0,512,128);
      ctx.strokeStyle='#ffc77b';ctx.lineWidth=5;ctx.strokeRect(3,3,506,122);
      ctx.fillStyle='#fff3d4';ctx.font='bold 43px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(measureInfo.distance.toFixed(3)+' m',256,64,475);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const badge=new THREE.Mesh(new THREE.PlaneGeometry(.72,.18),
        new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,side:THREE.DoubleSide}));
      badge.position.copy(first).add(second).multiplyScalar(.5).add(new THREE.Vector3(0,.17,0));
      badge.renderOrder=12;ruler.add(badge);
    }
  }
  function notify(){onChange({count:data.objects.length,objects:data.objects,
    selected:get(selectedId)||null,gridStep,angleStep,measure:measureInfo,pendingMeasureId});}
  function renderObject(o){
    const mesh=new THREE.Mesh(o.mirroredX?mirroredGeometry(shapeGeometry(o)):shapeGeometry(o),new THREE.MeshStandardMaterial({
      color:o.color,roughness:.56,metalness:.19,side:THREE.DoubleSide
    }));
    mesh.name=o.name;
    mesh.userData.workshopId=o.id;
    mesh.position.fromArray(o.position);
    mesh.rotation.set(...o.rotation);
    mesh.scale.fromArray(o.scale);
    mesh.castShadow=false;
    root.add(mesh);meshes.set(o.id,mesh);
    return mesh;
  }
  function rebuild(){
    if(active.size)throw Error('Release the controller trigger first.');
    if(selectionBox){scene.remove(selectionBox);selectionBox.geometry.dispose();selectionBox.material.dispose();selectionBox=null;}
    for(const mesh of meshes.values()){root.remove(mesh);disposeMesh(mesh);}
    meshes.clear();
    for(const item of data.objects)renderObject(item);
    if(!meshes.has(selectedId))selectedId=data.objects.at(-1)?.id||null;
    selection();updateRuler();notify();
  }
  function save(){
    try{storage?.setItem(WORKSHOP_STORE_KEY,writeWorkshop(data));return true;}
    catch(error){onStatus('Workshop local save failed: '+error.message+'. Export JSON.');return false;}
  }
  try{const saved=storage?.getItem(WORKSHOP_STORE_KEY);if(saved)data=readWorkshop(saved);}
  catch(error){onStatus('Workshop save was invalid, started empty: '+error.message);}
  rebuild();
  function snapshot(){history.push(writeWorkshop(data));if(history.length>25)history.shift();future.length=0;}
  function select(id){selectedId=meshes.has(id)?id:null;selection();notify();}
  function setMeasurement(a,b){
    if(active.size)throw Error('Release held objects before measuring.');
    if(!get(a)||!get(b)||a===b)throw Error('Choose two different workshop objects.');
    pendingMeasureId=null;measurementPair=[a,b];
    updateRuler();notify();
    return measureInfo;
  }
  function clearMeasurement(){
    measurementPair=null;pendingMeasureId=null;updateRuler();notify();
  }
  function measurePick(id){
    if(active.size)throw Error('Release held objects before measuring.');
    if(!get(id))throw Error('Point at an editable workshop object.');
    select(id);
    if(!pendingMeasureId){pendingMeasureId=id;measurementPair=null;updateRuler();notify();return null;}
    if(id===pendingMeasureId){onStatus('Now select a DIFFERENT object center.');return null;}
    return setMeasurement(pendingMeasureId,id);
  }
  function duplicateSelected(mirrorX=false){
    if(active.size)throw Error('Release held objects before duplicating.');
    const source=get(selectedId);if(!source)throw Error('Select a workshop object first.');
    return insert(duplicateObject(source,{mirrorX,snap:gridStep,offset:Math.max(.5,gridStep)}));
  }
  /** Commit all generated objects atomically, so an over-limit array leaves no partial scene. */
  function appendMany(objects){
    if(active.size)throw Error('Release held objects before creating a pattern.');
    if(!Array.isArray(objects)||!objects.length)throw Error('Pattern has no objects.');
    const candidate=validateWorkshop({schema:data.schema,objects:[...data.objects,...objects]});
    writeWorkshop(candidate);
    snapshot();
    data=candidate;
    selectedId=objects.at(-1).id;
    rebuild();
    save();
    return objects.length;
  }
  function patternSelected(type,options={}){
    if(active.size)throw Error('Release held objects before making patterns.');
    const source=get(selectedId);
    if(!source)throw Error('Select an editable workshop object first.');
    const fresh=type==='linear'?linearPattern(source,{...options,snap:gridStep}):
      type==='radial'?radialPattern(source,{...options,snap:gridStep}):null;
    if(!fresh)throw Error('Unknown pattern type.');
    return appendMany(fresh);
  }
  function alignSelected(targetId,axis='x'){
    if(active.size)throw Error('Release held objects before alignment.');
    const source=get(selectedId),target=get(targetId);
    if(!source||!target)throw Error('Select two editable workshop objects.');
    const result=alignObjectCenter(source,target,axis);
    patchSelected({position:result.position});
  }
  /** This is the real transformed mesh bounding box, not unrotated dimensions. */
  function floorSelected(){
    if(active.size)throw Error('Release held objects before aligning to floor.');
    const source=get(selectedId),mesh=meshes.get(selectedId);
    if(!source||!mesh)throw Error('Select an editable workshop object first.');
    mesh.updateWorldMatrix(true,false);
    const bounds=new THREE.Box3().setFromObject(mesh);
    if(bounds.isEmpty()||!Number.isFinite(bounds.min.y))throw Error('Cannot calculate floor contact.');
    const newY=source.position[1]-bounds.min.y;
    if(Math.abs(newY-source.position[1])<1e-8)return false;
    // Floor contact deliberately bypasses grid snapping to preserve zero Y clearance.
    patchSelected({position:[source.position[0],newY,source.position[2]]});
    return true;
  }
  function setSelectedAppearance({name,color}){
    const old=get(selectedId);if(!old)throw Error('Select a workshop object first.');
    patchSelected({name,color});
  }
  function insert(object){
    if(active.size)throw Error('Release held objects before adding.');
    if(data.objects.length>=WORKSHOP_MAX_OBJECTS)throw Error('Workshop object limit (48) reached.');
    const clean=validateWorkshop({schema:data.schema,objects:[...data.objects,object]});
    // Also check serialized browser cap before changing the original scene.
    writeWorkshop(clean);
    snapshot();data=clean;
    const mesh=renderObject(clean.objects.at(-1));select(mesh.userData.workshopId);save();
    return mesh;
  }
  function add(kind,color,position=[0,1.5,-2]){
    const item=createWorkshopObject(kind,color,snapPosition(position,gridStep));
    return insert(item);
  }
  function promoteFramefield(asset,sourceMesh){
    // This is a frozen static *copy of the inspected pose*, not a Framefield animation edit.
    if(!asset||!sourceMesh||!Array.isArray(asset.positions))throw Error('Load a Framefield BPC source first.');
    sourceMesh.updateWorldMatrix(true,false);
    const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
    sourceMesh.matrixWorld.decompose(p,q,s);
    if(s.toArray().some(v=>v<=0||v>8))throw Error('Unsupported mirrored or extreme source scale.');
    const e=new THREE.Euler().setFromQuaternion(q,'XYZ');
    return insert(createWorkshopMesh([...asset.positions],asset.color,asset.label,
      p.toArray(),[e.x,e.y,e.z],s.toArray()));
  }
  function promoteCad(sourceMesh,sourceName='OpenBlue wall'){
    if(!sourceMesh?.geometry?.parameters)throw Error('Select a previewed CAD wall first.');
    sourceMesh.updateWorldMatrix(true,false);
    const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
    sourceMesh.matrixWorld.decompose(p,q,s);
    const dims=sourceMesh.geometry.parameters;
    const o=createWorkshopObject('box','#65accf',p.toArray());
    const e=new THREE.Euler().setFromQuaternion(q,'XYZ');
    o.dimensions=[dims.width,dims.height,dims.depth];
    o.rotation=[e.x,e.y,e.z];o.scale=s.toArray();
    o.name=String(sourceName).slice(0,65);
    o.source={app:'OpenBlueprintStudio',ref:o.name};
    return insert(o);
  }
  function hit(raycaster){
    const intersection=raycaster.intersectObjects([...meshes.values()],false)[0];
    return intersection?{hit:intersection,id:intersection.object.userData.workshopId}:null;
  }
  function beginController(key,controller,raycaster,tool){
    if(active.has(key)||[...active.values()].some(s=>s.mode&&s.id===selectedId))return false;
    const found=hit(raycaster);if(!found)return false;
    const id=found.id;
    if([...active.values()].some(s=>s.id===id))return false;
    select(id);
    const mesh=meshes.get(id);
    controller.updateWorldMatrix(true,false);
    const position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3();
    controller.matrixWorld.decompose(position,quaternion,scale);
    const initialQuaternion=mesh.quaternion.clone();
    const state={id,key,mode:tool,controller,controllerStart:position.clone(),controllerQuat:quaternion.clone(),
      offset:mesh.position.clone().sub(position),initialPosition:mesh.position.clone(),initialQuaternion,
      initialScale:mesh.scale.clone(),dirty:false};
    active.set(key,state);return true;
  }
  function updateController(key){
    const state=active.get(key);if(!state)return;
    const mesh=meshes.get(state.id);if(!mesh)return;
    state.controller.updateWorldMatrix(true,false);
    const position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3();
    state.controller.matrixWorld.decompose(position,quaternion,scale);
    if(state.mode==='move')mesh.position.copy(position).add(state.offset);
    if(state.mode==='rotate'){
      const delta=quaternion.clone().multiply(state.controllerQuat.clone().invert());
      mesh.quaternion.copy(delta.multiply(state.initialQuaternion));
    }
    if(state.mode==='scale'){
      const factor=Math.exp((position.y-state.controllerStart.y)*1.3);
      mesh.scale.copy(state.initialScale).multiplyScalar(clamp(factor,.12,6));
    }
    state.dirty=true;if(selectionBox)selectionBox.update();
  }
  function beginMouse(key,raycaster,camera,tool,point){
    if(active.size)return false;
    const found=hit(raycaster);if(!found)return false;
    const id=found.id;select(id);
    const mesh=meshes.get(id);
    const normal=camera.getWorldDirection(new THREE.Vector3());
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,mesh.position);
    const at=raycaster.ray.intersectPlane(plane,new THREE.Vector3());
    active.set(key,{id,key,mode:tool,plane,offset:mesh.position.clone().sub(at||mesh.position),
      x:point.x,y:point.y,initial:mesh.position.clone(),dirty:false});
    return true;
  }
  function updateMouse(key,raycaster,point){
    const state=active.get(key);if(!state)return;
    const mesh=meshes.get(state.id);if(!mesh)return;
    const dx=point.x-state.x,dy=point.y-state.y;state.x=point.x;state.y=point.y;
    if(state.mode==='move'){
      const at=raycaster.ray.intersectPlane(state.plane,new THREE.Vector3());
      if(at)mesh.position.copy(at).add(state.offset);
    }
    if(state.mode==='rotate'){mesh.rotation.y+=dx*.012;mesh.rotation.x+=dy*.01;}
    if(state.mode==='scale')mesh.scale.multiplyScalar(Math.exp(dx*.009));
    state.dirty=true;if(selectionBox)selectionBox.update();
  }
  function finish(key){
    const state=active.get(key);if(!state)return;
    active.delete(key);
    const mesh=meshes.get(state.id),original=get(state.id);
    if(!mesh||!original)return;
    try{
      const snapped=snapPosition(mesh.position.toArray(),gridStep);
      const angles=rotationFromMesh(mesh).map(a=>snapAngle(a,angleStep));
      const candidate=withTransform(original,{
        position:snapped,rotation:angles,scale:mesh.scale.toArray()
      });
      // Validate *whole* project and disk bounds before committing.
      const newScene=validateWorkshop({schema:data.schema,objects:data.objects.map(o=>o.id===candidate.id?candidate:o)});
      writeWorkshop(newScene);
      if(state.dirty){snapshot();data=newScene;}
      mesh.position.fromArray(candidate.position);mesh.rotation.set(...candidate.rotation);mesh.scale.fromArray(candidate.scale);
      updateRuler();save();notify();
    }catch(error){
      mesh.position.fromArray(original.position);mesh.rotation.set(...original.rotation);mesh.scale.fromArray(original.scale);
      onStatus('Transform rejected; reverted: '+error.message);
    }
    if(selectionBox)selectionBox.update();
  }
  function patchSelected(patch){
    if(active.size)throw Error('Release the trigger before editing numeric dimensions.');
    const old=get(selectedId);if(!old)throw Error('Select a workshop object first.');
    const next=withTransform(old,patch);
    const candidate=validateWorkshop({schema:data.schema,objects:data.objects.map(o=>o.id===selectedId?next:o)});
    writeWorkshop(candidate);snapshot();data=candidate;rebuild();save();
  }
  function removeSelected(){
    if(active.size)throw Error('Release held objects before deleting.');
    if(!get(selectedId))return;
    snapshot();data.objects=data.objects.filter(o=>o.id!==selectedId);rebuild();save();
  }
  function undo(){
    if(active.size)throw Error('Release held objects before undo.');
    if(!history.length)return;
    future.push(writeWorkshop(data));data=readWorkshop(history.pop());rebuild();save();
  }
  function redo(){
    if(active.size)throw Error('Release held objects before redo.');
    if(!future.length)return;
    history.push(writeWorkshop(data));data=readWorkshop(future.pop());rebuild();save();
  }
  function importJson(text){
    if(active.size)throw Error('Release held objects before importing.');
    const next=readWorkshop(text);snapshot();data=next;rebuild();save();
  }
  function clear(){
    if(active.size)throw Error('Release held objects before clearing.');
    snapshot();data=emptyWorkshop();rebuild();save();
  }
  async function exportGLB(){
    if(active.size)throw Error('Release the trigger before GLB export.');
    if(!data.objects.length)throw Error('Add a workshop object first.');
    const assembly=new THREE.Group();
    const copy=root.clone(true);assembly.add(copy);
    // Include independent air-brush strokes as a visual copy, not in the workshop editable JSON.
    const paint=paintRoot();
    if(paint)assembly.add(paint.clone(true));
    return new GLTFExporter().parseAsync(assembly,{binary:true,onlyVisible:true});
  }
  return {root,get selected(){return get(selectedId)||null;},get grid(){return gridStep;},
    get rotationSnap(){return angleStep;},get count(){return data.objects.length;},
    get all(){return data.objects.map(o=>({...o}));},
    get meshes(){return meshes;},get active(){return active.size>0;},
    setSnap(step,degrees){gridStep=step;angleStep=degrees;notify();},
    get measure(){return measureInfo;},get pendingMeasureId(){return pendingMeasureId;},
    add,select,insert,hit,beginController,updateController,beginMouse,updateMouse,finish,
    promoteFramefield,promoteCad,patchSelected,removeSelected,duplicateSelected,setSelectedAppearance,
    appendMany,patternSelected,alignSelected,floorSelected,
    setMeasurement,clearMeasurement,measurePick,undo,redo,clear,save,importJson,
    exportJson:()=>writeWorkshop(data),exportGLB};
}
