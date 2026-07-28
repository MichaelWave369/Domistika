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

## Technology

- Vanilla JavaScript and modern browser APIs
- Layered HTML Canvas 2D rendering
- Pointer Events with stylus pressure and tilt support
- IndexedDB autosave
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

### v0.4 — Selection & Transform

- Lasso and rectangular selection
- Move, scale, rotate, flip, and duplicate selections
- Magic-wand and color-range selection
- Layer masks and clipping groups
- Perspective and warp transforms

### v0.5 — Portable Artist Studio

- Installable offline PWA
- Reference-board persistence
- Brush-pack import and export
- SVG export for vector-friendly tools
- Keyboard and accessibility customization

### v1.0 — Open Artist Studio

- GPU-assisted compositing and effects
- Large-canvas tiling
- Community brush packs
- Optional peer-to-peer collaboration
- Accessibility and low-vision drawing modes

## License

MIT. See [LICENSE](LICENSE).
