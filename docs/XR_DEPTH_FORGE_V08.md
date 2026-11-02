# Domistika XR · The Depth Forge (Rung 8)

## What it does

Take a **layered painting** from Canvas Studio, use **Lift to 3D** to move into 3D Painting, and switch on **Depth Forge**. Each visible 2D painting layer is rendered into its own translucent 3D plane with adjustable real spacing. As you move your head sideways in Quest 3, near layers shift relative to distant layers. This is genuine geometric parallax from separate planes, not inferred depth from a single flat image.

An original unlayered painting can still be lifted as an ordinary flat panel. To use Depth Forge, first create at least two painting layers in Canvas Studio (Rung 6).

### Controls

Desktop: in the Living Canvas sidebar use **Depth on/off**, **More depth**, **Less depth**, or **Reset depth**. The status line reports the selected painting's mode, visible layer count, and spacing in meters.

Quest: after lifting a canvas, use the Living Canvas in-world deck at the right of 3D Painting. The same **DEPTH ON/OFF**, **DEPTH +**, **DEPTH -**, **DEPTH RESET** buttons operate on the selected panel through controller rays. Grab the framed artwork to move it with either Quest controller. Release to place it. The original position, brushwork, and layers are unaffected.

### Rendering and ownership

- Depth spacing is bounded from **0.01 to 0.15 meters** between visible planes, with **0.055 m** initial spacing.
- At most **eight painting layers** (existing Layer Studio cap) and **six lifted paintings** (existing Living Canvas cap). Preview textures use a maximum **512-pixel longest dimension** for headset-friendly memory use; originals remain 1024×720 at their existing quality.
- Only visible layers are rendered. Each layer's strokes and its eraser are replayed independently into a transparent Canvas2D bitmap. The compositing order matches the painting stack, bottom to top.
- The flat shared source texture is **not** modified or disposed. Depth Forge owns and disposes *only* its temporary per-layer textures.
- Previews refresh after a stroke finishes or layer visibility/order changes, and after undo/redo. They are not re-rasterized every headset frame.
- All depth settings and panel positions are **session-only**. This rung does not change domistika.xr.scene.v1 or any persistent localStorage, JSON, PNG, spatial brush, workshop or gallery formats.
- Turning Depth Forge off restores the original flat composited panel. Returning the panel cleans up depth textures without touching the source.

### Device field checklist

1. In Canvas Studio create a Background drawing plus a foreground layer, and lift the painting.
2. Toggle Depth on. Move your head sideways to confirm near and far art shift relative to each other.
3. Change depth spacing, grab the art with both Quest controllers, rotate/move/resize, and reset.
4. Hide a Canvas layer, return to 3D Painting, confirm the depth preview reflects the change. Repeat for an erase stroke.
5. Toggle Depth off and return. Reopen Canvas Studio and confirm every layer, stroke, color and original transform is preserved.
6. Open an old one-layer project. Lifting should work; attempting depth should give a clear instruction to add layers.
7. Watch real device performance, accessibility and usability. Automated tests do not prove headset comfort.

**Not included:** 3D inferred height maps, mesh extrusion, collision interiors, physically based cast shadows, saved world placements, walking inside a painting, or Silicon Louvre publishing. Those should be separate future rungs.
