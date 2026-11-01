import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEFAULT_EASEL_FIT,normalizeEaselFit,stepEaselFit,poseForEaselFit} from '../src/xr/easelFit.js';
import {createControllerPaintbrush} from '../src/xr/controllerPaintbrush.js';
import {readFileSync} from 'node:fs';

test('Easel ergonomics stay finite, bounded, and resettable',()=>{
  assert.deepEqual(normalizeEaselFit({height:Infinity,tilt:NaN,distance:-500}),{height:1.5,tilt:0,distance:1.05});
  assert.equal(normalizeEaselFit({height:300}).height,1.85);
  assert.equal(normalizeEaselFit({tilt:-900}).tilt,-25);
  let fit={...DEFAULT_EASEL_FIT};
  for(let i=0;i<50;i++)fit=stepEaselFit(fit,'up');
  assert.equal(fit.height,1.85);
  for(let i=0;i<50;i++)fit=stepEaselFit(fit,'tilt-down');
  assert.equal(fit.tilt,-25);
  assert.deepEqual(stepEaselFit(fit,'reset'),DEFAULT_EASEL_FIT);
  assert.throws(()=>stepEaselFit(fit,'unlock'),/Unsupported/);
});
test('Fit pose is computed without any edits to the art scene',()=>{
  const pose=poseForEaselFit({height:1.2,tilt:20,distance:1.5});
  assert.deepEqual(pose.position,[0,1.2,-1.5]);
  assert.ok(Math.abs(pose.rotation[0]-Math.PI/9)<1e-10);
  assert.deepEqual(pose.scale,[1,1,1]);
});
test('Brush is attached to controller, visual-only, and cursor is bounded to active canvas input',()=>{
  const scene=new THREE.Scene(),controller=new THREE.Group();
  const tool=createControllerPaintbrush({controller,scene});
  assert.ok(controller.children.includes(tool.group));
  assert.ok(scene.children.includes(tool.marker));
  assert.equal(tool.marker.visible,false);
  tool.setActive(true);tool.setColor('#ff0000');
  tool.setCursor(new THREE.Vector3(1,1,-1));
  assert.equal(tool.marker.visible,true);
  assert.equal(tool.marker.material.color.getHexString(),'ff0000');
  const hits=[];
  tool.marker.raycast(new THREE.Raycaster(),hits);
  tool.group.traverse(obj=>{if(obj.isMesh)obj.raycast(new THREE.Raycaster(),hits);});
  assert.equal(hits.length,0);
  tool.setActive(false);assert.equal(tool.marker.visible,false);
  tool.dispose();
  assert.equal(controller.children.includes(tool.group),false);
  assert.equal(scene.children.includes(tool.marker),false);
});
test('Quest and desktop UI have real easel fit and controller brush integration',()=>{
  const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
  const easel=readFileSync(new URL('../src/xr/easelStudio.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
  assert.match(main,/createControllerPaintbrush/);
  assert.match(main,/function adjustEaselFit/);
  assert.match(main,/type==='easel-fit'/);
  assert.match(main,/item\.brush\.setCursor/);
  assert.match(easel,/function setFit/);
  assert.match(easel,/active\.group\.position\.fromArray/);
  for(const key of ['easelHeight','easelTilt','easelDistance','easelResetFit']){
    assert.ok(html.includes('id="'+key+'"'));
  }
});
