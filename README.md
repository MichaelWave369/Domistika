# Domistika

**A free, lefty-friendly drawing studio for the open web.**

Domistika is an independent browser art application created for artists who want a focused sketching space without subscriptions, locked tools, or device-specific installs. The interface defaults to a left-handed layout and can flip instantly for right-handed artists.

> Domistika is inspired by the broad category of professional digital sketchbooks. It is not affiliated with, endorsed by, or a copy of Sketchbook, Autodesk, or Sketchbook, Inc. No proprietary assets or source code are used.

## Live app

`https://michaelwave369.github.io/Domistika/`

## Core studio

- Pressure-aware pencil, ink, marker, airbrush, and eraser
- Adjustable brush size, opacity, and steady-stroke smoothing
- Line, rectangle, and ellipse tools
- Vertical, horizontal, four-way, and radial symmetry
- Layer creation, duplication, visibility, opacity, reordering, and blend modes
- Undo and redo for drawing operations
- Pan, zoom, fit-to-screen, grid overlay, and eyedropper
- PNG/JPEG export with optional transparent PNG background
- Editable `.domistika` project downloads
- Image and Domistika project import
- IndexedDB local autosave and recovery
- Left-handed and right-handed layout switching
- WebGL2/Three.js 3D Form Lab for lighting and volume reference
- Responsive desktop, tablet, and mobile layouts

## v0.2 — Brush Engine

- Stamp-based stroke renderer
- 43 built-in sketching, inking, painting, texture, airbrush, and eraser presets
- Brush spacing, scatter, rotation jitter, grain, hardness, and flow
- Round, flat, chisel, square, rake, and splatter tip shapes
- Pressure-to-size and pressure-to-opacity controls
- Stylus tilt influence
- Local wet-color mixing
- Searchable brush shelf, categories, and favorites
- Brush Lab for live tuning
- Locally saved custom brushes
- Brush profiles preserved in `.domistika` projects

## v0.3 — Artist Play Studio

- Floating, draggable reference image board
- Reference opacity, scale, rotation, and mirror controls
- Drag-and-drop reference loading
- Automatic eight-color palette extraction
- Clickable extracted color swatches
- Persistent recent-color history
- Complementary, analogous, triadic, and split-complementary harmonies
- Stroke-by-stroke time-lapse recording
- In-app time-lapse playback
- WebM process-video export where browser support is available
- PNG storyboard export

## v0.4 — Selection & Transform

- Rectangular and freehand lasso selection
- Direct canvas manipulation with drag-to-move controls
- Corner handles for proportional scaling
- Rotation handle and precise rotation slider
- Horizontal and vertical flipping
- Pixel nudging with buttons or arrow keys
- Select-all support
- Internal cut, copy, paste, and duplicate clipboard
- Delete selected pixels without affecting the rest of the layer
- Commit creates one clean undo step
- Cancel restores the untouched original layer snapshot
- Desktop, tablet, phone, and keyboard workflows

## v0.5 — Smart Selection & Masks

- Magic-wand selection for connected regions
- Global color-range selection
- Adjustable color tolerance
- Grow, shrink, feather, and invert selection refinement
- Copy or cut selected pixels into a new layer
- Clear only smart-selected pixels
- Non-destructive layer masks that preserve the underlying canvas
- Enable, disable, invert, update, or remove masks
- Mask-aware PNG/JPEG export and layer compositing
- Reusable named selection channels
- Layer masks and channels preserved in `.domistika` projects
- Dedicated Smart Select tool, control-bar launcher, and inspector panel
- Desktop, tablet, mobile, and keyboard workflows

## v0.6 — Advanced Transform & Layer Logic

- Full-layer perspective warp with four-corner control
- Freeform 3×3 mesh warp
- Adjustable warp rendering quality
- Non-destructive live warp preview with Commit, Cancel, and Reset
- Warp commits as one undoable operation
- Linked masks warp with their artwork; unlinked masks stay in place
- Clipping chains that constrain layers to the alpha beneath them
- Consecutive clipped layers form reusable clipping groups
- Editable mask-painting mode with Hide and Reveal brushes
- Mask-paint session undo and redo
- Enable, disable, remove, link, or unlink editable masks
- Existing v0.5 smart masks are preserved when v0.6 editing begins
- Mask thumbnails and CLIP/MASK indicators in the Layers list
- Mask-aware export, compositing, autosave, and `.domistika` project restore
- Dedicated Layers+ launcher and inspector panel

## v0.7 — Spiro Lab

- Spirograph-style pattern generator for the active drawing layer
- Hypotrochoid and epitrochoid curve families
- Live preview using the current Domistika drawing color
- Classic, flower, starburst, orbit, and gear presets
- One-click generative randomizer
- Adjustable ring radius, wheel radius, pen offset, diameter, turns, line width, opacity, rotation, and quality
- Draw-at-center action for mandalas and medallions
- Place-on-canvas mode for stamping a pattern anywhere
- Every single placement commits as one clean undo step
- Generated artwork remains compatible with layers, exports, autosave, and `.domistika` project files

## v0.7.1 — Spiro Assist

- Ring, golden-angle, grid, and row array layouts
- Alternating, doubled, and four-way mirrored patterns
- Start-to-end scale progression across an array
- Per-pattern rotation stepping
- Automatic hue cycling from the current drawing color
- Normal, multiply, screen, overlay, additive glow, and difference blending
- Live array preview
- Place-array mode for positioning complete pattern fields anywhere on the canvas
- Random layout generator
- An entire array commits as one undo operation

## Technology

- Vanilla JavaScript and modern browser APIs
- Layered HTML Canvas 2D rendering
- Pointer Events with stylus pressure and tilt support
- IndexedDB autosave
- CSS and Canvas mask compositing
- Triangle-mesh affine image warping
- Parametric hypotrochoid and epitrochoid rendering
- Three.js with a WebGL2 context for the 3D reference lab
- MediaRecorder and Canvas Capture Stream for process videos
- Vite production builds
- GitHub Actions deployment to GitHub Pages

## Development

```bash
npm install
npm run dev
```

Production validation:

```bash
npm run check
npm run build
```

## GitHub Pages

The included workflow builds and deploys the site on every push to `main`.

In the repository settings, open **Pages** and set **Source** to **GitHub Actions** if it is not selected automatically.

## Roadmap

### v0.8 — Portable Artist Studio

- Installable offline PWA
- Reference-board persistence
- Brush-pack import and export
- Palette-pack import and export
- SVG export for vector-friendly tools
- Keyboard and accessibility customization
- Workspace backup and restore bundle

### v0.9 — Effects & Finishing

- Adjustment layers
- Blur, sharpen, noise, glow, and color effects
- Perspective guides and snapping
- Selection edge smoothing and anti-alias controls
- Text and typography tools

### v1.0 — Open Artist Studio

- GPU-assisted compositing and effects
- Large-canvas tiling
- Community brush packs
- Optional peer-to-peer collaboration
- Accessibility and low-vision drawing modes

## License

MIT. See [LICENSE](LICENSE).
