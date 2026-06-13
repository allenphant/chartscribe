import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MODEL,
  loadPromptOverrides, savePromptOverride, clearPromptOverride,
  loadKeys, saveKey, deleteKey,
  loadActiveKeyName, setActiveKeyName, getActiveKey, getActiveKeyEntry,
} from '../js/storage.js';

beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
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
  saveKey({ name: '個人', provider: 'gemini', key: 'AAA', model: 'm1' });
  saveKey({ name: '公司', provider: 'nvidia', key: 'BBB', model: 'm2' });
  saveKey({ name: '個人', provider: 'gemini', key: 'CCC', model: 'm3' });
  assert.deepEqual(loadKeys(), [
    { name: '個人', provider: 'gemini', key: 'CCC', model: 'm3' },
    { name: '公司', provider: 'nvidia', key: 'BBB', model: 'm2' },
  ]);
});

test('getActiveKeyEntry and getActiveKey resolve the active entry', () => {
  saveKey({ name: '個人', provider: 'gemini', key: 'AAA', model: 'm1' });
  saveKey({ name: '公司', provider: 'nvidia', key: 'BBB', model: 'm2' });
  setActiveKeyName('公司');
  assert.deepEqual(getActiveKeyEntry(), { name: '公司', provider: 'nvidia', key: 'BBB', model: 'm2' });
  assert.equal(getActiveKey(), 'BBB');
});

test('getActiveKey returns empty string when no active match', () => {
  saveKey({ name: '個人', provider: 'gemini', key: 'AAA', model: 'm1' });
  setActiveKeyName('不存在');
  assert.equal(getActiveKey(), '');
  assert.equal(getActiveKeyEntry(), null);
});

test('deleteKey removes the entry and reassigns active to first remaining', () => {
  saveKey({ name: '個人', provider: 'gemini', key: 'AAA', model: 'm1' });
  saveKey({ name: '公司', provider: 'nvidia', key: 'BBB', model: 'm2' });
  setActiveKeyName('個人');
  deleteKey('個人');
  assert.deepEqual(loadKeys(), [{ name: '公司', provider: 'nvidia', key: 'BBB', model: 'm2' }]);
  assert.equal(loadActiveKeyName(), '公司');
});

test('deleting the last key clears the active selection', () => {
  saveKey({ name: '個人', provider: 'gemini', key: 'AAA', model: 'm1' });
  setActiveKeyName('個人');
  deleteKey('個人');
  assert.deepEqual(loadKeys(), []);
  assert.equal(loadActiveKeyName(), '');
});

test('migrates a legacy single key into a named gemini entry', () => {
  localStorage.setItem('chartscribe.apiKey', 'LEGACY');
  assert.deepEqual(loadKeys(), [{ name: '預設', provider: 'gemini', key: 'LEGACY', model: DEFAULT_MODEL }]);
  assert.equal(loadActiveKeyName(), '預設');
  assert.equal(getActiveKey(), 'LEGACY');
});
