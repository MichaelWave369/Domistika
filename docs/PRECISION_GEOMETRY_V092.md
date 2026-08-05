# Domistika v0.9.2 — Precision + Geometry

This release adds exact numeric control, clearer workspace-wheel labeling, extended symmetry families, and dedicated Sacred Geometry and Phi + Fibonacci workspaces.

## Exact numeric entry

Every range slider created in the main studio, inspector workspaces, dialogs, and later-loaded modules receives a synchronized number field.

- Drag the slider for fast visual adjustment.
- Type an exact number for precision.
- Press Enter or leave the field to commit.
- Press Escape to restore the current slider value.
- Values are clamped to the original slider minimum and maximum.
- Decimal slider steps remain decimal-capable.

This applies to brush size, opacity, steady stroke, fill tolerance, layer opacity, lighting controls, effect parameters, and other range-based settings.

## Workspace wheel label

The active workspace name in the normal header is now larger. While the radial wheel is open, hovering or keyboard-focusing any wheel item temporarily displays that item’s full name in the header. Moving away restores the active workspace name.

The tiny labels attached beneath wheel buttons are hidden, eliminating the clipped bottom-item label problem.

## Extended symmetry

The top pattern selector now includes:

- Extended Radial: 7, 9, 14, 18, 20, 30, 32, 36, and 48.
- Extended Kaleidoscope: 16, 18, and 24.
- Extended Spiral: 13 and 21.
- Custom Radial: any whole-number arm count from 2 to 96 through the Sacred Geometry workspace.

Custom radial modes are added to the selector and remain compatible with project restoration.

## Sacred Geometry Lab

A new workspace provides six repeat engines:

1. Vesica Piscis
2. Trinity Circles
3. Seed of Life
4. Flower of Life
5. Metatron Field
6. Hex Cell Lattice

These are drawing-repeat systems, not static clip art. The artist draws one stroke and Domistika places related copies through the chosen geometry. Each mode also supplies a non-exporting visual guide through the existing symmetry overlay.

## Phi + Fibonacci Lab

A second workspace provides six growth-oriented engines:

1. Phi Spiral 13
2. Phi Bloom 21
3. Golden Angle 34
4. Fibonacci Ring 13
5. Fibonacci Echo 8
6. Phi Mirror 12

The modes use the golden ratio, golden angle, Fibonacci counts, progressive scale, and proportional spacing. They intentionally create related growth patterns rather than only perfect mechanical repetition.

## Validation

The production validation command checks all v0.9.2 modules, runs the v0.9.2 static contract suite, and completes a Vite production build.

## Manual proving checklist

- Type exact values into brush size, opacity, steady, and fill tolerance.
- Confirm sliders and number fields remain synchronized both directions.
- Open the workspace wheel and hover every item, especially the bottom item.
- Apply every Sacred Geometry mode and verify both repeated strokes and visible guides.
- Apply every Phi + Fibonacci mode and test small and large brush sizes.
- Create custom radial counts at 2, 37, 48, and 96.
- Save and reopen a project using a custom radial count.
- Test Night Studio and Grandma’s Basement themes.
- Test left-handed and right-handed layouts.
- Confirm exports do not include symmetry guides.
