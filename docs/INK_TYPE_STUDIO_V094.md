# Domistika Ink + Type Studio v0.9.4

This upgrade gathers expressive drawing and lettering tools into one native inspector panel without replacing the existing brush, layer, geometry, gallery, or effects systems.

## Included

- 24 new presets across Calligraphy, Natural Media, Comic + Design, and Experimental sets.
- Pen dynamics for pressure response, minimum pressure, velocity taper, tilt boost, stabilizer, and live size.
- Handwriting-to-text capture from the active layer or flattened artwork using the browser's local `TextDetector` capability.
- Editable text controls with system-safe font stacks, size, weight, italics, tracking, line height, rotation, outline, opacity, placement, and canvas-based 3D extrusion.
- Eight active-layer morphs: Wave, Ripple, Twirl, Bulge/Pinch, Pixel Mosaic, Posterize, Chromatic Echo, and Halftone.
- Twelve stampable stencils including lettering guides, calligraphic ornaments, mandala, vine, frame, wave band, circuit sigil, and constellation.
- Project persistence for the new pen-dynamics settings.

## Handwriting capture boundary

Recognition is local and does not upload artwork. It uses `window.TextDetector` when the browser exposes that API. Browsers without it receive a clear fallback message and can still use the same panel by typing or pasting text manually. This keeps Domistika dependency-light and preserves its local-first posture.

## 3D text boundary

The 3D option is a rasterized extrusion rendered into the active 2D paint layer. It is designed for posters, logos, captions, and dimensional lettering. It is not a Three.js mesh editor in this release.

## Workflow

1. Open **Ink + Type** in the right inspector.
2. Pick a brush preset or tune Pen Dynamics.
3. For handwriting capture, write on a high-contrast layer and choose **Read active layer**.
4. Edit the recognized wording, preview it, then place it in 2D or 3D-extruded mode.
5. Apply morphs to the active layer or stamp reusable stencils.
6. Use Undo after any placement, morph, or stencil operation.
