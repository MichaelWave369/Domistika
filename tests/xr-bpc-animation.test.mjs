import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {framefieldEase,normalizeBpcFramefieldPacket,sampleFramefieldPose} from '../src/xr/framefieldPreview.js';

const sourcePacket=()=>({
  schema:'bpc.spatial-preview.v1',purpose:'inspection-only',coordinateSpace:'source-native',
  source:{format:'framefield.scene.v1',projectName:'Motion from Framefield',sourceObjectCount:1,fps:24,duration:120},
  permissions:{execute:false,importIntoEditor:false,publish:false,render:false},
  assets:[{kind:'framefield-object',sourceId:'sample',label:'Cylinder test',primitive:'cylinder',color:'#abcdef',
    visible:true,modifiers:[],mesh:{representation:'editable-source-cage',
      vertices:[[0,0,0],[1,0,0],[0,1,0]],faces:[[0,1,2]]},
    keyframes:[{frame:0,position:[0,0,0],rotationRadians:[0,0,0],scale:[1,1,1],
      curves:{'position.0':'hold','rotation.1':[0,0,.58,1]}},
      {frame:60,position:[5,0,0],rotationRadians:[0,Math.PI,0],scale:[2,1,1]},
      {frame:120,position:[0,0,0],rotationRadians:[0,Math.PI*2,0],scale:[1,1,1]}]}]
});
test('preserves BPC source FPS, duration, Framefield outgoing easing and every keyframe',()=>{
 const p=normalizeBpcFramefieldPacket(sourcePacket());
 assert.equal(p.fps,24);assert.equal(p.duration,120);assert.equal(p.assumedTiming,false);
 assert.deepEqual(p.assets[0].keyframes.map(k=>k.frame),[0,60,120]);
 assert.deepEqual(p.assets[0].keyframes[0].curves['position.0'],'hold');
 assert.equal(sampleFramefieldPose(p.assets[0].keyframes,30).position[0],0);
 assert.equal(sampleFramefieldPose(p.assets[0].keyframes,60).position[0],5);
 assert.equal(sampleFramefieldPose(p.assets[0].keyframes,90).position[0],2.5);
});
test('continuous easing matches Framefield linear and endpoint semantics',()=>{
 assert.equal(framefieldEase(0,'hold'),0);
 assert.equal(framefieldEase(1,'hold'),1);
 assert.equal(framefieldEase(.5,'hold'),0);
 assert.equal(framefieldEase(.5,[0,0,1,1]),.5);
 const easing=framefieldEase(.25,[.42,0,1,1]);
 assert.ok(easing>0&&easing<.25);
 const p=normalizeBpcFramefieldPacket(sourcePacket());
 const f=sampleFramefieldPose(p.assets[0].keyframes,90);
 assert.equal(f.rotationRadians[1],Math.PI*1.5);
 assert.deepEqual(sampleFramefieldPose(p.assets[0].keyframes,-15).position,[0,0,0]);
 assert.deepEqual(sampleFramefieldPose(p.assets[0].keyframes,300).position,[0,0,0]);
});
test('legacy v0.2 previews without FPS/duration keep a documented fallback',()=>{
 const legacy=sourcePacket();delete legacy.source.fps;delete legacy.source.duration;
 const p=normalizeBpcFramefieldPacket(legacy);
 assert.equal(p.fps,24);assert.equal(p.duration,120);assert.equal(p.assumedTiming,true);
});
test('rejects hostile curves, duplicate frames, and invalid declared frame boundaries',()=>{
 const weird=sourcePacket();weird.assets[0].keyframes[0].curves={'position.3':[0,0,1,1]};
 assert.throws(()=>normalizeBpcFramefieldPacket(weird),/animation curve channel/);
 const huge=sourcePacket();huge.assets[0].keyframes[0].curves={'position.0':[0,-1,1,1]};
 assert.throws(()=>normalizeBpcFramefieldPacket(huge),/Bezier curve/);
 const duplicate=sourcePacket();duplicate.assets[0].keyframes[2].frame=60;
 assert.throws(()=>normalizeBpcFramefieldPacket(duplicate),/Duplicate keyframe/);
 const end=sourcePacket();end.source.duration=50;
 assert.throws(()=>normalizeBpcFramefieldPacket(end),/duration/);
 const disallowed=sourcePacket();disallowed.permissions.render=true;
 assert.throws(()=>normalizeBpcFramefieldPacket(disallowed),/deny execution/);
});
test('animation loop, XR in-world play control and scrubbing are wired while board serialization stays untouched',()=>{
 const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
 const model=readFileSync(new URL('../src/xr/model.js',import.meta.url),'utf8');
 assert.match(html,/id="bpcAnimationButton"/);
 assert.match(html,/id="bpcTimeline"/);
 assert.match(main,/function toggleBpcPlayback/);
 assert.match(main,/function updateBpcPlayback/);
 assert.match(main,/renderer\.setAnimationLoop\(timeMs=>/);
 assert.match(main,/type:'bpc-playback'/);
 assert.match(main,/sampleFramefieldPose\(bpcMotion\.assets\[i\]\.keyframes/);
 assert.match(main,/document\.addEventListener\('visibilitychange'/);
 assert.doesNotMatch(model,/bpcMotion|bpcTimeline|framefieldPreview/);
});
