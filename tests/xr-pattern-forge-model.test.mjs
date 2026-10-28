import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkshopObject,createWorkshopMesh,validateWorkshop,emptyWorkshop,readWorkshop,writeWorkshop} from '../src/xr/workshopModel.js';
import {linearPattern,radialPattern,alignObjectCenter} from '../src/xr/patternForge.js';
test('linear array copies are separate, evenly spaced objects and do not mutate source',()=>{
  const src=createWorkshopObject('box','#88aaff',[1,1,-2]);src.dimensions=[2,.7,.5];
  const baseline=JSON.stringify(src),items=linearPattern(src,{copies:3,axis:'x',spacing:.5,snap:0});
  assert.deepEqual(items.map(o=>o.position),[[1.5,1,-2],[2,1,-2],[2.5,1,-2]]);
  assert.equal(new Set([src,...items].map(o=>o.id)).size,4);
  assert.deepEqual(items[2].dimensions,[2,.7,.5]);
  assert.equal(JSON.stringify(src),baseline);
  const scene=emptyWorkshop();scene.objects=[src,...items];
  assert.equal(readWorkshop(writeWorkshop(scene)).objects.length,4);
});
test('radial array includes source location and creates ring about offset pivot',()=>{
  const src=createWorkshopObject('sphere','#77ffee',[1,1,-3]);
  const items=radialPattern(src,{copies:3,radius:1,orient:true,snap:0});
  assert.deepEqual(items.map(o=>o.position.map(x=>Math.abs(x)<1e-7?0:+x.toFixed(4))),[
    [0,1,-2],[-1,1,-3],[0,1,-4]
  ]);
  assert.equal(+items[0].rotation[1].toFixed(5),+(Math.PI/2).toFixed(5));
  assert.equal(+items[1].rotation[1].toFixed(5),+Math.PI.toFixed(5));
  assert.ok(items.every(o=>o.id!==src.id&&o.color===src.color));
});
test('array placement validates bounds, duplication budgets and declared parameters',()=>{
  const src=createWorkshopObject('box','#ffffff',[24.9,1,-2]);
  assert.throws(()=>linearPattern(src,{copies:2,spacing:.2}),/position/);
  assert.throws(()=>linearPattern(src,{copies:1.5}),/integer/);
  assert.throws(()=>linearPattern(src,{copies:3,axis:'w'}),/axis/);
  assert.throws(()=>radialPattern(src,{copies:1}),/count/);
  assert.throws(()=>radialPattern(src,{copies:4,orient:'false'}),/orientation/);
  const mesh=createWorkshopMesh([0,0,0,1,0,0,0,1,0],'#334455');
  const copies=linearPattern(mesh,{copies:2,spacing:.5});
  assert.equal(copies[0].positions.length,9);
  assert.equal(validateWorkshop({schema:'domistika.xr.workshop.v1',objects:[mesh,...copies]}).objects.length,3);
});
test('alignment uses only object origins without changing reference or meshes',()=>{
  const source=createWorkshopObject('torus','#112233',[0,1,2]);
  const target=createWorkshopObject('box','#334455',[3,4,5]);
  const aligned=alignObjectCenter(source,target,'xz');
  assert.deepEqual(aligned.position,[3,1,5]);
  assert.deepEqual(source.position,[0,1,2]);
  assert.deepEqual(target.position,[3,4,5]);
  assert.deepEqual(alignObjectCenter(source,target,'xyz').position,[3,4,5]);
  assert.throws(()=>alignObjectCenter(source,source,'x'),/different/);
});
