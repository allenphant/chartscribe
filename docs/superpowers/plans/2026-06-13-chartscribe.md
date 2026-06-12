# ChartScribe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure-frontend, zero-build web tool that turns chart images into objective descriptive text (plain / Markdown / LaTeX) via the Gemini Vision API, with built-in AMR annual-report style presets.

**Architecture:** Vanilla ES modules, no build step. Pure logic (format conversion, prompt assembly, request building, storage) lives in small testable modules tested with Node's built-in `node:test`. The browser loads `index.html` + `<script type="module">`. UI glue (`ui.js`, `app.js`) is built and manually verified. AI returns one canonical Markdown per image; plain text and LaTeX are derived deterministically client-side.

**Tech Stack:** HTML, CSS (no framework), vanilla JavaScript (ES modules), Gemini `generateContent` REST API, `node:test` for unit tests.

---

## File Structure

```
index.html              介面骨架 + <script type="module" src="js/app.js">
styles.css              樣式（CSS 變數，無框架）
README.md               執行與驗收說明
package.json            { "type":"module", "scripts": { "test":"node --test" } }
js/
  formats.js            mdToPlain, mdToLatex（純函式）
  presets.js            PRESETS 定義 + buildSystemPrompt（純函式）
  gemini.js             buildRequestBody（純） + generateDescription（fetch 薄封裝）+ GeminiError
  storage.js            loadSettings/saveSettings（localStorage 薄封裝）
  ui.js                 createCardElement, renderCardOutput, setCardStatus
  app.js                主控：檔案輸入、全域狀態、產生全部、重生、格式切換、合併
test/
  formats.test.js
  presets.test.js
  gemini.test.js
  storage.test.js
```

Modules `formats.js`, `presets.js`, `gemini.js`, `storage.js` are pure/thin and unit-tested. `ui.js`/`app.js` are DOM glue, verified manually (per spec §13).

---

### Task 1: Project scaffold + test harness

**Files:**
- Create: `package.json`
- Create: `js/.gitkeep`, `test/.gitkeep`
- Create: `README.md`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "chartscribe",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test",
    "start": "npx --yes serve ."
  }
}
```

- [ ] **Step 2: Create placeholder dirs**

Create empty files `js/.gitkeep` and `test/.gitkeep` so the directories exist.

- [ ] **Step 3: Create `README.md` stub**

```markdown
# ChartScribe

純前端工具：把圖表圖片轉成客觀描述文字（純文字 / Markdown / LaTeX），透過 Gemini Vision API。內建臺灣抗生素抗藥性監視年報風格預設。

## 執行

因使用 ES module，Chrome 不允許從 `file://` 載入模組。請用本機靜態伺服器開啟：

```bash
npm start        # 等同 npx serve .
# 或
python -m http.server 8000
```

然後瀏覽 `http://localhost:8000`（或 serve 顯示的網址）。
Firefox 可直接開啟 `index.html`。

## 測試

```bash
npm test
```
```

- [ ] **Step 4: Verify test runner works**

Run: `npm test`
Expected: exits 0 with "tests 0" (no test files yet) — confirms `node --test` is available.

- [ ] **Step 5: Commit**

```bash
git add package.json js/.gitkeep test/.gitkeep README.md
git commit -m "chore: scaffold ChartScribe project and test harness"
```

---

### Task 2: `formats.js` — Markdown to plain text

**Files:**
- Create: `test/formats.test.js`
- Create: `js/formats.js`

- [ ] **Step 1: Write the failing test**

Create `test/formats.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mdToPlain } from '../js/formats.js';

test('mdToPlain strips heading markers', () => {
  assert.equal(mdToPlain('# 標題\n內文'), '標題\n內文');
});

test('mdToPlain strips bold and italic', () => {
  assert.equal(mdToPlain('對 **vancomycin** 與 *E. coli*'), '對 vancomycin 與 E. coli');
});

test('mdToPlain converts bullets to dot', () => {
  assert.equal(mdToPlain('- 第一\n- 第二'), '• 第一\n• 第二');
});

test('mdToPlain strips inline code', () => {
  assert.equal(mdToPlain('值為 `97%`'), '值為 97%');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/formats.test.js`
Expected: FAIL — cannot find module `../js/formats.js` / `mdToPlain is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `js/formats.js`:

```js
// Convert canonical Markdown to plain text.
// Order matters: headings and bullets are line-anchored and run before
// inline emphasis so a leading "* " bullet is not mistaken for italic.
export function mdToPlain(md) {
  return md
    .replace(/^#{1,6}\s+/gm, '')        // headings
    .replace(/^\s*[-*]\s+/gm, '• ')     // bullets
    .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
    .replace(/\*(.+?)\*/g, '$1')        // italic
    .replace(/`([^`]+)`/g, '$1')        // inline code
    .trim();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/formats.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add js/formats.js test/formats.test.js
git commit -m "feat: add mdToPlain markdown-to-plaintext converter"
```

---

### Task 3: `formats.js` — Markdown to LaTeX

**Files:**
- Modify: `js/formats.js`
- Modify: `test/formats.test.js`

- [ ] **Step 1: Write the failing test**

Append to `test/formats.test.js`:

```js
import { mdToLatex } from '../js/formats.js';

test('mdToLatex converts headings by level', () => {
  assert.equal(mdToLatex('# A'), '\\section{A}');
  assert.equal(mdToLatex('## B'), '\\subsection{B}');
});

test('mdToLatex converts bold and italic', () => {
  assert.equal(
    mdToLatex('對 **vancomycin** 與 *E. coli*'),
    '對 \\textbf{vancomycin} 與 \\textit{E. coli}'
  );
});

test('mdToLatex wraps bullets in itemize', () => {
  assert.equal(
    mdToLatex('- 第一\n- 第二'),
    '\\begin{itemize}\n  \\item 第一\n  \\item 第二\n\\end{itemize}'
  );
});

test('mdToLatex escapes percent and other specials', () => {
  assert.equal(mdToLatex('敏感性 97% 與 co_trimoxazole'), '敏感性 97\\% 與 co\\_trimoxazole');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/formats.test.js`
Expected: FAIL — `mdToLatex is not a function`.

- [ ] **Step 3: Write minimal implementation**

Append to `js/formats.js`:

```js
// Escape LaTeX special characters that appear in AMR text (e.g. "97%",
// "co-trimoxazole" underscores). Runs before emphasis markers are turned
// into commands, so the backslashes/braces we add are not re-escaped.
function escapeLatex(s) {
  return s.replace(/([%&#_$])/g, '\\$1');
}

function inlineLatex(s) {
  return escapeLatex(s)
    .replace(/\*\*(.+?)\*\*/g, '\\textbf{$1}')
    .replace(/\*(.+?)\*/g, '\\textit{$1}');
}

export function mdToLatex(md) {
  const lines = md.split('\n');
  const out = [];
  let inList = false;
  for (const line of lines) {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (!inList) { out.push('\\begin{itemize}'); inList = true; }
      out.push('  \\item ' + inlineLatex(bullet[1]));
      continue;
    }
    if (inList) { out.push('\\end{itemize}'); inList = false; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const cmd = level === 1 ? 'section' : level === 2 ? 'subsection' : 'subsubsection';
      out.push(`\\${cmd}{${inlineLatex(h[2])}}`);
      continue;
    }
    out.push(inlineLatex(line));
  }
  if (inList) out.push('\\end{itemize}');
  return out.join('\n').trim();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/formats.test.js`
Expected: PASS (8 tests total).

- [ ] **Step 5: Commit**

```bash
git add js/formats.js test/formats.test.js
git commit -m "feat: add mdToLatex markdown-to-latex converter with escaping"
```

---

### Task 4: `presets.js` — style presets + prompt assembly

**Files:**
- Create: `test/presets.test.js`
- Create: `js/presets.js`

- [ ] **Step 1: Write the failing test**

Create `test/presets.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/presets.test.js`
Expected: FAIL — cannot find module `../js/presets.js`.

- [ ] **Step 3: Write minimal implementation**

Create `js/presets.js`:

```js
const LANGUAGE_RULES = `輸出語言：預設繁體中文；若使用者指示要求其他語言，則依其指示。
生物醫學專有名詞一律保留英文不翻譯：菌種學名（如 Escherichia coli）、抗生素名（如 vancomycin）、抗藥性縮寫（如 CRAB、MRSA）。
菌種學名以 Markdown 斜體呈現，例如 *Escherichia coli*。
僅輸出描述文字本身，使用 Markdown 格式，不要加入前言或解釋你正在做什麼。`;

const OBJECTIVE_RULES = `客觀守則：
- 只描述圖表中實際呈現的數據，不加入任何臨床詮釋或建議（例如不可寫「可作為可靠的治療選擇」）。
- 敏感率（% susceptible）與抗藥率（% resistant）為互補概念，不可混用，依圖表標示為準。
- 若某數據之檢測菌株數少於 20，不予描述。`;

export const PRESETS = {
  general: {
    name: '通用',
    objective: false,
    fragment: '請客觀描述這張圖表所呈現的數據與趨勢。',
  },
  amr_susceptibility: {
    name: 'AMR－敏感性圖譜',
    objective: true,
    fragment: '這是一張抗生素敏感性圖譜（矩陣表格，格內為敏感率 % susceptible 與檢測菌株數）。請逐抗生素類別描述各菌種之敏感率數值。',
  },
  amr_resistance_bar: {
    name: 'AMR－抗藥性百分比橫條圖',
    objective: true,
    fragment: '這是一張抗藥性百分比橫條圖（含 95% 信賴區間，可能分社區感染 CO 與醫療相關感染 HO）。請描述各抗生素之抗藥率（% resistant）數值，並指出 CO 與 HO 或不同檢體別之差異。',
  },
  amr_composition: {
    name: 'AMR－菌株組成堆疊長條圖',
    objective: true,
    fragment: '這是一張菌株組成的 100% 堆疊長條圖（逐年呈現各菌種占比）。請描述占比最高的前幾名菌種，以及其在各年度間的升降方向。',
  },
  amr_trend: {
    name: 'AMR－多重抗藥趨勢折線圖',
    objective: true,
    fragment: '這是一張多重抗藥菌抗藥性百分比的趨勢折線圖（通常含醫學中心／區域醫院／地區醫院／全國四條線，跨多個年度）。請描述各年度間的走勢方向，以及不同醫院層級間的高低差異。',
  },
};

export function buildSystemPrompt(presetKey, sharedInstructions, perCardContext) {
  const preset = PRESETS[presetKey] || PRESETS.general;
  const parts = [preset.fragment, LANGUAGE_RULES];
  if (preset.objective) parts.push(OBJECTIVE_RULES);
  if (sharedInstructions && sharedInstructions.trim()) {
    parts.push('使用者共用指示：' + sharedInstructions.trim());
  }
  if (perCardContext && perCardContext.trim()) {
    parts.push('本圖補充資料：' + perCardContext.trim());
  }
  return parts.join('\n\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/presets.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add js/presets.js test/presets.test.js
git commit -m "feat: add style presets and system prompt assembly"
```

---

### Task 5: `storage.js` — settings persistence

**Files:**
- Create: `test/storage.test.js`
- Create: `js/storage.js`

- [ ] **Step 1: Write the failing test**

Create `test/storage.test.js`:

```js
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadSettings, saveSettings, DEFAULT_MODEL } from '../js/storage.js';

beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
});

test('loadSettings returns defaults when empty', () => {
  const s = loadSettings();
  assert.equal(s.apiKey, '');
  assert.equal(s.model, DEFAULT_MODEL);
});

test('saveSettings then loadSettings round-trips', () => {
  saveSettings({ apiKey: 'abc123', model: 'gemini-2.5-pro' });
  const s = loadSettings();
  assert.equal(s.apiKey, 'abc123');
  assert.equal(s.model, 'gemini-2.5-pro');
});

test('saveSettings ignores blank model and keeps default', () => {
  saveSettings({ apiKey: 'k', model: '' });
  assert.equal(loadSettings().model, DEFAULT_MODEL);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/storage.test.js`
Expected: FAIL — cannot find module `../js/storage.js`.

- [ ] **Step 3: Write minimal implementation**

Create `js/storage.js`:

```js
export const DEFAULT_MODEL = 'gemini-2.5-flash';
const KEY_API = 'chartscribe.apiKey';
const KEY_MODEL = 'chartscribe.model';

export function loadSettings() {
  return {
    apiKey: localStorage.getItem(KEY_API) || '',
    model: localStorage.getItem(KEY_MODEL) || DEFAULT_MODEL,
  };
}

export function saveSettings({ apiKey, model }) {
  if (apiKey !== undefined) localStorage.setItem(KEY_API, apiKey || '');
  if (model && model.trim()) localStorage.setItem(KEY_MODEL, model.trim());
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/storage.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add js/storage.js test/storage.test.js
git commit -m "feat: add localStorage-backed settings persistence"
```

---

### Task 6: `gemini.js` — request body + API call

**Files:**
- Create: `test/gemini.test.js`
- Create: `js/gemini.js`

- [ ] **Step 1: Write the failing test**

Create `test/gemini.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/gemini.test.js`
Expected: FAIL — cannot find module `../js/gemini.js`.

- [ ] **Step 3: Write minimal implementation**

Create `js/gemini.js`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/gemini.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — all tests across the four test files (18 total).

- [ ] **Step 6: Commit**

```bash
git add js/gemini.js test/gemini.test.js
git commit -m "feat: add gemini request builder and generateContent call"
```

---

### Task 7: `index.html` + `styles.css` — static shell

**Files:**
- Create: `index.html`
- Create: `styles.css`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChartScribe — 圖表描述產生器</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="topbar">
    <h1>ChartScribe</h1>
    <button id="settings-toggle" type="button">⚙ API key &amp; 模型設定</button>
  </header>

  <section id="settings-panel" class="panel hidden">
    <label>Gemini API key
      <input id="api-key" type="password" placeholder="貼上你的 API key（存於瀏覽器本機）">
    </label>
    <label>模型
      <input id="model" type="text" placeholder="gemini-2.5-flash">
    </label>
    <button id="settings-save" type="button">儲存</button>
    <p class="hint">API key 僅存於此瀏覽器的 localStorage，不會上傳到任何伺服器（除了直接呼叫 Google）。</p>
  </section>

  <section class="controls">
    <label>風格預設
      <select id="style-preset"></select>
    </label>
    <label>共用指示（套用到整批，選填）
      <textarea id="shared-instructions" rows="2" placeholder="例如：用正式書面語氣"></textarea>
    </label>
    <fieldset class="formats">
      <legend>輸出格式</legend>
      <label><input type="radio" name="fmt" value="plain"> 純文字</label>
      <label><input type="radio" name="fmt" value="markdown" checked> Markdown</label>
      <label><input type="radio" name="fmt" value="latex"> LaTeX</label>
    </fieldset>
  </section>

  <div id="dropzone" class="dropzone">
    拖拉圖片到這裡，或 <button id="file-pick" type="button">點選檔案</button>，或 Ctrl+V 貼上
    <input id="file-input" type="file" accept="image/*" multiple hidden>
  </div>

  <main id="cards" class="cards"></main>

  <footer class="actions">
    <button id="generate-all" type="button">產生全部</button>
    <button id="combine" type="button">合併全部</button>
  </footer>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `styles.css`**

```css
:root {
  --bg: #f7f9fb; --fg: #1f2933; --accent: #2b8a8f;
  --border: #d0d8de; --error: #c0392b; --ok: #2b8a3f;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, "Microsoft JhengHei", sans-serif;
  color: var(--fg); background: var(--bg); }
.topbar { display: flex; justify-content: space-between; align-items: center;
  padding: 12px 20px; background: var(--accent); color: #fff; }
.topbar h1 { font-size: 1.2rem; margin: 0; }
.topbar button { background: rgba(255,255,255,.15); color: #fff;
  border: 1px solid rgba(255,255,255,.4); border-radius: 6px; padding: 6px 10px; cursor: pointer; }
.panel, .controls { padding: 16px 20px; background: #fff; border-bottom: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 10px; }
.hidden { display: none; }
label { display: flex; flex-direction: column; gap: 4px; font-size: .9rem; }
input, textarea, select { padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px;
  font: inherit; }
.formats { border: 1px solid var(--border); border-radius: 6px; }
.formats label { flex-direction: row; align-items: center; gap: 6px; display: inline-flex; margin-right: 12px; }
.hint { font-size: .8rem; color: #667; margin: 0; }
.dropzone { margin: 16px 20px; padding: 24px; border: 2px dashed var(--border);
  border-radius: 10px; text-align: center; color: #556; background: #fff; }
.dropzone.dragover { border-color: var(--accent); background: #eef7f7; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px; padding: 0 20px 20px; }
.card { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 12px;
  display: flex; flex-direction: column; gap: 8px; }
.card img { max-width: 100%; max-height: 160px; object-fit: contain; align-self: center; }
.card .status { font-size: .8rem; }
.card .status.error { color: var(--error); }
.card .status.done { color: var(--ok); }
.card pre { white-space: pre-wrap; word-break: break-word; background: #f4f6f8;
  border-radius: 6px; padding: 10px; max-height: 300px; overflow: auto; margin: 0; font-size: .85rem; }
.card .row { display: flex; gap: 8px; flex-wrap: wrap; }
.card button { border: 1px solid var(--border); background: #fff; border-radius: 6px;
  padding: 4px 10px; cursor: pointer; }
.actions { display: flex; gap: 12px; padding: 16px 20px; position: sticky; bottom: 0;
  background: var(--bg); border-top: 1px solid var(--border); }
.actions button { padding: 10px 18px; border-radius: 8px; border: none; background: var(--accent);
  color: #fff; cursor: pointer; font-size: 1rem; }
```

- [ ] **Step 3: Manual verification**

Run: `npm start` and open the shown URL.
Expected: page renders with header, hidden settings panel, controls (style preset select is empty for now — filled in Task 9), format radios, dropzone, and two action buttons. No console errors except `app.js` 404 is NOT acceptable — if `app.js` missing, browser logs a module load error; that's expected until Task 9. Create an empty `js/app.js` if needed to avoid the error: `// app entry`.

- [ ] **Step 4: Create empty `js/app.js` placeholder**

Create `js/app.js` with a single line so the module loads cleanly:

```js
// app entry — implemented in Task 9
```

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css js/app.js
git commit -m "feat: add static HTML shell and styles"
```

---

### Task 8: `ui.js` — card rendering helpers

**Files:**
- Create: `js/ui.js`

These are DOM builders consumed by `app.js`. Verified via Task 9 integration.

- [ ] **Step 1: Create `js/ui.js`**

```js
// Build the DOM element for one card. Wires button callbacks supplied by app.js.
export function createCardElement(card, handlers) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.id = card.id;

  const img = document.createElement('img');
  img.src = card.thumbnailURL;
  img.alt = card.file.name;
  el.appendChild(img);

  const status = document.createElement('div');
  status.className = 'status';
  el.appendChild(status);

  const ctx = document.createElement('textarea');
  ctx.rows = 2;
  ctx.placeholder = '本圖專屬說明（選填）：例如 112 年數據';
  ctx.value = card.perCardContext;
  ctx.addEventListener('input', () => handlers.onContextChange(card.id, ctx.value));
  el.appendChild(ctx);

  const pre = document.createElement('pre');
  pre.className = 'output';
  el.appendChild(pre);

  const row = document.createElement('div');
  row.className = 'row';
  const copyBtn = button('複製', () => handlers.onCopy(card.id));
  const dlBtn = button('下載', () => handlers.onDownload(card.id));
  const regenBtn = button('重生', () => handlers.onRegen(card.id));
  row.append(copyBtn, dlBtn, regenBtn);
  el.appendChild(row);

  setCardStatus(el, card.status, card.errorMessage);
  return el;
}

function button(label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

const STATUS_TEXT = {
  queued: '待處理', processing: '產生中…', done: '完成', error: '錯誤',
};

export function setCardStatus(cardEl, status, errorMessage) {
  const s = cardEl.querySelector('.status');
  s.className = 'status ' + status;
  s.textContent = status === 'error'
    ? `錯誤：${errorMessage || '未知錯誤'}`
    : STATUS_TEXT[status] || status;
}

// Render the output text for the current format into the card's <pre>.
export function renderCardOutput(cardEl, text) {
  cardEl.querySelector('.output').textContent = text;
}
```

- [ ] **Step 2: Commit**

```bash
git add js/ui.js
git commit -m "feat: add card rendering helpers"
```

---

### Task 9: `app.js` — main controller wiring

**Files:**
- Modify: `js/app.js` (replace placeholder)

- [ ] **Step 1: Implement the controller**

Replace `js/app.js` contents:

```js
import { loadSettings, saveSettings } from './storage.js';
import { PRESETS, buildSystemPrompt } from './presets.js';
import { generateDescription, GeminiError } from './gemini.js';
import { mdToPlain, mdToLatex } from './formats.js';
import { createCardElement, setCardStatus, renderCardOutput } from './ui.js';

const state = {
  ...loadSettings(),
  stylePreset: 'general',
  sharedInstructions: '',
  outputFormat: 'markdown',
  cards: [],
};

const $ = (id) => document.getElementById(id);
let nextId = 1;

// ---- format derivation ----
function formatText(markdown, fmt) {
  if (!markdown) return '';
  if (fmt === 'plain') return mdToPlain(markdown);
  if (fmt === 'latex') return mdToLatex(markdown);
  return markdown;
}

function cardEl(id) {
  return document.querySelector(`.card[data-id="${id}"]`);
}

function refreshCardOutput(card) {
  const el = cardEl(card.id);
  if (el) renderCardOutput(el, formatText(card.markdown, state.outputFormat));
}

// ---- file intake ----
function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function addFiles(fileList) {
  for (const file of fileList) {
    if (!file.type.startsWith('image/')) {
      alert(`略過非圖片檔：${file.name}`);
      continue;
    }
    const card = {
      id: nextId++, file,
      thumbnailURL: URL.createObjectURL(file),
      perCardContext: '', status: 'queued', markdown: '', errorMessage: '',
    };
    state.cards.push(card);
    const el = createCardElement(card, handlers);
    $('cards').appendChild(el);
  }
}

// ---- generation ----
async function generateCard(card) {
  if (!state.apiKey) {
    card.status = 'error';
    card.errorMessage = '尚未設定 API key（點右上設定）';
    setCardStatus(cardEl(card.id), card.status, card.errorMessage);
    return;
  }
  card.status = 'processing';
  setCardStatus(cardEl(card.id), card.status);
  try {
    const base64Data = await readAsBase64(card.file);
    const systemPrompt = buildSystemPrompt(
      state.stylePreset, state.sharedInstructions, card.perCardContext
    );
    const markdown = await callWithRetry({
      apiKey: state.apiKey, model: state.model,
      systemPrompt, base64Data, mimeType: card.file.type,
    });
    card.markdown = markdown;
    card.status = 'done';
    setCardStatus(cardEl(card.id), card.status);
    refreshCardOutput(card);
  } catch (err) {
    card.status = 'error';
    card.errorMessage = err instanceof GeminiError ? `${err.status} ${err.message}` : String(err);
    setCardStatus(cardEl(card.id), card.status, card.errorMessage);
  }
}

// one automatic retry on 429
async function callWithRetry(args) {
  try {
    return await generateDescription(args);
  } catch (err) {
    if (err instanceof GeminiError && err.status === 429) {
      await new Promise((r) => setTimeout(r, 2000));
      return generateDescription(args);
    }
    throw err;
  }
}

async function generateAll() {
  for (const card of state.cards) {
    if (card.status === 'done') continue;
    await generateCard(card);   // sequential
  }
}

// ---- output actions ----
function copyText(text) {
  navigator.clipboard.writeText(text).catch(() => alert('複製失敗'));
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

const EXT = { plain: 'txt', markdown: 'md', latex: 'tex' };

function combineAll() {
  const done = state.cards.filter((c) => c.status === 'done');
  if (!done.length) { alert('尚無已完成的描述'); return; }
  const sep = state.outputFormat === 'latex' ? '\n\n% ----\n\n' : '\n\n---\n\n';
  const body = done
    .map((c) => formatText(c.markdown, state.outputFormat))
    .join(sep);
  download(`chartscribe-combined.${EXT[state.outputFormat]}`, body);
}

// ---- handlers passed to cards ----
const handlers = {
  onContextChange(id, value) {
    const c = state.cards.find((x) => x.id === id);
    if (c) c.perCardContext = value;
  },
  onCopy(id) {
    const c = state.cards.find((x) => x.id === id);
    if (c) copyText(formatText(c.markdown, state.outputFormat));
  },
  onDownload(id) {
    const c = state.cards.find((x) => x.id === id);
    if (c) download(`${c.file.name}.${EXT[state.outputFormat]}`, formatText(c.markdown, state.outputFormat));
  },
  onRegen(id) {
    const c = state.cards.find((x) => x.id === id);
    if (c) generateCard(c);
  },
};

// ---- init ----
function populatePresets() {
  const sel = $('style-preset');
  for (const [key, p] of Object.entries(PRESETS)) {
    const opt = document.createElement('option');
    opt.value = key; opt.textContent = p.name;
    sel.appendChild(opt);
  }
  sel.value = state.stylePreset;
}

function init() {
  populatePresets();
  $('api-key').value = state.apiKey;
  $('model').value = state.model;

  $('settings-toggle').addEventListener('click', () =>
    $('settings-panel').classList.toggle('hidden'));
  $('settings-save').addEventListener('click', () => {
    state.apiKey = $('api-key').value.trim();
    state.model = $('model').value.trim() || state.model;
    saveSettings({ apiKey: state.apiKey, model: state.model });
    $('settings-panel').classList.add('hidden');
  });

  $('style-preset').addEventListener('change', (e) => { state.stylePreset = e.target.value; });
  $('shared-instructions').addEventListener('input', (e) => { state.sharedInstructions = e.target.value; });
  document.querySelectorAll('input[name="fmt"]').forEach((r) =>
    r.addEventListener('change', (e) => {
      state.outputFormat = e.target.value;
      state.cards.forEach(refreshCardOutput);
    }));

  $('file-pick').addEventListener('click', () => $('file-input').click());
  $('file-input').addEventListener('change', (e) => addFiles(e.target.files));

  const dz = $('dropzone');
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault(); dz.classList.remove('dragover');
    addFiles(e.dataTransfer.files);
  });
  window.addEventListener('paste', (e) => {
    const imgs = [...e.clipboardData.items]
      .filter((i) => i.type.startsWith('image/'))
      .map((i) => i.getAsFile())
      .filter(Boolean);
    if (imgs.length) addFiles(imgs);
  });

  $('generate-all').addEventListener('click', generateAll);
  $('combine').addEventListener('click', combineAll);
}

init();
```

- [ ] **Step 2: Manual smoke test (no API key)**

Run: `npm start`, open URL. Drag an image in → a card appears with thumbnail and "待處理". Click "產生全部" without a key → card shows "錯誤：尚未設定 API key". Switch format radios → no crash. Confirms wiring.

- [ ] **Step 3: Manual end-to-end test (with API key)**

Enter a real Gemini API key in settings, save. Drag in an AMR chart (e.g. a screenshot of 圖 3-1-1), pick preset "AMR－敏感性圖譜", click "產生全部". Expected: card reaches "完成" with a Traditional-Chinese description where species/antibiotic names stay English and species are italic. Toggle to LaTeX → `\textit{}` and `\%` appear. Click 下載 → file downloads. Add a second image, click 合併全部 → combined file downloads.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: wire up controller, file intake, generation, and outputs"
```

---

### Task 10: README finalize + acceptance checklist

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Expand `README.md`**

Replace `README.md` with:

```markdown
# ChartScribe

純前端工具：把圖表圖片轉成客觀描述文字（純文字 / Markdown / LaTeX），透過 Gemini Vision API。內建臺灣抗生素抗藥性監視年報風格預設。

## 功能
- 拖拉 / 點選 / Ctrl+V 貼上，批次多圖。
- 全域風格預設 + 共用指示；每張圖另有專屬說明欄（可放去年數據解決跨年比較）。
- 輸出純文字 / Markdown / LaTeX，個別複製/下載，或「合併全部」成單一檔案。
- 使用者自帶 Gemini API key，存於瀏覽器 localStorage。

## 執行
ES module 在 Chrome 無法從 `file://` 載入，請用本機靜態伺服器：

```bash
npm start                 # = npx serve .
# 或
python -m http.server 8000
```

開啟顯示的網址。Firefox 可直接開 `index.html`。

## 設定
右上「⚙ API key & 模型設定」貼上 Gemini API key，模型預設 `gemini-2.5-flash`。

## 測試
```bash
npm test
```

## 驗收標準
1. 無建置即可開啟使用。
2. 輸入 key、選 AMR 預設、放入圖表 → 產出繁中、專有名詞保留英文、菌種斜體、無臨床詮釋。
3. 三種格式可切換、複製、下載。
4. 批次處理，單張失敗可重生。
5. 合併全部可下載單一檔案。
6. `npm test` 全數通過。
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: PASS — all 18 tests.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: finalize README with usage and acceptance checklist"
```

---

## Self-Review Notes

**Spec coverage check:**
- §4 流程 → Tasks 7,9. §5 介面 → Task 7. §6 狀態模型 → Task 9 (`state`, card objects). §7 Gemini 串接 → Task 6 + Task 9 (sequential, 429 retry). §8 語言/用詞規則 → Task 4 (`LANGUAGE_RULES`, `OBJECTIVE_RULES`). §9 風格預設 → Task 4 (`PRESETS`). §10 三格式 → Tasks 2,3 + Task 9 (`formatText`, `combineAll`). §11 錯誤處理 → Task 9 (no-key, per-card error, non-image alert, 429 retry). §12 檔案結構 → all tasks. §13 測試 → Tasks 2–6 unit tests, Task 9 manual. §14 驗收 → Task 10.
- All spec sections map to tasks. No gaps.

**Placeholder scan:** No TBD/TODO; every code step contains complete code.

**Type consistency:** `card` object shape (`id, file, thumbnailURL, perCardContext, status, markdown, errorMessage`) consistent across Tasks 8–9. `buildSystemPrompt(presetKey, sharedInstructions, perCardContext)`, `buildRequestBody(systemPrompt, base64Data, mimeType)`, `generateDescription({apiKey, model, systemPrompt, base64Data, mimeType})`, `formatText(markdown, fmt)`, `EXT`/`STATUS_TEXT` keys all consistent between definition and call sites.
