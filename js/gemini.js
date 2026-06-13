export class GeminiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
  }
}

// Pure: shape the generateContent request payload. The prompt goes in the
// dedicated systemInstruction field so the model treats it as system-level
// guidance, separate from the user turn that carries the image.
export function buildRequestBody(systemPrompt, base64Data, mimeType) {
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: base64Data } },
      ],
    }],
  };
}

// Thin fetch wrapper. Throws GeminiError on network failure (status -1),
// HTTP error (status = HTTP code), or empty response (status 0).
export async function generateDescription({ apiKey, model, systemPrompt, base64Data, mimeType }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequestBody(systemPrompt, base64Data, mimeType)),
    });
  } catch (err) {
    throw new GeminiError(-1, `網路錯誤：${err.message}`);
  }
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
