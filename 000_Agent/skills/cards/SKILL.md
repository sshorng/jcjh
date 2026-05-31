---
name: cards
version: 1.0.0
description: |
  社群圖卡產生器 — 把文章、筆記或任何文字內容轉成品牌風格 IG 圖卡（藍黑系 / 橘白系，4:5 或 1:1），AI 自動拆卡、預覽、匯出 2x PNG。觸發時機：(1) 學員說「做圖卡」「/cards」「幫我做 IG 圖」「社群圖卡」「把這篇做成圖卡」, (2) 學員丟一段文字、檔案路徑、或文章網址要轉成社群圖, (3) 想為 IG / Threads / X 產出品牌風格統一的圖卡。
user-invocable: true
last-updated: 2026-04-18
author: Raymond Hou
tags:
  - social-media
  - instagram
  - design
  - image-generation
---

# 社群圖卡產生器

把任何文字內容轉成品牌風格統一的 IG 圖卡。
2 套配色（藍黑系 / 橘白系）× 4 種版型（cover / content-text / content-image / cta）。

## 觸發條件

- 「做圖卡」
- 「/cards」
- 「幫我做 IG 圖」
- 「社群圖卡」
- 「把這篇做成圖卡」

## 模板位置

模板 HTML 檔案在 skill 的 `assets/` 子資料夾：

- `assets/blue-dark/cover.html`
- `assets/blue-dark/content-text.html`
- `assets/blue-dark/content-image.html`
- `assets/blue-dark/cta.html`
- `assets/orange-light/cover.html`
- `assets/orange-light/content-text.html`
- `assets/orange-light/content-image.html`
- `assets/orange-light/cta.html`

## 輸出位置

`output/YYYY-MM-DD-{主題簡稱}/`（在當前工作目錄下建立）

## 流程

### Step 1：收集內容

問用戶內容來源：

> 你想做什麼內容的圖卡？
> 1. 貼一段文字給我
> 2. 給我一個網址（我會自動抓取內容）
> 3. 給我一個 Markdown 檔案路徑

如果是網址，用 Firecrawl 或 WebFetch 抓取。如果是檔案路徑，直接讀取。

### Step 2：選配色

用 AskUserQuestion：

> 1. 🔵 藍黑系 — 深色科技感
> 2. 🟠 橘白系 — 明亮溫暖

### Step 3：選尺寸

> 1. 4:5（1080×1350）
> 2. 1:1（1080×1080）

如果選 1:1，生成 HTML 時把 `.card` 的 height 改為 1080px。

### Step 4：確認 @handle

如果 `output/.handle` 存在，讀取並確認。否則詢問用戶。

### Step 5：拆解內容為卡片

1. 第 1 張一定是 cover
2. 中間是 content 卡，每張一個重點
3. 最後一張一定是 cta

**content-text vs content-image 判斷：**
- 提到程式碼、UI、設定檔、流程圖 → 建議 content-image
- 用戶主動提供圖片 → content-image
- 其他 → content-text

**內容密度規則：**
- 標題最多 10 字
- 內文最多 3-4 行
- 條列最多 4 個，每個不超過 25 字
- 寧可多拆，也不要塞太滿

### Step 6：展示卡片規劃，等用戶確認

列出完整規劃，標示哪張建議放圖，等用戶確認才往下。

### Step 7：生成預覽 HTML 並開啟瀏覽器

1. 讀取對應模板 HTML（從 `assets/{配色}/{版型}.html`）
2. 替換 placeholder：標題、內文、@handle、頁碼、圖片路徑
3. 如果用戶提供截圖，直接存到 output 資料夾並用絕對路徑嵌入 `<img>`
4. 圖片用 `object-fit: contain; width: 100%; height: auto;` 確保等比完整顯示
5. 寫成暫存 HTML 到 `output/YYYY-MM-DD-{主題}/`
6. 建立 preview.html 總覽頁（iframe scale 縮小），用瀏覽器打開

### Step 8：用戶確認 & 修改循環

> 預覽已經在瀏覽器打開了，看看有沒有要調整的地方？確認 OK 就跟我說「匯出」。

可以來回修改多次，只改有變動的那張。

### Step 9：匯出 2x PNG

用戶確認後才執行：

1. 確認 Playwright 已安裝（沒有就跑 `npx playwright install chromium`）
2. 用 `scripts/screenshot.mjs` 截圖（deviceScaleFactor: 2）
3. 等 Google Fonts 載入（waitForTimeout 2500ms）
4. 刪除 HTML 暫存檔和 preview.html，只留 PNG

執行指令範例：
```bash
node "{SKILL_DIR}/scripts/screenshot.mjs" "output/YYYY-MM-DD-{主題}/"
```

### Step 10：完成

告知用戶 PNG 位置，問要不要推上 GitHub。

## @handle 記憶

首次使用存到 `output/.handle`，之後自動讀取。

## 注意事項

- 保持模板 CSS 結構不變，只替換文字和圖片
- 圖片用絕對路徑
- 頁碼格式 `N / 總數`（cover 和 cta 不放頁碼）
- 預覽階段不產出 PNG
- 匯出後不留 HTML 中間檔
