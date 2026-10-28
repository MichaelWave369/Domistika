import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../src/xr/workshopRuntime.js',import.meta.url),'utf8');
test('all Pattern Forge controls are real wired buttons and inputs',()=>{
 const ids=['patternCopies','patternAxis','patternSpacing','patternRadius','patternLinear','patternRadial',
  'patternAlignTarget','patternAlignAxis','patternAlign','patternFloor'];
 for(const id of ids){
  assert.ok(html.includes('id="'+id+'"'),'Missing HTML '+id);
  assert.ok(js.includes("$('#"+id+"')"),'Missing JS control '+id);
 }
 for(const str of ["type:'work-pattern',value:'linear'","type:'work-pattern',value:'radial'","type:'work-floor'","workshop.patternSelected","workshop.alignSelected","workshop.floorSelected"]){
  assert.ok(js.includes(str),'Missing in-world or desktop behavior '+str);
 }
});
test('the new source does not fetch remote projects or mix CAD and BPC authority',()=>{
 const model=readFileSync(new URL('../src/xr/patternForge.js',import.meta.url),'utf8');
 assert.doesNotMatch(model,/fetch\(|XMLHttpRequest|localStorage|eval\(/);
 assert.doesNotMatch(runtime,/bpcMeshRoot|openBluePreview/);
 assert.match(runtime,/validateWorkshop\(\{schema:data.schema,objects:\[\.\.\.data.objects,\.\.\.objects\]\}\)/);
 assert.match(runtime,/writeWorkshop\(candidate\)/);
 assert.match(runtime,/const bounds=new THREE.Box3\(\).setFromObject\(mesh\)/);
});
test('all existing DOM IDs referenced by JS stay available',()=>{
 const ids=new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]));
 for(const m of js.matchAll(/\$\('#([\w-]+)'\)/g))assert.ok(ids.has(m[1]),'Missing '+m[1]);
});
