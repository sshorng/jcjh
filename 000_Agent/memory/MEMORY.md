<!-- AI 分身起始助手紀錄:START -->
<!-- AI 分身起始助手 by 雷小蒙 v1.0 · 2026-05-31 · by 雷蒙（Raymond Hou）· https://github.com/Raymondhou0917/claude-code-resources · CC BY-NC-SA 4.0 -->

# 國文老師 的 AI 分身記憶

> 這裡存我跟 AI 之間跨 session 的偏好、經驗、踩坑紀錄。
> AI 每次 session 開始會自動讀這個檔案。

---

## 用戶偏好

- **工作區改名與 Git 備份**：大腦母資料夾路徑已由舊的 `Antigravity` 遷移改名為 `AI_Agent`，並完成 GitHub 私有儲存庫雲端雙重備份。
- **全域免確認白名單**：以下目錄已寫入 `C:\Users\sshor\.gemini\config\config.json` 的 `globalPermissionGrants`，AI 在這些路徑下進行檔案讀寫或 ripgrep 搜尋時完全不需要手動點選允許：
  - `G:\我的雲端硬碟\工作\國文教學\0教科書\康軒\` （國文備課資料夾）
  - `G:\我的雲端硬碟\Obsidian\sshorng\` （Obsidian 第二大腦）
  - `G:\我的雲端硬碟\AI_Agent\` （AI 工作區根目錄）
- **HTML 小程式管理**：納入工作區 `100_Todo/projects/html` 以利 AI 讀寫，但已在母資料夾 Git 中將其排除，保留各程式獨立使用其各自 GitHub repo 的完整自由。

---

## Feedback（AI 學到的原則）

- **Python 檔案覆寫防錯**：在用 Python 進行檔案內容字串替換時，切勿在讀取 (`.read()`) 前先以寫入模式 (`'w'`) 開啟同一個檔案。應採用「先完整讀取並關閉檔案，再開啟寫入模式複寫」以防檔案遭截斷清空。
- **Windows背景會話隔離 (Session 0)**：當 AI 進程處於背景執行時，無法直接開啟實體桌面 GUI 視窗（例如 `nlm login` / `firebase login` 等彈窗）。遭遇此類狀況時，應引導用戶手動在電腦 CMD/PowerShell 視窗中執行。

---

## 踩坑筆記

- **Google Drive 架構下的 Symbolic Links 限制**：在 FAT32/ExFAT-like 的 Google 雲端虛擬硬碟（G 槽）上直接建立 Junction 或 Symlink 會因「NTFS 磁碟區需求」而報錯。應在 NTFS 格式的 C 槽（`C:\Users\sshor\.gemini\config`）上建立 Junction 連回 G 槽（`G:\我的雲端硬碟\AI_Agent`），以實現跨電腦同步。
- **PowerShell 編碼亂碼**：Windows 上的 PowerShell 腳本在寫入中文時，務必強制使用 UTF-8 with BOM 格式，以防在 ANSI/cp950 環境下解析出錯。
- **NotebookLM 憑證過期重登**：NotebookLM CLI 的 Token 損毀或過期時會導致 `Authentication expired`，此時需在實體 CMD 中執行 `nlm login --clear --force` 來清空快取並重登。

---

## 環境速查表

| 項目             | 值                        |
| :--------------- | :------------------------ |
| AI 分身母資料夾  | `G:\我的雲端硬碟\AI_Agent` |
| 建立日期         | `2026-05-31`            |
| Skills symlink   | ✅ (Junction)             |
| 記憶系統啟用     | ✅                        |

<!-- AI 分身起始助手紀錄:END -->
