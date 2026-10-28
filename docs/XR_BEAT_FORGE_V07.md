# Domistika XR · Beat Forge v0.7

**Goal:** extend local Rhythm Forge and Motion Forge so an editable workshop object reacts to a *chosen* part of a local audio spectrum rather than every object seeing one combined energy value.

## Headset and desktop acceptance

1. Open [Domistika XR](https://michaelwave369.github.io/Domistika/xr.html), create a torus and a Pattern Forge ring. Select different editable objects; assign each a **Pulse, Bob, Orbit, or Spin** effect using Motion Forge.
2. Choose an **audio response band** for each object in the Motion Forge sidebar: **Full energy** (original v0.6), **Bass** (approx. 35–260 Hz), **Mids** (260–2,000 Hz), **Highs** (2,000–8,000 Hz), or **Estimated bass attack pulse**.
3. In Rhythm Forge, choose an audio file already on your device and press **Play track + motion**. The existing full-energy meter now has **bass, mids, highs** meters and a **bass transient indicator**.
4. To change an individual object's band while inside Quest VR, select that object with the workshop's GRAB / MOVE gesture, release the trigger and then trigger **BAND FX** on the central tool deck. The band cycles Full → Bass → Mids → Highs → Beat → Full; the source pose remains unchanged.
5. When a bass transient is detected, objects assigned to the **Beat** channel receive a fast-decaying (roughly 240 ms) visual modulation; if a beat is not recognized, they still retain their ordinary procedural Motion Forge motion.
6. Stop playback, undo a band change, save and reload workshop JSON. Check that per-object band settings survive and old v0.6 JSON without a band still works. GLB continues to export *static rest-pose geometry*. Audio file data, beat events, and raw frequency samples are never stored.
7. Leave immersive VR or hide the tab: local audio playback pauses and the editable objects return to their original poses, as in v0.6. Confirm the Framefield animation preview and OpenBlueprint CAD design have not changed.

## Meaning and limits

- Frequency analysis is a browser-local Web Audio **AnalyserNode** using the already-installed audio bridge. Individual frequency bands use normalized RMS magnitudes and independently scaled amplitude. This is a simple visualization heuristic, **not a musical instrument classifier**.
- The **Beat** channel detects large positive bass-envelope changes against a slow local baseline, with a 180 ms refractory interval and a short decay. This is **not** a tempo estimator, DJ beat-grid, metronome, BPM detector, phrase/bar tracker, or guarantee that every kick/snare is recognized. Dense, quiet or bass-light music may give imperfect results.
- No microphones, device sound capture, permissions for audio recording, streaming, audio upload, external trackers, cloud analysis, audio storage, or new runtime dependencies.
- The existing opt-in local audio file selector and 50 MB per-file limit remain. The UI is entirely client-side and tied to a direct user gesture for playback; codecs vary by browser.
- \`domistika.xr.workshop.v1\` remains unchanged. Only the optional \`motion.band\` (one of full / bass / mid / high / beat) is added, defaulting to **full** when absent. An invalid value rejects the entire imported scene safely. Existing motion modes, bounds, undo/redo and protected source preview contracts remain.
- Per-frame audio analysis and transient state are temporary RAM-only objects. Meter DOM updates stay about 10 Hz to reduce headset overhead. Beat indicators use text and meters, **not rapid strobing lights**.
- Physical Quest controller reachability, audio decoding, speakers and headset frame-rate must be tested by the user. Passing GitHub CI is not headset qualification.

## Verification

\`\`\`sh
node --check src/xr/beatForge.js
node --check src/xr/rhythmForge.js
node --check src/xr/motionForge.js
node --test tests/xr-beat-forge-model.test.mjs tests/xr-beat-forge-audio.test.mjs tests/xr-beat-forge-runtime.test.mjs tests/xr-beat-forge-integration.test.mjs
npm run build
\`\`\`

Tests check band isolation, pulse refractory/decay, silent and malformed inputs, local browser lifecycle, old scalar audio compatibility, old JSON compatibility, undo and imported-scene failure isolation. All existing XR tests should remain green.

Future ideas, *not claimed in v0.7*: BPM detection, track envelopes saved offline, precise sync to audio latency, shader/color-reactive rendering, a musical timeline, native PhiBox export, and external live input sources.
