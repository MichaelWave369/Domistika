import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const spec = await readFile(new URL('../docs/PARALLAX_CREATIVE_INTEROP_V2.md', import.meta.url));
const manifest = JSON.parse(
  await readFile(new URL('../parallax-creative-interop.v2.json', import.meta.url), 'utf8'),
);

const actual = createHash('sha256').update(spec).digest('hex');

assert.equal(
  actual,
  manifest.spec_sha256,
  'Domistika must carry the exact frozen Parallax Creative Interop v2 profile',
);
assert.equal(manifest.protocol_id, 'parallax.creative-interop.v2');
assert.equal(manifest.status, 'candidate_pending_repository_ratification');
assert.deepEqual(manifest.canonical_owned_scope, [
  'MichaelWave369/Domistika',
  'MichaelWave369/Auralith369',
  'MichaelWave369/paracut',
  'MichaelWave369/WaveForgeStudio',
]);
assert.equal(manifest.optional_extensions[0].status, 'unratified_receiver');
assert.equal(manifest.native_contracts.domistika_auralith, 'parallax-creative-bridge-v2');

console.log('Domistika Parallax Creative Interop v2 profile hash checks passed');
