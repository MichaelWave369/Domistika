# Domistika v0.9.40 — Layered Exit

Layered Exit adds a layered PSD interchange format while keeping `.domistika` as the canonical editable project.

The field-brief rule is intentionally strict:

- export paint layers;
- omit guides;
- omit motion-ignore overlays;
- keep `.domistika` as the source of truth.

PSD is an exit format for external art tools, not a replacement project format.

## Why PSD

Domistika uses the browser-capable `ag-psd` writer.

The exporter sends bitmap canvases for each eligible paint layer, along with a document composite.

The implementation uses `writePsdUint8Array()` to avoid the extra ArrayBuffer allocation of the simpler writer.

## Eligibility

A layer enters the layered PSD only when all of these are true:

```text
semantic role == paint
kind != guide
guide != true
motionPolicy != ignore
exportPolicy != exclude
exportPolicy != exclude-guide
```

Visibility does not determine eligibility.

A hidden paint layer remains in the PSD as a hidden layer so the external editor receives the editable paint stack, not merely the visible composite.

Excluded layers receive one of these manifest reasons:

```text
guide
motion-ignore
export-excluded
non-paint-role
```

## What is preserved

For each exported paint layer:

- name;
- bitmap pixels;
- visibility;
- opacity;
- supported blend mode;
- stacking order;
- locked write state, mapped to PSD composite protection.

Domistika stores layers bottom-to-top.

PSD child order is top-to-bottom, so the exporter reverses the eligible layer list only when constructing the PSD document.

## Blend modes

The following Domistika modes are written directly or translated to PSD spelling:

```text
normal
multiply
screen
overlay
darken
lighten
color-dodge -> color dodge
color-burn  -> color burn
hard-light  -> hard light
soft-light  -> soft light
difference
```

Unknown modes fall back to `normal` rather than inventing unsupported semantics.

## Composite image

The PSD document also receives a transparent composite canvas built only from visible eligible paint layers.

That composite follows Domistika's current layer opacity and blend behavior.

Excluded guide, type, motion-ignore, and other non-paint layers never enter the layered PSD composite.

## What PSD deliberately does not preserve

PSD does not become a serialized Domistika runtime.

The layered exit does **not** claim to preserve:

- Composition Plate rules;
- symmetry formulas or receipts;
- Drafting Guide snapping;
- Guide Layers;
- motion-ignore overlays;
- motion clips;
- Art Director lineage;
- semantic overlays as structured Domistika objects;
- layer-group governance semantics;
- undo history;
- agent authority boundaries;
- project receipts.

Those remain in `.domistika`.

## Canonical-source rule

```text
.domistika
    canonical editable project
    complete Domistika semantics

.psd
    layered paint interchange
    external editing / handoff

.png / .jpg
    flattened delivery
```

Opening or editing the PSD elsewhere does not produce a complete substitute for the original Domistika project.

## Export dialog

The existing Export Artwork dialog now offers:

```text
PNG
JPEG
PSD · paint layers
```

PSD export reports the number of paint layers written.

If no eligible paint layer exists, the export is rejected instead of generating a misleading empty PSD.

## Stable SDK

Stable SDK v0.1.17 adds:

```js
const audit = Domistika.export.inspectLayered()

const result = Domistika.export.psd()

result.blob
result.bytes
result.manifest
```

The manifest includes:

```text
schema
version
canonicalFormat
canonicalSourceOfTruth
interchangeFormat
width / height
included[]
excluded[]
```

The command catalog adds:

```text
export.psd
```

## Event

A successful export emits:

```text
domistika:v0940-layered-export
```

with the byte count and included / excluded layer counts.

## Deliberately deferred

This rung does not add:

- PSD import;
- round-trip PSD fidelity promises;
- Photoshop text-layer authoring;
- smart objects;
- PSD masks;
- nested PSD group reconstruction;
- layered TIFF fallback.

PSD succeeded cleanly enough that the fallback was unnecessary.

If full Domistika editability matters, save the `.domistika` project.
