import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkshopObject,readWorkshop,writeWorkshop,emptyWorkshop,validateObject} from '../src/xr/workshopModel.js';
import {defaultMotion,validateMotion,sampleMotion,MOTION_MODES} from '../src/xr/motionForge.js';
const object=()=>createWorkshopObject('box','#aabbcc',[1,1.5,-2]);
test('all four motions are non-destructive, repeatable and at rest at time zero',()=>{
 for(const mode of MOTION_MODES){
   const o=object();o.motion={...defaultMotion(),mode,phase:0};
   const original=JSON.stringify(o);
   const rest=sampleMotion(o,0);
   assert.deepEqual(rest.position,o.position);assert.deepEqual(rest.scale,o.scale);assert.deepEqual(rest.rotation,o.rotation);
   assert.deepEqual(sampleMotion(o,.25),sampleMotion(o,.25));
   assert.equal(JSON.stringify(o),original);
 }
});
test('spin, bob, orbit and pulse affect only intended channels',()=>{
 const o=object();o.motion={...defaultMotion(),mode:'spin'};
 assert.ok(Math.abs(sampleMotion(o,.25).rotation[1]-Math.PI/2)<1e-10);
 o.motion.mode='bob';assert.ok(Math.abs(sampleMotion(o,.25).position[1]-1.9)<1e-10);
 o.motion.mode='orbit';const v=sampleMotion(o,.25);
 assert.ok(Math.abs(v.position[0]-.6)<1e-10);assert.ok(Math.abs(v.position[2]+1.6)<1e-10);
 o.motion.mode='pulse';assert.ok(sampleMotion(o,.25).scale[0]>1);
 assert.ok(sampleMotion(o,.75).scale[0]>.1);
});
test('native workshop JSON retains bounded motion and migrates old files to null',()=>{
 const o=object();const old=JSON.parse(JSON.stringify(o));delete old.motion;
 let read=readWorkshop(JSON.stringify({schema:emptyWorkshop().schema,objects:[old]}));
 assert.equal(read.objects[0].motion,null);
 read.objects[0].motion=validateMotion({...defaultMotion(),mode:'orbit'});
 assert.deepEqual(readWorkshop(writeWorkshop(read)).objects[0].motion,read.objects[0].motion);
});
test('malformed or extreme motion never enters a saved assembly',()=>{
 const o=object();
 for(const bad of [
  {mode:'execute',speed:1,amplitude:1,phase:0},
  {...defaultMotion(),speed:Infinity},
  {...defaultMotion(),speed:0},
  {...defaultMotion(),amplitude:8},
  {...defaultMotion(),phase:-1},
  {mode:'pulse',speed:'1',amplitude:.5,phase:0}
 ]){
   assert.throws(()=>validateObject({...o,motion:bad}),/motion/);
 }
 assert.throws(()=>sampleMotion(o,NaN),/time/);
});
