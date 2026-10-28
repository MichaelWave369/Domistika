import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalRhythm} from '../src/xr/rhythmForge.js';
function fixture(){
 const listeners={};
 const media={paused:true,ended:false,currentTime:0,src:'',
  addEventListener(n,fn){listeners[n]=fn;},pause(){this.paused=true;listeners.pause?.();},
  play(){this.paused=false;return Promise.resolve();},load(){},removeAttribute(){this.src='';}};
 class AudioContextFake{
  sampleRate=48000;
  createMediaElementSource(){return {connect(){}};}
  createAnalyser(){return {fftSize:1024,frequencyBinCount:512,smoothingTimeConstant:.66,
    connect(){},getByteFrequencyData(bytes){bytes.fill(0);if(media.currentTime<.2)bytes[3]=230;else if(media.currentTime>.35)bytes[80]=200;}};}
  resume(){return Promise.resolve();}
  close(){return Promise.resolve();}
 }
 const instance=createLocalRhythm({audio:media,AudioContextClass:AudioContextFake,
  createURL:file=>'blob:local/'+file.name,revokeURL:()=>{}});
 instance.load({name:'my.wav',type:'audio/wav',size:100});
 return {instance,media};
}
test('live beat framing is guarded, band-specific and pauses to zero',async()=>{
 const {instance,media}=fixture();await instance.play();
 media.currentTime=.1;
 const a=instance.sampleFrame();
 assert.equal(a.beat,1);assert.ok(a.bass>0);assert.equal(a.high,0);
 media.currentTime=.22;
 const b=instance.sampleFrame();
 assert.ok(b.beat<1);
 media.currentTime=.5;
 const c=instance.sampleFrame();
 assert.ok(c.high>0);assert.equal(c.bass,0);
 instance.pause();
 assert.deepEqual(instance.sampleFrame(),{energy:0,bass:0,mid:0,high:0,beat:0});
 instance.clear();
 assert.equal(instance.loaded,false);
});
