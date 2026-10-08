# Dimensional Weave v1 (Domistika 0.9.42 capability)

Dimensional Weave adds 2.5D geometry to the existing raster studio. A single
user-authored closed face becomes shaded front and side faces, then optionally
repeats radially. The tool **does not infer vectors or trace edges from a
raster layer**. Its vertices are placed explicitly by a human or agent. Genuine
mesh extrusion and edge detection are follow-up work for Phiform.

## Use it

1. Open **◇ Weave** in the control deck (or scroll down in Layers).
2. Choose **Start / New face** and click at least 3 polygon vertices in the
   canvas. One closed polygon is the seed for all the radial copies.
3. Adjust **Radial repeats** (defaults to 28), **Weave depth**, light /
   extrusion angle, face color, highlight color, optional **Face builder**,
   and optional **Escher / impossible depth**. The canvas preview is temporary.
4. Choose **Render new layer**. It creates a new paint-role layer containing
   real rasterized 2.5D geometry, with editable normalized anchor metadata in
   its semantic overlays. The original source pixels and layer are untouched.
5. To change a prior version, select its layer and click **Load selected
   weave**. Change points/settings and render a **new** version. Hide/delete
   earlier versions with the normal layer controls. It intentionally never
   silently overwrites an earlier layer.
6. **Animate rings** delegates to the installed non-destructive Kinetic
   Rotation. **Send to Auralith** delegates to the existing v2 bridge.
   Neither button adds a pretend 3D renderer or a new cross-app protocol.

Click **Pause capture** when you want ordinary painting restored. **Undo point**
only removes a not-yet-committed anchor. **Clear points** discards only the
temporary polygon. Source and committed layer pixels are not affected.

## Bounds, safety and provenance

- 3 to 24 explicit anchors per face, each normalized 0..1; 1..32 radial
  repeats and 0..160 pixels of extrusion depth.
- Zero-area, crossed, duplicated, off-canvas and non-finite polygons are
  refused *before creating a result layer*.
- Result metadata: kind=dimensional-weave, schema=domistika.dimensional-weave.v1,
  version=1.0.0, original normalized anchor coordinates, validated settings,
  and sourceLayerId. The normal project save/restore persists both the raster
  content and this metadata.
- Temporary capture is disallowed during Sector Surgery. The generated layer
  uses role=paint and motionPolicy=animate so export/compositing and Kinetic
  Rotation remain on the existing governed path.
- Existing lines in other layers are not sampled, changed, vectorized, or
  overwritten. Geometry generation is deterministic for its options and size.
- **Impossible depth** alternates the projection of side vertices. It is an
  optical-art treatment, not a physically coherent 3D mesh.
- Ordinary canvas undo does not undo *layer creation*. Delete/hide the new
  layer to reverse a render. Individual renderings remain separately editable
  by loading their metadata and making a new version.

## Agent entry point

When the studio is ready, \`window.domistikaDimensionalWeaveV1\` supports:

- \`start()\`, \`stop()\`, \`clear()\`, \`undoAnchor()\`
- \`addAnchor({x,y})\`, normalized coordinate space
- \`options({ copies, depth, direction, fill, impossible, color, edge })\`
- \`state()\`, \`loadSelected()\`, \`commit()\`
- \`animate()\`, \`auralith()\`

Agents use the exact same validation and separate-layer commit path as humans.

## Acceptance

\`node tests/dimensional-weave-v1.mjs\` verifies normalization, geometry
rotation and extrusion, impossible projection, face drawing, invalid geometry
refusals, no input mutation, and integration wiring. \`npm run check\` includes
the new test alongside the pre-existing release contracts.
