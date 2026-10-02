import assert from 'node:assert/strict';
import fs from 'node:fs';
import {VERSION,SCHEMA,CSS_COLORS,GRADIENTS,normalizeHex,rgbToHex,hexToRgb,rgbToHsl,hslToRgb,harmonyColors,gradientCss} from '../src/DomistikaColorStudioV0924.js';

const source=fs.readFileSync(new URL('../src/DomistikaColorStudioV0924.js',import.meta.url),'utf8');
const sdk=fs.readFileSync(new URL('../src/DomistikaSDKV0921.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));

assert.equal(VERSION,'0.9.24');
assert.equal(SCHEMA,'domistika.color-studio.v1');
assert.ok(CSS_COLORS.length>=20);
assert.ok(GRADIENTS.length>=8);
assert.equal(normalizeHex('#abc'),'#aabbcc');
assert.equal(normalizeHex('#12abef'),'#12abef');
assert.equal(normalizeHex('bad'),null);
assert.equal(rgbToHex(255,122,24),'#ff7a18');
assert.deepEqual(hexToRgb('#ff7a18'),{r:255,g:122,b:24});
assert.deepEqual(rgbToHsl(255,0,0),{h:0,s:100,l:50});
assert.deepEqual(hslToRgb(0,100,50),{r:255,g:0,b:0});
assert.equal(harmonyColors('#ff0000').length,5);
assert.match(gradientCss(GRADIENTS[0]),/linear-gradient/);
assert.match(gradientCss(GRADIENTS.find((item)=>item.type==='radial')),/radial-gradient/);

const [major,minor,patch]=pkg.version.split('.').map(Number);
assert.ok(major>0||minor>9||(minor===9&&patch>=24));
assert.match(index,/DomistikaColorStudioV0924\.js/);
assert.ok(index.indexOf('DomistikaSDKV0921.js')<index.indexOf('DomistikaColorStudioV0924.js'));
assert.match(sdk,/SDK_VERSION = '0\.1\.\d+'/);
assert.match(sdk,/room\.colors/);
assert.match(sdk,/colors:/);
assert.match(source,/type="color"/);
assert.match(source,/colorStudioHex/);
assert.match(source,/colorStudioR/);
assert.match(source,/colorStudioH/);
assert.match(source,/destination-over/);
assert.match(source,/engine\.captureHistory\(\)/);
assert.match(source,/domistika:gradient-applied/);
assert.match(source,/domistika:color-change/);
assert.doesNotMatch(source,/eval\s*\(/);
assert.doesNotMatch(source,/new Function\s*\(/);
assert.doesNotMatch(source,/fetch\s*\(/);

console.log('v0.9.24 Color Studio checks passed');
