# Domistika v0.9.11 — Character Sheet Mode + Species Library

This release turns the little characters discovered in Creature Lab into things the artist can keep.

## Character Sheet Mode

Capture the visible content of the active layer, crop it to the occupied pixels, add metadata, and export a formatted character sheet.

Layouts:
- 1-up
- 4-up
- 9-up

Metadata:
- name
- species / type
- mood / role
- notes / lore
- custom sheet title

## Species Library

Saved creatures live locally in the browser under `domistika-species-library-v0911`.

The library supports:
- local-first persistence
- up to 24 compact creature entries
- searchable name / species / mood / notes
- load a saved creature into the active layer
- export a sheet from a saved creature
- delete an entry

Creature images are compacted before storage to reduce browser quota pressure.

## Runtime bridge

`DomistikaRuntimeBridgeV0911.js` loads before `main.js` and exposes the live CanvasEngine instance through `window.__domistikaEngine`, then emits `domistika:ready`.

This gives later feature modules a stable runtime contract and also makes the existing Creature Lab runtime access deterministic.

## PenDeck

The PenDeck panel receives a `Characters` action that opens Character Sheet / Species Library.

## Next slices

- Find Character region isolation
- Auto Palette
- Creature Card templates
- replay / timelapse export
