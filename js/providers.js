export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Supported API providers and their default vision-capable model.
export const PROVIDERS = {
  gemini: { label: 'Google Gemini', defaultModel: 'gemini-2.5-flash' },
  nvidia: { label: 'NVIDIA', defaultModel: 'meta/llama-3.2-90b-vision-instruct' },
};

// Guess the provider from an API key's prefix (NVIDIA keys start with nvapi-).
export function guessProvider(key) {
  return (key || '').trim().startsWith('nvapi-') ? 'nvidia' : 'gemini';
}

// ---- request builders (pure) ----

// Google Gemini generateContent payload: prompt as systemInstruction, image
// inline in the user turn.
export function buildGeminiBody(systemPrompt, base64Data, mimeType) {
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{
      role: 'user',
      parts: [{ inlineData: { mimeType, data: base64Data } }],
    }],
  };
}

// NVIDIA (OpenAI-compatible) chat/completions payload: system message plus a
// user message carrying text and an image_url data URI.
export function buildNvidiaBody(model, systemPrompt, base64Data, mimeType) {
  return {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: '請依系統指示描述這張圖表。' },
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
        ],
      },
    ],
    max_tokens: 1024,
    temperature: 0.2,
  };
}

// ---- network calls ----

async function callGemini({ apiKey, model, systemPrompt, base64Data, mimeType }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildGeminiBody(systemPrompt, base64Data, mimeType)),
    });
  } catch (err) {
    throw new ApiError(-1, `網路錯誤：${err.message}`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new ApiError(res.status, detail || `HTTP ${res.status}`);
  }
  const json = await res.json();
  const text = (json?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim();
  if (!text) throw new ApiError(0, '模型回傳空白內容');
  return text;
}

async function callNvidia({ apiKey, model, systemPrompt, base64Data, mimeType }) {
  let res;
  try {
    res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(buildNvidiaBody(model, systemPrompt, base64Data, mimeType)),
    });
  } catch (err) {
    throw new ApiError(-1, `網路錯誤（可能是 CORS：NVIDIA 端點不一定允許瀏覽器直連）：${err.message}`);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new ApiError(res.status, detail || `HTTP ${res.status}`);
  }
  const json = await res.json();
  const text = (json?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new ApiError(0, '模型回傳空白內容');
  return text;
}

// Dispatch to the right provider. Throws ApiError on network/HTTP/empty errors.
export async function generateDescription({ provider, apiKey, model, systemPrompt, base64Data, mimeType }) {
  if (provider === 'nvidia') {
    return callNvidia({ apiKey, model, systemPrompt, base64Data, mimeType });
  }
  return callGemini({ apiKey, model, systemPrompt, base64Data, mimeType });
}
