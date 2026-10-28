/**
 * Pattern Forge v0.4. All results are independent workshop objects, never live instances.
 * Both operations are pure with respect to the authoring object.
 */
import {duplicateObject} from './objectLab.js';
import {validateObject,snapPosition} from './workshopModel.js';

const checked=(v,min,max,label)=>{
  if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid '+label+' (expected '+min+'..'+max+').');
  return v;
};
function copiesOf(source,positions,rotations,snap){
  const original=validateObject(source);
  return positions.map((position,i)=>{
    const copy=duplicateObject(original,{offset:0,snap:0});
    copy.name=(original.name+' '+String(i+2)).slice(0,65);
    copy.position=snapPosition(position,snap);
    copy.rotation=rotations[i]||[...original.rotation];
    return validateObject(copy);
  });
}
export function linearPattern(source,{copies=3,axis='x',spacing=.7,snap=0}={}){
  checked(copies,1,12,'linear copy count');
  if(!Number.isInteger(copies))throw Error('Copies must be an integer.');
  if(!['x','y','z'].includes(axis))throw Error('Unknown pattern axis.');
  checked(spacing,.1,3,'linear spacing');
  checked(snap,0,1,'snap');
  const original=validateObject(source),k={x:0,y:1,z:2}[axis];
  const positions=Array.from({length:copies},(_,i)=>{
    const p=[...original.position];p[k]+=(i+1)*spacing;return p;
  });
  return copiesOf(original,positions,[],snap);
}
/**
 * Radial array: source is the first (rightmost, +X) member of an XZ circle.
 * The pivot is source.x - radius, source.z. No source object is moved.
 * 'copies' is the number of NEW independent pieces; source is preserved.
 */
export function radialPattern(source,{copies=5,radius=1.1,orient=true,snap=0}={}){
  checked(copies,2,12,'radial copy count');
  if(!Number.isInteger(copies))throw Error('Copies must be an integer.');
  checked(radius,.25,4,'radial radius');
  if(typeof orient!=='boolean')throw Error('Invalid radial orientation mode.');
  checked(snap,0,1,'snap');
  const original=validateObject(source),centerX=original.position[0]-radius;
  const positions=[],rotations=[];
  for(let i=1;i<=copies;i++){
    const a=(i*2*Math.PI)/(copies+1);
    positions.push([centerX+radius*Math.cos(a),original.position[1],original.position[2]+radius*Math.sin(a)]);
    rotations.push([original.rotation[0],original.rotation[1]+(orient?a:0),original.rotation[2]]);
  }
  return copiesOf(original,positions,rotations,snap);
}
export function alignObjectCenter(source,target,axis='x'){
  const a=validateObject(source),b=validateObject(target);
  if(a.id===b.id)throw Error('Choose a different reference object.');
  if(!['x','y','z','xz','xyz'].includes(axis))throw Error('Unsupported center alignment axis.');
  const indexes={x:[0],y:[1],z:[2],xz:[0,2],xyz:[0,1,2]}[axis];
  const position=[...a.position];
  for(const index of indexes)position[index]=b.position[index];
  return validateObject({...a,position});
}
