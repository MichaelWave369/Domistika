# Parallax Creative Interoperability Profile v2

**Protocol identifier:** `parallax.creative-interop.v2`  
**Status:** Candidate pending repository ratification  
**Canonical owned scope:** Domistika → Auralith369 → ParaCut → WaveForgeStudio  
**Optional extension:** WaveForgeStudio → CineSwarm release reference  
**Bridge envelopes:** `parallax.bridge.v2` with explicit v1 compatibility windows

## 1. Purpose

This profile upgrades the creative interoperability chain from byte continuity alone to bound creative lineage while preserving the original v1 authority doctrine.

Native formats remain authoritative. Interop packets are references, evidence, and handoff contracts. They do not become replacement project formats and they do not transfer execution authority.

## 2. Owned canonical chain

```text
Domistika
   ↓ Creative Bridge v2
Auralith369
   ↓ verified protected semantic overlays + finished-art evidence
ParaCut
   ↓ verified native media references + native RenderPlan
WaveForgeStudio
   ↓ receipted reference-only intake
```

## 3. Optional CineSwarm extension

WaveForgeStudio MAY emit:

```text
parallax.creative-interop.v2.cineswarm-reference
```

targeting CineSwarm.

This extension is **not canonical** until an authorized CineSwarm receiver repository independently adopts and verifies the contract.

The extension MUST remain:

- local-only;
- reference-only;
- explicitly user-approved;
- non-networking;
- non-rendering;
- non-publishing;
- non-acquiring;
- non-auto-importing.

The sender packet is an interoperability offer, not evidence of receiver adoption.

## 4. Required authority invariants

Every v2 handoff MUST preserve:

```text
localOnly = true
requiresUserAction = true

real rendering authority       = false
network authority              = false
subprocess authority           = false
automatic import authority     = false
publish authority              = false
media acquisition authority    = false when applicable
```

A hash, receipt, capture, certificate, or successful CI run MUST NOT be interpreted as authorization.

## 5. Creative lineage

A v2 ParaCut → WaveForge handoff MUST carry `creativeLineage` with:

```text
profile
sourceBridgeSchema
sourceTransferId
creativeManifestHash
baseContentHash
overlayContentHashes
semanticOverlayCount
```

It MAY also carry:

```text
auralithCaptureHash
auralithReceiptHash
paraCutAssetHashes
```

All carried hashes MUST be SHA-256 values in `sha256:<64 hex>` form.

### 5.1 Meaning of lineage

Creative lineage proves continuity among explicitly hashed artifacts.

It does not prove:

- authorship;
- ownership;
- copyright status;
- factual truth;
- safety;
- approval to publish;
- approval to render;
- approval to acquire external media.

## 6. Domistika → Auralith

The native contract is:

```text
parallax-creative-bridge v2
```

with:

- gradeable base raster;
- protected `type` / `motion-ignore` overlays;
- base image SHA-256;
- per-overlay SHA-256;
- canonical semantic manifest SHA-256;
- semantic metadata where available.

Creative Bridge v1 remains a compatibility input but does not claim v2 semantic-overlay lineage.

## 7. Auralith evidence

Auralith MAY contribute evidence hashes for:

```text
auralith.capture.png.v1
auralith.receipt
```

When supplied, ParaCut MUST validate their hash syntax and preserve them in lineage.

Presence of those hashes records evidence continuity only.

## 8. ParaCut ingress

ParaCut MUST independently verify Creative Bridge v2:

1. route and envelope;
2. local-only + explicit-user-action boundaries;
3. base image bytes against `baseContentHash`;
4. each overlay image against its `contentHash`;
5. canonical semantic manifest against `contentHash`;
6. envelope/native manifest-hash equality.

ParaCut MUST project the base raster and protected overlays into separate native media references.

ParaCut MUST NOT flatten protected overlays merely to simplify interop.

## 9. ParaCut → WaveForge

The v2 timeline handoff uses:

```text
schema:         parallax.bridge.v2
interopProfile: parallax.creative-interop.v2
source:         ParaCut
target:         WaveForgeStudio
payloadType:    application/vnd.paracut.render-plan+json
```

It MUST include:

- canonical native RenderPlan SHA-256;
- positive `planRevision`;
- creative lineage;
- explicit false authority flags;
- `lineageRef` equal to `creativeManifestHash`.

## 10. WaveForge intake

WaveForgeStudio MUST independently verify:

- v2 route/profile;
- RenderPlan content hash;
- positive `planRevision`;
- creative-lineage hash syntax and cardinality;
- `lineageRef`;
- all explicit false authority flags.

WaveForge MUST receipt:

- bridge hash;
- RenderPlan hash;
- creative-lineage hash;
- creative-manifest hash.

Receipts remain records of observed/accepted data, not authority grants.

## 11. Freshness and replay

The v1 freshness rules remain mandatory for freshness-aware v2 handoffs.

Consumer-owned state tracks the highest accepted `planRevision` per ParaCut project.

Rules:

1. no accepted revision → accept and record;
2. higher revision → accept and advance;
3. same revision + same bridge hash → idempotent replay;
4. lower revision → reject stale rollback;
5. same revision + different bridge hash → reject equivocation.

`createdAt` MUST NOT be used as the freshness oracle.

## 12. Compatibility

### 12.1 Creative ingress

- ParaCut v1 import behavior remains available.
- v1 imports do not claim semantic overlay lineage.
- v2 imports preserve base and overlay references separately.

### 12.2 ParaCut → WaveForge

- WaveForge continues to accept `parallax.bridge.v1`.
- v1 receipts retain v1 schemas.
- v2 uses distinct intake/receipt schemas.

### 12.3 Product versions

Application product versions remain independent of profile version.

## 13. CineSwarm extension boundary

The WaveForge-owned CineSwarm extension may carry a hash-bound reference to a WaveForge final release and optional v2 creative lineage.

Until an authorized CineSwarm receiver adopts the profile:

```text
extensionStatus = unratified_receiver
```

MUST remain explicit.

The sender MUST NOT claim that CineSwarm accepted, imported, acquired, published, rendered, or verified the release.

## 14. Rollback

Each application remains independently rollback-capable.

Rollback MUST NOT:

- rewrite another app's native artifact;
- rewrite historical hashes;
- mutate historical receipts;
- reinterpret a v1 packet as v2;
- convert an unratified extension into a ratified receiver.

## 15. Conformance evidence

Candidate conformance requires:

- native repository CI;
- v2 base/overlay/manifest tamper rejection;
- RenderPlan hash verification;
- creative-lineage continuity tests;
- replay/stale/equivocation tests;
- authority-escalation tests;
- v1 compatibility tests;
- CineSwarm extension fail-closed tests;
- explicit human adoption before canonical promotion.

## 16. Change control

A change MUST identify whether it is compatible or breaking and MUST preserve:

- native authority;
- explicit human authority;
- hash semantics;
- freshness semantics;
- fail-closed behavior;
- receiver-ratification boundaries.

No agent, CI workflow, receipt, or repository may self-promote this candidate to canonical v2.
