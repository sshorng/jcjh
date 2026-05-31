---
name: sync-assistant
description: "跨裝置同步引導助手 — 針對 Antigravity 與 Google Drive 環境，進行 10 分鐘互動設定，讓技能與設定成為一鍵遷移的可攜資產。"
---

# 跨裝置同步引導助手（/sync）

把 Antigravity 的核心大腦技能、設定與記憶，變成一鍵遷移的本機可攜資產，並以 Google Drive (雲端硬碟) 進行跨裝置同步。

---

## 執行流程

當使用者輸入 `/sync` 或提及「同步 AI 分身」、「跨裝置同步」時，執行以下步驟：

### Phase 1：偵測前置狀態 (AI 自動執行)

1. **確認起始助手狀態**：
   - 檢查專案目錄下是否有 `000_Agent/` 目錄。
   - 檢查 `ANTIGRAVITY.md` 檔案是否存在。
   - 如果不存在，請引導使用者先執行 `AI 分身起始助手`。
2. **確認全域設定檔路徑**：
   - 全域設定目錄為：`C:\Users\sshor\.gemini\config\`
   - 專案母體目錄為：`G:\我的雲端硬碟\Antigravity\`

### Phase 2：強制備份 (請勿跳過)

在進行任何搬移或軟連結調整前，請為使用者備份現有設定：
```powershell
$backupDir = "$env:USERPROFILE\antigravity-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -Path "C:\Users\sshor\.gemini\config" -Destination $backupDir -Recurse -Force
```
備份完成後主動回報備份目錄位置。

### Phase 3：建立 Google Drive 同步架構

1. **建立母體目錄**：
   - 在 `G:\我的雲端硬碟\Antigravity\000_Agent\.gemini\config\` 下建立備份與同步專用的核心目錄。
2. **搬移核心檔案**：
   - 將 `C:\Users\sshor\.gemini\config\` 下的以下項目**移動**到 Google Drive 母體中：
     - `settings.json` (全域設定)
     - `skills/` (自訂技能，若為 Junction 則忽略)
     - `hooks/` / `commands/` / `agents/` (自訂腳本與子代理)
3. **在 C 槽建立連結指回 Google Drive (Junction/Symlink)**：
   - 使用 Windows Junction (`mklink /j`) 連結目錄，因為這**不需要管理員權限**：
     ```cmd
     cmd.exe /c "mklink /j C:\Users\sshor\.gemini\config\skills G:\我的雲端硬碟\Antigravity\000_Agent\skills"
     ```
   - 若為單一檔案，則使用 PowerShell 建立 SymbolicLink：
     ```powershell
     New-Item -ItemType SymbolicLink -Path "C:\Users\sshor\.gemini\config\settings.json" -Value "G:\我的雲端硬碟\Antigravity\000_Agent\.gemini\config\settings.json" -Force
     ```

### Phase 4：版本控制備份 (Git + GitHub)

1. 詢問使用者是否要為 `G:\我的雲端硬碟\Antigravity\` 建立一層 GitHub 私有儲存庫作為雙重保險。
2. 寫入 `.gitignore`，確保敏感數據（如 `MEMORY.md`、草稿或個人 API 金鑰）不會被誤推上網。

### Phase 5：部署體檢腳本與遷移手冊

1. 建立 PowerShell 體檢腳本 `000_Agent/scripts/sync-health.ps1`。
2. 在專案中生成 `000_Agent/MIGRATION.md` 大腦遷移說明書。
