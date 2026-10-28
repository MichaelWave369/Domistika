import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { MAX_BOARDS, MAX_STROKES, makeBoard, makeScene, newStroke, extendStroke, readScene, writeScene } from './model.js';
import {readBpcFramefieldPreview, sampleFramefieldPose, FRAMEFIELD_EULER_ORDER, BPC_PREVIEW_MAX_BYTES} from './framefieldPreview.js';
import {createBrushStudio} from './brushStudio.js';
import {parseOpenBluePreview,OPENBLUE_MAX_BYTES} from './openblueModel.js';
import {buildOpenBluePreview} from './openbluePreview.js';
import './styles.css';

const $ = (s) => document.querySelector(s);
const status = (s) => { $('#status').textContent = s; };
const W=1024, H=720, BOARD_W=1.6, BOARD_H=BOARD_W*H/W;
const STORE_KEY='domistika.xr.scene.v1';
const renderedBoards=new Map(), xrInteractions=new Map();
let sceneData=makeScene(), selectedId=sceneData.selectedId, mode='draw', erasing=false, pointerState=null;
let airStyle='neon',airMirror=false;
const scene=new THREE.Scene();
// Read-only BPC objects are deliberately outside sceneData and its localStorage schema.
const bpcMeshRoot=new THREE.Group();
scene.add(bpcMeshRoot);
let openBluePreview=null;
let bpcMotion=null,bpcLastTick=null; // Ephemeral, never serialized into the XR canvas project.
const bgColor=0x091125;
scene.background=new THREE.Color(bgColor);
scene.fog=new THREE.Fog(bgColor,7,19);
const camera=new THREE.PerspectiveCamera(62,1,.02,90);
camera.position.set(0,1.75,3.6);
camera.lookAt(0,1.5,-1.35);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.xr.enabled=true;
$('#render-root').append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,1.5,-1.35);
controls.minDistance=.7;controls.maxDistance=16;controls.enableDamping=true;
controls.update();
scene.add(new THREE.HemisphereLight(0xbce5ff,0x203050,2.3));
const lamp=new THREE.DirectionalLight(0xd3baff,2);
lamp.position.set(3,6,4);scene.add(lamp);
const grid=new THREE.GridHelper(22,32,0x446b77,0x253747);scene.add(grid);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshBasicMaterial({color:0x0d1930,transparent:true,opacity:.65}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.012;scene.add(floor);
const raycaster=new THREE.Raycaster(), mouse=new THREE.Vector2();
const byId=id=>sceneData.boards.find(b=>b.id===id);
const selected=()=>byId(selectedId);
const ink=()=>$('#brushColor').value;
const size=()=>Number($('#brushWidth').value);
const message=(text)=>status(text);
const brushStudio=createBrushStudio({scene,onStatus:message,onCount:n=>{$('#spatialCount').textContent=n+' / 160';}});
function textTexture(text,color='#c7ffef') {
  const el=document.createElement('canvas');el.width=512;el.height=120;
  const c=el.getContext('2d');
  c.fillStyle='#15263c';c.fillRect(0,0,512,120);
  c.strokeStyle='#466078';c.lineWidth=6;c.strokeRect(3,3,506,114);
  c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font='bold 43px system-ui';
  c.fillText(text,256,60,485);
  const t=new THREE.CanvasTexture(el);t.colorSpace=THREE.SRGBColorSpace;
  return t;
}
function strokeDraw(ctx,s) {
  const pts=s.points;if(!pts.length)return;
  ctx.save();ctx.globalCompositeOperation=s.erase?'destination-out':'source-over';
  ctx.fillStyle=s.erase?'black':s.color;ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=s.width;ctx.lineCap='round';ctx.lineJoin='round';
  if(pts.length===1){ctx.beginPath();ctx.arc(pts[0][0]*W,pts[0][1]*H,s.width/2,0,Math.PI*2);ctx.fill();}
  else{ctx.beginPath();ctx.moveTo(pts[0][0]*W,pts[0][1]*H);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0]*W,pts[i][1]*H);ctx.stroke();}
  ctx.restore();
}
function paintBoard(b) {
  const r=renderedBoards.get(b.id);if(!r)return;
  const ctx=r.canvas.getContext('2d');ctx.clearRect(0,0,W,H);
  for(const s of b.strokes)strokeDraw(ctx,s);
  r.texture.needsUpdate=true;
}
function disposeBoard(r){
  if(!r)return;
  scene.remove(r.group);
  r.group.traverse(obj=>{obj.geometry?.dispose();if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());else obj.material?.dispose();});
  r.texture.dispose();r.labelTexture.dispose();
}
function createBoard(b){
  const group=new THREE.Group();group.position.fromArray(b.position);group.rotation.set(...b.rotation);group.scale.fromArray(b.scale);
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const paper=new THREE.Mesh(new THREE.PlaneGeometry(BOARD_W,BOARD_H),new THREE.MeshBasicMaterial({color:0x17283d,side:THREE.DoubleSide}));
  paper.position.z=-.003;group.add(paper);
  const surface=new THREE.Mesh(new THREE.PlaneGeometry(BOARD_W,BOARD_H),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
  surface.position.z=.005;surface.userData.boardId=b.id;group.add(surface);
  const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BOARD_W+.04,BOARD_H+.04,.012)),new THREE.LineBasicMaterial({color:0x4b6581}));
  group.add(outline);
  const labelTexture=textTexture(b.name);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(.9,.18),new THREE.MeshBasicMaterial({map:labelTexture,side:THREE.DoubleSide}));
  label.position.set(0,BOARD_H/2+.15,.005);group.add(label);
  scene.add(group);
  renderedBoards.set(b.id,{group,canvas,texture,surface,outline,labelTexture,undo:[]});
  paintBoard(b);
}
function selectBoard(id){
  if(!renderedBoards.has(id))return;
  selectedId=id;sceneData.selectedId=id;
  for(const [key,r] of renderedBoards)r.outline.material.color.setHex(key===id?0x75ffe0:0x4b6581);
  $('#boardCount').textContent=sceneData.boards.length+' / '+MAX_BOARDS;
  const list=$('#canvasList');list.replaceChildren();
  for(const b of sceneData.boards){
    const btn=document.createElement('button');btn.className='canvas-item'+(b.id===id?' active':'');btn.textContent=b.name;
    btn.addEventListener('click',()=>selectBoard(b.id));list.append(btn);
  }
}
function mountScene(data){
  for(const r of renderedBoards.values())disposeBoard(r);
  renderedBoards.clear();sceneData=data;
  for(const b of data.boards)createBoard(b);
  selectBoard(data.selectedId);
}
function capture(){
  // World matrices preserve transforms while a controller holds a canvas.
  for(const b of sceneData.boards){
    const r=renderedBoards.get(b.id);if(!r)continue;
    r.group.updateWorldMatrix(true,false);
    const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
    r.group.matrixWorld.decompose(position,rotation,scale);
    b.position=position.toArray();
    b.rotation=new THREE.Euler().setFromQuaternion(rotation,'XYZ').toArray().slice(0,3);
    b.scale=scale.toArray();
  }
}
function serialize(){capture();return writeScene(sceneData);}
function persist(){
  try{localStorage.setItem(STORE_KEY,serialize());message('Saved in this browser. Export JSON for backup.');}
  catch(e){message('Save unavailable: '+e.message);}
}
try{const saved=localStorage.getItem(STORE_KEY);mountScene(saved?readScene(saved):makeScene());}
catch(e){mountScene(makeScene());message('Recovered empty studio: '+e.message);}
function mouseRay(event){
  const bounds=renderer.domElement.getBoundingClientRect();
  mouse.set(2*(event.clientX-bounds.left)/bounds.width-1,1-2*(event.clientY-bounds.top)/bounds.height);
  raycaster.setFromCamera(mouse,camera);return raycaster;
}
function controllerRay(controller){
  controller.updateWorldMatrix(true,false);
  const origin=new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
  const direction=new THREE.Vector3(0,0,-1).transformDirection(controller.matrixWorld).normalize();
  raycaster.set(origin,direction);return raycaster;
}
function hitBoard(ray){
  const surfaces=[...renderedBoards.values()].map(r=>r.surface);
  const hit=ray.intersectObjects(surfaces,false)[0];
  return hit?{hit,board:byId(hit.object.userData.boardId)}:null;
}
function uv(uv){return [uv.x,1-uv.y];}
function beginStroke(board,p){
  if(board.strokes.length>=MAX_STROKES){message('Stroke limit reached. Use a new canvas.');return null;}
  const s=newStroke(ink(),size(),erasing,p);
  board.strokes.push(s);renderedBoards.get(board.id).undo.length=0;paintBoard(board);return s;
}
function continueStroke(board,s,p){if(s&&extendStroke(s,p))paintBoard(board);}
function setMode(next){
  mode=next;$('#modeName').textContent='/ '+next.toUpperCase();
  document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===next);b.setAttribute('aria-pressed',String(b.dataset.mode===next));});
  updateToolColors();message(next.toUpperCase()+' mode active');
}
function startMouse(e){
  if(e.button!==0||renderer.xr.isPresenting||pointerState)return;
  if(mode==='airbrush'){
    const p=mouseRay(e).ray.at(2.4,new THREE.Vector3());
    if(!brushStudio.start('mouse',p.toArray(),ink(),size(),airStyle,airMirror))return;
    e.preventDefault();renderer.domElement.setPointerCapture(e.pointerId);controls.enabled=false;
    pointerState={id:e.pointerId,kind:'airbrush'};return;
  }
  const ray=mouseRay(e),hit=hitBoard(ray);if(!hit)return;
  e.preventDefault();renderer.domElement.setPointerCapture(e.pointerId);controls.enabled=false;
  selectBoard(hit.board.id);const r=renderedBoards.get(hit.board.id);
  const state={id:e.pointerId,board:hit.board,render:r,kind:mode,x:e.clientX,y:e.clientY};
  if(mode==='draw')state.stroke=beginStroke(hit.board,uv(hit.hit.uv));
  if(mode==='move'){
    const normal=new THREE.Vector3();camera.getWorldDirection(normal);
    state.plane=new THREE.Plane().setFromNormalAndCoplanarPoint(normal,r.group.position);
    const at=ray.ray.intersectPlane(state.plane,new THREE.Vector3());
    state.offset=r.group.position.clone().sub(at||r.group.position);
  }
  pointerState=state;
}
function moveMouse(e){
  const s=pointerState;if(!s||s.id!==e.pointerId)return;
  if(s.kind==='airbrush'){
    brushStudio.extend('mouse',mouseRay(e).ray.at(2.4,new THREE.Vector3()).toArray());return;
  }
  const dx=e.clientX-s.x,dy=e.clientY-s.y;s.x=e.clientX;s.y=e.clientY;
  if(s.kind==='draw'){const hit=hitBoard(mouseRay(e));if(hit?.board?.id===s.board.id)continueStroke(s.board,s.stroke,uv(hit.hit.uv));}
  if(s.kind==='move'){
    const at=mouseRay(e).ray.intersectPlane(s.plane,new THREE.Vector3());if(at)s.render.group.position.copy(at).add(s.offset);
  }
  if(s.kind==='rotate'){s.render.group.rotation.y+=dx*.012;s.render.group.rotation.x+=dy*.008;}
  if(s.kind==='scale'){const k=THREE.MathUtils.clamp(s.render.group.scale.x*Math.exp(dx*.009),.25,4);s.render.group.scale.setScalar(k);}
}
function endMouse(e){
  if(!pointerState||pointerState.id!==e.pointerId)return;
  if(pointerState.kind==='airbrush')brushStudio.end('mouse');
  pointerState=null;controls.enabled=true;
  if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
  persist();
}
renderer.domElement.addEventListener('pointerdown',startMouse);
renderer.domElement.addEventListener('pointermove',moveMouse);
renderer.domElement.addEventListener('pointerup',endMouse);
renderer.domElement.addEventListener('pointercancel',endMouse);
window.addEventListener('blur',()=>{if(pointerState){if(pointerState.kind==='airbrush')brushStudio.end('mouse');pointerState=null;controls.enabled=true;persist();}});

// An actual 3D toolbar, not an HTML overlay that disappears inside XR.
const toolPanel=new THREE.Group();toolPanel.position.set(1.8,1.65,-1.25);toolPanel.rotation.y=-.3;scene.add(toolPanel);
const backing=new THREE.Mesh(new THREE.PlaneGeometry(.93,2.15),new THREE.MeshBasicMaterial({color:0x102238,side:THREE.DoubleSide}));
backing.position.z=-.01;toolPanel.add(backing);
const controls3d=[];
const headingTex=textTexture('XR TOOL DECK');
const heading=new THREE.Mesh(new THREE.PlaneGeometry(.78,.15),new THREE.MeshBasicMaterial({map:headingTex,side:THREE.DoubleSide}));
heading.position.set(0,.65,.02);toolPanel.add(heading);
for(const [i,name] of ['draw','move','rotate','scale'].entries()){
  const t=textTexture(name.toUpperCase());
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.75,.18),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));
  mesh.position.set(0,.41-i*.22,.025);mesh.userData.action={type:'mode',value:name};toolPanel.add(mesh);controls3d.push(mesh);
}
for(const [i,color] of ['#68e4ff','#ff74c6','#ffdd80','#6cf59c','#ffffff'].entries()){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.11,.11),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
  mesh.position.set(-.31+.155*i,-.57,.025);mesh.userData.action={type:'color',value:color};toolPanel.add(mesh);controls3d.push(mesh);
}
const eraseTex=textTexture('ERASER ON / OFF');
const eraseBtn=new THREE.Mesh(new THREE.PlaneGeometry(.75,.18),new THREE.MeshBasicMaterial({map:eraseTex,side:THREE.DoubleSide}));
eraseBtn.position.set(0,-.36,.025);eraseBtn.userData.action={type:'erase'};toolPanel.add(eraseBtn);controls3d.push(eraseBtn);
const bpcControlTex=textTexture('BPC ANIMATION');
const bpcControl=new THREE.Mesh(new THREE.PlaneGeometry(.75,.16),new THREE.MeshBasicMaterial({map:bpcControlTex,side:THREE.DoubleSide}));
bpcControl.position.set(0,-.79,.025);bpcControl.userData.action={type:'bpc-playback'};
toolPanel.add(bpcControl);controls3d.push(bpcControl);
const cadToggle=new THREE.Mesh(new THREE.PlaneGeometry(.75,.16),new THREE.MeshBasicMaterial({map:textTexture('SHOW / HIDE CAD'),side:THREE.DoubleSide}));
cadToggle.position.set(0,-.98,.025);cadToggle.userData.action={type:'openblue-toggle'};toolPanel.add(cadToggle);controls3d.push(cadToggle);
// Open-air painting deck lives in VR, not in a desktop-only overlay.
const airDeck=new THREE.Group();airDeck.position.set(-1.8,1.65,-1.25);airDeck.rotation.y=.3;scene.add(airDeck);
const airBacking=new THREE.Mesh(new THREE.PlaneGeometry(.96,2.05),
  new THREE.MeshBasicMaterial({color:0x16223d,side:THREE.DoubleSide}));
airBacking.position.z=-.012;airDeck.add(airBacking);
const airHeading=new THREE.Mesh(new THREE.PlaneGeometry(.84,.16),
  new THREE.MeshBasicMaterial({map:textTexture('AIR BRUSH STUDIO','#ffb5dc'),side:THREE.DoubleSide}));
airHeading.position.set(0,.81,.022);airDeck.add(airHeading);
for(const [i,label,action] of [
  ['PAINT IN 3D',{type:'mode',value:'airbrush'}],
  ['NEON',{type:'air-style',value:'neon'}],
  ['RIBBON',{type:'air-style',value:'ribbon'}],
  ['SPARK',{type:'air-style',value:'spark'}],
  ['MIRROR ON / OFF',{type:'air-mirror'}],
  ['UNDO 3D',{type:'air-undo'}],
  ['SAVE 3D',{type:'air-save'}]
].map(([label,action],i)=>[i,label,action])){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.79,.175),
    new THREE.MeshBasicMaterial({map:textTexture(label,'#ffd6f2'),side:THREE.DoubleSide}));
  mesh.position.set(0,.54-i*.22,.024);mesh.userData.action=action;airDeck.add(mesh);controls3d.push(mesh);
}
function updateToolColors(){
  for(const mesh of controls3d){
    const a=mesh.userData.action;
    if(a.type==='mode')mesh.material.color.setHex(a.value===mode?0x7ef7e7:0xffffff);
    if(a.type==='erase')mesh.material.color.setHex(erasing?0xffaaaa:0xffffff);
    if(a.type==='bpc-playback')mesh.material.color.setHex(bpcMotion?.playing?0x79f4ae:0xffffff);
    if(a.type==='openblue-toggle')mesh.material.color.setHex(openBluePreview?.group.visible?0x79f4ae:0xffffff);
    if(a.type==='air-style')mesh.material.color.setHex(airStyle===a.value?0xff82d4:0xffffff);
    if(a.type==='air-mirror')mesh.material.color.setHex(airMirror?0xff82d4:0xffffff);
  }
}
function setAirStyle(value){
  if(!['neon','ribbon','spark'].includes(value))return;
  airStyle=value;setMode('airbrush');syncAirControls();
}
function syncAirControls(){
  document.querySelectorAll('[data-air-style]').forEach(b=>{b.classList.toggle('active',b.dataset.airStyle===airStyle);b.setAttribute('aria-pressed',String(b.dataset.airStyle===airStyle));});
  $('#airMirror').textContent='Symmetry mirror: '+(airMirror?'ON':'OFF');
  $('#airMirror').setAttribute('aria-pressed',String(airMirror));updateToolColors();
}
function toggleAirMirror(){airMirror=!airMirror;syncAirControls();message('3D mirror '+(airMirror?'enabled':'disabled')+' for new strokes.');}
function controllerTip(controller){controller.updateWorldMatrix(true,false);return new THREE.Vector3(0,0,-.12).applyMatrix4(controller.matrixWorld).toArray();}
function toggleEraser(){
  erasing=!erasing;$('#eraser').textContent='◌ Eraser: '+(erasing?'ON':'OFF');
  $('#eraser').setAttribute('aria-pressed',String(erasing));updateToolColors();
}
const controllers=[0,1].map(i=>{
  const c=renderer.xr.getController(i);
  const laser=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]),new THREE.LineBasicMaterial({color:i?0xc89cff:0x8fffe8}));
  laser.scale.z=3;c.add(laser);scene.add(c);
  c.addEventListener('selectstart',()=>startXR(c,i));
  c.addEventListener('selectend',()=>endXR(i));
  return {controller:c,laser};
});
function startXR(c,index){
  if(xrInteractions.has(index))return;
  const ray=controllerRay(c),tool=ray.intersectObjects(controls3d,false)[0],boardHit=hitBoard(ray);
  if(tool&&(!boardHit||tool.distance<boardHit.hit.distance)){
    const a=tool.object.userData.action;
    if(a.type==='mode')setMode(a.value);
    if(a.type==='erase')toggleEraser();
    if(a.type==='bpc-playback')toggleBpcPlayback();
    if(a.type==='openblue-toggle')toggleOpenBluePreview();
    if(a.type==='air-style')setAirStyle(a.value);
    if(a.type==='air-mirror')toggleAirMirror();
    if(a.type==='air-undo')brushStudio.undo();
    if(a.type==='air-save'){brushStudio.save();message('Spatial sketch saved on this headset.');}
    if(a.type==='color'){$('#brushColor').value=a.value;$('#colorValue').textContent=a.value.toUpperCase();erasing=false;$('#eraser').textContent='◌ Eraser: OFF';$('#eraser').setAttribute('aria-pressed','false');updateToolColors();}
    return;
  }
  if(mode==='airbrush'){
    if(brushStudio.start(index,controllerTip(c),ink(),size(),airStyle,airMirror))xrInteractions.set(index,{kind:'airbrush',controller:c});
    return;
  }
  if(!boardHit)return;
  const b=boardHit.board,r=renderedBoards.get(b.id);selectBoard(b.id);
  const state={kind:mode,board:b,render:r,controller:c};
  if(mode==='draw')state.stroke=beginStroke(b,uv(boardHit.hit.uv));
  else if(mode==='scale'){state.startScale=r.group.scale.x;state.startPos=new THREE.Vector3().setFromMatrixPosition(c.matrixWorld);}
  else c.attach(r.group);
  xrInteractions.set(index,state);
}
function endXR(index){
  const state=xrInteractions.get(index);if(!state)return;
  if(state.kind==='airbrush')brushStudio.end(index);
  if(state.kind==='move'||state.kind==='rotate')scene.attach(state.render.group);
  xrInteractions.delete(index);persist();
}
function updateXR(){
  if(!renderer.xr.isPresenting)return;
  for(const [index,item] of controllers.entries()){
    const ray=controllerRay(item.controller);
    const tool=ray.intersectObjects(controls3d,false)[0],hit=hitBoard(ray);
    item.laser.scale.z=mode==='airbrush'&&!tool? .16 :Math.max(.08,Math.min(tool?.distance??6,hit?.hit?.distance??6,6));
    const state=xrInteractions.get(index);if(!state)continue;
    if(state.kind==='airbrush'){brushStudio.extend(index,controllerTip(item.controller));continue;}
    if(state.kind==='draw'&&hit?.board?.id===state.board.id)continueStroke(state.board,state.stroke,uv(hit.hit.uv));
    if(state.kind==='scale'){
      const p=new THREE.Vector3().setFromMatrixPosition(state.controller.matrixWorld);
      state.render.group.scale.setScalar(THREE.MathUtils.clamp(state.startScale*Math.exp((p.y-state.startPos.y)*2),.25,4));
    }
  }
}
function addBoard(copy=false){
  if(sceneData.boards.length>=MAX_BOARDS){message('12 canvases maximum. Export your scene to back it up.');return;}
  capture();
  const b=makeBoard(sceneData.boards.length+1),source=selected();
  if(copy&&source){
    b.name=(source.name+' copy').slice(0,60);
    b.position=[source.position[0]+.32,source.position[1]+.13,source.position[2]+.2];
    b.rotation=[...source.rotation];b.scale=[...source.scale];b.strokes=structuredClone(source.strokes);
  }
  sceneData.boards.push(b);createBoard(b);selectBoard(b.id);persist();
}
function undo(){
  const b=selected(),r=renderedBoards.get(selectedId);
  if(!b||!b.strokes.length)return;
  r.undo.push(b.strokes.pop());paintBoard(b);persist();
}
function redo(){
  const b=selected(),r=renderedBoards.get(selectedId);
  if(!b||!r?.undo.length||b.strokes.length>=MAX_STROKES)return;
  b.strokes.push(r.undo.pop());paintBoard(b);persist();
}
function removeBoard(){
  if(sceneData.boards.length===1){message('At least one canvas must remain.');return;}
  if([...xrInteractions.values()].some(s=>s.board.id===selectedId)){message('Release the canvas first.');return;}
  const index=sceneData.boards.findIndex(b=>b.id===selectedId);
  if(index<0)return;
  disposeBoard(renderedBoards.get(selectedId));renderedBoards.delete(selectedId);
  sceneData.boards.splice(index,1);selectBoard(sceneData.boards[Math.max(0,index-1)].id);persist();
}
function gallery(){
  capture();
  for(const [i,b] of sceneData.boards.entries()){
    const n=sceneData.boards.length,angle=(i-(n-1)/2)*Math.min(.29,1.5/Math.max(2,n-1)),r=renderedBoards.get(b.id);
    r.group.position.set(Math.sin(angle)*4.3,1.55,-1.4+Math.abs(Math.sin(angle))*1.6);
    r.group.rotation.set(0,-angle,0);r.group.scale.setScalar(Math.max(.4,Math.min(.95,3/Math.max(3,n))));
  }
  persist();
}
function download(name,data,type){
  const url=URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
$('#brushColor').addEventListener('input',e=>{
  $('#colorValue').textContent=e.target.value.toUpperCase();
  erasing=false;$('#eraser').textContent='◌ Eraser: OFF';$('#eraser').setAttribute('aria-pressed','false');updateToolColors();
});
$('#brushWidth').addEventListener('input',e=>{$('#widthValue').textContent=e.target.value;});
document.querySelectorAll('[data-mode]').forEach(el=>el.addEventListener('click',()=>setMode(el.dataset.mode)));
$('#eraser').addEventListener('click',toggleEraser);
$('#addBoard').addEventListener('click',()=>addBoard());
$('#duplicateBoard').addEventListener('click',()=>addBoard(true));
$('#removeBoard').addEventListener('click',removeBoard);
$('#undo').addEventListener('click',undo);
$('#redo').addEventListener('click',redo);
$('#gallery').addEventListener('click',gallery);
$('#save').addEventListener('click',()=>{persist();brushStudio.save();});
document.querySelectorAll('[data-air-style]').forEach(b=>b.addEventListener('click',()=>setAirStyle(b.dataset.airStyle)));
$('#airMirror').addEventListener('click',toggleAirMirror);
$('#airUndo').addEventListener('click',()=>brushStudio.undo());
$('#airRedo').addEventListener('click',()=>brushStudio.redo());
$('#airSave').addEventListener('click',()=>{if(brushStudio.save())message('3D sketch saved locally. Export JSON as backup.');});
$('#airExport').addEventListener('click',()=>{try{download('domistika-xr-spatial.json',brushStudio.exportJson(),'application/json');}catch(e){message('3D export failed: '+e.message);}});
$('#airExportGLB').addEventListener('click',async()=>{try{const data=await brushStudio.exportGLB();download('domistika-xr-spatial.glb',data,'model/gltf-binary');message('3D GLB downloaded.');}catch(e){message('GLB export failed: '+e.message);}});
$('#airImport').addEventListener('click',()=>$('#spatialFile').click());
$('#spatialFile').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  try{if(file.size>2_000_000)throw Error('File exceeds 2 MB.');brushStudio.importJson(await file.text());message('3D sketch restored.');}
  catch(e){message('3D import rejected: '+e.message);}
});
$('#airClear').addEventListener('click',()=>{
  if(window.confirm('Delete all 3D spatial strokes on this device? Export a backup first.')){
    try{brushStudio.clear();message('3D space cleared. Canvas drawings are unchanged.');}catch(e){message(e.message);}
  }
});
syncAirControls();
$('#exportScene').addEventListener('click',()=>download('domistika-xr-scene.json',serialize(),'application/json'));
$('#importScene').addEventListener('click',()=>$('#sceneFile').click());
$('#sceneFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>10_000_000)throw Error('File exceeds 10 MB limit.');mountScene(readScene(await file.text()));persist();message('Imported '+sceneData.boards.length+' canvases.');}
  catch(error){message('Import rejected: '+error.message);}
  e.target.value='';
});
// A user-selected BPC neutral packet becomes a non-persistent 3D mesh preview.
// No source file is uploaded, no editor project is replaced, and it is not a drawable board.
function syncBpcPlaybackUI(){
  const loaded=!!bpcMotion;
  $('#bpcAnimationButton').disabled=!loaded;
  $('#bpcTimeline').disabled=!loaded;
  $('#bpcAnimationButton').textContent=bpcMotion?.playing?'Pause preview':'Play preview';
  $('#bpcAnimationButton').setAttribute('aria-pressed',String(!!bpcMotion?.playing));
  $('#bpcTimeline').max=String(bpcMotion?.duration??120);
  $('#bpcTimeline').value=String(Math.round(bpcMotion?.frame??0));
  $('#bpcFrameValue').textContent=bpcMotion
    ?Math.round(bpcMotion.frame)+' / '+bpcMotion.duration+' · '+bpcMotion.fps+' FPS'+(bpcMotion.assumedTiming?' (assumed)':'')
    :'No animation loaded';
  updateToolColors();
}
function setBpcFrame(next){
  if(!bpcMotion)return;
  bpcMotion.frame=Math.min(bpcMotion.duration,Math.max(0,next));
  for(const [i,mesh] of bpcMeshRoot.children.entries()){
    const pose=sampleFramefieldPose(bpcMotion.assets[i].keyframes,bpcMotion.frame);
    mesh.position.fromArray(pose.position);
    mesh.rotation.set(...pose.rotationRadians);
    mesh.scale.fromArray(pose.scale);
  }
  $('#bpcTimeline').value=String(Math.round(bpcMotion.frame));
  $('#bpcFrameValue').textContent=Math.round(bpcMotion.frame)+' / '+bpcMotion.duration+' · '+bpcMotion.fps+' FPS'+(bpcMotion.assumedTiming?' (assumed)':'');
}
function toggleBpcPlayback(){
  if(!bpcMotion){message('Load a Framefield BPC mesh preview before playing animation.');return;}
  if(bpcMotion.frame>=bpcMotion.duration)setBpcFrame(0);
  bpcMotion.playing=!bpcMotion.playing;
  bpcLastTick=null;
  syncBpcPlaybackUI();
  message(bpcMotion.playing?'BPC animation playing in desktop/VR. Meshes remain read-only.':'BPC animation paused.');
}
function updateBpcPlayback(timeMs){
  if(!bpcMotion?.playing)return;
  if(bpcLastTick!==null){
    const elapsed=timeMs-bpcLastTick;
    // Browser tab suspension, XR session clock transitions and negative timestamps
    // must not cause a surprise fast-forward.
    if(Number.isFinite(elapsed)&&elapsed>0&&elapsed<250){
      const next=bpcMotion.frame+elapsed*bpcMotion.fps/1000;
      setBpcFrame(next>=bpcMotion.duration?next%bpcMotion.duration:next);
    }
  }
  bpcLastTick=timeMs;
}
$('#bpcAnimationButton').addEventListener('click',toggleBpcPlayback);
$('#bpcTimeline').addEventListener('input',event=>{
  if(!bpcMotion)return;
  bpcMotion.playing=false;
  bpcLastTick=null;
  setBpcFrame(Number(event.target.value));
  syncBpcPlaybackUI();
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){bpcLastTick=null;if(bpcMotion)bpcMotion.playing=false;syncBpcPlaybackUI();}
});

function clearBpcMeshes(){
  for(const item of [...bpcMeshRoot.children]){
    item.traverse(obj=>{
      obj.geometry?.dispose();
      if(Array.isArray(obj.material))obj.material.forEach(material=>material.dispose());
      else obj.material?.dispose();
    });
    bpcMeshRoot.remove(item);
  }
  bpcMeshRoot.position.set(0,0,0);
  bpcMeshRoot.scale.setScalar(1);
  bpcMotion=null;bpcLastTick=null;
  $('#bpcPreviewCount').textContent='None loaded';
  syncBpcPlaybackUI();
}
function showBpcMeshes(preview){
  // Build a new detached group first so errors cannot destroy the existing preview.
  const next=new THREE.Group();
  try{
    for(const asset of preview.assets){
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(asset.positions,3));
      geometry.computeVertexNormals();
      const material=new THREE.MeshStandardMaterial({
        color:asset.color,roughness:.65,metalness:.12,side:THREE.DoubleSide
      });
      const mesh=new THREE.Mesh(geometry,material);
      mesh.name=asset.label;
      mesh.visible=asset.visible;
      mesh.position.fromArray(asset.pose.position);
      mesh.rotation.order=FRAMEFIELD_EULER_ORDER;
      mesh.rotation.set(...asset.pose.rotationRadians);
      mesh.scale.fromArray(asset.pose.scale);
      next.add(mesh);
    }
    // Use all objects for bounds, temporarily including hidden objects for safe fit.
    const bounds=new THREE.Box3();
    for(const mesh of next.children){
      const box=new THREE.Box3().setFromObject(mesh);
      bounds.union(box);
    }
    if(bounds.isEmpty())throw Error('No previewable geometry.');
    const midpoint=bounds.getCenter(new THREE.Vector3());
    const span=bounds.getSize(new THREE.Vector3());
    const ratio=Math.min(1.2,2.4/Math.max(.1,span.x,span.y,span.z));
    clearBpcMeshes();
    for(const mesh of [...next.children])bpcMeshRoot.add(mesh);
    bpcMeshRoot.scale.setScalar(ratio);
    bpcMeshRoot.position.set(-midpoint.x*ratio,1.5-midpoint.y*ratio,-1.4-midpoint.z*ratio);
    $('#bpcPreviewCount').textContent=preview.assets.length+' meshes · '+preview.triangles+' triangles';
    bpcMotion={assets:preview.assets,fps:preview.fps,duration:preview.duration,
      assumedTiming:preview.assumedTiming,playing:false,frame:0};
    setBpcFrame(0);
    syncBpcPlaybackUI();
  }catch(error){
    next.traverse(obj=>{
      obj.geometry?.dispose();
      if(Array.isArray(obj.material))obj.material.forEach(material=>material.dispose());
      else obj.material?.dispose();
    });
    throw error;
  }
}
$('#importBpcPreview').addEventListener('click',()=>$('#bpcPreviewFile').click());
$('#clearBpcPreview').addEventListener('click',()=>{
  clearBpcMeshes();message('BPC mesh preview cleared. Your canvases were not changed.');
});
$('#bpcPreviewFile').addEventListener('change',async event=>{
  const file=event.target.files?.[0];
  event.target.value='';
  if(!file)return;
  try{
    if(file.size>BPC_PREVIEW_MAX_BYTES)throw Error('BPC preview file exceeds 5 MiB.');
    const preview=readBpcFramefieldPreview(await file.text());
    showBpcMeshes(preview);
    message('BPC imported '+preview.assets.length+' read-only mesh(es). Scrub or play Framefield transform keyframes; not saved in XR scene.');
  }catch(error){message('BPC preview rejected: '+error.message);}
});

// OpenBlueprint Studio uses its own project schema and is NEVER merged into 2D canvas or 3D stroke backups.
function updateOpenBlueControls(){
  const loaded=!!openBluePreview;
  $('#openblueCount').textContent=loaded?
    openBluePreview.summary.walls+' walls · '+openBluePreview.summary.symbols+' symbols':'None loaded';
  $('#openblueVisibility').disabled=!loaded;
  $('#openblueVisibility').textContent=!loaded?'Show / hide CAD':openBluePreview.group.visible?'Hide CAD preview':'Show CAD preview';
  $('#openblueScale').textContent=!loaded?'No CAD plan loaded':
    openBluePreview.summary.width+' × '+openBluePreview.summary.depth+' '+openBluePreview.summary.units+
    (openBluePreview.summary.notOneToOne?' · fit-to-view scaled':' · 1:1 visual units');
  updateToolColors();
}
function toggleOpenBluePreview(){
  if(!openBluePreview){message('Load an OpenBlueprint project JSON before toggling CAD.');return;}
  openBluePreview.group.visible=!openBluePreview.group.visible;
  updateOpenBlueControls();
  message(openBluePreview.group.visible?'OpenBlue plan shown. Visual preview only.':'OpenBlue plan hidden. Your strokes remain intact.');
}
function clearOpenBluePreview(){
  if(openBluePreview){
    scene.remove(openBluePreview.group);openBluePreview.dispose();openBluePreview=null;
  }
  updateOpenBlueControls();
}
$('#openblueLoad').addEventListener('click',()=>$('#openblueFile').click());
$('#openblueFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  let candidate=null;
  try{
    if(file.size>OPENBLUE_MAX_BYTES)throw Error('Project exceeds 2 MB preview limit.');
    const plan=parseOpenBluePreview(await file.text());
    candidate=buildOpenBluePreview(plan); // build completely before touching prior preview
    const old=openBluePreview;
    openBluePreview=candidate;
    scene.add(candidate.group);
    candidate=null;
    if(old){scene.remove(old.group);old.dispose();}
    updateOpenBlueControls();
    message('OpenBlue plan preview loaded: '+plan.walls.length+' walls, '+plan.symbols.length+
      ' symbols. '+(openBluePreview.summary.notOneToOne?'Scaled to fit XR. ':'')+'Read-only; source untouched.');
  }catch(error){
    candidate?.dispose();
    message('OpenBlue preview rejected: '+error.message);
  }
});
$('#openblueClear').addEventListener('click',()=>{clearOpenBluePreview();message('OpenBlue plan preview cleared; art and other projects untouched.');});
$('#openblueVisibility').addEventListener('click',toggleOpenBluePreview);
updateOpenBlueControls();

$('#downloadPng').addEventListener('click',()=>{
  const r=renderedBoards.get(selectedId),b=selected();if(!r||!b)return;
  r.canvas.toBlob(blob=>{if(blob)download(b.name.replace(/[^\w-]+/g,'-').slice(0,40)+'.png',blob,'image/png');},'image/png');
});
$('#resetView').addEventListener('click',()=>{
  camera.position.set(0,1.75,3.6);controls.target.set(0,1.5,-1.35);controls.update();
});
window.addEventListener('keydown',e=>{
  if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)redo();else undo();}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();persist();brushStudio.save();}
});
try{
  const vr=VRButton.createButton(renderer,{optionalFeatures:['local-floor','hand-tracking']});
  const mr=ARButton.createButton(renderer,{optionalFeatures:['local-floor','hand-tracking']});
  if(vr.tagName==='BUTTON')vr.textContent='ENTER VR';
  if(mr.tagName==='BUTTON')mr.textContent='ENTER MR';
  $('#xr-entry').append(vr,mr);
}catch(error){message('XR init unavailable: '+error.message);}
renderer.xr.addEventListener('sessionstart',()=>{bpcLastTick=null;
  const blend=renderer.xr.getSession()?.environmentBlendMode;
  const passthrough=blend==='alpha-blend'||blend==='additive';
  scene.background=passthrough?null:new THREE.Color(bgColor);
  scene.fog=passthrough?null:new THREE.Fog(bgColor,7,19);
  grid.visible=!passthrough;floor.visible=!passthrough;
  controls.enabled=false;message(passthrough?'Mixed reality active; no room anchoring.':'VR active; trigger to paint or move.');
});
renderer.xr.addEventListener('sessionend',()=>{bpcLastTick=null;
  for(const i of [...xrInteractions.keys()])endXR(i);
  brushStudio.finishAll();
  scene.background=new THREE.Color(bgColor);scene.fog=new THREE.Fog(bgColor,7,19);
  grid.visible=true;floor.visible=true;controls.enabled=true;persist();
});
function resize(){
  const el=$('#render-root'),width=Math.max(1,el.clientWidth),height=Math.max(1,el.clientHeight);
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);new ResizeObserver(resize).observe($('#render-root'));
resize();updateToolColors();
syncBpcPlaybackUI();
renderer.setAnimationLoop(timeMs=>{updateBpcPlayback(timeMs);if(renderer.xr.isPresenting)updateXR();else controls.update();renderer.render(scene,camera);});
message(location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname)?'Studio ready. Drag on the canvas to draw.':'Desktop ready. Immersive XR requires HTTPS or localhost.');
