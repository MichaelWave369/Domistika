import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeScene,newStroke,readScene,writeScene,sanitizeScene} from '../src/xr/model.js';
import {
  BASE_LAYER_ID,MAX_CANVAS_LAYERS,canvasLayers,activeCanvasLayer,
  strokeLayerId,sanitizeLayerConfig,editCanvasLayers
} from '../src/xr/layerModel.js';
import {renderLayeredBoard} from '../src/xr/layerRendering.js';

test('legacy v1 paintings remain unchanged without forced layer migration',()=>{
 const scene=makeScene(),board=scene.boards[0];
 board.strokes.push(newStroke('#123456',12,false,[.2,.3]));
 const result=readScene(writeScene(scene)).boards[0];
 assert.equal(result.layers,undefined);
 assert.equal(result.activeLayerId,undefined);
 assert.equal(result.strokes[0].layerId,undefined);
 assert.equal(strokeLayerId(result.strokes[0]),BASE_LAYER_ID);
 assert.equal(canvasLayers(result).length,1);
 assert.equal(activeCanvasLayer(result).id,'base');
});

test('layers and stroke assignments survive the original scene v1 round-trip',()=>{
 const scene=makeScene(),board=scene.boards[0];
 board.strokes.push(newStroke('#ff0000',10,false,[.1,.1]));
 Object.assign(board,editCanvasLayers(board,'add'));
 const top=board.activeLayerId;
 const stroke=newStroke('#0000ff',18,false,[.8,.8],'wash');stroke.layerId=top;
 board.strokes.push(stroke);
 Object.assign(board,editCanvasLayers(board,'toggle',top));
 const copy=readScene(writeScene(scene));
 const restored=copy.boards[0];
 assert.equal(copy.schema,'domistika.xr.scene.v1');
 assert.deepEqual(restored.layers.map(l=>l.id),['base',top]);
 assert.equal(restored.activeLayerId,top);
 assert.equal(restored.layers[1].visible,false);
 assert.equal(restored.strokes[0].layerId,undefined);
 assert.equal(restored.strokes[1].layerId,top);
 assert.equal(restored.strokes[1].brush,'wash');
 assert.deepEqual(readScene(writeScene(copy)),copy);
});

test('layer order is explicit, bounded, and background remains anchored',()=>{
 const board=makeScene().boards[0];
 Object.assign(board,editCanvasLayers(board,'add'));
 const a=board.activeLayerId;
 Object.assign(board,editCanvasLayers(board,'add'));
 const b=board.activeLayerId;
 assert.deepEqual(board.layers.map(l=>l.id),['base',a,b]);
 Object.assign(board,editCanvasLayers(board,'down',b));
 assert.deepEqual(board.layers.map(l=>l.id),['base',b,a]);
 Object.assign(board,editCanvasLayers(board,'up',b));
 assert.deepEqual(board.layers.map(l=>l.id),['base',a,b]);
 Object.assign(board,editCanvasLayers(board,'down',a)); // never swap with base
 assert.equal(board.layers[0].id,'base');
 Object.assign(board,editCanvasLayers(board,'prev'));
 assert.equal(board.activeLayerId,a);
 Object.assign(board,editCanvasLayers(board,'next'));
 assert.equal(board.activeLayerId,b);
 while(canvasLayers(board).length<MAX_CANVAS_LAYERS)Object.assign(board,editCanvasLayers(board,'add'));
 assert.throws(()=>editCanvasLayers(board,'add'),/Eight/);
 assert.throws(()=>editCanvasLayers(board,'unrecognized'),/Unknown/);
});

test('deleting a layer cannot destroy artwork, and the base is immutable in position',()=>{
 const board=makeScene().boards[0];
 Object.assign(board,editCanvasLayers(board,'add'));
 const id=board.activeLayerId;
 const stroke=newStroke('#ff8800',12,false,[.1,.1]);stroke.layerId=id;
 board.strokes.push(stroke);
 assert.throws(()=>editCanvasLayers(board,'remove-empty',id),/contains artwork/);
 assert.throws(()=>editCanvasLayers(board,'remove-empty','base'),/Background/);
 assert.equal(board.strokes.length,1);
 board.strokes.length=0;
 Object.assign(board,editCanvasLayers(board,'remove-empty',id));
 assert.deepEqual(board.layers.map(l=>l.id),['base']);
 assert.equal(board.activeLayerId,'base');
});

test('scene validation rejects unknown, hostile and duplicated layer definitions',()=>{
 const scene=makeScene(),board=scene.boards[0];
 const stroke=newStroke('#aa00aa',9,false,[.2,.2]);
 stroke.layerId='not-present';board.strokes.push(stroke);
 assert.throws(()=>sanitizeScene(scene),/Unknown stroke layer/);
 board.strokes.length=0;
 board.layers=[{id:'base',name:'Background',visible:true},{id:'base',name:'Duplicate',visible:true}];
 assert.throws(()=>sanitizeScene(scene),/duplicate/);
 board.layers=[{id:'other',name:'Not base',visible:true}];
 assert.throws(()=>sanitizeScene(scene),/Background/);
 board.layers=[{id:'base',name:'Background',visible:'true'}];
 assert.throws(()=>sanitizeScene(scene),/visibility/);
 board.layers=[{id:'base',name:'Background',visible:true}];
 board.strokes.push({...newStroke('#abc123',8,false,[.1,.2]),layerId:'missing'});
 assert.throws(()=>sanitizeScene(scene),/unknown canvas layer/);
 board.strokes.length=0;
 board.activeLayerId='bogus';
 assert.throws(()=>sanitizeScene(scene),/does not exist/);
});

test('eraser is isolated to one layer before compositing over the base',()=>{
 const events=[];
 const scratchCtx={
   clearRect(){events.push('scratch.clear');},
 };
 const mainCtx={
   clearRect(){events.push('output.clear');},
   drawImage(){events.push('output.composite');}
 };
 const scratch={width:1024,height:720,getContext(){return scratchCtx;}};
 const canvas={width:1024,height:720,getContext(){return mainCtx;}};
 const board={layers:[{id:'base',name:'Background',visible:true},{id:'layer-1',name:'Details',visible:true}],
   strokes:[{color:'#111111',erase:false,layerId:undefined},
     {color:'#222222',erase:true,layerId:'layer-1'}]};
 renderLayeredBoard(canvas,board,(ctx,stroke)=>{
   assert.equal(ctx,scratchCtx);
   events.push(stroke.erase?'paint.top.eraser':'paint.base');
 },()=>scratch);
 assert.deepEqual(events,[
   'output.clear','scratch.clear','paint.base','output.composite',
   'scratch.clear','paint.top.eraser','output.composite'
 ]);
 events.length=0;
 board.layers[1].visible=false;
 renderLayeredBoard(canvas,board,(ctx,stroke)=>events.push(stroke.erase?'erase':'base'),()=>scratch);
 assert.deepEqual(events,['output.clear','scratch.clear','base','output.composite']);
});

test('legacy scenes replay directly without allocating a layer buffer',()=>{
 const events=[];
 const ctx={clearRect(){events.push('clear');}};
 const canvas={width:16,height:16,getContext(){return ctx;}};
 renderLayeredBoard(canvas,{strokes:[{id:1}]},(context,stroke)=>{
   assert.equal(context,ctx);events.push(stroke.id);
 },()=>{throw Error('Legacy rendering must not allocate scratch.');});
 assert.deepEqual(events,['clear',1]);
});

test('Canvas and Quest layer controls use the same editing engine and safety rules',()=>{
 const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
 const easel=readFileSync(new URL('../src/xr/easelStudio.js',import.meta.url),'utf8');
 for(const id of ['canvasLayerStudio','canvasLayerList','canvasLayerAdd','canvasLayerCount','canvasLayerSelected']){
   assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.match(main,/function applyCanvasLayerAction/);
 assert.match(main,/function syncCanvasLayersUI/);
 assert.match(main,/a\.type==='layer-action'/);
 assert.match(main,/renderLayeredBoard\(r\.canvas,b,strokeDraw/);
 assert.match(main,/s\.layerId=layer\.id/);
 assert.match(easel,/type:'layer-action'/);
 assert.match(main,/action==='remove-empty'/);
});
