# Domistika v0.9.32 — Symmetry Recipes

Symmetry Recipes turn Domistika's individual symmetry modes into composable transformation formulas.

## Goal

A user can choose a named flavor such as **Portal**, **Counterspin**, or **Fracture**, or build a custom formula from small operators. The formula remains live while drawing, so every new segment or shape is transformed through the recipe stack.

## Formula grammar

Operators are separated by `|` (newlines are also accepted):

```text
RADIAL(16) | MIRROR(5.625) | NEST(3,.76,.03) | COUNTERSPIN(5.625) | SPIRAL(2.8,.998,.001)
```

Supported primitives:

- `RADIAL(count)` — repeat around the canvas center.
- `MIRROR(phaseDegrees)` — duplicate the current transform set with mirrored copies.
- `NEST(rings, scaleStep, radiusStep)` — create concentric scaled shells.
- `SPIRAL(degreesPerStep, scaleStep, radiusStep)` — progressively rotate, scale, and offset copies.
- `COUNTERSPIN(degrees)` — alternate rotational direction by nested ring.
- `PERTURB(amount)` — add deterministic imperfection without stroke-to-stroke jitter.
- `PHASE(degrees)` — rotate the entire current transform set.

Recipes are capped at 192 transforms to keep live drawing responsive. The cap is explicit in the returned recipe plan and UI status.

## Built-in flavors

v0.9.32 ships Mandala, Kaleido, Gear, Vortex, Counterspin, Portal, Flower, and Fracture. Presets are ordinary formulas rather than special-case rendering code.

## Persistence and runtime

The active formula is stored in `engine.settings.symmetryRecipeFormula`, so it travels with `.domistika` project serialization. The active symmetry value uses `recipe:<id>` or `recipe:custom`.

Browser/agent runtime surface:

```js
window.domistikaSymmetryRecipesV0932.list()
window.domistikaSymmetryRecipesV0932.apply('portal')
window.domistikaSymmetryRecipesV0932.applyFormula('RADIAL(18) | PERTURB(.03)')
window.domistikaSymmetryRecipesV0932.active()
```

This is intentionally additive. Existing symmetry modes, Sacred Geometry, Phi/Fibonacci modes, symmetry fill, and project files continue to use their current paths unless a recipe mode is selected.
