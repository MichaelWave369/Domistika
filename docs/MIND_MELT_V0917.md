# Domistika v0.9.17 — Mind Melt Pack

Mind Melt is a fast-control layer for Kinetic Composer. It does not replace or rewrite the v0.9.12–v0.9.16 motion stack; it drives those existing non-destructive runtimes through one-click performance controls.

## Slow Trails

`Slow Trails` combines the existing Slow Drift motion preset with a long-memory Ghost Trails configuration. It disables the kaleidoscope, sequencer, and orbit so the result is a deliberately slow temporal afterimage field.

Default quick values:

- trail memory: `0.92`
- new-frame mix: `0.48`
- base motion: `slow-drift`

## Kaleidoscope quick slices

Three quick buttons enable mirrored Kaleidoscope Lens rendering at:

- 8 slices
- 12 slices
- 16 slices

The buttons preserve the Composer renderer and simply update its slice state. A minimal lens spin is supplied when the current spin is effectively zero.

## Orbit quick paths

Three quick path buttons configure and engage Orbit Pivot:

- Circle — equal X/Y radius
- Ellipse — wide horizontal orbit
- Figure 8 — coupled sine motion through the existing Figure-8 path

Each quick path keeps the user’s current pivot as the orbit origin through the existing Composer orbit runtime.

## Quick WebM

The Mind Melt capture control provides a single visible record/stop button with 10, 12, 20, and 30 second duration choices.

- If Trails or Kaleidoscope are active, capture is delegated to Kinetic Composer so the WebM contains the visible composed output.
- If neither Composer post-effect is active, capture is delegated to the Kinetic Expansion recorder.
- Current artwork is refreshed through the v0.9.15 live-source guard before motion/capture starts.

## Black Stage

Black Stage is a visual artboard presentation mode that replaces the checker/transparent stage with a black void while leaving authored pixels untouched. It can be toggled independently from all motion features.

## MIND MELT button

The one-click `MIND MELT` combination engages:

- Hypnosis base motion
- Ghost Trails
- mirrored Kaleido 12
- Figure-8 Orbit Pivot
- Black Stage

The scene sequencer is left off so the combined look remains stable until the artist changes it.

## Reset contract

`Reset Mind Melt add-ons` turns off Trails, Kaleidoscope, Orbit, Sequencer, and Black Stage but intentionally preserves the underlying kinetic motion runtime. Authored Domistika paint layers are never rewritten by the Mind Melt layer.

## Runtime surface

`window.domistikaMindMeltV0917` exposes:

- `slowTrails()`
- `kaleidoQuick(slices)`
- `orbitQuick(mode)`
- `setBlackStage(enabled)`
- `startQuickRecord()`
- `stopQuickRecord()`
- `mindMelt()`
- `reset()`

Ready event: `domistika:mind-melt-ready`.
