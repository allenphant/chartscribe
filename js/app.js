import {
  loadPromptOverrides, savePromptOverride, clearPromptOverride,
  loadKeys, saveKey, deleteKey, loadActiveKeyName, setActiveKeyName, getActiveKeyEntry,
} from './storage.js';
import { PRESETS, defaultPrompt, buildSystemPrompt } from './presets.js';
import { generateDescription, ApiError, PROVIDERS, guessProvider } from './providers.js';
import { mdToPlain, mdToLatex } from './formats.js';
import { createCardElement, setCardStatus, renderCardOutput } from './ui.js';

const state = {
  stylePreset: 'general',
  promptOverrides: loadPromptOverrides(),
  sharedInstructions: '',
  outputFormat: 'markdown',
  cards: [],
};

// Rebuild the active-key dropdown from storage and select the active entry.
function refreshKeyDropdown() {
  const sel = document.getElementById('active-key');
  sel.innerHTML = '';
  for (const k of loadKeys()) {
    const opt = document.createElement('option');
    opt.value = k.name;
    opt.textContent = `${k.name}（${PROVIDERS[k.provider]?.label || k.provider}）`;
    sel.appendChild(opt);
  }
  sel.value = loadActiveKeyName();
}

// The base prompt for a preset: the user's saved override if any, else default.
function effectivePrompt(presetKey) {
  const o = state.promptOverrides[presetKey];
  return o !== undefined ? o : defaultPrompt(presetKey);
}

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
  const entry = getActiveKeyEntry();
  if (!entry || !entry.key) {
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
      effectivePrompt(state.stylePreset), state.sharedInstructions, card.perCardContext
    );
    const markdown = await callWithRetry({
      provider: entry.provider, apiKey: entry.key, model: entry.model,
      systemPrompt, base64Data, mimeType: card.file.type,
    });
    card.markdown = markdown;
    card.status = 'done';
    setCardStatus(cardEl(card.id), card.status);
    refreshCardOutput(card);
  } catch (err) {
    card.status = 'error';
    card.errorMessage = err instanceof ApiError ? `${err.status} ${err.message}` : String(err);
    setCardStatus(cardEl(card.id), card.status, card.errorMessage);
  }
}

// one automatic retry on 429
async function callWithRetry(args) {
  try {
    return await generateDescription(args);
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      await new Promise((r) => setTimeout(r, 2000));
      return generateDescription(args);
    }
    throw err;
  }
}

async function generateAll() {
  for (const card of state.cards) {
    if (card.status === 'done' || card.status === 'processing') continue;
    await generateCard(card);   // sequential
  }
}

// ---- output actions ----
function copyText(text) {
  navigator.clipboard.writeText(text).catch(() => alert('複製失敗'));
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revocation so the browser has initiated the download first.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const EXT = { plain: 'txt', markdown: 'md', latex: 'tex' };

// Strip the original file extension so we don't produce "chart.png.md".
function baseName(name) {
  return name.replace(/\.[^.]+$/, '');
}

// Concatenate all completed cards' outputs in the current format, each
// segment prefixed with its image filename as a title. Returns null if none.
function buildCombined() {
  const done = state.cards.filter((c) => c.status === 'done');
  if (!done.length) return null;
  const sep = state.outputFormat === 'latex' ? '\n\n% ----\n\n' : '\n\n---\n\n';
  return done
    .map((c) => `【${c.file.name}】\n\n${formatText(c.markdown, state.outputFormat)}`)
    .join(sep);
}

function combineDownload() {
  const body = buildCombined();
  if (!body) { alert('尚無已完成的描述'); return; }
  download(`chartscribe-combined.${EXT[state.outputFormat]}`, body);
}

function combineCopy() {
  const body = buildCombined();
  if (!body) { alert('尚無已完成的描述'); return; }
  copyText(body);
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
    if (c) download(`${baseName(c.file.name)}.${EXT[state.outputFormat]}`, formatText(c.markdown, state.outputFormat));
  },
  onRegen(id) {
    const c = state.cards.find((x) => x.id === id);
    if (c && c.status !== 'processing') generateCard(c);
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

function populateProviderSelect() {
  const sel = $('new-key-provider');
  sel.innerHTML = '';
  for (const [key, p] of Object.entries(PROVIDERS)) {
    const opt = document.createElement('option');
    opt.value = key; opt.textContent = p.label;
    sel.appendChild(opt);
  }
  $('new-key-model').value = PROVIDERS[sel.value].defaultModel;
}

function init() {
  populatePresets();
  state.outputFormat = document.querySelector('input[name="fmt"]:checked')?.value || 'markdown';
  populateProviderSelect();
  refreshKeyDropdown();

  $('settings-toggle').addEventListener('click', () =>
    $('settings-panel').classList.toggle('hidden'));

  $('active-key').addEventListener('change', (e) => setActiveKeyName(e.target.value));

  // Auto-detect provider from the key prefix, prefill the matching default model.
  $('new-key-value').addEventListener('input', (e) => {
    const p = guessProvider(e.target.value);
    $('new-key-provider').value = p;
    if (!$('new-key-model').value.trim()) {
      $('new-key-model').value = PROVIDERS[p].defaultModel;
    }
  });
  $('new-key-provider').addEventListener('change', (e) => {
    $('new-key-model').value = PROVIDERS[e.target.value].defaultModel;
  });
  $('add-key').addEventListener('click', () => {
    const name = $('new-key-name').value.trim();
    const key = $('new-key-value').value.trim();
    const provider = $('new-key-provider').value;
    const model = $('new-key-model').value.trim() || PROVIDERS[provider].defaultModel;
    if (!name || !key) { alert('請輸入名稱與 API key'); return; }
    saveKey({ name, provider, key, model });
    setActiveKeyName(name);
    $('new-key-name').value = '';
    $('new-key-value').value = '';
    refreshKeyDropdown();
  });
  $('delete-key').addEventListener('click', () => {
    const name = $('active-key').value;
    if (!name) return;
    if (!confirm(`刪除 API key「${name}」？`)) return;
    deleteKey(name);
    refreshKeyDropdown();
  });

  $('style-preset').addEventListener('change', (e) => {
    state.stylePreset = e.target.value;
    $('preset-prompt').value = effectivePrompt(state.stylePreset);
  });
  $('preset-prompt').value = effectivePrompt(state.stylePreset);
  $('preset-prompt').addEventListener('input', (e) => {
    state.promptOverrides[state.stylePreset] = e.target.value;
    savePromptOverride(state.stylePreset, e.target.value);
  });
  $('preset-reset').addEventListener('click', () => {
    delete state.promptOverrides[state.stylePreset];
    clearPromptOverride(state.stylePreset);
    $('preset-prompt').value = defaultPrompt(state.stylePreset);
  });
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
  dz.addEventListener('dragleave', (e) => {
    // Ignore dragleave fired when moving onto a child element of the dropzone.
    if (!dz.contains(e.relatedTarget)) dz.classList.remove('dragover');
  });
  dz.addEventListener('drop', (e) => {
    e.preventDefault(); dz.classList.remove('dragover');
    addFiles(e.dataTransfer.files);
  });
  window.addEventListener('paste', (e) => {
    if (!e.clipboardData) return;
    const imgs = [...e.clipboardData.items]
      .filter((i) => i.type.startsWith('image/'))
      .map((i) => i.getAsFile())
      .filter(Boolean);
    if (imgs.length) addFiles(imgs);
  });

  $('generate-all').addEventListener('click', generateAll);
  $('combine').addEventListener('click', combineDownload);
  $('combine-copy').addEventListener('click', combineCopy);
}

init();
