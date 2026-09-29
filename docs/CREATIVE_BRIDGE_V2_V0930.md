# Domistika v0.9.30 — Creative Bridge v2: Semantic Overlay Handoff

Creative Bridge v2 separates protected semantic overlay layers from the raster artwork that Auralith is expected to grade.

## Contract

\`\`\`text
protocol: parallax-creative-bridge
version:  2
storage:  parallax-creative-bridge-v2
source:   domistika
target:   auralith369
\`\`\`

The package remains local-first and same-origin.

## Layer projection

Domistika projects its layer semantics into the handoff as follows:

\`\`\`text
paint          → base raster
guide          → excluded by existing guide/export behavior
type           → protected raster overlay
motion-ignore  → protected raster overlay
\`\`\`

The base raster is composed without the protected overlay layer IDs.

Protected layers are transferred as transparent WebP images at the same scaled dimensions as the base.

This prevents the same title pixels from existing in both the base and overlay.

## Why raster overlays

Domistika’s current type tools ultimately paint glyphs onto canvas layers.

Reconstructing those glyphs from guessed fonts and layout metrics in Auralith would make the bridge less faithful, not more.

Creative Bridge v2 therefore preserves two things separately:

\`\`\`text
appearance → transparent raster overlay
meaning    → semantic metadata when available
\`\`\`

A type layer remains visually exact even when a receiving environment does not have the same font.

## Semantic text metadata

New Ink + Type placements record a bounded descriptor on their layer:

\`\`\`text
schema: domistika.semantic-text.v1
kind:   text
text
font
mode
size / weight / italic
tracking / lineHeight / rotation
fill / stroke / opacity
normalized x / y
alignment
preserveDuringStyle
\`\`\`

Existing \`type\` and \`motion-ignore\` layers do not need this metadata in order to be protected.

The raster overlay remains the visual authority for the handoff.

## Integrity model

Creative Bridge v2 binds three integrity levels.

### Base image

\`\`\`text
baseContentHash = SHA-256(base image bytes)
\`\`\`

### Every overlay

\`\`\`text
overlay.contentHash = SHA-256(overlay image bytes)
\`\`\`

### Manifest

A canonical manifest covers:

- route and protocol version;
- transfer timestamp;
- project name;
- canvas dimensions;
- palette;
- symmetry;
- note;
- base image hash;
- overlay IDs;
- roles;
- names;
- source layer IDs;
- preserve flags;
- opacity / blend mode;
- semantic metadata;
- overlay hashes.

\`\`\`text
contentHash = SHA-256(canonical manifest)
\`\`\`

Changing base pixels, overlay pixels, or protected semantic metadata invalidates the package.

## Stable SDK

Domistika stable SDK v0.1.8 adds:

\`\`\`js
await Domistika.bridge.auralith.transfer()
\`\`\`

The result is a lightweight transfer receipt:

\`\`\`js
{
  ok,
  protocol,
  version: 2,
  key,
  target: 'auralith369',
  maxDimension,
  overlayCount,
  baseContentHash,
  contentHash
}
\`\`\`

The live capability snapshot now exposes:

\`\`\`js
Domistika.capabilities().bridge.auralith
\`\`\`

with the bridge version and semantic-overlay support.

## Native WebMCP

Site tools v0.1.1 adds:

\`\`\`text
domistika_transfer_to_auralith
\`\`\`

It calls the same stable SDK transfer method.

There is no separate native-agent bridge implementation.

## Compatibility

Auralith continues to accept Creative Bridge v1 packages.

Domistika v0.9.30 emits v2 packages by default.

The historical global:

\`\`\`js
window.domistikaAuralithBridgeV093
\`\`\`

remains available for compatibility and now reports:

\`\`\`js
protocolVersion: 2
\`\`\`

## Acceptance target

The v2 live acceptance target is:

\`\`\`text
title authored in Domistika
→ transfer v2
→ Auralith verifies base + overlay + manifest
→ base artwork imported
→ protected title overlay imported separately
→ Moonlight / Vignette / cinema_369 applied
→ title remains readable
→ capture
→ receipt records semantic provenance
\`\`\`

## Contracts

\`\`\`text
Domistika app:      0.9.30
Stable SDK:         0.1.8
SDK schema:         domistika.sdk.v1
Site tools:         0.1.1
Site-tool schema:   domistika.site-tools.v1
Bridge protocol:    parallax-creative-bridge v2
Text metadata:      domistika.semantic-text.v1
\`\`\`
