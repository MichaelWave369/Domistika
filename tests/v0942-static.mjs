import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VERSION,
  SCHEMA,
  QUALIFICATION_ID,
  stableJson,
  sha256Text,
  qualificationCheck,
  finalizeQualificationReceipt,
} from '../src/v0942/fieldQualification.js';

assert.equal(VERSION, '0.9.42');
assert.equal(SCHEMA, 'domistika.field-qualification.v1');
assert.equal(QUALIFICATION_ID, 'creative-authority-e2e');

assert.equal(
  stableJson({ z: 1, a: { y: 2, x: 3 } }),
  '{"a":{"x":3,"y":2},"z":1}',
  'qualification receipt JSON must canonicalize object keys',
);

const digest = await sha256Text('domistika');
assert.match(digest, /^[0-9a-f]{64}$/);

const pass = qualificationCheck('example.pass', true, { value: 1 }, 'passes');
const fail = qualificationCheck('example.fail', false, { value: 2 }, 'fails');
assert.equal(pass.passed, true);
assert.equal(fail.passed, false);
assert.ok(Object.isFrozen(pass));
assert.ok(Object.isFrozen(pass.evidence));

const passReceipt = await finalizeQualificationReceipt({
  startedAt: '2026-10-02T00:00:00.000Z',
  completedAt: '2026-10-02T00:00:01.000Z',
  appVersion: '0.9.42',
  sdkVersion: '0.1.19',
  checks: [pass],
  evidence: { sample: true },
});
assert.equal(passReceipt.status, 'PASS');
assert.deepEqual(passReceipt.summary, { total: 1, passed: 1, failed: 0 });
assert.match(passReceipt.contentHash, /^sha256:[0-9a-f]{64}$/);

const failReceipt = await finalizeQualificationReceipt({
  startedAt: '2026-10-02T00:00:00.000Z',
  completedAt: '2026-10-02T00:00:01.000Z',
  appVersion: '0.9.42',
  sdkVersion: '0.1.19',
  checks: [pass, fail],
  evidence: {},
});
assert.equal(failReceipt.status, 'FAIL');
assert.deepEqual(failReceipt.summary, { total: 2, passed: 1, failed: 1 });

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/v0942/fieldQualificationRuntime.js', import.meta.url), 'utf8');
const panel = fs.readFileSync(new URL('../src/v0942/fieldQualificationPanel.js', import.meta.url), 'utf8');
const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const docs = fs.readFileSync(new URL('../docs/FIELD_QUALIFICATION_V0942.md', import.meta.url), 'utf8');

assert.equal(pkg.version, '0.9.42');
assert.match(pkg.scripts.check, /tests\/v0942-static\.mjs/);
assert.match(index, /DomistikaFieldQualificationV0942\.js/);

assert.match(runtime, /serialize\(\{ embedMotion: true \}\)/);
assert.match(runtime, /finally \{/);
assert.match(runtime, /restore\(originalProject\)/);
assert.match(runtime, /canvasHash/);
assert.match(runtime, /sha256Bytes/);
assert.match(runtime, /authority\.lock-refusal/);
assert.match(runtime, /sector\.outside-write-no-effect/);
assert.match(runtime, /sector\.inside-redraw/);
assert.match(runtime, /sector\.inside-erase/);
assert.match(runtime, /sector\.erase-then-redraw/);
assert.match(runtime, /sector\.refold/);
assert.match(runtime, /history\.undo-refold/);
assert.match(runtime, /history\.redo-refold/);
assert.match(runtime, /project\.save-restore/);
assert.match(runtime, /export\.psd-audit/);
assert.match(runtime, /export\.psd-write/);
assert.match(runtime, /transaction\.restore-original/);
assert.match(runtime, /domistika:v0942-field-qualification/);
assert.match(runtime, /domistika-v0942-field-qualification/);

assert.match(panel, /Run qualification/);
assert.match(panel, /Download receipt/);
assert.match(panel, /application\/json/);

assert.match(sdk, /APP_VERSION = '0\.9\.42'/);
assert.match(sdk, /SDK_VERSION = '0\.1\.19'/);
assert.match(sdk, /fieldQualification: Object\.freeze/);
assert.match(sdk, /qualification: \{/);
assert.match(sdk, /qualification\.run/);

assert.match(docs, /transactional test project/i);
assert.match(docs, /SHA-256 over raw RGBA pixel bytes/i);
assert.match(docs, /restore original project/i);
assert.match(docs, /frozen acceptance path/i);

console.log('Domistika v0.9.42 field qualification contracts passed.');
