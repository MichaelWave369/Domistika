# Domistika v0.9.33 — Recipe Artifacts

Recipe Artifacts turn symmetry recipes into a one-call drawing primitive for agents, automations, and humans who do not feel like performing 41 tiny browser gestures to make one mandala.

## Why

v0.9.32 made symmetry formulas composable. v0.9.33 adds a bounded drawing layer above that engine so an agent can ask Domistika to build a complete recipe-driven artifact directly through the stable SDK or WebMCP site tools.

## Stable SDK

```js
await window.Domistika.art.drawRecipeArtifact({
  preset: 'portal-bloom',
  freshCanvas: true,
});
```

Available built-in artifact presets:

- `portal-bloom`
- `counterspin-flower`
- `gear-halo`
- `fracture-iris`

Read them with:

```js
window.Domistika.art.presets()
```

Custom recipe artifacts are also supported:

```js
await window.Domistika.art.drawRecipeArtifact({
  name: 'Broken Halo',
  formula: 'RADIAL(18) | NEST(2,.9,.025) | PERTURB(.04)',
  freshCanvas: true,
  width: 1200,
  height: 1200,
  strokes: [{
    tool: 'ink',
    color: '#38bdf8',
    size: 9,
    opacity: .9,
    smoothing: 24,
    points: [
      { x: .50, y: .34 },
      { x: .57, y: .42 },
      { x: .52, y: .51 },
    ],
  }],
});
```

Stroke points use normalized canvas coordinates from 0 to 1. The runtime bounds each request to 16 strokes and 256 points per stroke.

## WebMCP / browser-agent tool

The site exposes:

`domistika_draw_recipe_artifact`

The cheapest path for a browser agent is a preset:

```json
{
  "preset": "portal-bloom",
  "freshCanvas": true,
  "name": "TinyFish Portal Bloom"
}
```

That replaces dozens of mouse movements, color-picker clicks, and canvas drags with one bounded application action.

## Safety and project behavior

- `freshCanvas: true` explicitly creates a new canvas before drawing.
- `clearFirst: true` explicitly clears only the active layer.
- Both default to false.
- Custom strokes are validated and bounded.
- The symmetry engine remains v0.9.32; Recipe Artifacts are an orchestration layer, not a second renderer.
