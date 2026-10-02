# Domistika v0.9.42 — Field Qualification

Field Qualification is the end-to-end acceptance rung for the creative-authority stack.

It adds no new drawing capability.

Instead, it proves that the existing systems compose correctly:

```text
Composition Plate
Art Director
Layer Lock
Symmetry Receipt
Sector Surgery
History
.domistika save / restore
Drafting Guide exclusion
motion-ignore exclusion
Layered PSD exit
```

The qualification runs inside Domistika itself and returns a content-hashed JSON receipt.

## Transactional test project

Qualification never uses the current artwork as its test subject.

The protocol:

1. serializes the current project, including embedded motion clips;
2. restores a disposable 512×512 qualification project;
3. runs the full acceptance protocol;
4. restores the original project in a `finally` block;
5. emits the qualification receipt.

Original-project restoration is itself a receipt check.

This means a failed qualification still attempts to return the studio to the state it had before the test began.

## Qualification scenario

The frozen scenario uses:

```text
Composition Plate: mandala
Art Director symmetry: mandala
palette: moon-glass
seed: domistika-v0942-field-qualification
canvas: 512 × 512
sector target: normalized (0.62, 0.50)
expected region: core
expected RADIAL count: 12
```

The fixed seed and fixed geometry make runs comparable.

## Gate 1 — snapshot

The current project must serialize successfully before any destructive qualification step begins.

The snapshot uses:

```js
Domistika.project.serialize({ embedMotion: true })
```

so embedded motion data is preserved for restoration.

## Gate 2 — disposable project

The studio is replaced temporarily with a clean 512×512 project.

Transient state is explicitly reset:

```text
compositionPlateId = null
draftingGuide = null
sectorSurgery = null
symmetry recipe state = null
symmetry receipt director state = null
```

This prevents the user's current project state from contaminating the acceptance run.

## Gate 3 — Composition Plate

The Mandala plate must apply and report itself active.

## Gate 4 — Art Director generate + lock

Art Director creates a deterministic generated layer.

The acceptance condition is:

```text
generation succeeds
AND
target layer id exists
AND
targetLayerLocked == true
AND
engine layer locked == true
```

This verifies the v0.9.41 "draw, lock, stop" contract.

## Gate 5 — Symmetry Receipt

Immediately after generation, the harness builds and verifies the v0.9.36 Symmetry Receipt.

The receipt content hash is carried forward into the Field Qualification evidence.

## Gate 6 — locked write refusal

The harness activates the generated layer and records a SHA-256 hash of its pixels.

It then attempts a normal stable-SDK stroke.

Expected result:

```text
DOMISTIKA_SDK_LAYER_LOCKED
```

The layer is hashed again.

The gate passes only when:

```text
write was refused
AND
before pixel hash == after pixel hash
```

A status message alone is not sufficient evidence.

## Gate 7 — begin Sector Surgery

The harness opens normalized point:

```text
(0.62, 0.50)
```

on the Mandala plate.

Expected authority state:

```text
region = core
sectorCount = 12
source locked
source hidden
repair copy exists
repair copy unlocked
```

## Gate 8 — outside-sector write has no effect

A bright SDK stroke is issued deliberately outside the authorized wedge.

The repair layer is hashed before and after.

Acceptance requires the hashes to be identical.

This proves the runtime clip, not merely the UI overlay.

## Gate 9 — inside-sector redraw

A visible ink stroke is issued inside the authorized wedge.

Acceptance requires the repair-layer pixel hash to change.

## Gate 10 — erase

The harness erases part of the newly drawn stroke.

Acceptance requires another pixel-hash change.

This specifically proves the full replacement-copy model can remove pixels rather than merely stacking transparent paint above the source.

## Gate 11 — redraw after erase

The erased area is redrawn with a second color.

Acceptance requires another distinct pixel hash.

## Gate 12 — Refold + lock

The repaired sector is explicitly refolded.

Acceptance requires:

```text
receipt action = refold
copies = 12
repairLayerLocked = true
engine repair layer locked = true
post-refold hash != pre-refold hash
```

## Gate 13 — Undo refold

The harness performs Undo.

The repair-layer hash must exactly match the pre-refold hash.

## Gate 14 — Redo refold

The harness performs Redo.

The repair-layer hash must exactly match the first post-refold hash.

This verifies that refold is one coherent history operation rather than a pile of sector-by-sector undo entries.

## Gate 15 — canonical project persistence

Before save / restore, the harness adds two export-scaffolding cases:

- a Drafting Guide;
- a paint layer with `motionPolicy=ignore`.

Then the qualification project is serialized as a normal Domistika project and restored.

Acceptance requires restoration of:

```text
Mandala Composition Plate id
hidden protected source layer
source lock
repair layer
repair lock
sector-surgery semantic provenance
sector count = 12
```

This tests `.domistika` as the canonical project substrate.

## Gate 16 — PSD audit

The Layered Exit manifest is inspected before writing PSD bytes.

Acceptance requires:

```text
guide excluded
motion-ignore layer excluded
all included layers are semantic paint
no included layer has motionPolicy=ignore
```

## Gate 17 — PSD write

The audited paint stack must produce a non-empty PSD Blob in memory.

The receipt records:

- byte count;
- included-layer count;
- excluded-layer count.

The qualification harness does not download the PSD.

## Gate 18 — restore original project

The original user project is restored after the qualification scenario.

This happens from `finally`, including on failure.

A successful restoration is appended as the final qualification check.

## Pixel evidence

Canvas mutation gates use SHA-256 over raw RGBA pixel bytes.

Evidence hashes are written as:

```text
sha256:<64 lowercase hex characters>
```

This makes these checks evidence-bearing:

- locked write refusal;
- outside-sector refusal;
- inside-sector redraw;
- erase;
- redraw after erase;
- refold;
- undo;
- redo.

## Qualification receipt

Schema:

```text
domistika.field-qualification.v1
```

Example structure:

```json
{
  "schema": "domistika.field-qualification.v1",
  "version": "0.9.42",
  "qualificationId": "creative-authority-e2e",
  "status": "PASS",
  "summary": {
    "total": 18,
    "passed": 18,
    "failed": 0
  },
  "checks": [],
  "evidence": {},
  "error": null,
  "contentHash": "sha256:..."
}
```

The receipt itself is canonicalized and SHA-256 bound.

A failed gate produces:

```text
status = FAIL
```

and records the failed check plus any fatal runtime error available.

## UI

The Composition Plates area gains:

```text
Field qualification

[ Run qualification ]
[ Download receipt ]
```

The result shows:

```text
PASS · n/n checks · sha256:...
```

or the corresponding FAIL result.

The downloadable receipt is JSON.

## Stable SDK

Stable SDK v0.1.19 adds:

```js
const receipt = await Domistika.qualification.run()

Domistika.qualification.last()
Domistika.qualification.running()
```

Command palette:

```text
qualification.run
```

## Event

A completed run emits:

```text
domistika:v0942-field-qualification
```

with the full qualification receipt as event detail.

## What this proves

A PASS demonstrates, in one executable protocol, that the tested runtime can:

```text
generate
lock
refuse unauthorized writes
create a bounded repair exception
reject outside-sector writes
erase and redraw inside authority
promote a repair through explicit refold
undo / redo that promotion exactly
persist the governed project
audit layered interchange
write PSD
restore the user's original project
```

It does not prove browser-independent rendering equivalence, Photoshop round-trip fidelity, or every possible Composition Plate / formula combination.

The qualification is a frozen acceptance path, not a universal theorem about every Domistika state.
