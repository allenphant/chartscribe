import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadSettings, saveSettings, DEFAULT_MODEL } from '../js/storage.js';

beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

test('loadSettings returns defaults when empty', () => {
  const s = loadSettings();
  assert.equal(s.apiKey, '');
  assert.equal(s.model, DEFAULT_MODEL);
});

test('saveSettings then loadSettings round-trips', () => {
  saveSettings({ apiKey: 'abc123', model: 'gemini-2.5-pro' });
  const s = loadSettings();
  assert.equal(s.apiKey, 'abc123');
  assert.equal(s.model, 'gemini-2.5-pro');
});

test('saveSettings ignores blank model and keeps default', () => {
  saveSettings({ apiKey: 'k', model: '' });
  assert.equal(loadSettings().model, DEFAULT_MODEL);
});
