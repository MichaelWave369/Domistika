# Domistika XR · Painting Layers (Rung 6)

Domistika XR Canvas Studio now supports a bounded, independent **Painting Layers** system. This is an evolution of the existing local-first 2D scene, not a new project format.

## Desktop
1. Open Canvas Studio. The **Painting Layers** panel lists layers from top to bottom.
2. Choose **Add painting layer** to create a transparent layer above your legacy Background. At most eight layers per canvas are supported.
3. Click a layer's name to select it for new strokes. The selection stays with the board when you save and re-import scene JSON.
4. Click **◉ / ◌** to hide or show a layer. Hidden layers stay in the project and do not export visually.
5. Use **↑ / ↓** to change stacking order. Background is always the bottom layer.
6. **× Remove empty** only deletes an empty non-background layer. Any layer containing existing strokes is protected from deletion.
7. Painting on a hidden layer is blocked with a message. Eraser only affects the active layer.

## Quest 3 / Quest 3S
In Canvas Studio the compact **PAINT LAYERS** in-world panel is left of the easel-fit panel. Point and trigger to select:
- NEW LAYER
- PREVIOUS / NEXT LAYER
- SHOW / HIDE
- MOVE UP / MOVE DOWN
- REMOVE EMPTY

The status readout displays the active layer and visibility. Inputs use the existing controller ray and do not depend on hand-pinch gestures.

## Scene compatibility and rendering

The existing domistika.xr.scene.v1 schema remains. Original canvases, strokes, textured brush metadata, PNG export, local save, JSON import/export and Gallery behavior are preserved.

Layered canvases optionally include an ordered layers array and activeLayerId. Strokes on non-background layers optionally add layerId. Legacy strokes have no layerId and belong to the implicit bottom Background. Import validates eight-layer maximum, unique safe IDs, bounded names, booleans and valid stroke references.

The renderer replays each visible layer bottom-to-top into a **single reusable scratch canvas** and composites into the existing canvas texture. Thus destination-out erasing remains confined to its layer, preserving underlying artwork. Hidden layers remain editable after being shown again. Legacy canvases take their original direct-render fast path.

There is no cloud synchronization, separate giant texture per layer, unbounded stroke storage, or external editor dependency.

## Testing
- Automated: legacy scene roundtrip, layer ordering, visibility, cap enforcement, invalid references, deletion protection, isolated eraser rendering, desktop+Quest integration and production build.
- Physical Quest: check position and reach of new layer panel, select and move layers without accidentally painting, verify controller-trigger interactions.
- Visual: paint red on Background, blue on another layer, erase only blue; red must remain. Hide blue and restore. Save, reload, and export PNG to confirm the expected appearance.

Future rungs may add duplicate/merge/rename, masks, layer opacity, and real paint-physics simulation. They are intentionally not claimed here.
