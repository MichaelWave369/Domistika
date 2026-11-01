import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STUDIO_ROOMS,STUDIO_DESTINATIONS} from '../src/xr/studioNavigator.js';
const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/xr/styles.css',import.meta.url),'utf8');
const navigator=readFileSync(new URL('../src/xr/studioNavigator.js',import.meta.url),'utf8');

test('Studio Home offers exactly four independent creative rooms',()=>{
 assert.deepEqual(STUDIO_DESTINATIONS,['canvas','spatial','workshop','gallery']);
 for(const room of ['home',...STUDIO_DESTINATIONS]){
  assert.ok(STUDIO_ROOMS[room].title);
  if(room!=='home')assert.ok(html.includes('data-studio-room="'+room+'"'));
 }
 assert.match(html,/id="studioHome"/);
 assert.match(html,/id="studioAdvancedToggle"/);
});

test('room routing reuses original drawing, 3D and workshop models',()=>{
 for(const token of ['easel.setEnabled(true','brushStudio.root.visible','workshop.root.visible','syncBoardVisibility','goToStudioRoom']){
  assert.ok(main.includes(token),'Missing navigation integration '+token);
 }
 assert.match(main,/studioNav\.originalPose\(r\.group\)/);
 assert.match(main,/studioNav\.leaveGallery\(\)/);
 assert.doesNotMatch(navigator,/localStorage|fetch\(|XMLHttpRequest|writeScene/);
});

test('Controller rays and desktop clicks see Home but not hidden tool decks',()=>{
 assert.match(navigator,/type:'studio-room'/);
 assert.match(main,/function studioXRTargets\(\)/);
 assert.match(main,/\.filter\(isWorldVisible\)/);
 assert.match(main,/a\.type==='studio-room'/);
 assert.match(main,/activeStudioRoom==='home'/);
 assert.match(main,/intersectObjects\(studioNav\.controls\.filter\(isWorldVisible\)/);
 assert.match(css,/studio-simple #studio-legacy-tools\{display:none\}/);
});

test('Gallery presentation is reversible and is not persisted as project geometry',()=>{
 assert.match(navigator,/function leaveGallery\(\)/);
 assert.match(navigator,/galleryPoses\.set\(group/);
 assert.match(navigator,/originalPose\(group\)/);
 assert.match(main,/const original=easel\.originalPose\(r\.group\)\|\|studioNav\.originalPose\(r\.group\)/);
 assert.match(main,/if\(room==='gallery'\)studioNav\.showGallery/);
 assert.match(main,/if\(activeStudioRoom==='gallery'\)return/);
});

test('quick tools preserve exports and existing action paths',()=>{
 for(const action of ['undo','redo','save-canvas','export-png','spatial-export','work-export']){
  assert.ok(html.includes('data-studio-action="'+action+'"'));
 }
 assert.match(main,/action==='export-png'/);
 assert.match(main,/brushStudio\.undo\(\)/);
 assert.match(main,/workshop\.save\(\)/);
 assert.match(main,/const room=\{1:'canvas',2:'spatial',3:'workshop',4:'gallery',h:'home'\}/);
});
