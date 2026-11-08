# Domistika XR · ΦPose Rung 14: Headset-relative Motion & Hand Calibration

Rung 14 upgrades **native in-session ΦPose** (Rung 13) with yaw-aware, head-relative horizontal swipes, an explicit short **two-hand calibration**, and **visible in-world feedback** for tracking, the armed sentence, its step, remaining seconds and calibrated distances.

**Implementation is built and testable. Quest 3 physical behavior still requires a headset acceptance test.** The seven safe room/brush commands, one-shot arm and controller fallback remain unchanged.

## Why change the swipe coordinate frame?

The Rung 13 OverStrings `WristMotionTokenizer` describes swipes in global XR reference-space X. If you turn your head, a user-intended movement toward *their* right may become global Z movement and fail, or head orientation can affect how a movement is understood.

Rung 14 uses `viewerRightAxis(frame, referenceSpace)`, based on the current `XRFrame.getViewerPose(referenceSpace).transform.orientation`. It rotates +X by the headset quaternion, projects it onto the horizontal floor plane, and normalizes. This axis is **captured at the first qualifying wrist-pose sample**; subsequent headset turns cannot change the in-progress motion axis.

The `ViewRelativeSwipeTokenizer` requires:
- A physical, currently tracked wrist and intentional `open` or `point` posture.
- Real in-session WebXR source; no synthetic gesture/host authorization.
- A stable initial camera/right-axis sample. Invalid/missing viewer orientation causes a **denial**, not fallback to global X.
- A minimum of 150 ms and maximum of 800 ms of uninterrupted movement (a single frame gap over 200 ms resets).
- Rightward or leftward projected travel exceeding the particular hand's configured meters, with dominance over vertical and forward/depth travel of at least 1.8:1.
- One latched motion event until a stationary reset. If tracking is absent, tokenizer resets.

This is **horizontal head-yaw-relative motion**, not a full 3D palm-space gesture or an assertion of measured Quest 3 accuracy.

## Deliberate calibration: separately for left and right hands

The new in-world **CALIBRATE HANDS** control is available inside the immersive Domistika ΦPose panel. It **cannot run while a gesture sentence is armed**.

1. Ensure both hands are visible and tracked.
2. Select **CALIBRATE HANDS** once. Hold the hands in a comfortable, open, steady position for approximately 1.2 seconds.
3. The active in-memory calibration measures the index-to-pinky metacarpal span for each hand independently. It requires at least 12 valid paired samples and a plausible span of 3.5–11.5 cm. Missing data for over 300 ms, session change or a 3.2 s timeout cancels.
4. A median measurement is converted to a bounded minimum swipe distance: `clamp(palm_span × 2.35, 10.5 cm, 24 cm)`. The UI shows separate **L / R thresholds** in centimeters.
5. No calibration data is saved or transmitted. Leaving XR clears both calibrated distances and restores the 15 cm-per-hand defaults. **CANCEL** discards an in-progress calibration.

These are **empirical motion-distance heuristics**, not physiological measurements or a clinical assessment. Calibration is optional; the original pose recognizer's pinch/extension thresholds remain unchanged in this rung.

## In-world recognition feedback

The 3D menu now displays:
- The selected fixed command.
- **NEXT COMMAND**, **ARM ONE PHRASE**, **CALIBRATE HANDS** and **CANCEL** controls.
- A live tracking summary `L:OK / L:--` and `R:OK / R:--`.
- The current motion thresholds (default or calibrated), `STEP 1/2` → `STEP 2/2`, and a whole-second countdown while armed.
- Recognition, tracking-loss, denied action, and calibration statuses in the in-world panel and accessible desktop sidebar.

Textures only regenerate if the displayed text changes. The feedback avoids rendering raw joints, recording gesture trajectories, and creating per-frame canvas textures.

## Safety and compatibility

- The Rung 13 one-shot, 6.5 s gesture window, explicit arming, tracking-loss cancellation and active-painting lockout are preserved. No automatic command execution occurs during calibration.
- A gesture still only requests one of **five studio rooms** or **next/previous future-stroke brush style**. The application independently checks current context; no paint, stroke, erase, save, delete, export, object or OS actions are added.
- All tracking and calibration remains **inside the active WebXR session**. No second browser, network requests, telemetry, browser storage or pose snapshots.
- Camera/right-axis samples are drawn from `XRFrame.getViewerPose` only. The detector freezes the initial axis for each potential swipe to resist head-turn-induced false positives.
- Calibration is ephemeral. Cross-window Rung 12 companion remains separately approved and unaffected.
- Quest Browser may not expose both hands simultaneously or hand selection ray events. The existing controller controls remain available if supported by the active device/browser.

## Test and acceptance workflow

```sh
node --test tests/xr-phipose-view-motion.test.mjs tests/xr-phipose-native.test.mjs
npm run build
```

CI adds module syntax checks and includes the new test suite in Domistika XR verification.

**Physical headset acceptance still needed**, specifically: see that the new menu is visible; calibrate separately for differently sized left/right hands; verify menu navigation with controllers and hand pinches; perform swipes while facing forward, at +90° and -90° yaw, while sitting/standing; reject depth-only / vertical gestures; verify simultaneous pose rejection, one-shot rearm, tracking loss and occlusion; and validate that no art/save state changes. Record Quest firmware/browser versions and unexpected misrecognitions, but **do not record raw hand joints by default**.

## Next rung

Only after actual Quest acceptance, consider a hand-only pointer/confirmation fallback where browsers don't emit hand `selectstart` events consistently; then add calibration presets and operator-controlled preview diagnostics for Gen.E-Wrist integration.
