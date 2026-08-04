import { HELP_TOPICS, searchHelp } from './capabilityManifest.js';
import { collectStudioContext } from './contextBroker.js';

export function topicActions(topic, executeCommand) {
  const actions = [];
  if (topic.target) actions.push({
    label: 'Show me',
    run: () => executeCommand('ui.highlightControl', { selector: topic.target, label: topic.title, panelId: topic.panelId }, { request: `Show me ${topic.title}` }),
  });
  if (topic.panelId) actions.push({
    label: `Open ${topic.title}`,
    run: () => executeCommand('ui.openPanel', { panelId: topic.panelId }, { request: `Open ${topic.title}` }),
  });
  return actions;
}

export function findTopic(query) {
  return searchHelp(query, 1)[0]?.topic || null;
}

function suggestion(executeCommand) {
  const context = collectStudioContext();
  if (!context.project.goal) return {
    title: 'Give the project a direction',
    body: 'Add a short goal above. Tika will use it only as local structured context.',
    actions: [],
  };
  if (context.layers.artCount <= 1) return {
    title: 'Separate your next phase',
    body: 'Create a new art layer before adding ink, color, or an experiment. That keeps the first marks editable.',
    actions: [{ label: 'Show Layers', run: () => executeCommand('ui.highlightControl', { selector: '#layersPanel', label: 'Layers', panelId: 'layersPanel' }, { request: 'Show layers' }) }],
  };
  if (context.pattern.mode === 'none' && /mandala|pattern|radial/i.test(context.project.goal)) return {
    title: 'Try a radial scaffold',
    body: 'Radial 8 or 12 can multiply one Carbon-drawn motif while keeping your hand visible in every mark.',
    actions: [{ label: 'Set Radial 12', run: () => executeCommand('setting.set', { setting: 'symmetry', value: 'radial-12' }, { request: 'Try radial symmetry' }) }],
  };
  return {
    title: 'Protect the focal point',
    body: `You are using ${context.tool.brush} with ${context.pattern.label}. Add the strongest contrast only where you want the eye to arrive first.`,
    actions: [{ label: 'Open Effects', run: () => executeCommand('ui.openPanel', { panelId: 'effectsPanel' }, { request: 'Open finishing options' }) }],
  };
}

export function resolveTikaQuery(query, { executeCommand, startLesson }) {
  const raw = String(query || '').trim();
  if (!raw) return null;
  if (/cannot draw|can.t draw|help me start|beginner|no idea/i.test(raw)) return {
    title: 'You do not need to know how yet',
    body: 'Start with First Marks. The guide asks for one simple motion at a time and never scores your art.',
    actions: [{ label: 'Start First Marks', run: () => startLesson('first-marks') }],
  };
  if (/what.*next|suggest|idea|stuck|improve/i.test(raw)) return suggestion(executeCommand);
  if (/brush/i.test(raw) && /which|choose|try|recommend/i.test(raw)) return {
    title: 'A forgiving starting brush',
    body: 'Graphite HB responds gently and keeps early lines easy to revise. Technical Pen Fine is better after you already like the shape.',
    actions: [
      { label: 'Use Graphite HB', run: () => executeCommand('brush.select', { brushName: 'Graphite HB' }, { request: raw }) },
      { label: 'Open Brushes', run: () => executeCommand('ui.openPanel', { panelId: 'brushesPanel' }, { request: raw }) },
    ],
  };
  const topic = findTopic(raw);
  if (topic) return { title: topic.title, body: `${topic.summary} ${topic.tip}`, actions: topicActions(topic, executeCommand), topic };
  return {
    title: 'Tika local help',
    body: 'I could not match that to a registered capability yet. Try symmetry, layers, masks, export, selection, effects, or brushes.',
    actions: [],
  };
}

export function defaultHelpTopics() {
  return HELP_TOPICS.slice(0, 4);
}
