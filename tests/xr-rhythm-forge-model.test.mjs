import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleSpectrum,checkLocalTrack,createLocalRhythm,RHYTHM_MAX_BYTES} from '../src/xr/rhythmForge.js';
test('silence produces zero reactive energy and bass energy is frequency-focused',()=>{
 const zeros=new Uint8Array(512);
 assert.deepEqual(sampleSpectrum(zeros,48000,1024),{bass:0,level:0,energy:0});
 const bass=zeros.slice();bass[2]=200;bass[3]=170;
 const hi=zeros.slice();hi[100]=200;hi[101]=170;
 assert.ok(sampleSpectrum(bass,48000,1024).energy>sampleSpectrum(hi,48000,1024).energy);
 assert.equal(sampleSpectrum(bass,48000,1024,0).energy,0);
 assert.ok(sampleSpectrum(bass,48000,1024,2).energy<=1);
});
test('invalid, huge, non-audio local files fail before creating object URLs',()=>{
 assert.equal(checkLocalTrack({name:'my-song.mp3',type:'audio/mpeg',size:1024}).name,'my-song.mp3');
 for(const file of [{name:'fake.json',type:'audio/mpeg',size:1},
   {name:'song.mp3',type:'text/javascript',size:5},
   {name:'song.mp3',type:'audio/mpeg',size:RHYTHM_MAX_BYTES+1},
   {name:'song.mp3',type:'audio/mpeg',size:0}])
  assert.throws(()=>checkLocalTrack(file),/local audio/);
 assert.throws(()=>sampleSpectrum(new Uint8Array(10),48000,1024),/spectrum/);
});
test('local media bridge loads, plays with gesture, samples, pauses and revokes old URLs',async()=>{
 const events=[],revoked=[],listeners={};
 const media={paused:true,ended:false,src:'',addEventListener:(n,f)=>{listeners[n]=f;},
  pause(){this.paused=true;listeners.pause?.();},
  play(){this.paused=false;return Promise.resolve();},
  load(){},removeAttribute(k){if(k==='src')this.src='';}};
 class AudioContextFake{
  sampleRate=48000;
  createMediaElementSource(){return {connect(){}};}
  createAnalyser(){return {fftSize:1024,frequencyBinCount:512,smoothingTimeConstant:.66,
    connect(){},getByteFrequencyData(out){out.fill(0);out[2]=250;}};}
  resume(){return Promise.resolve();}
  close(){return Promise.resolve();}
 }
 const rhythm=createLocalRhythm({audio:media,AudioContextClass:AudioContextFake,
   createURL:f=>'blob:unit-test/'+f.name,revokeURL:x=>revoked.push(x),
   onChange:s=>events.push(s)});
 rhythm.load({name:'mine.wav',type:'audio/wav',size:12});
 assert.equal(rhythm.loaded,true);assert.equal(media.src,'blob:unit-test/mine.wav');
 await rhythm.play();assert.equal(rhythm.playing,true);
 assert.ok(rhythm.sample()>0);
 rhythm.setSensitivity(0);assert.equal(rhythm.sample(),rhythm.energy);
 rhythm.pause();assert.equal(rhythm.energy,0);
 rhythm.load({name:'next.mp3',type:'audio/mpeg',size:123});
 assert.deepEqual(revoked,['blob:unit-test/mine.wav']);
 rhythm.clear();assert.equal(rhythm.loaded,false);
 assert.equal(media.src,'');assert.equal(revoked.length,2);
 assert.ok(events.length>2);
});
