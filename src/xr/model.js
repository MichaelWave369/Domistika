/** Local-first, bounded Domistika XR sketch scene model. */
export const SCHEMA = 'domistika.xr.scene.v1';
export const MAX_BOARDS = 12;
export const MAX_STROKES = 600;
export const MAX_POINTS = 2500;
const validColor = /^#[0-9a-f]{6}$/i;
const finite = (v,d=0) => Number.isFinite(v) ? v : d;
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const vec = (v,def,lo,hi) => def.map((n,i) => clamp(finite(v?.[i],n),lo,hi));
export function makeBoard(index=0) {
  const n=Math.max(0,Math.floor(finite(index)));
  return {
    id:'board-'+Date.now().toString(36)+'-'+n+'-'+Math.random().toString(36).slice(2,7),
    name:'Canvas '+(n+1),
    position:[((n%3)-1)*1.65,1.5,-1.4-Math.floor(n/3)*.7],
    rotation:[0,0,0], scale:[1,1,1], strokes:[]
  };
}
export function makeScene() {
  const board=makeBoard(1);
  board.name='First strokes';
  board.position=[0,1.5,-1.35];
  return {schema:SCHEMA,selectedId:board.id,boards:[board]};
}
export function point(u,v) {return [clamp(finite(u),0,1),clamp(finite(v),0,1)];}
export function newStroke(color,width,eraser=false,uv=[.5,.5]) {
  return {color:validColor.test(color)?color.toLowerCase():'#68e4ff',width:clamp(finite(width,10),2,120),erase:!!eraser,points:[point(uv[0],uv[1])]};
}
export function extendStroke(stroke,uv) {
  if (!stroke||!Array.isArray(stroke.points)||stroke.points.length>=MAX_POINTS) return false;
  const next=point(uv[0],uv[1]), prev=stroke.points.at(-1);
  if (prev&&Math.hypot(prev[0]-next[0],prev[1]-next[1])<.0012) return false;
  stroke.points.push(next);return true;
}
export function sanitizeScene(input) {
  if (!input||input.schema!==SCHEMA||!Array.isArray(input.boards)) throw Error('Unsupported or invalid Domistika XR scene file.');
  if (!input.boards.length||input.boards.length>MAX_BOARDS) throw Error('Scene must contain 1–12 canvases.');
  const ids=new Set();
  const boards=input.boards.map((b,i)=>{
    if (!b||!Array.isArray(b.strokes)||b.strokes.length>MAX_STROKES) throw Error('Too many strokes or invalid canvas.');
    const id=String(b.id??'').slice(0,80);
    if (!id||ids.has(id)) throw Error('Invalid or duplicate canvas ID.');
    ids.add(id);
    const strokes=b.strokes.map(s=>{
      if (!s||!Array.isArray(s.points)||!s.points.length||s.points.length>MAX_POINTS) throw Error('Invalid stroke data.');
      return {color:validColor.test(s.color)?s.color.toLowerCase():'#68e4ff',width:clamp(finite(s.width,10),2,120),erase:!!s.erase,
        points:s.points.map(p=>{if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))throw Error('Invalid stroke coordinate.');return point(p[0],p[1]);})};
    });
    return {id,name:String(b.name||('Canvas '+(i+1))).slice(0,60),position:vec(b.position,[0,1.5,-1.35],-30,30),rotation:vec(b.rotation,[0,0,0],-Math.PI*8,Math.PI*8),scale:vec(b.scale,[1,1,1],.25,4),strokes};
  });
  return {schema:SCHEMA,selectedId:ids.has(input.selectedId)?input.selectedId:boards[0].id,boards};
}
export function readScene(json) {
  if (typeof json!=='string'||json.length>10_000_000) throw Error('Scene JSON exceeds 10 MB limit.');
  return sanitizeScene(JSON.parse(json));
}
export function writeScene(scene) {return JSON.stringify(sanitizeScene(scene));}
