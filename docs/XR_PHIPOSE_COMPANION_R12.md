# Domistika XR · ΦPose Rung 12: Room and Brush Gesture Companion

This milestone gives Domistika XR its **first reviewed gesture-command receiver** using the same Rung 10 `ScopedPhiPoseHost` foundation as PhiOffice. The receiver is real source code in the `xr.html` browser app, with an explicit enable/disable panel. It handles only reversible **studio room navigation** and **future-stroke brush-style selection**.

The host does **not** directly perform hand tracking. Gestures are recognized in the separate OverStrings page, which may send a minimal advisory request after the operator explicitly approves a five-minute window session in Domistika. Quest 3 background WebXR/dual-window behavior is **not verified** and may not work in immersive mode. A native in-runtime hand-tracking path is a separate follow-up requirement.

## Reviewed action map

| Gesture action ID | Host effect |
| --- | --- |
| `domistika.room.home` | Display Studio Home |
| `domistika.room.canvas` | Enter 2D Canvas Studio |
| `domistika.room.spatial` | Enter 3D Paint |
| `domistika.room.workshop` | Enter Sculpture Workshop |
| `domistika.room.gallery` | Enter temporary Gallery arrangement |
| `domistika.brush.next` | Select next brush in active canvas/spatial room for future strokes |
| `domistika.brush.previous` | Select previous brush in active canvas/spatial room for future strokes |

Canvas styles cycle through Solid → Dry → Wash → Marker. Spatial styles cycle Neon → Ribbon → Spark. Brush selection is disabled in Studio Home, Sculpture Workshop, and Gallery. All actions are denied while an active pointer/controller gesture is painting or moving a scene object.

The existing `domistika.palette.open` vocabulary item is **preview only**, and **not** allowed into this receiver.

## Why the scope is narrow

Switching a brush changes how *future* strokes will look but does not draw, erase, undo, save, export, delete, accept imports, or mutate existing painting strokes or spatial objects. Room navigation uses existing `goToStudioRoom()` and may update temporary gallery/easel presentation state. There is no gesture-to-`persist()`, `brushStudio.start()`, `workshop.save()`, `removeBoard()`, or other effects.

## Browser setup

1. Open [OverStrings](https://michaelwave369.github.io/OverStrings/) on GitHub Pages.
2. Select the built-in **Domistika XR** vocabulary and an allowlisted room/brush command.
3. Click **Open Domistika XR companion**. The button opens `/Domistika/xr.html` in a new browser window, on the same `github.io` origin.
4. In Domistika's new window, find the visible **ΦPose · Gesture Navigation** panel in the sidebar, then explicitly click **Enable for 5 minutes**.
5. To use synthetic desktop buttons, opt into synthetic demo input in **both** OverStrings and Domistika before arming. Otherwise select WebXR input in OverStrings.
6. Arm exactly one gesture sentence in OverStrings and perform its tokens. Domistika validates the command and, only if allowed, changes the room or selected brush.
7. The receiver reports `accepted_for_ui_dispatch` or a denial. Receipt is **not** proof of saving, physical tracking or any privileged effect.

The companion never starts enabled, uses a host-generated UUID session, exact same-origin+source checks, bounded freshness, sequence replay rejection, cooldown, optional synthetic gating, and a visible revoke control. The receiver rejects all intents outside its seven-ID fixed allowlist, including `domistika.palette.open`, any painting, file operations and other app commands.

A compromised same-origin script could forge browser messages; same-origin popup checks are **not cryptographic authentication**. Therefore no consequential effects are exposed.

## Versioning and provenance

- Protocol: `domistika.gesture-nav.v0.1`
- Host adapter: `src/xr/phiPoseDomistikaHost.js`
- Consent UI: `src/xr/phiPoseDomistikaCompanion.js`
- Reviewed SDK snapshot: `src/xr/phiPoseHostCore.js`
- Canonical SDK: `MichaelWave369/OverStrings/packages/phipose-host-sdk/index.mjs`
- Pinned Git blob hash: `46d852582327d38966fdb01aace666bd3f9cd9cd`
- Sender: `OverStrings/web/phipose-domistika-transport.mjs`

The SDK snapshot is byte-identical to the reviewed OverStrings source; the CI tests pin its Git blob. No external runtime source code is fetched.

## Tests and hardware acceptance

```sh
node --test tests/xr-phipose-navigation.test.mjs
npm run build
```

CI also checks the new JavaScript modules and the existing XR regression suite.

**Acceptance still needed:** merged GitHub Pages deploys for both repos; desktop multiwindow synthetic gesture demonstration; real Quest 3 input under WebXR; effect/absence of input loss on browser window switching; controller triggers active vs idle; VR/MR session exit; disabled/expired/source-spoofed requests; and confirmation that paintings/objects/backup bytes remain unchanged during room and brush navigation.

**Next engineering milestone:** in-page WebXR hand tracking + intentional gesture arming and confirmation, so the active immersive Domistika session can accept poses directly without relying on concurrent browser windows. That is not implemented in this PR.
