import { HELP_TOPICS, capabilitySnapshot, searchHelp } from './capabilityManifest.js';
import { collectStudioContext, contextSummary, getProjectGoal, setProjectGoal } from './contextBroker.js';
import { clearReceipts, executeCommand, getReceipts, openPanel, subscribeReceipts, undoReceipt } from './commandRegistry.js';
import { getLatestEngine } from './guideLayer.js';
import { LESSONS } from './lessons.js';
import { addTikaStyles } from './tikaStyles.js';
import { defaultHelpTopics, resolveTikaQuery, topicActions } from './tikaAdvisor.js';

const LESSON_KEY = 'domistika-v090-active-lesson';
let panel;
let activeLesson = null;
const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[char]));

function showAnswer(answer) {
  if (!answer) return;
  const host = panel.querySelector('#tikaAnswer');
  host.classList.add('visible');
  host.innerHTML = `<h4>${esc(answer.title)}</h4><p>${esc(answer.body)}</p><div class="tika-actions">${(answer.actions || []).map((action,index)=>`<button class="tika-button" data-answer="${index}">${esc(action.label)}</button>`).join('')}</div>`;
  host.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => answer.actions[Number(button.dataset.answer)]?.run()));
}

function showTopic(topic) {
  if (!topic) return;
  showAnswer({ title: topic.title, body: `${topic.summary} ${topic.tip}`, actions: topicActions(topic, executeCommand) });
}

function renderHelp(query = '') {
  const topics = query ? searchHelp(query, 5).map((entry) => entry.topic) : defaultHelpTopics();
  const host = panel.querySelector('#tikaHelpResults');
  host.innerHTML = topics.map((topic) => `<button class="tika-card tika-result" data-topic="${esc(topic.id)}"><span><h4>${esc(topic.title)}</h4><p>${esc(topic.summary)}</p></span><b>›</b></button>`).join('');
  host.querySelectorAll('[data-topic]').forEach((button) => button.addEventListener('click', () => showTopic(HELP_TOPICS.find((topic) => topic.id === button.dataset.topic))));
}

function answerQuery(query) {
  const raw = String(query || '').trim();
  renderHelp(raw);
  showAnswer(resolveTikaQuery(raw, { executeCommand, startLesson }));
}

function readLesson() { try { return JSON.parse(localStorage.getItem(LESSON_KEY)) || null; } catch { return null; } }
function saveLesson(value) { activeLesson = value; try { value ? localStorage.setItem(LESSON_KEY, JSON.stringify(value)) : localStorage.removeItem(LESSON_KEY); } catch {} renderLessons(); }

async function startLesson(id) {
  const lesson = LESSONS.find((item) => item.id === id);
  if (!lesson) return;
  for (const [command, args] of lesson.setup) {
    try { await executeCommand(command, args, { request: `Prepare ${lesson.title}`, interpretation: `Lesson setup: ${command}` }); } catch {}
  }
  const receipt = await executeCommand('guide.create', { templateId: lesson.templateId, lessonId: lesson.id, title: lesson.title, opacity: .72 }, { request: `Start ${lesson.title}` });
  saveLesson({ id: lesson.id, step: 0, guideLayerId: receipt.result?.layerId || null });
  openPanel('tikaPanel');
}

function renderLessons() {
  const grid = panel.querySelector('#tikaLessonGrid');
  grid.innerHTML = LESSONS.map((lesson) => `<div class="tika-card ${activeLesson?.id === lesson.id ? 'active' : ''}"><h4>${esc(lesson.title)}</h4><span class="tika-meta">${lesson.minutes} min · ${esc(lesson.stage)}</span><p>${esc(lesson.description)}</p><div class="tika-card-actions"><button class="tika-button" data-start="${lesson.id}">${activeLesson?.id === lesson.id ? 'Restart' : 'Start'}</button></div></div>`).join('');
  grid.querySelectorAll('[data-start]').forEach((button) => button.addEventListener('click', () => startLesson(button.dataset.start)));
  const progress = panel.querySelector('#tikaLessonProgress');
  const lesson = LESSONS.find((item) => item.id === activeLesson?.id);
  if (!lesson) { progress.hidden = true; return; }
  const step = Math.max(0, Math.min(lesson.steps.length - 1, Number(activeLesson.step) || 0));
  progress.hidden = false;
  progress.innerHTML = `<div class="tika-meta">${esc(lesson.title)} · Step ${step + 1} of ${lesson.steps.length}</div><div class="tika-step">${esc(lesson.steps[step])}</div><div class="tika-card-actions"><button class="tika-button" id="tikaPrev" ${step === 0 ? 'disabled' : ''}>Back</button><button class="tika-primary" id="tikaNext">${step === lesson.steps.length - 1 ? 'Finish' : 'Next'}</button><button class="tika-button" id="tikaStop">Stop</button></div>`;
  progress.querySelector('#tikaPrev').addEventListener('click', () => saveLesson({ ...activeLesson, step: step - 1 }));
  progress.querySelector('#tikaNext').addEventListener('click', () => step === lesson.steps.length - 1 ? saveLesson(null) : saveLesson({ ...activeLesson, step: step + 1 }));
  progress.querySelector('#tikaStop').addEventListener('click', () => saveLesson(null));
}

function renderGuides() {
  const host = panel?.querySelector('#tikaGuideList'); if (!host) return;
  const guides = getLatestEngine()?.layers?.filter((layer) => layer.kind === 'guide') || [];
  host.innerHTML = guides.length ? guides.map((layer) => `<div class="tika-guide"><span><strong>${esc(layer.name)}</strong><span>Locked · ${layer.visible ? 'visible' : 'hidden'} · excluded from export</span></span><button class="tika-link" data-remove="${esc(layer.id)}">Remove</button></div>`).join('') : '<div class="tika-card"><p>No Guide Layers in this project.</p></div>';
  host.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', async () => { await executeCommand('guide.remove', { layerId: button.dataset.remove }, { request: 'Remove guide layer' }); renderGuides(); }));
}

function renderReceipts() {
  const host = panel?.querySelector('#tikaReceiptList'); if (!host) return;
  const receipts = getReceipts(10);
  host.innerHTML = receipts.length ? receipts.map((receipt) => `<div class="tika-receipt"><span><strong>${esc(receipt.message || receipt.command)}</strong><span>${esc(receipt.command)} · ${esc(receipt.authority)} · ${esc(receipt.status)}</span></span>${receipt.undoAvailable ? `<button class="tika-link" data-undo="${esc(receipt.id)}">Undo</button>` : ''}</div>`).join('') : '<div class="tika-card"><p>Tika actions will appear here with authority and undo availability.</p></div>';
  host.querySelectorAll('[data-undo]').forEach((button) => button.addEventListener('click', async () => { try { await undoReceipt(button.dataset.undo); } catch (error) { showAnswer({ title: 'Undo unavailable', body: error.message || String(error), actions: [] }); } renderReceipts(); renderGuides(); }));
}

function decorateLayers() {
  const engine = getLatestEngine(); const list = document.querySelector('#layerList'); if (!engine || !list) return;
  const layers = [...engine.layers].reverse();
  [...list.querySelectorAll('.layer-row')].forEach((row, index) => row.classList.toggle('guide-layer-row', layers[index]?.kind === 'guide'));
}
function refreshContext() { const node = panel?.querySelector('#tikaContext'); if (node) node.textContent = contextSummary(); }
function activate() { openPanel('tikaPanel'); refreshContext(); renderGuides(); renderReceipts(); setTimeout(() => panel?.querySelector('#tikaAskInput')?.focus(), 60); }

function buildUi() {
  const inspector = document.querySelector('.inspector'); const tabs = inspector?.querySelector('.inspector-tabs'); const viewport = document.querySelector('#viewport');
  if (!inspector || !tabs || !viewport) return false; if (document.querySelector('#tikaPanel')) return true; addTikaStyles();
  const tab = document.createElement('button'); tab.dataset.panel = 'tikaPanel'; tab.textContent = 'Tika'; tabs.appendChild(tab);
  panel = document.createElement('section'); panel.id = 'tikaPanel'; panel.className = 'inspector-panel tika-panel';
  panel.innerHTML = `<header class="tika-head"><div class="tika-title-row"><div class="tika-title"><span class="tika-mark">T</span><div><h2>Tika</h2><p>Domistika Creative Collaborator · v0.9</p></div></div><span class="tika-privacy">Local-only · provider off</span></div><div class="tika-goal"><label>What are you making?</label><input id="tikaProjectGoal" maxlength="240" placeholder="A creature mandala, a logo sketch…" value="${esc(getProjectGoal())}"></div><div class="tika-context" id="tikaContext"></div></header><div class="tika-body"><section class="tika-section"><div class="tika-section-head"><div><h3>Ask Tika</h3><small>Find tools, explanations, and optional suggestions</small></div></div><div class="tika-ask-wrap"><input class="tika-ask-input" id="tikaAskInput" placeholder="Where is radial symmetry?"><button class="tika-primary" id="tikaAskButton">Ask</button></div><div class="tika-chip-row"><button class="tika-chip" data-query="Where is radial symmetry?">Find symmetry</button><button class="tika-chip" data-query="Which brush should I try?">Choose a brush</button><button class="tika-chip" data-query="I cannot draw. Help me start.">Help me begin</button><button class="tika-chip" data-query="What should I do next?">Suggest next move</button></div><div class="tika-answer" id="tikaAnswer"></div><div class="tika-results" id="tikaHelpResults"></div></section><section class="tika-section" id="tikaGuideSection"><div class="tika-section-head"><div><h3>Guided Creation</h3><small>Trace → Assist → Recall → Create</small></div></div><div id="tikaLessonProgress" hidden></div><div class="tika-lessons" id="tikaLessonGrid"></div></section><section class="tika-section"><div class="tika-section-head"><div><h3>Guide Layers</h3><small>Persistent · locked · excluded from export</small></div></div><div class="tika-guides" id="tikaGuideList"></div></section><section class="tika-section"><div class="tika-section-head"><div><h3>Action Receipts</h3><small>Named commands, authority, and undo</small></div><button class="tika-link" id="tikaClearReceipts">Clear</button></div><div class="tika-receipts" id="tikaReceiptList"></div></section><div class="tika-disclaimer">Tika v0.9 searches a local capability manifest and runs named commands only after explicit clicks. It does not inspect artwork pixels or contact an external model provider.</div></div>`;
  inspector.appendChild(panel);
  const orb = document.createElement('button'); orb.className = 'tika-orb'; orb.type = 'button'; orb.textContent = 'T'; orb.setAttribute('aria-label', 'Open Tika'); viewport.appendChild(orb);
  tab.addEventListener('click', () => { document.querySelectorAll('.inspector-tabs button[data-panel]').forEach((button) => button.classList.toggle('active', button === tab)); document.querySelectorAll('.inspector-panel').forEach((candidate) => candidate.classList.toggle('active', candidate === panel)); refreshContext(); renderGuides(); renderReceipts(); });
  orb.addEventListener('click', activate);
  const ask = () => answerQuery(panel.querySelector('#tikaAskInput').value);
  panel.querySelector('#tikaAskButton').addEventListener('click', ask);
  panel.querySelector('#tikaAskInput').addEventListener('keydown', (event) => { if (event.key === 'Enter') ask(); });
  panel.querySelectorAll('[data-query]').forEach((button) => button.addEventListener('click', () => { panel.querySelector('#tikaAskInput').value = button.dataset.query; answerQuery(button.dataset.query); }));
  panel.querySelector('#tikaProjectGoal').addEventListener('input', (event) => { setProjectGoal(event.target.value); refreshContext(); });
  panel.querySelector('#tikaClearReceipts').addEventListener('click', () => { clearReceipts(); renderReceipts(); });
  activeLesson = readLesson(); renderHelp(); renderLessons(); renderGuides(); renderReceipts(); refreshContext();
  subscribeReceipts(() => { renderReceipts(); renderGuides(); refreshContext(); requestAnimationFrame(decorateLayers); });
  ['domistika:v090-guide-created','domistika:v090-guide-removed','domistika:v090-active-layer','domistika:v03-content'].forEach((name) => document.addEventListener(name, () => { renderGuides(); refreshContext(); requestAnimationFrame(decorateLayers); }));
  document.addEventListener('domistika:v090-open-help', (event) => showTopic(HELP_TOPICS.find((topic) => topic.id === event.detail?.topicId)));
  document.addEventListener('domistika:v090-receipts-cleared', renderReceipts);
  window.addEventListener('domistika:viewport-change', refreshContext);
  document.addEventListener('keydown', (event) => { if (event.target.matches('input,select,textarea')) return; if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); activate(); } });
  const layerList = document.querySelector('#layerList'); if (layerList) new MutationObserver(() => requestAnimationFrame(decorateLayers)).observe(layerList, { childList: true, subtree: true }); decorateLayers();
  window.domistikaTikaV090 = { open: activate, ask: (query) => { activate(); panel.querySelector('#tikaAskInput').value = query; answerQuery(query); }, context: collectStudioContext, capabilities: capabilitySnapshot, lessons: LESSONS, startLesson, receipts: getReceipts };
  document.documentElement.dataset.tika = 'v0.9.0-local';
  document.dispatchEvent(new CustomEvent('domistika:v090-ready', { detail: { localOnly: true, providerConfigured: false } }));
  return true;
}
function wait(attempt = 0) { if (buildUi() || attempt > 420) return; requestAnimationFrame(() => wait(attempt + 1)); } wait();
