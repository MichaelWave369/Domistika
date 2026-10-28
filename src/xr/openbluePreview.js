import * as THREE from 'three';
import {summarizeOpenBlue} from './openblueModel.js';

const palette={door:0xffb776,window:0x6bc8ff,outlet:0xf9d67a,network:0x8affbf};
function disposeGroup(group){
  const geometries=new Set(),materials=new Set();
  group.traverse(obj=>{
    if(obj.geometry)geometries.add(obj.geometry);
    if(Array.isArray(obj.material))obj.material.forEach(x=>materials.add(x));
    else if(obj.material)materials.add(obj.material);
  });
  geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());
}
export function buildOpenBluePreview(preview){
  const {metersPerUnit:unit,bounds}=preview;
  const group=new THREE.Group();
  group.name='OpenBlueprint Studio read-only architectural preview';
  const originX=(bounds.minX+bounds.maxX)/2,originY=(bounds.minY+bounds.maxY)/2;
  const wallMat=new THREE.MeshStandardMaterial({color:0x65accf,roughness:.78,metalness:.06,side:THREE.DoubleSide});
  const sideMat=new THREE.MeshBasicMaterial({color:0x80f2dd,wireframe:true,transparent:true,opacity:.16});
  for(const wall of preview.walls){
    const dx=wall.x2-wall.x1,dy=wall.y2-wall.y1;
    const length=Math.hypot(dx,dy)*unit,thickness=wall.thickness*unit,height=wall.height*unit;
    const geometry=new THREE.BoxGeometry(length,height,thickness);
    const mesh=new THREE.Mesh(geometry,wallMat);
    mesh.position.set(((wall.x1+wall.x2)/2-originX)*unit,height/2,((wall.y1+wall.y2)/2-originY)*unit);
    mesh.rotation.y=-Math.atan2(dy,dx);
    mesh.name='Wall: '+wall.id.slice(0,60);
    group.add(mesh);
  }
  const markerGeometry=new THREE.SphereGeometry(.08,7,6);
  for(const symbol of preview.symbols){
    const marker=new THREE.Mesh(markerGeometry,new THREE.MeshBasicMaterial({color:palette[symbol.type]}));
    marker.position.set((symbol.x-originX)*unit,.14,(symbol.y-originY)*unit);
    marker.name='Symbol: '+symbol.type;
    group.add(marker);
  }
  // Source plan units are converted to meters internally; fit is explicitly VISUAL ONLY.
  const spanX=(bounds.maxX-bounds.minX)*unit,spanZ=(bounds.maxY-bounds.minY)*unit;
  const maxHeight=preview.walls.reduce((max,w)=>Math.max(max,w.height*unit),0);
  const span=Math.max(spanX,spanZ,maxHeight,.1);
  const displayScale=Math.min(1,3.8/span);
  group.scale.setScalar(displayScale);
  group.position.set(0,0,-4.2);
  const summary={...summarizeOpenBlue(preview),displayScale,notOneToOne:displayScale<.99999};
  return {group,summary,dispose:()=>disposeGroup(group)};
}
