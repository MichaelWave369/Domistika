# Domistika v0.9.1 — Grandma's Basement

This release gives Domistika a switchable nostalgic workspace while adding two practical artist tools requested during the PARAWHEEL proving run.

## Grandma's Basement theme

The theme is enabled by default and can be toggled from the top bar.

Its visual language is inspired by late-1960s through early-1980s basement creative spaces and wood-cabinet color televisions:

- walnut woodgrain framing;
- harvest-gold, avocado, burnt-orange, and cream controls;
- raised physical-looking buttons and rotary-dial styling;
- a recessed CRT-like canvas viewport with subtle scanlines and glass shading;
- retro receiver-style status display;
- a "BasementVision Color Creative Console" identity label;
- coordinated retro styling for the workspace wheel, navigator, layers, Tika, dialogs, and tool rail.

The original night-studio appearance remains available through the same theme button. The choice persists locally.

## Tika placement correction

The floating Tika orb now lives in the lower-left of the canvas viewport. This keeps it clear of the lower-right canvas navigator and its movement controls on desktop and mobile layouts.

## Fill tool

A new **Fill** tool appears in the tool rail and uses `F` as its keyboard shortcut.

- Click a bounded region to flood it with the active drawing color.
- Fill opacity follows the current opacity setting.
- Adjustable tolerance controls how closely neighboring pixels must match.
- **All visible** samples boundaries from the visible composite while writing only to the active layer.
- **Active layer** samples only the active layer.
- Alt-click or right-click still invokes the eyedropper behavior.
- Guide Layers remain protected from fill operations.
- Fill operations create a normal undo snapshot.
- A 16-million-pixel safety ceiling prevents accidental browser-memory exhaustion.

## Favorite Colors

A compact color bank now appears beside the primary color control, and a full **Colors** workspace is available through the workspace wheel.

- Save the current color with `+` or **Save current**.
- Click any favorite to make it the active drawing color.
- Remove a full-panel favorite with `×`.
- Right-click a compact swatch to remove it.
- Up to 24 colors persist locally across projects and browser sessions.
- A vivid starter palette is present until the artist saves a personal bank.

## Validation

`npm run check` covers all v0.9.1 modules plus `tests/v091-static.mjs`. The production Vite build remains part of GitHub Actions validation.

## Manual proving checklist

- Toggle between Basement and Night themes and reload to verify persistence.
- Verify the Tika orb no longer overlaps the canvas navigator.
- Fill a closed shape on the active layer and undo it.
- Place line art on one layer, color on another, and test **All visible** sampling.
- Test tolerance at 0, 28, and 100.
- Attempt to fill a locked Guide Layer and verify it is rejected.
- Save, select, and remove favorite colors.
- Verify the Colors workspace appears in the animated workspace wheel.
- Test desktop, left-handed, right-handed, reduced-motion, and mobile layouts.
