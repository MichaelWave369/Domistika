import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VERSION,
  SCHEMA,
  scoreCommand,
  filterCommands,
} from '../src/DomistikaCommandPaletteV0923.js';

const source = fs.readFileSync(new URL('../src/DomistikaCommandPaletteV0923.js', import.meta.url), 'utf8');
const sdk = fs.readFileSync(new URL('../src/DomistikaSDKV0921.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

assert.equal(VERSION, '0.9.23');
assert.equal(SCHEMA, 'domistika.command-palette.v1');

const [major, minor, patch] = pkg.version.split('.').map(Number);
assert.ok(major > 0 || minor > 9 || (minor === 9 && patch >= 23));

assert.match(index, /DomistikaCommandPaletteV0923\.js/);
assert.ok(index.indexOf('DomistikaSDKV0921.js') < index.indexOf('DomistikaCommandPaletteV0923.js'));

assert.match(sdk, /SDK_VERSION = '0\.1\.2'/);
assert.match(sdk, /commandCatalog/);
assert.match(sdk, /room\.spiro/);
assert.match(sdk, /room\.motion/);
assert.match(sdk, /room\.gallery/);
assert.match(sdk, /motion\.record\.start/);

assert.match(source, /Ctrl\/Cmd\+K/);
assert.match(source, /domistika:command-palette-ready/);
assert.match(source, /window\.Domistika\.commands\.execute/);
assert.doesNotMatch(source, /eval\s*\(/);
assert.doesNotMatch(source, /new Function\s*\(/);
assert.doesNotMatch(source, /fetch\s*\(/);

const commands = [
  { id: 'room.spiro', label: 'Open Spiro Lab', category: 'Rooms', description: 'Generative curves', keywords: ['spirograph'] },
  { id: 'motion.portal', label: 'Play 3·6·9 Portal', category: 'Motion', description: 'Portal preset', keywords: ['kinetic', 'animate'] },
  { id: 'export.png', label: 'Export PNG Blob', category: 'Export', description: 'Create image', keywords: ['save'] },
];

assert.ok(scoreCommand(commands[0], 'spiro') > scoreCommand(commands[1], 'spiro'));
assert.equal(filterCommands(commands, 'portal')[0].id, 'motion.portal');
assert.equal(filterCommands(commands, 'rooms')[0].id, 'room.spiro');
assert.equal(filterCommands(commands, 'no-such-command').length, 0);

console.log('v0.9.23 command palette checks passed');
