# Domistika Playground v0.9.27

Playground is a one-command demonstration of the systems that make Domistika more than a basic drawing canvas.

Run it from the Command Palette:

\`\`\`text
Playground · Demo the Studio
\`\`\`

or from the stable SDK:

\`\`\`js
await Domistika.playground.run()
\`\`\`

## What it does

The default Playground sequence:

\`\`\`text
save return snapshot
      ↓
new 1200 × 1200 demo canvas
      ↓
Portal Core gradient
      ↓
Flower Spiro
      ↓
Gear Spiro
      ↓
static motion-ignore frame
      ↓
3·6·9 Portal
      ↓
3 second Kinetic recording
      ↓
project motion clip + Gallery card
      ↓
Stop Motion
\`\`\`

The demo intentionally exercises several independent Domistika contracts through the stable SDK.

## Preserving the current artwork

Before changing the active canvas, Playground keeps an in-session return snapshot.

After exploring the demo, run:

\`\`\`text
Playground · Return to Previous Artwork
\`\`\`

or:

\`\`\`js
await Domistika.playground.restorePrevious()
\`\`\`

The previous project is restored through the stable project API, including its motion-clip metadata.

The return snapshot is intentionally session-scoped rather than silently creating another persistent file.

## Layer-role demonstration

Playground creates a thin frame layer and marks it:

\`\`\`text
motion-ignore
\`\`\`

The Portal animates underneath while the frame stays fixed. This makes the new v0.9.26 layer-role behavior visible immediately.

## Motion recording

The stable SDK now supports targeted recording sources:

\`\`\`js
Domistika.motion.record.start({ source: 'kinetic' })
Domistika.motion.record.stop({ source: 'kinetic' })
\`\`\`

Accepted sources are:

- \`auto\`
- \`kinetic\`
- \`composer\`
- \`visual\`

Existing calls with no argument still use \`auto\`, preserving prior behavior.

The Playground uses the Kinetic source so the recorded output matches the Portal performance it starts.

## Recording fallback

If MediaRecorder or canvas capture is unavailable, Playground still:

- builds the demo artwork;
- starts the Portal;
- demonstrates the static motion-ignore frame;
- stops safely.

It reports that recording was skipped rather than treating the entire demo as failed.

## Stable SDK v0.1.6

New project surface:

\`\`\`js
await Domistika.project.restore(project)
\`\`\`

New Playground surface:

\`\`\`js
Domistika.playground.state()
await Domistika.playground.run()
await Domistika.playground.restorePrevious()
\`\`\`

## Events

Playground emits:

- \`domistika:playground-ready\`
- \`domistika:playground-start\`
- \`domistika:playground-complete\`
- \`domistika:playground-failed\`
- \`domistika:playground-returned\`

## Contracts

- app: \`0.9.27\`
- stable SDK: \`0.1.6\`
- Playground schema: \`domistika.playground.v1\`

No network service, cloud account, or remote authority is introduced.
