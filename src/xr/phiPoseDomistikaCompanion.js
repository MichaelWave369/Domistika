import {
  DOMISTIKA_PHIPOSE_PROTOCOL,DomistikaPhiPoseHost,
  domistikaPhiPoseOpenerMatches
} from './phiPoseDomistikaHost.js';

/**
 * Consent UI and only approved non-persistent navigation actions.
 * Same-origin postMessage is NOT authentication; no destructive commands.
 */
export function mountDomistikaPhiPoseCompanion({
  element,windowRef=window,getContext,onSelectRoom,onSelectBrush,onStatus=()=>{}
}={}){
  if(!element||!windowRef||typeof getContext!=='function'||
    typeof onSelectRoom!=='function'||typeof onSelectBrush!=='function')
    throw new TypeError('Domistika ΦPose companion needs a real UI owner');
  const host=new DomistikaPhiPoseHost();
  let allowSynthetic=false;
  element.innerHTML=`
    <h2>ΦPose · Gesture Navigation</h2>
    <p>Change studio rooms or select the next/previous brush for future strokes.
       Never paints, changes artwork, saves or deletes.</p>
    <label class="phipose-xr-option">
      <input type="checkbox" data-phipose-synthetic>
      Permit synthetic demo gestures (off by default)
    </label>
    <div class="phipose-xr-actions">
      <button type="button" data-phipose-enable>Enable for 5 minutes</button>
      <button type="button" data-phipose-disable disabled>Disable immediately</button>
    </div>
    <p data-phipose-status role="status" aria-live="polite">
      Disabled. Open this XR studio from OverStrings to request UI navigation.
    </p>
    <small>Separate operator approval and the matching same-origin OverStrings
    window are required. Browsers may pause the sender during immersive XR.
    Not a verified Quest 3 hand-tracking integration.</small>`;
  const enableButton=element.querySelector('[data-phipose-enable]');
  const disableButton=element.querySelector('[data-phipose-disable]');
  const synthetic=element.querySelector('[data-phipose-synthetic]');
  const label=element.querySelector('[data-phipose-status]');
  function status(text){label.textContent=text;onStatus(text);}
  function updateButtons(){
    enableButton.disabled=host.active;
    disableButton.disabled=!host.active;
    synthetic.disabled=host.active;
  }
  function disable(){
    host.revoke();updateButtons();
    status('ΦPose disabled. All old gesture approvals revoked.');
  }
  synthetic.addEventListener('change',()=>{allowSynthetic=synthetic.checked;disable();});
  enableButton.addEventListener('click',()=>{
    const opener=windowRef.opener;
    if(!domistikaPhiPoseOpenerMatches(opener,windowRef.location.origin)){
      status('Denied: open Domistika from the same-origin OverStrings gesture studio.');
      return;
    }
    try{
      const now=Date.now(),sessionId=windowRef.crypto.randomUUID();
      const expiresAt=now+300_000;
      host.enable({source:opener,origin:windowRef.location.origin,
        sessionId,expiresAt,allowSyntheticDemo:allowSynthetic},now);
      opener.postMessage({
        protocol:DOMISTIKA_PHIPOSE_PROTOCOL,type:'ready',
        session_id:sessionId,expires_at:expiresAt
      },windowRef.location.origin);
      updateButtons();
      status('Approved for five minutes: studio rooms and future-stroke brush styles only.');
    }catch{
      disable();
      status('Could not establish a bounded ΦPose session.');
    }
  });
  disableButton.addEventListener('click',disable);
  function onMessage(event){
    if(!host.active)return;
    const result=host.accept(event,Date.now(),getContext());
    if(result.reason==='untrusted_source')return;
    if(result.accepted){
      if(result.plan.kind==='room')onSelectRoom(result.plan.room);
      else if(result.plan.kind==='brush')onSelectBrush(result.plan.room,result.plan.style);
      status('Accepted gesture for '+result.actionId+' (UI only, no artwork edit).');
    }else{
      status('Gesture denied: '+result.reason);
      if(result.reason==='expired')updateButtons();
    }
    if(event.source===windowRef.opener && event.origin===windowRef.location.origin){
      try{
        windowRef.opener.postMessage({
          protocol:DOMISTIKA_PHIPOSE_PROTOCOL,type:'receipt',
          accepted:result.accepted,
          status:result.accepted?'accepted_for_ui_dispatch':'denied',
          reason:result.reason,
          sequence:result.accepted?result.sequence:null,
          action_id:result.accepted?result.actionId:null
        },windowRef.location.origin);
      }catch{/* Closed opener does not grant an alternative transport. */}
    }
  }
  const onPageHide=()=>disable();
  windowRef.addEventListener('message',onMessage);
  windowRef.addEventListener('pagehide',onPageHide);
  updateButtons();
  return Object.freeze({
    disable,
    destroy(){
      disable();
      windowRef.removeEventListener('message',onMessage);
      windowRef.removeEventListener('pagehide',onPageHide);
    },
    get active(){return host.active;}
  });
}
