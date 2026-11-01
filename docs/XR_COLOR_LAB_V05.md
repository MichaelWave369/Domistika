# Domistika XR | Color Laboratory (Rung 5)

Color Laboratory gives the Canvas Studio two-pigment mixing plus three additional flat-canvas brush treatments. Existing painting, workshop, MR and Gallery modes remain available.

## Desktop
1. Enter Canvas Studio. Open the Color Laboratory panel under the easel tools.
2. Select Pigment A and Pigment B using color inputs or choose a swatch target and click a named preset swatch.
3. Move the mix-ratio slider. 0% is all A; 100% is all B. Press Use mixed paint to load the result into the current brush.
4. Choose Solid, Dry Brush, Watercolor Wash or Marker. The selection affects **new** strokes only. Eraser uses the legacy destination-out behavior.
5. Save locally or export PNG / editable scene JSON. Undo and Redo work as before.

**Color accuracy:** The mixer uses an approximate red-yellow-blue artist-wheel model, not a calibrated spectral model of real paint. Yellow plus blue creates green; red plus blue creates purple. Wet paint physics, translucency and real chemical pigment properties are not simulated.

## Quest 3 / 3S
A small Color Lab deck appears beside the easel. Use controller rays to:
- Choose a pigment color from the original wooden palette, then select CAPTURE A.
- Choose another pigment, then select CAPTURE B.
- Tap MORE A or MORE B to change the mixing percentage in 10% steps.
- Select USE MIX to paint with the result.
- Select SOLID, DRY BRUSH, WATERCOLOR, or MARKER to change how future Canvas strokes render.

This uses the same controller-trigger paint input as earlier rungs. Neither physical pressure simulation nor hand-pinch tracking is implemented.

## Storage and security
The scene schema remains domistika.xr.scene.v1. Old strokes remain unchanged. New non-solid strokes contain an optional brush style: dry, wash or marker. Scene sanitization uses an allowlist, and all existing bounds for canvas count, stroke count and points per stroke remain enforced. Old scene JSON imports as before. No new downloads, fonts, remote services, or runtime dependencies are introduced.

The new brushes are deterministic procedural Canvas2D composites. Dry Brush uses dashed pigment, Watercolor Wash uses two soft translucent passes, and Marker is a translucent bold stroke.

## Field checks
1. Mix RGB red and blue, then yellow and blue; preview and painted result should match.
2. Paint all four styles, undo/redo, save, export PNG, then import JSON.
3. Load an old scene v1 file; solid strokes and eraser should render unchanged.
4. In Quest, capture A/B from swatches, change ratio and use the mixed paint.
5. Confirm the Quest Color Lab deck remains reachable and does not block artwork, tool decks or brush cursor.
6. Verify 3D airbrush and workshop remain unchanged, especially when switching rooms.

This rung does not yet include independent paint layers or a canvas-to-3D transform.
