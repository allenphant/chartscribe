export const DEFAULT_MODEL = 'gemini-3.1-flash-lite';
const KEY_API = 'chartscribe.apiKey';      // legacy single key (migration only)
const KEY_PROMPTS = 'chartscribe.prompts';
const KEY_KEYS = 'chartscribe.keys';
const KEY_ACTIVE = 'chartscribe.activeKey';

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
// Each entry: { name, key, model }.
function readKeys() {
  try {
    return JSON.parse(localStorage.getItem(KEY_KEYS) || 'null');
  } catch {
    return null;
  }
}

// Load saved API keys. On first run, migrate a legacy single key into a named
// gemini entry ('預設') so existing users don't lose their key.
export function loadKeys() {
  let keys = readKeys();
  if (!Array.isArray(keys)) {
    const legacy = localStorage.getItem(KEY_API);
    keys = legacy
      ? [{ name: '預設', key: legacy, model: DEFAULT_MODEL }]
      : [];
    localStorage.setItem(KEY_KEYS, JSON.stringify(keys));
    if (legacy && !localStorage.getItem(KEY_ACTIVE)) {
      localStorage.setItem(KEY_ACTIVE, '預設');
    }
  }
  return keys;
}

// Add an entry, or overwrite the existing entry with the same name.
export function saveKey({ name, key, model }) {
  const keys = loadKeys();
  const entry = { name, key, model };
  const i = keys.findIndex((k) => k.name === name);
  if (i >= 0) keys[i] = entry;
  else keys.push(entry);
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

// The full active entry ({ name, provider, key, model }) or null.
export function getActiveKeyEntry() {
  return loadKeys().find((k) => k.name === loadActiveKeyName()) || null;
}

// Convenience: the active entry's key string, or '' if none.
export function getActiveKey() {
  const e = getActiveKeyEntry();
  return e ? e.key : '';
}
