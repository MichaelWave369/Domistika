import assert from 'node:assert/strict';
import { COMMAND_CAPABILITIES, HELP_TOPICS } from '../src/v090/capabilityManifest.js';
import { GUIDE_TEMPLATES } from '../src/v090/guideTemplates.js';

const unique = (items, label) => {
  const values = items.map((item) => item.id);
  assert.equal(new Set(values).size, values.length, `${label} ids must be unique`);
};

unique(COMMAND_CAPABILITIES, 'command');
unique(HELP_TOPICS, 'help topic');

for (const id of ['ui.openPanel', 'ui.highlightControl', 'tool.select', 'setting.set', 'guide.create', 'receipt.undo']) {
  assert.ok(COMMAND_CAPABILITIES.some((command) => command.id === id), `missing command ${id}`);
}

for (const id of ['symmetry', 'brush-library', 'layers', 'guide-layers', 'export']) {
  const topic = HELP_TOPICS.find((entry) => entry.id === id);
  assert.ok(topic, `missing help topic ${id}`);
  assert.ok(topic.target, `${id} must identify a live control selector`);
}

for (const id of ['first-marks', 'simple-creature', 'radial-mandala']) {
  const template = GUIDE_TEMPLATES[id];
  assert.ok(template, `missing guide template ${id}`);
  assert.ok(template.elements.length >= 4, `${id} needs meaningful guide elements`);
}

console.log('Domistika v0.9 static contracts passed.');
