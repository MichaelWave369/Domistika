import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const rt=readFileSync(new URL('../src/xr/workshopRuntime.js',import.meta.url),'utf8');
test('Motion Forge desktop controls and Quest tool actions are wired',()=>{
 for(const id of ['motionEffect','motionSpeed','motionAmplitude','motionPhase','motionApply','motionPlay','motionStop','motionScrub','motionTime'])
  assert.ok(html.includes('id="'+id+'"'),'Missing motion UI: '+id);
 for(const token of ["type:'work-motion-cycle'","type:'work-motion-toggle'","type:'work-motion-reset'","workshop.cycleSelectedMotion()","workshop.toggleMotion()","workshop.stopMotion()","workshop.previewMotion","workshop.tickMotion"])
  assert.ok(js.includes(token),'Missing motion interaction: '+token);
 assert.match(js,/renderer\.setAnimationLoop\(timeMs=>\{/);
 assert.match(js,/document\.addEventListener\('visibilitychange'/);
});
test('motion preview never serializes visual transform or overlays into saved workshop JSON',()=>{
 assert.match(rt,/sampleMotion\(item,time(?:,audioEnergy)?\)/);
 assert.match(rt,/const copy=root\.clone\(true\)/);
 assert.match(rt,/mesh\.position\.fromArray\(item\.position\)/);
 assert.match(rt,/setSelectedMotion\(settings\)/);
 assert.match(rt,/onMotion\(\{playing:false,time:0\}\)/);
 assert.doesNotMatch(rt,/fetch\(|XMLHttpRequest|eval\(/);
});
test('all static DOM selectors referenced in XR JavaScript exist',()=>{
 const ids=new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]));
 for(const match of js.matchAll(/\$\('#([\w-]+)'\)/g))
  assert.ok(ids.has(match[1]),'Missing '+match[1]);
});
