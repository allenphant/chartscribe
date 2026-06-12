export const DEFAULT_MODEL = 'gemini-2.5-flash';
const KEY_API = 'chartscribe.apiKey';
const KEY_MODEL = 'chartscribe.model';

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
