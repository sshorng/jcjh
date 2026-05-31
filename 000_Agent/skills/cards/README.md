# 社群圖卡產生器 by 雷小蒙：不會設計也能一句話出 IG 圖卡

> **ver. 1.0** ｜ **Last edited: 2026-04-18**
> ⭐ 初學者友善｜10 分鐘安裝｜跨平台（macOS / Linux / Windows WSL）
> 丟一篇文章給 AI，它自動拆成一組品牌風格統一的 IG 圖卡，預覽確認後一鍵匯出 2x PNG。

```text
═══════════════════════════════════════════════════════════════
 社群圖卡產生器 by 雷小蒙 · by 雷蒙（Raymond Hou）
───────────────────────────────────────────────────────────────
 Source:      https://cc.lifehacker.tw
 Blog:        https://raymondhouch.com
 Threads:     @raymond0917
 License:     CC BY-NC-SA 4.0 · 個人使用自由；禁止商業用途
═══════════════════════════════════════════════════════════════
```

## 你可能遇過這個問題

你寫了一篇文章、做了一份教學筆記，想分享到 IG。

打開 Canva，光選模板就花了 20 分鐘。調字體、換顏色、對齊圖片，弄了一個多小時，出來的東西還是不滿意——配色不統一、每次做出來都長不一樣。

或者你根本不想碰設計軟體，覺得「我只是想把這段文字變成好看的圖而已，為什麼這麼麻煩」。

**社群圖卡產生器**專治這個問題。你跟 AI 說「幫我把這篇做成圖卡」，它會自動幫你：拆成適合 IG 的一張張圖、套上統一的品牌配色、讓你預覽修改、最後一鍵匯出可以直接發的 PNG。

## 裝完之後你會得到什麼

- **一個 `/cards` 指令** — 說「做圖卡」或 `/cards` 就會觸發
- **2 套品牌配色可選**：
  - 🔵 **藍黑系** — 深色科技感，適合教學、工具介紹
  - 🟠 **橘白系** — 明亮溫暖，適合觀點分享、心得
- **4 種卡片版型**：封面（cover）、純文字（content-text）、文字+圖片（content-image）、結尾呼籲（cta）
- **2 種尺寸**：4:5（1080×1350，IG 最常用）、1:1（1080×1080，IG / X 通用）
- **AI 自動拆卡** — 你只要給內容，AI 判斷要拆幾張、每張放什麼
- **預覽 → 修改 → 匯出** — 先在瀏覽器看完整效果，改到滿意再匯出 2x PNG
- **@handle 記憶** — 第一次設定你的帳號，之後自動帶入

## 資料夾結構

```
social-cards/
├── SKILL.md              ← Skill 主劇本（給 Claude 讀）
├── README.md             ← 你正在看的這份（給人讀）
├── assets/
│   ├── blue-dark/        ← 4 個藍黑系 HTML 模板
│   └── orange-light/     ← 4 個橘白系 HTML 模板
└── scripts/
    └── screenshot.mjs    ← Playwright 截圖腳本
```

## 怎麼安裝？

### 方式 1：直接複製資料夾（推薦）

```bash
# 如果你跑過 pro-kit 01「AI 分身起始助手」
cp -r social-cards/ 000_Agent/skills/cards/

# 或者用 Claude Code 預設位置
cp -r social-cards/ ~/.claude/skills/cards/
```

> [!IMPORTANT]
> 資料夾名稱要改成 `cards`（對應 SKILL.md 裡的 `name: cards`）。

安裝 Playwright（截圖用）：

```bash
cd ~/.claude/skills/cards/
npm init -y
npm install playwright
npx playwright install chromium
```

### 方式 2：貼給 Claude Code 代裝

把整個資料夾 + 本 README 貼給 Claude Code，跟它說：

> 幫我把這個社群圖卡 Skill 裝好

AI 會自動建立資料夾、複製模板、安裝 Playwright、驗證。

### 驗證

重開 Claude Code，打 `/cards` 或跟它說「做圖卡」，應該會啟動引導流程。

## 需要安裝什麼？

| 工具 | 用途 | 怎麼裝 |
|:--|:--|:--|
| **Node.js** | 執行截圖腳本 | 裝 Claude Code 終端機版時已經有了。桌面版用戶如果沒有，跟 AI 說「幫我裝 Node.js」 |
| **Playwright** | 把 HTML 圖卡截圖成 PNG | 見上方「方式 1」的 npm install 指令 |

## 怎麼用？

三種使用方式：

**方式一：給網址**
```
/cards https://你的文章網址.com
```

**方式二：給檔案**
```
/cards 200 Notes/我的讀書筆記.md
```

**方式三：直接打字**
```
做圖卡

（然後貼上你的文字內容）
```

AI 會帶你走完整個流程：選配色 → 選尺寸 → 確認帳號 → 自動拆卡 → 預覽 → 修改 → 匯出 PNG。

## 一次圖卡製作流程大約長這樣

1. 你丟一篇文章給 AI
2. AI 問你：藍黑還是橘白？4:5 還是 1:1？
3. AI 把文章拆成 5-8 張圖卡，列出規劃讓你確認
4. 你說 OK（或調整）
5. AI 生成預覽，在瀏覽器打開給你看
6. 你看完覺得第 3 張文字太長 → 跟 AI 說 → AI 改好 → 重新整理
7. 你說「匯出」→ AI 截圖，幾秒後 PNG 就在資料夾裡了

全程大約 3-5 分鐘，取決於你修改幾次。

## 搭配推薦

> [!TIP]
> 搭配迷你課 **3-2「品牌社群圖卡 & 簡報自動生成」** 一起看，先理解品牌配色與內容密度規則，做出來的圖卡會更專業。

## 授權

- **License**：CC BY-NC-SA 4.0 · 個人使用、學習、分享自由；禁止商業用途
- 出自 雷蒙三十 Starter Kit — cc.lifehacker.tw | CC BY-NC-SA 4.0
- [迷你課](https://lifehacker.tw/courses/24hr-claude-code-tutorial) · [週報](https://raymondhouch.com/subscribe) · [Threads @raymond0917](https://www.threads.com/@raymond0917)
