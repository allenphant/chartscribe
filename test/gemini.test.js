import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRequestBody } from '../js/gemini.js';

test('buildRequestBody puts prompt text then inline image', () => {
  const body = buildRequestBody('描述這張圖', 'BASE64DATA', 'image/png');
  const parts = body.contents[0].parts;
  assert.equal(parts[0].text, '描述這張圖');
  assert.deepEqual(parts[1].inlineData, { mimeType: 'image/png', data: 'BASE64DATA' });
});

test('buildRequestBody uses user role', () => {
  const body = buildRequestBody('x', 'y', 'image/jpeg');
  assert.equal(body.contents[0].role, 'user');
});
