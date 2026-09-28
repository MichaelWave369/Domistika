# Domistika Layer Roles v0.9.26

Domistika v0.9.26 gives every layer a persisted semantic role.

## Roles

\`\`\`text
paint
guide
type
motion-ignore
\`\`\`

The role is stored in \`.domistika\` project data and restored with the layer.

## Kind versus role

Older Domistika systems already use implementation metadata such as:

\`\`\`text
kind: guide
\`\`\`

That contract remains intact.

The new split is:

\`\`\`text
kind = implementation behavior
role = creative / semantic intent
\`\`\`

A real Superphase guide layer is always forced to:

\`\`\`text
kind: guide
role: guide
\`\`\`

and keeps its existing lock/export behavior.

## Layers UI

The Layers panel now shows a role selector for the active layer and a compact role badge in each layer row.

Guide layers report Guide and keep that role locked to their guide implementation.

## Motion ignore

A layer with:

\`\`\`js
role: 'motion-ignore'
\`\`\`

is excluded from the Kinetic source snapshot.

During Motion preview:

- normal visible artwork is represented by the Kinetic stage;
- the motion-ignore layer stays visible in its authored position;
- Stop still returns to the untouched authored layer stack.

This is useful for:

- titles;
- signatures;
- frames;
- captions;
- annotations;
- static foreground elements.

## Stable SDK v0.1.5

\`\`\`js
Domistika.layers.list()

Domistika.layers.role(layerId, 'type')
Domistika.layers.role(layerId, 'motion-ignore')

Domistika.layers.roles()
\`\`\`

Layer metadata returned by the stable SDK now includes:

\`\`\`js
{
  id,
  name,
  visible,
  opacity,
  blendMode,
  role
}
\`\`\`

## Commands

The stable command bus adds:

\`\`\`text
layer.role.paint
layer.role.type
layer.role.motion-ignore
\`\`\`

So the Command Palette can find phrases such as:

\`\`\`text
exclude layer motion
title static
layer type
\`\`\`

## Project compatibility

Projects without a role restore as:

\`\`\`text
paint
\`\`\`

unless the existing layer metadata identifies the layer as a real guide.

This keeps old projects compatible.
