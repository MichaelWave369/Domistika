# Domistika XR · Motion Forge v0.5

**Scope:** reversible visual animation for *editable* Domistika XR workshop objects. No change to source Framefield keyframe data, OpenBlueprint CAD projects, 2D canvases, or free-air painting. Fully local; no microphone permission, beat-detection claim, network API, or remote media.

## Build a living sculpture

1. In [Domistika XR](https://michaelwave369.github.io/Domistika/xr.html), add a cube, torus, sphere, cylinder, or a Pattern Forge ring.
2. Select a workshop object. Under **Motion Forge · Living Geometry**, choose **Spin**, **Bob**, **Orbit**, or **Pulse**.
3. Choose speed (0.1 to 3 cycles per second), amplitude (0 to 1.5 meters or dimensionless pulse influence), and phase (0° to 360°).
4. Click **Apply effect**. The motion effect is an ordinary undoable object property, saved in the workshop's local JSON.
5. Click **Play motion** to animate all objects that have motion assigned. **Stop & reset** always restores the immutable original saved positions, rotations and scale. Preview an exact moment with the scrub slider.
6. Enter Quest VR. In the two-column workshop deck, **MOTION FX** cycles the current selected workshop object's effect (None → Spin → Bob → Orbit → Pulse → None), **PLAY / STOP** previews and resets, **RESET MOTION** explicitly returns all geometry to rest.
7. Build a Pattern Forge ring from a motion-enabled object. Copies inherit their own identical motion settings; they can be edited independently after duplication.

### Motion semantics

- **Spin** rotates around the editable object's local Y axis.
- **Bob** moves the object vertically in world units using a bounded sine wave.
- **Orbit** adds circular XZ displacement around the saved rest position; it is not an astronomical or physics simulation.
- **Pulse** scales the rendered geometry uniformly using a reversible wave. Minimum scale multiplier ≥ 0.475 for the accepted amplitude range.
- **Phase offset** changes the waveform alignment. At time zero, **every mode matches the rest pose**.
- Preview clock is frame-rate independent, dt capped at 0.1 s to avoid huge jumps after device suspend. UI preview labels update at ~10 Hz rather than every rendered frame.
- Motion settings are **per object**, not a parent-child hierarchy and not an authored keyframe animation.
- No audio source is sampled or played. This is *procedural motion*, deliberately not yet advertised as live music-reactive visuals.

### Source boundaries and export

- Older v0.2/v0.3/v0.4 workshop JSON with no motion metadata still load. Existing \`domistika.xr.workshop.v1\` schema is unchanged; optional \`motion\` defaults to null.
- Exported **workshop JSON retains bounded effect settings** and canonical rest transforms. No frame sample or timeline execution state is stored.
- **GLB export uses canonical rest-pose transforms** regardless of whether preview is playing. It remains a static geometry export and does not bake an animation track or claim Framefield animation interchange.
- The read-only BPC animation preview, OpenBlue CAD preview, workshop measurement overlay, and spatial painting storage are untouched. The GLB still includes the existing visual copy of air-brush strokes.
- Selection / transform authoring stops playback first to prevent accidental edits to visual positions. Undo/redo and scene reload restore rest poses. The measurement ruler is hidden while moving objects and is not exported.
- Scene limits remain 48 objects, 6000 copied mesh triangles, 2 MB JSON, and existing strict transform bounds. Motion settings additionally validate modes, speed, amplitude and phase; invalid imports are rejected without partial replacement.

## Qualification

CI commands:

\`\`\`sh
node --check src/xr/motionForge.js
node --check src/xr/workshopRuntime.js
node --test tests/xr-motion-forge-model.test.mjs tests/xr-motion-forge-runtime.test.mjs tests/xr-motion-forge-integration.test.mjs
npm run build
\`\`\`

First Quest 3 device test: ensure the in-world motion controls are reachable, latency is comfortable, 48-object performance stays acceptable, preview resets after leaving VR or browser backgrounding, no original mesh jumps on selection, exported JSON restores effects, imported CAD/BPC sources remain read-only, and static GLB displays objects at rest. CI success alone does not prove device-level qualification.
