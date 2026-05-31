---
title: 'Antigravity 懶人包 #04.5：連接 Firebase 資料庫'
date: '2026-05-31'
type: 懶人包
version: v0.7-antigravity
status: 配置完成（待登入）
tags:
  - Antigravity
  - 懶人包
  - Firebase
  - Firestore
  - MCP
---
# Antigravity 懶人包 #04.5：連接 Google Firebase 資料庫

> 📌 **本懶人包環境已由 AI 自動為您配置大半！**
> 由於登入必須在您的本機互動式視窗執行，請按照下方步驟完成登入後，即可啟用。

---

## 運作原理

**三角關係圖**：

```
Antigravity ←(MCP 協定)→ npx.cmd firebase-tools mcp (翻譯官) ←(雲端連線)→ Cloud Firestore
```

- **為什麼使用 Firebase？**
  - **不會閒置暫停**：比起 Supabase 7 天沒用會被暫停，Firebase 永遠不會暫停。
  - **並發高**：免費版支援 100 萬人同時連線，適合課堂或大型研習 IRS。
  - **即時更新**：配合 `onSnapshot` 能輕易做出即時投票、文字雲等工具。

---

## 已完成的配置

- [x] **環境檢查**：Node.js (v22.17.0) 與 `npx.cmd` 皆已就緒。
- [x] **配置 MCP 連線**：已將 Firebase MCP 伺服器寫入您的設定檔 `mcp_config.json`。

---

## 🖐️ 您需要手動執行的最後步驟

因為安全性限制，AI 無法在背景幫您登入 Google 帳號。請您在您的本機電腦上執行登入：

### 步驟一：開啟您的 PowerShell 或 CMD 視窗

### 步驟二：執行登入指令
在您的終端機視窗中貼上並執行以下指令：
```bash
npx firebase-tools login
```
*（這會自動打開您的瀏覽器，請登入您的 Google 帳號並點擊授權授權）*

### 步驟三：回到本對話通知我
當您在瀏覽器看到「✔ Success! Logged in as ...」後，請回到此對話告訴我：**「我登入好了！」**

---

## 💬 登入成功後，您可以這樣使用

重啟 Antigravity 後，即可直接用自然語言操控 Firebase：

| 您可以對我說 | 我會自動執行的事 |
|:---|:---|
| **「幫我列出目前 Firebase 的所有專案」** | 呼叫 `firebase_list_projects` |
| **「幫我建立一個名為 wordcloud_words 的 Firestore 集合」** | 呼叫 `firestore_add_document` 初始化集合 |
| **「查詢 test_collection 集合裡的所有文件」** | 呼叫 `firestore_query_collection` 取得資料 |
