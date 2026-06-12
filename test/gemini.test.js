import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRequestBody } from '../js/gemini.js';

test('buildRequestBody puts prompt in systemInstruction and image in user turn', () => {
  const body = buildRequestBody('描述這張圖', 'BASE64DATA', 'image/png');
  assert.equal(body.systemInstruction.parts[0].text, '描述這張圖');
  assert.deepEqual(body.contents[0].parts[0].inlineData, { mimeType: 'image/png', data: 'BASE64DATA' });
});

test('buildRequestBody uses user role for image content', () => {
  const body = buildRequestBody('x', 'y', 'image/jpeg');
  assert.equal(body.contents[0].role, 'user');
});
