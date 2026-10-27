import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const xr = readFileSync(new URL('../xr.html', import.meta.url), 'utf8');
const vite = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');

test('regular Domistika has a discoverable XR toolbar link that preserves the active canvas tab', () => {
  assert.match(main, /<div class="top-actions"><a class="xr-entry-link" href="\.\/xr\.html"/);
  assert.match(main, /target="_blank" rel="noopener noreferrer"/);
  assert.match(main, /aria-label="Open Domistika XR Studio in a new tab"/);
  assert.match(main, /XR <span class="xr-entry-detail">Studio<\/span>/);
});

test('XR route exists, returns to Domistika, and is included in the production Vite build', () => {
  assert.match(xr, /class="back-link" href="\.\/"/);
  assert.match(vite, /xr:\s*fileURLToPath\(new URL\('\.\/xr\.html'/);
  assert.match(vite, /base:\s*'\/Domistika\/'/);
});

test('XR entrance keeps a visible short label on narrower layouts and keyboard focus styling', () => {
  assert.match(styles, /\.xr-entry-link\{/);
  assert.match(styles, /\.xr-entry-link:focus-visible\{/);
  assert.match(styles, /@media\(max-width:1200px\)\{\.xr-entry-detail\{display:none\}\}/);
});
