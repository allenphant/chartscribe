# ChartScribe

純前端工具：把圖表圖片轉成客觀描述文字（純文字 / Markdown / LaTeX），透過 Google Gemini Vision API。內建臺灣抗生素抗藥性監視年報風格預設。

## 功能
- 拖拉 / 點選 / Ctrl+V 貼上，批次多圖。
- 風格預設可**檢視並編輯其完整 system prompt**（每個預設各自儲存，可還原預設）。
- 全域共用指示；每張圖另有專屬說明欄（可放去年數據解決跨年比較）。
- 輸出純文字 / Markdown / LaTeX，個別複製/下載，或「合併下載 / 合併複製」成單一文件。
- **多組命名 API key 管理**：可存多把 key、自由取名、切換、刪除；每把 key 可設定模型。
- API key 存於使用者自己瀏覽器的 localStorage，只直接傳給 Google，不經任何中間伺服器。

## 給使用者
開啟網站後，點右上「⚙ API key & 模型設定」→「新增 API key」：填名稱、貼上自己的 [Gemini API key](https://aistudio.google.com/apikey)、按「新增」即可開始。建議模型 `gemini-3.1-flash-lite`。

> 每位使用者用自己的 key；網站本身不含任何 key。
> 免費方案有頻率限制；敏感資料請留意，免費方案下輸入可能被 Google 用於改進模型。

## 部署成網站（給網址讓別人用）
這是一個純靜態網站（`index.html` + `js/` + `styles.css`，路徑皆相對），可放到任何免費靜態空間：

**最簡單 — Netlify Drop（免 git）**
把整個專案資料夾拖到 <https://app.netlify.com/drop>，立刻得到一個網址。

**GitHub Pages**
```bash
git remote add origin <你的-github-repo-url>
git push -u origin master
```
然後到 repo 的 Settings → Pages → Source 選 `Deploy from a branch`、分支選 `master`、資料夾選 `/ (root)`，存檔後會得到 `https://<帳號>.github.io/<repo>/` 網址。

> 注意：Pages 會把分支內所有檔案公開（含 `docs/` 與分析 md）。來源年報 PDF 已由 `.gitignore` 排除、不會上傳。若不想公開設計文件，部署前可移除 `docs/` 與 `報告結構分析.md`，或把 app 移到獨立 repo。

## 本機開發
ES module 在 Chrome 無法從 `file://` 載入，本機請用靜態伺服器：
```bash
npm start                 # = npx serve .
# 或
python -m http.server 8000
```
Firefox 可直接開 `index.html`。

## 測試
```bash
npm test
```

## 驗收標準
1. 部署後別人點網址、貼自己的 key 即可使用，無需安裝。
2. 選 AMR 預設、放入圖表 → 產出繁中、專有名詞保留英文、菌種斜體、無臨床詮釋。
3. 三種格式可切換、複製、下載。
4. 批次處理，單張失敗可重新生成。
5. 合併下載/複製可取得單一文件。
6. `npm test` 全數通過。
