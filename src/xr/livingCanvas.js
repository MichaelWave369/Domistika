import * as THREE from 'three';
import {MAX_LIVING_PANELS,LIVING_PANEL_SIZE,initialLivingPose,clampLivingPose,adjustLivingPose} from './livingCanvasModel.js';

/**
 * Lift an existing Canvas2D drawing as a lightweight, reusable textured plane.
 * The source's CanvasTexture is shared, not copied, modified or disposed here.
 * Art panels are session-only, and never become Workshop or scene-v1 objects.
 */
export function createLivingCanvas({scene,textTexture}){
  if(!scene?.add||typeof textTexture!=='function')throw Error('Living Canvas requires a scene and label renderer.');
  const root=new THREE.Group();
  root.name='The Living Canvas (temporary art previews)';
  root.visible=false;
  scene.add(root);
  const panels=new Map();
  const held=new Map();
  let activeId=null;

  const deck=new THREE.Group();
  deck.name='Living Canvas controls';
  deck.position.set(2.12,1.55,-1.35);
  deck.rotation.y=-.24;
  root.add(deck);
  const backing=new THREE.Mesh(new THREE.PlaneGeometry(.92,2.02),
    new THREE.MeshBasicMaterial({color:0x12283b,side:THREE.DoubleSide,transparent:true,opacity:.95}));
  backing.position.z=-.018;backing.raycast=()=>{};deck.add(backing);
  const controls=[];
  const actions=[
    ['LIVING CANVAS',null],
    ['TURN LEFT','left'],['TURN RIGHT','right'],
    ['LARGER','larger'],['SMALLER','smaller'],
    ['MOVE NEAR','forward'],['MOVE FAR','back'],
    ['RESET PANEL','reset'],['NEXT ART','next'],['PUT BACK','return']
  ];
  for(const [i,[label,action]] of actions.entries()){
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.79,.15),
      new THREE.MeshBasicMaterial({map:textTexture(label,'#b2fff2'),side:THREE.DoubleSide}));
    mesh.position.set(0,.82-i*.183,.025);
    if(action){
      mesh.userData.action={type:'living-canvas',value:action};
      controls.push(mesh);
    }else mesh.raycast=()=>{};
    deck.add(mesh);
  }

  function setPose(panel,pose){
    const safe=clampLivingPose(pose);
    panel.group.position.fromArray(safe.position);
    panel.group.rotation.set(...safe.rotation);
    panel.group.scale.setScalar(safe.scale);
  }
  function poseOf(panel){
    return {
      position:panel.group.position.toArray(),
      rotation:[panel.group.rotation.x,panel.group.rotation.y,panel.group.rotation.z],
      scale:panel.group.scale.x
    };
  }
  function lift(id,render,name='Painting'){
    if(!id||!render?.texture)throw Error('Select an existing painting before lifting it.');
    if(panels.has(id)){activeId=id;return panels.get(id);}
    if(panels.size>=MAX_LIVING_PANELS)throw Error('Six floating paintings maximum. Return a panel first.');
    const group=new THREE.Group();
    group.name='Lifted painting: '+String(name).slice(0,60);
    const geometry=new THREE.PlaneGeometry(...LIVING_PANEL_SIZE);
    const underlay=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
      color:0xf7f3e8,side:THREE.DoubleSide
    }));
    underlay.position.z=-.02;underlay.raycast=()=>{};
    group.add(underlay);
    const art=new THREE.Mesh(geometry.clone(),new THREE.MeshBasicMaterial({
      map:render.texture,transparent:true,side:THREE.DoubleSide,depthWrite:false
    }));
    art.position.z=.015;
    art.name='Grab lifted painting';
    art.userData.livingCanvasId=id;
    group.add(art);
    const frameGeo=new THREE.EdgesGeometry(new THREE.BoxGeometry(
      LIVING_PANEL_SIZE[0]+.08,LIVING_PANEL_SIZE[1]+.08,.045));
    const frame=new THREE.LineSegments(frameGeo,new THREE.LineBasicMaterial({color:0xc5ab81}));
    frame.raycast=()=>{};group.add(frame);
    const panel={id,name:String(name).slice(0,60),group,art};
    root.add(group);
    setPose(panel,initialLivingPose(panels.size));
    panels.set(id,panel);
    activeId=id;
    return panel;
  }
  function release(id){
    const entry=held.get(id);if(!entry)return;
    if(entry.kind==='xr'){
      root.attach(entry.panel.group);
    }
    setPose(entry.panel,poseOf(entry.panel));
    held.delete(id);
  }
  function releaseAll(){for(const key of [...held.keys()])release(key);}
  function returnPanel(id=activeId){
    if(!panels.has(id))return false;
    for(const [key,entry] of held)if(entry.panel.id===id)release(key);
    const panel=panels.get(id);
    root.remove(panel.group);
    panel.group.traverse(mesh=>{
      mesh.geometry?.dispose();
      // Art material owns a reference to the source texture, not the texture.
      mesh.material?.dispose();
    });
    panels.delete(id);
    if(activeId===id)activeId=panels.keys().next().value??null;
    return true;
  }
  function clear(){releaseAll();for(const id of [...panels.keys()])returnPanel(id);}
  function select(id){
    if(!panels.has(id))return false;
    activeId=id;return true;
  }
  function next(){
    const ids=[...panels.keys()];
    if(!ids.length)return null;
    const index=ids.indexOf(activeId);
    activeId=ids[(index+1)%ids.length];
    return panels.get(activeId);
  }
  function adjust(action){
    if(action==='next')return next();
    if(action==='return')return returnPanel();
    const panel=panels.get(activeId);
    if(!panel)throw Error('Lift a painting first.');
    if([...held.values()].some(v=>v.panel===panel))throw Error('Release the painting before changing its settings.');
    if(action==='reset')setPose(panel,initialLivingPose([...panels.keys()].indexOf(activeId)));
    else setPose(panel,adjustLivingPose(poseOf(panel),action));
    return panel;
  }
  function hit(raycaster){
    if(!root.visible)return null;
    const hit=raycaster.intersectObjects([...panels.values()].map(p=>p.art),false)[0];
    if(!hit)return null;
    const panel=panels.get(hit.object.userData.livingCanvasId);
    return panel?{...hit,panel}:null;
  }
  function beginXR(index,controller,pick){
    if(!pick||held.has(index)||[...held.values()].some(v=>v.panel===pick.panel))return false;
    activeId=pick.panel.id;
    controller.attach(pick.panel.group);
    held.set(index,{kind:'xr',panel:pick.panel});
    return true;
  }
  function beginMouse(index,raycaster,camera,pick=hit(raycaster)){
    if(!pick||held.has(index)||[...held.values()].some(v=>v.panel===pick.panel))return false;
    const panel=pick.panel;
    activeId=panel.id;
    const normal=new THREE.Vector3();
    camera.getWorldDirection(normal);
    const plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,panel.group.position);
    const point=raycaster.ray.intersectPlane(plane,new THREE.Vector3());
    held.set(index,{
      kind:'mouse',panel,plane,
      offset:panel.group.position.clone().sub(point||panel.group.position)
    });
    return true;
  }
  function updateMouse(index,raycaster){
    const entry=held.get(index);
    if(!entry||entry.kind!=='mouse')return;
    const position=raycaster.ray.intersectPlane(entry.plane,new THREE.Vector3());
    if(position)entry.panel.group.position.copy(position.add(entry.offset));
  }
  function setRoom(room){root.visible=room==='spatial';}
  function dispose(){
    clear();scene.remove(root);
    deck.traverse(mesh=>{
      mesh.geometry?.dispose();
      mesh.material?.map?.dispose();
      mesh.material?.dispose();
    });
  }
  return {
    root,controls,lift,hit,beginXR,beginMouse,updateMouse,release,releaseAll,
    returnPanel,clear,select,next,adjust,setRoom,dispose,
    get count(){return panels.size;},
    get selected(){return panels.get(activeId)||null;},
    get all(){return [...panels.values()].map(p=>({id:p.id,name:p.name,pose:poseOf(p)}));},
    get active(){return held.size>0;}
  };
}
