/** Rhythm Forge v0.7: opt-in local spectrum analysis; no microphone or network. */
import {spectrumBands,createOnsetGate,zeroAudioFrame} from './beatForge.js';
export const RHYTHM_MAX_BYTES=50_000_000;
const TYPES=/\.(mp3|wav|ogg|oga|m4a|aac|flac|webm|opus)$/i;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function checkLocalTrack(file){
  if(!file||typeof file.name!=='string'||typeof file.size!=='number'
    ||!Number.isFinite(file.size)||file.size<=0||file.size>RHYTHM_MAX_BYTES
    ||!TYPES.test(file.name)||file.type&&!file.type.startsWith('audio/'))
    throw Error('Choose a local audio track (MP3, WAV, OGG, M4A, FLAC, WebM), up to 50 MB.');
  return {name:file.name.slice(0,120),size:file.size};
}
/** Compute a stable normalized bass and overall level from frequency-domain bytes.
 * Frequency ranges are approximate; this is not a BPM or beat-tracker claim. */
export function sampleSpectrum(bins,sampleRate,fftSize,sensitivity=1){
  if(!(bins instanceof Uint8Array)||bins.length!==fftSize/2||!Number.isInteger(fftSize)
    ||fftSize<256||fftSize>4096||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000
    ||!Number.isFinite(sensitivity)||sensitivity<0||sensitivity>2)
    throw Error('Invalid spectrum input or sensitivity.');
  let low=0,lows=0,all=0,n=0;
  const hz=sampleRate/fftSize;
  for(let i=1;i<bins.length;i++){
    const freq=i*hz;
    if(freq>5000)break;
    const v=bins[i]/255;
    all+=v*v;n++;
    if(freq>=35&&freq<=260){low+=v*v;lows++;}
  }
  const level=Math.sqrt(all/Math.max(1,n));
  const bass=Math.sqrt(low/Math.max(1,lows));
  // No signal means exactly zero; low-frequency weighting is intentional.
  const energy=clamp(Math.max(bass*1.2,level*.75)*sensitivity,0,1);
  return {bass:clamp(bass,0,1),level:clamp(level,0,1),energy};
}
export function createLocalRhythm({audio,AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,
    createURL=urlFile=>URL.createObjectURL(urlFile),revokeURL=url=>URL.revokeObjectURL(url),
    onChange=()=>{}}){
  if(!audio||typeof audio.play!=='function'||typeof audio.pause!=='function')
    throw Error('Local audio element is missing.');
  let objectUrl=null,trackName=null,context=null,analyser=null,bytes=null,smoothed=0,sensitivity=1;
  let frame=zeroAudioFrame();const onset=createOnsetGate();
  const emit=()=>onChange({loaded:!!trackName,trackName,playing:!audio.paused&&!audio.ended,
    sensitivity,energy:smoothed});
  const resetMeter=()=>{smoothed=0;frame=zeroAudioFrame();onset.reset();emit();};
  function disposeSource(){
    audio.pause();audio.removeAttribute('src');audio.load();
    if(objectUrl){revokeURL(objectUrl);objectUrl=null;}
    trackName=null;resetMeter();
  }
  function load(file){
    const safe=checkLocalTrack(file);
    const candidate=createURL(file); // Failure leaves old source unchanged.
    disposeSource();
    objectUrl=candidate;trackName=safe.name;
    audio.src=objectUrl;audio.load();emit();
    return safe;
  }
  function graph(){
    if(context)return;
    if(!AudioContextClass)throw Error('Web Audio is unsupported in this browser.');
    const next=new AudioContextClass();
    try{
      const source=next.createMediaElementSource(audio);
      const meter=next.createAnalyser();
      meter.fftSize=1024;meter.smoothingTimeConstant=.66;
      source.connect(meter);meter.connect(next.destination);
      context=next;analyser=meter;bytes=new Uint8Array(meter.frequencyBinCount);
    }catch(error){next.close?.();throw error;}
  }
  async function play(){
    if(!trackName)throw Error('Load a local track first.');
    graph();
    // Both calls start in the user's direct click or Quest trigger gesture.
    const resume=context.resume();
    const started=audio.play();
    try{await Promise.all([resume,started]);emit();return true;}
    catch(error){audio.pause();resetMeter();throw Error('Audio playback blocked: '+error.message);}
  }
  function pause(){audio.pause();resetMeter();}
  function clear(){disposeSource();}
  function setSensitivity(value){
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>2)
      throw Error('Sensitivity must be between 0 and 2.');
    sensitivity=value;emit();
  }
  function sampleFrame(){
    if(audio.paused||audio.ended||!analyser||!bytes){smoothed=0;frame=zeroAudioFrame();return {...frame};}
    analyser.getByteFrequencyData(bytes);
    const raw=spectrumBands(bytes,context.sampleRate,analyser.fftSize,sensitivity);
    // Retain the 0.6 smoothing behavior while exposing bounded independent channels.
    smoothed=smoothed*.6+raw.energy*.4;
    const now=Number.isFinite(audio.currentTime)?audio.currentTime:(context.currentTime||0);
    const beat=onset.detect(raw.bass,Math.max(0,now));
    frame={energy:smoothed,bass:raw.bass,mid:raw.mid,high:raw.high,beat};
    return {...frame};
  }
  function sample(){return sampleFrame().energy;}
  audio.addEventListener('ended',resetMeter);
  audio.addEventListener('pause',resetMeter);
  return {load,play,pause,clear,sample,sampleFrame,setSensitivity,get frame(){return {...frame};},get loaded(){return !!trackName;},
    get playing(){return !!trackName&&!audio.paused&&!audio.ended;},
    get name(){return trackName;},get sensitivity(){return sensitivity;},
    get energy(){return smoothed;}};
}
