import * as THREE from 'three';

/**
 * In-world arm/cancel panel visible to Quest hand-pinch and controller raycasts.
 * This is merely a UI. It does not arm, execute or persist anything itself.
 */
export function createNativePhiPoseMenu({scene,textTexture}={}){
  if(!scene||typeof textTexture!=='function')
    throw new TypeError('Native ΦPose menu needs the existing XR scene and text texture');
  const group=new THREE.Group();
  group.name='ΦPose one-shot XR command menu';
  group.position.set(1.18,2.15,-1.14);
  group.rotation.y=-.25;
  group.visible=false;
  scene.add(group);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(1.10,1.0),
    new THREE.MeshBasicMaterial({color:0x102238,transparent:true,opacity:.96,
      side:THREE.DoubleSide}));
  back.position.z=-.018;back.raycast=()=>{};
  group.add(back);
  const controls=[];
  function label(value,y,color='#afffec',action=null){
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.99,.145),
      new THREE.MeshBasicMaterial({map:textTexture(value,color),side:THREE.DoubleSide}));
    mesh.position.set(0,y,.022);
    if(action){
      mesh.userData.action={type:'phipose-native',value:action};
      controls.push(mesh);
    }else mesh.raycast=()=>{};
    group.add(mesh);
    return mesh;
  }
  label('PHIPOSE · LOCAL HANDS',.37,'#9cfadf');
  const selected=label('CHOOSE COMMAND',.22,'#ffe0a7');
  label('NEXT COMMAND',.025,'#afffec','cycle');
  label('ARM ONE PHRASE',-.16,'#afffec','arm');
  label('CANCEL PHRASE',-.35,'#ffc0ca','cancel');
  const status=label('DISABLED',-.55,'#b1d8f6');
  function update(commandLabel,statusText){
    for(const [mesh,value,color] of [
      [selected,commandLabel,'#ffe0a7'],
      [status,statusText,'#b1d8f6']
    ]){
      if(typeof value!=='string')continue;
      const previous=mesh.material.map;
      mesh.material.map=textTexture(value.slice(0,90),color);
      mesh.material.needsUpdate=true;
      previous?.dispose();
    }
  }
  return Object.freeze({group,controls,update});
}
