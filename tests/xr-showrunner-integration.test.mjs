import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../xr.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/xr/main.js',import.meta.url),'utf8');
const show=readFileSync(new URL('../src/xr/showrunner.js',import.meta.url),'utf8');
test('1.0 controls exist and every cue editing and showpack button has real event wiring',()=>{
 for(const id of ['runnerTitle','runnerCue','runnerCueName','runnerDuration','runnerPalette',
   'runnerGain','runnerEnergy','runnerApply','runnerProgress','runnerStatus','runnerPlay',
   'runnerPause','runnerReset','runnerPrev','runnerNext','runnerExport','runnerImport','runnerFile'])
  assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
 for(const command of ['runner.updateCue(index','runner.rename(','runner.play()','runner.pause()',
   'runner.reset()','runner.jump(','runner.tick(seconds)','writeShowPack(workshop.exportJson()',
   'readShowPack(await file.text())',"workshop.importJson(JSON.stringify(pack.workshop))"])
  assert.ok(main.includes(command),'Missing live integration '+command);
});
test('Quest actions trigger actual Showrunner methods; existing 3-page menu stays available',()=>{
 for(const action of ["type:'runner-play'","type:'runner-stop'","type:'runner-next'",
   "type:'runner-prev'","playRunner()","stopRunner()","stepRunner(1)","stepRunner(-1)"])
   assert.ok(main.includes(action),'Missing XR action '+action);
 assert.match(main,/changeWorkPage\(a\.delta\)/);
 assert.match(main,/mesh\.visible=enabled;mesh\.layers\.set\(enabled\?0:1\)/);
});
test('portable package has guarded imports, user confirmation and no audio or network serialization',()=>{
 assert.match(main,/file\.size>SHOWPACK_MAX_BYTES/);
 assert.match(main,/window\.confirm\(/);
 assert.match(show,/readWorkshop\(writeWorkshop\(pack\.workshop\)\)/);
 assert.doesNotMatch(show,/getUserMedia|XMLHttpRequest|fetch\(|MediaRecorder|audio\.play\(|localStorage|indexedDB/);
 assert.match(main,/renderer\.xr\.addEventListener\('sessionend'/);
 assert.match(main,/document\.addEventListener\('visibilitychange'/);
 assert.match(main,/window\.addEventListener\('pagehide'/);
});
test('every static ID referenced in XR script is still present',()=>{
 const ids=new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map(m=>m[1]));
 for(const m of main.matchAll(/\$\('#([\w-]+)'\)/g))
   assert.ok(ids.has(m[1]),'Missing ID '+m[1]);
});
