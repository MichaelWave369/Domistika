/**
 * Operator-selected, READ-ONLY OpenBlueprint Studio blueprint receiver.
 * Supports the real openblueprint.project/1 portable project schema.
 * Preview geometry is a visualization, NOT a CAD editing/engineering authority.
 */
export const OPENBLUE_SCHEMA='openblueprint.project/1';
export const OPENBLUE_MAX_BYTES=2_000_000;
export const OPENBLUE_MAX_WALLS=250;
export const OPENBLUE_MAX_SYMBOLS=120;
const symbolTypes=new Set(['door','window','outlet','network']);
const finite=(v,field,min,max)=>{
  if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(field+' is outside supported preview bounds.');
  return v;
};
const position=(v,field)=>finite(v,field,-10000,10000);
export function parseOpenBluePreview(json){
  if(typeof json!=='string'||json.length>OPENBLUE_MAX_BYTES)throw Error('OpenBlue project exceeds 2 MB.');
  const source=JSON.parse(json);
  if(!source||source.schemaVersion!==OPENBLUE_SCHEMA)throw Error('Not an OpenBlueprint Studio project v1 file.');
  if(!source.metadata||!Array.isArray(source.walls)||!Array.isArray(source.symbols))throw Error('OpenBlue project is missing walls, symbols or metadata.');
  if(source.walls.length>OPENBLUE_MAX_WALLS||source.symbols.length>OPENBLUE_MAX_SYMBOLS)throw Error('Preview limit: 250 walls / 120 symbols. Simplify the design before import.');
  const units=source.metadata.units;
  if(!['ft','m'].includes(units))throw Error('OpenBlue unit must be ft or m.');
  const grid=finite(source.metadata.grid,'Grid',.01,100);
  if(typeof source.metadata.title!=='string')throw Error('Project title must be text.');
  const ids=new Set();
  function idOf(value){
    if(typeof value!=='string'||!value||value.length>120||ids.has(value))throw Error('Missing, duplicated or invalid element ID.');
    ids.add(value);return value;
  }
  const walls=source.walls.map((w,i)=>{
    if(!w||typeof w!=='object')throw Error('Invalid wall '+i);
    const wall={id:idOf(w.id),x1:position(w.x1,'Wall x1'),y1:position(w.y1,'Wall y1'),
      x2:position(w.x2,'Wall x2'),y2:position(w.y2,'Wall y2'),
      height:finite(w.height,'Wall height',.5,100),thickness:finite(w.thickness,'Wall thickness',.1,10)};
    if(Math.hypot(wall.x2-wall.x1,wall.y2-wall.y1)<.1)throw Error('Zero-length wall.');
    return wall;
  });
  const symbols=source.symbols.map((s,i)=>{
    if(!s||!symbolTypes.has(s.type))throw Error('Unsupported plan symbol '+i);
    return {id:idOf(s.id),type:s.type,x:position(s.x,'Symbol x'),y:position(s.y,'Symbol y'),
      rotation:finite(s.rotation??0,'Symbol rotation',-36000,36000)};
  });
  const xs=[...walls.flatMap(w=>[w.x1,w.x2]),...symbols.map(s=>s.x)];
  const ys=[...walls.flatMap(w=>[w.y1,w.y2]),...symbols.map(s=>s.y)];
  const bbox=xs.length?
    {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}:
    {minX:0,maxX:0,minY:0,maxY:0};
  return {schema:OPENBLUE_SCHEMA,title:source.metadata.title.slice(0,160),units,grid,walls,symbols,bounds:bbox,
    metersPerUnit:units==='ft'?.3048:1};
}
export function summarizeOpenBlue(preview){
  const {minX,maxX,minY,maxY}=preview.bounds;
  return {walls:preview.walls.length,symbols:preview.symbols.length,units:preview.units,
    width:+(maxX-minX).toFixed(2),depth:+(maxY-minY).toFixed(2),title:preview.title};
}
