import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWorkshop} from '../src/xr/workshopRuntime.js';
import {createShowrunner,writeShowPack,readShowPack} from '../src/xr/showrunner.js';
import {buildShowPreset} from '../src/xr/showForge.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('Showpack loads editable animated stage and cue sheet without modifying source',()=>{
 const old=createWorkshop({scene:new THREE.Scene(),storage:storage()});
 old.addShowPreset('bass-cathedral');
 const built=old.exportJson();
 const show=createShowrunner();show.updateCue(0,{palette:'ice',gain:1.25});
 const encoded=writeShowPack(built,show.show);
 const pack=readShowPack(encoded);
 const fresh=createWorkshop({scene:new THREE.Scene(),storage:storage()});
 fresh.importJson(JSON.stringify(pack.workshop));
 const performance=createShowrunner(pack.show);
 assert.equal(performance.show.cues[0].palette,'ice');
 assert.equal(fresh.count,15);
 assert.equal(fresh.exportJson(),built);
 assert.deepEqual(pack.workshop.objects.map(o=>o.motion?.band),
   JSON.parse(built).objects.map(o=>o.motion?.band));
});
test('playing multiple visual cues changes only preview transforms and emissive materials',()=>{
 const ws=createWorkshop({scene:new THREE.Scene(),storage:storage()});
 ws.addShowPreset('orbit-bloom');
 const show=createShowrunner();
 const saved=ws.exportJson();
 const originalLight=ws.lightSettings;
 ws.previewMotion(0);ws.toggleMotion();
 for(let act=0;act<3;act++){
   show.jump(act);show.play();
   const cue=show.status.cue;
   ws.setLightSettings({enabled:true,palette:cue.palette,gain:cue.gain});
   for(let i=0;i<18;i++){show.tick(.1);ws.tickMotion(.1,show.frame());}
   assert.equal(ws.exportJson(),saved);
   assert.ok([...ws.meshes.values()].some(mesh=>mesh.material.emissiveIntensity>0));
 }
 ws.stopMotion();ws.setLightSettings(originalLight);
 assert.deepEqual(ws.lightSettings,originalLight);
 assert.equal(ws.exportJson(),saved);
 assert.ok([...ws.meshes.values()].every(mesh=>mesh.material.emissiveIntensity===0));
});
test('invalid imported package is rejected before any editing side effect',()=>{
 const ws=createWorkshop({scene:new THREE.Scene(),storage:storage()});
 ws.addShowPreset('neon-corridor');
 const base=ws.exportJson();
 const pack=JSON.parse(writeShowPack(base,createShowrunner().show));
 pack.show.cues[0].palette='<script>';
 assert.throws(()=>readShowPack(JSON.stringify(pack)),/Invalid Showrunner cue/);
 assert.equal(ws.exportJson(),base);
 const second=JSON.parse(writeShowPack(base));
 second.workshop.objects[0].position[0]=Infinity;
 // JSON.stringify encodes Infinity as null: original workshop validator still rejects it.
 assert.throws(()=>readShowPack(JSON.stringify(second)),/position/);
 assert.equal(ws.exportJson(),base);
});
