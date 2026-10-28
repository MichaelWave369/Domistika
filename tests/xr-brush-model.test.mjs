import test from 'node:test';
import assert from 'node:assert/strict';
import {SPATIAL_SCHEMA,MAX_SPATIAL_POINTS,MAX_SPATIAL_STROKES,emptySpatialScene,newSpatialStroke,extendSpatialStroke,readSpatialScene,writeSpatialScene,sanitizeSpatialScene} from '../src/xr/brushModel.js';

test('spatial strokes roundtrip without touching board schema',()=>{
 const s=emptySpatialScene();
 assert.equal(s.schema,SPATIAL_SCHEMA);
 const stroke=newSpatialStroke([.2,1.4,-.4],'#FF44AA',14,'ribbon',true);
 assert.equal(extendSpatialStroke(stroke,[.202,1.4,-.4]),false);
 assert.equal(extendSpatialStroke(stroke,[.3,1.55,-.8]),true);
 s.strokes.push(stroke);
 assert.deepEqual(readSpatialScene(writeSpatialScene(s)),sanitizeSpatialScene(s));
 assert.equal(s.strokes[0].style,'ribbon');
 assert.equal(s.strokes[0].mirror,true);
});
test('no arbitrary object payloads or non-finite coordinates are accepted',()=>{
 const s=emptySpatialScene();s.strokes.push(newSpatialStroke([0,1,-1]));
 for(const p of [[Infinity,0,0],[0,NaN,0],[26,0,0],[1,2],[1,2,'3']]){
   const bad=structuredClone(s);bad.strokes[0].points=[p];
   assert.throws(()=>sanitizeSpatialScene(bad),/coordinate/);
 }
 assert.throws(()=>readSpatialScene('not json'));
 assert.throws(()=>readSpatialScene(JSON.stringify({schema:'other',strokes:[]})));
});
test('limits and unsupported styles are rejected',()=>{
 const s=emptySpatialScene();s.strokes.push(newSpatialStroke([0,1,0]));
 s.strokes[0].points=Array.from({length:MAX_SPATIAL_POINTS+1},()=>[0,1,0]);
 assert.throws(()=>sanitizeSpatialScene(s),/limit/);
 const many=emptySpatialScene();
 many.strokes=Array.from({length:MAX_SPATIAL_STROKES+1},()=>newSpatialStroke([0,1,0]));
 assert.throws(()=>sanitizeSpatialScene(many),/format/);
 const style=emptySpatialScene();style.strokes=[newSpatialStroke([0,1,0])];
 style.strokes[0].style='script';
 assert.throws(()=>sanitizeSpatialScene(style),/style/);
});
