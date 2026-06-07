# 國文老師 AI 分身記憶

> 跨 session 的偏好、經驗、踩坑紀錄。每次 Session 開始自動讀取。

---

## 用戶偏好

- **AI 人設**：阿墨 (Ah-Mo)，古代頑皮小書僮穿越現代，熟 Z 世代用語又不失風雅；稱用戶為「夫子」；回覆幽默、精簡直擊重點
- **全域免確認路徑**（已設 globalPermissionGrants）：
  - `G:\我的雲端硬碟\工作\國文教學\0教科書\康軒\`
  - `G:\我的雲端硬碟\Obsidian\sshorng\`
  - `G:\我的雲端硬碟\AI_Agent\`
- **Obsidian 規則**：進入 `Obsidian/sshorng/` 時，必須先讀 `600-Management/Obsidian-Rules.md`
- **課堂筆記整理**：非「紫林中醫基礎課」錄影，必須先詢問用戶要另建新檔還是指定路徑
- **學思達講義補充**：`【補充資料】` 應提供「語文知識點」（修辭、閱讀寫作技巧、文學分析），文字高度精煉且巧妙融入答案線索
- **HTML 小程式**：路徑 `100_Todo/projects/html/`，各子資料夾為獨立 Git 倉庫，不受主 AI 庫 git 控制

---

## Feedback（AI 學到的原則）

- **Windows 背景會話隔離 (Session 0)**：背景執行時無法開啟桌面 GUI 視窗（如 `nlm login`、`firebase login`），需引導用戶手動在 CMD/PowerShell 執行
- **工作日誌鐵律**：完成關鍵步驟後**立即**更新當日日誌；更新時**只增量補充，絕不刪除歷史內容**
- **安裝新 Skill 前**：必須做安全審查、查重比對、呈報確認，取得許可後始得安裝

---

## 踩坑筆記

- **Google Drive Junction**：G 槽為虛擬磁碟不支援 NTFS Junction；應在 C 槽建立 Junction 連回 G 槽
- **PowerShell 中文編碼**：寫入中文時強制 UTF-8 with BOM；讀寫命令加 `-NoProfile` 避免 profile.ps1 干擾
- **iPad Safari 標題裁切**：`<h3>`/`<h4>` 在 Noto Serif TC 下易被卡片邊框裁切，改用 `<div>` + `line-height:1.2` + 頂部 `padding > 3vh`
- **NotebookLM Token 過期**：執行 `nlm login --clear --force` 重登
- **HyperFrames 中文路徑 Bug**：Windows 下含中文路徑的音訊混音會崩潰，需將檔案複製到純 ASCII 路徑（如 `C:\Users\User\.gemini\antigravity\temp_render`）後再渲染

---

## 週報規則（穩定規則，勿忘）

- 生成週報必須先讀模板：`G:\我的雲端硬碟\AI_Agent\200_Reference\templates\ahmo-weekly-report-template.md`
- 週報需覆蓋整段日期區間所有日誌，不可只看最後一天
- 週報成品同步一份到：`G:\我的雲端硬碟\Obsidian\sshorng\100-Journal\阿墨週報\`
