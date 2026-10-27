import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {FRAMEFIELD_EULER_ORDER} from '../src/xr/framefieldPreview.js';

// Replicates FramefieldStudio/src/mesh.js transformVertex's X→Y→Z rotation,
 // using source-native coordinate math with no native scene dependency.
function framefieldRotation(vertex,rotationDeg){
 let [x,y,z]=vertex;
 const [rx,ry,rz]=rotationDeg.map(deg=>deg*Math.PI/180);
 let c=Math.cos(rx),s=Math.sin(rx);
 [y,z]=[y*c-z*s,y*s+z*c];
 c=Math.cos(ry);s=Math.sin(ry);
 [x,z]=[x*c+z*s,-x*s+z*c];
 c=Math.cos(rz);s=Math.sin(rz);
 [x,y]=[x*c-y*s,x*s+y*c];
 return [x,y,z];
}
test('Three.js Euler order for imported BPC meshes agrees with Framefield on multiple axes',()=>{
 assert.equal(FRAMEFIELD_EULER_ORDER,'ZYX');
 for(const angles of [[30,45,60],[-20,75,120],[90,20,-40]]){
   const vertex=[.47,-.81,.22];
   const expected=framefieldRotation(vertex,angles);
   const radians=angles.map(x=>x*Math.PI/180);
   const actual=new THREE.Vector3(...vertex)
     .applyEuler(new THREE.Euler(...radians,FRAMEFIELD_EULER_ORDER)).toArray();
   actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-9));
 }
});
test('XR renderer assigns Euler parity only to imported meshes',()=>{
 const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
 assert.match(main,/mesh\.rotation\.order=FRAMEFIELD_EULER_ORDER/);
 assert.match(main,/mesh\.rotation\.set\(\.\.\.asset\.pose\.rotationRadians\)/);
 assert.match(main,/mesh\.rotation\.set\(\.\.\.pose\.rotationRadians\)/);
 // The original floating-board painting scene still uses its own native group rotations.
 assert.match(main,/group\.rotation\.set\(\.\.\.b\.rotation\)/);
});
