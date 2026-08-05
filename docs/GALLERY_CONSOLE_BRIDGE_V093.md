# Domistika v0.9.3 — Gallery, 16-Bit Console, Symmetry Fill, and Auralith Bridge

## Art Gallery

Domistika now includes a full-screen **Domistika Art Gallery** page with:

- deterministic Art of the Day selection;
- category and text filtering;
- seeded demonstration artwork;
- local-first user submissions stored only in the browser;
- current-canvas capture or image-file selection;
- a governed public-submission route through a GitHub issue template;
- explicit creator permission and publication consent;
- local deletion and full-size viewing.

GitHub Pages does not provide an application database. Public submissions therefore enter a human-reviewed issue queue instead of being silently uploaded. Accepted work can be added to `public/gallery/artworks.json` and the gallery asset folder through a normal reviewed commit.

## Fill workflow

Fill and Eyedropper are grouped together in the tool rail. The Fill controls now include **Symmetry fill**. When enabled, a single click uses the current symmetry transform family and fills every unique matching region as one undoable action.

## Visual themes

The style control now cycles through three visual systems:

1. Grandma's Basement / BasementVision;
2. 16-Bit Console, inspired by the restrained retro workstation language used by Auralith369;
3. Modern Night Studio.

The 16-Bit Console style uses dark navy surfaces, cyan routing accents, violet and gold highlights, beveled square controls, monospace typography, and restrained CRT scanlines.

## Auralith369 bridge

The top bar now includes an **Auralith** bridge control. The bridge:

- creates a compressed local preview of the visible Domistika artwork;
- carries project name, dimensions, favorite palette, and symmetry metadata;
- stores the package under the shared-origin `parallax-creative-bridge-v1` protocol;
- opens Auralith369 at `#domistika-import`.

No artwork is sent to a server by the bridge. Both GitHub Pages apps share the `michaelwave369.github.io` origin, so the transfer uses browser-local storage and remains under the user's control.

## Manual proving checklist

- Cycle Basement → 16-Bit → Night and reload each state.
- Confirm Fill and Eyedropper remain adjacent in lefty and righty layouts.
- Test symmetry fill with vertical, quad, radial, sacred-geometry, phi, and controlled-weirdness modes.
- Confirm one Undo reverts a multi-region symmetry fill.
- Open the gallery, filter every category, search, view an artwork, and test Art of the Day/random selection.
- Capture the current canvas, add it locally, delete it, and repeat with an uploaded image.
- Start a public submission and confirm an image downloads and the governed GitHub issue template opens.
- Bridge artwork to Auralith369 and verify the receiver preview, reference mode, and backdrop mode.
