import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { MAX_BOARDS, MAX_STROKES, makeBoard, makeScene, newStroke, extendStroke, readScene, writeScene } from './model.js';
import './styles.css';

const $ = (s) => document.querySelector(s);
const status = (s) => { $('#status').textContent = s; };
const W=1024, H=720, BOARD_W=1.6, BOARD_H=BOARD_W*H/W;
const STORE_KEY='domistika.xr.scene.v1';
const renderedBoards=new Map(), xrInteractions=new Map();
let sceneData=makeScene(), selectedId=sceneData.selectedId, mode='draw', erasing=false, pointerState=null;
const scene=new THREE.Scene();
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
  pointerState=null;controls.enabled=true;
  if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);
  persist();
}
renderer.domElement.addEventListener('pointerdown',startMouse);
renderer.domElement.addEventListener('pointermove',moveMouse);
renderer.domElement.addEventListener('pointerup',endMouse);
renderer.domElement.addEventListener('pointercancel',endMouse);
window.addEventListener('blur',()=>{if(pointerState){pointerState=null;controls.enabled=true;persist();}});

// An actual 3D toolbar, not an HTML overlay that disappears inside XR.
const toolPanel=new THREE.Group();toolPanel.position.set(1.8,1.65,-1.25);toolPanel.rotation.y=-.3;scene.add(toolPanel);
const backing=new THREE.Mesh(new THREE.PlaneGeometry(.93,1.5),new THREE.MeshBasicMaterial({color:0x102238,side:THREE.DoubleSide}));
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
function updateToolColors(){
  for(const mesh of controls3d){
    const a=mesh.userData.action;
    if(a.type==='mode')mesh.material.color.setHex(a.value===mode?0x7ef7e7:0xffffff);
    if(a.type==='erase')mesh.material.color.setHex(erasing?0xffaaaa:0xffffff);
  }
}
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
    if(a.type==='color'){$('#brushColor').value=a.value;$('#colorValue').textContent=a.value.toUpperCase();erasing=false;$('#eraser').textContent='◌ Eraser: OFF';$('#eraser').setAttribute('aria-pressed','false');updateToolColors();}
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
  if(state.kind==='move'||state.kind==='rotate')scene.attach(state.render.group);
  xrInteractions.delete(index);persist();
}
function updateXR(){
  if(!renderer.xr.isPresenting)return;
  for(const [index,item] of controllers.entries()){
    const ray=controllerRay(item.controller);
    const tool=ray.intersectObjects(controls3d,false)[0],hit=hitBoard(ray);
    item.laser.scale.z=Math.max(.08,Math.min(tool?.distance??6,hit?.hit?.distance??6,6));
    const state=xrInteractions.get(index);if(!state)continue;
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
$('#save').addEventListener('click',persist);
$('#exportScene').addEventListener('click',()=>download('domistika-xr-scene.json',serialize(),'application/json'));
$('#importScene').addEventListener('click',()=>$('#sceneFile').click());
$('#sceneFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>10_000_000)throw Error('File exceeds 10 MB limit.');mountScene(readScene(await file.text()));persist();message('Imported '+sceneData.boards.length+' canvases.');}
  catch(error){message('Import rejected: '+error.message);}
  e.target.value='';
});
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
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();persist();}
});
try{
  const vr=VRButton.createButton(renderer,{optionalFeatures:['local-floor','hand-tracking']});
  const mr=ARButton.createButton(renderer,{optionalFeatures:['local-floor','hand-tracking']});
  if(vr.tagName==='BUTTON')vr.textContent='ENTER VR';
  if(mr.tagName==='BUTTON')mr.textContent='ENTER MR';
  $('#xr-entry').append(vr,mr);
}catch(error){message('XR init unavailable: '+error.message);}
renderer.xr.addEventListener('sessionstart',()=>{
  const blend=renderer.xr.getSession()?.environmentBlendMode;
  const passthrough=blend==='alpha-blend'||blend==='additive';
  scene.background=passthrough?null:new THREE.Color(bgColor);
  scene.fog=passthrough?null:new THREE.Fog(bgColor,7,19);
  grid.visible=!passthrough;floor.visible=!passthrough;
  controls.enabled=false;message(passthrough?'Mixed reality active; no room anchoring.':'VR active; trigger to paint or move.');
});
renderer.xr.addEventListener('sessionend',()=>{
  for(const i of [...xrInteractions.keys()])endXR(i);
  scene.background=new THREE.Color(bgColor);scene.fog=new THREE.Fog(bgColor,7,19);
  grid.visible=true;floor.visible=true;controls.enabled=true;persist();
});
function resize(){
  const el=$('#render-root'),width=Math.max(1,el.clientWidth),height=Math.max(1,el.clientHeight);
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);new ResizeObserver(resize).observe($('#render-root'));
resize();updateToolColors();
renderer.setAnimationLoop(()=>{if(renderer.xr.isPresenting)updateXR();else controls.update();renderer.render(scene,camera);});
message(location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname)?'Studio ready. Drag on the canvas to draw.':'Desktop ready. Immersive XR requires HTTPS or localhost.');
