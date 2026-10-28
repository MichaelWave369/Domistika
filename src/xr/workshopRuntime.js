import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {emptyWorkshop,createWorkshopObject,createWorkshopMesh,validateWorkshop,readWorkshop,writeWorkshop,withTransform,snapPosition,snapAngle,WORKSHOP_STORE_KEY,WORKSHOP_MAX_OBJECTS} from './workshopModel.js';

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
const rotationFromMesh=mesh=>[mesh.rotation.x,mesh.rotation.y,mesh.rotation.z];
export function createWorkshop({scene,storage=globalThis.localStorage,onStatus=()=>{},onChange=()=>{},paintRoot=()=>null}){
  const root=new THREE.Group();root.name='Editable Domistika XR Workshop assembly';
  scene.add(root);
  let data=emptyWorkshop(),selectedId=null,gridStep=.25,angleStep=15;
  const meshes=new Map(),active=new Map();
  let selectionBox=null;
  const history=[],future=[];
  const get=id=>data.objects.find(o=>o.id===id);
  function selection(){
    if(selectionBox){scene.remove(selectionBox);selectionBox.geometry?.dispose();selectionBox.material?.dispose();selectionBox=null;}
    const mesh=meshes.get(selectedId);
    if(mesh){selectionBox=new THREE.BoxHelper(mesh,0xffd477);scene.add(selectionBox);}
  }
  function notify(){onChange({count:data.objects.length,selected:get(selectedId)||null,gridStep,angleStep});}
  function renderObject(o){
    const mesh=new THREE.Mesh(shapeGeometry(o),new THREE.MeshStandardMaterial({
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
    selection();notify();
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
      save();notify();
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
    add,select,insert,hit,beginController,updateController,beginMouse,updateMouse,finish,
    promoteFramefield,promoteCad,patchSelected,removeSelected,undo,redo,clear,save,importJson,
    exportJson:()=>writeWorkshop(data),exportGLB};
}
