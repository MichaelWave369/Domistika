import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWorkshop} from '../src/xr/workshopRuntime.js';
import {readWorkshop} from '../src/xr/workshopModel.js';
import {defaultMotion} from '../src/xr/motionForge.js';
function mockStorage(){
 const map=new Map();
 return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),map};
}
test('live Three.js motion changes view only; pause restores authoritative rest pose',()=>{
 const storage=mockStorage(),scene=new THREE.Scene(),ws=createWorkshop({scene,storage});
 ws.add('box','#fe9cff',[1,1.5,-2]);
 const id=ws.selected.id,rest=ws.selected.position.slice();
 ws.setSelectedMotion({...defaultMotion(),mode:'bob'});
 const initialJson=ws.exportJson();
 assert.equal(ws.toggleMotion(),true);
 ws.tickMotion(.25);
 assert.ok(Math.abs(ws.meshes.get(id).position.y-1.9)<1e-8);
 assert.deepEqual(ws.selected.position,rest);
 assert.equal(ws.exportJson(),initialJson);
 assert.equal(ws.toggleMotion(),false);
 assert.deepEqual(ws.meshes.get(id).position.toArray(),rest);
 assert.equal(ws.motionSeconds,0);
 assert.equal(ws.motionPlaying,false);
});
test('scrubbing is deterministic; exporting JSON never captures in-flight transforms',()=>{
 const ws=createWorkshop({scene:new THREE.Scene(),storage:mockStorage()});
 ws.add('sphere','#afafaf',[1,2,-3]);
 ws.setSelectedMotion({...defaultMotion(),mode:'orbit'});
 const saved=ws.exportJson();
 ws.previewMotion(.25);
 const p=ws.meshes.get(ws.selected.id).position.toArray();
 assert.ok(Math.abs(p[0]-.6)<1e-8);
 assert.deepEqual(ws.selected.position,[1,2,-3]);
 assert.equal(ws.exportJson(),saved);
 ws.previewMotion(.25);
 assert.deepEqual(ws.meshes.get(ws.selected.id).position.toArray(),p);
 ws.stopMotion();
 assert.deepEqual(ws.meshes.get(ws.selected.id).position.toArray(),[1,2,-3]);
 assert.throws(()=>ws.previewMotion(Infinity),/time/);
});
test('effect assignment can be undone, disabled and included in workshop backups',()=>{
 const store=mockStorage(),ws=createWorkshop({scene:new THREE.Scene(),storage:store});
 ws.add('torus','#ffcc00',[0,1,-1]);
 ws.setSelectedMotion({...defaultMotion(),mode:'pulse',speed:2,amplitude:.5});
 assert.equal(readWorkshop(store.map.get('domistika.xr.workshop.v1')).objects[0].motion.mode,'pulse');
 ws.undo();assert.equal(ws.selected.motion,null);
 ws.redo();assert.equal(ws.selected.motion.mode,'pulse');
 assert.equal(ws.cycleSelectedMotion(),'none');
 assert.equal(ws.selected.motion,null);
 assert.throws(()=>ws.toggleMotion(),/Assign a motion effect/);
});
test('animated arrays inherit bounded effects but do not become animation authority over Framefield/CAD',()=>{
 const ws=createWorkshop({scene:new THREE.Scene(),storage:mockStorage()});
 ws.add('box','#ffaa00',[0,1,-2]);
 ws.setSelectedMotion({...defaultMotion(),mode:'spin'});
 ws.patternSelected('radial',{copies:3,radius:1});
 assert.equal(ws.all.length,4);
 assert.ok(ws.all.every(x=>x.motion?.mode==='spin'));
 const stored=ws.exportJson();
 ws.toggleMotion();ws.tickMotion(.1);
 assert.equal(ws.exportJson(),stored);
 ws.stopMotion();
});
