import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const rhythm=readFileSync(new URL('../src/xr/rhythmForge.js',import.meta.url),'utf8');
const engine=readFileSync(new URL('../src/xr/beatForge.js',import.meta.url),'utf8');
test('new band monitor and VR BAND FX are wired, existing play path still present',()=>{
 for(const id of ['motionBand','beatBass','beatBassValue','beatMid','beatMidValue',
  'beatHigh','beatHighValue','beatPulse']){
  assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
  assert.ok(main.includes("'#"+id+"'"),'Missing handler '+id);
 }
 for(const code of ["type:'work-band-cycle'","cycleSelectedBand()","rhythm.sampleFrame()",
  "workshop.tickMotion(seconds,frame)","rhythm.play()","rhythm.pause()"])
  assert.ok(main.includes(code),'Missing live beat/music behavior '+code);
});
test('bass pulse is inferred only from local analyser and no audio data persists',()=>{
 assert.match(rhythm,/createOnsetGate\(\)/);
 assert.match(rhythm,/getByteFrequencyData\(bytes\)/);
 assert.match(rhythm,/function sampleFrame\(\)/);
 assert.match(engine,/180ms refractory/);
 assert.doesNotMatch(engine,/getUserMedia|MediaRecorder|fetch\(|XMLHttpRequest|localStorage|indexedDB|eval\(/);
 assert.doesNotMatch(rhythm,/getUserMedia|MediaRecorder|fetch\(|XMLHttpRequest|localStorage|indexedDB|eval\(/);
});
test('all static DOM selectors referenced by XR JS exist after Beat Forge controls',()=>{
 const ids=new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]));
 for(const m of main.matchAll(/\$\('#([\w-]+)'\)/g))
  assert.ok(ids.has(m[1]),'Missing XR node '+m[1]);
});
