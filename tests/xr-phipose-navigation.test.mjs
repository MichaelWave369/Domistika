import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {
  DomistikaPhiPoseHost,DOMISTIKA_PHIPOSE_ACTIONS,DOMISTIKA_PHIPOSE_PROTOCOL,
  DOMISTIKA_ROOMS,CANVAS_STYLES,SPATIAL_STYLES,
  domistikaPhiPoseOpenerMatches,planDomistikaPhiPoseAction
} from '../src/xr/phiPoseDomistikaHost.js';
import {ScopedPhiPoseHost} from '../src/xr/phiPoseHostCore.js';

const now=1_000_000,source={},sessionId='a654b4ce-f041-4a87-a0a6-0ba25f6e6377';
const intent=(actionId='domistika.brush.next',sequence=1,synthetic=false)=>({
  schema:'overstrings.phipose.intent.v0.1',version:1,advisory:true,
  action_authority:false,execution_authority:false,
  action_id:actionId,source:synthetic?'synthetic':'webxr',
  program:'L:open > R:swipe-right',sequence,timestamp_ms:200
});
const packet=(i=intent(),sent_at=now)=>({
  protocol:DOMISTIKA_PHIPOSE_PROTOCOL,type:'command',
  session_id:sessionId,sent_at,intent:i
});
const event=(data=packet(),origin='https://example.test',sender=source)=>({
  source:sender,origin,data
});
const context=(room='canvas')=>({
  room,canvasBrush:'solid',airBrush:'neon',pointerBusy:false,xrBusy:false
});
function live(synthetic=false){
  const host=new DomistikaPhiPoseHost();
  host.enable({source,origin:'https://example.test',sessionId,
    expiresAt:now+60_000,allowSyntheticDemo:synthetic},now);
  return host;
}

test('reviewed SDK source is pinned and the Domistika adapter reuses its authority-free core',()=>{
  const bytes=readFileSync(new URL('../src/xr/phiPoseHostCore.js',import.meta.url));
  const gitSha=createHash('sha1').update(Buffer.concat([
    Buffer.from('blob '+bytes.length+'\0'),bytes
  ])).digest('hex');
  assert.equal(gitSha,'46d852582327d38966fdb01aace666bd3f9cd9cd');
  const host=new DomistikaPhiPoseHost();
  assert.ok(host instanceof ScopedPhiPoseHost);
  assert.equal(host.active,false);
  assert.equal(host.accept(event(),now,context()).reason,'disabled');
  assert.deepEqual(host.allowed,DOMISTIKA_PHIPOSE_ACTIONS);
});

test('only seven review-listed reversible navigation/brush commands may be received',()=>{
  assert.deepEqual(Object.keys(DOMISTIKA_ROOMS),
    ['domistika.room.home','domistika.room.canvas','domistika.room.spatial',
      'domistika.room.workshop','domistika.room.gallery']);
  assert.deepEqual(CANVAS_STYLES,['solid','dry','wash','marker']);
  assert.deepEqual(SPATIAL_STYLES,['neon','ribbon','spark']);
  assert.equal(DOMISTIKA_PHIPOSE_ACTIONS.length,7);
  for(const name of ['domistika.brush.paint','domistika.palette.open','domistika.canvas.erase',
    'domistika.scene.save','domistika.object.delete','phios.command.open','constructor']){
    assert.equal(live().accept(event(packet(intent(name))),now,context()).reason,'invalid_intent',name);
  }
});

test('room commands produce safe, explicit UI selection plans only',()=>{
  const h=live();
  const res=h.accept(event(packet(intent('domistika.room.gallery'))),now,context());
  assert.equal(res.accepted,true);
  assert.deepEqual(res.plan,{kind:'room',room:'gallery'});
  assert.equal(res.execution_authority,false);
  assert.equal(Object.isFrozen(res.plan),true);
  assert.equal(live().accept(event(packet(intent('domistika.room.canvas'))),now,context()).reason,'room_unchanged');
});
test('brush commands plan only future stroke styles in correct room',()=>{
  const n=live().accept(event(),now,context());
  assert.equal(n.accepted,true);
  assert.deepEqual(n.plan,{kind:'brush',room:'canvas',style:'dry'});
  assert.deepEqual(planDomistikaPhiPoseAction('domistika.brush.previous',context()),
    {kind:'brush',room:'canvas',style:'marker'});
  assert.deepEqual(planDomistikaPhiPoseAction('domistika.brush.next',{
    ...context('spatial'),airBrush:'spark'
  }),{kind:'brush',room:'spatial',style:'neon'});
  assert.equal(live().accept(event(),now,context('workshop')).reason,'brush_room_required');
  assert.equal(live().accept(event(),now,{
    ...context('spatial'),airBrush:'unknown'
  }).reason,'invalid_brush_context');
});
test('active mouse/controller interaction cancels all command acceptance',()=>{
  for(const blocked of [{pointerBusy:true},{xrBusy:true}]){
    assert.equal(live().accept(event(),now,{...context(),...blocked}).reason,'drawing_in_progress');
    assert.equal(live().accept(event(packet(intent('domistika.room.home'))),now,{
      ...context(),...blocked
    }).reason,'drawing_in_progress');
  }
});
test('source, origin, session, source label and replay protections apply',()=>{
  assert.equal(live().accept(event(packet(), 'https://other.test'),now,context()).reason,'untrusted_source');
  assert.equal(live().accept(event(packet(), 'https://example.test',{}),now,context()).reason,'untrusted_source');
  assert.equal(live().accept(event({...packet(),session_id:'wrong'}),now,context()).reason,'invalid_envelope');
  assert.equal(live().accept(event(packet(intent('domistika.brush.next',1,true))),now,context()).reason,'invalid_intent');
  assert.equal(live(true).accept(event(packet(intent('domistika.brush.next',1,true))),now,context()).accepted,true);
  const h=live();
  assert.equal(h.accept(event(),now,context()).accepted,true);
  assert.equal(h.accept(event(),now+1200,context()).reason,'replay');
  assert.equal(h.accept(event(packet(intent('domistika.brush.next',2),now+200)),now+200,context()).reason,'cooldown');
  assert.equal(h.accept(event(packet(intent('domistika.brush.next',2),now+1200)),now+1200,context()).accepted,true);
  assert.equal(h.accept(event(),now+60_001,context()).reason,'expired');
  assert.equal(h.active,false);
});
test('opener must be exact same-origin OverStrings and never a different app',()=>{
  const opener=href=>({location:{href}});
  assert.equal(domistikaPhiPoseOpenerMatches(opener('https://example.test/OverStrings/'),'https://example.test'),true);
  assert.equal(domistikaPhiPoseOpenerMatches(opener('https://example.test/OverStrings/index.html'),'https://example.test'),true);
  assert.equal(domistikaPhiPoseOpenerMatches(opener('https://evil.test/OverStrings/'),'https://example.test'),false);
  assert.equal(domistikaPhiPoseOpenerMatches(opener('https://example.test/PhiOS/'),'https://example.test'),false);
});
test('XR studio implementation only wires safe room/style functions, not paint/persist',()=>{
  const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
  const panel=readFileSync(new URL('../src/xr/phiPoseDomistikaCompanion.js',import.meta.url),'utf8');
  assert.match(html,/id="phipose-xr-bridge"/);
  assert.match(main,/mountDomistikaPhiPoseCompanion\(/);
  assert.match(main,/onSelectRoom:room=>goToStudioRoom\(room\)/);
  assert.match(main,/if\(room==='canvas'\)setCanvasBrush\(style\)/);
  assert.match(main,/else if\(room==='spatial'\)/);
  assert.doesNotMatch(panel,/\.save\(|\.persist\(|\.clear\(|\.undo\(|newStroke\(|paintStroke\(/);
});
