import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWorkshop} from '../src/xr/workshopRuntime.js';
import {defaultMotion,sampleMotion} from '../src/xr/motionForge.js';
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),data:m};};
test('audio energy creates visibly different reversible poses without saving it',()=>{
 const ws=createWorkshop({scene:new THREE.Scene(),storage:store()});
 ws.add('box','#00ccff',[0,1.5,-2]);
 ws.setSelectedMotion({...defaultMotion(),mode:'pulse'});
 const id=ws.selected.id,rest=JSON.stringify(ws.selected),save=ws.exportJson();
 ws.toggleMotion();ws.tickMotion(.1,0);
 const normal=ws.meshes.get(id).scale.x;
 ws.stopMotion();ws.toggleMotion();ws.tickMotion(.1,1);
 const energized=ws.meshes.get(id).scale.x;
 assert.ok(energized>normal);
 assert.equal(ws.exportJson(),save);
 assert.equal(JSON.stringify(ws.selected),rest);
 ws.stopMotion();
 assert.deepEqual(ws.meshes.get(id).scale.toArray(),[1,1,1]);
});
test('bass-reactive pose parameter never produces NaN, stores no secret audio bytes',()=>{
 const ws=createWorkshop({scene:new THREE.Scene(),storage:store()});
 ws.add('sphere','#00ccff',[0,1.5,-2]);
 ws.setSelectedMotion({...defaultMotion(),mode:'bob'});
 ws.toggleMotion();ws.tickMotion(.1,.8);
 assert.ok(Number.isFinite(ws.meshes.get(ws.selected.id).position.y));
 assert.throws(()=>sampleMotion(ws.selected,.2,2),/audio-reactive/);
 assert.throws(()=>sampleMotion(ws.selected,.2,-1),/audio-reactive/);
 assert.throws(()=>sampleMotion(ws.selected,.2,NaN),/audio-reactive/);
 const json=ws.exportJson();
 assert.doesNotMatch(json,/spectrum|audioFile|blob:|rhythm/);
 ws.stopMotion();assert.deepEqual(ws.meshes.get(ws.selected.id).position.toArray(),[0,1.5,-2]);
});
test('audio gain is strictly optional; older motion forecasts have identical results',()=>{
 const ws=createWorkshop({scene:new THREE.Scene(),storage:store()});
 ws.add('torus','#abcdef',[0,1.5,-2]);
 ws.setSelectedMotion({...defaultMotion(),mode:'orbit',phase:Math.PI/3});
 const item=ws.selected;
 assert.deepEqual(sampleMotion(item,.375),sampleMotion(item,.375,0));
 for(const mode of ['spin','bob','orbit','pulse']){
  const o={...item,motion:{...defaultMotion(),mode}};
  assert.deepEqual(sampleMotion(o,0,0),{position:o.position,rotation:o.rotation,scale:o.scale});
 }
});
