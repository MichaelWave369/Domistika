## v0.9.30 — Creative Bridge v2

Domistika now sends **protected semantic overlays** separately from the raster artwork Auralith is expected to grade.

```text
paint          → base raster
guide          → excluded
type           → protected overlay
motion-ignore  → protected overlay
```

Creative Bridge v2 binds:

```text
base image SHA-256
overlay image SHA-256
canonical manifest SHA-256
```

so modifying artwork pixels, title pixels, or semantic metadata invalidates the package.

Stable SDK v0.1.8 adds:

```js
await Domistika.bridge.auralith.transfer()
```

and native site tools v0.1.1 add:

```text
domistika_transfer_to_auralith
```

New Ink + Type placements retain `domistika.semantic-text.v1` metadata, while older `type` and `motion-ignore` layers are still protected through their layer role alone.

See [Creative Bridge v2](docs/CREATIVE_BRIDGE_V2_V0930.md).

## Native Creative Chain Acceptance 001

The first observed live Domistika → Auralith finishing workflow is preserved as a cross-repo acceptance record.

The run verified:

```text
Domistika 0.9.29
→ Harbor for Auralith
→ hash-bound parallax creative bridge
→ Auralith v0.7.1-alpha
→ image.open
→ Moonlight LUT
→ Vignette FX
→ 369 Cinema Style
→ creative receipt
```

The current bridge is raster, so type/layer semantics do not remain editable after transfer. That limitation is documented as expected behavior rather than hidden behind optimistic prose.

See [Native Creative Chain Acceptance 001](docs/acceptance/NATIVE_CREATIVE_CHAIN_ACCEPTANCE_001.md).

## v0.9.29 — Native WebMCP Site Tools

Domistika now exposes a thin browser-native WebMCP layer over the frozen `window.Domistika` stable SDK.

Registered native site tools cover:

```text
capabilities
command search / execution
canvas state
bounded strokes
Color Studio color + gradients
Spiro placement
semantic layer roles
```

The adapter uses the live stable runtime instead of reaching into raw canvas contexts or versioned labs.

Normal browsers without WebMCP continue to run Domistika unchanged. WebMCP-aware browsers can discover the site tools directly from the live page.

```text
browser agent
→ WebMCP
→ Domistika site tools
→ window.Domistika
→ stable semantic runtime
```

See [Native WebMCP Site Tools v0.9.29](docs/WEBMCP_SITE_TOOLS_V0929.md).

## v0.9.28 — Playground UX + Capability Hygiene

Playground now makes its return path impossible to miss and keeps capability snapshots lightweight.

- A visible **▶ Playground** chip sits beside Commands.
- After a demo, the chip becomes **↩ Return to Artwork**.
- Playground completion shows an on-screen **Return to my artwork** action.
- The status line explicitly names **⌘K / Ctrl+K → Playground · Return to Previous Artwork**.
- `Domistika.playground.state()` and `Domistika.capabilities().playground` now expose lightweight clip metadata only, excluding poster/data-URL payloads.
- Stable SDK advances to `0.1.7`.

The first live end-to-end Playground run is preserved as **Domistika Stable Runtime Acceptance 001**.

See [Playground UX v0.9.28](docs/PLAYGROUND_UX_V0928.md) and [Stable Runtime Acceptance 001](docs/acceptance/DOMISTIKA_STABLE_RUNTIME_ACCEPTANCE_001.md).

## v0.9.27 — Playground

Domistika now has a one-command first-run demo that performs the studio instead of merely describing it.

Run **Playground · Demo the Studio** from the Command Palette.

The sequence:

```text
save return snapshot
→ fresh demo canvas
→ Portal Core gradient
→ Flower + Gear Spiro
→ static motion-ignore frame
→ 3·6·9 Portal
→ 3 second Kinetic recording
→ project motion clip / Gallery card
→ Stop
```

The previous artwork is held as an in-session return snapshot and can be restored with **Playground · Return to Previous Artwork**.

Stable SDK v0.1.6 adds:

```js
await Domistika.playground.run()
await Domistika.playground.restorePrevious()
Domistika.playground.state()

await Domistika.project.restore(project)

Domistika.motion.record.start({ source: 'kinetic' })
Domistika.motion.record.stop({ source: 'kinetic' })
```

See [Playground v0.9.27](docs/PLAYGROUND_V0927.md).

## v0.9.26 — Layer Roles

Layers now carry a persisted semantic role:

```text
paint · guide · type · motion-ignore
```

- Role is saved in `.domistika` projects and restored with the layer.
- Existing Superphase guide layers automatically remain `guide`.
- The Layers panel exposes a role selector and role badges.
- `motion-ignore` layers are excluded from the Kinetic snapshot and remain visibly static above Motion preview.
- Stable SDK v0.1.5 exposes `Domistika.layers.role(...)` and `Domistika.layers.roles()`.
- Command Palette actions can mark the active layer as Paint, Type, or Motion Ignore.

This directly supports static titles, signatures, frames, and captions over animated artwork.

See [Layer Roles v0.9.26](docs/LAYER_ROLES_V0926.md).

## v0.9.25 — Live Contract + Discovery Polish

Domistika now treats the running SDK as the canonical machine-readable contract.

```js
Domistika.capabilities()
```

is the **machine-readable source of truth** for what the current build exposes. The README remains explanatory documentation, not a second capability registry.

- `Domistika.tool.list()` now discovers extension tools such as Fill, Select, and Smart selection when installed.
- `Domistika.tool.set('fill')` and `Domistika.tool.set('select')` route through their owning extension runtimes.
- `Domistika.commands.search(query)` gives scripts and agents the same search contract used by the Command Palette.
- Programmatic palette search now updates the visible palette when it is open.
- Harmony/color swatches have stronger two-tone framing so very dark and very light colors stay visible.

See [Live Contract v0.9.25](docs/LIVE_CONTRACT_V0925.md).

## Live runtime contract

For integrations, do not infer features from README prose or app-version strings.

Use:

```js
const capabilities = Domistika.capabilities();
const tools = Domistika.tool.list();
const commands = Domistika.commands.catalog();
const portal = Domistika.commands.search('portal');
```

The stable SDK is designed so humans, agents, scripts, accessibility tools, and future controllers can interrogate the same running contract.

## v0.9.24 — Color Studio

The existing **Colors** room is now a complete color workspace instead of only a favorites bank.

- Native browser color wheel remains available.
- Exact HEX / HTML color input.
- Numeric RGB controls.
- Numeric HSL controls.
- Curated CSS named-color shelf.
- Local recent-color history.
- Existing Favorite Colors preserved.
- Automatically derived analog, triad, and complementary harmonies.
- Ten real linear/radial gradient presets.
- Gradients can paint behind existing pixels or replace the active layer with one undo checkpoint.
- Stable SDK v0.1.3 exposes `Domistika.colors.*`.
- Command palette gains **Open Color Studio**.

See [Color Studio v0.9.24](docs/COLOR_STUDIO_V0924.md).

## v0.9.23 — Command Palette

Domistika now has a searchable command palette backed by the stable SDK command bus.

- Open with `Ctrl/Cmd+K` or the **Commands** button.
- Search by command label, id, category, description, keywords, or shortcut.
- Keyboard navigation with Up / Down / Enter / Escape.
- Jump directly to Spiro Lab, Motion Studio, Gallery, and Creature Lab.
- Select common drawing tools without hunting the tool rail.
- Launch Motion presets, Composer / Visual Performance scenes, and recording controls.
- Open export/new-canvas/shortcut surfaces through the same command bus.
- Download the latest project motion clip.
- Stable SDK v0.1.2 adds `Domistika.commands.catalog()` while preserving `list()` and `execute()`.

The palette owns search and presentation only. Feature execution stays inside `window.Domistika`.

See [Command Palette v0.9.23](docs/COMMAND_PALETTE_V0923.md).

## v0.9.22 — Motion Clips as Project Objects

Motion recording now belongs to the artwork instead of only leaving through the browser download tray.

- Kinetic, Composer, and Visual Performance WebM recordings are saved to a bounded local motion-clip registry.
- Autosave stores clip metadata and IndexedDB references without repeatedly duplicating video base64.
- Explicit `.domistika` project downloads embed motion media for portability.
- Opening an embedded project restores the clips locally.
- Each recording lands in **My Gallery** with a poster, motion badge, and local video playback.
- Existing WebM download behavior remains available.
- Per-clip limit: 24 MiB.
- Per-project limit: 8 clips.
- Stable SDK v0.1.1 exposes `Domistika.motion.clips.*` and portable project serialization.

See [Motion Clips v0.9.22](docs/MOTION_CLIPS_V0922.md).

## v0.9.21 — Stable SDK v0.1

Domistika now exposes one frozen public runtime surface:

```js
window.Domistika
```

The SDK wraps the existing versioned modules instead of replacing them. It provides stable canvas, tool, brush, stroke, layer, Spiro, Motion, clean-capture, event, and command surfaces for scripts, accessibility tools, test harnesses, MIDI experiments, and governed agents.

Highlights:

- `Domistika.setTool(...)`, `Domistika.color(...)`, and `Domistika.stroke(...)`;
- canvas-coordinate or normalized-coordinate scripted strokes;
- missing scripted pressure defaults safely to full pressure, so direct `drawSegment` calls no longer collapse brush width;
- metadata-only layer controls without exposing raw canvas contexts;
- stable Spiro placement and Motion preset/scene wrappers;
- `Domistika.export.capture()` over the clean-art v0.9.20 contract;
- semantic `domistika:*` events;
- an initial command bus intended to back a future command palette;
- no network, filesystem, arbitrary JavaScript, or raw context surface.

See [Stable SDK v0.1](docs/STABLE_SDK_V0921.md).

## v0.9.20 — Clean Composite Capture

Domistika now exposes a bounded read-only clean-art capture surface at `window.domistikaCleanCaptureV0920`.

It returns the current `CanvasEngine.compositeCanvas()` artwork as a PNG payload without Studio chrome, symmetry guides, zoom controls, or other overlay UI. The surface is intentionally narrow:

- PNG only;
- base64 only;
- maximum output dimension 2048 px;
- optional white background;
- no network access;
- no filesystem access;
- no local-storage access;
- no mutation of the canvas.

This is designed for governed local visual-critic bridges such as Browsallax while keeping capture separate from drawing authority.

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

## v0.9.19 — Accessible Input Bridge

- Sticky Draw toggle: click once for pen down, move the cursor to draw, click again for pen up
- Sticky strokes keep the existing brush engine, symmetry modes, layers, autosave, and one-step undo behavior
- Sticky Draw safely lifts on tool/layer changes, pan activation, pointer cancel, or interaction with controls outside the canvas
- Leaving and re-entering the canvas suspends and resumes Sticky Draw without connecting an accidental line across the gap
- Polyline mode for click-only precision drawing with live segment preview
- Enter or double-click commits a polyline; Backspace removes the last point; Escape cancels and restores the untouched layer
- Sticky Draw and Polyline are mutually exclusive alternative-input modes
- Keyboard access: Shift+D toggles Sticky Draw and Shift+P toggles Polyline
- ARIA pressed states and a live on-canvas mode indicator make input state explicit
- Public runtime API: `window.domistikaAccessibleInputV0919`
- Designed as an accessibility feature for people and alternative-input operators rather than a device-specific accommodation

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
