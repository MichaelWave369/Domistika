# BPC → Domistika XR: Framefield transform animation preview

This rung upgrades the existing **FramefieldStudio → BPC → Domistika XR** read-only polygon importer. It is **not** editable scene interchange.

## Workflow

1. In Framefield, convert selected primitives to editable polygon geometry and save your native JSON project.
2. In the BPC Studio Lot's Bridge Lab, load Framefield JSON and export \`bpc.spatial-preview.v1\` JSON.
3. Open Domistika XR, choose **Load BPC mesh**, and select the BPC preview file.
4. Use **Play preview**, **Pause preview** and the **Animation Frame** slider to inspect the transforms on desktop.
5. On Quest 3 after entering VR, the in-world **BPC ANIMATION** tool plays/pauses the same animation. The preview can be cleared any time. Existing XR drawing canvases are untouched.

## Format details

- BPC keyframe positions and scales are retained; radians arrive from BPC's original degree-to-radian conversion.
- Curves are retained per XYZ transform channel from the **outgoing** keyframe. Linear, hold, and four-control-point cubic Bezier interpolation matches Framefield \`scene.js\` sampling to the same numeric algorithm.
- Timing uses \`source.fps\` (12/24/30/60) and \`source.duration\` (12–600). Existing older packets without metadata use a marked conservative fallback of 24 FPS and the last keyframe/duration floor of 12.
- The animation loops at the source duration. Browser tab suspension, session changes and long gaps do not fast-forward; a user can pause and scrub independently.
- Pose changes are ephemeral Three.js transforms on the read-only meshes. Animation code never serializes to \`domistika.xr.scene.v1\` and cannot modify the original Framefield file.

## Explicit exclusions

No skeletal rigging, native geometry editing, mesh modifier evaluation/baking, audio sync, output video, GLB, printable meshes, collision physics, material/lighting replication, publishing, or verified device-level performance. Geometry remains subject to existing bounded preview limits. Camera fit is computed at initial pose, so widely moving objects can leave the original center frame; use OrbitControls / XR viewpoint rather than expecting dynamic camera tracking.

CI runs interpolation, malformed curve, timing backward-compatibility and XR UI wiring tests. **A real Quest 3 session is still necessary to verify controller playback and practical framerate.**
## Rotation parity correction

Framefield source in `src/mesh.js` applies object rotation in **X, then Y, then Z** order. Three.js Euler default `XYZ` does not apply those to a point in the same order when multiple axes are nonzero. The BPC read-only receiver now sets each imported mesh to Euler **`ZYX`** (matrix `Rz·Ry·Rx`), and keeps that order during keyframe playback. A deterministic test compares Three.js against Framefield's own per-axis transformation mathematics for simultaneous multi-axis rotation. This changes only BPC preview objects and **never** the rotation behavior of Domistika's own floating canvases or saved scene schema.
