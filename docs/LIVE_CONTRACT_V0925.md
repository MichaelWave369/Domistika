# Domistika Live Contract v0.9.25

Domistika's canonical runtime contract is now the object returned by:

\`\`\`js
Domistika.capabilities()
\`\`\`

The README and version notes explain features, but they are not the machine-readable authority for what a running build can do.

## Why

Domistika grew through additive modules. That was useful for shipping quickly, but it also meant the original core lists stopped describing the whole application.

For example, Fill and Selection arrived as extensions after the original CanvasEngine tool set existed.

The stable SDK now asks the running application what is available instead of treating the original core list as timeless truth.

## Tool discovery

\`\`\`js
Domistika.tool.list()
\`\`\`

is now runtime-aware.

It includes the core tools and, when their runtimes are present:

- \`fill\`
- \`select\`
- \`smart\`

The stable setter also routes extension tools through their owning runtime where a bounded public action exists.

Examples:

\`\`\`js
Domistika.tool.set('fill')
Domistika.tool.set('select')
\`\`\`

Smart selection is discovered from the installed Smart Masks surface and is invoked through its visible bounded launcher until that older module receives its own stable semantic method.

## Capabilities

\`\`\`js
const caps = Domistika.capabilities()
\`\`\`

reports the live tool list plus the stable feature contracts for Spiro, Color Studio, Motion, motion clips, capture, and commands.

Consumers should prefer capabilities checks over version sniffing.

Good:

\`\`\`js
if (Domistika.capabilities().colors.available) {
  Domistika.colors.open()
}
\`\`\`

Avoid:

\`\`\`js
if (Domistika.appVersion >= '0.9.24') {
  // assume Color Studio exists
}
\`\`\`

## Command search

The command registry now owns search too:

\`\`\`js
Domistika.commands.search('portal')
Domistika.commands.search('motion record')
\`\`\`

This means programmatic clients do not need to stuff text into the Command Palette input and synthesize keyboard events.

The palette itself uses the same SDK search method, so human typing and scripted discovery follow one ranking contract.

## Color contrast polish

Harmony and color swatches now use a high-contrast light border plus a dark outline.

This keeps both near-black and near-white harmony colors visible against the studio's surfaces.

## Contract versions

- Domistika app: \`0.9.25\`
- Stable SDK: \`0.1.4\`
- SDK schema: \`domistika.sdk.v1\`

The schema remains v1 because this rung extends discovery/search without removing or renaming the existing public methods.
