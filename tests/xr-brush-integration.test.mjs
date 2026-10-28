import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const studio=readFileSync(new URL('../src/xr/brushStudio.js',import.meta.url),'utf8');
test('VR spatial paint uses both controller trigger events and floating menu',()=>{
 assert.match(js,/createBrushStudio/);
 assert.match(js,/brushStudio\.start\(index,controllerTip\(c\)/);
 assert.match(js,/brushStudio\.extend\(index,controllerTip\(item\.controller\)\)/);
 assert.match(js,/brushStudio\.end\(index\)/);
 assert.match(js,/type:'air-style'/);
 assert.match(js,/type:'air-mirror'/);
 assert.match(js,/airDeck\.add/);
});
test('Open-air work remains a separate backup rather than altering 2D scene schema',()=>{
 assert.match(studio,/SPATIAL_STORE_KEY='domistika\.xr\.spatial\.v1'/);
 assert.match(js,/const STORE_KEY='domistika\.xr\.scene\.v1'/);
 assert.match(studio,/readSpatialScene/);
 assert.match(studio,/new GLTFExporter\(\)\.parseAsync/);
 assert.doesNotMatch(studio,/fetch\(|XMLHttpRequest|eval\(/);
});
test('spatial controls are all present and source contains no remote dependencies',()=>{
 const ids=new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map(match=>match[1]));
 const refs=[...js.matchAll(/\$\('#([\w-]+)'\)/g)].map(match=>match[1]);
 for(const id of refs)assert.ok(ids.has(id),'Missing XR HTML control: '+id);
 for(const id of ['airUndo','airRedo','airSave','airExport','airExportGLB','airImport','spatialFile','airClear','airMirror','spatialCount'])assert.ok(ids.has(id));
 assert.doesNotMatch(studio,/https?:\/\//);
});
