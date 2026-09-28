# Domistika Color Studio v0.9.24

Domistika v0.9.24 upgrades the existing **Colors** room into a full color workspace.

The goal is simple: keep the quick native color wheel, but make exact colors and reusable palettes much easier to reach.

## Color entry

Color Studio supports:

- native browser color picker;
- HEX / HTML colors such as \`#ff7a18\`;
- numeric RGB;
- numeric HSL;
- a curated CSS named-color list.

All solid-color choices feed the same Domistika drawing color used by brushes, fills, Spiro, scripted strokes, and the stable SDK.

## Recent and favorite colors

Recent colors are stored locally and de-duplicated automatically.

The existing v0.9.1 Favorite Colors bank remains intact and is now shown as the lower section of Color Studio rather than being replaced.

## Harmony

Color Studio derives a small working harmony from the current color:

- analog -30°;
- current color;
- analog +30°;
- triad +120°;
- complement +180°.

Each harmony swatch is directly pickable.

## CSS color shelf

A compact shelf of common CSS colors is included for quick selection, including:

- Coral
- Gold
- Forest
- Teal
- Cyan
- Sky
- Dodger Blue
- Indigo
- Violet
- Orchid
- Hot Pink
- Sienna
- and neutrals

The CSS/name field also accepts exact HEX values.

## Gradient library

The initial gradient shelf contains:

- Sunset
- Aurora
- Deep Ocean
- Ember
- Rose Glass
- Forest Light
- Ultraviolet
- Portal Core
- Moon Glass
- Charcoal

Gradients are real canvas paint, not decorative previews.

Two actions are available:

### Paint behind art

Uses \`destination-over\` to fill transparent pixels on the active layer without covering existing painted pixels.

### Fill active layer

Creates one undo checkpoint, clears the active layer, and replaces it with the selected gradient.

Both operations remain normal Domistika project edits and participate in autosave and export.

## Stable SDK v0.1.3

The stable SDK now exposes:

\`\`\`js
Domistika.colors.open()
Domistika.colors.current()
Domistika.colors.set('#ff7a18')
Domistika.colors.recent()
Domistika.colors.harmony()
Domistika.colors.css()
Domistika.colors.gradients()

Domistika.colors.applyGradient('portal-core', {
  mode: 'behind'
})
\`\`\`

The existing convenience call remains:

\`\`\`js
Domistika.color('#ff7a18')
\`\`\`

and now routes through Color Studio when available so UI, scripts, and agents share the same color state.

## Command palette

The command catalog gains:

\`\`\`text
Open Color Studio
\`\`\`

Search terms include color, colour, hex, rgb, hsl, css, gradient, palette, and wheel.

## Events

Gradient application emits:

\`\`\`text
domistika:gradient-applied
\`\`\`

Color Studio readiness emits:

\`\`\`text
domistika:color-studio-ready
\`\`\`

## Boundaries

Color Studio adds no:

- network access;
- filesystem access;
- arbitrary JavaScript execution;
- remote authority.

Recent colors remain local. Gradient actions only mutate the current Domistika project through the active CanvasEngine.
