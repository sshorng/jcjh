---
title: 'Antigravity 懶人包 #01：連接 NotebookLM'
date: '2026-05-31'
type: 懶人包
version: v0.2-antigravity
status: 實作完成
tags:
  - Antigravity
  - 懶人包
  - NotebookLM
  - MCP
---
# Antigravity 懶人包 #01：連接 Google NotebookLM

> 📌 **本懶人包已由 AI 自動為您實作安裝完成！**
> 本文件作為您的本機與跨裝置備份參考指南。

---

## 運作原理

**三角關係圖**：

```
Antigravity ←(MCP 協定)→ nlm (翻譯官) ←(Google 登入)→ NotebookLM
```

- **為什麼需要翻譯官？**
  NotebookLM 沒有官方 API。`nlm`（由 `notebooklm-mcp-cli` 提供）是用「模擬瀏覽器操作」的方式去操作 NotebookLM 網頁。
- **全域 MCP 配置**：
  已將本機驅動連結寫入您的 `C:\Users\sshor\.gemini\antigravity\mcp_config.json` 中，並指向絕對路徑 `C:/Users/sshor/.local/bin/notebooklm-mcp.exe`，確保跨裝置與路徑尋找的穩定性。

---

## 已完成的環境安裝與配置

- [x] **安裝套件管理工具**：已安裝 `uv`。
- [x] **安裝 NotebookLM MCP CLI**：已透過 `uv` 安裝 `notebooklm-mcp-cli`。
- [x] **Google 帳號授權登入**：已成功登入並取得授權認證（登入帳號：`sshorng@gmail.com`）。
- [x] **配置 Antigravity MCP**：已設定完成，指令指向實體 `C:/Users/sshor/.local/bin/notebooklm-mcp.exe`。
- [x] **建立雲端儲存路徑**：已在您的 Google 雲端硬碟工作區建立對應的存放目錄：
  `G:\我的雲端硬碟\AI_Agent\100_Todo\projects\NotebookLM\`

---

## 📂 本地資料夾存放結構

所有從 NotebookLM 匯出的成品，將會被儲存在以下目錄中：

- 📂 [slides/ (簡報/pptx)](file:///G:/%E6%88%91%E7%9A%84%E9%9B%B2%E7%AB%AF%E7%A1%AC%E7%A2%9F/AI_Agent/100_Todo/projects/NotebookLM/slides/)
- 📂 [infographics/ (資訊圖表)](file:///G:/%E6%88%91%E7%9A%84%E9%9B%B2%E7%AB%AF%E7%A1%AC%E7%A2%9F/AI_Agent/100_Todo/projects/NotebookLM/infographics/)
- 📂 [audio/ (音訊/Podcast)](file:///G:/%E6%88%91%E7%9A%84%E9%9B%B2%E7%AB%AF%E7%A1%AC%E7%A2%9F/AI_Agent/100_Todo/projects/NotebookLM/audio/)
- 📂 [video/ (影片概覽)](file:///G:/%E6%88%91%E7%9A%84%E9%9B%B2%E7%AB%AF%E7%A1%AC%E7%A2%9F/AI_Agent/100_Todo/projects/NotebookLM/video/)
- 📂 [docs/ (Google 文件匯出)](file:///G:/%E6%88%91%E7%9A%84%E9%9B%B2%E7%AB%AF%E7%A1%AC%E7%A2%9F/AI_Agent/100_Todo/projects/NotebookLM/docs/)
- 📂 [sheets/ (試算表/表格)](file:///G:/%E6%88%91%E7%9A%84%E9%9B%B2%E7%AB%AF%E7%A1%AC%E7%A2%9F/AI_Agent/100_Todo/projects/NotebookLM/sheets/)
- 📂 [mindmaps/ (心智圖)](file:///G:/%E6%88%91%E7%9A%84%E9%9B%B2%E7%AB%AF%E7%A1%AC%E7%A2%9F/AI_Agent/100_Todo/projects/NotebookLM/mindmaps/)
- 📂 [quizzes/ (測驗題與閃卡)](file:///G:/%E6%88%91%E7%9A%84%E9%9B%B2%E7%AB%AF%E7%A1%AC%E7%A2%9F/AI_Agent/100_Todo/projects/NotebookLM/quizzes/)

---

## 💬 接下來您可以如何對 Antigravity 下指令

當您**重啟 Antigravity 編輯器或對話終端**後，MCP 便會正式載入，您可以直接在對話中輸入以下類似語句來操控 NotebookLM：

| 您可以直接對我說 | 我會自動執行的事 | 成品儲存位置 |
|:---|:---|:---|
| **「幫我將 G:\我的雲端硬碟\工作\國文教學\康軒\第七課.md 匯入 NotebookLM 並建一個新的筆記本」** | 建立 Notebook 並自動上傳該課文作為來源 | — |
| **「幫我針對目前的課文產生一份教學簡報」** | 連線 NotebookLM 生成 Slide Deck | `slides/` |
| **「幫我做一張課文結構的資訊圖表」** | 連線 NotebookLM 生成多風格圖表 | `infographics/` |
| **「幫我針對這個單元產生雙人語音對話播客（Podcast）」** | 連線 NotebookLM 生成 Audio Overview | `audio/` |
| **「幫我把這課的重點出一套測驗題」** | 連線 NotebookLM 生成 Quiz / Flashcards | `quizzes/` |

---

## 🛠️ 常見維護與故障排除

### 1. 登入過期如何重新認證？
若日後出現 `nlm` 授權過期無法連線，請在您的命令提示字元或終端機執行：
```bash
# 使用本機路徑執行登入
C:\Users\sshor\.local\bin\nlm.exe login
```
登入成功後，可執行 `doctor` 確認狀態：
```bash
C:\Users\sshor\.local\bin\nlm.exe doctor
```

### 2. 多裝置同步
由於您的 `mcp_config.json` 位於 C 槽的本機路徑，若您在**另一台電腦**上使用 Antigravity：
1. 確保該電腦也已安裝 `uv` 與 `notebooklm-mcp-cli`。
2. 執行 `C:\Users\sshor\.local\bin\nlm.exe setup add antigravity`。
3. 執行 `nlm login` 完成該電腦的 Google 帳號登入授權即可。
