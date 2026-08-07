# Domistika Creature Lab v1.0.0

Creature Lab turns accidental doodles, mirrored forms, and little character sketches into reusable character-discovery artifacts inside Domistika.

## Modes

- **Mirror Creature** — reflects the active-layer drawing into a single symmetric creature.
- **Totem Builder** — uses the same reflected source workflow for vertical, ceremonial forms.
- **Mask Mode** — focuses on mirrored face/mask discovery.
- **Inkblot Character Lab** — treats the source drawing like an inkblot prompt and reflects it into a figure.
- **Little People** — repeats one doodled character into a small cast.
- **Crowd Builder** — creates a tiled crowd with flips, jitter, scale, and spacing variation.

## Controls

Creature Lab includes mirror axis, original/generated/overlay preview, rows, columns, scale, spacing, jitter, source-color preservation, auto palettes, outline pass, commit, and PNG export.

## Workflow

1. Draw a weird shape, mirrored form, or little person on the active Domistika layer.
2. Open **Creature** in the control deck or from the PenDeck panel.
3. Choose a mode and press **Generate**.
4. Tune the geometry and preview.
5. **Commit** writes the generated result to the active layer using Domistika history capture so Undo still works.
6. **Export PNG** saves the generated artifact directly.

## Integration

The module emits `creaturelab:artifact` and `domistika:cc-sketch` events for future CC-assisted refinement, colorization, character sheets, and species-library workflows.

## Follow-on ideas

- Find Character region isolation
- smarter Auto Palette fills
- Character Sheet Mode
- Species Library / local character gallery
- creature-card export
