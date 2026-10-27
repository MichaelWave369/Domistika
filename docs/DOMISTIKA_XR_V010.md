# Domistika XR v0.1.0 · spatial sketch experiment

An **independent /xr.html route** inside the existing Domistika Three.js/Vite repository, without replacing the existing 2D studio.

## Scope implemented

- Desktop Three.js drawing on floating textured 1024×720 surfaces, orbit/zoom, and canvas move/rotate/scale.
- Up to 12 canvases, selection, duplicate/delete, gallery layout, per-board stroke undo/redo, transparent erasing.
- LocalStorage autosave, portable sanitized scene JSON import/export, and per-board PNG export.
- WebXR VR/MR entry with Three.js VRButton/ARButton, tracked controller ray selection, trigger-based drawing and manipulation, and an in-world tool deck for modes and colors.
- No paid APIs, remote assets, analytics, login, or privileged PhiOS/Quest OS access.

## Current limits and truth in advertising

- **Not tested on physical Quest 3 hardware.** CI/syntax checks are not proof that headset rendering, controller trigger events, hand tracking, or passthrough compositing work.
- Only floating 2D drawing planes in a 3D environment. True open-air 3D ribbon drawing comes later.
- Imported files must be this XR scene schema. Existing .domistika 2D projects are not yet bridged.
- Saves are local to each browser, neither encrypted nor synchronized. Export JSON for backup.
- No room anchors, raw Quest cameras, OS replacement, or native Quest installation.
- WebXR requires an appropriate secure context (HTTPS for the headset); LAN HTTP is not sufficient.

## Run locally

    npm install --no-audit --no-fund
    node --test tests/xr-*.test.mjs
    npm run build
    npm run dev

Desktop route: http://localhost:5173/xr.html
After a successful merge and GitHub Pages deployment: https://michaelwave369.github.io/Domistika/xr.html

## Desktop manual acceptance

1. Draw colored strokes, erase one, undo/redo, export transparent PNG.
2. Move, rotate and scale a canvas. Orbit around it.
3. Add, duplicate and delete canvases. Confirm selection and gallery work.
4. Reload and verify drawings/transforms. Export scene JSON and reimport.
5. Test invalid/oversized JSON and verify rejection without losing current artwork.
6. Verify both dist/index.html and dist/xr.html after production build.

## Quest 3 acceptance · NOT_TESTED

1. Open the deployed HTTPS route in Meta Quest Browser.
2. Enter immersive VR. Confirm rendered scene and visible controller ray.
3. Use controller trigger on in-world DRAW, paint and release.
4. Switch to MOVE, ROTATE, SCALE, then grab/resize a canvas.
5. Exit and re-enter XR; verify stored scene after reload.
6. Repeat in MR if supported; verify passthrough blending, without claiming spatial anchoring.
7. Record Quest software, browser version, controller model, each PASS/FAIL/NOT_TESTED outcome, and any errors.

## Next steps

True free-air spatial strokes, in-world undo/new board, smarter 2D Domistika interchange using its stable SDK, PhiOS-XR read-only launcher, Auralith audio-reactive artwork, and physical Quest controller input diagnosis.
