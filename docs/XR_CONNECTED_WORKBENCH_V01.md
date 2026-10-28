# Domistika XR · Connected Workbench v0.1

Integrates the real **FramefieldStudio** (Blender-like 3D model/animation authoring) and **OpenBlueprintStudio** (CAD/blueprint authoring) around **Domistika XR**. Each source app retains its own native editable project, local backups, and authority.

## FramefieldStudio → Domistika XR

Already exists: Framefield **Export BPC XR** creates a bounded local \`*.bpc-xr.json\` file. Domistika XR's existing **Load BPC mesh** reads it as a *read-only* 3D model and can play/scrub transform-keyframe animation. This PR adds an explicit launch link and groups the actual integration within **Connected 3D Workbench**.

Links:
- https://michaelwave369.github.io/FramefieldStudio/
- https://michaelwave369.github.io/Domistika/xr.html

**Important:** The Domistika VR paint **GLB export** is *not* automatically a Framefield-importable project. Framefield's guarded GLB importer accepts only a single static triangle primitive within 800 vertices / 1200 triangles, without transforms, shader textures or authored animations. Many painted multi-stroke GLBs exceed that contract. Do not claim a full reverse round-trip.

## OpenBlueprintStudio → Domistika XR

1. In https://michaelwave369.github.io/OpenBlueprintStudio/ create or open your plan.
2. Choose **Export JSON**. This saves a native \`*.openblueprint.json\` project with \`openblueprint.project/1\` schema.
3. In Domistika XR, open **Connected 3D Workbench → Load plan JSON** and select the saved file. Use **Show / hide CAD** on the sidebar or **SHOW / HIDE CAD** in the original right-side in-world VR tool deck.
4. The 3D preview appears **behind the drawing canvases**: walls are actual box meshes using source wall length, thickness and height, while door, window, outlet and network symbols are simplified colored 3D markers. 2D plan X/Y map onto 3D X/Z with vertical height in Y.
5. Remove the preview with **Clear CAD preview**. The original plan, 2D Domistika boards, air-brush strokes and Framefield BPC objects are untouched.

### Unit and accuracy boundaries

- Converts authored feet to meters using exactly 0.3048 m/ft, or retains meters.
- Displays plan width and depth in **source units**.
- Scales the scene visually to fit within about 3.8 m for comfortable VR viewing, if needed. A fit-to-view model is *not* a spatially anchored, room-scale, or measurement-accurate physical overlay.
- The preview does **not** cut out wall openings where door/window symbols occur. Symbols are markers, not fully modeled fittings. No architectural or safety certification.
- OpenBlueprint's own exporter remains the native CAD source; no source schema changes, resaving, back-writing, DXF or implicit inter-app commands.

### Security and performance

- Explicit local JSON file selection only. No CDNs, fetch, account login, telemetry, cross-origin storage access, or automatic remote transfer.
- Validates schema, IDs, units, dimensions, wall geometry and symbols *before* constructing any Three.js objects.
- Rejects files over 2 MB, more than 250 walls or 120 symbols. Avoids trying to render entire huge construction projects on Quest.
- Builds in a detached group; invalid imports do not erase the previously loaded preview.
- Imported OpenBlueprint geometry is **ephemeral read-only**, excluded from all Domistika scene storage/export, and disposed when cleared.

### Verification

\`\`\`sh
node --test tests/xr-openblue-model.test.mjs tests/xr-connected-workbench.test.mjs
node --test tests/xr-*.test.mjs
npm run build
\`\`\`

**Quest 3 is NOT_TESTED for this specific receiver until physically checked**: load a sample project, confirm walls and network markers, read source-unit dimensions, walk around, use in-world toggle, draw spatial strokes alongside the plan, confirm project data still exists after clearing, and verify Framefield BPC playback continues.

Next development targets: operator-authorized conversion of air-strokes into editable low-poly Framefield geometry, exact-scale CAD inspection mode with explicit coordinate calibration, and parametric geometry roundtrip that retains OpenBlueprint IDs and revision receipts. Those are proposals, *not present features*.
