# Domistika Command Palette v0.9.23

Domistika v0.9.23 adds a searchable command palette backed by the stable SDK command bus.

Open it with:

```text
Ctrl/Cmd + K
```

or use the **Commands** button in the top bar.

## Architecture

The palette does not own feature behavior.

```text
Command Palette
      ↓
Domistika.commands.catalog()
      ↓
Domistika.commands.execute(id)
      ↓
stable SDK
      ↓
versioned Domistika runtimes
```

That keeps search/UI separate from execution semantics.

## Search

Commands are searchable by:

- label
- command id
- category
- description
- keywords
- shortcut

Exact and prefix matches rank above loose description matches.

Keyboard navigation:

- Up / Down: move selection
- Enter: execute
- Escape: close
- Ctrl/Cmd+K: open or close

## Initial categories

### Canvas

- Undo
- Redo
- Fit Canvas
- New Canvas
- Clear Active Layer

### Tools

- Pencil
- Ink
- Marker
- Airbrush
- Eraser

### Rooms

- Color Studio
- Spiro Lab
- Motion Studio
- Gallery
- Creature Lab

### Motion

- Play / Stop
- 3·6·9 Portal
- Hypnosis
- Slow Drift
- Chaos
- Ghost Mandala
- Particle Portal
- Start Motion Recording
- Stop Motion Recording
- Download Latest Motion Clip

### Export

- Open Export
- Export PNG Blob

### Help

- Keyboard Shortcuts

## Stable SDK v0.1.2

The public SDK advances to `0.1.2`.

The command surface remains backward compatible:

```js
Domistika.commands.list()
await Domistika.commands.execute('motion.portal')
```

and now adds:

```js
Domistika.commands.catalog()
```

A catalog entry contains bounded metadata:

```js
{
  id,
  label,
  category,
  description,
  keywords,
  shortcut
}
```

The palette uses that metadata rather than carrying its own hidden command table.

## Events

The palette emits:

- `domistika:command-palette-ready`
- `domistika:command-palette-open`
- `domistika:command-palette-close`
- `domistika:command-palette-executed`

The underlying SDK still emits `domistika:sdk-command` after successful execution.

## Boundaries

The command palette adds no:

- network access
- arbitrary JavaScript execution
- filesystem access
- raw canvas access
- remote authority

It can only execute commands already registered through the stable SDK command bus.
