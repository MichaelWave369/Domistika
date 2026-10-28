/** Light Forge v0.8: bounded, gently smoothed emissive sculpture preview.
 * Material colors and workshop JSON stay authoritative and unchanged.
 * These are emissive materials, not dynamically shadow-casting point lights.
 */
import {selectObjectAudio,zeroAudioFrame} from './beatForge.js';
export const LIGHT_PALETTES={
  outrun:{full:'#ff4ead',bass:'#ff5980',mid:'#a66eff',high:'#35faff',beat:'#ffbd75'},
  aurora:{full:'#78ffe2',bass:'#37e0b5',mid:'#90d8ff',high:'#ab95ff',beat:'#fff1b2'},
  ember:{full:'#ffac67',bass:'#ff683e',mid:'#f3b857',high:'#f9da9b',beat:'#ffc19c'},
  ice:{full:'#9feaff',bass:'#69b4ff',mid:'#aae7ff',high:'#d9fcff',beat:'#e2eaff'}
};
export const LIGHT_MAX_GAIN=1.5;
export function validateLightSettings(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||
     !Object.hasOwn(LIGHT_PALETTES,input.palette)||
     typeof input.enabled!=='boolean'||
     typeof input.gain!=='number'||!Number.isFinite(input.gain)||
     input.gain<0||input.gain>LIGHT_MAX_GAIN)
    throw Error('Invalid Light Forge settings.');
  return {enabled:input.enabled,palette:input.palette,gain:input.gain};
}
export const defaultLightSettings=()=>({enabled:false,palette:'outrun',gain:.7});
/** Audio power stays in [0,1], luminous intensity stays <= 1.35.
 * A smoothing time constant of at least 140 ms avoids immediate full-frame flashes. */
export function lightSample(item,frame,settings,prior=0,deltaSeconds=0){
  const validated=validateLightSettings(settings);
  if(!item||typeof item!=='object')throw Error('Missing light object.');
  if(!Number.isFinite(prior)||prior<0||prior>1||
    !Number.isFinite(deltaSeconds)||deltaSeconds<0||deltaSeconds>1)
    throw Error('Invalid light sample timing.');
  const band=item.motion?.band??'full';
  const value=selectObjectAudio(frame??zeroAudioFrame(),band);
  const target=validated.enabled?value:0;
  // Smoothed attack and release, no strobe or exposure overshoot.
  const alpha=1-Math.exp(-Math.min(deltaSeconds,.1)/.14);
  const envelope=Math.min(1,Math.max(0,prior+(target-prior)*alpha));
  const intensity=Math.min(1.35,envelope*validated.gain*.9);
  return {envelope,intensity,color:LIGHT_PALETTES[validated.palette][band]};
}
