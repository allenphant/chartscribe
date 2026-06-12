import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, buildSystemPrompt } from '../js/presets.js';

test('PRESETS contains the five expected keys', () => {
  assert.deepEqual(
    Object.keys(PRESETS).sort(),
    ['amr_composition', 'amr_resistance_bar', 'amr_susceptibility', 'amr_trend', 'general'].sort()
  );
});

test('general preset omits objective rules', () => {
  const p = buildSystemPrompt('general', '', '');
  assert.ok(!p.includes('客觀守則'));
});

test('amr preset includes objective rules and language rules', () => {
  const p = buildSystemPrompt('amr_susceptibility', '', '');
  assert.ok(p.includes('客觀守則'));
  assert.ok(p.includes('保留英文'));
});

test('shared instructions and per-card context are appended when present', () => {
  const p = buildSystemPrompt('general', '用正式語氣', '112 年 ceftriaxone 為 88%');
  assert.ok(p.includes('用正式語氣'));
  assert.ok(p.includes('112 年 ceftriaxone 為 88%'));
});

test('unknown preset falls back to general', () => {
  assert.equal(buildSystemPrompt('nope', '', ''), buildSystemPrompt('general', '', ''));
});
