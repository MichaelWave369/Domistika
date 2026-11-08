/**
 * PhiPose Language v0.1: small typed symbolic grammar + one-shot interpreter.
 * Pose symbols come from OverStrings' existing heuristics; motions are separate.
 * This emits advisory, zero-authority intents ONLY. Not authentication.
 * No code evaluation, user-supplied URLs, or commands are allowed.
 */
export const PHIPOSE_SCHEMA = "overstrings.phipose.v0.1";
export const PHIPOSE_SYMBOLS = Object.freeze(["open","pinch","grab","point","swipe-left","swipe-right"]);
export const PHIPOSE_ACTIONS = Object.freeze({
  "phios.view.home":"PhiOS: Home view",
  "phios.view.research":"PhiOS: Research view",
  "phios.view.build":"PhiOS: Build view",
  "phios.view.ledger":"PhiOS: Ledger view",
  "phios.command.open":"PhiOS: Open command palette"
});
const SOURCES = Object.freeze(["webxr","synthetic"]);
const canonical = token => token.hand+":"+token.symbol;
function parseStep(str) {
  const tokens = str.split("+").map(x=>x.trim());
  if (!tokens.length || tokens.length>2) throw new SyntaxError("Step accepts one pose or a two-hand chord");
  const found = new Set();
  return Object.freeze(tokens.map(item=>{
    const m=/^([LR]):(open|pinch|grab|point|swipe-left|swipe-right)$/.exec(item);
    if(!m)throw new SyntaxError("Unknown symbol: "+item);
    if(found.has(m[1]))throw new SyntaxError("Chord must use distinct hands");
    found.add(m[1]);
    return Object.freeze({hand:m[1]==="L"?"left":"right",symbol:m[2]});
  }).sort((a,b)=>canonical(a).localeCompare(canonical(b))));
}
/**
 * PhiPose EBNF:
 * program = step , { ">" , step } ;
 * step = token | token , "+" , token ;
 * token = ("L"|"R") , ":" , pose ;
 * pose = open|pinch|grab|point|swipe-left|swipe-right ;
 */
export function parsePhiPose(script) {
  if(typeof script!=="string"||script.length>140||!script.trim())
    throw new SyntaxError("Phrase must be a non-empty bounded string");
  const steps=script.split(">").map(x=>parseStep(x.trim()));
  if(steps.length<2||steps.length>5)
    throw new SyntaxError("Phrase must have 2 to 5 steps to reduce accidental activation");
  return Object.freeze({schema:PHIPOSE_SCHEMA,steps:Object.freeze(steps)});
}
export function serializePhiPose(program) {
  if(!program || program.schema!==PHIPOSE_SCHEMA)throw new TypeError("Invalid program");
  return program.steps.map(step=>step.map(x=>(x.hand==="left"?"L":"R")+":"+x.symbol).join("+")).join(" > ");
}
function validEvent(evt) {
  return !!evt && typeof evt==="object"&&!Array.isArray(evt)&&evt.version===1&&
    ["overstrings.gesture","overstrings.motion"].includes(evt.type)&&evt.phase==="start"&&
    SOURCES.includes(evt.source)&&["left","right"].includes(evt.handedness)&&
    PHIPOSE_SYMBOLS.includes(evt.gesture)&&Number.isSafeInteger(evt.timestamp_ms)&&evt.timestamp_ms>=0&&
    (evt.type==="overstrings.motion"?
      ["swipe-left","swipe-right"].includes(evt.gesture):
      !evt.gesture.startsWith("swipe-"));
}
export class PhiPoseInterpreter {
  constructor({stepTimeoutMs=1800,phraseTimeoutMs=6500,chordWindowMs=450,cooldownMs=1200,advisoryActionIds=null}={}) {
    if(![stepTimeoutMs,phraseTimeoutMs,chordWindowMs,cooldownMs].every(Number.isFinite) ||
      stepTimeoutMs<400||stepTimeoutMs>5000||phraseTimeoutMs<1600||phraseTimeoutMs>15000 ||
      chordWindowMs<100||chordWindowMs>1200||cooldownMs<500||cooldownMs>10000 ||
      phraseTimeoutMs<stepTimeoutMs) throw new RangeError("Invalid interpreter timing limits");
    Object.assign(this,{stepTimeoutMs,phraseTimeoutMs,chordWindowMs,cooldownMs});
    // Callers may extend only the advisory vocabulary, never host capabilities.
    // Actual PhiOS transport keeps its own fixed, independent allowlist.
    if(advisoryActionIds!==null && (!Array.isArray(advisoryActionIds)||
       advisoryActionIds.length<1||advisoryActionIds.length>12||
       new Set(advisoryActionIds).size!==advisoryActionIds.length||
       !advisoryActionIds.every(x=>typeof x==="string"&&
         /^[a-z][a-z0-9-]{1,30}(?:\.[a-z][a-z0-9-]{1,30}){1,3}$/.test(x))))
      throw new TypeError("Invalid advisory action registry");
    this.advisoryActionIds=Object.freeze(advisoryActionIds===null?
      Object.keys(PHIPOSE_ACTIONS):[...advisoryActionIds]);
    this.binding=null;this.armed=false;this.sequence=0;this.lastAccepted=-Infinity;
    this.resetProgress();
  }
  resetProgress(){
    this.index=0;this.seen=new Set();this.stepStarted=null;this.startedAt=null;this.lastStepAt=null;
  }
  configure({script,actionId,source="webxr",allowSyntheticDemo=false}={}) {
    this.disarm();this.binding=null;
    if(!this.advisoryActionIds.includes(actionId))throw new TypeError("Unapproved advisory command");
    if(!SOURCES.includes(source)||typeof allowSyntheticDemo!=="boolean")
      throw new TypeError("Invalid input source");
    this.binding=Object.freeze({
      program:parsePhiPose(script),actionId,source,allowSyntheticDemo
    });
    return this.binding.program;
  }
  arm() {
    this.disarm();
    if(!this.binding)return {armed:false,reason:"not_configured"};
    if(this.binding.source==="synthetic"&&!this.binding.allowSyntheticDemo)
      return {armed:false,reason:"synthetic_disabled"};
    this.armed=true;return {armed:true,reason:"one_shot_armed"};
  }
  disarm(){this.armed=false;this.resetProgress();}
  cancel(){this.disarm();}
  /**
   * consume() must receive a fresh, debounced input event from the same runtime.
   * Even valid output is an UNTRUSTED advisory; PhiOS must independently authorize.
   */
  consume(evt,nowMs) {
    if(!this.armed)return {accepted:false,reason:"not_armed"};
    if(!Number.isFinite(nowMs)||nowMs<0){this.disarm();return {accepted:false,reason:"clock_invalid"};}
    if(!validEvent(evt)){this.disarm();return {accepted:false,reason:"invalid_event"};}
    if(evt.source!==this.binding.source || (evt.source==="synthetic"&&!this.binding.allowSyntheticDemo)){
      this.disarm();return {accepted:false,reason:"source_denied"};
    }
    if(evt.timestamp_ms>nowMs+100||evt.timestamp_ms<nowMs-350){
      this.disarm();return {accepted:false,reason:"stale_event"};
    }
    if(this.startedAt!==null && (nowMs-this.startedAt>this.phraseTimeoutMs ||
      (this.lastStepAt!==null&&nowMs-this.lastStepAt>this.stepTimeoutMs))){
      this.disarm();return {accepted:false,reason:"phrase_expired"};
    }
    const step=this.binding.program.steps[this.index];
    const token={hand:evt.handedness,symbol:evt.gesture};
    const key=canonical(token);
    // A swipe requires the wrist motion detector to see an open/point carrier
    // pose first. That carrier is NOT a grammar token and must never complete
    // the swipe. Only ignore it when this same hand's next token is a swipe.
    if((evt.gesture==="open"||evt.gesture==="point")&&
       step.some(x=>x.hand===evt.handedness&&x.symbol.startsWith("swipe-"))){
      return {accepted:false,reason:"motion_carrier"};
    }
    if(!step.some(x=>canonical(x)===key)){
      // All unexpected start events cancel the attempt rather than silently navigating.
      this.disarm();return {accepted:false,reason:"unexpected_symbol"};
    }
    if(this.seen.has(key))return {accepted:false,reason:"duplicate_symbol"};
    if(this.startedAt===null)this.startedAt=nowMs;
    if(this.stepStarted===null)this.stepStarted=nowMs;
    if(nowMs-this.stepStarted>this.chordWindowMs && step.length>1){
      this.disarm();return {accepted:false,reason:"chord_expired"};
    }
    this.seen.add(key);
    this.lastStepAt=nowMs;
    if(this.seen.size<step.length)
      return {accepted:false,reason:"awaiting_chord",progress:this.index,remaining:step.length-this.seen.size};
    this.index+=1;this.seen.clear();this.stepStarted=null;
    if(this.index<this.binding.program.steps.length)
      return {accepted:false,reason:"step_completed",progress:this.index};
    // Completed phrase never implies host approval, authentication or OS authority.
    const binding=this.binding;
    this.disarm();
    if(nowMs-this.lastAccepted<this.cooldownMs)
      return {accepted:false,reason:"cooldown"};
    this.lastAccepted=nowMs;
    const intent=Object.freeze({
      schema:"overstrings.phipose.intent.v0.1",version:1,
      advisory:true,action_authority:false,execution_authority:false,
      action_id:binding.actionId,source:binding.source,program:serializePhiPose(binding.program),
      sequence:++this.sequence,timestamp_ms:Math.round(nowMs)
    });
    return {accepted:true,reason:"advisory_only",intent};
  }
  trackingLost() {if(this.armed)this.disarm();}
}
