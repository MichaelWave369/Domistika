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

## v0.8 — Effects & Finishing

- Active-layer finishing preview with original-versus-effect comparison
- Clean Pop, Warm Film, Cool Night, Neon Glow, Mono Ink, Dream Haze, Vintage Print, Pixel Pop, and Solar Candy presets
- Brightness, contrast, saturation, and hue controls
- Blur, grayscale, sepia, and partial-invert controls
- Screen-composited glow and alpha-preserving vignette
- Pixelation, posterization, and film-grain processing
- One-click randomized finishing looks
- Apply directly to the active layer with a drawing-history checkpoint
- Apply to Copy workflow that keeps the original layer intact
- Transparent pixels remain transparent throughout processing
- Last-used finishing controls persist locally
- Dedicated Effects launcher and inspector panel
- Plain `J` keyboard shortcut opens the Effects panel

## v0.9.12 — Kinetic Rotation Lab

- Live, non-destructive Motion mode for finished artwork
- Whole-artwork rotation or three independent radial rotation bands
- Separate signed speeds for outer, middle, and core motion
- Adjustable core and middle radial boundaries
- Optional pulse and hue-drift animation
- Play, pause, stop, reverse, reset, and refresh-source controls
- Random motion generator
- 3·6·9 Portal preset for counter-rotating kinetic compositions
- Authored paint layers remain untouched and return immediately when Motion mode stops

## v0.9.14 — Kinetic Expansion

- Motion Region selection for rotating only a chosen part of the artwork
- Alpha-weighted automatic art-center detection for mandala and portal pivots
- Manual X/Y pivot placement and center-on-region control
- Recursive Mirror Tunnel with echo count, scale, rotation, and alpha-decay controls
- Performance presets: Slow Drift, Portal 3·6·9, Chaos, Hypnosis, Inversion Storm, and Bass Bloom
- Microphone-driven audio reactivity using local Web Audio analysis
- Local audio-file playback and frequency-band analysis
- Bass-to-pulse, mids-to-middle-motion, and highs-to-core/hue mappings
- Audio smoothing, input gain, and kinetic sensitivity controls
- Live WebM motion recording at 24/30/60 fps with maximum-duration control
- Single-frame PNG export from the kinetic performance renderer
- Original authored paint layers remain untouched throughout performance mode

## v0.9.15 — Kinetic Live-Source Hotfix

- Motion always snapshots the current authored artwork immediately before preview begins
- Stale startup snapshots are invalidated after drawing/content changes
- Restored and imported projects no longer disappear when kinetic motion begins
- Existing Kinetic Expansion features remain non-destructive

## v0.9.16 — Kinetic Composer

- Ghost Trails with adjustable temporal memory and new-frame mix
- Kaleidoscope Lens with 3–18 radial slices, alternating mirrors, and signed lens spin
- Orbit Pivot with elliptical and Figure-8 motion paths
- Adjustable X/Y pivot travel radius and orbit frequency
- Scene Sequencer for automatically advancing through existing kinetic performance presets
- Dream Cycle, Energy Run, Storm Ride, and Meditation Loop scene sets
- Ordered or shuffled scene playback with adjustable scene duration
- Composer presets: Ghost Mandala, Orbit Bloom, Infinite Dream, and Calm Drift
- WebM and PNG export automatically capture the visible Composer output when trails or kaleidoscope optics are active
- Additive runtime preserves the v0.9.15 live-source protection and authored paint layers

## v0.9.17 — Mind Melt Pack

- One-click Slow Trails mode with long temporal memory and Slow Drift base motion
- Kaleidoscope quick buttons for 8, 12, and 16 mirrored slices
- Orbit quick paths for Circle, Ellipse, and Figure 8
- Quick WebM capture with 10, 12, 20, and 30 second duration choices
- Capture automatically uses Composer output when Trails or Kaleidoscope are active and falls back to the base kinetic recorder otherwise
- Black Stage toggle for a checker-free black void behind transparent kinetic artwork
- One-click MIND MELT combination: Hypnosis + Ghost Trails + Kaleido 12 + Figure-8 Orbit + Black Stage
- Reset action turns off Mind Melt add-ons while preserving the underlying kinetic motion state
- Additive control layer leaves authored artwork untouched

## Technology

- Vanilla JavaScript and modern browser APIs
- Layered HTML Canvas 2D rendering
- Pointer Events with stylus pressure and tilt support
- IndexedDB autosave
- CSS and Canvas mask compositing
- Triangle-mesh affine image warping
- Parametric hypotrochoid and epitrochoid rendering
- Canvas pixel processing and browser-native filter compositing
- Temporal canvas feedback for kinetic motion trails
- Radial clip-and-transform compositing for kaleidoscope optics
- Web Audio API analysis for audio-reactive kinetic performance
- MediaRecorder and Canvas Capture Stream for process and motion videos
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

### v0.9 — Portable Artist Studio

- Installable offline PWA
- Reference-board persistence
- Brush-pack import and export
- Palette-pack import and export
- SVG export for vector-friendly tools
- Keyboard and accessibility customization
- Workspace backup and restore bundle

### v0.10 — Type, Guides & Precision

- Text and typography tools
- Perspective guides and snapping
- Selection edge smoothing and anti-alias controls
- Rulers, angle guides, and measurement overlays
- Reusable shape and composition templates

### v1.0 — Open Artist Studio

- GPU-assisted compositing and effects
- Large-canvas tiling
- Community brush packs
- Optional peer-to-peer collaboration
- Accessibility and low-vision drawing modes

## License

MIT. See [LICENSE](LICENSE).
