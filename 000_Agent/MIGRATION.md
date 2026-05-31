# Antigravity AI 大腦遷移手冊 (Windows / Google Drive 版)

> 本文件由 `sync-assistant` 技能生成，記錄您的 AI 分身大腦跨裝置同步架構。
> 當您換新電腦、或重裝環境時，按照以下步驟操作即可 1 分鐘一鍵接管！

---

## 1. 當前同步架構

- **大腦母體**：`G:\我的雲端硬碟\AI_Agent` (Google 雲端硬碟同步目錄，部分裝置可能路徑名稱不同，以實際目錄為準)
- **本機全域設定目錄**：`C:\Users\<UserName>\.gemini\config\` (動態對應於 `$env:USERPROFILE\.gemini\config`)
- **本機一鍵安裝腳本**：`000_Agent\skills\sync-assistant\scripts\setup-local.ps1`
- **體檢驗證腳本**：`000_Agent\skills\sync-assistant\scripts\sync-health.ps1`

---

## 2. 當您更換新電腦，如何一鍵接管大腦？

在新電腦上安裝好 Google 雲端硬碟客戶端，且等同步完成後，執行以下 3 個步驟：

### 步驟 A：確保新電腦安裝了 Git 與 Python
- 執行 PowerShell 驗證：
  ```powershell
  git --version; python --version
  ```

### 步驟 B：執行一鍵安裝對接腳本
我們已經為您設計了純 ASCII、無亂碼風險的**一鍵安裝對接腳本**，會自動解析您當前電腦的用戶名與大腦根目錄，並自動建立 Windows Junction 與設定檔對接：

打開 PowerShell，切換至大腦目錄，執行以下指令：
```powershell
powershell -ExecutionPolicy Bypass -File "000_Agent\skills\sync-assistant\scripts\setup-local.ps1"
```
*(註：若建立連結時提示權限問題，請於 Windows 系統設定中開啟「開發者模式」)*

### 步驟 C：執行體檢驗證
執行以下命令，確認同步是否全數綠燈：
```powershell
powershell -ExecutionPolicy Bypass -File "000_Agent\skills\sync-assistant\scripts\sync-health.ps1"
```
若全數出現 `[OK]` 與 `SUCCESS`，代表新電腦已順利接管您大腦的所有記憶與技能！

---

## 3. 還原備份

若同步發生衝突或設定受損，您的本機備份存放在以下路徑：
`C:\Users\<UserName>\antigravity-backup-YYYYMMDD-HHMMSS` (每次執行 /sync 重構時自動備份一份)

還原方式：
1. 刪除本機 `C:\Users\<UserName>\.gemini\config\`。
2. 將備份目錄重新命名搬移至 `C:\Users\<UserName>\.gemini\config\` 即可。
