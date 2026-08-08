const VERSION = '0.9.15';
const INSTALL_FLAG = '__domistikaKineticLiveSourceV0915Installed';

if (!window[INSTALL_FLAG]) {
  window[INSTALL_FLAG] = true;

  const START_SELECTORS = [
    '#kineticPlay',
    '#kinetic369',
    '#kineticRandom',
    '#kineticRecord',
    '#kineticExportStill',
    '[data-kinetic-preset]',
  ].join(',');

  function runtime() {
    return window.domistikaKineticExpansionV0914 || window.domistikaKineticRuntime || null;
  }

  function markSourceDirty() {
    const rt = runtime();
    if (!rt?.state || rt.state.visible) return;
    rt.state.source = null;
    rt.state.background = null;
    rt.state.selectionLayer = null;
  }

  function refreshBeforePreview(event) {
    const target = event.target instanceof Element ? event.target.closest(START_SELECTORS) : null;
    if (!target) return;
    const rt = runtime();
    if (!rt || rt.state?.visible) return;

    // Capture the authored canvases while they are still visible, before the
    // v0.9.14 target-level click handler hides them for the motion preview.
    rt.refresh?.(false);
  }

  function install() {
    const rt = runtime();
    if (!rt?.state) return false;

    document.addEventListener('click', refreshBeforePreview, true);
    document.addEventListener('domistika:v03-content', markSourceDirty);
    document.addEventListener('domistika:v04-engine', markSourceDirty);

    // Project recovery/import can finish after the kinetic UI installs. Keeping
    // the cached snapshot invalid here forces the first preview to use the
    // current artwork instead of an early blank startup frame.
    markSourceDirty();

    window.domistikaKineticLiveSourceV0915 = {
      version: VERSION,
      refreshNow() {
        const current = runtime();
        return current?.refresh?.(false) ?? false;
      },
      markSourceDirty,
    };
    document.documentElement.dataset.kineticLiveSource = VERSION;
    return true;
  }

  function wait(attempt = 0) {
    if (install()) return;
    if (attempt < 1200) requestAnimationFrame(() => wait(attempt + 1));
  }

  window.addEventListener('domistika:kinetic-expansion-ready', () => requestAnimationFrame(() => wait()), { once: true });
  wait();
}
