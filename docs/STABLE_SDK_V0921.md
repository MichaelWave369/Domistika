# Domistika Stable SDK v0.1

Domistika v0.9.21 adds one stable public runtime surface:

```js
window.Domistika
```

The SDK is a frozen facade over the existing versioned runtime modules. Existing globals such as `domistikaSpiroV07`, `domistikaKineticExpansionV0914`, `domistikaAccessibleInputV0919`, and `domistikaCleanCaptureV0920` remain intact.

The purpose is to give humans, local scripts, accessibility tools, MIDI controllers, test harnesses, and governed agents one documented language without exposing raw canvas contexts or arbitrary JavaScript execution.

## Contract

- schema: `domistika.sdk.v1`
- SDK version: `0.1.1`
- app version: `0.9.22`
- global: `window.Domistika`
- object: deeply frozen
- network access: none
- filesystem access: none
- arbitrary script execution: none
- raw `CanvasRenderingContext2D` exposure: none

The SDK resolves the current Domistika engine lazily. It can therefore be loaded without inventing a second engine lifecycle.

## Quick start

```js
Domistika.setTool('airbrush');
Domistika.color('#f0b36a');

Domistika.stroke([
  { x: 0.15, y: 0.30 },
  { x: 0.35, y: 0.26 },
  { x: 0.55, y: 0.34 },
  { x: 0.78, y: 0.28 },
], {
  space: 'normalized',
  size: 60,
  opacity: 0.35,
});
```

Scripted points no longer need to provide pressure explicitly. Missing pressure defaults safely to `1`, both in the SDK and in the underlying `CanvasEngine.drawSingleSegment()` path.

## Core surface

### Status and capabilities

```js
Domistika.ready();
Domistika.capabilities();
```

`capabilities()` reports the stable SDK contract and the currently installed Spiro, Motion, Composer, Visual Performance, and Clean Capture surfaces.

### Canvas

```js
await Domistika.canvas.new({
  width: 1600,
  height: 1200,
  name: 'Night Study',
});

Domistika.canvas.info();
Domistika.canvas.fit();
await Domistika.canvas.undo();
await Domistika.canvas.redo();
```

### Tool and brush

```js
Domistika.tool.set('ink');
Domistika.tool.get();

Domistika.brush.color('#37d7c8');
Domistika.brush.size(14);
Domistika.brush.opacity(0.8);
Domistika.brush.smoothing(35);
Domistika.brush.symmetry('radial-12');
```

Top-level aliases are also available:

```js
Domistika.setTool('marker');
Domistika.color('#ffb347');
Domistika.stroke(points, options);
```

### Stroke

```js
Domistika.stroke(points, {
  tool: 'airbrush',
  color: '#5bd5ff',
  size: 48,
  opacity: 0.25,
  smoothing: 20,
  symmetry: 'none',
  space: 'canvas',     // or 'normalized'
  history: true,
});
```

Each point accepts:

```js
{ x, y, pressure }
// or
{ x, y, p }
```

Pressure is optional and defaults to `1`.

A complete SDK stroke creates one history checkpoint and emits `domistika:stroke`.

### Layers

```js
Domistika.layers.list();
const layer = Domistika.layers.create('Glow');
Domistika.layers.activate(layer.id);
Domistika.layers.rename(layer.id, 'Portal Glow');
Domistika.layers.visibility(layer.id, true);
Domistika.layers.opacity(layer.id, 0.75);
Domistika.layers.blend(layer.id, 'screen');
Domistika.layers.clear(layer.id);
```

Returned layer objects are metadata-only. The SDK does not return raw canvas/context objects.

### Spiro

```js
Domistika.spiro.presets();

Domistika.spiro.place('flower', {
  x: 0.5,
  y: 0.5,
  space: 'normalized',
  color: '#e6bc64',
});
```

The current v0.7 Spiro implementation remains the rendering engine.

### Motion

```js
Domistika.motion.play('portal-369');
Domistika.motion.pause();
Domistika.motion.stop();

Domistika.motion.play('hypnosis');
Domistika.motion.composer('ghost-mandala');
Domistika.motion.scene('particle-portal');

Domistika.motion.record.start();
Domistika.motion.record.stop();
```

Known Kinetic presets:

- `slow-drift`
- `portal` / `portal-369`
- `chaos`
- `hypnosis`
- `inversion-storm`
- `bass-bloom`

Known Composer presets:

- `ghost-mandala`
- `orbit-bloom`
- `infinite-dream`
- `calm-drift`

Known Visual Performance scenes:

- `particle-portal`
- `fractal-bloom`
- `aurora-breath`
- `cosmic-pulse`

Recording currently keeps the existing Motion Studio download behavior. Persisted motion clips inside `.domistika` projects are a separate future rung.

### Motion clips

Recorded Kinetic / Composer / Visual Performance WebM clips are project objects in v0.9.22.

```js
Domistika.motion.clips.list();
Domistika.motion.clips.latest();

const url = await Domistika.motion.clips.url(id);
await Domistika.motion.clips.download(id);
await Domistika.motion.clips.remove(id);

const portableProject = await Domistika.project.serialize({
  embedMotion: true,
});
```

Routine autosave stores clip metadata plus local IndexedDB references. Explicit project serialization with `embedMotion: true` embeds the WebM media so a `.domistika` file remains portable.

### Export and clean capture

```js
const pngBlob = await Domistika.export.png();

const clean = Domistika.export.capture({
  maxDimension: 2048,
  includeBackground: true,
});
```

`capture()` delegates to the v0.9.20 clean composite-art contract. It returns artwork pixels without Studio chrome or symmetry guides.

### Events

```js
const off = Domistika.events.on('stroke', (event) => {
  console.log(event.detail);
});

Domistika.events.once('sdk-motion', (event) => {
  console.log(event.detail);
});

off();
```

Short names are automatically prefixed with `domistika:`.

The SDK emits bounded semantic events for SDK-driven tool, setting, stroke, layer, motion, export, canvas, and command operations.

### Commands

The initial command bus is deliberately small:

```js
Domistika.commands.list();

await Domistika.commands.execute('undo');
await Domistika.commands.execute('canvas.fit');
await Domistika.commands.execute('motion.portal');
await Domistika.commands.execute('layer.clear');
await Domistika.commands.execute('export.png');
```

This is intended to become the backing layer for a future command palette rather than having a palette reach directly into UI implementation details.

## Design rule

The stable facade is the public language. Versioned globals remain implementation contracts.

```text
window.Domistika
      ↓
stable semantic API
      ↓
versioned Domistika modules
      ↓
CanvasEngine / Spiro / Motion / Capture
```

New integrations should prefer `window.Domistika` unless they specifically need to test a lower-level versioned contract.
