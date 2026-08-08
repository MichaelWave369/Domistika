# Domistika v0.9.12 — Kinetic Rotation Lab

Kinetic Rotation turns a finished Domistika drawing into a live, non-destructive motion preview without modifying the authored paint layers.

## What shipped

- New **🌀 Motion** launcher and **Kinetic** inspector tab.
- Whole-artwork rotation mode.
- Three independently rotating radial bands: outer, middle, and core.
- Independent signed angular velocities from -180°/s to +180°/s.
- Adjustable core and middle radial boundaries.
- Optional pulse depth and pulse frequency controls.
- Optional hue drift during playback.
- Play, pause, stop, refresh-source, reverse, and reset controls.
- Random motion generator.
- **3·6·9 Portal** preset: 9°/s outer, -18°/s middle, 36°/s core, 3% pulse, 0.369 Hz pulse rate, and 6°/s hue drift.

## Non-destructive contract

The feature snapshots `CanvasEngine.compositeCanvas(false)` into a temporary motion stage. While Motion mode is visible, authored `.paint-layer` canvases are hidden with CSS only; their pixel data, ordering, visibility state, opacity, masks, and saved project representation are not changed.

Stopping Motion mode removes the temporary preview state and reveals the original artwork immediately.

Drawing input is disabled while the kinetic preview is visible so hidden authored layers cannot be changed accidentally.

## Rendering model

Three same-size temporary canvases are derived from the snapshot:

1. **Core** — circular clip from the center to the core radius.
2. **Middle** — annulus between the core and middle radii.
3. **Outer** — everything outside the middle radius to the rectangular canvas boundary.

The clipped canvases are rotated with compositor-friendly CSS transforms. The snapshot itself is not re-rasterized on every animation frame, keeping the loop substantially lighter than full-canvas frame-by-frame redraws.

## Runtime surface

The module exposes:

```js
window.domistikaKineticRotationV0912
```

with `play`, `pause`, `stop`, `reverse`, `resetAngles`, `refresh`, `portalPreset`, `show`, `state`, and `version`.

It dispatches:

```text
domistika:kinetic-ready
```

when the UI/runtime is installed.

## Validation

`npm run check` now includes syntax validation for `src/DomistikaKineticRotationV0912.js` and static integration checks in `tests/v0912-static.mjs`.
