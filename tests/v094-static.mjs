import assert from 'node:assert/strict';
import fs from 'node:fs';

const files = [
  'src/DomistikaInkTypeV094.js',
  'src/v094/brushSets.js',
  'src/v094/textStudio.js',
  'src/v094/morphEffects.js',
  'src/v094/stencils.js',
];
for (const file of files) assert.ok(fs.existsSync(file), `${file} must exist`);
const entry = fs.readFileSync('src/DomistikaInkTypeV094.js', 'utf8');
assert.match(entry, /Ink \+ Type Studio/);
assert.match(entry, /domistika:v094-ready/);
assert.match(entry, /recognizeLayerText/);
assert.match(entry, /applyMorph/);
assert.match(entry, /stampStencil/);
const brushes = fs.readFileSync('src/v094/brushSets.js', 'utf8');
assert.match(brushes, /Copperplate Flex/);
assert.match(brushes, /Cloud Stamp/);
const stencils = fs.readFileSync('src/v094/stencils.js', 'utf8');
assert.match(stencils, /Lettering Guides/);
console.log('v0.9.4 static checks passed');
