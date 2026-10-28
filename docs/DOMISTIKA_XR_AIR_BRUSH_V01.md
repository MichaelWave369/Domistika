# Domistika XR · Air Brush Studio v0.1 (Open Brush-inspired)

A true **free-air 3D stroke mode** in the existing \`/Domistika/xr.html\` page, alongside the original floating 2D canvases, controller manipulation, and read-only BPC Framefield previews. This is an **independent original implementation**: it does not bundle Open Brush, import proprietary Tilt Brush brush assets, or claim full Open Brush feature parity.

## First headset playtest

1. After this PR is merged and GitHub Pages is green, open **https://michaelwave369.github.io/Domistika/xr.html** in the Meta Quest Browser.
2. Select **ENTER VR**. The left-floating **AIR BRUSH STUDIO** deck adds **PAINT IN 3D**, NEON, RIBBON, SPARK, MIRROR ON / OFF, UNDO 3D, and SAVE 3D. The right-floating original tool deck retains canvas tools, colors, and BPC playback.
3. Point either controller at **PAINT IN 3D** and press trigger to switch; choose a brush and color.
4. Hold a trigger and move the controller through the air. Release the trigger to finish one spatial stroke. The point is sampled ~12 cm forward of the controller origin.
5. Select **MIRROR** for subsequent mirrored strokes around the room's x=0 plane. Draw your Liquid / Digits motions.
6. After exiting VR, use the desktop-like controls at the bottom of the sidebar to **export spatial JSON** or **export a 3D GLB** that other programs can load.

There is a mouse preview: select Paint in 3D and drag on the stage. This draws points on a ray surface 2.4 m from the camera; full spatial depth needs tracked controllers.

## What persists

- 2D canvas project remains in \`domistika.xr.scene.v1\` with its unchanged original schema, limits, undo, PNG, and JSON tools.
- 3D strokes are saved independently to \`domistika.xr.spatial.v1\`. JSON v1 stores safe finite x/y/z points, hexadecimal color, brush width, style, and per-stroke mirroring.
- The renderer limits storage to **160 strokes**, at most **700 points per stroke**, and **2 MB per spatial backup**. Long strokes stop sampling at the per-stroke limit; release to start another.
- Undo and redo for free-air painting are independent of the existing 2D canvas undo.
- Imported spatial JSON is schema-validated *before* replacing the current 3D strokes. Clear All requires confirmation and does not affect 2D canvases.
- Browser-local saves are not synchronized across computers/headsets. Export JSON frequently. GLB is an interchange artifact; spatial JSON is the editable backup.

## Brush implementation

- **NEON:** lightweight color tube plus translucent additive outer glow.
- **RIBBON:** triangulated double-sided strip along the tracked path.
- **SPARK:** animated-motion-friendly additive glowing point trail, with no external textures.
- **MIRROR:** copies each stroke across the room-center plane.
- Three.js and the existing installed GLTFExporter build the GLB. No APIs, CDN, external fonts, accounts, or telemetry.

## Qualification checklist

- \`node --test tests/xr-brush-model.test.mjs tests/xr-brush-integration.test.mjs\`
- \`npm run build\`
- Verify existing XR suite, regular Domistika route, canvas drawing, BPC mesh playback, and 3D imports/exports.
- Quest 3 browser/hardware **NOT TESTED** by CI: verify two controllers, physical stroke depth, color/tool changes, menu hit-testing, sustained performance, VR exit/re-entry, downloads, GLB readability, and MR blend mode separately.
- For reliable comparison, record Quest firmware, browser build, controller model, approximate FPS, and result of each hardware acceptance test.

## Intentional v0.1 limits

No Open Brush \`.tilt\` import, audio-reactive brush engine, native Quest app, cloud sync, custom shader graph, room anchors, or 6-DoF tablet UI. GLB export contains completed strokes only. Physical headset acceptance is needed before calling this Quest-ready.
