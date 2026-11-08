# Domistika XR · ΦPose Rung 13: Native Immersive Hand Gestures

Rung 13 runs the **same OverStrings ΦPose language engine directly inside Domistika's active Three.js WebXR frame loop**, without opening a second browser window. It is an opt-in, single-shot prototype for **safe studio room navigation and future-stroke brush selection only**.

This is engineering for an actual WebXR hand-tracking device. **Synthetic unit tests passing do not mean this has been physically validated on Meta Quest 3.**

## What changed

- `src/xr/phipose-core/`: exact, checked-in, byte-identical copies of OverStrings's reviewed `calibration.mjs`, `gesture.mjs`, `phipose.mjs`, and `wrist-motion.mjs`. Existing MIT licensing and code semantics preserved. The integration test pins Git blob hashes.
- `src/xr/phiPoseNativeXR.js`: reads only the current `XRFrame.getJointPose` / `XRInputSource.hand` / XR reference-space joint coordinates. Recognizes debounced open, pinch, grab, point and local reference-space swipes; feeds events through the original one-shot interpreter.
- `src/xr/phiPoseNativeMenu.js`: a visible 3D in-world command picker with **NEXT COMMAND**, **ARM ONE PHRASE**, and **CANCEL PHRASE** raycast controls, accessible to XR selection events where the device/browser supports them.
- `src/xr/main.js`: samples real current-session hands from `renderer.setAnimationLoop((timeMs,frame)=>…)`, displays the local menu while immersive, and applies only an independently computed, app-reviewed `planDomistikaPhiPoseAction`.
- `xr.html`: brief native instructions and accessible status mirror.
- `tests/xr-phipose-native.test.mjs`: deterministic joint fixtures, real grammar core, acceptance and negative tests. No production code fabricates hands or pose confidence.

The existing Rung 12 cross-window companion remains available separately. It is **not** needed for the native XR path. No automatic app permission, background browser communication, camera-video access, telemetry or pose recording has been added.

## How to try on Quest 3 after merge and Pages deployment

1. Open `https://michaelwave369.github.io/Domistika/xr.html` in Quest Browser. Do **not** open OverStrings in another window.
2. Enable Quest hand tracking, enter **VR** or **MR**, and confirm **both hands are being tracked**. Native ΦPose does not synthesize untracked hands.
3. Look toward the floating **PHIPOSE · LOCAL HANDS** panel near the studio's other top-level controls. Use a supported hand-pinch/select ray or existing controller to choose **NEXT COMMAND** until your desired command appears.
4. Press **ARM ONE PHRASE**. Approval is one-shot, expires after **6.5 seconds**, and requires both hands recently tracked. Release the select gesture before performing the phrase.
5. Perform the selected two-step phrase **in order**, with a clear change/release between steps and at least **180 ms** separation. The normal tracker applies dwell hysteresis, and the native adapter waits 450 ms after arming to avoid reinterpreting the button click as the first step.
6. The receiver performs only the selected, safe UI command. After a match or failure, it disarms. Use **CANCEL PHRASE** anytime to exit early; session ending, visibility loss, tracking loss or an active drawing interaction also cancels.
7. Select a room/brush with existing controllers to ensure all previous controls still work.

### Phrases (original OverStrings Rung 12 vocabulary)

| Command | One-shot phrase |
| --- | --- |
| Studio Home | `L:open > R:grab` |
| Canvas Studio | `L:point > R:open` |
| 3D Painting | `L:point > R:grab` |
| Sculpture Workshop | `L:grab > R:open` |
| Art Gallery | `L:grab > R:pinch` |
| Next Brush | `L:open > R:swipe-right` |
| Previous Brush | `L:open > R:swipe-left` |

The swipe detector uses **local XR reference-space X**, not head-gaze-relative left/right. Real hand tracking and sensitivity depend on headset/browser build and have not been calibrated. Switch back to controllers when the device cannot track both hands.

## Safety and privacy guarantees at this rung

- No recognition unless immersive, an XR frame and active session exist, two hands are tracked, and the operator deliberately arms a selected command.
- All recognition is **within the active XR session**. The interpreter's event `source` is `webxr`, not synthetic or a remote popup request.
- The code uses a **fixed seven-action list**. It is not derived from imported vocabularies or external JavaScript. `domistika.palette.open` remains unsupported.
- App authority remains separate from input recognition: the adapter checks current room/brush state, pointer activity and XR interaction activity again before calling the existing safe UI methods.
- While armed, XR selectstart/pinch cannot enter existing paint, undo, delete, object creation, save or tool-action routes; only the CANCEL control is available.
- The gesture itself **cannot** create a stroke, modify existing painting data, delete artwork, persist a save, export a file, authenticate a user, or access operating-system capabilities.
- No raw joint coordinates, user identity, file content or gesture recordings are sent off-device or persisted. Ephemeral joint maps exist only for the frame's pose recognition.
- Tracking loss, a different session, unexpected gesture starts, expired phrase and active drawing are all fail-closed, with visible status.
- Gesture calibration thresholds are from the OverStrings prototype and **not clinically or physically validated**. The manual controller input remains available when not armed.

## Tests

```sh
node --test tests/xr-phipose-native.test.mjs tests/xr-phipose-navigation.test.mjs
npm run build
```

The Domistika XR CI now runs the new tests, syntax checks, existing XR verification, and the production Vite build. Unit tests include synthetic **joint-coordinate fixtures**, not an actual VR runtime.

## Quest hardware acceptance checklist

Record firmware/browser build, whether the user can see the 3D menu, which selection input is available (controllers or hands), and the measured result of each test:
- Both tracked hands available before arming; hand-only operation if the browser exposes hand select events.
- Each of seven commands, normal and reversed sequence, sequential vs simultaneous hands, one-shot rearm.
- Pose changes with palm orientation, sitting/standing height, left-handed use, camera movement, and occlusion.
- Swipe directions relative to room axes; susceptibility to head turns; intentional neutral/reset between commands.
- Changing room while in gallery/painting; ensure original geometry and saved backups are preserved.
- Deliberately tracking-loss and session-end mid-sentence; confirm a denial, not an action.
- Drawing while gesture mode **is not** armed, and attempting painting while armed; ensure no paint commands leak through.
- VR↔MR transitions, session restart, page refresh and closing the browser.
- Device performance after repeated commands; textures are updated on status changes, not every frame.

**Expected field caveats:** Some Quest/Meta Browser combinations do not expose hand-tracking `selectstart` rays reliably, may withhold one hand's joint data, or may switch between controllers and hands. In those cases the native command panel remains a tested implementation candidate, not a validated hands-only product. Release qualification requires direct physical evidence.

## Next rung

Replace prototype global-X swipe recognition with **headset-relative, calibrated motion thresholds**, improve user-accessible command selection/arming in hand-only mode, add an explicit training/calibration overlay with privacy-preserving in-memory diagnostics, and only then propose broader XR app command actions.
