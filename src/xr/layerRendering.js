import {canvasLayers,strokeLayerId} from './layerModel.js';

/**
 * Render layers bottom-to-top. Each layer is painted on a separate, reusable
 * temporary canvas, so destination-out erases ONLY its own layer. One scratch
 * canvas is reused instead of allocating a full bitmap for every layer.
 * Legacy boards without layer metadata use their original direct-render path.
 */
export function renderLayeredBoard(canvas,board,paintStroke,createScratch=()=>document.createElement('canvas')){
  if(!canvas||!board||typeof paintStroke!=='function')throw Error('Layer renderer requires canvas, board and painter.');
  const context=canvas.getContext('2d');
  const width=canvas.width,height=canvas.height;
  context.clearRect(0,0,width,height);
  if(!Array.isArray(board.layers)){
    for(const stroke of board.strokes)paintStroke(context,stroke);
    return;
  }
  const layers=canvasLayers(board);
  const grouped=new Map(layers.map(layer=>[layer.id,[]]));
  for(const stroke of board.strokes)grouped.get(strokeLayerId(stroke))?.push(stroke);
  const scratch=createScratch();
  if(scratch.width!==width)scratch.width=width;
  if(scratch.height!==height)scratch.height=height;
  const layerContext=scratch.getContext('2d');
  for(const layer of layers){
    if(!layer.visible)continue;
    layerContext.clearRect(0,0,width,height);
    for(const stroke of grouped.get(layer.id)||[])paintStroke(layerContext,stroke);
    context.drawImage(scratch,0,0);
  }
}
