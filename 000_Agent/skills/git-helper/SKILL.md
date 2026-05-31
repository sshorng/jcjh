---
name: git-helper
description: "Git 協作助手 — 自動生成符合規範的精美繁體中文 commit 訊息，並在提交前進行安全防漏盤點。"
---

# Git 協作助手（/git-helper）

自動化您的 Git 工作流。包含自動撰寫精美 Commit 訊息、分支命名引導，以及公開倉庫敏感資料防護閘門。

---

<HARD-GATE>
在進行 `git commit` 之前，必須先執行安全檢查，驗證暫存區中是否含有隱私或機密檔案，以確保安全。
</HARD-GATE>

## 執行流程

當使用者輸入 `/git-helper`、`/git` 或是要求「提交變更」、「備份大腦」時，請執行以下步驟：

### Phase 1：安全防漏檢查 (Security Gate)

1. **獲取暫存區檔案列表**：
   - 執行命令：`git diff --cached --name-only`。
2. **獲取遠端端點狀態**：
   - 執行命令：`git remote -v`。
3. **安全檢查邏輯**：
   - 如果遠端倉庫是 **Public (公開)** 的：
     - 檢查暫存檔案中是否包含：`MEMORY.md`、`300_Journal/`（日記）、`100_Todo/drafts/`（信件草稿）或 `.env` 檔案。
     - 若有，**強制攔截並警告**，提示這些檔案包含個人隱私或機密，不應推送到公開的 GitHub 倉庫中，引導使用者將其移出暫存區 (`git reset HEAD <file>`)。
   - 如果遠端是 **Private (私有)** 的，則僅進行友善提醒。

### Phase 2：自動生成精美 Commit 訊息

分析使用者的變更內容（執行 `git diff --cached`），自動生成符合規範的 **繁體中文 Commit 訊息**：

#### 訊息類型規範 (Type)：
- `feat` (新功能)：新增了教案、學習單、或是自訂技能。
- `fix` (勘誤/修復)：修正了教材錯誤、代碼 Bug 或格式對齊問題。
- `docs` (文件/日誌)：更新了日記、MEMORY.md、README.md。
- `refactor` (重構)：優化了現有的自訂技能結構或大腦路由。
- `style` (樣式)：調整了 Landing Page 的 CSS 樣式或排版。

#### 格式範例：
```
feat: 新增八年級背影文言文學習單與注音教材

- 建立學習單草稿於 100_Todo/projects/
- 補齊生字注音與 3 題閱讀測驗
```

### Phase 3：提交與推送
1. 展示生成的 Commit 訊息供使用者確認。
2. 確認後執行 `git commit -m "[訊息]"`。
3. 主動詢問是否需要一鍵執行 `git push` 推送至 GitHub。
