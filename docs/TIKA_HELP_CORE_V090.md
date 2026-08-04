# Domistika v0.9.0 — Tika Help Core

This release is the smallest honest candidate defined by the Domistika Superphase Master Architecture v0.1. It adds a local-first helping and guided-creation layer without replacing the artist or requiring a model provider.

## Tika local shell

Tika appears as a workspace panel and a quiet floating orb. The first build supports:

- natural-language and keyword search across a local capability manifest;
- contextual explanations for live Domistika features;
- **Show me** actions that open, scroll to, and highlight the actual control;
- settings-based suggestions that are labeled as options, not objective judgments;
- a project-goal field used by the privacy-minimized context broker;
- a visible local-only/provider-off indicator;
- the `?` shortcut to open Tika.

Tika v0.9 does not inspect artwork pixels and does not contact an external model provider.

## Guide Layers

Guide Layers are first-class project layers with these rules:

- persisted in `.domistika` project files;
- visibly labeled as guides in the Layers workspace;
- drawing-locked so accidental brush strokes are blocked;
- excluded by default from `compositeCanvas`, PNG/JPEG export, eyedropper composites, time-lapse frames, and other flattened outputs;
- removable from Tika with a recorded action receipt;
- restorable through an in-session or persisted deterministic undo descriptor when the guide came from a registered template.

## Starter lessons

Three local lessons are included:

1. **First Marks** — straight path, curve, ellipse, and confident stop.
2. **Simple Creature** — spine gesture, body masses, limb rhythm, silhouette, and personal variation.
3. **Radial Mandala** — one motif, radial repetition, ring hierarchy, focal contrast, and optional controlled weirdness.

Each lesson prepares a guide, a compatible brush/tool setup, and a step-by-step progression. The user confirms progress; Tika does not score artistic quality.

## Capability and command architecture

The capability manifest registers panels, help topics, command descriptions, authority levels, and live control selectors. The first command registry includes:

- `ui.openPanel`
- `ui.highlightControl`
- `ui.openHelpTopic`
- `canvas.fit`
- `tool.select`
- `brush.select`
- `setting.set`
- `guide.create`
- `guide.remove`
- `lesson.setStep`
- `receipt.undo`

Every command creates a local receipt with the request, interpretation, authority, arguments, before/after context, result, status, and undo availability.

## Context boundary

The v0.9 Context Broker reads only structured studio state:

- project name and optional goal;
- canvas dimensions;
- active tool and brush;
- color, size, opacity, smoothing, and pressure state;
- symmetry and grid settings;
- art/guide layer counts and active-layer metadata;
- viewport pan and zoom.

Artwork pixels are not included.

## Validation

The package validation command performs syntax checks for every v0.9 module and runs `tests/v090-static.mjs`, which verifies unique manifest identifiers, required commands, required help selectors, and the three registered guide templates.

## Manual proving checklist

- Ask “Where is radial symmetry?” and verify the live selector is highlighted.
- Start each lesson and verify a drawing-locked Guide Layer is created.
- Export PNG and JPEG and verify no guide pixels are present.
- Save and reopen a `.domistika` project and verify guide metadata and pixels persist.
- Run a Tika setting command, inspect its receipt, then use its Undo action.
- Reload and verify deterministic setting/guide undo remains available from persisted receipts where supported.
- Disable network access and verify Tika help, lessons, commands, and receipts continue to work.
- Test reduced-motion and mobile inspector behavior.

## Deliberately deferred

- model-backed conversation;
- artwork-pixel visual inspection;
- generated reference breakdowns;
- arbitrary user-authored lesson generation;
- visual suggestion previews on candidate layers;
- living-symmetry mutation controls and Creation Seeds.

Those remain later Superphase work and are not implied by this release.
