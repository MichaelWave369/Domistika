# Native Creative Chain Acceptance 001

**Status:** PASS  
**Observed date:** 2026-09-28  
**Domistika:** `0.9.29`  
**Auralith369:** `v0.7.1-alpha`  
**Auralith stable SDK:** `0.1.0`

## Purpose

This record preserves the first observed end-to-end Domistika → Auralith creative workflow using the live stable application APIs and the verified local creative bridge.

## Source project

Domistika created:

```text
Harbor for Auralith
```

The scene included rendered artwork plus a title authored on a `motion-ignore` layer.

## Bridge handoff

The live bridge wrote:

```text
localStorage["parallax-creative-bridge-v1"]
protocol: parallax-creative-bridge
source:   domistika
target:   auralith369
```

Observed transfer call:

```js
domistikaAuralithBridgeV093.transfer()
```

Observed SHA-256 prefix:

```text
sha256:66de68e8…
```

Only the observed prefix is recorded because the complete digest was not preserved in the acceptance notes.

## Auralith receive

Auralith's official receive path reported:

```text
project: Harbor for Auralith
size:    1400 × 1000
hash:    verified
```

## Finishing chain

The live Auralith run exercised:

```js
A.image.open(payload.image)
A.lut.apply('moonlight')
A.fx.apply('vig')
A.style.apply('cinema_369')
A.receipts.export()
```

The resulting finish applied a nocturnal grade, vignette, 369 Cinema treatment, RGB split details, and prism-like orbit treatment around the moon.

## Receipt evidence

The returned receipt identified:

```text
kind:    auralith.receipt
version: v0.7.1-alpha
```

and included an image hash, PHI constants, layer stack, and finishing state.

## What held

- Domistika authored the source artwork
- `motion-ignore` behaved correctly before transfer
- bridge payload was hash-bound
- same-origin handoff was visible to Auralith
- Auralith accepted the verified transfer
- image open worked through the stable API
- LUT / FX / Style Card IDs resolved live
- creative receipt generation completed

## Known limitation: raster handoff

The current bridge transfers rendered pixels.

The Domistika title therefore crossed as pixels rather than editable type metadata.

Auralith's 369 Cinema chromatic treatment affected those title pixels like any other image content.

This is expected under the current bridge contract and is not an Acceptance 001 failure.

## Conclusion

**PASS**

```text
Sketch in Domistika
→ verified bridge
→ grade in Auralith
→ receipt
```

This acceptance proves the core stable application-language and bridge chain observed in the live run. It does not claim exhaustive validation of every browser, WebMCP transport, GPU mode, or future bridge schema.
