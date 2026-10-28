import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWorkshop} from '../src/xr/workshopRuntime.js';
import {createWorkshopObject,emptyWorkshop,writeWorkshop} from '../src/xr/workshopModel.js';
import {sampleShowDemo,SHOW_PRESETS} from '../src/xr/showForge.js';
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),m};}
test('one-click stage appends independently editable shapes with one undo and redo',()=>{
 const ws=createWorkshop({scene:new THREE.Scene(),storage:storage()});
 ws.add('box','#ffffff',[-5,1,-5]);
 const origin=ws.selected.id;
 const count=ws.addShowPreset('orbit-bloom');
 assert.equal(count,13);
 assert.equal(ws.count,14);
 assert.ok(ws.all.some(o=>o.id===origin));
 assert.equal(ws.meshes.size,14);
 assert.ok(ws.all.filter(o=>o.id!==origin).every(o=>o.motion&&o.source===null));
 ws.undo();assert.equal(ws.count,1);
 assert.equal(ws.selected.id,origin);
 ws.redo();assert.equal(ws.count,14);
 assert.equal(ws.all[0].id,origin);
});
test('capacity failure leaves saved scene and history untouched',()=>{
 const scene=emptyWorkshop();
 scene.objects=Array.from({length:42},(_,i)=>{
   const object=createWorkshopObject('box','#eeeeee',[i%10,1,-2]);
   return object;
 });
 const backing=storage();backing.setItem('domistika.xr.workshop.v1',writeWorkshop(scene));
 const ws=createWorkshop({scene:new THREE.Scene(),storage:backing});
 const before=ws.exportJson();
 assert.throws(()=>ws.addShowPreset('bass-cathedral'),/oversized/);
 assert.equal(ws.count,42);
 assert.equal(ws.exportJson(),before);
 ws.undo();assert.equal(ws.exportJson(),before);
});
test('silent demo drives existing visual pipeline without audio files or geometry mutation',()=>{
 const ws=createWorkshop({scene:new THREE.Scene(),storage:storage()});
 ws.addShowPreset('neon-corridor');
 const snapshot=ws.exportJson();
 ws.setLightSettings({enabled:true,palette:'aurora',gain:.9});
 assert.equal(ws.toggleMotion(),true);
 const frame=sampleShowDemo(.2);
 ws.tickMotion(.1,frame);
 assert.ok(ws.meshes.size===SHOW_PRESETS['neon-corridor'].count);
 assert.ok([...ws.meshes.values()].some(mesh=>mesh.material.emissiveIntensity>0));
 assert.equal(ws.exportJson(),snapshot);
 ws.stopMotion();
 assert.ok([...ws.meshes.values()].every(mesh=>mesh.material.emissiveIntensity===0));
 assert.equal(ws.exportJson(),snapshot);
});
