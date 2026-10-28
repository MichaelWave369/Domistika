/** Show Forge v0.9: local, deterministic scene recipes and silent demo signal.
 * Recipes produce ordinary editable workshop objects; read-only sources stay untouched.
 */
import {createWorkshopObject,validateWorkshop,emptyWorkshop} from './workshopModel.js';
export const SHOW_PRESETS={
  "orbit-bloom":{name:"Orbit Bloom",count:13,description:"Kinetic halo of orbiting petals with a pulsing central core"},
  "neon-corridor":{name:"Neon Corridor",count:16,description:"Two rows of floating light pillars in a corridor"},
  "bass-cathedral":{name:"Bass Cathedral",count:15,description:"Bass columns with suspended high-frequency halos"}
};
const colors=["#68e4ff","#f972d1","#9a7dff","#ffe39a","#7df3bd"];
const modes=["pulse","bob","spin","orbit"],bands=["bass","mid","high","beat","full"];
function piece(kind,name,color,position,dimensions,motion,rotation=[0,0,0]){
  const o=createWorkshopObject(kind,color,position);
  o.name=name.slice(0,65);o.dimensions=dimensions;o.rotation=rotation;o.motion=motion;
  return o;
}
function motion(index,mode=null,band=null){
  return {mode:mode??modes[index%4],speed:[.5,.75,1,1.25][index%4],
    amplitude:[.25,.4,.35,.3][index%4],phase:(index%8)*Math.PI/4,
    band:band??bands[index%5]};
}
/** Detached editable meshes within authoring bounds. One atomic appendMany commit. */
export function buildShowPreset(preset,origin=[0,0,-5]){
  if(!Object.hasOwn(SHOW_PRESETS,preset))throw Error('Unknown Show Forge preset.');
  if(!Array.isArray(origin)||origin.length!==3||origin.some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>12))
    throw Error('Invalid Show Forge origin.');
  const at=(x,y,z)=>[origin[0]+x,origin[1]+y,origin[2]+z];
  const objects=[];
  if(preset==="orbit-bloom"){
    objects.push(piece("sphere","Bloom · core",colors[3],at(0,1.7,0),[.72,.72,.72],motion(0,"pulse","bass")));
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,r=i%2===0?1.65:2.15;
      objects.push(piece(i%3===0?"torus":"sphere","Bloom · petal "+(i+1),
        colors[i%5],at(r*Math.cos(a),1.65+.3*Math.sin(a*2),r*Math.sin(a)),
        [.42,.42,.42],motion(i,"orbit",bands[i%5]),[0,a,0]));
    }
  }
  if(preset==="neon-corridor"){
    for(let i=0;i<8;i++){
      const z=-2.6+i*.75;
      for(const side of [-1,1]){
        const idx=objects.length;
        objects.push(piece("cylinder","Corridor · light "+(idx+1),colors[idx%5],
          at(side*1.5,1.25,z),[.25,2.3,.25],motion(idx,"bob",bands[idx%5])));
      }
    }
  }
  if(preset==="bass-cathedral"){
    for(let i=0;i<10;i++){
      const a=i*2*Math.PI/10,r=2.25;
      objects.push(piece("cylinder","Cathedral · column "+(i+1),colors[i%5],
        at(r*Math.cos(a),1.15,r*Math.sin(a)),[.26,1.6+(i%3)*.38,.26],
        motion(i,"pulse",i%2?"bass":"beat")));
    }
    for(let i=0;i<5;i++){
      const a=i*2*Math.PI/5;
      objects.push(piece("torus","Cathedral · halo "+(i+1),colors[(i+2)%5],
        at(1.15*Math.cos(a),2.65,1.15*Math.sin(a)),[.68,.68,.68],
        motion(i+10,"spin",bands[i]),[Math.PI/2,0,a]));
    }
  }
  if(objects.length!==SHOW_PRESETS[preset].count)throw Error('Show Forge recipe count mismatch.');
  return validateWorkshop({schema:emptyWorkshop().schema,objects}).objects;
}
/** SILENT synthetic signal, deterministic and bounded. Never produces sound. */
export function sampleShowDemo(t){
  if(typeof t!=='number'||!Number.isFinite(t)||t<0)throw Error('Invalid demo clock.');
  const wave=(hz,phase=0)=>.5+.5*Math.sin(t*hz*2*Math.PI+phase);
  const bass=.18+.45*wave(.85,-Math.PI/2),mid=.13+.38*wave(.55,.35),
        high=.12+.32*wave(1.1,1.2);
  const phase=t*.85-Math.floor(t*.85),beat=.55*Math.exp(-phase*10);
  return {energy:Math.min(1,.14+.44*bass+.20*mid),bass,mid,high,beat};
}
