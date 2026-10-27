# Domistika XR ↔ BPC Spatial Bridge · Framefield Mesh Preview v0.1

This is the first **actual read-only visual receiver** for a BPC handoff. It accepts an operator-selected \`bpc.spatial-preview.v1\` JSON **exported from the BPC Bridge Lab** with \`source.format: framefield.scene.v1\`. Domistika XR can show static polygon cages as shaded 3D objects on desktop or in immersive VR/MR.

## Do this

1. In FramefieldStudio, select your object and choose **Convert to Editable Mesh**. Save its native project JSON. Disable source modifiers or bake them in a future qualified workflow.
2. Open https://michaelwave369.github.io/BackyardProductionCompany/ and choose **Bridge Lab**. Load the Framefield JSON. Download the neutral BPC preview packet.
3. Open https://michaelwave369.github.io/Domistika/xr.html on desktop or Quest. Under **BPC 3D Preview** choose the BPC JSON. Preview meshes appear near the center of the workspace, sized to fit.
4. Clear preview to release GPU resources. Your original Domistika boards/strokes remain intact.

## Important behavior

- Preview is **ephemeral**, in-memory and **read-only**. No existing canvas is replaced, no localStorage mutation is performed by import and the imported meshes are not included in Domistika's \`domistika.xr.scene.v1\` save/export.
- First animation keyframe only. There is **no animation playback**, rigging, texture/material retention, evaluated modifiers, collision, printability or GLB output.
- Native Framefield primitive references and **active** source modifiers fail closed because they are not evaluated polygon cages. Convert and re-export from Framefield instead of pretending the geometry exists.
- Polygon faces must be valid, planar and convex; the importer triangulates for WebGL preview. Complex or invalid polygons are rejected with explanatory messages.
- A selected BPC packet is untrusted input. Source envelope is bounded to 5 MiB, 12 mesh objects, source cage ≤3500 vertices, ≤9000 triangles, position/unit preview envelope and strict finite numeric validation.
- The packet's \`sourceSha256\` is only a source byte identifier attached by BPC. The viewer neither verifies authorship nor grants editing, rendering, execution or publishing authority. All authority flags must be explicitly false.
- View placement is automatically centered and scaled for visibility. **This changes presentation only**, does not redefine the source object's dimensions or world units.

## Acceptance gates

Run \`node --test tests/xr-framefield-preview.test.mjs tests/xr-model.test.mjs tests/xr-integration.test.mjs\` and the existing Domistika CI/build. On a real headset, manually verify Enter VR, mesh visibility, no controller-selection of preview meshes, existing board drawing and save, Clear Preview, and re-import behavior. No simulator can prove Quest device success.

This implements only the **Framefield → BPC → Domistika XR read-only preview direction**. BPC's inventory should continue to label full editable/bidirectional interchange as **proposed**. Full scene persistence, animation, mesh edits, spatial strokes, 3D printing and walkable worlds require separate qualifications.
