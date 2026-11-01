# Domistika XR | Artist Easel, first playable rung

Artist Easel is a reversible presentation layer over the existing Domistika XR flat-canvas model. It does **not** rewrite scene v1, add another repository, or touch the separate spatial brush/workshop projects.

## Try it
1. Open the site's **Domistika XR** entry on desktop or a compatible WebXR headset.
2. Press **Enter Artist Easel** in the sidebar, or point at **ARTIST EASEL** on the floating XR tool deck and pull the controller trigger.
3. Paint on the selected white-backed canvas by clicking and dragging on desktop or holding the Quest controller trigger while pointing at the canvas.
4. In XR, select a colored pigment from the wooden palette. The tool deck still has eraser, drawing modes and preset swatches.
5. Use the existing **Undo**, **Redo**, **Save local**, **Export PNG**, and **Export scene** controls; 3D airbrush projects remain separate.
6. Leave the Artist Easel to restore the canvas's previous floating position, without undoing its strokes. Changing to move/rotate/scale mode automatically exits the easel.

## Intentional limits
- Easel, supports and palette are scene decorations, not editable or serialized objects. Painting strokes remain in the original bounded 2D sketch scene.
- Quest controller rays are supported by the current drawing engine. Hand-pinch painting, brush pressure, bristle simulation, multi-layer media and persistent real-room anchors are **not** claimed or implemented in this rung.
- The visible white paper is a non-destructive backing. PNG export retains the existing transparent-canvas behavior.
- Exports remain local. Browser storage may be unavailable or cleared: export scene JSON to back up editable strokes.
- Quest 3 / Quest 3S headset testing and physical comfort checks remain required before calling this production-ready.
