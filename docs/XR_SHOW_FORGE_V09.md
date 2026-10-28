# Domistika XR · Show Forge v0.9

**Show Forge** introduces fully editable one-click stage installations and an **entirely silent** synthetic audio-reactive *visual preview*. It integrates existing Pattern Forge, Motion Forge, Beat Forge, Light Forge, and the Quest floating workshop deck. No remote services, microphone, audio playback, new runtime dependency or recording.

## Create an installation

1. Visit [Domistika XR](https://michaelwave369.github.io/Domistika/xr.html) in a browser or Quest 3. Under **Show Forge · Instant 3D Stage**, select one of:
   - **Orbit Bloom** (13 independent editable shapes): glowing flower-like halo of toruses/spheres around a pulsing core.
   - **Neon Corridor** (16 pieces): rhythmic parallel columns with per-piece floating motion.
   - **Bass Cathedral** (15 pieces): bass/beat-reactive columns and suspended torus halos.
2. Click **Add editable stage** or in the Quest floating workshop deck select **STAGE BLOOM** or **STAGE CORRIDOR**. Each installation is generated at approximately Z = -5m, in front of your default starting viewpoint, without deleting existing work. All objects use ordinary workshop materials, names, transforms, and distinct saved Motion Forge effect/band assignments.
3. **Undo Workshop removes the entire installation in one action**. If the installation would exceed existing editable workshop limits (48 objects, 6,000 mesh triangles or 2MB JSON), the operation is rejected atomically. Nothing partial is added, and existing work remains untouched.
4. Press **Start silent visual demo** or use **DEMO ON** on the Quest tool deck to test Beat Forge + Light Forge without a file. The demo computes a deterministic synthetic frame with bass, mids, highs and a *gentle* pulse, but **makes no audible music**. This is an animated visual test, not a song player, tempo detector, audio synth, beat grid, actual light source, or microphone input.
5. Press **Stop visual demo & reset** or **DEMO OFF** in VR. All workshop poses return to saved rest geometry. Light Forge returns to your previous enabled/disabled setting and palette. Backgrounding the tab, exiting XR or leaving the page also stops the demo.
6. For an actual soundtrack, **load and play your own local audio file in Rhythm Forge**; it takes precedence over silent demo mode, and the browser never uploads it. Existing local music, exact band-reactive effects, regular user-controlled animation and Light Forge are unaffected.
7. Save/export as before. Workshop JSON captures *the editable stage geometry and each object's motion/band*, not the demo time, signal, audio data, Light Forge preview settings or track. GLB exports a static rest-pose arrangement without visual glow.

## Source and data limits

- The demo signal is a deterministic procedural visualization, not a BPM estimate or test of actual Quest audio hardware. No Web Audio nodes or audio files are instantiated by it.
- Presets are static recipes that create new ordinary editable workshop objects. This is **not** a separate prefab schema, a linked live instance, scripted asset execution, or a source authority over Framefield BPC or OpenBlueprint CAD.
- The working format remains \`domistika.xr.workshop.v1\` with strict validation. Existing painting tools, canvases, CAD and BPC previews are not changed. Silent demo is transient in memory only, and is disabled on reload.
- Light reacts only in MeshStandardMaterial emissive terms. It does not illuminate the room physically, provide shadows or add postprocessing bloom. Smooth audio envelope bounds remain as in Light Forge v0.8.

## Acceptance and QA

\`\`\`sh
node --check src/xr/showForge.js
node --test tests/xr-show-forge-model.test.mjs tests/xr-show-forge-runtime.test.mjs tests/xr-show-forge-integration.test.mjs
npm run build
\`\`\`

Then run all previously enforced XR tests.

On a physical Quest 3, check install placement is not hidden behind UI panels, controller targeting on the third workshop menu page, 48-object performance with demo running, interactive editing after stop, visual comfort and audio-off silence, ability to switch to an uploaded track, stop/exit/background cleanup, one-step Undo, independent GLB/JSON export, and no mutation to source CAD/BPC. **Passing CI does not prove headset acceptance.**
