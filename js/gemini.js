export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Gemini generateContent payload: prompt as systemInstruction, image inline
// in the user turn.
export function buildGeminiBody(systemPrompt, base64Data, mimeType) {
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{
      role: 'user',
      parts: [{ inlineData: { mimeType, data: base64Data } }],
    }],
  };
}

// Call Gemini. Throws ApiError on network failure (status -1), HTTP error
// (status = HTTP code), or empty response (status 0).
export async function generateDescription({ apiKey, model, systemPrompt, base64Data, mimeType }) {
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
