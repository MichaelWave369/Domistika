/**
 * ΦPose Rung 14: headset-relative horizontal swipes + local hand-span calibration.
 * All distances are ephemeral meters in the current WebXR reference space.
 * View direction is sampled at gesture START and frozen so head turns cannot
 * create a false swipe. No recording, network traffic, storage or app authority.
 */
const finitePoint=p=>!!p&&[p.x,p.y,p.z].every(Number.isFinite);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const validHand=hand=>hand==='left'||hand==='right';
export const PHIPOSE_DEFAULT_SWIPE_M=0.15;

export function palmSpanMeters(joints){
  const a=joints?.['index-finger-metacarpal'];
  const b=joints?.['pinky-finger-metacarpal'];
  if(!finitePoint(a)||!finitePoint(b))return null;
  const d=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
  return d>=0.035&&d<=0.115?d:null;
}

/** World-space +X rotated by the viewer quaternion, projected onto floor XZ. */
export function viewerRightAxis(frame,referenceSpace){
  if(!frame||typeof frame.getViewerPose!=='function'||!referenceSpace)return null;
  let o;
  try{o=frame.getViewerPose(referenceSpace)?.transform?.orientation;}
  catch{return null;}
  if(!o||![o.x,o.y,o.z,o.w].every(Number.isFinite))return null;
  const norm=Math.hypot(o.x,o.y,o.z,o.w);
  if(norm<0.9||norm>1.1)return null;
  const {x,y,z,w}=o;
  const rx=1-2*(y*y+z*z),rz=2*(x*z-y*w);
  const horizontal=Math.hypot(rx,rz);
  return horizontal>=0.50?Object.freeze({x:rx/horizontal,z:rz/horizontal}):null;
}

export function calibratedSwipeDistance(span){
  if(!Number.isFinite(span)||span<0.035||span>0.115)return null;
  return Math.round(clamp(span*2.35,0.105,0.24)*1000)/1000;
}

/**
 * Deliberate 1.2s steady-hand calibration. Refuses untracked or implausible
 * samples, never stores raw points, times out on occlusion or session change.
 */
export class LocalPalmCalibration{
  constructor(){this.reset();}
  reset(){this.session=null;this.startedAt=null;this.lastBoth=null;this.samples={left:[],right:[]};}
  get active(){return this.session!==null;}
  begin(session,nowMs){
    this.reset();
    if(!session||!Number.isFinite(nowMs)||nowMs<0)return false;
    this.session=session;this.startedAt=nowMs;this.lastBoth=nowMs;
    return true;
  }
  update(nowMs,session,hands){
    if(!this.active)return {state:'idle'};
    if(session!==this.session||!Number.isFinite(nowMs)||nowMs<this.startedAt){
      this.reset();return {state:'cancelled'};
    }
    const a=palmSpanMeters(hands?.left),b=palmSpanMeters(hands?.right);
    if(a!==null&&b!==null){
      this.lastBoth=nowMs;
      if(this.samples.left.length<120){this.samples.left.push(a);this.samples.right.push(b);}
    }else if(nowMs-this.lastBoth>300){
      this.reset();return {state:'tracking_lost'};
    }
    if(nowMs-this.startedAt>3200){
      this.reset();return {state:'timeout'};
    }
    if(nowMs-this.startedAt<1200 || this.samples.left.length<12)
      return {state:'collecting',remainingMs:Math.max(0,1200-(nowMs-this.startedAt))};
    const middle=items=>{
      const sorted=[...items].sort((x,y)=>x-y);
      return sorted[Math.floor(sorted.length/2)];
    };
    const left=calibratedSwipeDistance(middle(this.samples.left));
    const right=calibratedSwipeDistance(middle(this.samples.right));
    this.reset();
    return left===null||right===null?{state:'invalid'}:{
      state:'complete',distances:Object.freeze({left,right})
    };
  }
}

export class ViewRelativeSwipeTokenizer{
  constructor({minDurationMs=150,maxDurationMs=800,axisRatio=1.8}={}){
    if(!Number.isFinite(minDurationMs)||minDurationMs<70||minDurationMs>400||
      !Number.isFinite(maxDurationMs)||maxDurationMs<400||maxDurationMs>1400||
      maxDurationMs<=minDurationMs||!Number.isFinite(axisRatio)||axisRatio<1.2||axisRatio>4)
      throw new RangeError('Invalid view-relative swipe thresholds');
    Object.assign(this,{minDurationMs,maxDurationMs,axisRatio});
    this.distances={left:PHIPOSE_DEFAULT_SWIPE_M,right:PHIPOSE_DEFAULT_SWIPE_M};
    this.hands=new Map();this.sequence=0;
  }
  configure(distances){
    if(!distances||!['left','right'].every(h=>
      Number.isFinite(distances[h])&&distances[h]>=.105&&distances[h]<=.24))
      throw new TypeError('Invalid hand-specific swipe distances');
    this.distances={left:distances.left,right:distances.right};
    this.reset();
  }
  reset(hand){
    if(hand)this.hands.delete(hand);
    else this.hands.clear();
  }
  update(hand,joints,nowMs,pose,axis,source='webxr'){
    if(!validHand(hand)||!Number.isFinite(nowMs)||nowMs<0||source!=='webxr')
      return [];
    const wrist=joints?.wrist;
    if(!finitePoint(wrist)||!['open','point'].includes(pose)||
      !axis||![axis.x,axis.z].every(Number.isFinite)||
      Math.abs(Math.hypot(axis.x,axis.z)-1)>0.02){
      this.reset(hand);return [];
    }
    const previous=this.hands.get(hand);
    if(!previous||nowMs<=previous.lastTime||nowMs-previous.lastTime>200){
      this.hands.set(hand,{origin:{...wrist},last:{...wrist},axis:{...axis},
        started:nowMs,lastTime:nowMs,latched:false,stillSince:null});
      return [];
    }
    const dt=nowMs-previous.started;
    const dx=wrist.x-previous.origin.x,dy=wrist.y-previous.origin.y,
      dz=wrist.z-previous.origin.z;
    const forward=dx*previous.axis.x+dz*previous.axis.z;
    const sideways=dx*(-previous.axis.z)+dz*previous.axis.x;
    const stationary=Math.hypot(
      wrist.x-previous.last.x,wrist.y-previous.last.y,wrist.z-previous.last.z)<.004;
    previous.lastTime=nowMs;previous.last={...wrist};
    if(previous.latched){
      if(stationary){
        if(previous.stillSince===null)previous.stillSince=nowMs;
        if(nowMs-previous.stillSince>=250)this.reset(hand);
      }else previous.stillSince=null;
      return [];
    }
    if(dt>this.maxDurationMs){
      previous.origin={...wrist};previous.axis={...axis};previous.started=nowMs;
      return [];
    }
    const travel=this.distances[hand];
    if(dt<this.minDurationMs||Math.abs(forward)<travel||
      Math.abs(forward)<Math.abs(sideways)*this.axisRatio||
      Math.abs(forward)<Math.abs(dy)*this.axisRatio)return [];
    previous.latched=true;
    return [Object.freeze({
      type:'overstrings.motion',version:1,phase:'start',
      id:'domistika-view-swipe-'+(++this.sequence),source,
      handedness:hand,gesture:forward>0?'swipe-right':'swipe-left',
      timestamp_ms:Math.round(nowMs)
    })];
  }
}
