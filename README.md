# ChartScribe

純前端工具：把圖表圖片轉成客觀描述文字（純文字 / Markdown / LaTeX），透過多模態 LLM API（Google Gemini 或 NVIDIA）。內建臺灣抗生素抗藥性監視年報風格預設。

## 功能
- 拖拉 / 點選 / Ctrl+V 貼上，批次多圖。
- 風格預設可**檢視並編輯其完整 system prompt**（每個預設各自儲存，可還原預設）。
- 全域共用指示；每張圖另有專屬說明欄（可放去年數據解決跨年比較）。
- 輸出純文字 / Markdown / LaTeX，個別複製/下載，或「合併下載 / 合併複製」成單一文件。
- **多組命名 API key 管理**：可存多把 key、自由取名、切換、刪除；每把 key 綁定供應商與模型。
- 支援 **Google Gemini** 與 **NVIDIA**（OpenAI 相容端點）。貼上 key 時 `nvapi-` 前綴會自動辨識為 NVIDIA。
- API key 存於瀏覽器 localStorage。

## 已知限制
- NVIDIA 端點（`integrate.api.nvidia.com`）可能因 **CORS** 不允許從瀏覽器直連；若如此，卡片會顯示網路錯誤，需另架輕量代理。Google Gemini 端點支援瀏覽器直連。

## 執行
ES module 在 Chrome 無法從 `file://` 載入，請用本機靜態伺服器：

```bash
npm start                 # = npx serve .
# 或
python -m http.server 8000
```

開啟顯示的網址。Firefox 可直接開 `index.html`。

## 設定
右上「⚙ API key & 模型設定」→「新增 API key」：填名稱、選供應商（或貼 key 自動辨識）、貼上 key、確認模型，按「新增」。之後用「目前使用的 API key」下拉切換。預設模型：Gemini → `gemini-2.5-flash`；NVIDIA → `meta/llama-3.2-90b-vision-instruct`。

## 測試
```bash
npm test
```

## 驗收標準
1. 無建置即可開啟使用。
2. 輸入 key、選 AMR 預設、放入圖表 → 產出繁中、專有名詞保留英文、菌種斜體、無臨床詮釋。
3. 三種格式可切換、複製、下載。
4. 批次處理，單張失敗可重生。
5. 合併下載/複製可取得單一文件。
6. `npm test` 全數通過。
