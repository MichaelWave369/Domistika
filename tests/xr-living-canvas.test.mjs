import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {
  MAX_LIVING_PANELS,initialLivingPose,clampLivingPose,adjustLivingPose,LIVING_PANEL_SIZE
} from '../src/xr/livingCanvasModel.js';
import {createLivingCanvas} from '../src/xr/livingCanvas.js';

const setup=()=>{
  const scene=new THREE.Scene();
  const living=createLivingCanvas({scene,textTexture:()=>new THREE.Texture()});
  return {scene,living};
};
const source=()=>({texture:new THREE.Texture()});
const ray=(x=0,y=1.55)=>new THREE.Raycaster(
  new THREE.Vector3(x,y,.5),new THREE.Vector3(0,0,-1),0,10
);

test('living artwork poses are bounded and transforms cannot become non-finite',()=>{
  assert.equal(MAX_LIVING_PANELS,6);
  assert.deepEqual(LIVING_PANEL_SIZE,[1.6,1.125]);
  assert.deepEqual(initialLivingPose(0).position,[0,1.55,-2.45]);
  const pose=clampLivingPose({
    position:[Infinity,-200,500],
    rotation:[-Infinity,NaN,100],
    scale:999
  });
  assert.deepEqual(pose.position,[0,.6,-.65]);
  assert.equal(pose.scale,2);
  assert.deepEqual(pose.rotation,[0,0,Math.PI*4]);
  let larger=initialLivingPose(0);
  for(let i=0;i<30;i++)larger=adjustLivingPose(larger,'larger');
  assert.equal(larger.scale,2);
  for(let i=0;i<60;i++)larger=adjustLivingPose(larger,'smaller');
  assert.equal(larger.scale,.45);
  assert.throws(()=>adjustLivingPose(larger,'disappear'),/Unknown/);
});

test('lifting a painted canvas shares only its texture, not source transforms',()=>{
  const {scene,living}=setup();
  const art=source();
  const sourcePose=[2,1.5,-3];
  const panel=living.lift('board-a',art,'Sunset');
  assert.equal(living.count,1);
  assert.equal(panel.art.material.map,art.texture);
  assert.equal(living.selected.id,'board-a');
  assert.equal(living.lift('board-a',art,'Sunset'),panel);
  assert.equal(living.count,1);
  assert.deepEqual(sourcePose,[2,1.5,-3]);
  assert.ok(scene.children.includes(living.root));
  assert.equal(panel.group.parent,living.root);
  living.setRoom('spatial');
  assert.equal(living.root.visible,true);
  assert.equal(living.hit(ray())?.panel.id,'board-a');
  assert.ok(living.controls.length>=6);
  living.setRoom('canvas');
  assert.equal(living.hit(ray()),null);
  assert.equal(living.root.visible,false);
  living.dispose();
});

test('raycast priorities allow Quest controller grabbing and safe world release',()=>{
  const {scene,living}=setup();
  const controller=new THREE.Group();
  controller.position.set(.1,1.3,.35);
  scene.add(controller);scene.updateMatrixWorld(true);
  const art=source(),panel=living.lift('board-a',art,'Sunset');
  living.setRoom('spatial');
  scene.updateMatrixWorld(true);
  const picked=living.hit(ray());
  assert.ok(picked);
  assert.equal(living.beginXR(0,controller,picked),true);
  assert.equal(living.active,true);
  assert.equal(panel.group.parent,controller);
  assert.equal(living.beginXR(1,controller,picked),false);
  controller.position.x+=.5;scene.updateMatrixWorld(true);
  living.release(0);
  assert.equal(living.active,false);
  assert.equal(panel.group.parent,living.root);
  assert.ok(Math.abs(panel.group.position.x-.5)<.0001);
  assert.equal(living.returnPanel(),true);
  assert.equal(living.count,0);
  assert.equal(art.texture.isTexture,true);
  living.dispose();
});

test('desktop dragging moves a temporary art panel without painting on it',()=>{
  const {scene,living}=setup();
  const camera=new THREE.PerspectiveCamera();
  camera.position.set(0,1.55,.5);
  camera.lookAt(0,1.55,-2);
  camera.updateMatrixWorld(true);
  const p=living.lift('a',source(),'Waterfall');
  living.setRoom('spatial');scene.updateMatrixWorld(true);
  const pick=living.hit(ray());
  assert.ok(pick);
  assert.equal(living.beginMouse('mouse',ray(),camera,pick),true);
  living.updateMouse('mouse',ray(.3));
  living.release('mouse');
  assert.ok(Math.abs(p.group.position.x-.3)<.0001);
  assert.equal(living.active,false);
  living.dispose();
});

test('floating panels stay bounded, change order, and can be individually returned',()=>{
  const {living}=setup();
  for(let i=0;i<MAX_LIVING_PANELS;i++)living.lift('board-'+i,source(),'Painting '+i);
  assert.equal(living.count,MAX_LIVING_PANELS);
  assert.throws(()=>living.lift('one-extra',source(),'Extra'),/Six/);
  living.setRoom('spatial');
  const before=living.selected.id;
  living.next();
  assert.notEqual(living.selected.id,before);
  const first=living.selected;
  living.adjust('right');
  assert.notEqual(living.selected.group.rotation.y,0);
  living.adjust('reset');
  assert.equal(living.selected.group.rotation.y,0);
  assert.equal(living.returnPanel(first.id),true);
  assert.equal(living.count,MAX_LIVING_PANELS-1);
  living.clear();
  assert.equal(living.count,0);
  living.dispose();
});

test('the live desktop and Quest control paths share the reversible art handoff',()=>{
 const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
 const easel=readFileSync(new URL('../src/xr/easelStudio.js',import.meta.url),'utf8');
 const runtime=readFileSync(new URL('../src/xr/livingCanvas.js',import.meta.url),'utf8');
 const model=readFileSync(new URL('../src/xr/model.js',import.meta.url),'utf8');
 for(const id of ['livingCanvasLiftCurrent','livingCanvasCount','livingCanvasList','livingCanvasFocused']){
   assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(html,/data-studio-action="lift-canvas"/);
 assert.match(easel,/type:'living-lift'/);
 assert.match(main,/a\.type==='living-lift'/);
 assert.match(main,/a\.type==='living-canvas'/);
 assert.match(main,/livingCanvas\.beginXR\(index,c,livingHit\)/);
 assert.match(main,/livingCanvas\.beginMouse\('mouse'/);
 assert.match(main,/livingCanvas\.clear\(\)/);
 assert.match(main,/livingCanvas\.returnPanel\(selectedId\)/);
 assert.match(main,/livingCanvas\.setRoom\(activeStudioRoom\)/);
 assert.match(main,/function serialize\(\)\{capture\(\);return writeScene\(sceneData\);\}/);
 assert.doesNotMatch(runtime,/localStorage|writeScene|readScene|workshop\.save|fetch\(/);
 assert.doesNotMatch(model,/livingCanvas|liftedPanel|floatingArt/);
});
