import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
test('XR has explicit user-directed BPC mesh import and clear controls',()=>{
 for(const name of ['bpcPreviewCount','bpcPreviewFile','importBpcPreview','clearBpcPreview']){
   assert.match(html,new RegExp('id="'+name+'"'));
 }
 assert.match(main,/readBpcFramefieldPreview\(await file\.text\(\)\)/);
 assert.match(main,/new THREE\.BufferGeometry\(\)/);
 assert.match(main,/new THREE\.MeshStandardMaterial/);
 assert.match(main,/clearBpcMeshes/);
});
test('BPC preview is not stored in Domistika XR board schema or localStorage',()=>{
 const model=readFileSync(new URL('../src/xr/model.js',import.meta.url),'utf8');
 assert.doesNotMatch(model,/bpcMeshRoot|bpcPreviewCount/);
 assert.match(main,/outside sceneData and its localStorage schema/);
 assert.doesNotMatch(main,/fetch\(|XMLHttpRequest/);
});
