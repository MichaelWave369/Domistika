import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const run=readFileSync(new URL('../src/xr/workshopRuntime.js',import.meta.url),'utf8');
const model=readFileSync(new URL('../src/xr/workshopModel.js',import.meta.url),'utf8');
const brush=readFileSync(new URL('../src/xr/brushStudio.js',import.meta.url),'utf8');
test('Quest spatial workshop is controller-native and keeps existing artist controls',()=>{
 assert.match(app,/workshop\.beginController\(index,c,ray,mode\.slice\(5\)\)/);
 assert.match(app,/workshop\.updateController\(index\)/);
 assert.match(app,/workshop\.finish\(index\)/);
 assert.match(app,/workshop\.beginMouse/);
 for(const kind of ['box','sphere','cylinder','torus'])assert.match(app,new RegExp("value:'"+kind+"'"));
 assert.match(app,/workshop\.promoteFramefield/);
 assert.match(app,/workshop\.promoteCad/);
 assert.match(app,/brushStudio\.start/);
 assert.match(app,/showBpcMeshes/);
 assert.match(app,/toggleOpenBluePreview/);
});
test('workshop saves independently and excludes read-only CAD and BPC previews',()=>{
 assert.match(model,/domistika\.xr\.workshop\.v1/);
 assert.match(run,/save\(\)/);
 assert.match(run,/new GLTFExporter\(\)\.parseAsync/);
 assert.doesNotMatch(run,/fetch\(|XMLHttpRequest|eval\(/);
 assert.doesNotMatch(run,/bpcMeshRoot|openBluePreview/);
 assert.match(brush,/return \{root,start/);
});
test('every queried DOM control exists and numeric dimensions are available',()=>{
 const ids=new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]));
 const refs=[...app.matchAll(/\$\('#([\w-]+)'\)/g)].map(m=>m[1]);
 for(const id of refs)assert.ok(ids.has(id),'Missing XR DOM node '+id);
 for(const id of ['workshopX','workshopY','workshopZ','workshopSize','workshopDimX','workshopDimY','workshopDimZ',
    'workshopImport','workshopExportGlb','workshopExportJson','workshopCopyCad','workshopCopyBpc'])assert.ok(ids.has(id));
});
