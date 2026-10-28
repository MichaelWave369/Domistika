import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../src/xr/workshopRuntime.js',import.meta.url),'utf8');
const model=readFileSync(new URL('../src/xr/workshopModel.js',import.meta.url),'utf8');
test('desktop and Quest have real duplicate, mirror and ruler interactions',()=>{
 for(const id of ['workshopObjects','workshopDuplicate','workshopMirror','workshopMeasureA','workshopMeasureB','workshopMeasure','workshopMeasureClear','workshopDistance','workshopName','workshopColor','workshopAppearance']){
   assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
 }
 for(const token of ["type:'work-duplicate'","type:'work-mirror'","value:'work-measure'","type:'work-delete'","workshop.measurePick(workHit.id)","workshop.measurePick(found.id)","workshop.duplicateSelected","workshop.setMeasurement","workshop.setSelectedAppearance"]){
   assert.ok(app.includes(token),'Missing handler '+token);
 }
});
test('new object features keep geometry bounded and ruler outside GLB/storage root',()=>{
 assert.match(model,/mirroredX=input\.mirroredX\?\?false/);
 assert.match(runtime,/o\.mirroredX\?mirroredGeometry\(shapeGeometry\(o\)\)/);
 assert.match(runtime,/new THREE\.Line\(/);
 assert.match(runtime,/ruler\.name='Workshop measurement overlay/);
 assert.match(runtime,/const copy=root\.clone\(true\)/);
 assert.doesNotMatch(runtime,/fetch\(|XMLHttpRequest|eval\(/);
});
test('static DOM references remain valid after adding Object Lab controls',()=>{
 const ids=new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]));
 const refs=[...app.matchAll(/\$\('#([\w-]+)'\)/g)].map(m=>m[1]);
 for(const ref of refs)assert.ok(ids.has(ref),'Missing DOM control '+ref);
});
