# Domistika v0.9.38 — Drafting Guides

Drafting Guides turn the existing `guide` layer role into a small precision system.

The release deliberately stays narrow:

- horizontal straight ruler;
- vertical straight ruler;
- ellipse guide;
- one horizon with one vanishing point;
- visible guide overlays;
- optional snapping.

Fish-eye perspective, French curves, multi-point perspective, arbitrary spline rulers, and a custom guide editor remain out of scope.

## Existing guide substrate

Domistika already had first-class Guide Layers from Tika Help Core.

Those layers:

- persist in `.domistika`;
- are drawing-locked;
- use the `guide` semantic role;
- remain visible while working;
- are excluded from normal flattened export.

v0.9.38 reuses that substrate instead of introducing a second guide type.

## Straight rulers

Two ruler kinds are supported:

```text
horizontal-ruler
vertical-ruler
```

A ruler is defined by one normalized position from `0` to `1`.

When snap is enabled:

- horizontal ruler constrains `y`;
- vertical ruler constrains `x`.

Pressure and other point metadata are preserved.

## Ellipse

The ellipse guide stores:

```text
cx / cy
rx / ry
```

in normalized canvas coordinates.

Snapping projects each incoming point to the nearest radial intersection on the ellipse.

The first version does not support rotated ellipses.

## One-point perspective

The one-point guide stores:

```text
horizonY
vanishingX
```

The vanishing point lies on the horizon.

At stroke start Domistika freezes one perspective ray from the vanishing point through the initial point. Every later point in that stroke is projected onto that same ray.

This avoids the unstable behavior that would occur if every point selected a fresh perspective angle.

The visible guide shows:

- the horizon;
- the vanishing-point marker;
- faint construction rays to the canvas corners.

## Shared snap boundary

Snapping applies at two input boundaries:

```text
pointer / pen eventPoint()
stable SDK stroke()
```

That means the same active guide constrains:

- direct human drawing;
- shape endpoints;
- stable SDK strokes;
- Recipe Artifacts;
- Agent Art Director output routed through Recipe Artifacts.

This prevents an agent from bypassing a guide merely because it enters through the SDK.

## Visibility and snap are independent

A guide can be:

```text
visible + snap on
visible + snap off
hidden  + snap on
hidden  + snap off
```

The two controls are intentionally independent.

## Persistence

The active guide state is stored in engine settings and therefore persists with the project.

The guide itself is also persisted as a normal Guide Layer with `guideMeta` containing:

```text
schema: domistika.drafting-guide.v1
version: 0.9.38
kind
guide geometry
```

## Stable SDK

Stable SDK v0.1.15 adds:

```js
Domistika.draftingGuides.apply('horizontal-ruler', {
  position: 0.42,
  snap: true,
  visible: true,
})

Domistika.draftingGuides.apply('ellipse', {
  cx: 0.5,
  cy: 0.5,
  rx: 0.32,
  ry: 0.22,
})

Domistika.draftingGuides.apply('one-point', {
  horizonY: 0.42,
  vanishingX: 0.5,
})

Domistika.draftingGuides.active()
Domistika.draftingGuides.snap(false)
Domistika.draftingGuides.visible(false)
Domistika.draftingGuides.clear()
```

The command catalog adds:

```text
guide.drafting.horizontal
guide.drafting.vertical
guide.drafting.ellipse
guide.drafting.one-point
```

## Authority interaction

Drafting Guides constrain geometry.

Composition Plates constrain generated-region authority.

Layer locks constrain write authority.

Those are separate decisions and stay separate in the implementation.
