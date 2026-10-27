import test from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA, makeScene, makeBoard, newStroke, extendStroke, readScene, writeScene, sanitizeScene, MAX_BOARDS, MAX_POINTS } from '../src/xr/model.js';

test('new scene starts with exactly one selected canvas',()=>{
 const s=makeScene();assert.equal(s.schema,SCHEMA);assert.equal(s.boards.length,1);assert.equal(s.selectedId,s.boards[0].id);
});
test('new brush strokes are normalized and clamp coordinates',()=>{
 const s=newStroke('#80abfe',500,false,[-9,5]);
 assert.deepEqual(s.points[0],[0,1]);assert.equal(s.width,120);
 assert.equal(extendStroke(s,[.0001,1]),false);assert.equal(extendStroke(s,[.5,.5]),true);assert.equal(s.points.length,2);
});
test('scene JSON roundtrip retains strokes and transforms',()=>{
 const s=makeScene();s.boards[0].rotation=[0,1,0];s.boards[0].strokes.push(newStroke('#00aaff',12,false,[.2,.8]));
 assert.deepEqual(readScene(writeScene(s)),sanitizeScene(s));
});
test('invalid and hostile data is rejected',()=>{
 assert.throws(()=>readScene('not json'));
 assert.throws(()=>readScene(JSON.stringify({schema:'wrong',boards:[]})));
 const s=makeScene();s.boards[0].strokes.push({...newStroke('#abcdef',8),points:[[Infinity,0]]});
 assert.throws(()=>sanitizeScene(s),/coordinate/);
});
test('too many boards or points are rejected',()=>{
 const s=makeScene();for(let i=1;i<=MAX_BOARDS;i++)s.boards.push(makeBoard(i));
 assert.throws(()=>sanitizeScene(s),/1–12/);
 const s2=makeScene();s2.boards[0].strokes.push({...newStroke('#ffffff',4),points:Array.from({length:MAX_POINTS+1},()=>[.4,.5])});
 assert.throws(()=>sanitizeScene(s2),/stroke/);
});
test('duplicate canvas IDs are rejected',()=>{
 const s=makeScene();s.boards.push({...s.boards[0],strokes:[]});
 assert.throws(()=>sanitizeScene(s),/duplicate/);
});
test('names, scales and unknown selections are bounded',()=>{
 const s=makeScene();s.boards[0].name='x'.repeat(500);s.boards[0].scale=[99,-40,2];s.selectedId='missing';
 const clean=sanitizeScene(s);
 assert.equal(clean.boards[0].name.length,60);assert.deepEqual(clean.boards[0].scale,[4,.25,2]);assert.equal(clean.selectedId,clean.boards[0].id);
});
