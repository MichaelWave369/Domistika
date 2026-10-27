import test from 'node:test';
import assert from 'node:assert/strict';
import {readBpcFramefieldPreview,normalizeBpcFramefieldPacket,triangulatePreview,BPC_PREVIEW_MAX_BYTES} from '../src/xr/framefieldPreview.js';
const box={representation:'editable-source-cage',
  vertices:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],
  faces:[[0,1,2,3],[4,5,6,7],[0,1,5,4],[3,2,6,7],[0,4,7,3],[1,5,6,2]]};
const packet=()=>({schema:'bpc.spatial-preview.v1',purpose:'inspection-only',coordinateSpace:'source-native',
 source:{format:'framefield.scene.v1',projectName:'BPC Workshop',sourceObjectCount:1},
 assets:[{kind:'framefield-object',sourceId:'sample-cube',label:'Editable cube',primitive:'box',color:'#ffaa77',
   mesh:structuredClone(box),modifiers:[{type:'mirror',axis:0,enabled:false}],
   keyframes:[{frame:120,position:[2,0,0],rotationRadians:[0,Math.PI/2,0],scale:[1,1,1]},
     {frame:0,position:[0,0,0],rotationRadians:[0,0,0],scale:[1,1,1]}],visible:true}],
 permissions:{execute:false,importIntoEditor:false,publish:false,render:false}});
test('real BPC-style Framefield cage creates 12 triangles from 6 quads',()=>{
  const output=normalizeBpcFramefieldPacket(packet());
  assert.equal(output.assets[0].triangleCount,12);
  assert.equal(output.assets[0].positions.length,12*9);
  assert.equal(output.assets[0].pose.frame,0);
  assert.deepEqual(output.assets[0].pose.position,[0,0,0]);
  assert.equal(output.vertices,8);
});
test('read uses same deterministic safe output; does not mutate source',()=>{
  const source=packet();const copy=structuredClone(source);
  const fromText=readBpcFramefieldPreview(JSON.stringify(source));
  assert.deepEqual(fromText,normalizeBpcFramefieldPacket(source));
  assert.deepEqual(source,copy);
});
test('rejects unknown, hostile and oversized packets',()=>{
  assert.throws(()=>readBpcFramefieldPreview('}{'),/not valid JSON/);
  assert.throws(()=>readBpcFramefieldPreview(' '.repeat(BPC_PREVIEW_MAX_BYTES+1)),/5 MiB/);
  const bad=packet();bad.permissions.publish=true;
  assert.throws(()=>normalizeBpcFramefieldPacket(bad),/deny execution/);
  bad.permissions.publish=false;bad.source.format='domistika.xr.scene.v1';
  assert.throws(()=>normalizeBpcFramefieldPacket(bad),/Framefield source/);
});
test('requires editable source cages and rejects active unapplied modifiers',()=>{
  const p=packet();p.assets[0].mesh={representation:'primitive-reference'};
  assert.throws(()=>normalizeBpcFramefieldPacket(p),/Convert to Editable Mesh/);
  const m=packet();m.assets[0].modifiers=[{type:'mirror',axis:0,enabled:true}];
  assert.throws(()=>normalizeBpcFramefieldPacket(m),/enabled modifiers/);
});
test('rejects nonplanar, concave, invalid, degenerate polygons',()=>{
  const a=packet();a.assets[0].mesh.faces=[[0,1,2,3]];
  a.assets[0].mesh.vertices[2]=[.5,.5,0];
  assert.throws(()=>normalizeBpcFramefieldPacket(a),/not planar/);
  const b=packet();b.assets[0].mesh.faces=[[0,1,999]];
  assert.throws(()=>normalizeBpcFramefieldPacket(b),/face index/);
  const concave=[[0,0,0],[2,0,0],[1,0.5,0],[2,2,0],[0,2,0]];
  assert.throws(()=>triangulatePreview(concave,[[0,1,2,3,4]]),/concave/);
  const c=packet();c.assets[0].mesh.faces=[[0,1,1]];
  assert.throws(()=>normalizeBpcFramefieldPacket(c),/Duplicate vertex/);
});
test('rejects nonfinite transforms, too many assets and false source asset count',()=>{
  const a=packet();a.assets[0].keyframes[0].rotationRadians=[NaN,0,0];
  assert.throws(()=>normalizeBpcFramefieldPacket(a),/radian rotation/);
  const b=packet();b.source.sourceObjectCount=3;
  assert.throws(()=>normalizeBpcFramefieldPacket(b),/asset count mismatch/);
  const c=packet();c.assets=Array.from({length:13},()=>structuredClone(c.assets[0]));c.source.sourceObjectCount=13;
  assert.throws(()=>normalizeBpcFramefieldPacket(c),/preview assets/);
});
