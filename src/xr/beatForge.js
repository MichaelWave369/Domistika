/** Beat Forge v0.7: opt-in local, approximate band envelopes and transient pulses.
 * No claim of BPM, tempo locking or music onset accuracy. No audio persistence.
 */
export const AUDIO_BANDS=['full','bass','mid','high','beat'];
const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v));
export const zeroAudioFrame=()=>({energy:0,bass:0,mid:0,high:0,beat:0});
export function spectrumBands(bins,sampleRate,fftSize,sensitivity=1){
  if(!(bins instanceof Uint8Array)||!Number.isInteger(fftSize)||fftSize<256||fftSize>4096||
      bins.length!==fftSize/2||!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>192000||
      !Number.isFinite(sensitivity)||sensitivity<0||sensitivity>2)
    throw Error('Invalid multiband spectrum input.');
  const ranges=[[35,260],[260,2000],[2000,8000]];
  const sums=[0,0,0],counts=[0,0,0];
  let weighted=0,weightCount=0;
  for(let i=1;i<bins.length;i++){
    const frequency=i*sampleRate/fftSize;
    if(frequency>8000)break;
    const v=bins[i]/255, power=v*v;
    for(let k=0;k<3;k++)if(frequency>=ranges[k][0]&&frequency<ranges[k][1]){
      sums[k]+=power;counts[k]++;
    }
    if(frequency<=5000){weighted+=power;weightCount++;}
  }
  const [bass,mid,high]=sums.map((sum,i)=>Math.sqrt(sum/Math.max(1,counts[i])));
  const general=Math.sqrt(weighted/Math.max(1,weightCount));
  return {energy:clamp(Math.max(1.2*bass,.75*general)*sensitivity),
    bass:clamp(1.2*bass*sensitivity),mid:clamp(1.25*mid*sensitivity),
    high:clamp(1.3*high*sensitivity),beat:0};
}
/** A guarded bass transient detector: compares attack against a slow mean and
 * applies a 180ms refractory interval. A short glow envelope decays after hits.
 */
export function createOnsetGate(){
  let previous=0,baseline=0,lastBeat=-Infinity,lastTime=null;
  function reset(){previous=0;baseline=0;lastBeat=-Infinity;lastTime=null;}
  function detect(bass,timeSeconds){
    if(!Number.isFinite(bass)||bass<0||bass>1||!Number.isFinite(timeSeconds)||timeSeconds<0)
      throw Error('Invalid beat-gate input.');
    if(lastTime!==null&&timeSeconds<lastTime){reset();}
    const rise=bass-previous;
    const threshold=Math.max(.11,baseline*.42);
    const isOnset=bass>.17&&rise>threshold&&(timeSeconds-lastBeat)>=.18;
    if(isOnset)lastBeat=timeSeconds;
    previous=bass;
    baseline=baseline*.95+bass*.05;
    lastTime=timeSeconds;
    const age=timeSeconds-lastBeat;
    return isOnset?1:(age>=0&&age<.24?clamp(1-age/.24):0);
  }
  return {detect,reset};
}
export function selectObjectAudio(frame,band='full'){
  if(!AUDIO_BANDS.includes(band))throw Error('Unknown audio band.');
  if(typeof frame==='number'){
    if(!Number.isFinite(frame)||frame<0||frame>1)throw Error('Invalid audio-reactive energy.');
    return band==='full'?frame:0;
  }
  if(!frame||typeof frame!=='object')throw Error('Invalid audio frame.');
  const channel=band==='full'?'energy':band;
  const value=frame[channel];
  if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1)
    throw Error('Invalid audio-reactive energy.');
  return value;
}
