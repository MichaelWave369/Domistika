import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const js=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const easel=readFileSync(new URL('../src/xr/easelStudio.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');

test('easel uses original flat canvas project and preserves pose on disable',()=>{
  assert.match(js,/createEaselStudio\(\{scene\}\)/);
  assert.match(js,/easel\.originalPose\(r\.group\)/);
  assert.match(js,/easel\.setEnabled\(false\)/);
  assert.match(easel,/active\.group\.position\.copy\(pose\.position\)/);
  assert.match(easel,/render\.paper\.material\.color\.setHex\(0xffffff\)/);
  assert.doesNotMatch(easel,/localStorage|fetch\(|XMLHttpRequest|eval\(/);
});

test('VR uses trigger raycast to select in-world pigments before drawing',()=>{
  assert.match(easel,/userData\.action=\{type:'easel-color'/);
  assert.match(js,/easel\.enabled\?easel\.actionMeshes/);
 assert.match(js,/studioXRTargets\(\)/);
 assert.match(js,/\.filter\(isWorldVisible\)/);
  assert.match(js,/chooseEaselColor\(a\.value\)/);
  assert.match(js,/toggleEasel\(\)/);
  assert.match(js,/continueStroke\(state\.board,state\.stroke/);
});

test('desktop entry, accessible toggle and backup remain available',()=>{
  assert.match(html,/id="easelToggle" aria-pressed="false"/);
  assert.match(html,/Artist Easel/);
  assert.match(js,/\$\('#easelToggle'\)\.addEventListener\('click',toggleEasel\)/);
  assert.match(js,/\$\('#downloadPng'\)\.addEventListener/);
  assert.match(js,/\$\('#exportScene'\)\.addEventListener/);
});
