# ChartScribe 互動式單頁介紹 — 設計 spec

- 日期：2026-06-17
- 狀態：已通過 brainstorming，待寫實作計畫

## 目標

做一份 ChartScribe 的產品介紹頁：讓沒看過的人在一頁內看懂「這是什麼、怎麼用、能產出什麼」，並用**真實範例**展示成果。形式為互動式單頁（scrollytelling），可直接部署到 GitHub Pages。

## 產出形式

- 單一檔案 `intro.html`，放在 repo 根目錄。
- 沿用現有北歐極簡風的設計 tokens（亞麻米 `--sc-cream`、森林綠 `--sc-forest`、細字、軟陰影、適中圓角）。為了讓介紹頁自成一體、不隨 app 的 `styles.css` 變動而走樣，CSS **內嵌於 `intro.html`**（自帶一份相同的設計 tokens），不外連 `styles.css`。
- 引用 repo 內既有的真實範例圖：`assets/examples/*.png`。
- 互動用內嵌的原生 vanilla JS，**不引入任何第三方套件**。
- 不更動現有 app（`index.html` 等）。可選擇日後在 app 加一個連到 `intro.html` 的連結，但不在本 spec 範圍。

部署後網址：`https://allenphant.github.io/chartscribe/intro.html`。

## 頁面區塊（由上到下）

1. **Hero** — 葉片品牌標 + 「ChartScribe」+ 一句價值主張（把圖表圖片轉成貼合原文風格的客觀描述文字）+ 主按鈕「開始使用 →」連到 `index.html`、次按鈕「看範例 ↓」（錨點平滑捲到 Gallery）。
2. **為什麼**（痛點）— 一兩句：手寫年報／論文圖表描述費時、又要客觀一致 → 交給 ChartScribe。
3. **怎麼運作｜3 步** — ① 貼上圖表圖片 ② 選風格預設（可改 prompt）③ 取得 純文字／Markdown／LaTeX。
4. **★ 實際範例 Gallery（重點）** — 採「前後對照」呈現：每組「圖片 → 真實描述」並排（左圖右文，窄螢幕改上下堆疊）。捲動進場淡入。使用現存的 4 組真實 AMR 範例：
   - 敏感圖譜 `amr_susceptibility.png`
   - 抗藥率橫條 `amr_resistance_bar.png`
   - 組成堆疊 `amr_composition.png`
   - 趨勢折線 `amr_trend.png`
   - 描述文字取自 `js/examples.js` 對應的 `output` 字串（內容一致；可直接內嵌進 `intro.html`，不需在執行期 import）。
   - `general.png` 尚未補齊，**不放進 Gallery**，避免破圖。
5. **特色** — 卡片列：多組命名 API key・可編輯每個預設 prompt・三格式輸出（純文字／Markdown／LaTeX）・批次處理・抓取可用模型・**純前端零安裝**（key 只存本機 localStorage、不經中間伺服器）・北歐極簡 UI。
6. **風格預設** — 列出 5 種預設名稱一覽（敏感圖譜／抗藥率／組成／趨勢／通用）。
7. **CTA／頁尾** — 再一顆「開始使用 →」+ GitHub 連結（`https://github.com/allenphant/chartscribe`）+ 一句強調「自帶 key、零安裝、資料只在你的瀏覽器」。

## 互動（克制、貼合極簡風）

- 捲動淡入進場：用 `IntersectionObserver`，元素進視窗時加 class 觸發淡入/上移。尊重 `prefers-reduced-motion`（關閉動畫時直接顯示）。
- 卡片 hover 微浮（既有風格的 translateY + 陰影）。
- 錨點平滑捲動（CSS `scroll-behavior: smooth` 或錨點）。
- 純 vanilla、單一檔案，無建置、無相依。

## 文案語氣

繁體中文為主，語氣偏「工具說明」而非重行銷；生物醫學專有名詞沿用範例既有英文寫法（菌種學名、抗生素名）。

## 非目標（YAGNI）

- 不做模擬實機打字 demo（已選前後對照 Gallery）。
- 不串接真實 Gemini API（介紹頁只展示既有的靜態範例文字）。
- 不做多語系、不嵌動態 GitHub badge、不改現有 app 行為。
- 不把 `general` 範例補進來（等 `general.png` 補齊後再加，屬另一件事）。

## 驗收標準

- `intro.html` 單檔可直接以瀏覽器開啟（透過 http 伺服器，因引用相對路徑圖片）並正常顯示 7 個區塊。
- 4 組真實 AMR 圖片正確載入、各自對照其真實描述文字。
- 「開始使用」按鈕連到 `index.html`；「看範例」錨點可捲到 Gallery；GitHub 連結正確。
- 捲動淡入動畫運作；`prefers-reduced-motion: reduce` 下動畫關閉、內容仍完整可見。
- 視覺與現有 app 的北歐風一致（同色票、字體、圓角、陰影）。
- 響應式：窄螢幕下 Gallery 由左右並排改為上下堆疊，不破版。
- 不影響現有測試（`npm test` 仍 29 個通過）。
```
