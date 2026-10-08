# Silicon Louvre → Domistika Receiver v1

A governed, explicit browser-local creative handoff from the museum's SVG design workbench.

## Prerequisites

- Silicon Louvre and Domistika are hosted on the **same origin**, `https://michaelwave369.github.io`, at their respective project paths.
- The matching Silicon Louvre sender PR must be deployed.
- The visitor clicks the send button, producing a short-lived localStorage transfer and navigating to Domistika at `#silicon-louvre-import`.

## Security checks

The receiver:
1. Reads only the protocol-specific `silicon-louvre-to-domistika-v1` key.
2. Validates schema, expected sender/receiver, 800×800 size, five-minute expiry and maximum length.
3. Verifies SHA-256 integrity of the SVG bytes with Web Crypto (integrity, **not identity authentication**).
4. Parses SVG XML and accepts only a narrow whitelist of static SVG elements and attributes. External images, scripts, handlers, animations, embedded documents and styles are rejected.
5. Shows the SVG only inside an image element, never as document markup.

This is not an endpoint for untrusted general-purpose SVG files. A cryptographic digest stored beside the payload cannot protect against a compromised same-origin script; the allowlist and visitor consent remain the primary defense.

## Visitor consent and preservation

The modal never auto-imports. It requires:

- **Download Current Project Backup**: obtain the current Domistika project's `.domistika` serialized representation including embedded motion clips when supported.
- **I have saved my backup** confirmation checkbox.
- **Import to New Canvas**: replace the active project with a new 800×800 one-layer painting containing the rasterized SVG.

The SVG is converted in-browser to PNG. It is not preserved as editable vector paths in Domistika. If restoration fails, Domistika tries to roll back the prior project snapshot. The visitor should retain the backup before importing because browsers cannot guarantee the OS actually saved a clicked download.

Cancel/decline leaves the existing project unchanged and clears the temporary handoff.

## Limitations

- Same-origin GitHub Pages only; there is no cross-origin request, server upload or third-party storage.
- The receiver preserves source artwork only as pixels, not as an editable SVG vector grammar.
- Imported artwork belongs to the active local project and is not automatically submitted to Domistika's or Silicon Louvre's public gallery.
- On non-GitHub-Pages deployments, visitors can use the museum's manual SVG download instead.

## Acceptance checklist

1. On Domistika, make a test project containing several layers and save a backup.
2. In Silicon Louvre, send a generated Bloom image. Verify the Domistika receiver shows the expected preview.
3. Decline once and inspect that the existing project is not modified.
4. Send again; download backup and confirm, then import. Confirm a new 800×800 project with one paint layer, no publishing.
5. Open the saved backup and confirm the previous project can be restored.
6. Tamper with localStorage SVG bytes and verify the receiver declines on SHA mismatch.
7. Expire the transfer timestamp and verify no modal is shown.
8. Check narrow mobile view, Esc close, keyboard focus and reduced-motion support.

Stable SDK contract used: `window.Domistika.project.serialize` / `window.Domistika.project.restore`. No raw canvas context is exposed through the SDK.
