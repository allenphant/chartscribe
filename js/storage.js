export const DEFAULT_MODEL = 'gemini-2.5-flash';
const KEY_API = 'chartscribe.apiKey';      // legacy single key (migration only)
const KEY_MODEL = 'chartscribe.model';
const KEY_PROMPTS = 'chartscribe.prompts';
const KEY_KEYS = 'chartscribe.keys';
const KEY_ACTIVE = 'chartscribe.activeKey';

export function loadSettings() {
  return { model: localStorage.getItem(KEY_MODEL) || DEFAULT_MODEL };
}

export function saveSettings({ model }) {
  if (model && model.trim()) localStorage.setItem(KEY_MODEL, model.trim());
}

// ---- per-preset prompt overrides ----
// Keyed by preset key. Returns {} if none or if the stored value is corrupt.
export function loadPromptOverrides() {
  try {
    return JSON.parse(localStorage.getItem(KEY_PROMPTS) || '{}');
  } catch {
    return {};
  }
}

export function savePromptOverride(presetKey, text) {
  const all = loadPromptOverrides();
  all[presetKey] = text;
  localStorage.setItem(KEY_PROMPTS, JSON.stringify(all));
}

export function clearPromptOverride(presetKey) {
  const all = loadPromptOverrides();
  delete all[presetKey];
  localStorage.setItem(KEY_PROMPTS, JSON.stringify(all));
}

// ---- named API keys ----
function readKeys() {
  try {
    return JSON.parse(localStorage.getItem(KEY_KEYS) || 'null');
  } catch {
    return null;
  }
}

// Load saved API keys. On first run, migrate a legacy single key into a
// named entry ('預設') so existing users don't lose their key.
export function loadKeys() {
  let keys = readKeys();
  if (!Array.isArray(keys)) {
    const legacy = localStorage.getItem(KEY_API);
    keys = legacy ? [{ name: '預設', key: legacy }] : [];
    localStorage.setItem(KEY_KEYS, JSON.stringify(keys));
    if (legacy && !localStorage.getItem(KEY_ACTIVE)) {
      localStorage.setItem(KEY_ACTIVE, '預設');
    }
  }
  return keys;
}

// Add a key, or overwrite the key of an existing entry with the same name.
export function saveKey(name, key) {
  const keys = loadKeys();
  const existing = keys.find((k) => k.name === name);
  if (existing) existing.key = key;
  else keys.push({ name, key });
  localStorage.setItem(KEY_KEYS, JSON.stringify(keys));
}

// Delete a key by name; if it was active, fall back to the first remaining.
export function deleteKey(name) {
  const keys = loadKeys().filter((k) => k.name !== name);
  localStorage.setItem(KEY_KEYS, JSON.stringify(keys));
  if (loadActiveKeyName() === name) {
    setActiveKeyName(keys.length ? keys[0].name : '');
  }
}

export function loadActiveKeyName() {
  return localStorage.getItem(KEY_ACTIVE) || '';
}

export function setActiveKeyName(name) {
  localStorage.setItem(KEY_ACTIVE, name || '');
}

// Resolve the key string of the currently active entry, or '' if none.
export function getActiveKey() {
  const found = loadKeys().find((k) => k.name === loadActiveKeyName());
  return found ? found.key : '';
}
