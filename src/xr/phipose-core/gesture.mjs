import {defaultProfile,validateProfile} from "./calibration.mjs";
/**
 * OverStrings Living Gesture Bridge v1. Dependency-free, portable input logic.
 * Heuristics are not physically calibrated confidence scores. MIT licensed.
 */
export const FINGERS = Object.freeze(["index-finger","middle-finger","ring-finger","pinky-finger"]);
export const JOINT_NAMES = Object.freeze([
  "wrist", "thumb-metacarpal","thumb-phalanx-proximal","thumb-phalanx-distal","thumb-tip",
  ...FINGERS.flatMap(f=>[f+"-metacarpal",f+"-phalanx-proximal",
    f+"-phalanx-intermediate",f+"-phalanx-distal",f+"-tip"])
]);
export const BONES = Object.freeze([
  ["wrist","thumb-metacarpal"],["thumb-metacarpal","thumb-phalanx-proximal"],
  ["thumb-phalanx-proximal","thumb-phalanx-distal"],["thumb-phalanx-distal","thumb-tip"],
  ...FINGERS.flatMap(f=>[["wrist",f+"-metacarpal"],
    [f+"-metacarpal",f+"-phalanx-proximal"],
    [f+"-phalanx-proximal",f+"-phalanx-intermediate"],
    [f+"-phalanx-intermediate",f+"-phalanx-distal"],
    [f+"-phalanx-distal",f+"-tip"]])
]);
function finite(p) { return !!p && [p.x,p.y,p.z].every(Number.isFinite); }
export function distance(a,b) {
  if (!finite(a)||!finite(b)) return Infinity;
  return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
}
export function recognizeGesture(joints, sensitivity={}) {
  const pinchRatio = sensitivity?.pinchRatio ?? 0.35;
  const extensionRatio = sensitivity?.extensionRatio ?? 1.17;
  if (!Number.isFinite(pinchRatio) || pinchRatio < 0.2 || pinchRatio > 0.65 ||
      !Number.isFinite(extensionRatio) || extensionRatio < 1.0 || extensionRatio > 1.4) return "unknown";
  if (!joints || !finite(joints.wrist) || !finite(joints["thumb-tip"])) return "unknown";
  const width=distance(joints["index-finger-metacarpal"],joints["pinky-finger-metacarpal"]);
  if (!Number.isFinite(width)||width<.015||width>.22) return "unknown";
  const extended=[];
  for (const f of FINGERS) {
    const tip=joints[f+"-tip"], pip=joints[f+"-phalanx-proximal"];
    if (!finite(tip)||!finite(pip)) return "unknown";
    extended.push(distance(joints.wrist,tip)>distance(joints.wrist,pip)*extensionRatio);
  }
  if (distance(joints["thumb-tip"],joints["index-finger-tip"])<width*pinchRatio) return "pinch";
  const count=extended.filter(Boolean).length;
  if (count>=3) return "open";
  if (extended[0]&&!extended[1]&&!extended[2]&&!extended[3]) return "point";
  if (count<=1&&!extended[0]) return "grab";
  return "neutral";
}
export class GestureTracker {
  constructor({dwellMs=95,lostMs=150,profile=null}={}) {
    this.hands=new Map(); this.sequence=0;
    this.setProfile(profile || {...defaultProfile(),dwellMs,lostMs});
  }
  setProfile(profile) {
    this.profile=validateProfile(profile);
    this.dwellMs=this.profile.dwellMs;
    this.lostMs=this.profile.lostMs;
    this.reset();
  }
  update(handedness,joints,timeMs,source="webxr") {
    if (!["left","right"].includes(handedness)||!Number.isFinite(timeMs)) return [];
    const s=this.hands.get(handedness)||{
      gesture:"neutral",candidate:"neutral",since:timeMs,lastSeen:null
    };
    const events=[];
    const make=(gesture,phase)=>({
      version:1,type:"overstrings.gesture",id:"osg-"+(++this.sequence),
      source,handedness,gesture,phase,timestamp_ms:Math.round(timeMs)
    });
    const raw=recognizeGesture(joints,this.profile[handedness]);
    if (raw==="unknown") {
      if(s.lastSeen!==null && timeMs-s.lastSeen>=this.lostMs) {
        if(s.gesture!=="neutral") events.push(make(s.gesture,"lost"));
        s.gesture="neutral";s.candidate="neutral";s.since=timeMs;s.lastSeen=null;
      }
    } else {
      s.lastSeen=timeMs;
      if(raw!==s.candidate) {s.candidate=raw;s.since=timeMs;}
      if(raw!==s.gesture && timeMs-s.since>=this.dwellMs) {
        if(s.gesture!=="neutral") events.push(make(s.gesture,"end"));
        s.gesture=raw;
        if(raw!=="neutral") events.push(make(raw,"start"));
      }
    }
    this.hands.set(handedness,s);
    return events;
  }
  active(hand) {return this.hands.get(hand)?.gesture||"neutral";}
  reset() {this.hands.clear();}
}
export function toResonancePayload(evt) {
  if(!evt||evt.type!=="overstrings.gesture"||
     !["start","lost"].includes(evt.phase)||
     !["webxr","synthetic"].includes(evt.source)) return null;
  const map={
    open:["anchor_warm","gate_65_anchor"],
    pinch:["spiral_invoke","gate_71_spiral"],
    grab:["shield_shell","gate_69_shield"],
    point:["oracle_glow","gate_71_spiral"]
  };
  if(!Object.hasOwn(map,evt.gesture)) return null;
  const lost=evt.phase==="lost";
  const [preset,gate]=lost?["recovery_baseline","gate_65_anchor"]:map[evt.gesture];
  return {
    event_id:String(evt.id).slice(0,64),gate,preset_family_hint:preset,
    intensity_class:lost?"low":"medium",transport_class:"mock",
    degraded_used:lost,fallback_state:lost?"tracking_lost":"none",
    oracle_enabled:!lost && evt.gesture==="point",
    runtime_mode:!lost && evt.gesture==="point"?"oracle":"normal"
  };
}
