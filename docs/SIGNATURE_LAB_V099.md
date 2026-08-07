# Domistika Signature Lab v0.9.9

Signature Lab turns a human handwriting gesture into reusable radial geometry without leaving Domistika.

## Modes

- **Signature Mandala** — clean radial repetition around the canvas center.
- **Name Vortex** — inward compression plus rotation drift for iris / tunnel structures.
- **Phrase Bloom** — radial repetition with outward breathing room for longer gestures.
- **Replay Build** — a replay-oriented transform designed to grow the artifact copy by copy.

## Workflow

1. Open **Signature** in the Domistika control deck.
2. Press **Capture New**.
3. Write a name, phrase, symbol, or gesture on the canvas. Multiple pen lifts are grouped into the same capture until you generate or clear it.
4. Choose a mode and adjust Copies, Spiral Pull, Rotation Drift, Ring Spacing, Ink Scale, and Replay Speed.
5. Use **Original + Result**, **Generated**, **Original gesture**, or **Overlay** preview.
6. Generate or Replay.
7. Commit the generated artifact to the active Domistika layer or export it as PNG.

## Pen behavior

Signature Lab records position, pressure, tilt X/Y, twist, and sample time. It uses browser Pointer Events and inherits the native PenDeck pressure path already used by Domistika v0.9.8.

No AutoHotkey is required.

## PenDeck integration

Signature Lab adds a **Signature** action inside the PenDeck panel. `F8` remains PenDeck's radial menu. `F9` opens Signature Lab directly.

## Events

`signaturelab:artifact` carries the generated artifact, source strokes, settings, and gesture metadata.

`domistika:cc-sketch` is also emitted with `source: domistika-signature-lab-v099`, making the generated artifact available to future computational remix tools without changing the drawing engine.

## Output / history

Commit uses Domistika's existing history capture before drawing the transparent generated canvas into the active layer, so the operation participates in normal undo/redo.

## Initial design receipt

This feature was motivated by handwritten-name experiments with high radial symmetry, where ordinary cursive gestures produced complex mandala, iris, and vortex structures.
