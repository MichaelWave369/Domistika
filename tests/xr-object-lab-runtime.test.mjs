import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWorkshop} from '../src/xr/workshopRuntime.js';
import {createWorkshopMesh,createWorkshopObject,emptyWorkshop,readWorkshop,writeWorkshop} from '../src/xr/workshopModel.js';
const mockStorage=()=>{
  const data=new Map();
  return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),raw:data};
};
test('object lab duplication, names, colors, history, and saved JSON have no ruler data',()=>{
 const storage=mockStorage(),scene=new THREE.Scene(),workshop=createWorkshop({scene,storage});
 workshop.add('box','#aabbcc',[1,1,-2]);
 const initialId=workshop.selected.id;
 const original=workshop.selected;
 workshop.duplicateSelected();
 assert.equal(workshop.count,2);
 assert.notEqual(workshop.selected.id,initialId);
 assert.equal(workshop.selected.source,null);
 workshop.setSelectedAppearance({name:'Renamed sphere fixture',color:'#ff00ff'});
 assert.equal(workshop.selected.color,'#ff00ff');
 assert.equal(workshop.selected.name,'Renamed sphere fixture');
 workshop.select(initialId);
 assert.equal(workshop.selected.name,original.name);
 workshop.undo();
 assert.equal(workshop.all.find(o=>o.id!==initialId).name,'Box copy');
 workshop.redo();
 assert.equal(workshop.all.find(o=>o.id!==initialId).name,'Renamed sphere fixture');
 const ids=workshop.all.map(o=>o.id);
 const context=globalThis.document;
 try{
   globalThis.document={createElement:()=>({width:512,height:128,getContext:()=>null})};
   const m=workshop.setMeasurement(ids[0],ids[1]);
   assert.equal(m.distance,.5);
   assert.equal(m.basis,'object-centers');
   assert.ok(scene.children.some(o=>o.name.includes('measurement overlay')));
   assert.doesNotMatch(workshop.exportJson(),/measurement|pendingMeasure/);
   workshop.removeSelected();
   assert.equal(workshop.measure,null);
 }finally{globalThis.document=context;}
 assert.equal(storage.raw.has('domistika.xr.workshop.v1'),true);
 assert.equal(storage.raw.has('domistika.xr.spatial.v1'),false);
});
test('mirror is a reflected editable COPY with correct triangle winding, source untouched',()=>{
 const w=createWorkshop({scene:new THREE.Scene(),storage:mockStorage()});
 const source=createWorkshopMesh([0,0,0,1,0,0,0,1,0],'#3377aa','Imported mesh',[1,1,-2]);
 w.insert(source);w.duplicateSelected(true);
 assert.equal(w.count,2);
 const mirrored=w.selected;
 assert.deepEqual(mirrored.position,[-1,1,-2]);
 assert.equal(mirrored.mirroredX,true);
 const originalMesh=w.meshes.get(source.id),mirroredMesh=w.meshes.get(mirrored.id);
 assert.ok(Array.from(originalMesh.geometry.attributes.position.array).includes(1));
 assert.ok(Array.from(mirroredMesh.geometry.attributes.position.array).includes(-1));
 assert.deepEqual(w.all.find(o=>o.id===source.id).position,[1,1,-2]);
 assert.equal(readWorkshop(writeWorkshop({schema:'domistika.xr.workshop.v1',objects:w.all})).objects[1].mirroredX,true);
});
test('legacy v0.2 assembly JSON is compatible with the optional mirror flag',()=>{
 const item=createWorkshopObject('cylinder');
 delete item.mirroredX;
 const next=readWorkshop(JSON.stringify({schema:emptyWorkshop().schema,objects:[item]}));
 assert.equal(next.objects[0].mirroredX,false);
 assert.equal(readWorkshop(writeWorkshop(next)).objects.length,1);
});
test('ruler cannot bind a missing object or claim same-object distance',()=>{
 const w=createWorkshop({scene:new THREE.Scene(),storage:mockStorage()});
 w.add('box');
 assert.throws(()=>w.setMeasurement(w.selected.id,w.selected.id),/two different/);
 assert.throws(()=>w.measurePick('fake-id'),/Point at an editable/);
 assert.throws(()=>w.duplicateSelected('not a boolean'),/mirror/);
});
