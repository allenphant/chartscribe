import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, defaultPrompt, buildSystemPrompt } from '../js/presets.js';

test('PRESETS contains the five expected keys', () => {
  assert.deepEqual(
    Object.keys(PRESETS).sort(),
    ['amr_composition', 'amr_resistance_bar', 'amr_susceptibility', 'amr_trend', 'general'].sort()
  );
});

test('general default prompt keeps language rules but omits objective rules', () => {
  const p = defaultPrompt('general');
  assert.ok(p.includes('保留英文'));
  assert.ok(!p.includes('客觀守則'));
});

test('amr default prompt includes objective rules and language rules', () => {
  const p = defaultPrompt('amr_susceptibility');
  assert.ok(p.includes('客觀守則'));
  assert.ok(p.includes('保留英文'));
});

test('unknown preset falls back to general default prompt', () => {
  assert.equal(defaultPrompt('nope'), defaultPrompt('general'));
});

test('buildSystemPrompt appends shared instructions and per-card context', () => {
  const p = buildSystemPrompt('BASE_PROMPT', '用正式語氣', '112 年 ceftriaxone 為 88%');
  assert.ok(p.startsWith('BASE_PROMPT'));
  assert.ok(p.includes('用正式語氣'));
  assert.ok(p.includes('112 年 ceftriaxone 為 88%'));
});

test('buildSystemPrompt with no extras returns the base prompt unchanged', () => {
  assert.equal(buildSystemPrompt('BASE', '', ''), 'BASE');
});
