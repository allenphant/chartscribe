import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGeminiBody, buildNvidiaBody, guessProvider, PROVIDERS,
} from '../js/providers.js';

test('buildGeminiBody puts prompt in systemInstruction and image in user turn', () => {
  const body = buildGeminiBody('描述這張圖', 'BASE64DATA', 'image/png');
  assert.equal(body.systemInstruction.parts[0].text, '描述這張圖');
  assert.deepEqual(body.contents[0].parts[0].inlineData, { mimeType: 'image/png', data: 'BASE64DATA' });
});

test('buildGeminiBody uses user role for image content', () => {
  const body = buildGeminiBody('x', 'y', 'image/jpeg');
  assert.equal(body.contents[0].role, 'user');
});

test('buildNvidiaBody builds OpenAI-style messages with system and image_url', () => {
  const body = buildNvidiaBody('meta/llama', 'SYS', 'B64', 'image/png');
  assert.equal(body.model, 'meta/llama');
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.messages[0].content, 'SYS');
  const userContent = body.messages[1].content;
  assert.equal(userContent[1].type, 'image_url');
  assert.equal(userContent[1].image_url.url, 'data:image/png;base64,B64');
});

test('guessProvider detects nvapi prefix, defaults to gemini', () => {
  assert.equal(guessProvider('nvapi-abc123'), 'nvidia');
  assert.equal(guessProvider('AIzaSyXXXX'), 'gemini');
  assert.equal(guessProvider(''), 'gemini');
});

test('PROVIDERS exposes gemini and nvidia with default models', () => {
  assert.ok(PROVIDERS.gemini.defaultModel);
  assert.ok(PROVIDERS.nvidia.defaultModel);
});
