/**
 * ΦPose Host SDK Rung 10 (ES module, dependency-free, MIT)
 *
 * Shared, reviewable, zero-authority decoder for advisory gesture intents.
 * Host applications MUST independently choose allowlisted UI actions and
 * explicitly enable a short-lived session from a real operator interaction.
 * This SDK never listens to window events, writes files, performs effects,
 * installs capabilities, authenticates a person, or grants OS privileges.
 */
export const PHIPOSE_HOST_SDK_VERSION = 'phipose.host-sdk.v0.1';
export const PHIPOSE_INTENT_SCHEMA = 'overstrings.phipose.intent.v0.1';
const ID=/^[a-z][a-z0-9-]{1,30}(?:\.[a-z][a-z0-9-]{1,30}){1,3}$/;
const APP=/^[a-z][a-z0-9-]{1,30}$/;
const PROTOCOL=/^[a-z][a-z0-9-]{1,30}(?:\.[a-z][a-z0-9-]{1,30}){1,3}\.v0\.1$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POSES=new Set(['open','pinch','grab','point','swipe-left','swipe-right']);
const PACKET_KEYS=['protocol','type','session_id','sent_at','intent'];
const INTENT_KEYS=['schema','version','advisory','action_authority','execution_authority',
  'action_id','source','program','sequence','timestamp_ms'];
const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const exact=(value,keys)=>isObject(value)&&Object.keys(value).length===keys.length&&
  Object.keys(value).every(key=>keys.includes(key));
const fail=reason=>Object.freeze({accepted:false,reason});

export function validatePhiPoseSentence(sentence) {
  if(typeof sentence!=='string'||sentence.length>140)return false;
  const steps=sentence.split(' > ');
  if(steps.length<2||steps.length>5)return false;
  for(const step of steps){
    const tokens=step.split('+');
    if(tokens.length<1||tokens.length>2)return false;
    const hands=[];
    for(const token of tokens){
      const match=/^([LR]):([a-z-]+)$/.exec(token);
      if(!match||!POSES.has(match[2])||hands.includes(match[1]))return false;
      hands.push(match[1]);
    }
    if(tokens.length===2&&hands.join('')!=='LR')return false;
  }
  return true;
}

export function validPhiPoseOrigin(origin) {
  if(typeof origin!=='string'||origin.length>300)return false;
  try{
    const u=new URL(origin);
    const loopback=['localhost','127.0.0.1','[::1]'].includes(u.hostname);
    return u.origin===origin&&!u.username&&!u.password&&
      (u.protocol==='https:'||(u.protocol==='http:'&&loopback));
  }catch{return false;}
}

/**
 * The caller owns allowlisting AND actual UI dispatch; the SDK only validates
 * and returns immutable decisions. A guard may return a denial reason string,
 * or null/undefined when the app's CURRENT UI context permits the action.
 * Guard cannot grant authority or change the action ID.
 */
export class ScopedPhiPoseHost {
  constructor({appId,protocol,actionIds,guard=()=>null,cooldownMs=900}={}){
    if(typeof appId!=='string'||!APP.test(appId)||
      typeof protocol!=='string'||!PROTOCOL.test(protocol)||
      !Array.isArray(actionIds)||actionIds.length<1||actionIds.length>12||
      !actionIds.every(id=>typeof id==='string'&&ID.test(id)&&id.startsWith(appId+'.'))||
      new Set(actionIds).size!==actionIds.length||
      typeof guard!=='function'||!Number.isInteger(cooldownMs)||
      cooldownMs<500||cooldownMs>5000)
      throw new TypeError('Invalid scoped ΦPose host configuration');
    this.appId=appId;
    this.protocol=protocol;
    this.allowed=Object.freeze([...actionIds]);
    this.guard=guard;
    this.cooldownMs=cooldownMs;
    this.revoke();
  }
  get active(){return this.session!==null;}
  revoke(){this.session=null;this.lastSequence=0;this.lastAcceptedAt=-Infinity;}
  enable({source,origin,sessionId,expiresAt,allowSyntheticDemo=false}={},nowMs){
    this.revoke();
    if(!source||!validPhiPoseOrigin(origin)||!UUID.test(sessionId)||
      typeof allowSyntheticDemo!=='boolean'||!Number.isSafeInteger(nowMs)||
      !Number.isSafeInteger(expiresAt)||expiresAt-nowMs<30_000||
      expiresAt-nowMs>300_000)
      throw new TypeError('Invalid bounded ΦPose host session');
    this.session=Object.freeze({source,origin,sessionId,expiresAt,allowSyntheticDemo});
  }
  accept(event,nowMs,context){
    const s=this.session;
    if(!s)return fail('disabled');
    if(!Number.isSafeInteger(nowMs)||nowMs>s.expiresAt){
      this.revoke();return fail('expired');
    }
    if(event?.source!==s.source||event?.origin!==s.origin)return fail('untrusted_source');
    const p=event?.data;
    if(!exact(p,PACKET_KEYS)||p.protocol!==this.protocol||p.type!=='command'||
      p.session_id!==s.sessionId||!Number.isSafeInteger(p.sent_at)||
      p.sent_at<nowMs-2500||p.sent_at>nowMs+250)return fail('invalid_envelope');
    const i=p.intent;
    if(!exact(i,INTENT_KEYS)||i.schema!==PHIPOSE_INTENT_SCHEMA||
      i.version!==1||i.advisory!==true||i.action_authority!==false||
      i.execution_authority!==false||!this.allowed.includes(i.action_id)||
      !['webxr','synthetic'].includes(i.source)||
      (i.source==='synthetic'&&!s.allowSyntheticDemo)||
      !validatePhiPoseSentence(i.program)||
      !Number.isSafeInteger(i.sequence)||i.sequence<1||
      !Number.isSafeInteger(i.timestamp_ms)||i.timestamp_ms<0)
      return fail('invalid_intent');
    if(i.sequence<=this.lastSequence)return fail('replay');
    if(nowMs-this.lastAcceptedAt<this.cooldownMs)return fail('cooldown');

    // Guard uses the current app state, and must deny by returning a string.
    // An exception also denies. No SDK code invokes any operation.
    let reason;
    try{reason=this.guard(i.action_id,context);}
    catch{return fail('context_denied');}
    if(reason!==null&&reason!==undefined&&reason!==true)
      return fail(typeof reason==='string'&&reason.trim()&&reason.length<80?reason:'context_denied');
    this.lastSequence=i.sequence;
    this.lastAcceptedAt=nowMs;
    return Object.freeze({
      accepted:true,reason:'accepted_for_ui_dispatch',
      actionId:i.action_id,sequence:i.sequence,execution_authority:false
    });
  }
}
