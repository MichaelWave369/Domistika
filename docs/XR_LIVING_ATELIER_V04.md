# Domistika XR · Living Atelier (Rung 4)

This rung upgrades the Canvas Studio with a **visible Quest controller brush**, a paint-target cursor, and an **ergonomic easel fit**. The existing raycast + trigger model continues to author real strokes: this is not physical bristle-contact painting, pressure simulation, or hand-pinch tracking.

## Painting
- Enter **Canvas Studio**.
- On Quest: look at the easel. A stylized paintbrush appears attached to each controller in Canvas draw mode. Aim the ray at the canvas. The small paint marker identifies the exact canvas intersection. Hold trigger to draw, release to finish.
- On desktop: draw by mouse as before; no simulated hand is needed.
- Change colors with the wooden palette or sidebar.

## Easel adjustments
- Sidebar: adjust **Height** (1.10–1.85 m), **Tilt** (-25 to +25 degrees) and **Distance** (1.05–2.00 m). Reset restores the initial setup.
- In Quest Canvas Studio: use the **EASEL FIT** panel to nudge Up, Down, Tilt, Near, Far, or Reset with the controller ray.
- Easel stand remains a lightweight visual prop; adjustments move the painting support and canvas, not a physically simulated articulated stand.
- Fitting is session-only and affects only the currently presented canvas. Original canvas transforms remain available to the v1 scene serializer, exports and local saves.

## Safeguards
- Do not adjust fit during an active mouse/controller stroke. Release the trigger before using an adjustment button.
- Brush geometry and marker are raycast-inert and never included in art exports.
- Canvas project schema, spatial paint data, and workshop assemblies remain unchanged.
- When the Canvas room is exited, the original canvas pose is restored.
- Mixed reality uses the same controller targeting but retains passthrough visibility.

## Field verification
1. In Quest 3 or Quest 3S, check controller brush alignment on both hands and confirm that the tip cursor matches the actual painted position.
2. Draw on an upright canvas; tilt and raise the easel, draw again, and export PNG.
3. Save scene JSON during adjusted presentation; after reload, original board placements should remain intact.
4. Switch between different canvases and then other rooms, confirming no strokes or transforms were lost.
5. Test seated and standing, near/far fits, UI reachability, and controller comfort.

Automated tests validate bounds and structural integration; physical Quest fit and usability are not yet certified.
