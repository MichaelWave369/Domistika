# Domistika v0.9.31 — Semantic Role + Motion Policy

Domistika now separates what a layer **means** from how Kinetic Motion should treat it.

## Contract

```text
role:
  paint
  guide
  type

motionPolicy:
  inherit
  animate
  ignore
```

A title can therefore remain:

```js
{
  role: 'type',
  motionPolicy: 'ignore'
}
```

without one setting overwriting the other.

## Legacy migration

Projects saved with the old pseudo-role:

```text
role: motion-ignore
```

restore as:

```text
motionPolicy: ignore
```

and infer semantic role as:

```text
type   when semantic text metadata exists
paint  otherwise
```

The stable SDK command `layer.role.motion-ignore` remains as a compatibility alias, but it now changes only `motionPolicy`.

## Kinetic Motion

Kinetic source snapshots now exclude layers by:

```js
layer.motionPolicy === 'ignore'
```

and static preview visibility is driven by:

```text
data-motion-policy="ignore"
```

Semantic roles no longer control motion behavior.

## Stable SDK

```text
App:        0.9.31
SDK:        0.1.9
Site tools: 0.1.2
```

New SDK surfaces:

```js
Domistika.layers.motionPolicy(layerId, 'ignore')
Domistika.layers.motionPolicies()
```

New commands:

```text
layer.motion.ignore
layer.motion.animate
layer.motion.inherit
```

## Native site tools

```text
domistika_set_layer_role
domistika_set_layer_motion_policy
```

are separate bounded actions.

## Creative Bridge v2

Protected overlay selection now uses:

```text
role == type
OR
motionPolicy == ignore
```

A semantic title transfers to Auralith as `role: type` even when motion is ignored.
