# Domistika v0.8.5 — Pro Workspace Upgrade

This release focuses on making Domistika feel more like a serious daily artist studio while preserving its left-handed-first workflow.

## Workspace wheel

The inspector's growing tab strip is replaced on desktop by an animated radial workspace wheel. It discovers the existing Domistika panels at runtime, so Brushes, Layers, 3D Form Lab, Artist Studio, Transform, Layers+, Smart Masks, Spiro tools, Effects, and future panels remain compatible.

- Press **Q** to open or close the workspace wheel.
- Select a wheel item to switch the inspector content underneath it.
- The original tab buttons remain in the DOM for compatibility and accessibility.
- Reduced-motion preferences are respected.

## Professional brush visuals

Brush cards now receive original, programmatically rendered tool illustrations instead of generic line-only previews. Pencil, mechanical pencil, charcoal, ink pen, fountain nib, paint brush, airbrush, and eraser families each receive a recognizable mini tool rendering plus a representative stroke sample.

These visuals are original Domistika illustrations. No scraped commercial product photos or proprietary assets are used.

## Expanded pattern system

The symmetry menu now includes:

- Radial 3, 4, 5, 6, 8, 10, 12, 16, and 24
- Kaleidoscope 6, 8, and 12
- Spiral 5, 8, and 12
- Off-center Orbit 7 and 11
- Diagonal Echo 5 and 9
- Drift Field 7
- Ripple Field 6

The last six families intentionally create structured asymmetry and controlled weirdness rather than perfect mirror symmetry.

## Canvas navigation

- Arrow keys move the canvas when Selection Transform is not active.
- Numpad 2/4/6/8 move the canvas in all normal drawing modes.
- Numpad 1/3/7/9 move diagonally.
- Hold **Shift** for a larger movement step.
- **+** and **−** zoom around the viewport center.
- A compact on-canvas navigation pad provides mouse and touch access to the same movements.

## Compact control deck

The center control deck now wraps into a dense two-row layout on desktop instead of forcing horizontal scrolling. Controls retain their native behavior while using smaller ranges, buttons, and labels. Mobile keeps a horizontal quick-control strip.
