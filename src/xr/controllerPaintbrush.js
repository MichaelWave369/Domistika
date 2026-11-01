import * as THREE from 'three';

/**
 * Visual Quest controller brush with an exact ray-hit cursor on the canvas.
 * Paint input still uses the existing trigger/raycast drawing engine.
 * No hand tracking, pressure, or physical brush collision is implied.
 */
export function createControllerPaintbrush({controller,scene}){
  if(!controller?.add||!scene?.add)throw Error('Controller brush needs controller and scene.');
  const group=new THREE.Group();
  group.name='Controller-held artist brush';
  group.visible=false;
  const geometries=[],materials=[];
  const makeMaterial=color=>{
    const material=new THREE.MeshStandardMaterial({color,metalness:.12,roughness:.63});
    materials.push(material);return material;
  };
  const wood=makeMaterial(0x866049),ferrule=makeMaterial(0xb9c9c9),pigment=makeMaterial(0x68e4ff);
  function segment(geometry,material,z){
    geometries.push(geometry);
    const mesh=new THREE.Mesh(geometry,material);
    mesh.rotation.x=-Math.PI/2;
    mesh.position.set(0,0,z);
    mesh.raycast=()=>{}; // Never block the real paint target.
    group.add(mesh);
    return mesh;
  }
  segment(new THREE.CylinderGeometry(.011,.014,.15,8),wood,-.105);
  segment(new THREE.CylinderGeometry(.014,.014,.048,8),ferrule,-.205);
  segment(new THREE.ConeGeometry(.013,.055,8),pigment,-.255);
  controller.add(group);
  const markerMaterial=new THREE.MeshBasicMaterial({
    color:0x68e4ff,transparent:true,opacity:.94,depthTest:false,depthWrite:false
  });
  const markerGeometry=new THREE.SphereGeometry(.011,8,6);
  const marker=new THREE.Mesh(markerGeometry,markerMaterial);
  marker.name='Canvas ray-hit paint cursor';
  marker.raycast=()=>{};
  marker.visible=false;
  marker.renderOrder=99;
  scene.add(marker);
  let active=false;
  function setActive(value){
    active=!!value;
    group.visible=active;
    if(!active)marker.visible=false;
  }
  function setColor(color,erase=false){
    if(!/^#[0-9a-f]{6}$/i.test(color))return;
    pigment.color.set(erase?'#ffffff':color);
    markerMaterial.color.set(erase?'#ffb4ac':color);
  }
  function setPainting(pressed){
    marker.scale.setScalar(pressed?1.5:1);
  }
  function setCursor(point){
    if(!active||!point){marker.visible=false;return;}
    marker.position.copy(point);
    // The cursor is purely visual; keep it small and slightly forward.
    marker.position.z+=.012;
    marker.visible=true;
  }
  function dispose(){
    controller.remove(group);scene.remove(marker);
    for(const geometry of geometries)geometry.dispose();
    for(const material of materials)material.dispose();
    markerGeometry.dispose();markerMaterial.dispose();
  }
  return {group,marker,setActive,setColor,setPainting,setCursor,dispose,
    get active(){return active;}};
}
