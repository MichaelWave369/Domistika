/** Object Lab operations are deterministic except for the newly allocated object ID. */
import {validateObject,snapPosition} from './workshopModel.js';
const newId=()=>('work-'+Math.random().toString(36).slice(2,10)+'-'+Date.now().toString(36));
const cleanCopy=x=>structuredClone(validateObject(x));
/**
 * Duplicate without mutating the source. Mirroring applies local geometry reflection
 * and mirrored WORLD pose across x=0; this is not an OpenBlueprint CAD modification.
 */
export function duplicateObject(original,{mirrorX=false,offset=.5,snap=.25}={}){
  const copy=cleanCopy(original);
  if(![true,false].includes(mirrorX))throw Error('Invalid mirror action.');
  if(!Number.isFinite(offset)||Math.abs(offset)>10||offset<0)throw Error('Invalid duplicate offset.');
  const n={...copy,id:newId(),name:(copy.name+(mirrorX?' mirror':' copy')).slice(0,65)};
  if(mirrorX){
    n.position=[-copy.position[0],copy.position[1],copy.position[2]];
    n.rotation=[-copy.rotation[0],copy.rotation[1],-copy.rotation[2]];
    n.mirroredX=!copy.mirroredX;
  }else{
    n.position=[copy.position[0]+offset,copy.position[1],copy.position[2]];
  }
  n.position=snapPosition(n.position,snap);
  return validateObject(n);
}
/** Distance between transform origins (not surface clearance or as-built measurement). */
export function measureObjectCenters(a,b){
  const aa=validateObject(a),bb=validateObject(b);
  const delta=bb.position.map((x,i)=>x-aa.position[i]);
  return {from:aa.id,to:bb.id,delta,distance:Math.hypot(...delta),unit:'m',basis:'object-centers'};
}
