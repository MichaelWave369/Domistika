# Domistika v0.9.16 — Kinetic Composer

Kinetic Composer extends the non-destructive Motion stack with a second-stage performance compositor. It does not rewrite authored paint layers. The existing v0.9.12–v0.9.15 motion runtime still produces the base animated frame; v0.9.16 can then add temporal trails, radial kaleidoscope optics, a moving kinetic pivot, and automatic preset sequencing.

## Add-ons

### Ghost Trails

Ghost Trails retains a decaying history of prior kinetic frames and blends the current frame into it.

Controls:

- **Motion afterimages** — enable/disable the temporal buffer
- **Trail memory** — how much of earlier frames survive
- **New-frame mix** — how strongly the newest kinetic frame is added
- **Clear trails** — immediately empties the temporal buffer

The buffer is transient and is never committed back to drawing layers.

### Kaleidoscope Lens

The Kaleidoscope Lens divides the current kinetic frame into radial wedges around the active kinetic pivot and redraws the artwork through each wedge.

Controls:

- radial lens enable
- 3–18 slices
- optional alternating mirror slices
- signed lens-spin speed

The lens follows the same pivot used by the kinetic renderer, so manual pivots, auto-centering, Motion Regions, and Orbit Pivot can all change the kaleidoscope center.

### Orbit Pivot

Orbit Pivot animates the kinetic center itself while the performance is playing.

Paths:

- **Ellipse orbit**
- **Figure 8**

Controls:

- X and Y travel radius
- orbit speed in Hz
- re-center action that saves the current kinetic pivot as the new orbit origin

Disabling Orbit Pivot returns the kinetic center to its saved origin.

### Scene Sequencer

Scene Sequencer automatically advances through existing Kinetic Expansion performance presets.

Built-in cycles:

- **Dream Cycle** — Slow Drift → Hypnosis → Portal
- **Energy Run** — Portal → Bass Bloom → Chaos
- **Storm Ride** — Hypnosis → Inversion Storm → Chaos → Portal
- **Meditation Loop** — slower repeating drift/hypnosis/portal sequence

The sequence can run in order or shuffle, and scene duration is adjustable from 2–60 seconds.

## Composer presets

- **Ghost Mandala** — deep trails plus a slow nine-slice mirrored lens
- **Orbit Bloom** — trails, six-slice lens, and an elliptical moving pivot
- **Infinite Dream** — trails, twelve-slice lens, Figure-8 pivot, and Dream Cycle sequencing
- **Calm Drift** — restrained trails over the existing Slow Drift performance preset

## Recording and still export

When Ghost Trails or Kaleidoscope Lens are active, Kinetic Composer intercepts the existing Motion recorder/export controls and captures the Composer canvas instead of the underlying base-motion canvas. WebM and PNG therefore represent the visible composed performance.

If no compositor effect is active, the established Kinetic Expansion recorder continues to handle export normally.

## Runtime surface

```js
window.domistikaKineticComposerV0916
```

Exposed methods include:

- `render()`
- `clearTrails()`
- `setOrbitEnabled(enabled)`
- `nextScene()`
- `composerPreset(name)`
- `startRecording()`
- `stopRecording()`
- `exportStill()`

## Non-destructive contract

Kinetic Composer reads from the live kinetic display canvas and keeps all additional state in temporary canvases and runtime objects. Stopping Motion restores the authored Domistika artwork exactly as before.
