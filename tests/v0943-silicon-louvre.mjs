import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { inspectHandoff, sha256Hex, importedProject } from '../src/v0943/siliconLouvreBridge.js';

const now=1_800_000_000_000;
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#123456"/></svg>';
const packet={schema:'silicon-louvre.domistika-handoff.v1',source:'silicon-louvre',target:'domistika',
  createdAt:now,expiresAt:now+300_000,name:'Silicon Louvre bloom',width:800,height:800,
  recipe:{mode:'bloom',rings:6,segments:24,twist:30,palette:'gilded'},svg,svgSha256:await sha256Hex(svg,webcrypto)};
assert.ok(inspectHandoff(JSON.stringify(packet),now));
assert.equal(inspectHandoff(JSON.stringify({...packet,target:'other'}),now),null);
assert.equal(inspectHandoff(JSON.stringify(packet),now+300_001),null);
assert.equal(inspectHandoff(JSON.stringify({...packet,svg:'x'.repeat(351_000)}),now),null);
const project=importedProject({settings:{grid:false}},'data:image/png;base64,aGVsbG8=',packet);
assert.equal(project.layers.length,1);
assert.equal(project.layers[0].role,'paint');
assert.equal(project.width,800);
assert.equal(project.settings.grid,false);
assert.throws(()=>importedProject({},'https://example.com/x.png',packet));
console.log('Silicon Louvre receiver checks: PASS');
