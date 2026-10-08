import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { inspectHandoff, sha256Hex, importedProject, validateStaticSvg } from '../src/v0943/siliconLouvreBridge.js';

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
// Production runs DOMParser in the browser. This lightweight parsed-element
// fixture tests the receiver's *policy*, not the browser's XML parser.
function element(localName, attributes = {}) {
  return {
    localName,
    namespaceURI: 'http://www.w3.org/2000/svg',
    attributes: Object.entries(attributes).map(([name, value]) => ({name, value})),
    getAttribute(name) { return Object.hasOwn(attributes, name) ? attributes[name] : null; },
  };
}
function fixtureParser(extra = [], bad = false) {
  const root = element('svg', {
    xmlns: 'http://www.w3.org/2000/svg', width: '800', height: '800',
    viewBox: '0 0 800 800', role: 'img', 'aria-label': 'Static generative optical art',
  });
  const elements = [root, element('defs'), element('radialGradient',{id:'studio-bg'}),
    element('stop',{offset:'0%', 'stop-color':'#d8b878'}),
    element('rect',{width:'800',height:'800',fill:'url(#studio-bg)'}), ...extra];
  return {
    parseFromString(_, type) {
      assert.equal(type, 'image/svg+xml');
      return {
        documentElement: root,
        querySelector(selector) { return selector === 'parsererror' && bad ? element('parsererror') : null; },
        querySelectorAll(selector) { return selector === '*' ? elements : []; },
      };
    },
  };
}
const bloomMotif=element('path', {'data-motif':'yes',d:'M0 0 L10 10 Z',fill:'#d8b878',stroke:'#f8e7bc','stroke-width':'3'});
const gearMotif=element('polygon', {'data-motif':'yes',points:'0,0 10,0 5,10',fill:'#aabbcc'});
const irisMotif=element('g',{'data-motif':'yes',transform:'translate(400 400) rotate(90)'});
const validFixture='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"></svg>';
assert.equal(validateStaticSvg(validFixture,fixtureParser([bloomMotif,gearMotif,irisMotif])),true,
  'all three visitor studio motifs must pass the receiver allowlist');
assert.equal(validateStaticSvg(validFixture,fixtureParser([element('path',{'data-motif':'no'})])),false,
  'unexpected custom motif values remain forbidden');
assert.equal(validateStaticSvg(validFixture,fixtureParser([element('path',{onload:'alert(1)'})])),false,
  'event handlers remain forbidden');
assert.equal(validateStaticSvg(validFixture,fixtureParser([element('image',{href:'https://evil.test/a.png'})])),false,
  'external image nodes remain forbidden');
assert.equal(validateStaticSvg(validFixture,fixtureParser([],true)),false,
  'parser errors remain forbidden');

// Iris Cathedral uses one group, one eye path and three circles per motif.
// Its max 9 x 36 layout is about 1,630 SVG nodes, not an attack.
const irisNodes=Array.from({length:9*36},()=>[
  element('g',{'data-motif':'yes'}),
  element('path',{d:'M0 0 L5 5 Z'}),
  element('circle',{r:'5'}),
  element('circle',{r:'3'}),
  element('circle',{r:'1'}),
]).flat();
assert.equal(validateStaticSvg(validFixture,fixtureParser(irisNodes)),true,
  'largest supported Iris Cathedral should not trip element count limit');
const oversizedNodes=Array.from({length:2001},()=>element('circle',{r:'4'}));
assert.equal(validateStaticSvg(validFixture,fixtureParser(oversizedNodes)),false,
  'larger-than-supported SVG trees remain forbidden');

console.log('Silicon Louvre receiver checks: PASS');
