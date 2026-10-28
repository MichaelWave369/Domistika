# Domistika XR Spatial Workshop v0.3 · Object Lab & 3D Ruler

Object Lab extends the already-shipped v0.2 Spatial Workshop inside [Domistika XR](https://michaelwave369.github.io/Domistika/xr.html).

## What's new

- **Editable object inventory:** Select any of the 48 maximum workshop objects by name, not just by pointing with a controller.
- **Duplicate:** An independent, undoable copy of the selected object, placed +0.5 m on X (or one full grid step, whichever is larger). Copies preserve native dimensions, imported static triangle geometry, color, transform, and a *source label*, not source editing authority.
- **Mirror X:** An undoable independent mirrored copy across the **world plane X=0**. Reflects object position and orientation, and reflects the local object geometry with correct triangle winding / normals, without requiring negative stored scale. This remains a creative mesh-level operation, not a parametric CAD mirror.
- **Name and color:** Change the selected editable object, undoably. No source preview or Framefield/OpenBlue file is rewritten.
- **3D ruler:** Shows a floating line, endpoint dots and a readable distance label between **two editable object origins**. Displays metric delta X/Y/Z and the 3D distance. It is explicitly NOT a surface clearance, part dimension, measured room anchor, or as-built survey.
- **Quest VR tool deck:** Replaces the long vertical list with a two-column hit-testable controller panel. New **DUPLICATE**, **MIRROR X**, **MEASURE**, **DELETE** controls are available in the world, alongside existing shape creation and transform tools.
- **Measurement selection:** Choose two distinct objects in the sidebar and press **Measure centers**, or press **MEASURE** inside VR, trigger-select one object, then trigger-select a different object.

## First physical Quest test

1. Open Domistika XR and enter immersive VR in Quest 3.
2. Use central **SPATIAL WORKSHOP** to create a box and sphere; switch to **GRAB / MOVE** and place them.
3. Select a shape, choose **DUPLICATE**, grab the copy, then choose **MIRROR X**. Confirm the selected object's origin appears across the world X=0 plane, and that the original does not move.
4. Press **MEASURE** and trigger-select two different objects. Confirm the floating line and distance label are legible.
5. Use **DELETE**, **UNDO WORKSHOP**, object inventory, name and material color fields, and verify the measurement is cleared if one of its target objects is removed.
6. Export the assembly JSON; refresh the browser, restore it, and verify copies, mirrored geometry flag, source labels and object properties persist.
7. Export the assembly GLB and check the objects/paint are included. Measurement line is **not exported**.

## Contracts and limitations

- Existing \`domistika.xr.workshop.v1\` remains the format. Optional \`mirroredX\` defaults to false when importing old v0.2 JSON files, so legacy projects continue to load. Mirror geometry is recomputed at render/export, not stored as a second set of vertices.
- Object geometry still validates fixed limits (48 objects / 6,000 imported mesh triangles / 2 MB JSON). New copies fail closed if they exceed capacity or position bounds.
- No browser network calls, cloud round-trip, accounts, or silent edits of imported read-only Framefield or OpenBlueprint previews. Local storage, paint sketches and 2D canvas scenes remain independently managed.
- The ruler is an **ephemeral in-world visualization**: no \`measurement\` state is serialized to workshop JSON or included in assembly GLB. Measurements update after a committed transform and reset when either object is removed.
- Real headset comfort, controller targetability, text legibility, and mirrored triangle compatibility need independent manual qualification even if CI passes.

Not included: full grouping with parent-child persistence, booleans/CSG, procedural lofting, dimensional constraint solver, snapping directly to mesh surfaces, printability certification or certified BIM interchange.
