import * as THREE from 'three';
import {canvasLayers,strokeLayerId} from './layerModel.js';
import {DEPTH_DEFAULT_GAP,normalizeDepthGap,layerDepths} from './depthForgeModel.js';

/**
 * Each visible editable canvas layer becomes a transparent 3D plane, with
 * per-layer erasing preserved. Planes reuse a bounded set of CanvasTextures.
 * Only paints on edits/mode change, never on the animation loop.
 *
 * The source canvas texture and scene-v1 data remain owned by Canvas Studio.
 */
export function createDepthForge({group,sourceCanvas,sourceArt,drawStroke}){
  if(!group?.add||!sourceCanvas?.getContext||!sourceArt||typeof drawStroke!=='function')
    throw Error('Depth Forge requires an art panel, source canvas and stroke painter.');
  const depthRoot=new THREE.Group();
  depthRoot.name='Depth Forge · reversible layer parallax';
  group.add(depthRoot);
  let enabled=false,gap=DEPTH_DEFAULT_GAP;
  let slots=new Map(),visibleCount=0,totalCount=1;
  // Hard-cap preview raster memory for Quest. The source keeps its full fidelity.
  const factor=Math.min(1,512/Math.max(sourceCanvas.width,sourceCanvas.height));
  const width=Math.max(1,Math.round(sourceCanvas.width*factor));
  const height=Math.max(1,Math.round(sourceCanvas.height*factor));
  function disposeSlots(){
    for(const slot of slots.values()){
      depthRoot.remove(slot.mesh);
      slot.mesh.geometry.dispose();
      slot.mesh.material.dispose();
      slot.texture.dispose();
    }
    slots.clear();
  }
  function rebuild(board){
    // Never allocate more than 8 textures, each only as large as the source.
    disposeSlots();
    const layers=canvasLayers(board),grouped=new Map(layers.map(l=>[l.id,[]]));
    for(const s of board.strokes||[])grouped.get(strokeLayerId(s))?.push(s);
    totalCount=layers.length;
    const visible=layers.filter(l=>l.visible);
    visibleCount=visible.length;
    const depths=layerDepths(visible.length,gap);
    for(const [i,layer] of visible.entries()){
      const canvas=document.createElement('canvas');
      canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d');
      ctx.clearRect(0,0,width,height);
      ctx.save();
      ctx.scale(width/sourceCanvas.width,height/sourceCanvas.height);
      for(const s of grouped.get(layer.id)||[])drawStroke(ctx,s);
      ctx.restore();
      const texture=new THREE.CanvasTexture(canvas);
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.needsUpdate=true;
      const mesh=new THREE.Mesh(
        new THREE.PlaneGeometry(1.6,1.125),
        new THREE.MeshBasicMaterial({
          map:texture,transparent:true,side:THREE.DoubleSide,
          depthWrite:false,alphaTest:0
        })
      );
      mesh.name='Painting depth layer: '+layer.name;
      mesh.position.z=depths[i];
      // Do not compete with the original flat painting for a grab ray.
      mesh.raycast=()=>{};
      mesh.renderOrder=10+i;
      depthRoot.add(mesh);
      slots.set(layer.id,{mesh,texture,canvas});
    }
    sourceArt.visible=!enabled;
    depthRoot.visible=enabled;
  }
  function setGap(value){
    gap=normalizeDepthGap(value);
    const depths=layerDepths(slots.size,gap);
    [...slots.values()].forEach((slot,i)=>{slot.mesh.position.z=depths[i];});
    return gap;
  }
  function setEnabled(value,board){
    if(value&&canvasLayers(board).length<2)
      throw Error('Add at least two painting layers in Canvas Studio to enable depth.');
    enabled=!!value;
    if(enabled)rebuild(board);
    else{depthRoot.visible=false;sourceArt.visible=true;disposeSlots();}
    return enabled;
  }
  function refresh(board){
    if(enabled)rebuild(board);
  }
  function dispose(){
    sourceArt.visible=true;
    disposeSlots();group.remove(depthRoot);
  }
  return {
    depthRoot,setEnabled,setGap,refresh,dispose,
    get enabled(){return enabled;},
    get gap(){return gap;},
    get layerCount(){return totalCount;},
    get visibleCount(){return visibleCount;},
    get planes(){return [...slots.values()].map(s=>s.mesh);}
  };
}
