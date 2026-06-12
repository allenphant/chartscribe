export class GeminiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
  }
}

// Pure: shape the generateContent request payload.
export function buildRequestBody(systemPrompt, base64Data, mimeType) {
  return {
    contents: [{
      role: 'user',
      parts: [
        { text: systemPrompt },
        { inlineData: { mimeType, data: base64Data } },
      ],
    }],
  };
}

// Thin fetch wrapper. Throws GeminiError on HTTP error or empty response.
export async function generateDescription({ apiKey, model, systemPrompt, base64Data, mimeType }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(systemPrompt, base64Data, mimeType)),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new GeminiError(res.status, detail || `HTTP ${res.status}`);
  }
  const json = await res.json();
  const text = (json?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim();
  if (!text) throw new GeminiError(0, '模型回傳空白內容');
  return text;
}
