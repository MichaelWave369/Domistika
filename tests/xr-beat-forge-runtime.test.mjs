import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWorkshop} from '../src/xr/workshopRuntime.js';
import {readWorkshop,writeWorkshop,emptyWorkshop,createWorkshopObject} from '../src/xr/workshopModel.js';
import {defaultMotion,sampleMotion} from '../src/xr/motionForge.js';
const storage=()=>{let map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
const frame={energy:.35,bass:.95,mid:.15,high:.01,beat:1};
test('one sculpture listens to bass while another listens to highs without mutating either',()=>{
 const ws=createWorkshop({scene:new THREE.Scene(),storage:storage()});
 ws.add('box','#22aaff',[0,1.5,-2]);
 ws.setSelectedMotion({...defaultMotion(),mode:'pulse',band:'bass'});
 const bassId=ws.selected.id;
 ws.add('box','#ffaaff',[1,1.5,-2]);
 ws.setSelectedMotion({...defaultMotion(),mode:'pulse',band:'high'});
 const highId=ws.selected.id;
 const saved=ws.exportJson();
 ws.toggleMotion();ws.tickMotion(.1,frame);
 const bassScale=ws.meshes.get(bassId).scale.x,highScale=ws.meshes.get(highId).scale.x;
 assert.ok(bassScale>highScale);
 assert.equal(ws.exportJson(),saved);
 ws.stopMotion();
 assert.deepEqual(ws.meshes.get(bassId).scale.toArray(),[1,1,1]);
 assert.deepEqual(ws.meshes.get(highId).scale.toArray(),[1,1,1]);
});
test('object audio bands are undoable, copyable and preserved in bounded local JSON',()=>{
 const ws=createWorkshop({scene:new THREE.Scene(),storage:storage()});
 ws.add('torus','#abcdef',[0,1.5,-2]);
 ws.setSelectedMotion({...defaultMotion(),mode:'bob',band:'mid'});
 assert.equal(ws.selected.motion.band,'mid');
 assert.equal(ws.cycleSelectedBand(),'high');
 assert.equal(ws.selected.motion.band,'high');
 ws.undo();assert.equal(ws.selected.motion.band,'mid');
 ws.redo();assert.equal(ws.selected.motion.band,'high');
 ws.duplicateSelected();
 assert.equal(ws.selected.motion.band,'high');
 assert.equal(readWorkshop(ws.exportJson()).objects[1].motion.band,'high');
});
test('v0.6 object motions without audio band default to full and old scalar energy still works',()=>{
 const old=createWorkshopObject('sphere');
 old.motion={mode:'pulse',speed:1,amplitude:.4,phase:0};
 const project={schema:emptyWorkshop().schema,objects:[old]};
 const restored=readWorkshop(JSON.stringify(project));
 assert.equal(restored.objects[0].motion.band,'full');
 const copy=readWorkshop(writeWorkshop(restored));
 assert.equal(copy.objects[0].motion.band,'full');
 assert.deepEqual(sampleMotion(copy.objects[0],.25,.7),sampleMotion(copy.objects[0],.25,{
  energy:.7,bass:0,mid:0,high:0,beat:0
 }));
});
test('invalid band imports fail closed without replacing an existing workshop',()=>{
 const ws=createWorkshop({scene:new THREE.Scene(),storage:storage()});
 ws.add('box','#abcdef',[0,1.5,-2]);
 const before=ws.exportJson();
 const invalid=JSON.parse(before);
 invalid.objects[0].motion={...defaultMotion(),band:'custom-js'};
 assert.throws(()=>ws.importJson(JSON.stringify(invalid)),/band/);
 assert.equal(ws.exportJson(),before);
 assert.throws(()=>ws.cycleSelectedBand(),/Assign a Motion Forge effect/);
});
