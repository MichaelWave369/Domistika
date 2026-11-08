/**
 * Domistika XR Rung 12: reviewed ΦPose adapter for reversible studio UI only.
 *
 * Allowlisted room navigation and future-stroke brush style selection.
 * No paint gesture, stroke input, undo, erase, file IO or privilege.
 */
import {ScopedPhiPoseHost} from './phiPoseHostCore.js';

export const DOMISTIKA_PHIPOSE_PROTOCOL='domistika.gesture-nav.v0.1';
export const DOMISTIKA_ROOMS=Object.freeze({
  'domistika.room.home':'home',
  'domistika.room.canvas':'canvas',
  'domistika.room.spatial':'spatial',
  'domistika.room.workshop':'workshop',
  'domistika.room.gallery':'gallery'
});
export const DOMISTIKA_BRUSH_ACTIONS=Object.freeze([
  'domistika.brush.next','domistika.brush.previous'
]);
export const DOMISTIKA_PHIPOSE_ACTIONS=Object.freeze([
  ...Object.keys(DOMISTIKA_ROOMS),...DOMISTIKA_BRUSH_ACTIONS
]);
export const CANVAS_STYLES=Object.freeze(['solid','dry','wash','marker']);
export const SPATIAL_STYLES=Object.freeze(['neon','ribbon','spark']);

export function domistikaPhiPoseOpenerMatches(opener,origin){
  if(!opener||typeof origin!=='string')return false;
  try{
    const url=new URL(opener.location.href);
    return url.origin===origin&&/(?:^|\/)OverStrings\//.test(url.pathname);
  }catch{return false;}
}
export function planDomistikaPhiPoseAction(actionId,context) {
  if(!context||typeof context!=='object')return null;
  if(context.pointerBusy||context.xrBusy)return null;
  if(Object.hasOwn(DOMISTIKA_ROOMS,actionId)){
    const room=DOMISTIKA_ROOMS[actionId];
    if(context.room===room)return null;
    return Object.freeze({kind:'room',room});
  }
  if(!DOMISTIKA_BRUSH_ACTIONS.includes(actionId))return null;
  if(!['canvas','spatial'].includes(context.room))return null;
  const values=context.room==='canvas'?CANVAS_STYLES:SPATIAL_STYLES;
  const active=context.room==='canvas'?context.canvasBrush:context.airBrush;
  const index=values.indexOf(active);
  if(index<0)return null;
  const delta=actionId==='domistika.brush.next'?1:-1;
  return Object.freeze({
    kind:'brush',room:context.room,
    style:values[(index+delta+values.length)%values.length]
  });
}
export class DomistikaPhiPoseHost extends ScopedPhiPoseHost {
  constructor(){
    super({
      appId:'domistika',
      protocol:DOMISTIKA_PHIPOSE_PROTOCOL,
      actionIds:DOMISTIKA_PHIPOSE_ACTIONS,
      guard:(actionId,context)=>{
        if(context?.pointerBusy||context?.xrBusy)return 'drawing_in_progress';
        if(Object.hasOwn(DOMISTIKA_ROOMS,actionId)){
          if(context?.room===DOMISTIKA_ROOMS[actionId])return 'room_unchanged';
          return null;
        }
        if(!['canvas','spatial'].includes(context?.room))
          return 'brush_room_required';
        if(!planDomistikaPhiPoseAction(actionId,context))return 'invalid_brush_context';
        return null;
      }
    });
  }
  accept(event,nowMs,context){
    const result=super.accept(event,nowMs,context);
    if(!result.accepted)return result;
    const plan=planDomistikaPhiPoseAction(result.actionId,context);
    if(!plan)return Object.freeze({accepted:false,reason:'context_denied'});
    return Object.freeze({...result,plan});
  }
}
