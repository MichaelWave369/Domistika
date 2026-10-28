import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkshopObject,readWorkshop,writeWorkshop,emptyWorkshop,validateObject} from '../src/xr/workshopModel.js';
import {duplicateObject,measureObjectCenters} from '../src/xr/objectLab.js';
test('duplicate preserves dimensions and source geometry without mutating original',()=>{
 const original=createWorkshopObject('box','#45aaff',[1,1,-1]);
 original.dimensions=[2,1,.5];original.name='Fixture';
 const snapshot=JSON.stringify(original);
 const clone=duplicateObject(original,{snap:.25,offset:.5});
 assert.notEqual(clone.id,original.id);assert.deepEqual(clone.position,[1.5,1,-1]);
 assert.deepEqual(clone.dimensions,original.dimensions);
 assert.equal(JSON.stringify(original),snapshot);
 const scene=emptyWorkshop();scene.objects=[original,clone];
 assert.equal(readWorkshop(writeWorkshop(scene)).objects.length,2);
});
test('mirrored geometry round-trips and pose reflects across world x=0',()=>{
 const source=createWorkshopObject('box','#aabbcc',[2,1,-2]);
 source.rotation=[.2,.3,-.4];source.mirroredX=false;
 const reflected=duplicateObject(source,{mirrorX:true,snap:0});
 assert.deepEqual(reflected.position,[-2,1,-2]);
 assert.deepEqual(reflected.rotation,[-.2,.3,.4]);
 assert.equal(reflected.mirroredX,true);
 assert.equal(duplicateObject(reflected,{mirrorX:true,snap:0}).mirroredX,false);
 assert.equal(validateObject({ ...source }).mirroredX,false);
});
test('center distance is three-dimensional and does not round source values',()=>{
 const a=createWorkshopObject('sphere','#ffffff',[0,0,0]);
 const b=createWorkshopObject('sphere','#ffffff',[3,4,12]);
 assert.equal(measureObjectCenters(a,b).distance,13);
 assert.deepEqual(measureObjectCenters(a,b).delta,[3,4,12]);
 assert.equal(measureObjectCenters(a,b).basis,'object-centers');
});
test('copies reject out-of-bounds geometry, invalid mirror operations and identifiers',()=>{
 const item=createWorkshopObject('box','#ffffff',[24.9,0,0]);
 assert.throws(()=>duplicateObject(item,{offset:.5,snap:0}),/position/);
 assert.throws(()=>duplicateObject(item,{mirrorX:'yes'}),/mirror/);
 assert.throws(()=>duplicateObject(item,{offset:Infinity}),/offset/);
});
