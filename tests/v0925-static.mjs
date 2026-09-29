import assert from 'node:assert/strict';
import fs from 'node:fs';

const sdk=fs.readFileSync(new URL('../src/DomistikaSDKV0921.js',import.meta.url),'utf8');
const palette=fs.readFileSync(new URL('../src/DomistikaCommandPaletteV0923.js',import.meta.url),'utf8');
const colors=fs.readFileSync(new URL('../src/DomistikaColorStudioV0924.js',import.meta.url),'utf8');
const readme=fs.readFileSync(new URL('../README.md',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));

assert.ok(Number(pkg.version.split('.')[2]) >= 26);
const appVersion=/APP_VERSION = '(\d+)\.(\d+)\.(\d+)'/.exec(sdk);
assert.ok(appVersion);
assert.ok(Number(appVersion[1])>0||Number(appVersion[2])>9||(Number(appVersion[2])===9&&Number(appVersion[3])>=25));
assert.match(sdk,/SDK_VERSION = '0\.1\.7'/);
assert.match(sdk,/function liveToolIds\(\)/);
assert.match(sdk,/domistikaFillV091/);
assert.match(sdk,/domistikaSelectionV04/);
assert.match(sdk,/smartMasksReady/);
assert.match(sdk,/function commandSearch\(/);
assert.match(sdk,/search: commandSearch/);
assert.match(sdk,/tools: liveToolIds\(\)/);
assert.match(sdk,/list: liveToolIds/);

assert.match(palette,/window\.Domistika\.commands\.search/);
assert.match(palette,/search\.addEventListener\('input'/);
assert.match(palette,/if \(dialog\.open\)/);

assert.match(colors,/#colorStudioHarmony \.color-studio-swatch/);
assert.match(colors,/outline:1px solid/);

assert.match(readme,/Domistika\.capabilities\(\)/);
assert.match(readme,/machine-readable source of truth/i);

console.log('v0.9.25 live contract and polish checks passed');
