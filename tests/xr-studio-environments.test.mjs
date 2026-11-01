import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createStudioEnvironments,ROOM_AMBIENCE} from '../src/xr/studioEnvironments.js';
import {readFileSync} from 'node:fs';

test('all five distinct studio environments are named and bounded',()=>{
  assert.deepEqual(Object.keys(ROOM_AMBIENCE),['home','canvas','spatial','workshop','gallery']);
  assert.equal(new Set(Object.values(ROOM_AMBIENCE).map(x=>x.background)).size,5);
  const scene=new THREE.Scene(),env=createStudioEnvironments({scene});
  for(const [name,group] of Object.entries(env.groups)){
    assert.ok(group.children.length>4,name+' must be visually distinct');
    const meshes=[];group.traverse(object=>{if(object.isMesh)meshes.push(object);});
    assert.ok(meshes.length<=65,name+' too many drawable meshes for Quest');
    for(const mesh of meshes){
      assert.equal(mesh.userData.studioScenery,true);
      assert.deepEqual(mesh.raycast(new THREE.Raycaster(),[]),undefined);
      assert.equal(mesh.userData.action,undefined);
      assert.equal(mesh.castShadow,false);
    }
  }
  env.dispose();
});

test('switching rooms and MR hides all irrelevant scenery',()=>{
  const env=createStudioEnvironments({scene:new THREE.Scene()});
  for(const room of Object.keys(ROOM_AMBIENCE)){
    const theme=env.setRoom(room,{enabled:true,passthrough:false});
    assert.equal(theme,ROOM_AMBIENCE[room]);
    assert.deepEqual(Object.entries(env.groups).filter(([,g])=>g.visible).map(([n])=>n),[room]);
  }
  env.setRoom('gallery',{enabled:false,passthrough:false});
  assert.ok(Object.values(env.groups).every(g=>!g.visible));
  env.setRoom('canvas',{enabled:true,passthrough:true});
  assert.ok(Object.values(env.groups).every(g=>!g.visible));
  assert.throws(()=>env.setRoom('not-a-room'),/Unknown/);
  env.dispose();
});

test('decoration never changes project schemas and is toggled from desktop UI',()=>{
  const src=readFileSync(new URL('../src/xr/studioEnvironments.js',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
  assert.doesNotMatch(src,/localStorage|fetch\(|XMLHttpRequest|writeScene|serialize\(/);
  assert.match(main,/studioEnvironments\.setRoom\(activeStudioRoom/);
  assert.match(html,/id="studioSceneryToggle"/);
  assert.match(main,/renderer\.xr\.addEventListener\('sessionstart'/);
});
