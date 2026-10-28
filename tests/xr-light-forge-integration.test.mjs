import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../src/xr/workshopRuntime.js',import.meta.url),'utf8');
const deck=readFileSync(new URL('../src/xr/workshopDeck.js',import.meta.url),'utf8');
test('Light Forge controls and Quest VR palette buttons perform real operations',()=>{
 for(const id of ['lightPalette','lightGain','lightGainLabel','lightToggle','lightNextPalette','lightStatus'])
   assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
 for(const code of ["type:'work-light-toggle'","type:'work-light-palette'","type:'work-page'",
   'setLightSettings','nextLightPalette','toggleLight','changeWorkPage(a.delta)'])
   assert.ok(main.includes(code),'Missing Light Forge handler '+code);
});
test('Quest workshop hides all inactive page controls from BOTH rendering and trigger raycasting',()=>{
 assert.match(main,/mesh\.visible=enabled;mesh\.layers\.set\(enabled\?0:1\)/);
 assert.match(main,/const slot=i%WORKSHOP_PAGE_SIZE/);
 assert.match(main,/wrapWorkshopPage\(workPage,delta,workActions\.length\)/);
 assert.match(deck,/WORKSHOP_PAGE_SIZE=12/);
 const actions=[...main.matchAll(/\['(?:[A-Z /+0-9]+)',\{type:'(?:work-|rhythm-|mode')/g)];
 assert.ok(actions.length>24,'Should cover many tools across multiple pages.');
});
test('static GLB export isolates reactive material and rest pose from preview',()=>{
 assert.match(runtime,/const copy=root\.clone\(true\)/);
 assert.match(runtime,/node\.material=node\.material\.clone\(\)/);
 assert.match(runtime,/node\.material\.emissive\?\.set\(0x000000\)/);
 assert.match(runtime,/mesh\.position\.fromArray\(item\.position\)/);
 assert.match(runtime,/resetLightVisuals\(\)/);
 assert.doesNotMatch(runtime,/fetch\(|XMLHttpRequest|eval\(/);
});
test('every static DOM selector in XR JS exists',()=>{
 const ids=new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]));
 for(const match of main.matchAll(/\$\('#([\w-]+)'\)/g))
   assert.ok(ids.has(match[1]),'Missing node '+match[1]);
});
