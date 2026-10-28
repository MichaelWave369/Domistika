import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWorkshop} from '../src/xr/workshopRuntime.js';
import {createWorkshopObject,writeWorkshop,emptyWorkshop,readWorkshop} from '../src/xr/workshopModel.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('a linear array adds independent objects as ONE undo event and retains source',()=>{
  const scene=new THREE.Scene(),ws=createWorkshop({scene,storage:storage()});
  ws.add('box','#ffffff',[0,1,-2]);
  const id=ws.selected.id,source=JSON.stringify(ws.selected);
  assert.equal(ws.patternSelected('linear',{copies:3,axis:'x',spacing:.5}),3);
  assert.equal(ws.count,4);
  assert.deepEqual(ws.all.map(o=>o.position[0]),[0,.5,1,1.5]);
  assert.equal(JSON.stringify(ws.all.find(o=>o.id===id)),source);
  ws.undo();assert.equal(ws.count,1);
  ws.redo();assert.equal(ws.count,4);
  assert.equal(readWorkshop(ws.exportJson()).objects.length,4);
});
test('radial ring makes visible editable meshes and one undo restores the source alone',()=>{
  const ws=createWorkshop({scene:new THREE.Scene(),storage:storage()});
  ws.add('cylinder','#00ff77',[1,1,-2]);
  assert.equal(ws.patternSelected('radial',{copies:5,radius:1}),5);
  assert.equal(ws.count,6);
  assert.equal(ws.meshes.size,6);
  assert.equal(new Set(ws.all.map(o=>o.id)).size,6);
  ws.undo();assert.equal(ws.count,1);
});
test('capacity failure is atomic: no generated objects or history are added',()=>{
  const s=emptyWorkshop();s.objects=Array.from({length:47},(_,i)=>{
    const o=createWorkshopObject('box','#112233',[0,1,-2]);o.position[0]=i*.1;return o;
  });
  const mock=storage();mock.setItem('domistika.xr.workshop.v1',writeWorkshop(s));
  const ws=createWorkshop({scene:new THREE.Scene(),storage:mock});
  const before=ws.exportJson();
  assert.throws(()=>ws.patternSelected('linear',{copies:2,spacing:.5}),/oversized/);
  assert.equal(ws.exportJson(),before);
  ws.undo();assert.equal(ws.exportJson(),before);
  assert.equal(ws.count,47);
});
test('center alignment and rotated geometry floor contact are measured on actual meshes',()=>{
  const ws=createWorkshop({scene:new THREE.Scene(),storage:storage()});
  ws.add('box','#ffdd00',[0,2,-2]);
  const first=ws.selected.id;
  ws.patchSelected({rotation:[0,Math.PI/4,0],dimensions:[1,1,2]});
  assert.equal(ws.floorSelected(),true);
  const mesh=ws.meshes.get(first);
  const box=new THREE.Box3().setFromObject(mesh);
  assert.ok(Math.abs(box.min.y)<1e-7);
  assert.equal(ws.floorSelected(),false);
  ws.add('sphere','#aabbcc',[2,2,-2]);
  const targetId=ws.selected.id;
  ws.select(first);ws.alignSelected(targetId,'xz');
  assert.deepEqual(ws.selected.position.filter((_,i)=>i!==1),[2,-2]);
  assert.deepEqual(ws.all.find(o=>o.id===targetId).position,[2,2,-2]);
  assert.throws(()=>ws.alignSelected(first,'xz'),/different/);
});
test('a patterned copy of a mirrored mesh retains triangle geometry and mirror flag',()=>{
  const ws=createWorkshop({scene:new THREE.Scene(),storage:storage()});
  ws.add('box','#ff0000',[0,1,-2]);
  ws.duplicateSelected(true);
  const id=ws.selected.id;
  assert.equal(ws.selected.mirroredX,true);
  ws.patternSelected('linear',{copies:2,axis:'z',spacing:.5});
  assert.equal(ws.count,4);
  assert.equal(ws.all.filter(o=>o.id!==id&&o.mirroredX).length,2);
  assert.equal(ws.all.find(o=>o.id===id).mirroredX,true);
});
