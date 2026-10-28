import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const source=readFileSync(new URL('../src/xr/openblueModel.js',import.meta.url),'utf8');
const viewer=readFileSync(new URL('../src/xr/openbluePreview.js',import.meta.url),'utf8');
test('XR workbench links actual FramefieldStudio and OpenBlueprintStudio projects',()=>{
 assert.match(html,/michaelwave369\.github\.io\/FramefieldStudio\//);
 assert.match(html,/michaelwave369\.github\.io\/OpenBlueprintStudio\//);
 assert.match(html,/id="importBpcPreview"/);
 assert.match(html,/id="openblueLoad"/);
});
test('read-only OpenBlueprint preview stays independent from art storage',()=>{
 assert.match(app,/parseOpenBluePreview/);
 assert.match(app,/buildOpenBluePreview/);
 assert.match(app,/type:'openblue-toggle'/);
 assert.match(app,/openBluePreview\.group\.visible/);
 assert.doesNotMatch(source,/localStorage|fetch\(|XMLHttpRequest|eval\(/);
 assert.doesNotMatch(viewer,/localStorage|fetch\(|XMLHttpRequest|eval\(/);
 assert.match(viewer,/READ-ONLY|read-only/);
 assert.match(viewer,/metersPerUnit/);
});
test('all new HTML IDs referenced by JS are present',()=>{
 const ids=new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]));
 const refs=[...app.matchAll(/\$\('#([\w-]+)'\)/g)].map(m=>m[1]);
 for(const id of refs)assert.ok(ids.has(id),'Missing DOM control '+id);
 for(const id of ['openblueCount','openblueLoad','openblueClear','openblueVisibility','openblueScale','openblueFile'])assert.ok(ids.has(id));
});
