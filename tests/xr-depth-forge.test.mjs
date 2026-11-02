import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {
  DEPTH_DEFAULT_GAP,DEPTH_MIN_GAP,DEPTH_MAX_GAP,normalizeDepthGap,
  changeDepthGap,layerDepths
} from '../src/xr/depthForgeModel.js';
import {createDepthForge} from '../src/xr/depthForge.js';
import {createLivingCanvas} from '../src/xr/livingCanvas.js';
import {makeScene,newStroke,writeScene} from '../src/xr/model.js';

function makeBoard(){
  const board=makeScene().boards[0];
  board.layers=[
    {id:'base',name:'Background',visible:true},
    {id:'layer-1',name:'Foreground',visible:true},
    {id:'layer-2',name:'Hidden detail',visible:false}
  ];
  board.activeLayerId='layer-1';
  board.strokes=[
    newStroke('#ff0000',9,false,[.1,.1]),
    {...newStroke('#0000ff',15,false,[.5,.5],'wash'),layerId:'layer-1'},
    {...newStroke('#ffffff',6,true,[.5,.5]),layerId:'layer-1'},
    {...newStroke('#00ff00',6,false,[.7,.7]),layerId:'layer-2'}
  ];
  return board;
}
function canvas(){
  const event=[];
  return {
    document:{
      createElement(name){
        assert.equal(name,'canvas');
        const ctx={
          clearRect(){event.push('clear');},save(){},restore(){},scale(x,y){event.push(['scale',x,y]);}
        };
        return {width:0,height:0,getContext:()=>ctx};
      }
    },
    source:{width:1024,height:720,getContext:()=>({})},
    event
  };
}
test('Depth Forge bounds are deterministic and cannot explode preview geometry',()=>{
  assert.equal(DEPTH_DEFAULT_GAP,.055);
  assert.equal(normalizeDepthGap(-10),DEPTH_MIN_GAP);
  assert.equal(normalizeDepthGap(Infinity),DEPTH_DEFAULT_GAP);
  assert.equal(normalizeDepthGap(900),DEPTH_MAX_GAP);
  assert.deepEqual(layerDepths(3,.05),[.02,.07,.12]);
  assert.deepEqual(layerDepths(0),[]);
  assert.throws(()=>layerDepths(9),/Invalid/);
  assert.equal(changeDepthGap(.055,'depth-more'),.07);
  assert.equal(changeDepthGap(.055,'depth-less'),.04);
  assert.equal(changeDepthGap(.055,'depth-reset'),.055);
  assert.throws(()=>changeDepthGap(.055,'depth-teleport'),/Unknown/);
});

test('Depth planes are individually rasterized, capped, and independent from scene data',()=>{
  const originalDocument=globalThis.document;
  const fake=canvas();
  globalThis.document=fake.document;
  try{
    const parent=new THREE.Group();
    const sourceArt=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.125),
      new THREE.MeshBasicMaterial({map:new THREE.Texture()}));
    parent.add(sourceArt);
    const board=makeBoard(),snapshot=writeScene({schema:'domistika.xr.scene.v1',selectedId:board.id,boards:[board]});
    const drawn=[];
    const depth=createDepthForge({
      group:parent,sourceCanvas:fake.source,sourceArt,
      drawStroke:(_ctx,s)=>drawn.push(s.color+(s.erase?'-erase':''))
    });
    assert.equal(depth.enabled,false);
    assert.equal(sourceArt.visible,true);
    assert.equal(depth.setEnabled(true,board),true);
    assert.equal(sourceArt.visible,false);
    assert.equal(depth.visibleCount,2);
    assert.equal(depth.layerCount,3);
    assert.equal(depth.planes.length,2);
    assert.deepEqual(drawn,['#ff0000','#0000ff','#ffffff-erase']);
    assert.equal(depth.planes[0].material.map.image.width,512);
    assert.equal(depth.planes[0].material.map.image.height,360);
    assert.equal(depth.planes[0].position.z,.02);
    assert.equal(depth.planes[1].position.z,.075);
    assert.ok(depth.planes[1].renderOrder>depth.planes[0].renderOrder);
    const hits=[];
    depth.planes[0].raycast(new THREE.Raycaster(),hits);
    assert.equal(hits.length,0);
    assert.equal(writeScene({schema:'domistika.xr.scene.v1',selectedId:board.id,boards:[board]}),snapshot);
    depth.setGap(.11);
    assert.equal(depth.planes[1].position.z,.13);
    board.layers[1].visible=false;depth.refresh(board);
    assert.equal(depth.planes.length,1);
    assert.equal(depth.visibleCount,1);
    depth.setEnabled(false,board);
    assert.equal(depth.planes.length,0);
    assert.equal(sourceArt.visible,true);
    depth.dispose();
    assert.equal(sourceArt.material.map.isTexture,true);
  }finally{globalThis.document=originalDocument;}
});

test('Living Canvas depth toggles are reversible and preserve texture ownership',()=>{
  const originalDocument=globalThis.document;
  const fake=canvas();
  globalThis.document=fake.document;
  try{
    const scene=new THREE.Scene();
    const texture=new THREE.Texture();
    const originalBoard=makeBoard();
    const project={schema:'domistika.xr.scene.v1',selectedId:originalBoard.id,boards:[originalBoard]};
    const serialized=writeScene(project);
    const living=createLivingCanvas({
      scene,textTexture:()=>new THREE.Texture(),drawStroke:()=>{}
    });
    const panel=living.lift(originalBoard.id,{texture,canvas:fake.source},'Painted Door',originalBoard);
    assert.equal(living.count,1);
    assert.equal(panel.art.material.map,texture);
    living.setRoom('spatial');
    living.adjust('depth-toggle');
    assert.equal(panel.depthForge.enabled,true);
    assert.equal(living.all[0].depthEnabled,true);
    living.adjust('depth-more');
    assert.equal(living.all[0].depthGap,.07);
    living.adjust('depth-less');
    assert.equal(living.all[0].depthGap,.055);
    living.adjust('depth-reset');
    assert.equal(living.all[0].depthGap,.055);
    living.adjust('depth-toggle');
    assert.equal(panel.depthForge.enabled,false);
    assert.equal(panel.art.visible,true);
    assert.equal(writeScene(project),serialized);
    living.returnPanel(originalBoard.id);
    assert.equal(living.count,0);
    assert.equal(texture.isTexture,true);
    living.dispose();
  }finally{globalThis.document=originalDocument;}
});

test('legacy one-layer artwork stays flat and safely refuses synthetic depth',()=>{
  const scene=new THREE.Scene(),living=createLivingCanvas({
    scene,textTexture:()=>new THREE.Texture()
  });
  const board=makeScene().boards[0];
  const panel=living.lift(board.id,{texture:new THREE.Texture()},'Legacy art');
  assert.equal(panel.depthForge.enabled,false);
  assert.throws(()=>living.adjust('depth-toggle'),/Source canvas/);
  assert.equal(panel.art.visible,true);
  living.dispose();
});

test('desktop and Quest use same bounded depth controls with no new project schema',()=>{
  const js=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
  const runtime=readFileSync(new URL('../src/xr/livingCanvas.js',import.meta.url),'utf8');
  const depth=readFileSync(new URL('../src/xr/depthForge.js',import.meta.url),'utf8');
  assert.match(js,/createLivingCanvas\(\{scene,textTexture,drawStroke:strokeDraw\}\)/);
  assert.match(js,/livingCanvas\.lift\(b\.id,render,b\.name,b\)/);
  assert.match(js,/livingCanvas\.refresh\(board\.id,board\)/);
  assert.match(js,/livingCanvas\.refresh\(state\.board\.id,state\.board\)/);
  assert.match(runtime,/type:'living-canvas'/);
  assert.match(runtime,/depth-toggle/);
  assert.match(runtime,/createDepthForge\(/);
  assert.match(depth,/sourceArt\.visible=!enabled/);
  assert.match(html,/id="depthForgeStatus"/);
  assert.match(html,/data-living-action="depth-toggle"/);
  assert.doesNotMatch(runtime,/localStorage|writeScene|fetch\(|XMLHttpRequest/);
  assert.doesNotMatch(depth,/localStorage|writeScene|fetch\(|XMLHttpRequest/);
});
