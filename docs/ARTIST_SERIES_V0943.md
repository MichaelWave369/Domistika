# Domistika v0.9.43 · Artists Series

An original, live-drawing gallery of six mathematical symmetry studies. Inspired by the ideas of tiled tessellation, glide reflection, optical repetition, and paradoxical architecture, not copied artworks, assets, textures, or protected compositions.

## Finding the series

Open **Recipes** in the inspector, then scroll to **Artists Series · Impossible Geometry**. Each card shows a generated preview of the actual transform and activates a recipe you can draw through. The original eight recipe presets are unchanged.

- **Impossible Arcade:** staggered lattice + skewed nested frames.
- **Metamorph Flight:** alternate-row tiles and glide reflection. Draw an original bird, wing or abstract shape at the center.
- **Reversible Stair:** skewed and mirrored grid for disorienting perspective studies.
- **Vibration Field:** rhythmic staggered optical-art lattice.
- **Infinite Gallery:** radially nested portal and frame geometry.
- **Dream Mosaic:** alternated glide-reflected tiles with small deterministic imperfections.

These are mathematical drawing aids. They do not automatically draw actual staircases or complete Escher-style scenes. To create dimensional contradictions, click **Open Dimensional Weave**, turn on **Escher / impossible depth**, define a face and render it to a **new independent layer**. Using both tools together enables intricate hand-authored compositions.

## New recipe primitives

The formula bench now also accepts:

| Operation | Example | Meaning |
| --- | --- | --- |
| `TILE(columns,rows,dx,dy,stagger)` | `TILE(5,4,.22,.24,.5)` | Repeat on a centered grid; the last argument offsets odd rows by a fraction of one column. Dimensions are normalized to the shorter canvas side. |
| `GLIDE(axis,step)` | `GLIDE(x,.11)` | Keep each existing transform, then add a reflected copy shifted along the requested x or y axis. Reflection is perpendicular to translation. |
| `SHEAR(x,y)` | `SHEAR(.25,-.1)` | Tilt the transformed shape to form skewed parallelograms and oblique perspective. |

Operators can be combined with the preexisting `RADIAL`, `MIRROR`, `NEST`, `PHASE`, `SPIRAL`, `COUNTERSPIN` and `PERTURB`.

The runtime caps expanded states to **192**, uses deterministic transforms and never generates an unbounded lattice. Existing modes work through the original engine when no recipe is active.

## Runtime and persistence

Artist presets use the existing `recipe:<id>` mode and are registered in the normal symmetry selector. The active formula remains in the serialized project settings. Existing agent and browser APIs continue to work:

```js
window.Domistika.symmetryRecipes.list();
window.Domistika.symmetryRecipes.apply('metamorph-flight');
window.Domistika.symmetryRecipes.active();
window.Domistika.symmetryRecipes.applyFormula('TILE(4,4,.24,.24,.5) | GLIDE(x,.12)', 'My Study');
```

## Acceptance

- Legacy symmetry recipes, composition plates, existing project files, and Dimensional Weave remain intact.
- Original generated thumbnails contain no source artwork.
- Finite dimensions / bounded counts / deterministic reruns / glide axis validation / symmetry transform coordinates are covered by `tests/v0943-artist-series.mjs`.
- `npm run check` and `npm run build` are CI gates.