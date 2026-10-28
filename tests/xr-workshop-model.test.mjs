import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyWorkshop,createWorkshopObject,createWorkshopMesh,validateWorkshop,readWorkshop,writeWorkshop,snapPosition,snapAngle,withTransform,WORKSHOP_MAX_OBJECTS} from '../src/xr/workshopModel.js';
test('primitive scenes round-trip without affecting 2D, airbrush or CAD projects',()=>{
 const s=emptyWorkshop();s.objects.push(createWorkshopObject('box'));
 assert.equal(readWorkshop(writeWorkshop(s)).objects[0].kind,'box');
 for(const k of ['sphere','cylinder','torus','tube'])assert.equal(createWorkshopObject(k).kind,k);
});
test('0.1 / 0.25 / 0.5m and 15degree snap are deterministic',()=>{
 assert.deepEqual(snapPosition([.13,1.13,-.76],.25),[.25,1.25,-.75]);
 assert.equal(snapAngle(17*Math.PI/180,15),15*Math.PI/180);
 assert.equal(snapAngle(17*Math.PI/180,0),17*Math.PI/180);
});
test('mesh copies are bounded, labeled and validated',()=>{
 const mesh=createWorkshopMesh([0,0,0,1,0,0,0,1,0],'#AaBbCc','Original source');
 assert.equal(mesh.kind,'mesh');assert.equal(mesh.source.app,'FramefieldStudio');
 const scene=emptyWorkshop();scene.objects=[mesh];
 assert.deepEqual(readWorkshop(writeWorkshop(scene)),validateWorkshop(scene));
 assert.throws(()=>createWorkshopMesh([1,2,3],'#aabbcc'),/triangle/);
});
test('oversized, NaN, and malicious transform data is rejected',()=>{
 const m=createWorkshopObject('box');
 assert.throws(()=>withTransform(m,{position:[NaN,1,1]}),/position/);
 assert.throws(()=>withTransform(m,{scale:[0,1,1]}),/scale/);
 assert.throws(()=>withTransform(m,{kind:'script'}),/type/);
 const b=emptyWorkshop();b.objects=[m,{...m}];
 assert.throws(()=>validateWorkshop(b),/Duplicate/);
 const c=emptyWorkshop();c.objects=Array.from({length:WORKSHOP_MAX_OBJECTS+1},()=>createWorkshopObject('box'));
 assert.throws(()=>validateWorkshop(c),/oversized/);
 assert.throws(()=>readWorkshop('{}'),/oversized/);
});
