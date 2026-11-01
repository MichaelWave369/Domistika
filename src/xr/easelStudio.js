import * as THREE from 'three';

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
  tray.position.set(0,.88,-1.235);stage.add(tray);
  const back=new THREE.Mesh(new THREE.BoxGeometry(1.79,1.29,.045),edge);
  back.position.set(0,1.5,-1.403);stage.add(back);
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
    render.group.position.fromArray(EASEL_POSE.position);
    render.group.rotation.set(...EASEL_POSE.rotation);
    render.group.scale.fromArray(EASEL_POSE.scale);
    render.paper.material.color.setHex(0xffffff);
  }
  function setEnabled(enabled,render=null){
    if(!enabled){restore();stage.visible=false;return;}
    stage.visible=true;select(render);
  }
  return {
    stage,actionMeshes,select,setEnabled,
    get enabled(){return stage.visible;},
    originalPose(group){
      if(!stage.visible||active?.group!==group)return null;
      return snapshots.get(group)||null;
    }
  };
}
