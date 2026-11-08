/**
 * Rung 13 · Native ΦPose in the active Domistika immersive WebXR session.
 *
 * Input source: ONLY XRFrame.getJointPose on the current session's XRHand.
 * Tracking runs locally; no browser window, camera video, network or storage.
 * Deliberate command selection + one-shot arm in the XR world is mandatory.
 * The produced intent is advisory only; a fixed UI-only action adapter decides.
 */
import {GestureTracker,JOINT_NAMES} from './phipose-core/gesture.mjs';
import {PhiPoseInterpreter} from './phipose-core/phipose.mjs';
import {ViewRelativeSwipeTokenizer,LocalPalmCalibration,viewerRightAxis,PHIPOSE_DEFAULT_SWIPE_M} from './phiPoseViewMotion.js';
import {
  DOMISTIKA_PHIPOSE_ACTIONS,planDomistikaPhiPoseAction
} from './phiPoseDomistikaHost.js';

export const DOMISTIKA_NATIVE_COMMANDS=Object.freeze([
  Object.freeze({actionId:'domistika.room.home',label:'STUDIO HOME',script:'L:open > R:grab'}),
  Object.freeze({actionId:'domistika.room.canvas',label:'CANVAS STUDIO',script:'L:point > R:open'}),
  Object.freeze({actionId:'domistika.room.spatial',label:'3D PAINTING',script:'L:point > R:grab'}),
  Object.freeze({actionId:'domistika.room.workshop',label:'SCULPTURE',script:'L:grab > R:open'}),
  Object.freeze({actionId:'domistika.room.gallery',label:'GALLERY',script:'L:grab > R:pinch'}),
  Object.freeze({actionId:'domistika.brush.next',label:'NEXT BRUSH',script:'L:open > R:swipe-right'}),
  Object.freeze({actionId:'domistika.brush.previous',label:'PREV BRUSH',script:'L:open > R:swipe-left'})
]);

/** Returns hand joints in the active XR reference space; never synthesizes poses. */
export function readNativeXRHandJoints(frame,session,referenceSpace){
  const hands={left:null,right:null};
  if(!frame||typeof frame.getJointPose!=='function'||!referenceSpace||
     !session||!session.inputSources)return hands;
  for(const input of session.inputSources){
    if(!input?.hand||!['left','right'].includes(input.handedness))continue;
    const joints={};
    try{
      for(const name of JOINT_NAMES){
        const space=input.hand.get(name);
        if(!space)continue;
        const pose=frame.getJointPose(space,referenceSpace);
        const p=pose?.transform?.position;
        if(p&&[p.x,p.y,p.z].every(Number.isFinite))
          joints[name]={x:p.x,y:p.y,z:p.z};
      }
    }catch{continue;}
    // Reject partial hand observations; failing closed avoids fake classifier poses.
    if(JOINT_NAMES.every(name=>!!joints[name]))
      hands[input.handedness]=joints;
  }
  return hands;
}

export function planNativePhiPoseIntent(intent,selectedAction,context){
  if(!intent||intent.schema!=='overstrings.phipose.intent.v0.1'||
    intent.source!=='webxr'||intent.advisory!==true||
    intent.action_authority!==false||intent.execution_authority!==false||
    intent.action_id!==selectedAction||
    !DOMISTIKA_PHIPOSE_ACTIONS.includes(intent.action_id)||
    !context||context.pointerBusy||context.xrBusy)return null;
  return planDomistikaPhiPoseAction(intent.action_id,context);
}

export class NativePhiPoseXR {
  constructor({onStatus=()=>{},onAction=()=>{},onFeedback=()=>{}}={}){
    this.onStatus=onStatus;this.onAction=onAction;this.onFeedback=onFeedback;
    this.tracker=new GestureTracker();
    this.motion=new ViewRelativeSwipeTokenizer();
    this.calibration=new LocalPalmCalibration();
    this.calibrationDistances=null;
    this.lastFeedback='';
    this.interpreter=new PhiPoseInterpreter({advisoryActionIds:DOMISTIKA_PHIPOSE_ACTIONS});
    this.commandIndex=0;
    this.tracked={left:false,right:false};
    this.trackedAt=-Infinity;this.armedAt=null;this.activeSession=null;
    this.listenAfter=0;this.lastBothSeen=null;this.lastStepAt=null;this.status='DISABLED';
  }
  get command(){return DOMISTIKA_NATIVE_COMMANDS[this.commandIndex];}
  get armed(){return this.interpreter.armed;}
  feedback(nowMs){
    const tracked='L:'+(this.tracked.left?'OK':'--')+' R:'+(this.tracked.right?'OK':'--');
    const distances=this.calibrationDistances?
      'L'+Math.round(this.calibrationDistances.left*100)+'cm R'+Math.round(this.calibrationDistances.right*100)+'cm':
      'DEFAULT '+Math.round(PHIPOSE_DEFAULT_SWIPE_M*100)+'cm';
    const remain=this.armed&&Number.isFinite(nowMs)?
      ' · '+Math.max(0,Math.ceil((6500-(nowMs-this.armedAt))/1000))+'s': '';
    const step=this.armed?' · STEP '+(this.interpreter.index+1)+'/'+
      this.interpreter.binding.program.steps.length:'';
    const calibrating=this.calibration.active?' · CALIBRATING':'';
    return tracked+' · '+distances+step+remain+calibrating;
  }
  emitFeedback(nowMs){
    const summary=this.feedback(nowMs);
    if(summary===this.lastFeedback)return;
    this.lastFeedback=summary;this.onFeedback(summary);
  }
  startCalibration(session,nowMs){
    if(this.armed){this.setStatus('CANCEL POSE BEFORE CALIBRATION');return false;}
    if(!session||!Number.isFinite(nowMs)||nowMs<0||
       !this.tracked.left||!this.tracked.right||nowMs-this.trackedAt>300){
      this.setStatus('CALIBRATION NEEDS TWO TRACKED HANDS');return false;
    }
    if(!this.calibration.begin(session,nowMs))return false;
    this.setStatus('CALIBRATING · HOLD BOTH HANDS OPEN AND STEADY');
    this.emitFeedback(nowMs);return true;
  }
  setStatus(message){
    if(this.status===message)return;
    this.status=message;
    this.onStatus(message);
  }
  nextCommand(delta=1){
    this.cancel('COMMAND CHANGED');
    this.commandIndex=(this.commandIndex+delta+DOMISTIKA_NATIVE_COMMANDS.length)%
      DOMISTIKA_NATIVE_COMMANDS.length;
    this.setStatus('SELECTED '+this.command.label);
    return this.command;
  }
  arm(session,nowMs){
    if(this.calibration.active){this.setStatus('WAIT FOR CALIBRATION');return false;}
    this.cancel();
    if(!session||!Number.isFinite(nowMs)||nowMs<0||
       !(this.tracked.left&&this.tracked.right)||
       nowMs-this.trackedAt>300){
      this.setStatus('NEED TWO TRACKED XR HANDS');
      return false;
    }
    this.interpreter.configure({script:this.command.script,
      actionId:this.command.actionId,source:'webxr',allowSyntheticDemo:false});
    if(!this.interpreter.arm().armed)return false;
    this.armedAt=nowMs;
    this.activeSession=session;
    this.lastBothSeen=nowMs;
    this.lastStepAt=null;
    // Reject the select pinch used to press the 3D ARM button.
    this.listenAfter=nowMs+450;
    this.tracker.reset();this.motion.reset();
    this.setStatus('ARMED '+this.command.label+' · '+this.command.script);
    return true;
  }
  cancel(reason=''){
    this.interpreter.disarm();
    this.tracker.reset();this.motion.reset();
    this.armedAt=null;this.activeSession=null;this.lastBothSeen=null;this.lastStepAt=null;
    this.calibration.reset();
    if(reason)this.setStatus(reason);
  }
  resetSession(){
    this.cancel('XR SESSION ENDED');
    this.tracked={left:false,right:false};
    this.trackedAt=-Infinity;
    this.calibrationDistances=null;
    this.motion.configure({left:PHIPOSE_DEFAULT_SWIPE_M,right:PHIPOSE_DEFAULT_SWIPE_M});
    this.lastFeedback='';
  }
  tick(nowMs,frame,session,referenceSpace,context){
    if(!Number.isFinite(nowMs)||nowMs<0||!session||!referenceSpace){
      if(this.armed||this.calibration.active)this.cancel('TRACKING UNAVAILABLE');
      this.tracked={left:false,right:false};this.emitFeedback(nowMs);return;
    }
    const hands=readNativeXRHandJoints(frame,session,referenceSpace);
    const both=!!(hands.left&&hands.right);
    this.tracked={left:!!hands.left,right:!!hands.right};
    if(both)this.trackedAt=nowMs;
    if(this.calibration.active){
      if(context?.pointerBusy||context?.xrBusy){
        this.cancel('CALIBRATION INTERRUPTED BY DRAWING');
      }else{
        const result=this.calibration.update(nowMs,session,hands);
        if(result.state==='complete'){
          this.calibrationDistances=result.distances;
          this.motion.configure(result.distances);
          this.setStatus('CALIBRATED · HAND DISTANCES UPDATED FOR THIS SESSION');
        }else if(['tracking_lost','cancelled','timeout','invalid'].includes(result.state)){
          this.setStatus('CALIBRATION FAILED · '+result.state.toUpperCase());
        }
      }
      this.emitFeedback(nowMs);
      return;
    }
    if(!this.armed){this.emitFeedback(nowMs);return;}
    this.emitFeedback(nowMs);
    if(session!==this.activeSession){
      this.cancel('SESSION CHANGED · CANCELLED');return;
    }
    if(context?.pointerBusy||context?.xrBusy){
      this.cancel('DRAWING ACTIVE · CANCELLED');return;
    }
    if(nowMs-this.armedAt>6500){
      this.cancel('POSE TIMEOUT · RE-ARM');return;
    }
    if(both)this.lastBothSeen=nowMs;
    else if(nowMs-this.lastBothSeen>300){
      this.cancel('HAND TRACKING LOST · RE-ARM');return;
    }
    if(nowMs<this.listenAfter)return;
    for(const hand of ['left','right']){
      const events=this.tracker.update(hand,hands[hand],nowMs,'webxr');
      for(const evt of events){
        if(evt.phase==='lost'){
          this.cancel('TRACKING LOST · RE-ARM');return;
        }
        if(evt.phase==='start'&&this.receive(evt,nowMs,context))return;
      }
      const swipes=this.motion.update(hand,hands[hand],nowMs,
        this.tracker.active(hand),viewerRightAxis(frame,referenceSpace),'webxr');
      for(const evt of swipes)if(this.receive(evt,nowMs,context))return;
    }
  }
  receive(event,nowMs,context){
    if(!this.armed)return false;
    // A same-frame, two-hand simultaneous posture is not a sequential command.
    // Require the operator to release/re-present later steps deliberately.
    if(this.lastStepAt!==null&&nowMs-this.lastStepAt<180)return false;
    const outcome=this.interpreter.consume(event,nowMs);
    if(outcome.accepted){
      const intent=outcome.intent,selectedAction=this.command.actionId;
      this.cancel(); // one-shot closes before dispatch
      const plan=planNativePhiPoseIntent(intent,selectedAction,context);
      if(!plan){this.setStatus('UI ACTION DENIED · RE-ARM');return true;}
      try{
        this.onAction(plan,intent);
        this.setStatus('UI SELECTED · '+selectedAction);
      }catch{
        this.setStatus('UI DISPATCH FAILED · RE-ARM');
      }
      return true;
    }
    if(!this.armed)return true;
    if(['unexpected_symbol','source_denied','stale_event','phrase_expired',
      'invalid_event','clock_invalid','chord_expired'].includes(outcome.reason)){
      this.cancel('PHRASE CANCELLED · '+outcome.reason);return true;
    }
    if(outcome.reason==='step_completed'){
      this.lastStepAt=nowMs;
      this.setStatus('STEP '+outcome.progress+' · CONTINUE '+this.command.label);
    }
    if(outcome.reason==='awaiting_chord')this.setStatus('WAITING FOR SECOND HAND');
    return false;
  }
}
