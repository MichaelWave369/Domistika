/**
 * Canvas Layer Studio. Independent visual layers overlay the existing bounded
 * stroke list. 'base' is the implicit legacy layer; no project migration.
 */
export const BASE_LAYER_ID='base';
export const MAX_CANVAS_LAYERS=8;
export const BASE_LAYER=Object.freeze({id:'base',name:'Background',visible:true});
const ID=/^[a-z0-9][a-z0-9_-]{0,31}$/;
const MAX_NAME=40;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export function strokeLayerId(stroke){return stroke?.layerId??BASE_LAYER_ID;}
export function canvasLayers(board){
  return Array.isArray(board?.layers)&&board.layers.length?board.layers:[BASE_LAYER];
}
export function activeCanvasLayer(board){
  const layers=canvasLayers(board);
  return layers.find(layer=>layer.id===board?.activeLayerId)||layers[0];
}
export function sanitizeLayerConfig(board){
  if(!board||typeof board!=='object')throw Error('Invalid board layer configuration.');
  if(!own(board,'layers')){
    if(own(board,'activeLayerId')&&board.activeLayerId!==BASE_LAYER_ID)throw Error('Layer selection without layer definitions.');
    if(board.strokes.some(s=>own(s,'layerId')&&s.layerId!==BASE_LAYER_ID))throw Error('Unknown stroke layer.');
    return {};
  }
  if(!Array.isArray(board.layers)||!board.layers.length||board.layers.length>MAX_CANVAS_LAYERS)
    throw Error('Canvas requires 1–8 valid layers.');
  const ids=new Set(),cleaned=[];
  for(const layer of board.layers){
    if(!layer||typeof layer.id!=='string'||!ID.test(layer.id)||ids.has(layer.id))
      throw Error('Invalid or duplicate canvas layer ID.');
    if(typeof layer.name!=='string'||!layer.name.trim()||layer.name.trim().length>MAX_NAME)
      throw Error('Invalid canvas layer name.');
    if(typeof layer.visible!=='boolean')throw Error('Layer visibility must be a boolean.');
    ids.add(layer.id);
    cleaned.push({id:layer.id,name:layer.name.trim(),visible:layer.visible});
  }
  if(cleaned[0].id!==BASE_LAYER_ID)throw Error('Background layer must remain first.');
  if(board.strokes.some(s=>typeof strokeLayerId(s)!=='string'||!ids.has(strokeLayerId(s))))
    throw Error('Stroke references an unknown canvas layer.');
  if(own(board,'activeLayerId')&&!ids.has(board.activeLayerId))
    throw Error('Selected canvas layer does not exist.');
  return {layers:cleaned,activeLayerId:board.activeLayerId??BASE_LAYER_ID};
}
/** Pure editing operations. Calling code assigns the returned fields to board. */
export function editCanvasLayers(board,action,id){
  const layers=canvasLayers(board).map(layer=>({...layer}));
  let active=activeCanvasLayer(board).id;
  const index=layers.findIndex(layer=>layer.id===(id??active));
  if(action==='add'){
    if(layers.length>=MAX_CANVAS_LAYERS)throw Error('Eight canvas layers maximum.');
    let n=1;
    while(layers.some(layer=>layer.id==='layer-'+n))n++;
    active='layer-'+n;
    layers.push({id:active,name:'Layer '+n,visible:true});
  }else if(action==='select'){
    if(index<0)throw Error('Unknown canvas layer.');
    active=layers[index].id;
  }else if(action==='next'||action==='prev'){
    const current=layers.findIndex(layer=>layer.id===active);
    active=layers[Math.min(layers.length-1,Math.max(0,current+(action==='next'?1:-1)))].id;
  }else if(action==='toggle'){
    if(index<0)throw Error('Unknown canvas layer.');
    layers[index].visible=!layers[index].visible;
  }else if(action==='up'||action==='down'){
    if(index<0)throw Error('Unknown canvas layer.');
    const target=index+(action==='up'?1:-1);
    // Background is anchored at the bottom for predictable legacy playback.
    if(index>0&&target>0&&target<layers.length){
      [layers[index],layers[target]]=[layers[target],layers[index]];
    }
  }else if(action==='remove-empty'){
    if(index<=0)throw Error('The Background layer cannot be deleted.');
    if(board.strokes.some(s=>strokeLayerId(s)===layers[index].id))
      throw Error('Layer contains artwork. Only empty layers can be removed.');
    const [removed]=layers.splice(index,1);
    if(active===removed.id)active=layers[Math.max(0,index-1)].id;
  }else throw Error('Unknown layer operation.');
  return {layers,activeLayerId:active};
}
