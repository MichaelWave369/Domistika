# Domistika v0.9.41 — Sector Surgery

Sector Surgery implements the next field-brief rung after Layered Exit: one radial sector can be opened for deliberate repair while the rest of the generated structure stays protected.

The brief's intended flow is:

```text
plan
draw
lock the generated result
open one sector
redraw only that sector
optionally refold
lock again
```

v0.9.41 does exactly that without adding a node editor, freeform mask system, or another symmetry engine.

## Art Director now stops after generation

When Agent Art Director creates a new layer, that layer is locked by default after Recipe Artifact drawing completes.

```js
await Domistika.art.direct({
  prompt: 'mechanical halo'
})
```

The generated layer becomes a protected source.

Advanced callers can opt out with:

```js
lockResult: false
```

Fresh-canvas and clear-active-layer modes are not auto-locked because they do not create a dedicated new Director layer.

## One source, one repair copy

Sector Surgery never edits a protected source layer directly.

Beginning surgery:

1. requires an active Composition Plate;
2. requires a visible semantic `paint` source layer;
3. resolves the clicked plate region;
4. requires that region's formula to contain `RADIAL(n)`;
5. locks the source if it was not already locked;
6. creates a full paint-layer copy above it;
7. hides the original source;
8. opens exactly one radial sector of the copy for edits.

The copied layer preserves:

- pixels;
- opacity;
- blend mode;
- group assignment;
- motion policy;
- existing semantic overlays.

It also adds a `sector-surgery` semantic provenance record.

This full-copy design matters because a transparent overlay cannot truly erase pixels below it. Working on a replacement copy means erasing, repainting, and replacement edits are real.

## The editable boundary

The editable region is:

```text
selected radial sector
INTERSECT
selected Composition Plate region
```

Direct brush strokes, pen input, stable SDK strokes, and shape commits are clipped to that intersection.

Composition Plate propagation is suppressed only on the active repair layer. The repair layer receives the literal human / SDK stroke in the chosen sector rather than automatically cloning it across the plate.

Drafting Guide snapping still happens before the sector clip, so precision guides and Sector Surgery compose cleanly.

## Mutation side doors

The repair layer is intentionally narrow.

While Sector Surgery is active:

- normal brush tools are allowed;
- line / rectangle / ellipse shape tools are allowed;
- eraser is allowed inside the sector;
- Clear clears only the selected sector;
- Fill is blocked;
- Selection & Transform is blocked;
- Selection Acts are blocked.

Those paths are blocked because they can mutate pixels without passing through the same clipped drawing boundary.

## Refold

`Refold + lock` uses the edited sector as the new radial source.

The runtime:

1. extracts only the edited `sector ∩ region`;
2. clears the corresponding target sector in the repair copy;
3. rotates the edited source sector into that target;
4. repeats for the region's base `RADIAL(n)` count;
5. locks the repair layer;
6. closes the surgery session.

Refold is deliberately **radial-only** in v0.9.41.

A formula such as:

```text
RADIAL(12) | MIRROR(15) | NEST(2,.9,.02)
```

produces a surgery sector count of 12.

Refold does not replay MIRROR, NEST, SPIRAL, COUNTERSPIN, PERTURB, or PHASE as separate editing semantics. Treating those operators as interchangeable with "copy this repaired wedge" would be dishonest.

## Seal only

`Seal only` keeps the edited sector local.

The repair copy is locked and becomes the visible replacement layer while the protected original remains hidden underneath it.

This is useful when one deliberate asymmetry is wanted instead of a repeated correction.

## Cancel

Cancel:

- deletes the repair copy;
- restores original source visibility;
- restores the source's pre-surgery lock state;
- reactivates the source layer.

No repair pixels survive cancellation.

## Sector selection

Sector numbering follows the radial formula around the canvas center.

The positive X direction begins sector 1, and sectors advance clockwise in canvas coordinates because canvas Y increases downward.

A protected plate region or a region without `RADIAL(n)` cannot be opened by this version.

That means mirror-only flank channels remain outside the v0.9.41 surgery model.

## UI

The Composition Plates section gains:

```text
Sector surgery

[ Pick one sector ]
[ Refold + lock ]
[ Seal only ]
[ Cancel ]
```

Pick mode intercepts the next canvas press and exits Selection mode first so the old selection overlay cannot steal the click.

While active, the chosen wedge is highlighted in yellow and labeled with:

```text
SECTOR i/n · region
```

## Stable SDK

Stable SDK v0.1.18 adds:

```js
Domistika.sectorSurgery.begin(
  { x: 0.62, y: 0.45 },
  { space: 'normalized' }
)

Domistika.sectorSurgery.active()
Domistika.sectorSurgery.refold()
Domistika.sectorSurgery.seal()
Domistika.sectorSurgery.cancel()
Domistika.sectorSurgery.receipt()
```

Command catalog:

```text
sector.begin
sector.refold
sector.seal
sector.cancel
```

Only one surgery session may be active at a time.

## Receipt

Begin, refold, seal, and cancel produce a compact receipt containing:

```text
schema
version
action
plateId
regionId
formula
sectorIndex
sectorCount
sourceLayerId
repairLayerId
```

Refold receipts additionally record:

```text
copies
radialOnly
repairLayerLocked
```

Events are emitted as:

```text
domistika:v0941-sector-surgery
```

## Authority model

The roles stay separate:

```text
Composition Plate
    chooses where generated structure may propagate

Layer Lock
    protects the accepted source

Sector Surgery
    opens one bounded exception

Repair Layer
    contains the authorized edit

Refold
    explicitly promotes that edit back into radial repetition
```

The exception never silently becomes global authority.

## Deliberately deferred

v0.9.41 does not add:

- arbitrary polygon unlocks;
- multiple simultaneous unlocked sectors;
- mirror-only surgery;
- nested-ring-specific surgery;
- node/path editing;
- sector feathering;
- automatic semantic judgment of which sector is "bad";
- automatic refold after drawing.

The operator chooses the sector and explicitly decides whether to refold.
