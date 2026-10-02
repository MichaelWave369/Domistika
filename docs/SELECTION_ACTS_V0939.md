# Domistika v0.9.39 — Selection Acts

Selection Acts extends the existing v0.4 Selection & Transform system without replacing it.

The release implements the field-brief target:

- fill the active selection with the current color;
- stroke the active selection outline using the current brush size, opacity, and color;
- keep each act to one undo step;
- add a recent-brush strip beside the selection acts.

## Existing selection substrate

Domistika already had:

- rectangle selection;
- freehand lasso selection;
- move / scale / rotate;
- copy / cut / paste;
- duplicate / delete;
- commit / cancel.

That system lifts selected pixels into a temporary selection canvas while the selection is active.

v0.9.39 deliberately uses that architecture instead of creating another mask engine.

## One act, one undo

A selection act follows this sequence:

1. restore the layer to its pre-selection snapshot;
2. push that snapshot to history exactly once;
3. trace the current transformed selection boundary;
4. apply the requested operation;
5. close the active selection.

This produces one undo entry for the whole fill or outline action.

It also means a moved, scaled, or rotated selection can be used as the target geometry before the act is applied.

## Fill selection

Fill uses:

```text
current color
current opacity
source-over compositing
```

The entire transformed selection boundary is filled.

For a lasso, the original freehand path is preserved as local selection geometry and transformed with the selection.

For a rectangle, the transformed four-corner boundary is used.

## Stroke outline

Stroke outline uses:

```text
current color
current opacity
current brush size
round line joins
round line caps
```

The act intentionally does not inherit eraser compositing or brush texture behavior. The field-brief contract is an outline with the active brush's size / opacity / color, so the operation always paints a visible outline.

## Locked layers

The old v0.4 selection overlay could bypass normal drawing locks because it did not enter through CanvasEngine pointer drawing.

v0.9.39 closes that path.

A locked layer now rejects:

- creating a pixel selection;
- fill selection;
- stroke selection outline.

Layer locks remain the final write-authority boundary.

## Recent brush strip

The Selection & Transform panel now contains a compact strip of up to five recently selected brush presets.

The brush library emits:

```text
domistika:brush-selected
```

with the selected preset id and useful display metadata.

Recent ids are persisted locally under:

```text
domistika-recent-brushes-v1
```

The strip does not clone brush definitions. It resolves ids against the existing brush library and recalls the real preset.

Deleted custom brushes are automatically removed from the recent strip.

## Stable SDK

Stable SDK v0.1.16 adds:

```js
Domistika.selection.active()
await Domistika.selection.fill()
await Domistika.selection.strokeOutline()
Domistika.selection.boundary()

Domistika.brush.recent()
Domistika.brush.recall(brushId)
```

The command catalog adds:

```text
selection.fill
selection.stroke-outline
```

Both commands require an active selection.

## Event

Each completed act emits:

```text
domistika:v0939-selection-act
```

with:

```text
kind
layerId
color
size
opacity
selectionShape
```

## Deliberately deferred

This rung does not add:

- feathering;
- grow / shrink selection;
- selection boolean operations;
- magic-wand expansion;
- vector path editing;
- brush-texture tracing around selection edges.

The point is a small pair of dependable bounded acts, not another editing suite hiding inside the editing suite.
