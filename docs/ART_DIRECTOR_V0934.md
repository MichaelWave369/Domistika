# Domistika v0.9.34 — Agent Art Director

The Agent Art Director adds an intent layer above Symmetry Recipes and Recipe Artifacts.

Instead of specifying every stroke, an agent can describe the visual direction:

```js
await Domistika.art.direct({
  mood: 'cosmic mechanical',
  symmetry: 'portal',
  density: 0.72,
  palette: 'electric-dusk',
  complexity: 0.8,
  surprise: 0.22,
});
```

Domistika deterministically compiles that intent into:

```text
intent
→ visual profile
→ palette
→ symmetry recipe
→ bounded seed strokes
→ Recipe Artifact
```

## Stable SDK

Preview the plan without touching the canvas:

```js
const plan = Domistika.art.plan({
  prompt: 'a calm crystalline temple',
  density: 0.45,
  complexity: 0.6,
});
```

Direct the artwork:

```js
await Domistika.art.direct({
  prompt: 'a cosmic mechanical portal with sharp reactor geometry',
  density: 0.72,
  complexity: 0.8,
  surprise: 0.22,
});
```

By default, directed art is placed on a **new layer**. It does not clear the current artwork. Pass `freshCanvas: true` to intentionally create a new canvas, `clearFirst: true` to intentionally replace the active layer, or `newLayer: false` to draw directly on the active layer.

## Inputs

- `prompt` / `mood`: descriptive visual intent.
- `symmetry`: `auto`, `mandala`, `kaleido`, `gear`, `vortex`, `counterspin`, `portal`, `flower`, or `fracture`.
- `palette`: `auto` or a named built-in palette.
- `colors`: optional custom array of 2–8 HEX colors.
- `density`: 0–1.
- `complexity`: 0–1.
- `surprise`: 0–1. Adds bounded deterministic variation without making identical inputs unstable.
- `seed`: optional explicit deterministic seed.
- `width` / `height`: canvas size used when `freshCanvas` is true.
- `freshCanvas`, `clearFirst`, `newLayer`: placement controls.

## Profiles

The local intent compiler recognizes families including:

- Cosmic Mechanical
- Mechanical
- Organic
- Sacred Calm
- Crystal
- Vortex
- Fracture
- Orbital

This is deliberately a deterministic local compiler rather than a hidden model call. Agents can reason in natural visual language while Domistika remains inspectable, reproducible, and cheap to operate.

## Palettes

- `electric-dusk`
- `solar-forge`
- `biolume`
- `moon-glass`
- `prismatica`
- `signal-break`
- `orbital`

## WebMCP / browser agents

The site exposes:

`domistika_direct_art`

Example:

```json
{
  "prompt": "cosmic mechanical portal",
  "density": 0.72,
  "complexity": 0.8,
  "surprise": 0.22,
  "newLayer": true
}
```

One tool call now replaces the long sequence of brush selection, palette clicks, mouse drags, inspection, and retry loops that browser automation previously needed.
