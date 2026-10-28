# Domistika XR · Light Forge v0.8

**Light Forge** adds gently smoothed, optional *emissive material glow* to the local Beat Forge and Motion Forge audiovisual workshop. It also divides the growing Quest 3 **SPATIAL WORKSHOP** action wall into three manageable pages.

## How to play

1. Open [Domistika XR](https://michaelwave369.github.io/Domistika/xr.html) on desktop or Quest Browser. Create a sphere, torus, or a ring with Pattern Forge, then assign one or more editable objects a Motion Forge effect (Spin, Bob, Orbit, or Pulse) and an optional audio response band.
2. Pick a local track in Rhythm Forge and start **Play track + motion**. Light Forge will only show reactive color when that motion preview is active and a local audio signal exists.
3. Select **Light Forge · Ambient Sculpture Glow** in the sidebar. Choose **Outrun**, **Aurora**, **Ember**, or **Ice** palette, set gain between **0 and 1.5×**, and press **Enable reactive glow**. The chosen palette controls the glowing accents, not the source material color.
4. In Quest VR, the floating **SPATIAL WORKSHOP** deck is now smaller and organized into **three pages**. Point and trigger **NEXT PAGE** or **PREV PAGE** to browse tools, including the new **LIGHT ON/OFF** and **PALETTE** shortcuts on the performance page. Hidden pages cannot receive controller clicks.
5. Watch sculptural motion, smooth glowing band accents, and the existing three-band audio meters together. **Stop track + reset** restores object positions and clears glowing materials immediately. Light Forge remains armed until toggled off or the page reloads.
6. Export **workshop JSON** and **GLB** and verify the original object colors and source transforms are preserved. JSON retains authored Motion Forge settings but **not** glow palette/gain/enabled state or sound samples. GLB is a static rest-pose snapshot with no audio, animation, transient lighting, or material glow.

## What this is, and is not

- **Materials, not physical stage lights:** color is applied to each editable workshop object's Three.js MeshStandardMaterial \`emissive\` term. No actual PointLight/SpotLight, shadow maps, laser beams or room illumination; other scene surfaces aren't lit by the emissive object. No bloom postprocessing is claimed.
- **Audio bands:** each object takes the band already assigned by Beat Forge: Full, Bass, Mids, Highs or estimated Beat. The chosen Light Forge palette maps that band to a gentle accent color; a low-pass envelope with at least a 140 ms time constant smooths intensity changes. Maximum intensity is clamped at 1.35. This is not photosensitivity-tested lighting and still requires human comfort checks, especially in VR.
- **Opt-in:** light preview is disabled by default on page load; setting changes live in memory only. No new project schema, storage key, remote asset, media upload or microphone access is added. Original 2D canvases, 3D airbrush scenes, Framefield BPC motion and OpenBlueprint CAD preview remain independent and protected.
- **Export:** animation can run while JSON is exported without saving a frame. When GLB is exported, a cloned scene gets a **separate cloned material**, with emissive color set to black and emissive intensity zero. The live material is not changed by export. Existing visual airbrush export behavior remains.
- **Quest panel pagination:** 12 buttons maximum per page, two columns, with permanent Previous/Next page controls and a visible page counter. Off-page buttons are both invisible and assigned a camera/raycaster-excluded layer, so an invisible action cannot be triggered accidentally. All existing workshop tool actions stay available.
- **No audio persistence:** music remains the same locally loaded, temporary \`blob:\` URL from Rhythm Forge. No audio bytes or spectrum values are put in JSON or GLB.

## Test on Quest 3

Verify that: page navigation is reachable without controller collision; you can select a tool on each of all three pages; hidden tools are never hit-tested; the selected action stays active when switching pages; the new glow is comfortable at full gain; the visual pulse is not visually harsh or stroboscopic; colors match the chosen palette; turn-off, Stop, XR exit and tab backgrounding remove the glow; imported CAD/BPC sources remain untouched; snapshots/export don't accidentally bake light into GLB. The existing touch/gesture controls and Quest frame rate require **physical headset verification** even if GitHub CI passes.

## Regression gates

\`\`\`sh
node --check src/xr/lightForge.js
node --check src/xr/workshopDeck.js
node --check src/xr/workshopRuntime.js
node --check src/xr/main.js
node --test tests/xr-light-forge-model.test.mjs tests/xr-light-forge-runtime.test.mjs tests/xr-light-forge-integration.test.mjs
npm run build
\`\`\`

Followed by the existing XR workflows and normal Domistika validator. Real audio codec support and headset comfort remain outside the GitHub runner's automated coverage.
