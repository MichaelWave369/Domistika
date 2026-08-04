import './v085/patternModes.js';
import './v085/workspaceWheel.js';
import './v085/brushVisuals.js';
import './v085/navigator.js';

document.documentElement.dataset.proWorkspace = 'v0.8.5';
document.dispatchEvent(new CustomEvent('domistika:v085-ready'));
