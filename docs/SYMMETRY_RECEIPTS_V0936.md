# Domistika v0.9.36 — Symmetry Receipts

Symmetry Receipts preserve the generative grammar that produced a Domistika artifact when the pixels leave the studio.

The field brief called for five values to survive export:

- formula;
- plate id;
- seed;
- palette;
- transform count.

v0.9.36 preserves all five and adds enough context to make those values honest.

## Receipt schema

`domistika.symmetry-receipt.v1`

A receipt contains:

```text
formula
formulaAuthority
plateId
seed
seedSource
palette
paletteSource
transformCount
transformCountMode
symmetryMode
recipe
plate
director
canvas
capturedAt
contentHash
```

The receipt is canonicalized and SHA-256 bound.

## Formula authority

A global Symmetry Recipe and a Composition Plate can exist at the same time, but they do not have equal authority.

When no plate is active:

```text
formulaAuthority = global-recipe
```

When a plate is active:

```text
formulaAuthority = plate-regions
```

The top-level formula is still preserved if one is active, but the receipt explicitly says that the plate regions govern generated copies.

## Plate snapshot

A plate receipt does not store only its name.

It freezes:

- plate schema and version;
- region ids and labels;
- region geometry;
- region formula;
- exclusion flag;
- output policy;
- per-region transform count;
- truncation state.

That means the receipt still explains the grammar even if the built-in plate definition changes later.

## Transform count

For a global recipe, `transformCount` is the active recipe copy count.

For a plate, different regions can emit different numbers of copies. The top-level value is therefore the maximum copies emitted by any single region:

```text
transformCountMode = plate-region-max
```

Exact counts remain on each region.

## Seed and palette

When Agent Art Director generated the source strokes, the receipt records its seed and exact palette.

If there is no valid Art Director lineage, the seed is null and the palette falls back to the user's favorite colors. The source is explicit so a favorite-color shelf is never misrepresented as an exact generative palette.

Applying another Symmetry Recipe after an Art Director run clears the stored director lineage. A later Art Director run records a new lineage.

## Creative Bridge v2 compatibility

Creative Bridge stays at protocol version 2.

Domistika adds the complete receipt as:

```text
payload.symmetryReceipt
```

The receipt's SHA-256 is also written into the existing bridge `note`, which is already covered by the v2 manifest hash.

This deliberately avoids changing the v2 manifest shape. Current Auralith receivers keep validating the package with their existing verifier while newer consumers can independently verify the receipt and confirm that its hash is the one anchored in the bridge manifest.

In short:

```text
pixels → baseContentHash
overlays → overlay contentHash
receipt → receipt contentHash
receipt hash → existing manifest note
manifest → bridge contentHash
```

## Stable SDK

Stable SDK v0.1.13 adds:

```js
const receipt = await Domistika.symmetryReceipts.current();
await Domistika.symmetryReceipts.verify(receipt);
```

The Auralith bridge transfer result also reports:

```text
symmetryReceiptHash
```

## Acceptance target

1. Same state plus same `capturedAt` produces the same receipt hash.
2. Changing formula, plate grammar, seed, palette, or transform metadata changes the receipt hash.
3. A modified receipt fails receipt verification.
4. Creative Bridge v2 remains verifiable by the existing Auralith v2 verifier.
5. The bridge note contains the receipt hash that was actually transferred.
6. A saved project can retain Art Director lineage through project settings.
