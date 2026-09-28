# Domistika Motion Clips v0.9.22

Domistika v0.9.22 turns Motion recording into a project object instead of only a browser download.

## What changes

Kinetic, Composer, and Visual Performance recordings now do two things when recording stops:

1. save the WebM clip into the current Domistika project;
2. preserve the existing browser download behavior.

Recorded clips also land immediately in **My Gallery** using a poster frame and a motion badge.

The authored still artwork remains untouched. Kinetic is still a non-destructive preview system.

## Project model

A normal autosave keeps only clip metadata and IndexedDB references:

```json
{
  "motionClips": {
    "version": 1,
    "schema": "domistika.motion-clips.v1",
    "embedded": false,
    "items": [
      {
        "id": "motion-...",
        "name": "portal-study · Visual Performance",
        "kind": "visual-performance",
        "mimeType": "video/webm",
        "bytes": 1823044,
        "durationSeconds": 4.1,
        "fps": 30,
        "poster": "data:image/webp;base64,..."
      }
    ]
  }
}
```

This keeps routine autosaves from repeatedly duplicating large base64 video strings.

When the user explicitly clicks **Project** to download a `.domistika` file, Domistika embeds the WebM data into the exported project so the clip travels with the file.

Opening that project restores the embedded media into local IndexedDB and re-associates the clips with the project.

## Limits

- WebM only
- maximum 24 MiB per clip
- maximum 8 clips attached to one project
- clips are stored locally in IndexedDB
- explicit `.domistika` export embeds clip media for portability

These bounds are deliberate. Domistika remains a drawing studio, not a surprise video-editing filesystem.

## Gallery

Every new recorded clip creates a local Gallery entry containing:

- a still poster
- clip title
- kind
- duration
- FPS metadata
- a reference to the local clip

Opening a motion-enabled Gallery card plays the local WebM in the viewer.

Normal Gallery submissions may also attach the latest clip in the current project.

The public Gallery submission workflow remains human-governed and image-based. Motion clips are not uploaded silently.

## Stable SDK

The stable SDK advances to `0.1.1` and exposes:

```js
Domistika.motion.clips.list()
Domistika.motion.clips.latest()
await Domistika.motion.clips.url(id)
await Domistika.motion.clips.download(id)
await Domistika.motion.clips.remove(id)

const portableProject = await Domistika.project.serialize({
  embedMotion: true
})
```

Object URLs returned by `motion.clips.url()` should be revoked by the caller when no longer needed.

## Events

The clip registry emits:

- `domistika:motion-clips-ready`
- `domistika:motion-clip-added`
- `domistika:motion-clip-removed`
- `domistika:motion-clips-restored`
- `domistika:motion-clip-download`

## Architecture

```text
Motion renderer
    ↓
MediaRecorder
    ↓
WebM Blob
    ↓
Motion Clip Registry
    ├─→ IndexedDB local media
    ├─→ project metadata / portable embedding
    ├─→ My Gallery motion card
    └─→ existing browser download
```

This keeps performance, persistence, Gallery presentation, and project portability separate while letting them share one clip identity.
