# Domistika v0.9.29 — Native WebMCP Site Tools

Domistika now exposes a thin browser-native WebMCP layer over the frozen \`window.Domistika\` stable SDK.

The architecture is intentionally simple:

\`\`\`text
browser agent / site tools
        ↓
WebMCP
        ↓
Domistika site-tool adapter
        ↓
window.Domistika
        ↓
existing stable semantic runtime
\`\`\`

The site-tool adapter does not reach into raw canvas contexts, versioned labs, or hidden UI implementation details.

## Why a thin adapter

Domistika already has a stable language. WebMCP should expose that language rather than create another one.

The native site-tool layer therefore registers a small curated set of tools instead of registering every internal command separately.

This keeps agent context compact and lets the live Domistika command catalog remain the discoverable source for deeper actions.

## Registered tools

### Read-only

\`\`\`text
domistika_get_capabilities
domistika_search_commands
domistika_get_state
\`\`\`

### Mutating

\`\`\`text
domistika_draw_stroke
domistika_set_color
domistika_apply_gradient
domistika_place_spiro
domistika_set_layer_role
domistika_transfer_to_auralith
domistika_execute_command
\`\`\`

All mutation tools route through the stable SDK.

## Capability discovery

\`\`\`text
domistika_get_capabilities
\`\`\`

returns a slim live snapshot containing:

- app and SDK versions;
- available tools;
- draw tools;
- semantic layer roles;
- command count;
- Spiro capability;
- Color Studio capability;
- Motion capability;
- capture availability;
- Playground state.

The full command catalog is intentionally not copied into every capability response. Agents can search it explicitly.

## Command discovery and execution

\`\`\`text
domistika_search_commands
domistika_execute_command
\`\`\`

wrap:

\`\`\`js
Domistika.commands.search(...)
Domistika.commands.execute(...)
\`\`\`

The execute tool verifies that the requested command exists in the live command list before invoking it.

It is a bounded application-command path, not arbitrary JavaScript execution.

## Drawing

\`\`\`text
domistika_draw_stroke
\`\`\`

accepts at most 1024 points and routes to:

\`\`\`js
Domistika.stroke(...)
\`\`\`

Allowed scripted drawing tools are:

\`\`\`text
pencil
ink
marker
airbrush
eraser
\`\`\`

The tool supports normalized or canvas coordinates and bounded pressure.

## Color and gradients

\`\`\`text
domistika_set_color
domistika_apply_gradient
\`\`\`

route through Color Studio.

Gradient mode remains explicit:

\`\`\`text
behind
replace
\`\`\`

so agents cannot accidentally confuse a background fill with destructive active-layer replacement.

## Spiro

\`\`\`text
domistika_place_spiro
\`\`\`

wraps the existing stable Spiro placement API with bounded coordinates, opacity, scale, rotation, and line width.

## Semantic layer roles

\`\`\`text
domistika_set_layer_role
\`\`\`

supports:

\`\`\`text
paint
guide
type
motion-ignore
\`\`\`

This lets a browser-native agent use the same Motion exclusion semantics proven in Stable Runtime Acceptance 001.

## WebMCP lifecycle

The adapter prefers the current:

\`\`\`js
document.modelContext.registerTool(...)
\`\`\`

API and retains a compatibility fallback for older \`navigator.modelContext\` implementations.

Every registration is tied to an \`AbortController\`, allowing the complete tool set to be withdrawn cleanly.

Normal browsers without WebMCP still run Domistika normally. In those browsers:

\`\`\`js
window.domistikaSiteToolsV0929.available === false
\`\`\`

and the stable SDK remains available as before.

## Annotations

Read tools use:

\`\`\`text
readOnlyHint: true
\`\`\`

Mutation tools use:

\`\`\`text
readOnlyHint: false
\`\`\`

Creative edits are bounded/reversible application actions and are not marked as high-stakes consequential operations.

Tool results containing user-controlled project or command metadata are marked as untrusted where appropriate.

## Auralith transfer

The native action:

```text
domistika_transfer_to_auralith
```

calls:

```js
Domistika.bridge.auralith.transfer()
```

and therefore emits the same hash-bound Creative Bridge v2 package as the human Auralith button and stable SDK.

The site tool does not create an alternate transfer format.

## Boundaries

The site-tool module adds no:

- arbitrary JavaScript evaluation;
- raw Canvas 2D context;
- raw WebGL context;
- network fetch API;
- filesystem API;
- direct versioned-lab access.

\`\`\`text
WEBMCP TOOL != RAW PAGE AUTHORITY
SITE TOOL != ARBITRARY JAVASCRIPT
DISCOVERY != MUTATION AUTHORITY
\`\`\`

## Contracts

\`\`\`text
Domistika app:    0.9.30
Stable SDK:       0.1.8
Stable SDK schema domistika.sdk.v1
Site tools:       0.1.1
Site-tool schema: domistika.site-tools.v1
\`\`\`
