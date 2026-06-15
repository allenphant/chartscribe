import {
  DEFAULT_MODEL,
  loadPromptOverrides, savePromptOverride, clearPromptOverride,
  loadKeys, saveKey, deleteKey, loadActiveKeyName, setActiveKeyName, getActiveKeyEntry, getActiveKey,
} from './storage.js';
import { PRESETS, defaultPrompt, buildSystemPrompt } from './presets.js';
import { EXAMPLES } from './examples.js';
import { generateDescription, listModels, ApiError } from './gemini.js';
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
// Each option shows "name · model" so the active model is visible at a glance.
// With no keys, the picker/actions disable and an empty-state hint appears.
function refreshKeyDropdown() {
  const sel = document.getElementById('active-key');
  const keys = loadKeys();
  sel.innerHTML = '';
  for (const k of keys) {
    const opt = document.createElement('option');
    opt.value = k.name;
    opt.textContent = k.model ? `${k.name} · ${k.model}` : k.name;
    sel.appendChild(opt);
  }
  sel.value = loadActiveKeyName();
  const empty = keys.length === 0;
  $('key-empty').classList.toggle('hidden', !empty);
  sel.disabled = empty;
  $('edit-key').disabled = empty;
  $('delete-key').disabled = empty;
}

// ---- settings panel helpers ----
function setSettingsOpen(open) {
  $('settings-panel').classList.toggle('hidden', !open);
  $('settings-toggle').setAttribute('aria-expanded', String(open));
}

// Inline status line inside the add/edit form (replaces alert/confirm).
function showFormMsg(text, kind = 'info') {
  const el = $('key-form-msg');
  el.textContent = text;
  el.className = `form-msg ${kind}`;
}
function clearFormMsg() {
  $('key-form-msg').className = 'form-msg hidden';
  $('key-form-msg').textContent = '';
}

// Replace the model field's datalist suggestions with a fetched list.
function setModelOptions(models) {
  const dl = $('model-options');
  dl.innerHTML = '';
  for (const m of models) {
    const opt = document.createElement('option');
    opt.value = m;
    dl.appendChild(opt);
  }
}

// null = adding a new key; a name = editing that existing entry.
let editingName = null;

function resetKeyForm() {
  editingName = null;
  $('new-key-name').value = '';
  $('new-key-name').removeAttribute('readonly');
  $('new-key-value').value = '';
  $('new-key-value').type = 'password';
  $('toggle-key-visibility').textContent = '顯示';
  $('toggle-key-visibility').setAttribute('aria-pressed', 'false');
  $('new-key-model').value = DEFAULT_MODEL;
  $('key-form-legend').textContent = '新增 API key';
  $('add-key').textContent = '新增';
  $('cancel-edit').classList.add('hidden');
  clearFormMsg();
}

function startEditKey() {
  const entry = getActiveKeyEntry();
  if (!entry) return;
  editingName = entry.name;
  $('new-key-name').value = entry.name;
  $('new-key-name').setAttribute('readonly', '');  // name is the entry's identity
  $('new-key-value').value = entry.key;
  $('new-key-model').value = entry.model || DEFAULT_MODEL;
  $('key-form-legend').textContent = `編輯「${entry.name}」`;
  $('add-key').textContent = '儲存變更';
  $('cancel-edit').classList.remove('hidden');
  clearFormMsg();
  $('new-key-value').focus();
}

// Two-step delete confirmation, in place of a native confirm() dialog.
let deleteArmed = false;
let deleteTimer = null;
function disarmDelete() {
  deleteArmed = false;
  clearTimeout(deleteTimer);
  $('delete-key').textContent = '刪除';
  $('delete-key').classList.remove('armed');
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
      apiKey: entry.key, model: entry.model,
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

// ---- preset gallery (visual picker) ----
function renderPresetGallery() {
  const gallery = $('preset-gallery');
  gallery.innerHTML = '';
  for (const [key, p] of Object.entries(PRESETS)) {
    const ex = EXAMPLES[key] || {};
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'preset-card';
    card.dataset.preset = key;

    const imgWrap = document.createElement('div');
    imgWrap.className = 'preset-card-img';
    if (ex.image) {
      const img = document.createElement('img');
      img.src = ex.image;
      img.alt = `${p.name} 範例圖`;
      img.addEventListener('error', () => { img.remove(); imgWrap.classList.add('empty'); });
      imgWrap.appendChild(img);
    } else {
      imgWrap.classList.add('empty');
    }

    const body = document.createElement('div');
    body.className = 'preset-card-body';
    const name = document.createElement('span');
    name.className = 'preset-card-name';
    name.textContent = p.name;
    const out = document.createElement('p');
    out.className = 'preset-card-output';
    out.textContent = ex.output || '（尚未提供範例輸出）';
    body.append(name, out);

    card.append(imgWrap, body);
    card.addEventListener('click', () => selectPreset(key));
    gallery.appendChild(card);
  }
  markSelectedPreset();
}

function markSelectedPreset() {
  document.querySelectorAll('.preset-card').forEach((el) => {
    const on = el.dataset.preset === state.stylePreset;
    el.classList.toggle('selected', on);
    el.setAttribute('aria-pressed', String(on));
  });
}

function selectPreset(key) {
  state.stylePreset = key;
  markSelectedPreset();
  $('preset-prompt').value = effectivePrompt(key);
}

function init() {
  renderPresetGallery();
  state.outputFormat = document.querySelector('input[name="fmt"]:checked')?.value || 'markdown';
  refreshKeyDropdown();
  $('new-key-model').value = DEFAULT_MODEL;
  // First run with no key: open settings so the user knows where to start.
  if (loadKeys().length === 0) setSettingsOpen(true);

  $('settings-toggle').addEventListener('click', () =>
    setSettingsOpen($('settings-panel').classList.contains('hidden')));
  $('settings-close').addEventListener('click', () => setSettingsOpen(false));

  $('active-key').addEventListener('change', (e) => {
    setActiveKeyName(e.target.value);
    disarmDelete();
    if (editingName) resetKeyForm();
  });

  $('toggle-key-visibility').addEventListener('click', () => {
    const inp = $('new-key-value');
    const reveal = inp.type === 'password';
    inp.type = reveal ? 'text' : 'password';
    const btn = $('toggle-key-visibility');
    btn.textContent = reveal ? '隱藏' : '顯示';
    btn.setAttribute('aria-pressed', String(reveal));
  });

  $('edit-key').addEventListener('click', startEditKey);
  $('cancel-edit').addEventListener('click', resetKeyForm);

  // Fetch the models this key can actually call (ListModels) into the datalist.
  // Uses the key being typed if present, else the active key.
  $('fetch-models').addEventListener('click', async () => {
    const key = $('new-key-value').value.trim() || getActiveKey();
    if (!key) { showFormMsg('請先輸入或選擇一把 API key 再抓取', 'error'); return; }
    const btn = $('fetch-models');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = '抓取中…';
    showFormMsg('正在抓取可用模型…', 'info');
    try {
      const models = await listModels(key);
      setModelOptions(models);
      if (models.length) {
        showFormMsg(`已抓到 ${models.length} 個可呼叫模型，點模型欄即可選（純文字模型會在產生時失敗）`, 'success');
      } else {
        showFormMsg('這把 key 沒有可用的 generateContent 模型', 'error');
      }
    } catch (err) {
      const msg = err instanceof ApiError ? `${err.status} ${err.message}` : String(err);
      showFormMsg(`抓取失敗：${msg}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  });

  $('add-key').addEventListener('click', () => {
    const name = $('new-key-name').value.trim();
    const key = $('new-key-value').value.trim();
    const model = $('new-key-model').value.trim() || DEFAULT_MODEL;
    if (!name || !key) { showFormMsg('請輸入名稱與 API key', 'error'); return; }
    // Adding (not editing) under an existing name would silently overwrite it.
    if (!editingName && loadKeys().some((k) => k.name === name)) {
      showFormMsg(`已有名為「${name}」的 key，請改名，或用「編輯」修改它`, 'error');
      return;
    }
    const wasEdit = Boolean(editingName);
    saveKey({ name, key, model });
    setActiveKeyName(name);
    refreshKeyDropdown();
    resetKeyForm();
    showFormMsg(wasEdit ? '已儲存變更 ✓' : `已新增「${name}」✓`, 'success');
  });

  $('delete-key').addEventListener('click', () => {
    const name = $('active-key').value;
    if (!name) return;
    if (!deleteArmed) {
      deleteArmed = true;
      $('delete-key').textContent = '確定刪除？';
      $('delete-key').classList.add('armed');
      deleteTimer = setTimeout(disarmDelete, 3000);
      return;
    }
    disarmDelete();
    deleteKey(name);
    if (editingName === name) resetKeyForm();
    refreshKeyDropdown();
    showFormMsg(`已刪除「${name}」`, 'info');
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
