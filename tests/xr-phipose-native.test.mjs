import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JOINT_NAMES,recognizeGesture} from '../src/xr/phipose-core/gesture.mjs';
import {PhiPoseInterpreter} from '../src/xr/phipose-core/phipose.mjs';
import {
  NativePhiPoseXR,DOMISTIKA_NATIVE_COMMANDS,
  readNativeXRHandJoints,planNativePhiPoseIntent
} from '../src/xr/phiPoseNativeXR.js';
import {DOMISTIKA_PHIPOSE_ACTIONS} from '../src/xr/phiPoseDomistikaHost.js';

const pins={
  'calibration.mjs':'e433d8e24d0e86dc25f04162a6075af1a17e4711',
  'gesture.mjs':'7eda0ed5a24414ecd3e090dfcd76f4f6c2c46711',
  'phipose.mjs':'e08ff1cdfce95afff71438f556679078dbecb88e',
  'wrist-motion.mjs':'47a9aaf73b52e669cd03a177a441fdb575c9dffb'
};
const context=(room='canvas')=>({
  room,canvasBrush:'solid',airBrush:'neon',
  pointerBusy:false,xrBusy:false
});
function handPoints(kind){
  const p={wrist:{x:0,y:0,z:0}};
  const names=['index-finger','middle-finger','ring-finger','pinky-finger'];
  names.forEach((finger,i)=>{
    const x=.03-i*.02;
    const extended=kind==='open'||kind==='neutral'&&i<2||
      kind==='point'&&i===0;
    p[finger+'-metacarpal']={x,y:.02,z:0};
    p[finger+'-phalanx-proximal']={x,y:.065,z:0};
    p[finger+'-phalanx-intermediate']={x,y:.095,z:0};
    p[finger+'-phalanx-distal']={x,y:.12,z:0};
    p[finger+'-tip']={x,y:extended?.175:.035,z:0};
  });
  p['thumb-metacarpal']={x:.07,y:.01,z:0};
  p['thumb-phalanx-proximal']={x:.09,y:.03,z:0};
  p['thumb-phalanx-distal']={x:.1,y:.07,z:0};
  p['thumb-tip']=kind==='pinch'
    ?{x:.034,y:.035,z:0}
    :{x:.11,y:.09,z:0};
  return p;
}
function mockXR(left='neutral',right='neutral',omit=null){
  const points={
    left:left===null?null:handPoints(left),
    right:right===null?null:handPoints(right)
  };
  const inputSources=[];
  for(const hand of ['left','right']){
    if(points[hand]===null)continue;
    const joints=new Map(JOINT_NAMES.map(name=>[name,{name,hand}]));
    inputSources.push({hand:joints,handedness:hand});
  }
  const session={inputSources};
  const frame={getJointPose(space,referenceSpace){
    assert.equal(referenceSpace,'local-floor');
    if(space.name===omit)return null;
    const position=points[space.hand]?.[space.name];
    return position?{transform:{position}}:null;
  }};
  return {session,frame,referenceSpace:'local-floor'};
}
function run(controller,t,mock,ctx=context()){
  // Keep the same session across frames: only its inputSources change.
  controller.tick(t,mock.frame,controller._session,mock.referenceSpace,ctx);
}
test('native runtime uses exact reviewed OverStrings heuristic + phrase modules',()=>{
  for(const [name,expected] of Object.entries(pins)){
    const bytes=readFileSync(new URL('../src/xr/phipose-core/'+name,import.meta.url));
    const gitBlob=createHash('sha1').update(Buffer.concat([
      Buffer.from('blob '+bytes.length+'\0'),bytes
    ])).digest('hex');
    assert.equal(gitBlob,expected,name);
  }
  assert.ok(new PhiPoseInterpreter({advisoryActionIds:DOMISTIKA_PHIPOSE_ACTIONS}));
  assert.deepEqual(DOMISTIKA_NATIVE_COMMANDS.map(x=>x.actionId),DOMISTIKA_PHIPOSE_ACTIONS);
});
test('actual WebXR classifier works with physically plausible synthetic joint fixtures',()=>{
  for(const kind of ['open','point','grab','pinch','neutral']){
    assert.equal(recognizeGesture(handPoints(kind)),kind,kind);
  }
  const source=mockXR('open','pinch');
  const read=readNativeXRHandJoints(source.frame,source.session,source.referenceSpace);
  assert.deepEqual(read.left.wrist,{x:0,y:0,z:0});
  assert.equal(JOINT_NAMES.length,Object.keys(read.left).length);
  assert.equal(recognizeGesture(read.right),'pinch');
  assert.equal(readNativeXRHandJoints(null,source.session,source.referenceSpace).left,null);
  assert.equal(readNativeXRHandJoints(source.frame,source.session,null).right,null);
  assert.equal(readNativeXRHandJoints(source.frame,source.session,source.referenceSpace).left!==null,true);
  assert.equal(readNativeXRHandJoints(mockXR('open','pinch','thumb-tip').frame,
    source.session,source.referenceSpace).left,null);
});
test('native gestures stay off until a local deliberate arm and both hands tracked',()=>{
  const events=[],n=new NativePhiPoseXR({onAction:p=>events.push(p)});
  assert.equal(n.armed,false);
  assert.equal(n.arm(mockXR().session,300),false);
  assert.equal(n.status,'NEED TWO TRACKED XR HANDS');
  const x=mockXR();
  n._session=x.session;
  run(n,300,x);
  assert.equal(n.tracked.left,true);
  assert.equal(n.tracked.right,true);
  assert.equal(n.arm(x.session,300),true);
  assert.equal(n.armed,true);
  assert.equal(n.command.script,'L:open > R:grab');
  n.cancel('OPERATOR CANCELLED');
  assert.equal(n.armed,false);
  assert.deepEqual(events,[]);
});
test('two deliberate tracked poses execute exactly one local, UI-only plan',()=>{
  const fired=[],statuses=[];
  const n=new NativePhiPoseXR({
    onStatus:s=>statuses.push(s),onAction:(plan,intent)=>fired.push({plan,intent})
  });
  const x=mockXR();
  n._session=x.session;
  run(n,100,x);
  assert.equal(n.arm(x.session,100),true);
  run(n,550,mockXR('open','neutral'));
  run(n,660,mockXR('open','neutral')); // dwell emits left open start
  assert.equal(n.armed,true);
  run(n,830,mockXR('open','grab')); // right-hand candidate begins
  run(n,950,mockXR('open','grab')); // dwell emits right grab; step gap >180ms
  assert.equal(fired.length,1);
  assert.deepEqual(fired[0].plan,{kind:'room',room:'home'});
  assert.equal(fired[0].intent.action_authority,false);
  assert.equal(fired[0].intent.execution_authority,false);
  assert.equal(fired[0].intent.source,'webxr');
  assert.equal(fired[0].intent.action_id,'domistika.room.home');
  assert.equal(n.armed,false);
  run(n,1100,mockXR('open','grab'));
  assert.equal(fired.length,1);
  assert.ok(statuses.some(s=>s.startsWith('UI SELECTED')));
});
test('simultaneous postures cannot complete a sequential phrase',()=>{
  const fired=[],n=new NativePhiPoseXR({onAction:p=>fired.push(p)});
  const x=mockXR();
  n._session=x.session;run(n,100,x);assert.equal(n.arm(x.session,100),true);
  run(n,550,mockXR('open','grab'));
  run(n,660,mockXR('open','grab')); // same-frame starts are not two steps
  assert.equal(fired.length,0);
  run(n,7000,mockXR('open','grab'));
  assert.equal(n.armed,false);
  assert.deepEqual(fired,[]);
});
test('loss, out-of-context painting and session replacement fail closed',()=>{
  const n=new NativePhiPoseXR(),x=mockXR();
  n._session=x.session;run(n,100,x);n.arm(x.session,100);
  run(n,550,mockXR('open',null));
  run(n,900,mockXR('open',null));
  assert.equal(n.armed,false);
  assert.match(n.status,/HAND TRACKING LOST/);

  run(n,1000,x);n.arm(x.session,1000);
  run(n,1500,mockXR(),{...context(),xrBusy:true});
  assert.equal(n.armed,false);
  assert.match(n.status,/DRAWING ACTIVE/);

  run(n,2000,x);n.arm(x.session,2000);
  n.tick(2300,x.frame,{...x.session},x.referenceSpace,context());
  assert.equal(n.armed,false);
  assert.match(n.status,/SESSION CHANGED/);
});
test('local UI planners deny unauthorized actions and busy state',()=>{
  const good={
    schema:'overstrings.phipose.intent.v0.1',source:'webxr',advisory:true,
    action_authority:false,execution_authority:false,
    action_id:'domistika.brush.next'
  };
  assert.deepEqual(planNativePhiPoseIntent(good,'domistika.brush.next',context()),
    {kind:'brush',room:'canvas',style:'dry'});
  assert.equal(planNativePhiPoseIntent({...good,source:'synthetic'},good.action_id,context()),null);
  assert.equal(planNativePhiPoseIntent({...good,execution_authority:true},good.action_id,context()),null);
  assert.equal(planNativePhiPoseIntent({...good,action_id:'domistika.scene.save'},good.action_id,context()),null);
  assert.equal(planNativePhiPoseIntent(good,good.action_id,{...context(),pointerBusy:true}),null);
  assert.equal(planNativePhiPoseIntent(good,'domistika.room.home',context()),null);
});
test('XR UI wiring preserves standard controller route but prevents painting while armed',()=>{
  const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
  const menu=readFileSync(new URL('../src/xr/phiPoseNativeMenu.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
  assert.match(main,/createNativePhiPoseMenu\(/);
  assert.match(main,/renderer\.setAnimationLoop\(\(timeMs,xrFrame\)=>/);
  assert.match(main,/xrFrame,renderer\.xr\.getSession\(\),renderer\.xr\.getReferenceSpace\(\)/);
  assert.match(main,/if\(nativePose\.armed\s*&&/);
  assert.match(main,/if\(a\.type==='phipose-native'\)/);
  assert.match(main,/nativePose\.resetSession\(\)/);
  assert.match(menu,/type:'phipose-native'/);
  assert.match(html,/id="phipose-native-status"/);
  assert.doesNotMatch(menu,/writeScene|persist\(|brushStudio\.start|workshop\.add/);
});


test('explicit native calibration changes per-hand swipe settings only for current session',()=>{
  const feedback=[],effects=[],n=new NativePhiPoseXR({
    onFeedback:text=>feedback.push(text),onAction:plan=>effects.push(plan)
  });
  const source=mockXR();
  n._session=source.session;
  run(n,100,source);
  assert.equal(n.startCalibration(source.session,100),true);
  assert.equal(n.calibration.active,true);
  assert.equal(n.arm(source.session,100),false);
  for(let t=200;t<=1400;t+=100)run(n,t,source);
  assert.equal(n.calibration.active,false);
  assert.deepEqual(n.calibrationDistances,{left:.141,right:.141});
  assert.deepEqual(n.motion.distances,{left:.141,right:.141});
  assert.equal(n.armed,false);
  assert.deepEqual(effects,[]);
  assert.ok(feedback.some(x=>x.includes('CALIBRATING')));
  assert.ok(feedback.at(-1).includes('L14cm R14cm'));
  assert.equal(n.arm(source.session,1450),true);
  n.cancel('OPERATOR CANCELLED');
  n.resetSession();
  assert.equal(n.calibrationDistances,null);
  assert.deepEqual(n.motion.distances,{left:.15,right:.15});
  assert.equal(n.tracked.left,false);
});
test('native calibration cannot start while pose armed; cancel revokes calibration',()=>{
  const n=new NativePhiPoseXR(),x=mockXR();n._session=x.session;
  run(n,100,x);
  assert.equal(n.arm(x.session,100),true);
  assert.equal(n.startCalibration(x.session,200),false);
  assert.equal(n.calibration.active,false);
  n.cancel();
  assert.equal(n.startCalibration(x.session,200),true);
  n.cancel('STOP CALIBRATION');
  assert.equal(n.calibration.active,false);
  assert.equal(n.armed,false);
});
