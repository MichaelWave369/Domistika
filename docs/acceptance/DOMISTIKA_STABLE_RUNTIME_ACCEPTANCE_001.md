# Domistika Stable Runtime Acceptance 001

**Status:** PASS  
**Observed date:** 2026-09-28  
**Observed build:** Domistika \`0.9.27\`  
**Observed stable SDK:** \`0.1.6\`  
**SDK schema:** \`domistika.sdk.v1\`

## Purpose

Acceptance 001 records an external live-use verification of the self-describing Domistika runtime after the v0.9.24–v0.9.27 architecture ladder.

This is runtime evidence from a live deployed session, not merely a static source-code assertion.

## Contract observations

The live session reported:

- \`Domistika.capabilities()\` available and populated;
- \`commandCatalog\` count: **34**;
- layer roles exposed by capabilities;
- Playground capability exposed;
- tool discovery included \`fill\`, \`select\`, and \`smart\`;
- command/palette search returned semantic Portal results.

Observed Portal search results included:

\`\`\`text
motion.scene.particle-portal
playground.run
motion.portal
\`\`\`

This verifies that command search was operating as a real runtime contract rather than a visual-only palette feature.

## Semantic layer observations

The session changed ordinary layers to semantic roles and re-read them through the SDK:

\`\`\`text
Title → type
HUD   → motion-ignore
\`\`\`

Those roles remained visible through \`layers.list()\`.

Playground itself created:

\`\`\`text
Playground · Spiro        → paint
Playground · Static Frame → motion-ignore
\`\`\`

During the Portal sequence, the static frame remained fixed while the animated artwork moved beneath it.

This verifies the practical purpose of \`motion-ignore\`: titles, frames, HUDs, signatures, and other authored content can remain static during Kinetic preview.

## Playground closed loop

The live session invoked:

\`\`\`js
playground.run
\`\`\`

and observed successful completion.

Reported result:

\`\`\`text
ok:             true
recordSeconds:  3
recorded:       true
canRestore:     true
project title:  Domistika Playground
\`\`\`

The demo exercised:

\`\`\`text
Color
→ Spiro
→ scripted drawing
→ semantic layer roles
→ 3·6·9 Portal
→ targeted Kinetic recording
→ project motion clip
→ restorable previous-project state
\`\`\`

## Motion clip evidence

The generated clip was reported as:

\`\`\`text
name:      Domistika-Playground · Kinetic
container: WebM
codec:     VP9
size:      approximately 77 KB
duration:  approximately 3.3 seconds
fps:       30
\`\`\`

The live status reported:

\`\`\`text
Kinetic motion clip saved to project and exported
\`\`\`

This demonstrates that the Playground recording path reached the v0.9.22 project motion-clip system rather than only producing a transient preview.

## Acceptance conclusion

**PASS**

Acceptance 001 demonstrates a live closed loop across the major stable-runtime systems introduced in the recent architecture ladder:

- self-describing capabilities;
- runtime tool discovery;
- semantic command search;
- Color Studio;
- Spiro;
- semantic layer roles;
- motion-ignore behavior;
- Kinetic Portal;
- targeted recording;
- project-bound motion clips;
- Playground return state.

The evidence supports treating Domistika as a studio with a coherent runtime language rather than a collection of independently accessed labs.

## Scope limitation

This record preserves the observed external live-run results. It does not claim that every browser, codec implementation, GPU, or MediaRecorder environment will produce identical clip size or duration. Those values are evidence from this acceptance run, not universal constants.
