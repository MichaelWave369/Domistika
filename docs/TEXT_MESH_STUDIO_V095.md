# Domistika v0.9.5 — Editable 3D Text Mesh Studio

Domistika v0.9.5 replaces the prior “3D-looking” text boundary with a real Three.js mesh workflow inside **Ink + Type → 3D Mesh**.

## Included

- Real `TextGeometry` extrusion using bundled Three.js typeface fonts.
- Per-character geometry so multiline text supports tracking, line height, and left/center/right alignment.
- Live depth, curve quality, bevel size, bevel thickness, and bevel enable/disable controls.
- Matte, chrome, neon, glass, and toon material systems with separate front and side colors.
- Orbit camera plus front, isometric, side, and top camera presets.
- Blender-style `TransformControls` gizmos for move, rotate, and scale.
- World/local transform axes and optional translation/rotation/scale snapping.
- Floor/grid editor environment and auto-spin presentation preview.
- Transparent PNG export.
- Undoable transparent baking into the active Domistika paint layer.
- Binary GLB export preserving mesh geometry, materials, and transforms.
- Project persistence for all geometry, material, stage, and transform settings.

## Local-first boundary

Text geometry is generated entirely in the browser. No text, artwork, or mesh data is uploaded. The font data is resolved from Domistika's pinned Three.js package during the Vite build.

## Canvas bake workflow

1. Build and pose the mesh in the 3D editor.
2. Choose the bake width and canvas position.
3. Select **Bake to active layer**.
4. Domistika renders a transparent PNG internally and composites it onto the active paint layer as one undoable operation.

## Export workflow

- **Transparent PNG** creates a high-resolution 2D render for other creative tools.
- **GLB** creates a portable 3D asset for Blender, Unreal Engine, Three.js, game engines, and compatible viewers.

## Proving checklist

- Create single-line and multiline text with each included font.
- Test negative and positive tracking and every alignment mode.
- Toggle bevels and verify depth/curve controls rebuild geometry.
- Verify all five materials and independent front/side colors.
- Move, rotate, and scale with world and local axes.
- Verify snapping in all three transform modes.
- Bake at multiple widths and positions, then undo each bake.
- Export transparent PNG and GLB.
- Save and reopen a `.domistika` project and confirm the mesh editor state returns.
