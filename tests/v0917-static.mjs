import assert from 'node:assert/strict';
import fs from 'node:fs';

const mindMelt = fs.readFileSync(new URL('../src/DomistikaMindMeltV0917.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const [major, minor, patch] = pkg.version.split('.').map(Number);
assert.ok(major > 0 || minor > 9 || (minor === 9 && patch >= 17));
assert.match(index, /DomistikaMindMeltV0917\.js/);
assert.ok(index.indexOf('DomistikaKineticComposerV0916.js') < index.indexOf('DomistikaMindMeltV0917.js'));
assert.ok(index.indexOf('DomistikaMindMeltV0917.js') < index.indexOf('main.js'));

assert.match(mindMelt, /Slow Trails/);
assert.match(mindMelt, /Kaleido 8/);
assert.match(mindMelt, /Kaleido 12/);
assert.match(mindMelt, /Kaleido 16/);
assert.match(mindMelt, /Figure 8/);
assert.match(mindMelt, /Quick WebM/);
assert.match(mindMelt, /Black Stage/);
assert.match(mindMelt, /MIND MELT/);
assert.match(mindMelt, /startQuickRecord/);
assert.match(mindMelt, /window\.domistikaMindMeltV0917/);
assert.match(mindMelt, /domistika:mind-melt-ready/);

console.log('v0.9.17+ Mind Melt static checks passed');
