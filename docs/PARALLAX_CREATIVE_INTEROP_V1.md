# Parallax Creative Interoperability Profile v1

**Protocol identifier:** `parallax.creative-interop.v1`  
**Status:** Canonicalization candidate pending Pass-9 repository ratification  
**Scope:** Domistika → Auralith369 → ParaCut → WaveForgeStudio  
**Parent envelope:** `parallax.bridge.v1`

## 1. Purpose

This profile standardizes a bounded, local-first creative handoff across four independently runnable applications without merging their native data models or transferring execution authority.

Native formats remain authoritative. Parallax envelopes are interoperability contracts, not replacement project formats.

## 2. Canonical chain

```text
Domistika
   ↓ native Creative Bridge v1
Auralith369
   ↓ verified creative compatibility view
ParaCut
   ↓ verified native media import
   ↓ native RenderPlan
WaveForgeStudio
   ↓ reference-only receipted intake
```

## 3. Required invariants

### 3.1 Byte integrity
- Producers that claim `contentHash` MUST compute it from the actual payload bytes.
- Receivers MUST independently recompute and verify the claimed SHA-256 before exposing or importing the payload.
- Hash mismatch MUST fail closed.
- A hash proves byte identity only. It does not prove authorship, rights, truth, safety, or permission.

### 3.2 Local/user authority
- `localOnly` MUST remain `true` for this profile.
- `requiresUserAction` MUST remain `true`.
- A valid bridge MUST NOT authorize rendering, network calls, subprocess execution, automatic media import, publishing, or promotion.

### 3.3 Native authority
- `parallax-creative-bridge-v1` remains the native Domistika/Auralith browser-local bridge contract.
- ParaCut native media-import structures remain authoritative for ParaCut ingestion.
- ParaCut native `RenderPlan` remains authoritative for planned media execution.
- WaveForge native intake/receipt structures remain authoritative for WaveForge custody.

### 3.4 Receipts
A receipt records what a component observed or accepted. A receipt MUST NOT retroactively authorize an action.

### 3.5 Freshness
For freshness-aware ParaCut → WaveForge handoffs:
- `planRevision` is an optional positive integer issued by the ParaCut/project authority.
- Omitting `planRevision` preserves legacy reference-only compatibility but does not claim freshness-aware acceptance.
- WaveForge/consumer state owns the highest accepted revision per project.

Rules:
1. no accepted revision → accept and record;
2. higher revision → accept and advance;
3. same revision + same bridge hash → idempotent replay;
4. lower revision → reject stale rollback;
5. same revision + different bridge hash → reject equivocation.

`createdAt` alone MUST NOT be used as the freshness oracle.

## 4. Compatibility guarantee

A conforming v1 implementation MUST preserve the previously proven Pass-5 bridge shape when optional v1 freshness metadata is omitted.

Unknown additive fields SHOULD be preserved or ignored safely unless they violate a required invariant.

A v1 consumer MUST NOT require a field that a conforming legacy-reference-only v1 packet is explicitly allowed to omit.

## 5. Versioning

Protocol versioning is independent of product release versions.

- Canonical protocol ID: `parallax.creative-interop.v1`
- Parent bridge envelope: `parallax.bridge.v1`
- Backward-compatible additive changes remain within v1 only when all required invariants and legacy packet behavior remain unchanged.
- Any change that alters required authority, trust, hash, freshness, or fail-closed semantics requires a new major profile identifier.

Product tags such as application `v0.x` or `v1.x` MUST NOT be interpreted as protocol versions.

## 6. Deprecation policy

A v1 field or behavior may be deprecated only when:
1. the replacement is documented;
2. legacy behavior remains readable for at least one published compatibility window;
3. affected consumers have a migration path;
4. no security boundary is silently weakened;
5. deprecation never grants new execution authority.

Removal of a required v1 invariant requires a new major profile.

## 7. Rollback policy

Each application remains independently rollback-capable.

Rollback of one application MUST NOT:
- rewrite another application's native artifacts;
- invalidate historical receipts;
- mutate historical hashes;
- silently reinterpret old packets as newer revisions.

If a promoted implementation regresses, the affected repository may revert independently while historical evidence remains immutable.

## 8. Canonicality boundary

Canonical status for this profile means only:

> These four applications agree on the bounded interoperability semantics defined here.

It does NOT mean:
- all Parallax contracts are canonical;
- all Parallax repositories must implement this profile;
- `parallax.bridge.v1` is a universal application schema;
- the applications are one product;
- receipts prove truth or legal rights;
- passing CI grants execution authority.

## 9. Conformance evidence

The canonicalization decision may rely on:
- branch-level native CI;
- ordered main-branch promotion;
- 356-byte deterministic real-artifact continuity;
- SHA-256 binding of artifact, ParaCut RenderPlan, and ParaCut → WaveForge bridge;
- adversarial fail-closed coverage;
- replay/freshness tests;
- post-merge main-branch CI.

Conformance is scoped to the tested behavior and versions. It is not a blanket safety certification.

## 10. Change control

A proposed change to this profile MUST:
1. identify whether it is additive-compatible or breaking;
2. include updated fixtures/tests;
3. preserve native-authority boundaries;
4. preserve explicit human authority;
5. include migration/rollback notes;
6. pass affected native repository gates;
7. receive an explicit human adoption decision before canonical promotion.

## 11. Release decision

Canonical adoption requires a separate explicit decision record after all participating repositories carry the same frozen profile text/hash and pass their native gates.

No repository, test, or automated agent may self-promote the profile to a new canonical major version.
