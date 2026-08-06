# Domistika v0.9.7 — Undo + Bounded Symmetry Fill Reliability

This repair follows the v0.9.6 performance pass and corrects two hands-on regressions without removing its drawing-speed improvements.

## Undo and redo

- History snapshots now use ordinary browser canvases instead of `OffscreenCanvas`, avoiding browser-dependent restore behavior.
- Undo and redo requests are serialized so repeated button clicks or keyboard shortcuts cannot overlap and corrupt the stack.
- Failed restores return their snapshot to the original stack rather than losing history.
- The drawing overlay receives focus when drawing begins, so `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, and `Ctrl/Cmd+Y` reliably target canvas history after a stroke.
- A capture-phase shortcut handler covers sliders, selects, buttons, and stale UI focus while preserving native undo inside text fields.

## Bounded symmetry fill

The fast v0.9.6 fill path allowed low-alpha antialiasing pixels to count as transparent. That could leak through a drawn boundary and classify the shared canvas background as one fill region.

v0.9.7 repairs that boundary by:

- using a stricter alpha threshold around transparent pixels;
- classifying mirrored regions before changing destination pixels;
- rejecting regions that touch the canvas edge;
- rejecting regions larger than 48% of the canvas as likely shared backgrounds;
- keeping one source read, one destination read, and one final commit;
- preserving one undo step for the entire symmetry-fill action.

Normal Fill remains available for intentionally filling an entire background. Symmetry Fill now protects the shared background and only commits bounded mirrored cells.

## Proving checklist

- Draw three strokes and undo/redo them by buttons and keyboard.
- Press shortcuts rapidly several times and verify history order remains stable.
- Change a symmetry selector or brush slider, draw, then use `Ctrl/Cmd+Z`.
- Fill several enclosed mirrored cells with antialiased ink boundaries.
- Click an unbounded background with Symmetry Fill and confirm nothing floods.
- Use normal Fill on that same background and confirm whole-background filling still works.
