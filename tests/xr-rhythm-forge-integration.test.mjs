import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const engine=readFileSync(new URL('../src/xr/rhythmForge.js',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../src/xr/workshopRuntime.js',import.meta.url),'utf8');
test('Quest and desktop rhythm controls are live and tied to existing Motion Forge',()=>{
 for(const id of ['rhythmAudio','rhythmLoad','rhythmFile','rhythmClear','rhythmTrack',
    'rhythmSensitivity','rhythmStrength','rhythmPlay','rhythmPause','rhythmMeter','rhythmLevel'])
  assert.ok(html.includes('id="'+id+'"'),'Missing Rhythm Forge control: '+id);
 for(const token of ["type:'rhythm-play'","type:'rhythm-stop'","rhythm.load(file)",
   "rhythm.play()","rhythm.pause()","rhythm.sampleFrame()","workshop.tickMotion(seconds,frame)"])
  assert.ok(main.includes(token),'Missing play or input wiring: '+token);
 assert.match(main,/document\.addEventListener\('visibilitychange'/);
 assert.match(main,/window\.addEventListener\('pagehide'/);
});
test('the local audio bridge does not record, upload, fetch or persist track data',()=>{
 assert.doesNotMatch(engine,/getUserMedia|fetch\(|XMLHttpRequest|localStorage|indexedDB|MediaRecorder|sendBeacon|eval\(/);
 assert.match(engine,/URL\.createObjectURL/);
 assert.match(engine,/URL\.revokeObjectURL/);
 assert.match(engine,/next\.createMediaElementSource\(audio\)/);
 assert.match(engine,/meter\.connect\(next\.destination\)/);
 assert.match(runtime,/const copy=root\.clone\(true\)/);
 assert.match(runtime,/mesh\.position\.fromArray\(item\.position\)/);
});
test('all JS static control selectors exist in the XR page',()=>{
 const ids=new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]));
 for(const m of main.matchAll(/\$\('#([\w-]+)'\)/g))
  assert.ok(ids.has(m[1]),'Missing DOM control '+m[1]);
});
