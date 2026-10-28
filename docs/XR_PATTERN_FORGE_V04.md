# Domistika XR · Pattern Forge v0.4

**Stage:** merged-code qualification requires green Actions and physical Quest 3 playtesting. This is a local-first procedural layout layer on top of the independent editable workshop, not a replacement for Blender, FramefieldStudio or CAD.

## Play in Quest

1. Open https://michaelwave369.github.io/Domistika/xr.html and enter VR.
2. Locate the two-column SPATIAL WORKSHOP floating deck. Add a cube, cylinder, sphere or torus and select it by using Grab/Move or the editor object inventory.
3. Press **LINE +3** to append **three independent editable copies** along world +X at 0.75 m spacing.
4. Select any object and press **RING +5**. This adds **five independent editable copies** in an XZ circle (1.25 m radius), using the source as the circle's first member. The original never moves.
5. Press **TO FLOOR** to place the selected object's lowest *rendered geometry* point at Y=0. This is a visualization floor, not room anchoring.
6. Use Undo Workshop. Every repeat pattern is exactly **one undoable transaction**, even though it generates several meshes.
7. Save locally, export editable workshop JSON or export assembled GLB as before. Refresh and reopen the saved project.

## More control in desktop/sidebar

- **New copies** (2 to 8 from the UI, engine maximum 12), **line axis** X/Y/Z, **step** 0.1–3.0 meters, and **ring radius** 0.25–4.0 meters. A linear pattern preserves the source orientation; a radial ring rotates each copy to follow its angle around the circle.
- **Align selected to another object center** on X, Y, Z, XZ or XYZ axes. This changes the selected object only. Both objects must be editable workshop objects.
- **Place selected on grid floor (Y=0)** uses Three.js transformed world-space geometry bounds, including the current rotation and shape. It intentionally bypasses snap rounding on the Y axis so the bottom contacts Y=0 accurately.
- **No instancing claim:** created objects are independent meshes with independent transforms and identities. A subsequent edit to the source does not propagate to old copies.
- **No parametric CAD claim:** source OpenBlueprint walls and Framefield BPC animations remain read-only. When operators intentionally copy a preview mesh into the workshop, repetitions operate only on those new editable copies.

## Data and limits

- Retains the existing \`domistika.xr.workshop.v1\` format. No new stored pattern metadata or schema migration. All generated copies go through the existing strict object, triangle and JSON validators **before** any workshop mutation.
- The result and source together cannot exceed 48 editable objects, 6000 imported triangles, 2 MB JSON, or ±25 m world positions. A too-large radial or linear pattern is rejected **atomically** with no partial insertion and no new undo history.
- No new network access, execution permissions, remote assets or installed Quest app are added.
- Existing independent localStorage stores for spatial brush strokes and 2D canvases remain unchanged.
- Ruler overlays are still in-memory. Undo/redo and save/export use current workshop geometry only.

## Qualification gates

Run:
\`\`\`sh
node --check src/xr/patternForge.js
node --check src/xr/workshopRuntime.js
node --test tests/xr-pattern-forge-model.test.mjs tests/xr-pattern-forge-runtime.test.mjs tests/xr-pattern-forge-integration.test.mjs
npm run build
\`\`\`

Check in Quest: in-world menu reachability, gesture selection and transform after array generation, grid placement, true floor contact, radial orientation, one-step undo, current ruler with created copies, performance near 48 objects, local save/export/restore, and no changes to source CAD/BPC previews. Passing CI is not evidence of physical Quest acceptance.

Next candidates, not current features: structural grouping/parent-child transforms with durable IDs, parametric curve sweeps, surface snapping, animation timeline round-trip, beat-reactive geometric performance, and collaborative sessions.
