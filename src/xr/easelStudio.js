import * as THREE from 'three';
import {DEFAULT_EASEL_FIT,normalizeEaselFit,stepEaselFit,poseForEaselFit} from './easelFit.js';

/**
 * Reversible, presentation-only easel. Editable board strokes remain in the
 * existing Domistika XR scene v1; no new project schema or storage is needed.
 * Hand tracking is not required: the current controller ray is the paintbrush.
 */
export const EASEL_COLORS=Object.freeze([
  '#ffffff','#171923','#ff5470','#ffb84d',
  '#ffe889','#54ce8c','#57bfff','#bb82f2'
]);
export const EASEL_POSE=Object.freeze({position:[0,1.5,-1.33],rotation:[0,0,0],scale:[1,1,1]});

export function createEaselStudio({scene}){
  const stage=new THREE.Group();
  stage.name='Artist Easel (presentation only)';
  stage.visible=false;
  scene.add(stage);
  const actionMeshes=[];
  let fit={...DEFAULT_EASEL_FIT};
  const boardSupport=new THREE.Group();
  boardSupport.name='Adjustable easel painting support';
  stage.add(boardSupport);
  const wood=new THREE.MeshStandardMaterial({color:0x986941,roughness:.9});
  const edge=new THREE.MeshStandardMaterial({color:0x56331e,roughness:.87});
  const brass=new THREE.MeshStandardMaterial({color:0xd0a869,metalness:.45,roughness:.5});
  function beam(a,b,wide,deep,material=wood){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
    const vector=end.clone().sub(start);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(wide,vector.length(),deep),material);
    mesh.position.copy(start).add(end).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vector.normalize());
    mesh.castShadow=false;mesh.receiveShadow=false;
    stage.add(mesh);
    return mesh;
  }
  // A-frame legs, rear support, top clamp and lower ledge.
  beam([-.68,.04,-1.62],[-.53,2.33,-1.56],.085,.11);
  beam([.68,.04,-1.62],[.53,2.33,-1.56],.085,.11);
  beam([0,.04,-2.06],[0,2.15,-1.62],.09,.10,edge);
  beam([-.71,1.02,-1.54],[.71,1.02,-1.54],.105,.10,edge);
  beam([0,2.25,-1.51],[0,2.43,-1.51],.22,.10,brass);
  // Ledge is in front of the selected canvas, without obstructing painting.
  const tray=new THREE.Mesh(new THREE.BoxGeometry(1.76,.07,.18),wood);
  tray.position.set(0,-.62,.095);boardSupport.add(tray);
  const back=new THREE.Mesh(new THREE.BoxGeometry(1.79,1.29,.045),edge);
  back.position.set(0,0,-.073);boardSupport.add(back);
  // The palette is a real raycastable control in XR rather than an HTML overlay.
  const palette=new THREE.Mesh(new THREE.SphereGeometry(1,24,14),wood);
  palette.scale.set(.42,.33,.045);palette.position.set(-1.18,1.28,-1.1);
  stage.add(palette);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.075,.018,8,20),brass);
  ring.position.set(-1.38,1.2,-1.034);stage.add(ring);
  for(const [i,color] of EASEL_COLORS.entries()){
    const col=i%4,row=Math.floor(i/4);
    const puck=new THREE.Mesh(new THREE.SphereGeometry(.07,14,10),
      new THREE.MeshStandardMaterial({color,roughness:.7}));
    puck.position.set(-1.40+col*.15,1.36-row*.16,-1.035);
    puck.userData.action={type:'easel-color',value:color};
    puck.name='Palette pigment '+color;
    stage.add(puck);actionMeshes.push(puck);
  }
  // Reachable left-side fit panel. It uses the same controller ray as the palette.
  const fitPanel=new THREE.Group();fitPanel.position.set(-2.06,1.42,-1.11);
  stage.add(fitPanel);
  const fitBacking=new THREE.Mesh(new THREE.PlaneGeometry(.83,1.72),
    new THREE.MeshBasicMaterial({color:0x243143,side:THREE.DoubleSide}));
  fitBacking.position.z=-.02;fitBacking.raycast=()=>{};fitPanel.add(fitBacking);
  function labelTexture(text){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#162536';ctx.fillRect(0,0,512,128);
    ctx.strokeStyle='#9b8058';ctx.lineWidth=6;ctx.strokeRect(3,3,506,122);
    ctx.fillStyle='#ffe6bd';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='bold 44px system-ui';ctx.fillText(text,256,64,490);
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;return texture;
  }
  const fitButtons=[
    ['EASEL FIT','none'],
    ['HEIGHT +','up'],['HEIGHT -','down'],
    ['TILT +','tilt-up'],['TILT -','tilt-down'],
    ['NEARER','nearer'],['FARTHER','farther'],['RESET FIT','reset']
  ];
  for(const [i,[title,action]] of fitButtons.entries()){
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.70,.18),
      new THREE.MeshBasicMaterial({map:labelTexture(title),side:THREE.DoubleSide}));
    mesh.position.set(0,.72-i*.20,.02);
    if(action!=='none'){
      mesh.userData.action={type:'easel-fit',value:action};
      actionMeshes.push(mesh);
    }else mesh.raycast=()=>{};
    fitPanel.add(mesh);
  }
  const snapshots=new WeakMap();
  let active=null;
  function restore(){
    if(!active)return;
    const pose=snapshots.get(active.group);
    if(pose){
      active.group.position.copy(pose.position);
      active.group.rotation.copy(pose.rotation);
      active.group.scale.copy(pose.scale);
    }
    active.paper.material.color.setHex(0x17283d);
    active=null;
  }
  function applyFit(){
    const pose=poseForEaselFit(fit);
    boardSupport.position.fromArray(pose.position);
    boardSupport.rotation.set(...pose.rotation);
    if(active){
      active.group.position.fromArray(pose.position);
      active.group.rotation.set(...pose.rotation);
      active.group.scale.fromArray(pose.scale);
    }
  }
  function setFit(partial){
    fit=normalizeEaselFit({...fit,...partial});
    applyFit();
    return {...fit};
  }
  function adjustFit(action){
    fit=stepEaselFit(fit,action);
    applyFit();
    return {...fit};
  }
  function select(render){
    if(!stage.visible)return;
    if(render===active)return;
    restore();
    if(!render)return;
    snapshots.set(render.group,{
      position:render.group.position.clone(),
      rotation:render.group.rotation.clone(),
      scale:render.group.scale.clone()
    });
    active=render;
    applyFit();
    render.paper.material.color.setHex(0xffffff);
  }
  function setEnabled(enabled,render=null){
    if(!enabled){restore();stage.visible=false;return;}
    stage.visible=true;select(render);
  }
  applyFit();
  return {
    stage,actionMeshes,select,setEnabled,setFit,adjustFit,
    get fit(){return {...fit};},
    get enabled(){return stage.visible;},
    originalPose(group){
      if(!stage.visible||active?.group!==group)return null;
      return snapshots.get(group)||null;
    }
  };
}
