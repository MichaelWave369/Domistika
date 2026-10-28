import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOpenBluePreview,summarizeOpenBlue,OPENBLUE_MAX_BYTES,OPENBLUE_MAX_WALLS} from '../src/xr/openblueModel.js';
const sample={schemaVersion:'openblueprint.project/1',
 metadata:{title:'Test design',units:'ft',grid:1,updatedAt:'2026-10-28T00:00:00Z'},
 walls:[{id:'w1',x1:0,y1:0,x2:12,y2:0,thickness:.5,height:9}],
 symbols:[{id:'s1',type:'network',x:4,y:3,rotation:90}]};
const parse=(data)=>parseOpenBluePreview(JSON.stringify(data));
test('real OpenBlueprint project schema produces readable preview with correct feet conversion',()=>{
 const r=parse(sample);
 assert.equal(r.metersPerUnit,.3048);
 assert.equal(r.walls[0].height,9);
 assert.deepEqual(summarizeOpenBlue(r),{walls:1,symbols:1,units:'ft',width:12,depth:3,title:'Test design'});
 assert.equal(parse({...sample,metadata:{...sample.metadata,units:'m'}}).metersPerUnit,1);
});
test('invalid and excessive CAD geometry is refused before replacing existing preview',()=>{
 assert.throws(()=>parse({...sample,schemaVersion:'other'}),/Not an OpenBlueprint/);
 assert.throws(()=>parse({...sample,walls:[{...sample.walls[0],x2:NaN}]}),/outside supported/);
 assert.throws(()=>parse({...sample,walls:[{...sample.walls[0],x2:0}]}),/Zero-length/);
 assert.throws(()=>parse({...sample,symbols:[{...sample.symbols[0],id:'w1'}]}),/duplicated/);
 assert.throws(()=>parse({...sample,symbols:[{...sample.symbols[0],type:'script'}]}),/Unsupported/);
 assert.throws(()=>parse({...sample,walls:Array.from({length:OPENBLUE_MAX_WALLS+1},(_,i)=>({...sample.walls[0],id:'wall'+i}))}),/Preview limit/);
 assert.throws(()=>parseOpenBluePreview('x'.repeat(OPENBLUE_MAX_BYTES+1)),/2 MB/);
});
test('CAD display bounds account for wall geometry and independent symbols',()=>{
 const r=parse(sample);
 assert.deepEqual(r.bounds,{minX:0,maxX:12,minY:0,maxY:3});
});
