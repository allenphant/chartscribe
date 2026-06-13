import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadSettings, saveSettings, DEFAULT_MODEL,
  loadPromptOverrides, savePromptOverride, clearPromptOverride,
} from '../js/storage.js';

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

test('prompt overrides start empty', () => {
  assert.deepEqual(loadPromptOverrides(), {});
});

test('savePromptOverride persists per preset', () => {
  savePromptOverride('general', '我的版本');
  savePromptOverride('amr_trend', '另一版');
  assert.equal(loadPromptOverrides().general, '我的版本');
  assert.equal(loadPromptOverrides().amr_trend, '另一版');
});

test('clearPromptOverride removes only that preset', () => {
  savePromptOverride('general', 'x');
  savePromptOverride('amr_trend', 'y');
  clearPromptOverride('general');
  const all = loadPromptOverrides();
  assert.equal(all.general, undefined);
  assert.equal(all.amr_trend, 'y');
});
