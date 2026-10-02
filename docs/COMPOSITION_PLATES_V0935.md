# Domistika v0.9.35 — Composition Plates

Composition Plates make symmetry regional instead of global.

A plate is a named map of canvas regions. Each region may carry its own Symmetry Recipe formula, remain untransformed, or be protected from generated copies. The runtime routes each source segment through the law for the region where it begins, then rejects transformed segments that would trespass into a protected region.

## Built-in plates

- **Mandala** — concentric core, body, and frame laws.
- **Harvest Wheel** — hub, spoke, rim, and field laws.
- **Portal Gate** — radial portal, crown gates, and mirrored flank channels.
- **Square Guardians** — the Archons acceptance plate: four protected corners, crown gates, flank channels, core, inward veil, body, and outer field.

## Authority rule

Protected regions are not blank. They are human-authority regions.

Drawing directly inside one is allowed and remains identity-only. Symmetry expansion from another region is not permitted to enter it. This is the v0.9.35 enforcement boundary behind the rule: capability is not authority.

## Studio use

Open **Recipes** and use the **Composition plates** section. Selecting a plate persists its id in project settings. **Clear plate** returns the canvas to ordinary global symmetry behavior.

The plate overlay is a guide only:

- cyan dashed boundaries show governed regions;
- rose dashed boxes show protected regions;
- overlay guides never become paint.

## SDK

```js
window.Domistika.compositionPlates.list();
window.Domistika.compositionPlates.apply('square-guardians');
window.Domistika.compositionPlates.active();
window.Domistika.compositionPlates.regionAt({ x: 120, y: 120 });
window.Domistika.compositionPlates.clear();
```

Schema: `domistika.composition-plate.v1`.

## Acceptance

The **Square Guardians** plate is the acceptance target.

1. A stroke in a protected corner remains single and hand-drawn.
2. A stroke in the core expands under its radial/nested law.
3. Generated copies from core, veil, body, gate, flank, or field regions may not enter a protected corner.
4. Crown-gate copies stay inside the crown-gate region.
5. Flank copies stay inside the flank-channel region.
6. Clearing the plate restores the pre-v0.9.35 symmetry pipeline.
