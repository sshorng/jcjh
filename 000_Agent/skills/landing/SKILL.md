---
name: landing
version: 1.0.0
description: |
  引導式銷售頁生成 — 問完 17 題（A 產品定位 4 題、B 內容填入 10 題、C 倒數與 CTA 3-4 題）後產出完整 HTML + Tailwind + 可選倒數計時，覆蓋活動／線上課／數位產品三種銷售頁。整合 UI UX Pro Max (UUPM) 產業級設計系統；UUPM 未裝時 fallback 成 Claude 直接生成。觸發時機：(1) 學員說「做銷售頁」「/landing」「幫我做 landing page」「sales page」, (2) 學員要為新產品／課程／活動產出銷售頁, (3) 需要改版既有頁面（可讀 answers.json 不從頭答）。
user-invocable: true
last-updated: 2026-04-18
author: Raymond Hou
tags:
  - landing-page
  - sales-page
  - copywriting
  - web-design
---

# Landing — 引導式銷售頁生成

引導式銷售頁生成工具。結構、倒數、引導流程由這個 skill 負責；設計系統外包給 UUPM（未裝時 fallback）。

> **執行需求：** 需要能執行 Bash 的環境（Claude Code 內建；Claude Desktop 需配 shell MCP）。

## 使用流程總覽

```
Step 1: 引導式問答（3 階段）
   ↓
Step 2: 設計系統處理（UUPM 或 fallback）
   ↓
Step 3: 呈現 2-3 風格選項
   ↓
Step 4: 生成 HTML
   ↓
Step 5: 輸出到 generated-pages/{slug}/
```

## Step 1：引導式問答

### 重要原則：不要引用對話外的 context

在 /landing 流程內，**只用使用者此刻輸入的答案**，不要引用：
- 對話歷史（之前的話題、專案）
- 記憶系統（MEMORY.md、persona）
- 任何既有專案資料夾的內容

**為什麼：** 每個使用者的 context 不同，skill 行為要一致。就算你自己熟這個領域，也假裝從零填答，確保出來的頁面是使用者答案驅動，不是 AI 腦補的。

**錯誤示範：** 「聽起來是 [[超級個體工作術]] 對吧？」（引用了記憶）
**正確示範：** 純粹根據 A1+A2 內容判斷產業，不問「這是 X 課程嗎？」

**讀題目詳細內容：** `references/question-bank.md`

三階段：
- **A. 產品定位（4 題）** — 產品類型、產業、品牌調性、slug
- **B. 內容填入（10 題）** — Hero / Hook / About / Learn / Testimonials(選)/ Audience / Info / Pricing / FAQ / Speaker
- **C. 倒數與 CTA（3-4 題）** — 先問要不要倒數、再問細節、CTA 文字

### 問題呈現原則

每題都要顯示：
- 問題本身
- 💡 好／壞範例（guardrails）
- 🎯 答題欄位
- 💬 特殊指令：`skip`（可選題）、`幫我生 3 個`（AI 代生）

### 可選區塊先問 Y/N

- **B5a** — 要不要放學員見證？N 就跳過 B5b
- **C0** — 要不要倒數計時？N 就跳過 C1-C2

### 熟練模式（快速通道）

如果使用者說「我全部貼一次」，跳過 guardrail 展示，直接收完整文案後一次分類。

### 收集答案

所有答案最後存到 `generated-pages/{slug}/answers.json`，格式：

```json
{
  "product": { "type": "...", "industry": "...", "tone": ["...", "..."], "slug": "..." },
  "content": {
    "hero": { "title": "...", "subtitle": "..." },
    "hook": "...",
    "about": "...",
    "learn": ["...", "..."],
    "testimonials": [{ "name": "...", "quote": "...", "role": "..." }],
    "audience": { "fit": ["..."], "unfit": ["..."] },
    "info": [{ "label": "...", "value": "..." }],
    "pricing": [{ "plan": "...", "price": "...", "note": "..." }],
    "faq": [{ "q": "...", "a": "..." }],
    "speaker": { "name": "...", "bio": ["..."], "photo": "..." }
  },
  "countdown": {
    "enabled": true,
    "deadline": "2026-04-30T23:59:00+08:00",
    "onZero": "ended-state"
  },
  "cta": { "text": "立即報名", "href": "#" }
}
```

## Step 1.5：偵測 DESIGN.md

在進入設計系統之前，先檢查使用者是否已經有品牌設計規範：

```bash
# 依優先順序搜尋 DESIGN.md
DESIGN_FILE=""
for f in \
  "$PROJECT_ROOT/DESIGN.md" \
  "$PROJECT_ROOT/design.md" \
  "$PROJECT_ROOT/.claude/DESIGN.md" \
  "$HOME/.claude/DESIGN.md"; do
  if [ -f "$f" ]; then
    DESIGN_FILE="$f"
    break
  fi
done
```

### 有 DESIGN.md → 直接套用

如果找到 DESIGN.md，讀取其中的品牌色、字體、風格規則，直接作為設計系統：

1. 解析 DESIGN.md 的 colors、typography、style 段落
2. 跟使用者確認：「我找到你的 DESIGN.md，品牌色是 `#XXX`、字體是 `XXX`，要用這份設定嗎？」
3. 使用者確認 → **跳過 Step 2 和 Step 3**，直接進 Step 4 生成 HTML
4. 使用者說「不要」→ 正常進 Step 2

### 沒有 DESIGN.md → 正常進 Step 2

走 UUPM 或 fallback 流程。

> **為什麼要加這步：** 3-2 教學員建立 DESIGN.md，如果 `/landing` 不讀它，等於學員做了品牌規範卻用不上，體驗斷裂。一份 DESIGN.md 應該驅動圖卡、簡報、銷售頁，所有視覺產出。

---

## Step 2：設計系統處理（無 DESIGN.md 時才執行）

**讀詳細流程：** `references/uupm-integration.md`

### 偵測 UUPM

```bash
test -d ~/.claude/skills/ui-ux-pro-max || \
test -d "$PROJECT_ROOT/.claude/skills/ui-ux-pro-max" || \
command -v uipro
```

任一通過 → 已裝，進 UUPM 模式。
都沒通過 → 跳出說服訊息（見 `references/uupm-integration.md` 的推銷文案）。

### 未裝時的分支處理

| 使用者回應 | 處理 |
|:-----|:-----|
| `y` / `是` / `好` | 直接跑 `npm install -g uipro-cli && uipro init --ai claude --global`，裝完繼續 Step 3 |
| `n` / `不要` / `之後` | 走 Fallback 模式（見 `references/fallback-design-rules.md`） |
| 安裝失敗 | 顯示錯誤 + 問要不要 fallback 繼續 |

### UUPM 模式：呼叫生設計系統

用 A 階段答案組 query：

```bash
query="<A2 產業> <A3 調性關鍵字>"
slug="<A4>"

python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py \
  "$query" \
  --design-system \
  --persist \
  -p "$slug" \
  -f markdown
```

結果在 `design-system/MASTER.md`。讀進來解析 colors、typography、pattern、anti-patterns。

## Step 3：呈現風格選項

### UUPM 模式

從 UUPM 推薦的 pattern 當主推，再從其他 7 種 Landing Page Styles 挑 2 個相容但不同感的，湊成 3 選 1：

例如 UUPM 推薦 `Hero-Centric + Social Proof`，就再挑 `Conversion-Optimized` 和 `Trust & Authority` 當對照。

每個風格用 `<div class="cards">` 渲染成迷你預覽卡（參考 visual companion 的 UI），讓使用者挑。

### Fallback 模式

Claude 自己生 2 個方向（簡約 vs 活潑），各配一套 color + typography + spacing rules。使用者挑一個。

## Step 4：生成 HTML

**讀骨架：** `templates/base.html`
**讀倒數 JS：** `templates/countdown.js`

### 組裝邏輯

1. 讀 `templates/base.html`
2. 條件渲染：
   - `{{#if countdown.enabled}}` → 保留 Hero 大型倒數 + 底部 sticky；否則刪掉這兩個區塊
   - `{{#if testimonials}}` → 保留 testimonials section；否則刪掉
3. 填入 `answers.json` 內容
4. 注入設計 tokens 到 `<style>`（UUPM 模式讀 MASTER.md，Fallback 用三條鐵律自生）
5. 注入 countdown.js（只在 enabled 時）

### Nav（必要、sticky top）

Nav 是固定配置，每次生成都要放：
- Brand：左側，短名稱（從 A4 slug 推，或直接用產品類型英文簡寫）
- Section links：中間，跳到 About / Learn / Audience / Pricing / Speaker / FAQ（可選區塊不要放連結）
- Register CTA：右側，短版本（「報名」、「搶購」）
- Sticky on scroll，滾動時加陰影（JS toggle `.scrolled`）
- 手機版 links 隱藏（< 860px）

**必須提供的資料**（從 answers.json 推算）：
```json
"nav": {
  "brandText": "AI Solo Workshop",
  "linkAbout": "工作坊",
  "linkLearn": "你會帶走",
  "linkAudience": "適合誰",
  "linkPricing": "方案",
  "linkSpeaker": "帶領者",
  "linkFaq": "FAQ",
  "ctaShort": "報名"
}
```

依設計風格，nav 的樣式會跟著 design system 變（字體、顏色、分隔線風格），但結構和連結一樣。

### HTML 單檔策略

- Tailwind 用 CDN：`<script src="https://cdn.tailwindcss.com"></script>`
- CSS 內嵌 `<style>`
- JS 內嵌 `<script>`
- 圖片用 URL（學員自己提供）

這樣學員複製貼到 Framer / Notion / CMS 最方便。

## Step 5：輸出

寫入 `generated-pages/{slug}/`：

```
generated-pages/
└── {slug}/
    ├── index.html
    ├── design-system.md    # UUPM 模式才有
    └── answers.json
```

### 寫檔後直接幫使用者開啟（不要叫他自己開）

Windows PowerShell 執行：
```powershell
Start-Process "generated-pages/{slug}/index.html"
```

會用預設瀏覽器打開。

最後輸出給學員的訊息：

```
✅ 銷售頁生成完成，已在瀏覽器打開！

📁 檔案位置：
   generated-pages/{slug}/index.html

✏️ 要改文案？直接編輯 HTML，或跑 /landing 重新填答（會讀 answers.json）
```

## 錯誤處理

| 情況 | 行為 |
|:-----|:-----|
| npm 權限錯誤 | 提示 `! sudo npm install -g uipro-cli`，學員手動跑 |
| npm 不存在 | 提示裝 Node.js（Homebrew / nvm） |
| Python3 不存在 | 提示 `brew install python3` |
| UUPM search.py 失敗 | log 錯誤 + 自動 fallback |
| Bash 工具不可用 | catch 錯誤、fallback 成顯示手動指令 |
| slug 已存在同名資料夾 | 詢問：覆蓋／加時間戳／另取名 |

## 不做（Out of Scope）

- 訂閱制 / 會員頁、服務諮詢頁
- 保證 / 退款區塊
- 多語系（目前只繁中）
- 表單整合（付款、訂閱），CTA 只是 link
- 實際部署
- `on-zero: new-price` 行為

## 觸發詞

`/landing`、「做銷售頁」、「幫我做 landing page」、「sales page」