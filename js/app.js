import { loadSettings, saveSettings } from './storage.js';
import { PRESETS, buildSystemPrompt } from './presets.js';
import { generateDescription, GeminiError } from './gemini.js';
import { mdToPlain, mdToLatex } from './formats.js';
import { createCardElement, setCardStatus, renderCardOutput } from './ui.js';

const state = {
  ...loadSettings(),
  stylePreset: 'general',
  sharedInstructions: '',
  outputFormat: 'markdown',
  cards: [],
};

const $ = (id) => document.getElementById(id);
let nextId = 1;

// ---- format derivation ----
function formatText(markdown, fmt) {
  if (!markdown) return '';
  if (fmt === 'plain') return mdToPlain(markdown);
  if (fmt === 'latex') return mdToLatex(markdown);
  return markdown;
}

function cardEl(id) {
  return document.querySelector(`.card[data-id="${id}"]`);
}

function refreshCardOutput(card) {
  const el = cardEl(card.id);
  if (el) renderCardOutput(el, formatText(card.markdown, state.outputFormat));
}

// ---- file intake ----
function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function addFiles(fileList) {
  for (const file of fileList) {
    if (!file.type.startsWith('image/')) {
      alert(`略過非圖片檔：${file.name}`);
      continue;
    }
    const card = {
      id: nextId++, file,
      thumbnailURL: URL.createObjectURL(file),
      perCardContext: '', status: 'queued', markdown: '', errorMessage: '',
    };
    state.cards.push(card);
    const el = createCardElement(card, handlers);
    $('cards').appendChild(el);
  }
}

// ---- generation ----
async function generateCard(card) {
  if (!state.apiKey) {
    card.status = 'error';
    card.errorMessage = '尚未設定 API key（點右上設定）';
    setCardStatus(cardEl(card.id), card.status, card.errorMessage);
    return;
  }
  card.status = 'processing';
  setCardStatus(cardEl(card.id), card.status);
  try {
    const base64Data = await readAsBase64(card.file);
    const systemPrompt = buildSystemPrompt(
      state.stylePreset, state.sharedInstructions, card.perCardContext
    );
    const markdown = await callWithRetry({
      apiKey: state.apiKey, model: state.model,
      systemPrompt, base64Data, mimeType: card.file.type,
    });
    card.markdown = markdown;
    card.status = 'done';
    setCardStatus(cardEl(card.id), card.status);
    refreshCardOutput(card);
  } catch (err) {
    card.status = 'error';
    card.errorMessage = err instanceof GeminiError ? `${err.status} ${err.message}` : String(err);
    setCardStatus(cardEl(card.id), card.status, card.errorMessage);
  }
}

// one automatic retry on 429
async function callWithRetry(args) {
  try {
    return await generateDescription(args);
  } catch (err) {
    if (err instanceof GeminiError && err.status === 429) {
      await new Promise((r) => setTimeout(r, 2000));
      return generateDescription(args);
    }
    throw err;
  }
}

async function generateAll() {
  for (const card of state.cards) {
    if (card.status === 'done') continue;
    await generateCard(card);   // sequential
  }
}

// ---- output actions ----
function copyText(text) {
  navigator.clipboard.writeText(text).catch(() => alert('複製失敗'));
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const EXT = { plain: 'txt', markdown: 'md', latex: 'tex' };

function combineAll() {
  const done = state.cards.filter((c) => c.status === 'done');
  if (!done.length) { alert('尚無已完成的描述'); return; }
  const sep = state.outputFormat === 'latex' ? '\n\n% ----\n\n' : '\n\n---\n\n';
  const body = done
    .map((c) => formatText(c.markdown, state.outputFormat))
    .join(sep);
  download(`chartscribe-combined.${EXT[state.outputFormat]}`, body);
}

// ---- handlers passed to cards ----
const handlers = {
  onContextChange(id, value) {
    const c = state.cards.find((x) => x.id === id);
    if (c) c.perCardContext = value;
  },
  onCopy(id) {
    const c = state.cards.find((x) => x.id === id);
    if (c) copyText(formatText(c.markdown, state.outputFormat));
  },
  onDownload(id) {
    const c = state.cards.find((x) => x.id === id);
    if (c) download(`${c.file.name}.${EXT[state.outputFormat]}`, formatText(c.markdown, state.outputFormat));
  },
  onRegen(id) {
    const c = state.cards.find((x) => x.id === id);
    if (c) generateCard(c);
  },
};

// ---- init ----
function populatePresets() {
  const sel = $('style-preset');
  for (const [key, p] of Object.entries(PRESETS)) {
    const opt = document.createElement('option');
    opt.value = key; opt.textContent = p.name;
    sel.appendChild(opt);
  }
  sel.value = state.stylePreset;
}

function init() {
  populatePresets();
  $('api-key').value = state.apiKey;
  $('model').value = state.model;

  $('settings-toggle').addEventListener('click', () =>
    $('settings-panel').classList.toggle('hidden'));
  $('settings-save').addEventListener('click', () => {
    state.apiKey = $('api-key').value.trim();
    state.model = $('model').value.trim() || state.model;
    saveSettings({ apiKey: state.apiKey, model: state.model });
    $('settings-panel').classList.add('hidden');
  });

  $('style-preset').addEventListener('change', (e) => { state.stylePreset = e.target.value; });
  $('shared-instructions').addEventListener('input', (e) => { state.sharedInstructions = e.target.value; });
  document.querySelectorAll('input[name="fmt"]').forEach((r) =>
    r.addEventListener('change', (e) => {
      state.outputFormat = e.target.value;
      state.cards.forEach(refreshCardOutput);
    }));

  $('file-pick').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', (e) => addFiles(e.target.files));

  const dz = $('dropzone');
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault(); dz.classList.remove('dragover');
    addFiles(e.dataTransfer.files);
  });
  window.addEventListener('paste', (e) => {
    const imgs = [...e.clipboardData.items]
      .filter((i) => i.type.startsWith('image/'))
      .map((i) => i.getAsFile())
      .filter(Boolean);
    if (imgs.length) addFiles(imgs);
  });

  $('generate-all').addEventListener('click', generateAll);
  $('combine').addEventListener('click', combineAll);
}

init();
