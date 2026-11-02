# Domistika XR · The Living Canvas (Rung 7)

## Concept
**Lift your painting into 3D.** Create a lightweight, framed, double-sided art panel in the 3D Painting room based on the *already rendered* Canvas Studio image. The original painting, its layers, its saved pose, the v1 project format, and the brush engines remain untouched. This first rung is a reversible 3D **presentation** of flat artwork, not 3D depth reconstruction or a portal you can enter.

## Desktop
1. In Canvas Studio, select a finished painting and choose **Lift this painting into 3D**.
2. You automatically enter 3D Painting. The framed art is movable by **click-and-drag directly on the image**. Other space remains available for free-air 3D brush strokes.
3. Open **Living Canvas** in the 3D Painting sidebar to select among floating art pieces, rotate them, change scale and distance, or reset a piece to its default location.
4. **Return selected** removes only the floating preview. **Return all** clears every floating preview. Your original canvases and layers still exist and can be edited normally.
5. At most six panels may be lifted at one time, even if the original project has twelve canvases. Lifting the same source again focuses the existing preview.

## Quest 3
- In Canvas Studio the **LIFT TO 3D** button appears above the easel. Point and trigger to hand off the painting.
- In 3D Painting aim the controller ray at the artwork, **hold trigger to grab**, move your hand and release to place the preview.
- A separate **Living Canvas** in-world deck offers turn left/right, larger/smaller, nearer/farther, reset, next artwork, and put back.
- Grabbing a panel takes priority over beginning a 3D airbrush stroke. Clicking elsewhere still invokes the normal 3D drawing behavior. The normal room-change guard requires trigger release before leaving.

## Storage and safety
- **Session only:** the lifted panel's position is not stored or exported. Closing/reloading the page clears it. All source art is still saved through the existing local-first canvas project format.
- The panel shares the current CanvasTexture, giving a faithful view of the composited layers, including hidden layers and transparent brush treatments, with a neutral underlay. No source texture copying, extra offscreen canvas, remote assets, or cloud services.
- Importing another saved scene removes previews before old textures are disposed. Deleting an original board also returns its lifted preview.
- No lifted preview is a workshop editable object or part of 3D brush JSON/GLB export.
- Size, position and rotation are bounded to prevent extreme or invalid transforms. Frames and controls remain purely visual.
- The underlying source texture is **not disposed** when returning a panel.

## Acceptance test
1. Paint with layers in Canvas Studio, hide a layer, and lift the canvas. The 3D panel should reflect the currently visible composite.
2. Try desktop dragging, turning, scaling, and returning. Verify your original canvas location/strokes/layers and saved JSON did not change.
3. Lift a second piece and test selecting, returning one, and returning all.
4. On Quest, activate **LIFT TO 3D**, grab with either controller, move/release, and use the right-hand action deck.
5. Verify airbrush strokes outside a lifted panel continue to work, and no unintended painting happens when you grab art.
6. Load a different scene after previews are present and confirm the temporary old previews disappear safely.
7. Check that Gallery still shows original art and that existing workshop, VR and MR functions are untouched.

Quest comfort/alignment, controller reachability and real headset frame performance must be checked on device. Future rungs could optionally save placements, add shadow-box depth/parallax, or expose curated collections in Silicon Louvre.
