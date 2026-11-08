import * as THREE from 'three';

/**
 * Quest-native status & calibration controls. Feedback is replaced only when
 * its text changes (not at headset frame rate), minimizing texture churn.
 */
export function createNativePhiPoseMenu({scene,textTexture}={}){
  if(!scene||typeof textTexture!=='function')
    throw new TypeError('Native ΦPose menu needs the existing XR scene and text texture');
  const group=new THREE.Group();
  group.name='ΦPose XR command + calibration menu';
  group.position.set(1.18,2.02,-1.18);
  group.rotation.y=-.25;
  group.visible=false;
  scene.add(group);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(1.18,1.37),
    new THREE.MeshBasicMaterial({color:0x102238,transparent:true,opacity:.96,
      side:THREE.DoubleSide}));
  back.position.z=-.018;back.raycast=()=>{};
  group.add(back);
  const controls=[];
  function label(value,y,color='#afffec',action=null){
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.14),
      new THREE.MeshBasicMaterial({map:textTexture(value,color),side:THREE.DoubleSide}));
    mesh.position.set(0,y,.022);
    mesh.userData.currentText=value;
    if(action){
      mesh.userData.action={type:'phipose-native',value:action};
      controls.push(mesh);
    }else mesh.raycast=()=>{};
    group.add(mesh);
    return mesh;
  }
  label('PHIPOSE · LOCAL HANDS',.54,'#9cfadf');
  const selected=label('CHOOSE COMMAND',.35,'#ffe0a7');
  label('NEXT COMMAND',.17,'#afffec','cycle');
  label('ARM ONE PHRASE',-.02,'#afffec','arm');
  label('CALIBRATE HANDS',-.21,'#c6ddff','calibrate');
  label('CANCEL',-.40,'#ffc0ca','cancel');
  const status=label('DISABLED',-.57,'#b1d8f6');
  const feedback=label('L:-- R:-- · DEFAULT 15cm',-.75,'#a4ffda');
  function replace(mesh,value,color){
    if(typeof value!=='string')return;
    const short=value.slice(0,88);
    if(short===mesh.userData.currentText)return;
    const previous=mesh.material.map;
    mesh.material.map=textTexture(short,color);
    mesh.userData.currentText=short;
    mesh.material.needsUpdate=true;
    previous?.dispose();
  }
  function update(commandLabel,statusText,feedbackText){
    replace(selected,commandLabel,'#ffe0a7');
    replace(status,statusText,'#b1d8f6');
    replace(feedback,feedbackText,'#a4ffda');
  }
  return Object.freeze({group,controls,update});
}
