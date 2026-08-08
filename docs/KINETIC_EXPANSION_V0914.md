# Domistika v0.9.14 — Kinetic Expansion

Domistika v0.9.14 turns the v0.9.12 rotation preview into a broader kinetic-performance instrument while keeping authored paint layers non-destructive.

## Motion Region / selection spin

Use **Pick Motion Region** and drag a rectangle around any part of the artwork. Domistika snapshots the current visible composite into two temporary surfaces:

- a static background with the selected rectangle removed;
- a transparent selection layer containing only the chosen pixels.

The selected pixels can then rotate independently around the current kinetic pivot while the remainder of the artwork stays still.

## Mandala pivot and automatic centering

The Kinetic Expansion supports a free pivot instead of requiring the exact canvas center.

- **Find art center** scans visible alpha and computes an alpha-weighted centroid.
- **Center on region** snaps the pivot to the selected Motion Region.
- **Canvas center** restores the conventional center point.
- Pivot X/Y controls allow manual placement.

Radial-band clipping is calculated around the current pivot, so three-band motion follows the chosen visual center.

## Mirror Tunnel

Mirror Tunnel recursively redraws the current kinetic frame toward the pivot. Controls include:

- echo count;
- scale decay;
- rotation offset per echo;
- alpha decay.

The tunnel is applied after the base kinetic frame, which means it works with whole-art rotation, three-band rotation, Motion Region rotation, audio response, hue drift, pulse, and performance presets.

## Performance presets

v0.9.14 ships with six presets:

- **Slow Drift** — gentle gallery-style movement;
- **Portal 3·6·9** — 9 / -18 / 36 degree-per-second counter-rotation plus tunnel motion;
- **Chaos** — high angular velocities, contrast, pulse, and recursive echoes;
- **Hypnosis** — slower counter-rotation with a deep repeating tunnel;
- **Inversion Storm** — inverted high-energy counter-rotation and recursive echoes;
- **Bass Bloom** — a tunnel preset tuned for audio-reactive input.

## Audio Reactive

The companion `DomistikaKineticAudioV0914.js` module supports two local browser audio sources:

1. microphone input through `navigator.mediaDevices.getUserMedia`;
2. an audio file selected from the user's device.

The Web Audio API analyser measures three broad frequency bands. The kinetic renderer maps them to motion without permanently rewriting the user's base controls:

- bass adds pulse and outer-ring energy;
- mids influence middle-band motion;
- highs increase core motion and hue drift.

Spectrum smoothing, input gain, and overall kinetic audio sensitivity can be adjusted independently. Microphone audio is not uploaded by Domistika; analysis happens in the browser.

## Motion Recorder

The live kinetic render canvas can be captured with `HTMLCanvasElement.captureStream()` and `MediaRecorder`.

Controls include:

- 24, 30, or 60 fps;
- maximum recording duration;
- manual stop-and-export;
- WebM export;
- single-frame PNG export.

Recording captures the v0.9.14 kinetic render surface, including Motion Region animation, tunnel echoes, pulse, hue/filter effects, pivots, and audio-reactive movement.

## Non-destructive contract

The authored `.paint-layer` canvases are never rotated or rewritten by the kinetic runtime. While the expanded preview is visible, Domistika hides those paint canvases and displays a temporary performance canvas above the paper. Stopping Motion mode reveals the original artwork immediately.

## Runtime surfaces

The original runtime remains available as:

```js
window.domistikaKineticRotationV0912
```

The expansion is exposed as:

```js
window.domistikaKineticExpansionV0914
window.domistikaKineticRuntime
```

Audio controls are exposed as:

```js
window.domistikaKineticAudioV0914
```

Ready events:

```text
domistika:kinetic-expansion-ready
domistika:kinetic-audio-ready
```

## Validation

`npm run check` validates both v0.9.14 runtime files and `tests/v0914-static.mjs`. The production GitHub Actions workflow also runs a Vite build before deployment.
