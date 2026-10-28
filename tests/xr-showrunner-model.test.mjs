import test from 'node:test';
import assert from 'node:assert/strict';
import {createShowrunner,DEFAULT_SHOW,validateShow,showDuration,writeShowPack,readShowPack} from '../src/xr/showrunner.js';
import {buildShowPreset} from '../src/xr/showForge.js';
import {emptyWorkshop,writeWorkshop} from '../src/xr/workshopModel.js';
test('three authored visual acts advance without skipping, then finish cleanly',()=>{
 const runner=createShowrunner();assert.equal(runner.status.total,44);
 assert.equal(runner.status.index,0);runner.play();
 for(let i=0;i<120;i++)runner.tick(.1);
 assert.equal(runner.status.index,1);
 assert.equal(runner.status.cue.palette,'outrun');
 runner.next();assert.equal(runner.status.index,2);
 runner.previous();assert.equal(runner.status.index,1);
 runner.jump(2);
 for(let i=0;i<140;i++)runner.tick(.1);
 assert.equal(runner.playing,false);assert.equal(runner.status.remaining,0);
 runner.reset();assert.equal(runner.status.elapsed,0);
});
test('explicit cue editing never mutates source defaults and rejects bad values',()=>{
 const runner=createShowrunner();
 const original=JSON.stringify(DEFAULT_SHOW);
 runner.updateCue(1,{duration:22,palette:'ice',energy:.8});
 assert.equal(runner.status.total,48);
 assert.equal(runner.show.cues[1].palette,'ice');
 assert.equal(JSON.stringify(DEFAULT_SHOW),original);
 runner.play();
 assert.throws(()=>runner.updateCue(0,{gain:.1}),/Stop/);
 runner.pause();
 for(const bad of [{gain:Infinity},{palette:'unknown'},{duration:0},{energy:2}])
  assert.throws(()=>runner.updateCue(0,bad),/cue/);
 assert.equal(runner.show.cues[0].gain,.55);
});
test('portable show package round trips editable geometry and authored cue settings',()=>{
 const assembly=emptyWorkshop();assembly.objects=buildShowPreset('orbit-bloom');
 const base=writeWorkshop(assembly),show=validateShow(DEFAULT_SHOW);
 const text=writeShowPack(base,show);
 const imported=readShowPack(text);
 assert.equal(imported.workshop.objects.length,13);
 assert.deepEqual(imported.show,show);
 assert.ok(imported.workshop.objects[0].motion);
 assert.ok(text.length<2_250_000);
 for(const forbidden of ['blob:','audioFile','waveform','rawSpectrum'])
  assert.ok(!text.includes(forbidden));
});
test('malformed show package or overlarge payload cannot bypass workshop validation',()=>{
 const base=writeWorkshop(emptyWorkshop()),text=writeShowPack(base);
 const altered=JSON.parse(text);altered.schema='fake';
 assert.throws(()=>readShowPack(JSON.stringify(altered)),/Unsupported/);
 altered.schema='domistika.xr.showpack.v1';altered.workshop.objects=[{id:'x'}];
 assert.throws(()=>readShowPack(JSON.stringify(altered)),/workshop/);
 assert.throws(()=>readShowPack('x'.repeat(2_250_001)),/exceeds/);
 assert.throws(()=>validateShow({...DEFAULT_SHOW,cues:[]}),/Invalid/);
 assert.throws(()=>validateShow({...DEFAULT_SHOW,cues:Array(9).fill(DEFAULT_SHOW.cues[0])}),/Invalid/);
});
test('silent show frame is bounded, deterministic and does not play sound',()=>{
 const r=createShowrunner();r.play();
 for(let i=0;i<400;i++){r.tick(.1);const a=r.frame(),b=r.frame();
  assert.deepEqual(a,b);
  for(const v of Object.values(a))assert.ok(v>=0&&v<=1);
 }
 assert.throws(()=>r.tick(-.1),/delta/);
 assert.equal(showDuration(DEFAULT_SHOW),44);
});
