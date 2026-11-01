import {normalizeBrush} from './colorLaboratory.js';

/**
 * Replays bounded Canvas2D strokes deterministically.
 * Legacy solid and eraser strokes keep the original rendering behavior.
 */
function strokePath(ctx,points,width,height){
  ctx.beginPath();
  if(points.length===1){
    const [u,v]=points[0];const x=u*width,y=v*height;
    ctx.moveTo(x+.001,y);ctx.arc(x,y,ctx.lineWidth/2,0,Math.PI*2);
    return true;
  }
  ctx.moveTo(points[0][0]*width,points[0][1]*height);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0]*width,points[i][1]*height);
  return false;
}
function drawPath(ctx,points,width,height){
  if(strokePath(ctx,points,width,height))ctx.fill();else ctx.stroke();
}
export function paintStroke(ctx,stroke,width,height){
  if(!ctx||!stroke||!Array.isArray(stroke.points)||!stroke.points.length)return;
  const brush=stroke.erase?'solid':normalizeBrush(stroke.brush);
  ctx.save();
  ctx.globalCompositeOperation=stroke.erase?'destination-out':'source-over';
  ctx.fillStyle=stroke.erase?'black':stroke.color;
  ctx.strokeStyle=ctx.fillStyle;
  ctx.lineWidth=stroke.width;
  ctx.lineCap='round';ctx.lineJoin='round';
  if(brush==='marker'){
    ctx.globalAlpha=.42;
    drawPath(ctx,stroke.points,width,height);
  }else if(brush==='wash'){
    ctx.globalAlpha=.09;ctx.lineWidth=stroke.width*1.75;
    drawPath(ctx,stroke.points,width,height);
    ctx.globalAlpha=.24;ctx.lineWidth=stroke.width;
    drawPath(ctx,stroke.points,width,height);
  }else if(brush==='dry'){
    // Fibrous dashed pigment; no randomness, textures or network assets.
    ctx.globalAlpha=.64;ctx.lineWidth=stroke.width*.68;
    ctx.setLineDash([Math.max(2,stroke.width*.65),Math.max(1,stroke.width*.24)]);
    drawPath(ctx,stroke.points,width,height);
    ctx.globalAlpha=.27;ctx.lineWidth=stroke.width*.28;
    ctx.setLineDash([Math.max(1,stroke.width*.3),Math.max(1,stroke.width*.42)]);
    ctx.lineDashOffset=stroke.width*.31;
    drawPath(ctx,stroke.points,width,height);
    ctx.setLineDash([]);
  }else drawPath(ctx,stroke.points,width,height);
  ctx.restore();
}
