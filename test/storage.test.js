import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadSettings, saveSettings, DEFAULT_MODEL,
  loadPromptOverrides, savePromptOverride, clearPromptOverride,
  loadKeys, saveKey, deleteKey,
  loadActiveKeyName, setActiveKeyName, getActiveKey,
} from '../js/storage.js';

beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

test('loadSettings returns default model when empty', () => {
  assert.equal(loadSettings().model, DEFAULT_MODEL);
});

test('saveSettings then loadSettings round-trips the model', () => {
  saveSettings({ model: 'gemini-2.5-pro' });
  assert.equal(loadSettings().model, 'gemini-2.5-pro');
});

test('saveSettings ignores blank model and keeps default', () => {
  saveSettings({ model: '' });
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

test('loadKeys returns empty array when nothing stored', () => {
  assert.deepEqual(loadKeys(), []);
});

test('saveKey adds entries and overwrites by name', () => {
  saveKey('個人', 'AAA');
  saveKey('公司', 'BBB');
  saveKey('個人', 'CCC');
  assert.deepEqual(loadKeys(), [{ name: '個人', key: 'CCC' }, { name: '公司', key: 'BBB' }]);
});

test('getActiveKey resolves the active entry', () => {
  saveKey('個人', 'AAA');
  saveKey('公司', 'BBB');
  setActiveKeyName('公司');
  assert.equal(getActiveKey(), 'BBB');
  assert.equal(loadActiveKeyName(), '公司');
});

test('getActiveKey returns empty string when no active match', () => {
  saveKey('個人', 'AAA');
  setActiveKeyName('不存在');
  assert.equal(getActiveKey(), '');
});

test('deleteKey removes the entry and reassigns active to first remaining', () => {
  saveKey('個人', 'AAA');
  saveKey('公司', 'BBB');
  setActiveKeyName('個人');
  deleteKey('個人');
  assert.deepEqual(loadKeys(), [{ name: '公司', key: 'BBB' }]);
  assert.equal(loadActiveKeyName(), '公司');
});

test('deleting the last key clears the active selection', () => {
  saveKey('個人', 'AAA');
  setActiveKeyName('個人');
  deleteKey('個人');
  assert.deepEqual(loadKeys(), []);
  assert.equal(loadActiveKeyName(), '');
});

test('migrates a legacy single key into a named 預設 entry', () => {
  localStorage.setItem('chartscribe.apiKey', 'LEGACY');
  assert.deepEqual(loadKeys(), [{ name: '預設', key: 'LEGACY' }]);
  assert.equal(loadActiveKeyName(), '預設');
  assert.equal(getActiveKey(), 'LEGACY');
});
