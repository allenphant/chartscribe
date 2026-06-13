export const DEFAULT_MODEL = 'gemini-2.5-flash';
const KEY_API = 'chartscribe.apiKey';
const KEY_MODEL = 'chartscribe.model';
const KEY_PROMPTS = 'chartscribe.prompts';

export function loadSettings() {
  return {
    apiKey: localStorage.getItem(KEY_API) || '',
    model: localStorage.getItem(KEY_MODEL) || DEFAULT_MODEL,
  };
}

export function saveSettings({ apiKey, model }) {
  if (apiKey !== undefined) localStorage.setItem(KEY_API, apiKey || '');
  if (model && model.trim()) localStorage.setItem(KEY_MODEL, model.trim());
}

// Per-preset system-prompt overrides, keyed by preset key. Returns {} if none
// or if the stored value is corrupt.
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
