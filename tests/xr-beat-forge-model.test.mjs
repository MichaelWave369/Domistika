import test from 'node:test';
import assert from 'node:assert/strict';
import {spectrumBands,createOnsetGate,selectObjectAudio,zeroAudioFrame} from '../src/xr/beatForge.js';
test('silent input yields zero across independent bass/mid/high channels',()=>{
 assert.deepEqual(spectrumBands(new Uint8Array(512),48000,1024),zeroAudioFrame());
});
test('each frequency band can dominate independently without bleeding into others',()=>{
 const bins=new Uint8Array(512);
 bins[3]=245;
 const bass=spectrumBands(bins,48000,1024);
 assert.ok(bass.bass>0.3&&bass.mid===0&&bass.high===0);
 bins.fill(0);bins[17]=245;
 const mid=spectrumBands(bins,48000,1024);
 assert.ok(mid.mid>0.1&&mid.bass===0&&mid.high===0);
 bins.fill(0);bins[80]=245;
 const high=spectrumBands(bins,48000,1024);
 assert.ok(high.high>0.05&&high.bass===0&&high.mid===0);
 assert.equal(spectrumBands(bins,48000,1024,0).high,0);
});
test('transient gate suppresses steady bass and handles pauses, rewind and refractory',()=>{
 const gate=createOnsetGate();
 assert.equal(gate.detect(0,0),0);
 assert.equal(gate.detect(.7,.1),1);
 assert.ok(gate.detect(.7,.2)>0);
 assert.ok(gate.detect(.7,.21)<1);
 assert.equal(gate.detect(.7,.5),0);
 assert.equal(gate.detect(0,.6),0);
 assert.equal(gate.detect(.8,.65),1);
 assert.equal(gate.detect(0,.75)>0);
 assert.equal(gate.detect(.9,.76)<1); // refractory
 assert.equal(gate.detect(0,0),0); // rewind resets state
 assert.equal(gate.detect(.7,.1),1);
 gate.reset();assert.equal(gate.detect(0,0),0);
});
test('old scalar audio remains valid for Full, structured channels select per object',()=>{
 assert.equal(selectObjectAudio(.6,'full'),.6);
 assert.equal(selectObjectAudio(.6,'bass'),0);
 assert.equal(selectObjectAudio({energy:.2,bass:.8,mid:.3,high:.1,beat:1},'beat'),1);
 assert.equal(selectObjectAudio({energy:.2,bass:.8,mid:.3,high:.1,beat:1},'high'),.1);
 for(const bad of [NaN,-1,2])assert.throws(()=>selectObjectAudio(bad),/energy/);
 assert.throws(()=>selectObjectAudio(zeroAudioFrame(),'unknown'),/band/);
 assert.throws(()=>selectObjectAudio({energy:1},'bass'),/energy/);
});
