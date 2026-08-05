import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const entry = read('src/DomistikaPrecisionGeometryV092.js');
const numeric = read('src/v092/numericInputs.js');
const wheel = read('src/v092/workspaceLabel.js');
const modes = read('src/v092/geometryModes.js');
const panels = read('src/v092/geometryPanels.js');
const index = read('index.html');
const pkg = JSON.parse(read('package.json'));

for (const module of ['numericInputs.js', 'workspaceLabel.js', 'geometryModes.js', 'geometryPanels.js']) {
  if (!entry.includes(module)) throw new Error(`v0.9.2 entrypoint missing ${module}`);
}
if (!numeric.includes('precision-number-input') || !numeric.includes("input[type=\"range\"]")) throw new Error('Exact numeric companion contract missing');
if (!wheel.includes('studio-wheel-toggle-copy strong') || !wheel.includes('pointerover')) throw new Error('Workspace hover label contract missing');
for (const mode of ['sacred-vesica', 'sacred-seed-6', 'sacred-flower-12', 'sacred-metatron-13', 'phi-spiral-13', 'phi-bloom-21', 'golden-angle-34', 'fib-ring-13', 'fib-echo-8', 'phi-mirror-12']) {
  if (!modes.includes(mode)) throw new Error(`Geometry mode missing: ${mode}`);
}
for (const count of ['7', '9', '14', '18', '20', '30', '32', '36', '48']) {
  if (!modes.includes(count)) throw new Error(`Extended radial count missing: ${count}`);
}
for (const family of ["[16, 18, 24]", "[13, 21]"]) {
  if (!modes.includes(family)) throw new Error(`Extended symmetry family missing: ${family}`);
}
if (!panels.includes('Sacred Geometry Lab') || !panels.includes('Phi + Fibonacci Lab') || !panels.includes('customRadialCount')) throw new Error('Geometry workspace contract missing');
if (!index.includes('DomistikaPrecisionGeometryV092.js')) throw new Error('v0.9.2 entrypoint is not loaded');
if (pkg.version !== '0.9.2') throw new Error(`Expected package version 0.9.2, got ${pkg.version}`);

console.log('Domistika v0.9.2 static contracts passed.');
