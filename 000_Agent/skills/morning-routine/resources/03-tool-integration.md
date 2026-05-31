# Antigravity 外部工具整合指南 (Obsidian 專用版)

本指南配合「雷小蒙迷你課 2-3」，幫助您在 **Antigravity** 環境中發揮 **Obsidian** 的本機管理優勢，打造極速、安全且私密的個人工作流。

---

## 1. Obsidian 本機任務管理 (完全本機 - 推薦)

由於 Obsidian 的所有資料都是以 Markdown 檔案形式儲存在您的本機硬碟中，AI 分身不需要透過網路 API (如 Notion API)，就能直接讀取與處理您的任務。

### A. 任務寫作標準
為了讓 AI 能夠精準掃描您的待辦事項，請在您的筆記中採用標準的 Markdown 任務語法：
```markdown
- [ ] 準備《背影》學習單生字注音
- [ ] 撰寫九年級模擬考家長通知信
```
*提示：AI 掃描器會自動遍歷 `100_Todo/` 及 `300_Journal/` 兩個目錄下的所有 `.md` 檔案，提取以上格式的任務。*

### B. 推薦 Obsidian 插件搭配
如果您希望在 Obsidian 介面中擁有更強大的任務視覺化管理，推薦安裝以下社群外掛：
1. **Obsidian Tasks**：
   - 可以自動彙整您散落在各個筆記中的 `- [ ]` 任務。
   - 支援設定到期日、優先級等。
2. **Dataview**：
   - 透過簡單的查詢語法，自動在主頁顯示所有未完成的任務。
   - 例如：
     ```dataview
     TASK FROM "100_Todo" WHERE !completed
     ```

---

## 2. Google Calendar & Gmail 整合 (CLI 路線)

如果您想讓 AI 能夠隨時讀取您的 Google 行事曆或郵件，可以考慮以下做法：

### 利用 `gcloud` CLI (穩定、快速)
相較於複雜的 MCP Server，直接讓 AI 呼叫 Google Cloud SDK 是最穩定的做法：
1. 本機安裝 [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)。
2. 在 Windows PowerShell 中執行：
   ```powershell
   gcloud auth application-default login
   ```
3. AI 即可透過 `run_command` 直接執行 Python 腳本或 gcloud 指令來讀取行事曆，不佔用任何網路連線額度。
