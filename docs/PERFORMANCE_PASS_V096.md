# Domistika v0.9.6 — Performance Pass

Domistika v0.9.6 focuses on keeping expressive drawing responsive as canvases, brush complexity, layer count, and symmetry copy counts grow.

## Root causes repaired

- Paint layers were created with `willReadFrequently`, which can force software-backed Canvas2D rendering and make repeated brush writes substantially slower.
- Symmetry transform arrays and trigonometric closures were rebuilt for every pointer segment.
- The brush engine repeated profile merging, color parsing, gradient construction, grain work, and wet-paint sampling for every dab and every mirrored copy.
- Pointer events could arrive faster than the display could present high-copy symmetry strokes.
- Undo history synchronously PNG-encoded entire layers before large operations.
- Symmetry fill independently copied and scanned full-canvas pixel buffers for every mirrored seed.
- The editable Three.js text stage continued rendering while its inspector section was hidden.

## Performance architecture

### Accelerated paint layers

Existing and newly created paint canvases are promoted to write-optimized Canvas2D contexts. Pixel reads remain available for fill and color tools, but normal drawing no longer opts every layer into a read-heavy software path.

### Adaptive symmetry brush budget

- Symmetry transforms are cached until the mode or canvas dimensions change.
- High-copy drawing is paced to one committed pointer sample per animation frame.
- Brush work uses a total stamp budget shared across copies.
- Clean hard round brushes use a direct line path instead of hundreds of gradient stamps.
- Airbrush, splatter, and grain density scale adaptively at high symmetry counts.
- Wet mixing samples once per segment rather than once per dab.

The geometry and selected symmetry count remain unchanged. Adaptive budgeting only removes redundant sub-frame work that cannot be displayed.

### Fast undo history

Undo and redo store in-memory canvas snapshots rather than synchronously encoding and decoding PNG data URLs. History depth adjusts to canvas size to protect browser memory.

### Batched symmetry fill

All mirrored fill seeds share one source image, one destination image, reusable traversal buffers, and one final canvas commit. Seeds that land in the same connected region are skipped after the first traversal.

### Hidden-stage suspension

The editable 3D text stage stops updating controls and rendering WebGL frames whenever its panel or browser tab is hidden.

## Proving checklist

- Compare Off, Four-way, Radial 12, Radial 24/48, Flower of Life, and Golden Angle symmetry.
- Test technical ink, chisel calligraphy, charcoal, splatter, and airbrush presets at large sizes.
- Draw continuously for at least 30 seconds and confirm the stroke remains connected.
- Undo and redo large strokes and full-layer effects.
- Use symmetry fill where multiple seeds land in the same large region.
- Open and close the 3D Mesh panel while drawing and confirm hidden WebGL rendering does not affect input.
- Create, duplicate, restore, and import layers and confirm accelerated contexts remain active.
