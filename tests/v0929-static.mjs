import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  VERSION,
  SCHEMA,
  createDomistikaSiteTools,
  installDomistikaSiteTools,
} from '../src/DomistikaSiteToolsV0929.js';

function fakeApi() {
  const calls = [];
  const commands = [
    { id: 'motion.portal', label: 'Play 3·6·9 Portal', category: 'Motion', description: 'Play Portal', keywords: ['portal'] },
    { id: 'playground.return', label: 'Playground · Return', category: 'Rooms', description: 'Restore artwork', keywords: ['return'] },
  ];
  return {
    schema: 'domistika.sdk.v1',
    ready: () => true,
    capabilities: () => ({
      schema: 'domistika.sdk.v1',
      sdkVersion: '0.1.8',
      appVersion: '0.9.30',
      ready: true,
      tools: ['ink', 'fill'],
      drawTools: ['ink'],
      commands: commands.map((command) => command.id),
      commandCatalog: commands,
      layerRoles: ['paint', 'guide', 'type', 'motion-ignore'],
      spiro: { available: true, presets: ['flower'] },
      colors: { available: true, current: '#112233', gradients: 10 },
      motion: { available: true, presets: ['portal-369'], clips: { available: true, count: 1 } },
      capture: { available: true },
      playground: { available: true, running: false, canRestore: true },
      bridge: { auralith: { available: true, version: 2, semanticOverlays: true, maxOverlays: 16 } },
    }),
    canvas: { info: () => ({ width: 1200, height: 1200 }) },
    colors: {
      current: () => '#112233',
      set: (color) => { calls.push(['color', color]); return color; },
      applyGradient: (id, options) => { calls.push(['gradient', id, options.mode]); return { gradient: id, mode: options.mode }; },
    },
    tool: { get: () => 'ink' },
    layers: {
      list: () => [{ id: 'layer-1', name: 'Ink', role: 'paint' }],
      role: (id, role) => { calls.push(['role', id, role]); return role; },
    },
    motion: { state: () => ({ playing: false }) },
    playground: { state: () => ({ available: true, running: false, canRestore: true }) },
    stroke: (points, options) => { calls.push(['stroke', points.length, options.tool]); return { ok: true, pointCount: points.length }; },
    spiro: {
      place: (preset, options) => { calls.push(['spiro', preset, options.x, options.y]); return { preset }; },
    },
    bridge: {
      auralith: {
        transfer: async () => {
          calls.push(['bridge', 'auralith', 'transfer']);
          return { ok: true, version: 2, overlayCount: 1, contentHash: 'sha256:test' };
        },
      },
    },
    commands: {
      list: () => commands.map((command) => command.id),
      search: (query, limit) => commands.filter((command) => JSON.stringify(command).toLowerCase().includes(String(query).toLowerCase())).slice(0, limit),
      execute: async (id, args) => { calls.push(['command', id, args]); return { command: id }; },
    },
    calls,
  };
}

assert.equal(VERSION, '0.1.1');
assert.equal(SCHEMA, 'domistika.site-tools.v1');

const api = fakeApi();
const tools = createDomistikaSiteTools(api);
assert.equal(Object.isFrozen(tools), true);
assert.equal(tools.length, 10);
assert.deepEqual(tools.map((tool) => tool.name), [
  'domistika_get_capabilities',
  'domistika_search_commands',
  'domistika_get_state',
  'domistika_draw_stroke',
  'domistika_set_color',
  'domistika_apply_gradient',
  'domistika_place_spiro',
  'domistika_set_layer_role',
  'domistika_transfer_to_auralith',
  'domistika_execute_command',
]);

for (const tool of tools) {
  assert.match(tool.name, /^[A-Za-z0-9_.-]+$/);
  assert.ok(tool.description.length > 20);
  assert.equal(typeof tool.execute, 'function');
  assert.equal(typeof tool.annotations.readOnlyHint, 'boolean');
}

const readNames = new Set(['domistika_get_capabilities', 'domistika_search_commands', 'domistika_get_state']);
for (const tool of tools) {
  assert.equal(tool.annotations.readOnlyHint, readNames.has(tool.name));
}

const getCaps = tools.find((tool) => tool.name === 'domistika_get_capabilities');
const capResult = JSON.parse(await getCaps.execute({}));
assert.equal(capResult.ok, true);
assert.equal(capResult.capabilities.commandCount, 2);
assert.equal('commandCatalog' in capResult.capabilities, false);

const search = tools.find((tool) => tool.name === 'domistika_search_commands');
const searchResult = JSON.parse(await search.execute({ query: 'portal', limit: 4 }));
assert.equal(searchResult.results[0].id, 'motion.portal');

const stroke = tools.find((tool) => tool.name === 'domistika_draw_stroke');
const strokeResult = JSON.parse(await stroke.execute({
  points: [{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.9, p: 0.7 }],
  tool: 'ink',
  color: '#ffffff',
  space: 'normalized',
}));
assert.equal(strokeResult.result.pointCount, 2);

const setColor = tools.find((tool) => tool.name === 'domistika_set_color');
await setColor.execute({ color: '#AABBCC' });
assert.deepEqual(api.calls.at(-1), ['color', '#aabbcc']);

const gradient = tools.find((tool) => tool.name === 'domistika_apply_gradient');
await gradient.execute({ gradientId: 'portal-core', mode: 'behind' });
assert.deepEqual(api.calls.at(-1), ['gradient', 'portal-core', 'behind']);

const spiro = tools.find((tool) => tool.name === 'domistika_place_spiro');
await spiro.execute({ preset: 'flower', x: 0.5, y: 0.5 });
assert.deepEqual(api.calls.at(-1), ['spiro', 'flower', 0.5, 0.5]);

const role = tools.find((tool) => tool.name === 'domistika_set_layer_role');
await role.execute({ layerId: 'layer-1', role: 'motion-ignore' });
assert.deepEqual(api.calls.at(-1), ['role', 'layer-1', 'motion-ignore']);

const transfer = tools.find((tool) => tool.name === 'domistika_transfer_to_auralith');
const transferResult = JSON.parse(await transfer.execute({}));
assert.equal(transferResult.transfer.version, 2);
assert.equal(transferResult.transfer.overlayCount, 1);
assert.deepEqual(api.calls.at(-1), ['bridge', 'auralith', 'transfer']);

const execute = tools.find((tool) => tool.name === 'domistika_execute_command');
await execute.execute({ commandId: 'motion.portal', args: {} });
assert.deepEqual(api.calls.at(-1), ['command', 'motion.portal', {}]);

await assert.rejects(
  () => execute.execute({ commandId: 'arbitrary.javascript', args: {} }),
  /COMMAND_UNKNOWN/,
);

const registered = [];
const modelContext = {
  async registerTool(tool, options) {
    assert.ok(options.signal);
    registered.push(tool);
  },
};
const installed = await installDomistikaSiteTools({ api: fakeApi(), modelContext });
assert.equal(installed.available, true);
assert.equal(installed.registered.length, 10);
assert.equal(registered.length, 10);

const source = fs.readFileSync(new URL('../src/DomistikaSiteToolsV0929.js', import.meta.url), 'utf8');
assert.match(source, /document/);
assert.match(source, /modelContext/);
assert.match(source, /registerTool/);
assert.match(source, /readOnlyHint/);
assert.match(source, /consequentialHint/);
assert.doesNotMatch(source, /\beval\s*\(/);
assert.doesNotMatch(source, /new Function\s*\(/);
assert.doesNotMatch(source, /\bfetch\s*\(/);
assert.doesNotMatch(source, /CanvasRenderingContext2D/);

console.log('v0.9.30 WebMCP site-tools compatibility checks passed');
