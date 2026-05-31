---
title: 'Antigravity 懶人包 #02：連接 GitHub 與部署'
date: '2026-05-31'
type: 懶人包
version: v0.2-antigravity
status: 實作與驗證完成
tags:
  - Antigravity
  - 懶人包
  - GitHub
  - GitHub-Pages
---
# Antigravity 懶人包 #02：連接 GitHub

> 📌 **本懶人包環境已由 AI 自動為您檢查、安裝與配置完成！**
> 您不需要進行額外的登入或下載，本指南作為您未來維護或多裝置部署的備份參考。

---

## 運作原理

**三角關係圖**：

```
Antigravity ←(Git 協定)→ GitHub CLI (gh) ←(SSH/HTTPS 安全連線)→ GitHub 雲端 (GitHub Pages)
```

- **為什麼需要 GitHub CLI (`gh`)？**
  `gh` 是 GitHub 官方的命令列工具，能讓 Antigravity 在不需要手動打開網頁的情況下，直接幫您在 GitHub 上建立 Repo、開啟 GitHub Pages 靜態網站、甚至管理權限。
- **對教學的幫助**：
  只要您在 Antigravity 裡開發好互動網頁、小遊戲或網頁教材，可以透過本機的 Git & GitHub CLI 指令，一鍵自動將專案推送到 GitHub Pages 上線，並直接生成 QR Code 讓學生掃描使用。

---

## 已完成的環境狀態（目前您本機的檢測結果）

- [x] **Git 安裝狀態**：已安裝完成（Git 版本 `2.92.0`）。
- [x] **GitHub CLI 安裝狀態**：已安裝完成。
- [x] **帳號登入授權**：已成功登入您的 GitHub 帳號：**`sshorng`**，並取得完整權限（Scopes：`repo`, `workflow`, `delete_repo`, `gist`）。
- [x] **Git 全域使用者設定**：已成功綁定您的 GitHub 信箱。

---

## 💬 接下來您可以如何對 Antigravity 下指令

由於您的 GitHub 權限與連線已完全打通，您隨時可以在對話中直接要求我處理程式上線：

| 您可以對我說 | 我會自動執行的事 |
|:---|:---|
| **「幫我做一個國文科隨機抽人問答網頁，並推到 GitHub 上線」** | 撰寫 HTML ➔ 建立 GitHub Repo ➔ 上傳推送 ➔ 啟用 Pages ➔ 給您網址與 QR Code |
| **「幫我更新 100_Todo/projects/html/seat.html 網頁內容並發佈」** | 編輯本地 HTML ➔ Git 提交 ➔ Git Push ➔ 網站自動更新上線 |
| **「幫我將這個專案的 GitHub Pages 生成 QR Code」** | 讀取 GitHub Pages 網址 ➔ 本地生成 QR Code 圖片供您下載 |

---

## 🛠️ 多裝置部署與故障排除

如果您在**另一台電腦**上也想使用本 GitHub 連接功能，請依照以下步驟執行：

### 步驟一：安裝 Git 與 GitHub CLI
在 PowerShell 中執行：
```powershell
# 安裝 Git
winget install --id Git.Git --accept-source-agreements --accept-package-agreements
# 安裝 GitHub CLI
winget install --id GitHub.cli --accept-source-agreements --accept-package-agreements
```
*(安裝完成後請重啟編輯器/終端機)*

### 步驟二：登入授權
在終端機中執行：
```bash
gh auth login --web --git-protocol https
```
1. 終端機會顯示一組 8 碼驗證碼（如：`ABCD-1234`）。
2. 瀏覽器會自動開啟，請在網頁輸入此驗證碼並點擊授權（Authorize）。
3. 回到終端機確認狀態：
   ```bash
   gh auth status
   ```
