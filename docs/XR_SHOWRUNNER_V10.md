# Domistika XR v1.0 · Showrunner Release

**Showrunner 1.0** makes Domistika XR into a locally operated, portable, rehearsable 3D visual performance workshop. This is a **web-app 1.0 milestone**, not a claim of Quest headset certification, commercial show control, exact beat-sync, physical lighting, cloud collaboration, or an industrial CAD implementation.

## What is new

- A **three-act starter show** with **Arrival (12s / Aurora)**, **Into the Field (18s / Outrun)** and **Finale (14s / Ember)**. Each cue has a user-editable title, duration (4–120 seconds), palette, emissive gain (0–1.5) and synthetic spectrum energy multiplier (0.25–1.5). Maximum eight cues are supported by the file format, although the v1.0 UI edits the existing three rather than adding/deleting cues.
- **Show playback:** explicit Play, Pause, Stop, Previous Act, Next Act and act selection, with elapsed/total time and progress. Runtime cue boundaries automatically switch glow palette/intensity and vary the **silent synthetic signal** that drives all previously authored Motion Forge and Beat Forge assignments.
- **Quest VR control deck:** PLAY SHOW, STOP SHOW, NEXT ACT and PREV ACT, in the existing paginated Spatial Workshop deck. Audio is not created by this show: it is a deterministic and silent *visual choreography*. The existing local music playback remains a separate workflow and takes precedence when selected.
- **Portable Showpack JSON** includes the exact bounded editable workshop assembly **plus** the Showrunner cue configuration, with its own explicit \`domistika.xr.showpack.v1\` wrapper and version 1.0 marker. No existing workshop schema migration and no network calls.
- **Safe import and export:** The file is validated against the Showpack schema and the original workshop constraints *before* user confirmation. Import **replaces the current editable workshop** only after clear confirmation, and a single original workshop Undo can reverse that replacement. Export the current work first. No music files, opaque external CAD/BPC source data, device identity, microphone recordings or transient frames are included.
- **Non-destructive performance:** Choreography updates only the temporary poses and emissive materials of editable workshop objects. Stopping, pausing, browser backgrounding and XR session end restore canonical geometry and the previous Light Forge preference. Existing 2D canvas, painting, BPC and OpenBlueprint source previews remain separate.

## Start a performance

1. Open [Domistika XR](https://michaelwave369.github.io/Domistika/xr.html) on desktop or in Quest Browser.
2. Use Show Forge to add **Orbit Bloom**, **Neon Corridor** or **Bass Cathedral**, or create your own assembly. To run, at least one workshop object must have a Motion Forge effect.
3. In **Showrunner · Visual Performance**, choose a visual act, edit its name, duration, palette, gain and energy, then click **Save selected act settings**. Repeat for other acts. The 1.0 editor supports editing the default three acts; the underlying package/engine accepts 1–8 validated acts.
4. Press **Play silent show**. Move between acts manually with **Previous Act** and **Next Act**, or let the timeline advance automatically. Pausing freezes the cue time while returning workshop objects to rest poses. Resuming restarts preview at the current act time. The show ends after the last cue and restores the original Light Forge setting.
5. In Quest VR, change pages on the floating workshop deck using permanent PREV PAGE / NEXT PAGE, and use **PLAY SHOW**, **STOP SHOW**, **NEXT ACT**, **PREV ACT**.
6. Click **Export Showpack JSON** to back up this full authored stage and cues. Use **Import Showpack JSON** to restore after validation and an explicit browser confirmation. The ordinary workshop JSON export still works, but it omits the Showrunner cue sheet. GLB remains a static rest-pose geometry snapshot, not a music video or animated glTF export.

## Data and security

- Showpack exports have a 2.25 MB character/byte-equivalent input bound, while embedded workshop scenes retain their strict 2 MB/48-object/6,000-mesh-triangle validators. Embedded cue titles, palette identifiers, numeric gain/energy, duration, and total number of cues are strictly bounded.
- The Showpack includes only \`{schema, app, version, show, workshop}\`. Unrecognized top-level fields and malformed cues are rejected. All imported geometry is normalized by \`readWorkshop/writeWorkshop\`; this is not executable plugin data.
- Showrunner settings are exported with explicit user action, not silently injected into the existing v1 workshop storage or source documents. Temporary performance time, audio files, individual frequency samples, screenshots, cookies, source CAD files, trackers and runtime light/material state are not serializable by this package.
- All operations are local. Neither Showrunner itself nor Showpack processing uses network, microphones or Web Audio APIs.
- Synthetic show playback intentionally does **not** generate sound, analyze a real file or promise true musical synchronization. Use Rhythm Forge separately to play locally selected music (music remains optional and cannot be embedded).

## Automated verification

\`\`\`sh
node --check src/xr/showrunner.js
node --check src/xr/main.js
node --test tests/xr-showrunner-model.test.mjs tests/xr-showrunner-runtime.test.mjs tests/xr-showrunner-integration.test.mjs
npm run build
\`\`\`

The existing CI executes every previous XR stage/music/motion/light/edit/source regression test and builds the Vite application. The mandatory physical Quest 3 acceptance remains outstanding: manually test page navigation/controller hit targets, headset performance over a full 44-second show, audible silence from the Showrunner and real-audio priority when switched to Rhythm Forge, imported/renamed cues, light comfort, stage visibility, pause/resume and XR-exit cleanup, GLB/JSON validation and no changes to source BPC/CAD previews.

## Release scope

Version 1.0 is the first complete offline-friendly **create → animate → rehearse → export → restore** flow in this browser studio. Future milestones can address Quest real-device certification, Gen.E.Wrist unified UI, precise musical tempo mapping, sequencer editing of additional acts, recorded animation tracks, advanced production capture and lights that actually illuminate the space. None of those future capabilities are claimed as part of this release.
