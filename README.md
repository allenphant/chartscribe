# ChartScribe

純前端工具：把圖表圖片轉成客觀描述文字（純文字 / Markdown / LaTeX），透過 Gemini Vision API。內建臺灣抗生素抗藥性監視年報風格預設。

## 功能
- 拖拉 / 點選 / Ctrl+V 貼上，批次多圖。
- 全域風格預設 + 共用指示；每張圖另有專屬說明欄（可放去年數據解決跨年比較）。
- 輸出純文字 / Markdown / LaTeX，個別複製/下載，或「合併下載 / 合併複製」成單一文件。
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
5. 合併下載/複製可取得單一文件。
6. `npm test` 全數通過。
