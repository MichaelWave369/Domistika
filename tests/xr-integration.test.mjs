import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/xr/styles.css',import.meta.url),'utf8');
const vite=readFileSync(new URL('../vite.config.js',import.meta.url),'utf8');
test('XR route points at a real Three.js app entry',()=>{
 assert.match(html,/src="\/src\/xr\/main\.js"/);
 assert.match(js,/three\/addons\/webxr\/VRButton\.js/);
 assert.match(js,/three\/addons\/webxr\/ARButton\.js/);
 assert.match(js,/renderer\.setAnimationLoop/);
});
test('HTML provides all controls used by the app',()=>{
 const ids=new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]));
 const refs=[...js.matchAll(/\$\('#([\w-]+)'\)/g)].map(m=>m[1]);
 assert.ok(refs.length>15);for(const id of refs)assert.ok(ids.has(id),'Missing #'+id);
});
test('both original 2D and new XR routes are retained',()=>{
 assert.match(vite,/'\.\/index\.html'/);
 assert.match(vite,/'\.\/xr\.html'/);
 assert.match(vite,/base: '\/Domistika\/'/);
});
test('XR is local-first with no remote font dependencies',()=>{
 assert.doesNotMatch(css,/https?:\/\//);
 assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|eval\(/);
 assert.match(js,/localStorage\.setItem/);
});
