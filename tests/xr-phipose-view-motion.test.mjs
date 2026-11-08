import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PHIPOSE_DEFAULT_SWIPE_M,palmSpanMeters,viewerRightAxis,
  calibratedSwipeDistance,LocalPalmCalibration,ViewRelativeSwipeTokenizer
} from '../src/xr/phiPoseViewMotion.js';
import {readFileSync} from 'node:fs';

const position=(x=0,y=0,z=0)=>({wrist:{x,y,z}});
const joints=(span=0.06)=>({
  ...position(),
  'index-finger-metacarpal':{x:span/2,y:0,z:0},
  'pinky-finger-metacarpal':{x:-span/2,y:0,z:0}
});
const pose=(orientation)=>({
  getViewerPose:()=>({transform:{orientation}})
});
const IDENTITY={x:0,y:0,z:0,w:1};
const YAW90={x:0,y:Math.SQRT1_2,z:0,w:Math.SQRT1_2};

test('headset right vector projects onto the horizontal and rejects invalid orientation',()=>{
  assert.deepEqual(viewerRightAxis(pose(IDENTITY),{}),{x:1,z:0});
  const turned=viewerRightAxis(pose(YAW90),{});
  assert.ok(Math.abs(turned.x)<1e-12);
  assert.ok(Math.abs(turned.z+1)<1e-12);
  assert.equal(viewerRightAxis(pose({x:0,y:0,z:Math.SQRT1_2,w:Math.SQRT1_2}),{}),null);
  assert.equal(viewerRightAxis(null,{}),null);
  assert.equal(viewerRightAxis(pose(IDENTITY),null),null);
  assert.equal(viewerRightAxis(pose({x:NaN,y:0,z:0,w:1}),{}),null);
  assert.equal(viewerRightAxis({getViewerPose:()=>{throw Error('lost');}},{}),null);
});

test('view-relative swipes follow the user, not the room global X axis',()=>{
  const s=new ViewRelativeSwipeTokenizer(),axis=viewerRightAxis(pose(YAW90),{});
  assert.deepEqual(s.update('right',position(),0,'open',axis),[]);
  const recognized=s.update('right',position(0,0,-0.18),230,'open',axis);
  assert.equal(recognized.length,1);
  assert.equal(recognized[0].gesture,'swipe-right');
  assert.equal(recognized[0].source,'webxr');
  assert.equal(s.update('right',position(0,0,-0.22),270,'open',axis).length,0);
  s.reset();
  s.update('left',position(),300,'point',{x:1,z:0});
  assert.equal(s.update('left',position(-.18),530,'point',{x:1,z:0})[0].gesture,'swipe-left');
});

test('head turns alone do not create a swipe; direction is frozen at motion start',()=>{
  const s=new ViewRelativeSwipeTokenizer();
  s.update('right',position(),0,'open',{x:1,z:0});
  // Viewer rotates but the wrist is still at its original world position.
  assert.deepEqual(s.update('right',position(),200,'open',viewerRightAxis(pose(YAW90),{})),[]);
  // A movement along the newly facing screen-right does NOT count mid-swipe.
  assert.deepEqual(s.update('right',position(0,0,-.20),300,'open',viewerRightAxis(pose(YAW90),{})),[]);
  // Horizontal movement in the original screen-right direction does count.
  assert.equal(s.update('right',position(.40,0,-.20),380,'open',
    viewerRightAxis(pose(YAW90),{}))[0].gesture,'swipe-right');
});

test('motion-denial checks reject vertical travel, forward travel, occlusion and time glitches',()=>{
  const s=new ViewRelativeSwipeTokenizer(),axis={x:1,z:0};
  s.update('right',position(),0,'open',axis);
  assert.deepEqual(s.update('right',position(.18,.16),190,'open',axis),[]);
  s.reset();s.update('right',position(),0,'open',axis);
  assert.deepEqual(s.update('right',position(.18,0,.17),230,'open',axis),[]);
  s.reset();s.update('right',position(),0,'open',axis);
  assert.deepEqual(s.update('right',position(.18),110,'open',axis),[]);
  assert.deepEqual(s.update('right',null,200,'open',axis),[]);
  assert.deepEqual(s.update('right',position(.18),280,'open',axis),[]);
  assert.deepEqual(s.update('right',position(.22),300,'neutral',axis),[]);
  assert.deepEqual(s.update('right',position(.4),700,'point',null),[]);
  assert.deepEqual(s.update('right',position(.4),900,'point',axis),[]);
  assert.equal(s.update('right',position(.59),1130,'point',axis)[0].gesture,'swipe-right');
  assert.throws(()=>s.configure({left:-1,right:3}),TypeError);
});

test('per-hand calibration uses bounded, independent palm spans, without storing joints',()=>{
  assert.equal(palmSpanMeters(joints(.06)),.06);
  assert.equal(palmSpanMeters(joints(.01)),null);
  assert.equal(palmSpanMeters(joints(.13)),null);
  assert.equal(palmSpanMeters(null),null);
  assert.equal(calibratedSwipeDistance(.06),.141);
  assert.equal(calibratedSwipeDistance(.08),.188);
  assert.equal(calibratedSwipeDistance(.115),.24);
  assert.equal(calibratedSwipeDistance(.03),null);
  const c=new LocalPalmCalibration(),session={};
  assert.equal(c.begin(session,100),true);
  for(let t=100;t<1300;t+=100){
    const p=c.update(t,session,{left:joints(.06),right:joints(.08)});
    assert.equal(p.state,'collecting');
  }
  const result=c.update(1300,session,{left:joints(.06),right:joints(.08)});
  assert.equal(result.state,'complete');
  assert.deepEqual(result.distances,{left:.141,right:.188});
  assert.equal(c.active,false);
  assert.deepEqual(Object.keys(c.samples),['left','right']);
  assert.equal(c.samples.left.length,0);
  const s=new ViewRelativeSwipeTokenizer();
  s.configure(result.distances);
  assert.equal(s.distances.left,.141);
  assert.equal(s.distances.right,.188);
  s.update('left',position(),0,'point',{x:1,z:0});
  assert.deepEqual(s.update('left',position(.13),230,'point',{x:1,z:0}),[]);
  assert.equal(s.update('left',position(.15),270,'point',{x:1,z:0})[0].gesture,'swipe-right');
  s.update('right',position(),0,'point',{x:1,z:0});
  assert.deepEqual(s.update('right',position(.16),230,'point',{x:1,z:0}),[]);
  assert.equal(s.update('right',position(.20),270,'point',{x:1,z:0})[0].gesture,'swipe-right');
});

test('calibration fails closed on tracking loss or changed XR session',()=>{
  const c=new LocalPalmCalibration(),session={};
  assert.equal(c.begin(session,0),true);
  c.update(0,session,{left:joints(),right:joints()});
  assert.equal(c.update(350,session,{left:null,right:null}).state,'tracking_lost');
  assert.equal(c.active,false);
  c.begin(session,500);
  assert.equal(c.update(700,{}, {left:joints(),right:joints()}).state,'cancelled');
  assert.equal(c.active,false);
});

test('new runtime path remains in-memory and does not require multi-window transport',()=>{
  const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
  const native=readFileSync(new URL('../src/xr/phiPoseNativeXR.js',import.meta.url),'utf8');
  const menu=readFileSync(new URL('../src/xr/phiPoseNativeMenu.js',import.meta.url),'utf8');
  assert.match(main,/nativePose\.startCalibration\(/);
  assert.match(main,/nativePose\.tick\(timeMs,xrFrame/);
  assert.match(native,/viewerRightAxis\(frame,referenceSpace\)/);
  assert.match(menu,/value:'calibrate'/);
  assert.doesNotMatch(native,/localStorage|sessionStorage|fetch\(|\.postMessage\(|\.sendBeacon\(/);
  assert.equal(PHIPOSE_DEFAULT_SWIPE_M,.15);
});
