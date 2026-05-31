# morning-routine

幫助國中國文老師開始新的一天。透過檢索本機進行中的教案項目、待辦草稿與 Obsidian Vault 中的 Markdown 任務，自動彙整成今日晨報，並引導設定每日自動排程。

## 前置條件
- 專案目錄結構須包含 `100_Todo/projects/`、`100_Todo/drafts/` 及 `000_Agent/memory/`。
- 本機已配置 Python 環境（支援遍歷與正則表達式即可）。

## 執行流程

當使用者輸入 `/morning` 或提及「早晨工作流」、「每日盤點」時，請執行以下步驟：

1. **掃描進行中教案與草稿**：
   - 讀取 `100_Todo/projects/lesson-plans/` 目錄，列出所有非封存的教案 Markdown 檔案及其最近修改時間。
   - 讀取 `100_Todo/drafts/emails/` 及 `100_Todo/drafts/admin-docs/` 下的草稿，列出待寄送或待編輯的信件與通知單。
2. **檢索昨日與前日 Memory**：
   - 尋找 `000_Agent/memory/daily/` 下最近 2 天的日誌檔案，提取「未完成的任務」與「關鍵決策」。
3. **掃描 Obsidian 本機待辦**：
   - 呼叫並執行 `scripts/obsidian_todo_scanner.py` 腳本，提取 `100_Todo/` 與 `300_Journal/` 中所有 Markdown 格式的待辦項目 (`- [ ]`)。
4. **輸出今日晨間簡報**：
   - 依據上述資訊，輸出包含「昨日回顧」、「今日進行中教案/行政草稿」、「本機 Obsidian 待辦任務」的結構化報告。
   - 在簡報最後，主動詢問使用者：**「老師，您今天最優先想完成的 Top 3 任務是什麼？」**
5. **排程引導**：
   - 主動詢問使用者是否需要利用系統的 `/schedule` 功能設定每日早上自動發送通知提醒。
