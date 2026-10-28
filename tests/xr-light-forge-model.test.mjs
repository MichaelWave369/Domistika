import test from 'node:test';
import assert from 'node:assert/strict';
import {lightSample,LIGHT_PALETTES,defaultLightSettings,validateLightSettings} from '../src/xr/lightForge.js';
import {WORKSHOP_PAGE_SIZE,workshopPageCount,workshopPageIndices,wrapWorkshopPage} from '../src/xr/workshopDeck.js';
const item=(band='bass')=>({motion:{band}});
const frame={energy:.3,bass:1,mid:0,high:0,beat:0};
test('no music creates zero glow and bright bass never exceeds safe luminous bound',()=>{
  const settings={enabled:true,palette:'outrun',gain:1.5};
  assert.equal(lightSample(item(),{energy:0,bass:0,mid:0,high:0,beat:0},settings,0,.1).intensity,0);
  let env=0,result=null;
  for(let i=0;i<100;i++){result=lightSample(item(),frame,settings,env,.1);env=result.envelope;}
  assert.ok(result.intensity>1.2&&result.intensity<=1.35);
  assert.ok(result.envelope<=1&&result.envelope>=0);
  assert.equal(result.color,LIGHT_PALETTES.outrun.bass);
});
test('bass-heavy frame lights bass object but not high object; envelope decays smoothly',()=>{
 const settings={enabled:true,palette:'ice',gain:.8};
 const low=lightSample(item('bass'),frame,settings,0,.016);
 const high=lightSample(item('high'),frame,settings,0,.016);
 assert.ok(low.intensity>high.intensity);
 assert.equal(high.intensity,0);
 const release=lightSample(item('bass'),{energy:0,bass:0,mid:0,high:0,beat:0},settings,low.envelope,.016);
 assert.ok(release.intensity<low.intensity&&release.intensity>0);
 const off=lightSample(item('bass'),frame,{...settings,enabled:false},.8,.1);
 assert.ok(off.envelope<.8&&off.envelope>0);
});
test('invalid palette/gain and nonfinite frame inputs fail closed',()=>{
 for(const bad of [
  {enabled:true,palette:'evil',gain:1},{enabled:true,palette:'outrun',gain:-1},
  {enabled:true,palette:'ice',gain:Infinity},{enabled:'yes',palette:'ice',gain:1}
 ])assert.throws(()=>validateLightSettings(bad),/Light Forge/);
 assert.deepEqual(defaultLightSettings(),{enabled:false,palette:'outrun',gain:.7});
 assert.throws(()=>lightSample(item(),frame,{enabled:true,palette:'outrun',gain:1},1.2,.016),/timing/);
});
test('24+ workshop controls fit paged deck and wrap, no silent orphan buttons',()=>{
 assert.equal(WORKSHOP_PAGE_SIZE,12);
 assert.equal(workshopPageCount(25),3);
 assert.deepEqual(workshopPageIndices(25,0),Array.from({length:12},(_,i)=>i));
 assert.deepEqual(workshopPageIndices(25,1),Array.from({length:12},(_,i)=>i+12));
 assert.deepEqual(workshopPageIndices(25,2),[24]);
 assert.equal(wrapWorkshopPage(0,-1,25),2);
 assert.equal(wrapWorkshopPage(2,1,25),0);
 assert.throws(()=>workshopPageIndices(24,2),/page/);
});
