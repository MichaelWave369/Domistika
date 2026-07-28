# Domistika

**A free, lefty-friendly drawing studio for the open web.**

Domistika is an independent browser art application created for artists who want a focused sketching space without subscriptions, locked tools, or device-specific installs. The interface defaults to a left-handed layout and can flip instantly for right-handed artists.

> Domistika is inspired by the broad category of professional digital sketchbooks. It is not affiliated with, endorsed by, or a copy of Sketchbook, Autodesk, or Sketchbook, Inc. No proprietary assets or source code are used.

## Live app

After GitHub Pages is enabled for the repository, the production URL will be:

`https://michaelwave369.github.io/Domistika/`

## v0.1 features

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

## Technology

- Vanilla JavaScript and modern browser APIs
- Layered HTML Canvas 2D rendering
- Pointer Events with stylus pressure support
- IndexedDB autosave
- Three.js with a WebGL2 context for the 3D reference lab
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

### v0.2 — Brush Workshop

- Custom brush shape and texture editor
- Brush preset library and import/export
- Tilt and rotation-aware stylus behavior
- Smudge and wet-media simulation

### v0.3 — Selection & Transform

- Lasso, rectangle, magic-wand, and color-range selection
- Move, scale, rotate, warp, and perspective transforms
- Layer masks and clipping groups

### v0.4 — Artist Workflow

- Reference image boards
- Time-lapse recording
- Color harmony and palette extraction
- SVG export for vector-friendly tools
- Installable offline PWA

### v1.0 — Open Artist Studio

- GPU-assisted compositing and effects
- Large-canvas tiling
- Community brush packs
- Optional peer-to-peer collaboration
- Accessibility and low-vision drawing modes

## License

MIT. See [LICENSE](LICENSE).
