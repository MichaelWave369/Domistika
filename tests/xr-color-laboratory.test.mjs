import test from 'node:test';
import assert from 'node:assert/strict';
import {PIGMENTS,CANVAS_BRUSHES,normalizeMix,normalizeBrush,normalizePigment,mixPigments} from '../src/xr/colorLaboratory.js';
import {paintStroke} from '../src/xr/paintTextures.js';
import {newStroke,makeScene,readScene,writeScene} from '../src/xr/model.js';
import {readFileSync} from 'node:fs';

test('RYB artist color wheel mixes primaries and preserves exact endpoint colors',()=>{
 assert.equal(mixPigments('#ff0000','#0000ff',0),'#ff0000');
 assert.equal(mixPigments('#ff0000','#0000ff',100),'#0000ff');
 assert.equal(mixPigments('#ff0000','#ff0000',37),'#ff0000');
 assert.equal(mixPigments('#ffff00','#0000ff',50),'#008000');
 assert.equal(mixPigments('#ff0000','#0000ff',50),'#800080');
 assert.equal(mixPigments('#ff0000','#ffffff',50),'#ff8080');
 assert.equal(mixPigments('#ff0000','#0000ff',50),mixPigments('#0000ff','#ff0000',50));
 assert.equal(mixPigments('#ff0000','#ffffff',NaN),'#ff8080');
 assert.ok(PIGMENTS.length>=6);
});

test('color values, mixing ratios and brush styles reject unexpected input',()=>{
 assert.equal(normalizePigment('red'),'#68e4ff');
 assert.deepEqual(normalizeMix({a:'BAD',b:'#abcdef',ratio:10000}),{
   a:'#e54b39',b:'#abcdef',ratio:100
 });
 assert.equal(normalizeBrush('glitter<script>'),'solid');
 assert.deepEqual(CANVAS_BRUSHES,['solid','dry','wash','marker']);
});

test('textured brushes survive scene v1 round-trips but legacy strokes stay unchanged',()=>{
 const scene=makeScene();
 const dry=newStroke('#123456',11,false,[.3,.4],'dry');
 assert.equal(dry.brush,'dry');
 assert.equal(newStroke('#123456',11,false,[.3,.4]).brush,undefined);
 for(const brush of ['dry','wash','marker'])scene.boards[0].strokes.push(newStroke('#98abcd',16,false,[.1,.1],brush));
 const saved=readScene(writeScene(scene));
 assert.equal(saved.schema,'domistika.xr.scene.v1');
 assert.deepEqual(saved.boards[0].strokes.map(s=>s.brush),['dry','wash','marker']);
 scene.boards[0].strokes.push(newStroke('#ffffff',8,true,[.5,.5],'wash'));
 const eraser=readScene(writeScene(scene)).boards[0].strokes[3];
 assert.equal(eraser.erase,true);
 assert.equal(eraser.brush,undefined);
 const legacy=makeScene();legacy.boards[0].strokes.push(newStroke('#eeeeee',9));
 assert.equal(readScene(writeScene(legacy)).boards[0].strokes[0].brush,undefined);
});

test('paint rendering is deterministic, respects eraser and restores Canvas2D state',()=>{
 const events=[];
 const ctx={save(){events.push('save');},restore(){events.push('restore');},
   beginPath(){},moveTo(){},lineTo(){},arc(){},
   fill(){events.push(['fill',this.globalAlpha,this.globalCompositeOperation]);},
   stroke(){events.push(['stroke',this.globalAlpha,this.globalCompositeOperation]);},
   setLineDash(dashes){events.push(['dash',dashes]);}};
 for(const brush of CANVAS_BRUSHES){
   const s=newStroke('#ff2020',12,false,[.2,.2],brush);
   s.points.push([.3,.3]);
   paintStroke(ctx,s,1024,720);
 }
 paintStroke(ctx,newStroke('#ff2020',12,true,[.4,.4],'wash'),1024,720);
 assert.equal(events.filter(e=>e==='save').length,5);
 assert.equal(events.filter(e=>e==='restore').length,5);
 assert.ok(events.some(e=>Array.isArray(e)&&e[0]==='dash'));
 assert.ok(events.some(e=>Array.isArray(e)&&e[1]===.09));
 assert.ok(events.some(e=>Array.isArray(e)&&e[1]===.42));
 assert.ok(events.some(e=>Array.isArray(e)&&e[2]==='destination-out'));
});

test('desktop and Quest expose mixing and new brush style controls',()=>{
 const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
 const easel=readFileSync(new URL('../src/xr/easelStudio.js',import.meta.url),'utf8');
 for(const id of ['labPigmentA','labPigmentB','labRatio','labMixedColor','labApply','labBrushes']){
   assert.ok(html.includes('id="'+id+'"'),'missing '+id);
 }
 assert.match(main,/mixPigments\(/);
 assert.match(main,/paintStroke\(/);
 assert.match(main,/newStroke\(ink\(\),size\(\),erasing,p,canvasBrush\)/);
 assert.match(easel,/type:'lab-action'/);
 assert.match(main,/a\.type==='lab-action'/);
 assert.match(main,/setupColorLab\(\)/);
});
