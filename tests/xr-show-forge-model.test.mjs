import test from 'node:test';
import assert from 'node:assert/strict';
import {buildShowPreset,SHOW_PRESETS,sampleShowDemo} from '../src/xr/showForge.js';
import {validateWorkshop,emptyWorkshop} from '../src/xr/workshopModel.js';
test('three stages use bounded independent editable meshes with valid animation',()=>{
 for(const [id,recipe] of Object.entries(SHOW_PRESETS)){
   const pieces=buildShowPreset(id);
   assert.equal(pieces.length,recipe.count);
   assert.equal(new Set(pieces.map(x=>x.id)).size,recipe.count);
   assert.ok(pieces.every(x=>x.motion&&x.motion.band&&x.source===null));
   const scene=validateWorkshop({schema:emptyWorkshop().schema,objects:pieces});
   assert.equal(scene.objects.length,recipe.count);
 }
});
test('preset geometry is deterministic apart from fresh object IDs',()=>{
 const a=buildShowPreset('orbit-bloom',[0,0,-5]);
 const b=buildShowPreset('orbit-bloom',[2,0,-4]);
 assert.deepEqual(a.map(o=>[o.kind,o.color,o.motion,o.dimensions]),
   b.map(o=>[o.kind,o.color,o.motion,o.dimensions]));
 assert.deepEqual(b[0].position,[2,1.7,-4]);
 assert.equal(a[0].name,'Bloom · core');
 assert.throws(()=>buildShowPreset('unknown'),/Unknown/);
 assert.throws(()=>buildShowPreset('orbit-bloom',[99,0,0]),/origin/);
});
test('silent demo frames are deterministic and bounded without audio files',()=>{
 for(let t=0;t<80;t+=.025){
   const f=sampleShowDemo(t);
   assert.deepEqual(f,sampleShowDemo(t));
   for(const name of ['energy','bass','mid','high','beat'])
     assert.ok(f[name]>=0&&f[name]<=1,name+' invalid');
 }
 assert.throws(()=>sampleShowDemo(-1),/clock/);
 assert.throws(()=>sampleShowDemo(NaN),/clock/);
 assert.notDeepEqual(sampleShowDemo(0),sampleShowDemo(.5));
});
