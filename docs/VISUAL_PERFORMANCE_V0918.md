# Domistika v0.9.18 — Visual Performance Lab

v0.9.18 adds a non-destructive final performance-compositing layer above the existing Kinetic Rotation, Kinetic Expansion, Kinetic Composer, and Mind Melt runtimes.

## Particle Sparks

- Orbiting luminous particles are generated around the live kinetic pivot.
- Particle count, orbit speed, and spark size are adjustable.
- Particles are procedural preview elements only; they never alter authored paint layers.

## Color Breathing

- Slowly modulates hue, saturation, and brightness around the live kinetic output.
- Breath rate and hue swing are adjustable.
- Uses browser-native canvas filtering on the performance composite.

## Beat Glow / Flash

- When Domistika Audio Reactive is connected, low/mid/high spectrum energy drives a gentle brightness and saturation glow.
- Without audio, a bounded oscillator provides a fallback pulse.
- Photosensitivity guard: fallback rate is capped at 2 Hz, brightness lift is capped at 35%, and the effect is a smooth glow rather than a hard full-screen strobe.

## Fractal Echo

- Draws recursive scaled copies of the current live kinetic frame around the current pivot.
- Adjustable copy count, scale decay, and rotation step.
- A slow signed spin keeps the recursive field moving without modifying the underlying artwork.

## Built-in Visual Scenes

- Particle Portal
- Fractal Bloom
- Aurora Breath
- Cosmic Pulse

Each scene combines existing kinetic presets with v0.9.18 visual effects.

## Saved Performance Slots

Four local slots — A, B, C, and D — can store and restore a performance state. Slots include:

- base kinetic speeds, radii, pulse, and hue drift
- Kinetic Expansion source mode, pivot, Mirror Tunnel, sensitivity, and filter
- Composer trails, kaleidoscope, orbit, and sequencer state
- Black Stage state
- v0.9.18 particles, breathing, beat glow, and fractal settings

Slots are stored in browser `localStorage`; they do not upload artwork or settings anywhere.

## Performance Autoplay

Autoplay advances through either:

1. saved slots when one or more are present and “Use my saved slots” is enabled, or
2. the four built-in v0.9.18 visual scenes.

Scene duration is adjustable from 3 to 60 seconds. A manual Next Scene control is also provided.

## Final Performance Recording

`Record Final Performance` captures the v0.9.18 final compositor canvas through `HTMLCanvasElement.captureStream()` and `MediaRecorder`, so Particle Sparks, Color Breathing, Beat Glow, and Fractal Echo are included in the WebM output.

## Safety and preservation

- Authored paint canvases are never rewritten by v0.9.18.
- The performance canvas temporarily covers the live kinetic render only while one or more v0.9.18 effects are enabled.
- Reset v0.9.18 Effects removes the final visual layer while preserving the underlying kinetic/composer motion configuration.
- Beat Glow is deliberately bounded to avoid an unrestricted high-frequency strobe mode.
