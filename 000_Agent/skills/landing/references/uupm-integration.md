# UUPM Integration — 偵測、安裝、呼叫、解析

## 1. 偵測是否已裝

階段 A 問完、進 Step 2 時先執行：

```bash
if [ -d ~/.claude/skills/ui-ux-pro-max ] || \
   [ -d "$(pwd)/.claude/skills/ui-ux-pro-max" ] || \
   command -v uipro >/dev/null 2>&1; then
  echo "INSTALLED"
else
  echo "NOT_INSTALLED"
fi
```

## 2. 未裝時的說服訊息

原樣輸出給使用者：

```
🎨 建議先裝 UI UX Pro Max（選做，但強烈推薦）

這個 skill 有：
  • 161 條產業級設計規則（anti-pattern 過濾）
  • 8 種 landing page 結構風格
  • 57 組字體配對、161 組色票

沒裝：我可以直接生，但沒有產業對齊、沒有 anti-pattern 防護。
裝了：你的銷售頁看起來會像同產業頂尖網站。

要我幫你裝嗎？(y / n / 之後再說)
```

## 3. 使用者回 y 時的自動安裝

**一次跑完、不要分兩步**：

```bash
npm install -g uipro-cli && \
uipro init --ai claude --global && \
test -d ~/.claude/skills/ui-ux-pro-max && echo "✅ 安裝完成"
```

安裝時 stream 進度給使用者看（Bash 的 stdout 即時顯示）。裝完自動回來繼續 Step 2 的 UUPM 呼叫。

### 權限錯誤時

如果看到 `EACCES`／`Permission denied`，告訴使用者：

```
⚠️ npm 需要管理員權限。請在輸入欄打這段（開頭一個驚嘆號 ! 讓 terminal 跑）：

  ! sudo npm install -g uipro-cli

完成後對我說「裝好了」我會繼續。
```

### npm 不存在時

```
⚠️ 你的環境沒有 Node.js／npm。先裝：

  macOS:   brew install node
  其他:    https://nodejs.org/（LTS 版）

裝好後重跑 /landing。
```

### Python3 不存在時（uipro 執行時需要）

```
⚠️ UUPM 需要 Python3：

  macOS:   brew install python3
  Ubuntu:  sudo apt install python3
  Windows: winget install Python.Python.3.12

裝好後對我說「裝好了」。
```

## 4. 呼叫 UUPM 生 design system

用 A 階段答案組 query，然後呼叫：

```bash
# A2 = "productivity notion online course education"
# A3 = "沉穩 親和 專業"
# A4 = "notion-one-day"

QUERY="productivity notion online course education calm professional"
SLUG="notion-one-day"

python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py \
  "$QUERY" \
  --design-system \
  --persist \
  -p "$SLUG" \
  -f markdown
```

輸出會寫到 `design-system/MASTER.md`（在當前工作目錄）。

## 5. 解析 MASTER.md

UUPM 的 MASTER.md 會有類似這樣的結構（v2.0）：

```markdown
# Design System for {{ProductName}}

## Pattern
Hero-Centric + Social Proof

## Colors
Primary: #21A4B1 (Teal)
Secondary: #A8D5BA (Sage Green)
CTA: #D4AF37 (Gold)
Background: #FFF5F5 (Warm White)
Text: #2D3436 (Charcoal)

## Typography
Headline: Cormorant Garamond
Body: Montserrat

## Effects
Soft shadows, transitions 200-300ms

## Anti-Patterns (AVOID)
- Bright neon colors
- AI purple/pink gradients

## Pre-Delivery Checklist
- [ ] cursor-pointer on clickable
- [ ] Hover states with transitions (150-300ms)
- [ ] Light mode text contrast 4.5:1
- ...
```

**抽取規則**：用 markdown header 切區塊，每區塊抓 bullet／key-value。解析失敗就 fallback。

## 6. 把 UUPM 輸出轉成 CSS vars

插進最終 HTML 的 `<style>` 區塊：

```css
:root {
  --color-primary: #21A4B1;
  --color-secondary: #A8D5BA;
  --color-cta: #D4AF37;
  --color-bg: #FFF5F5;
  --color-text: #2D3436;

  --font-headline: "Cormorant Garamond", serif;
  --font-body: "Montserrat", sans-serif;

  --transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --shadow-soft: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-hover: 0 8px 24px rgba(0, 0, 0, 0.10);
}
```

並在 `<head>` 加 Google Fonts import：

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
```

## 7. 風格選項呈現

從 UUPM 的 8 種 Landing Page Styles 挑 3 個：

| # | Style | 主打 |
|:--|:--|:--|
| 1 | Hero-Centric Design | 視覺主角型 |
| 2 | Conversion-Optimized | 轉換率優先 |
| 3 | Feature-Rich Showcase | SaaS 功能展示 |
| 4 | Minimal & Direct | 極簡直接 |
| 5 | Social Proof-Focused | 社群證明主導 |
| 6 | Interactive Product Demo | 互動 demo |
| 7 | Trust & Authority | B2B 權威感 |
| 8 | Storytelling-Driven | 敘事型 |

**選法：** UUPM 推薦的當 Style 1，再挑 2 個語調不同的湊齊 3 選 1。

範例：UUPM 推薦 `Hero-Centric + Social Proof` →
- 風格 A：Hero-Centric（主推、視覺氣勢）
- 風格 B：Conversion-Optimized（CTA 密集、數據堆疊）
- 風格 C：Trust & Authority（專業、credibility 前置）

渲染成卡片式預覽（迷你 mockup），使用者點選。

## 8. 檢查清單應用

UUPM 會輸出 Pre-Delivery Checklist。生成 HTML 後跑過一次這 checklist：

- `cursor-pointer` 在所有 button / a
- Hover transitions 150-300ms
- 對比度 4.5:1 以上
- `prefers-reduced-motion` 尊重
- 響應式斷點 375 / 768 / 1024 / 1440

有任何項目不符合，在 Step 5 輸出訊息裡附上 ⚠️ 提醒。

## 9. Fallback 觸發條件

以下情況自動轉 Fallback 模式：

- UUPM 未安裝且使用者回 `n`
- `search.py` 執行失敗（non-zero exit）
- MASTER.md 解析出錯（缺 colors 或 typography）
- Bash 工具不可用
- 使用者明確說「我不要裝 UUPM」