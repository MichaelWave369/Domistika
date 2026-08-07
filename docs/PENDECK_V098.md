# Domistika PenDeck v0.9.8

PenDeck is Domistika's native stylus layer. It uses browser `PointerEvent` data and does not require an XP-Pen-specific SDK or AutoHotkey.

## What v0.9.8 adds

- Native pen detection with hover/contact state.
- Live pressure, last-contact pressure, session max pressure, tilt X/Y and speed telemetry.
- Coalesced pen samples for smoother native brush input when the browser exposes them.
- Adjustable pressure response curve from the PenDeck panel.
- Mirror reflection that composes with Domistika's existing symmetry mode instead of replacing it.
- F8 radial pen menu for Brush, Eraser, Mirror, Symmetry, Grid, Undo, Redo and the CC Hook.
- `pendeck:action`, `pendeck:pen`, `domistika:pendeck-ready`, `domistika:pendeck-mirror`, and `domistika:cc-sketch` integration events.
- A local canvas snapshot in the CC Hook payload so future computational-collaborator workflows can receive the current sketch context.

## XP-Pen Deco 640 suggested mapping

The normal XP-Pen driver is enough. Keep **Pressure**, **Tilt**, and **Windows Ink** enabled and leave **Mouse mode** off.

| Deco key | Assignment | Domistika action |
| --- | --- | --- |
| 1 | `Ctrl+Z` | Undo |
| 2 | `Ctrl+Shift+Z` | Redo |
| 3 | `B` | Brush |
| 4 | `E` | Eraser |
| 5 | `[` | Brush smaller |
| 6 | `]` | Brush larger |
| 7 | `G` | Grid |
| 8 | `F8` | PenDeck radial menu |

No AutoHotkey layer is required.

## Runtime bridge

PenDeck exposes `window.domistikaPenDeck` after installation. The stable action names are:

- `brush`
- `eraser`
- `undo`
- `redo`
- `smaller`
- `larger`
- `pan`
- `mirror`
- `symmetry`
- `geometry`
- `cc`
- `radial`

External Domistika modules can dispatch:

```js
window.dispatchEvent(new CustomEvent('pendeck:action', {
  detail: { action: 'mirror' }
}));
```

The CC hook emits `domistika:cc-sketch` with pen telemetry, drawing settings, mirror/symmetry state, and a flattened PNG data URL when a snapshot can be created.
