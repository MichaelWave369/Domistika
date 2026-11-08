/**
 * Experimental local XR wrist swipe tokenizer. Coordinates are world/reference-
 * space X, NOT gaze-relative. It uses a tracked wrist AND an intentional
 * open/point pose; real hardware sensitivity is uncalibrated.
 * This module only describes motion symbols, never authorizes commands.
 */
const valid=p=>!!p&&[p.x,p.y,p.z].every(Number.isFinite);
export class WristMotionTokenizer {
  constructor({minTravelM=.15,minDurationMs=150,maxDurationMs=800,axisRatio=1.8}={}) {
    if(![minTravelM,minDurationMs,maxDurationMs,axisRatio].every(Number.isFinite)||
      minTravelM<.08||minTravelM>.4||minDurationMs<70||maxDurationMs>1400||
      maxDurationMs<=minDurationMs||axisRatio<1.2)
      throw new RangeError("Invalid swipe thresholds");
    Object.assign(this,{minTravelM,minDurationMs,maxDurationMs,axisRatio});
    this.hands=new Map();this.sequence=0;
  }
  reset(hand) {if(hand)this.hands.delete(hand);else this.hands.clear();}
  update(hand,joints,nowMs,pose,source="webxr") {
    if(!["left","right"].includes(hand)||!Number.isFinite(nowMs)||nowMs<0 ||
       !["webxr","synthetic"].includes(source)) return [];
    const wrist=joints?.wrist;
    if(!valid(wrist)||!["open","point"].includes(pose)){this.reset(hand);return [];}
    const s=this.hands.get(hand);
    if(!s || nowMs<=s.lastTime || nowMs-s.lastTime>200) {
      this.hands.set(hand,{origin:{...wrist},since:nowMs,lastTime:nowMs,latched:false,stillSince:null,last:{...wrist}});
      return [];
    }
    const dt=nowMs-s.since;
    const dx=wrist.x-s.origin.x,dy=wrist.y-s.origin.y,dz=wrist.z-s.origin.z;
    const stationary=Math.hypot(wrist.x-s.last.x,wrist.y-s.last.y,wrist.z-s.last.z)<.004;
    s.lastTime=nowMs;s.last={...wrist};
    if(s.latched) {
      if(stationary) {
        if(s.stillSince===null)s.stillSince=nowMs;
        if(nowMs-s.stillSince>=250) this.reset(hand);
      } else s.stillSince=null;
      return [];
    }
    if(dt>this.maxDurationMs){
      s.origin={...wrist};s.since=nowMs;return [];
    }
    if(dt<this.minDurationMs||Math.abs(dx)<this.minTravelM||
      Math.abs(dx)<Math.abs(dy)*this.axisRatio||
      Math.abs(dx)<Math.abs(dz)*this.axisRatio) return [];
    s.latched=true;
    const gesture=dx>0?"swipe-right":"swipe-left";
    return [Object.freeze({type:"overstrings.motion",version:1,phase:"start",
      id:"osm-"+(++this.sequence),source,handedness:hand,gesture,
      timestamp_ms:Math.round(nowMs)})];
  }
}
