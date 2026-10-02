# Domistika v0.9.37 — Layer Housekeeping

Layer Housekeeping adds the small structural controls that make a serious composition survivable after the interesting part is over.

The field brief called for:

- layer rename;
- lock;
- group;
- merge down;
- lock enforcement against fold / symmetry and Art Director writes;
- merge down as one undo step.

Rename already existed. v0.9.37 completes the rest.

## Lock

Every layer now persists:

```text
locked: true | false
```

A locked layer rejects pixel writes from:

- direct drawing;
- shape commits;
- ordinary symmetry;
- Composition Plate regional symmetry;
- stable SDK strokes;
- Recipe Artifacts;
- Agent Art Director when it targets the active layer;
- clear-layer operations;
- merge-down if either participating layer is locked.

The implementation is intentionally slightly stricter than the minimum field-brief rule. The brief required fold and director writes to be blocked; Domistika also blocks direct pixel editing so the lock behaves like an actual layer lock instead of a special-case agent veto.

Metadata remains editable while locked: name, visibility, opacity, role, motion policy, group assignment, and stacking order can still change.

## Groups

Groups are organizational folders only.

They do **not** introduce:

- group compositing;
- inherited opacity;
- group masks;
- group transforms;
- nested groups.

Each layer stores an optional `groupId`. The project stores a bounded list of group ids and names.

This keeps the first group implementation boring on purpose.

## Merge down

**Merge down** flattens the active layer into the layer immediately below it.

The operation:

1. snapshots both layers;
2. composites target pixels, then source pixels with their current opacity and blend modes;
3. normalizes the surviving target to opacity `1` and blend mode `normal`;
4. removes the source layer;
5. records one structural undo entry.

Undo restores both original layers, their metadata, order, group assignment, lock state, semantic overlays, and pixels.

Redo reapplies the merged result without manufacturing another history entry.

Merge down is rejected when:

- there is no lower layer;
- the source layer is locked;
- the target layer is locked.

## Project persistence

`.domistika` projects now persist:

```text
layerGroups[]
layers[].locked
layers[].groupId
```

Old projects load with an empty group list, unlocked layers, and no group assignment.

## Studio controls

The Layers panel adds:

- quick lock / unlock on each row;
- **Lock layer** property;
- **Group** assignment;
- **+ Group**;
- **Merge down**.

Existing layer-name inputs remain the rename control.

## Stable SDK

Stable SDK v0.1.14 adds:

```js
Domistika.layers.lock(layerId, true)
await Domistika.layers.mergeDown(layerId)

Domistika.layers.groups.list()
Domistika.layers.groups.create('Wardens')
Domistika.layers.groups.assign(layerId, groupId)
Domistika.layers.groups.rename(groupId, 'Guardians')
Domistika.layers.groups.delete(groupId)
```

Layer descriptors now include:

```text
locked
groupId
```

The command catalog also exposes:

```text
layer.lock
layer.unlock
layer.merge-down
```

## Authority rule

Composition Plates determine **where generated structure may go**.

Layer locks determine **whether a target may be written at all**.

A transformation being mathematically available is not permission to modify a protected layer.
