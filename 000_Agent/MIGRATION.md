# Antigravity AI 大腦遷移手冊 (Windows / Google Drive 版)

> 本文件由 `sync-assistant` 技能生成，記錄您的 AI 分身大腦跨裝置同步架構。
> 未來換新電腦、或重裝環境時，按照以下步驟操作即可 10 分鐘一鍵接管！

---

## 1. 當前架構

- **大腦母體**：`G:\我的雲端硬碟\Antigravity` (Google 雲端硬碟同步目錄)
- **本機全域設定目錄**：`C:\Users\sshor\.gemini\config\`
- **體檢驗證腳本**：`000_Agent\skills\sync-assistant\scripts\sync-health.ps1`

---

## 2. 當您更換新電腦，如何一鍵接管大腦？

在新電腦上安裝好 Google 雲端硬碟客戶端，且等同步完成後，執行以下 3 個步驟：

### 步驟 A：確保新電腦安裝了 Git 與 Python
- 執行 PowerShell 驗證：
  ```powershell
  git --version; python --version
  ```

### 步驟 B：重新建立新電腦的全域設定軟連結 (Junction)
新電腦的設定檔路徑如果已包含預設檔案，建議先備份。隨後在 PowerShell 中執行以下命令，將 G 槽的技能與設定對接到本機 C 槽中：

1. **連結 Skills 目錄 (免管理員權限)**：
   ```cmd
   cmd.exe /c "mklink /j C:\Users\sshor\.gemini\config\skills G:\我的雲端硬碟\Antigravity\000_Agent\skills"
   ```
2. **連結全域 settings.json 檔案**：
   ```powershell
   New-Item -ItemType SymbolicLink -Path "C:\Users\sshor\.gemini\config\settings.json" -Value "G:\我的雲端硬碟\Antigravity\000_Agent\.gemini\config\settings.json" -Force
   ```
   *(註：若建立 SymbolicLink 提示權限不足，請於 Windows 系統設定中開啟「開發者模式」)*

### 步驟 C：執行體檢驗證
在 PowerShell 中執行以下命令：
```powershell
powershell -ExecutionPolicy Bypass -File "G:\我的雲端硬碟\Antigravity\000_Agent\skills\sync-assistant\scripts\sync-health.ps1"
```
若全數出現綠色 ✅，代表新電腦已順利接管您大腦的所有記憶與技能！

---

## 3. 還原備份

若同步發生衝突或設定受損，您的本機備份存放在以下路徑：
`C:\Users\sshor\antigravity-backup-YYYYMMDD-HHMMSS` (每次執行 /sync 時自動備份一份)

還原方式：
1. 刪除 `C:\Users\sshor\.gemini\config\`。
2. 將備份目錄重新命名搬移至 `C:\Users\sshor\.gemini\config\` 即可。
