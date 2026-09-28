# Domistika v0.9.28 — Playground UX + Capability Hygiene

This release polishes the first-run Playground introduced in v0.9.27.

## Visible Playground entry point

The top bar now includes a small Playground action beside Commands.

Its state reflects the live Playground session:

\`\`\`text
▶ Playground
\`\`\`

before a demo has run, and:

\`\`\`text
↩ Return to Artwork
\`\`\`

while an in-session return snapshot exists.

The button does not implement a second demo path. It calls the same Playground runtime used by the stable SDK and command bus.

## Explicit return path

When Playground completes, Domistika now shows an on-screen return notice:

\`\`\`text
Playground complete.
Your previous artwork is safe.

[ Return to my artwork ]

⌘K / Ctrl+K → Playground · Return to Previous Artwork
\`\`\`

The normal status line also names the Command Palette return command explicitly.

The return control disappears after the previous project is restored.

## Capability hygiene

The v0.9.27 Playground state returned the entire latest motion-clip metadata object. Motion clips can contain a poster data URL, which is useful for Gallery presentation but wasteful in a frequently-polled capability snapshot.

v0.9.28 makes:

\`\`\`js
Domistika.playground.state()
Domistika.capabilities().playground
\`\`\`

return lightweight clip metadata only:

\`\`\`js
{
  id,
  name,
  kind,
  mimeType,
  bytes,
  durationSeconds,
  fps,
  createdAt
}
\`\`\`

It intentionally excludes:

\`\`\`text
poster
dataUrl
Blob / video bytes
\`\`\`

Full clip presentation data remains available through the Motion Clips surface when explicitly requested.

## Stable SDK

- app: \`0.9.28\`
- SDK: \`0.1.7\`
- schema: \`domistika.sdk.v1\`
- Playground schema remains \`domistika.playground.v1\`

No existing Playground command or method is removed.
