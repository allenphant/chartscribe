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
