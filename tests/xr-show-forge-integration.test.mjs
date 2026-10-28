import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../src/xr/workshopRuntime.js',import.meta.url),'utf8');
const engine=readFileSync(new URL('../src/xr/showForge.js',import.meta.url),'utf8');
test('desktop controls and Quest stage/demo gestures are connected',()=>{
 for(const id of ['showPreset','showBuild','showDemoStart','showDemoStop','showStatus'])
  assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
 for(const code of ["type:'work-show-add'","type:'work-show-demo'","type:'work-show-stop'",
   "workshop.addShowPreset(preset)","sampleShowDemo(showDemoClock)",
   "stopShowDemo()","syncShowUI()"])
  assert.ok(main.includes(code),'Missing '+code);
});
test('stages use existing atomic capacity and rest-pose exports',()=>{
 assert.match(runtime,/return appendMany\(buildShowPreset\(preset\)\)/);
 assert.match(runtime,/writeWorkshop\(candidate\)/);
 assert.match(runtime,/snapshot\(\)/);
 assert.match(runtime,/mesh\.position\.fromArray\(item\.position\)/);
 assert.doesNotMatch(engine,/fetch\(|XMLHttpRequest|indexedDB|localStorage|eval\(/);
});
test('demo and track are exclusive and visibility / XR end stop visual preview',()=>{
 assert.match(main,/if\(showDemoActive\)stopShowDemo\(\)/);
 assert.match(main,/if\(showDemoActive&&!workshop\.motionPlaying\)stopShowDemo\(\)/);
 assert.match(main,/document\.addEventListener\('visibilitychange'/);
 assert.match(main,/renderer\.xr\.addEventListener\('sessionend'/);
 assert.match(main,/window\.addEventListener\('pagehide'/);
});
test('all static DOM selectors still exist',()=>{
 const ids=new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]));
 for(const m of main.matchAll(/\$\('#([\w-]+)'\)/g))
   assert.ok(ids.has(m[1]),'Missing XR node '+m[1]);
});
