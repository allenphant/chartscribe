import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGeminiBody, listModels, ApiError } from '../js/gemini.js';

function stubFetch(impl) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  return () => { globalThis.fetch = original; };
}

test('buildGeminiBody puts prompt in systemInstruction and image in user turn', () => {
  const body = buildGeminiBody('描述這張圖', 'BASE64DATA', 'image/png');
  assert.equal(body.systemInstruction.parts[0].text, '描述這張圖');
  assert.deepEqual(body.contents[0].parts[0].inlineData, { mimeType: 'image/png', data: 'BASE64DATA' });
});

test('buildGeminiBody uses user role for image content', () => {
  const body = buildGeminiBody('x', 'y', 'image/jpeg');
  assert.equal(body.contents[0].role, 'user');
});

test('listModels keeps only generateContent models, strips prefix, sorts', async () => {
  const restore = stubFetch(async () => ({
    ok: true,
    json: async () => ({
      models: [
        { name: 'models/gemini-3.1-pro', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
        { name: 'models/gemini-3.1-flash-lite', supportedGenerationMethods: ['generateContent', 'countTokens'] },
      ],
    }),
  }));
  try {
    assert.deepEqual(await listModels('KEY'), ['gemini-3.1-flash-lite', 'gemini-3.1-pro']);
  } finally {
    restore();
  }
});

test('listModels throws ApiError on HTTP error', async () => {
  const restore = stubFetch(async () => ({
    ok: false, status: 403, text: async () => 'forbidden',
  }));
  try {
    await assert.rejects(() => listModels('BAD'), (e) => e instanceof ApiError && e.status === 403);
  } finally {
    restore();
  }
});
