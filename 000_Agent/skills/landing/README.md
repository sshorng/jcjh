# 引導式 Landing Page 生成 by 雷小蒙：問完問題直接生出銷售頁（`/landing`）

> **ver. 1.0** ｜ **Last edited: 2026-04-18**
> ⭐ 初學者友善｜一次 20-30 分鐘｜適用活動／線上課／數位產品三種銷售頁
> 安裝後 Claude Code 多一個 `/landing` 指令：一次問一個問題、依品牌調性挑設計風格、自動生 HTML 並在瀏覽器打開。

```text
═══════════════════════════════════════════════════════════════
 引導式 Landing Page 生成 by 雷小蒙 · by 雷蒙（Raymond Hou）
───────────────────────────────────────────────────────────────
 Source:      https://cc.lifehacker.tw
 Blog:        https://raymondhouch.com
 Threads:     @raymond0917
 License:     CC BY-NC-SA 4.0 · 個人使用自由；禁止商業用途
───────────────────────────────────────────────────────────────
 依賴：UI UX Pro Max（UUPM）
       https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
       安裝過程會引導學員一起裝。
═══════════════════════════════════════════════════════════════
```

## 你可能遇過這三個問題

你想幫自己的課 / 服務 / 數位商品做一個 landing page：

1. **「叫 AI 隨便做一個，結果很醜」** — 藍紫漸層、2015 年感的圓角按鈕、中英文字體不對齊，AI 強項是填空，不是從無到有做決策。
2. **「寫銷售文案時腦袋一片空白」** — 你知道產品好在哪，但要寫成 hero / 痛點 / FAQ 就卡住。文案結構、好壞範例都要自己去查。
3. **「做完發現完全不像我的品牌」** — 色票、字體、整個調性跟你的 IG / 部落格不一致，因為沒人告訴 AI 你的品牌長什麼樣。

**引導式 Landing Page 生成** 就是專治這三個問題的。一次只問你一題、每題附好壞範例、卡住可以說「幫我生」、最後整合 UI UX Pro Max 挑產業對齊的設計系統，讓做出來的頁面看起來像同產業頂尖網站，不像 AI 隨便拼的。

## 裝完之後你會得到什麼

- **一個 `/landing` 指令** — 在 Claude Code 輸入就啟動引導流程
- **17 題結構化問答** — A 產品定位（4 題）、B 內容填入（10 題）、C 倒數與 CTA（3-4 題）
- **每題都有好 / 壞範例** — 不用猜要寫什麼
- **卡住可以「幫我生 3 個」** — AI 根據前面答案生初稿讓你挑
- **UUPM 設計系統整合** — 自動挑產業對齊的字體、顏色、風格
- **11 區塊完整頁面** — Hero / Hook / About / Learn / 見證（可選）/ 受眾 / 資訊 / 價格 / CTA / 講師 / FAQ
- **倒數計時器（可選）** — Hero 大型 + 底部 sticky CTA bar，滾過 Hero 才跳出
- **自動開啟預覽** — 生完 HTML 自動 `open` 在瀏覽器，不用手動點開
- **可重跑** — 改文案用 `/landing --restyle {slug}`（讀 `answers.json` 不用從頭答）

## 雷蒙的經驗：為什麼需要這個 skill

我做過無數張銷售頁，雷蒙三十、課程、產品、活動。每次的流程都是：
1. 寫文案 → 2. 找範本 → 3. 調 CSS → 4. 重寫文案因為結構不合 → 5. 再調 CSS → 6. 心累

後來發現：**好的銷售頁有固定結構**。痛點 → 介紹 → 收穫 → 適合誰 → 資訊 → 價格 → CTA → FAQ。每個 section 要問的問題、好壞範例是什麼，都可以標準化。

那為什麼不做一個 skill，把這套流程交給 AI 執行？

於是有了 `/landing`。每次要做新頁面，跑一次，30 分鐘完成初稿，剩下的時間就拿去磨文案和替換真實素材。

## 什麼時候該用 `/landing`？

| 情境 | 要不要用？ | 原因 |
|:--|:--|:--|
| 新產品 / 課程 / 服務要銷售頁 | **一定要用** | 最能發揮引導式問答的價值 |
| 既有頁面改版 | **建議用** | 重跑一次比手動改結構快 |
| Waitlist / coming soon 頁 | 不建議 | 內容太少、17 題會撐不起來 |
| 作品集 / portfolio | 不適合 | 結構不一樣 |
| 部落格文章頁 | 不適合 | 不是銷售頁 |

**簡單判斷法**：如果頁面要做的事是「讓別人報名 / 購買 / 訂閱」，用 `/landing`。

## 資料夾結構

```
landing-page/
├── SKILL.md                            ← Skill 主劇本（給 Claude 讀）
├── README.md                           ← 你正在看的這份（給人讀）
├── references/
│   ├── question-bank.md                ← 17 題完整題庫（含好/壞範例）
│   ├── uupm-integration.md             ← UUPM 整合流程
│   └── fallback-design-rules.md        ← 未裝 UUPM 時的設計鐵律
└── templates/
    ├── base.html                       ← 11 區塊 HTML 骨架
    └── countdown.js                    ← 倒數計時 JS
```

## 怎麼安裝？

### 前置：先裝 UUPM（強烈建議，但非必要）

```bash
npm install -g uipro-cli
uipro init --ai claude --global
```

> [!TIP]
> UUPM（UI UX Pro Max）是產業級設計系統工具，未裝也能跑 `/landing`（會 fallback 到 Claude 自生設計），但裝了能大幅提升頁面質感。沒裝時 Skill 第一次跑會引導你安裝。

### 方式 1：直接複製資料夾（推薦）

```bash
# 如果你跑過 pro-kit 01「AI 分身起始助手」
cp -r landing-page/ 000_Agent/skills/landing/

# 或者用 Claude Code 預設位置
cp -r landing-page/ ~/.claude/skills/landing/
```

> [!IMPORTANT]
> 資料夾名稱要改成 `landing`（對應 SKILL.md 裡的 `name: landing`）。

### 方式 2：貼給 Claude Code 代裝

把整個資料夾 + 本 README 貼給 Claude Code，跟它說：

> 幫我把這個 landing page Skill 裝好

AI 會自動偵測環境、複製檔案、（可選）引導安裝 UUPM。

### 驗證

重開 Claude Code，打 `/landing`，應該會啟動 17 題引導問答。

## 怎麼用？

```
/landing
```

AI 會先問你是哪一種銷售頁（實體活動 / 線上課 / 數位產品），接著一題一題引導你填內容。大約 20-30 分鐘後，瀏覽器會自動打開你的銷售頁。

**改文案重跑**：

```
/landing --restyle my-product-slug
```

會讀既有的 `answers.json` 不用從頭答。

## 搭配推薦

> [!TIP]
> 搭配迷你課 **3-5「做一個自己的品牌 Landing Page」** 一起看，先理解銷售頁的固定結構（痛點 → 介紹 → 收穫 → FAQ），再用這個 Skill 落地。

## 授權

- **License**：CC BY-NC-SA 4.0 · 個人使用、學習、分享自由；禁止商業用途
- 出自 雷蒙三十 Starter Kit — cc.lifehacker.tw | CC BY-NC-SA 4.0
- [迷你課](https://lifehacker.tw/courses/24hr-claude-code-tutorial) · [週報](https://raymondhouch.com/subscribe) · [Threads @raymond0917](https://www.threads.com/@raymond0917)
