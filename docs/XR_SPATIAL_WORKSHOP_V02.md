# Domistika XR Spatial Workshop v0.2 · first playable assembly

This adds a **separate editable 3D assembly** to the already deployed Domistika XR / Open Brush-style airbrush / FramefieldStudio / OpenBlueprintStudio workbench.

## Quest 3 first playtest

1. Open https://michaelwave369.github.io/Domistika/xr.html in Meta Quest Browser and select **ENTER VR**.
2. Find the **SPATIAL WORKSHOP** floating menu near the center, farther back than the left airbrush / right canvas decks.
3. Point at **ADD CUBE** (or sphere, cylinder, torus). A new editable object appears near your controller.
4. Select **GRAB / MOVE**, point at the object and press the trigger. Move your controller to reposition it, then release; the object snaps to the configured grid.
5. Change to **ROTATE**, trigger-select and twist the controller; release to snap rotation. Change to **SCALE**, trigger-select and move your controller vertically. The currently selected object has a yellow selection box.
6. In the desktop/sidebar controls choose snap increments **off / 0.10 / 0.25 / 0.50 / 1.00 m**, or in VR use the **SNAP GRID** button to cycle. Rotation snap increments **free / 15° / 45° / 90°** are configured in the sidebar.
7. Select a workshop object and edit numerical **X/Y/Z meters**, **uniform scale**, or primitive **width/height/depth meters**, then **Apply exact values**. A workshop action creates an independent undo record.
8. Use **Save assembly**, **Export assembly JSON** or **Export scene GLB**. GLB includes editable workshop geometry *and a visual copy of any current air-brush strokes*. JSON keeps editable workshop object identity and transform values; air-brush strokes retain their own separate local backup.

### Converting imported objects to editable copies

Framefield:
- Export a BPC XR file from FramefieldStudio, **Load BPC mesh** in Domistika XR.
- Choose a source mesh in **Make editable copy of Framefield model**, click **Copy selected mesh**, and approve the copy.
- The editable workshop contains a *static snapshot* of the BPC mesh at the current preview pose, with a source label. The original **BPC playback and preview remain read-only** and untouched. The copied snapshot does *not* retain keyframes, modifiers, materials/shaders or hidden geometry. Large/mirrored/extreme meshes fail closed if they cannot fit the workshop's conservative limits.

OpenBlue:
- Export an **OpenBlueprint native project JSON** and load it in the existing CAD preview.
- Choose an authored wall in **Make editable copy of CAD wall**, click **Copy selected wall**, and approve.
- The resulting box is a **visual copy**, in the current *fitted preview coordinates*, not a parametric CAD wall. OpenBlue remains the source of truth for dimensions, IDs, openings, and engineering decisions. Confirm any source values in OpenBlue rather than measuring this artistic copy.

## Stable contracts / protected data

| Store | Contents |
|---|---|
| \`domistika.xr.scene.v1\` | Existing 2D floating canvases |
| \`domistika.xr.spatial.v1\` | Original free-air painted strokes |
| \`domistika.xr.workshop.v1\` | New editable primitive and bounded mesh assembly |
| In-memory BPC/CAD | Read-only source previews, never included in assembly export |

Each editor retains its own independent backing files, with no silent writes to other app storage, no network calls, no remote fonts/assets/analytics, and no claims to privileged Quest OS controls.

Limits: 48 editable objects, at most 6,000 imported mesh triangles overall, 2 MB JSON, positions ±25 meters, positive scale 0.1–8, separate bounded imported shape geometry. Invalid JSON or transforms are rejected without replacing the existing scene. Existing physical Quest 3 testing of prior VR painting does **not** qualify this new workshop interaction automatically.

## Acceptance / CI

- \`node --check src/xr/workshopRuntime.js && node --check src/xr/workshopModel.js\`
- \`node --test tests/xr-workshop-model.test.mjs tests/xr-workshop-integration.test.mjs\`
- Existing entire \`tests/xr-*.test.mjs\` suite and \`npm run build\`.
- On headset: both controllers, moving/rotating/scaling, snap, creation from in-world deck, exporting/importing identical geometry, undo/redo, combined GLB visibility, original spatial-stroke persistence, BPC animation preservation, OpenBlue visual preservation, and invalid file recovery.

**Not included yet:** full mesh vertex/face editing, CAD parametric constraints, snapping to arbitrary imported surfaces, 3D-print manifold repair, multiplayer, exact room anchoring, and Open Brush \`.tilt\` import.
