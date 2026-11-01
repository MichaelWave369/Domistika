# Domistika XR | Living Studio Environments (Rung 3)

The five existing focused layouts now have distinctive lightweight scenery.

- **Studio Home:** portico, soft cyan pillars and a calm framing wall behind the four room choices.
- **Canvas Atelier:** warm plaster, wood battens, windows, shelving and plant. The artist's easel is the functional painting surface, unchanged from earlier rungs.
- **3D Painting:** magenta/cyan luminous ring architecture behind open-air drawing.
- **Sculpture Forge:** steel wall ribs, distant machine pedestals and restrained teal lighting.
- **Gallery:** soft neutral walls, track-light accents and exhibit architecture behind the reversible painting display.

All environments use local Three.js primitives with no new texture downloads or cloud services. Scene geometry never becomes selectable, painted, serialized, saved, or added to art exports. Only one environment group is visible at any time. Use **Hide scenery** to simplify the desktop/VR scene. In Quest mixed reality passthrough, built-in scenery is hidden automatically to preserve the real environment.

## Acceptance checklist

1. Reload and enter each room. Verify the background changes but no scenery hides the easel, the controller menu, or displayed paintings.
2. Check **Hide scenery** and **Show scenery** in the desktop sidebar. Switching rooms retains the chosen state for the current session without altering project storage.
3. VR: enter, switch rooms with trigger, verify the framed scenery remains behind art and interactive controls. Check draw and select rays only hit functional elements.
4. MR: enter passthrough and verify all decorative geometry disappears (no invented room anchors).
5. Save/export canvas, spatial sketch and workshop assembly. Scenery must never be in their data or 3D GLB exports.
6. Confirm Quest 3 and 3S maintain acceptable frame pacing; feature has no animated scenery, real-time shadows or imported assets.

This rung adds visual identity, **not** actual room-scale locomotion, hand-pinch, dynamic lighting effects, new editor brushes, or multiplayer.
