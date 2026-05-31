# Fallback Design Rules — 國中教師網頁設計鐵律

本設計系統旨在確保所生成的網頁具備**國中教育界親和力**與**文學美感**，避免過於浮誇的商業漸層或科技感，提供家長與學生清晰好讀的體驗。

---

## 鐵律 1：字體優先推薦人文明體組

Headline 標題使用典雅的宋體/明體（Noto Serif TC），呈現人文學術的質感；Body 內文使用無襯線黑體（Noto Sans TC），確保在各種螢幕上的閱讀易讀性。

| 組合 | Headline | Body | 適合情境 |
|:--|:--|:--|:--|
| **A. 人文襯線組 (推薦)** | Noto Serif TC | Noto Sans TC | 公開授課、閱讀推廣、國文經典營、文學講義 |
| **B. 親切黑體組** | Noto Sans TC 700 | Noto Sans TC 400 | 班級親師會、自主學習單、學校行政公告 |

### Google Fonts import 範本

```html
<!-- 組合 A (人文襯線組) -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@500;700&display=swap" rel="stylesheet">

<!-- 組合 B (親切黑體組) -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
```

---

## 鐵律 2：教育親和力調色盤 (限制三個主色內)

```css
:root {
  --color-primary: /* 品牌主色，奠定網頁的專業基礎 */;
  --color-cta: /* 按鈕／急迫元素，指引家長與學生點擊 */;
  --color-text: /* 文字與中性色 */;

  /* 衍生色 */
  --color-bg: /* 背景色，通常是主色的極淺色，柔和護眼 */;
  --color-muted: /* 次要文字，text 的 opacity 0.6 */;
  --color-border: /* 分隔線，text 的 opacity 0.1 */;
}
```

### 推薦調色盤（適配國中教學情境）

| 調性名稱 | Primary (主色) | CTA (按鈕) | Text (文字) | Bg (背景) | 適合情境 |
|:--|:--|:--|:--|:--|:--|
| 🍃 **溫暖書香** | `#3F6212`（森林綠） | `#D97706`（暖橙） | `#1F2937` | `#F7F9F5` | 閱讀寫作營、語文工作坊、戶外學習 |
| 📘 **人文沉穩** | `#1E3A8A`（專業藍） | `#C2410C`（琥珀磚紅）| `#111827` | `#F9FAFB` | 公開授課說明會、段考複習、升學講座 |
| 🪵 **自然大地** | `#5C4033`（大地棕） | `#B45309`（陶土金） | `#2D2A32` | `#FAF7F2` | 親師交流會、班級家長日、寫作筆記 |

---

## 鐵律 3：間距走 8px base grid

間距一律使用 8 的倍數，確保排版對齊與呼吸留白。

| Token | px | Tailwind | 用途 |
|:--|:--|:--|:--|
| `space-2` | 8px | `p-2` | 緊密 (例如圖標與字元間) |
| `space-4` | 16px | `p-4` | 標準 (如表單輸入框內距) |
| `space-6` | 24px | `p-6` | 區塊內部 (如卡片 padding) |
| `space-8` | 32px | `p-8` | 較大的卡片 padding |
| `space-12` | 48px | `p-12` | 模組段落間 |
| `space-16` | 64px | `p-16` | 大間距 |
| `space-24` | 96px | `py-24` | 區塊垂直間距（桌機） |

### 容器寬度 (Container Width)
- 閱讀與文章區塊：`max-w-2xl`（672px，最適合舒適閱讀的字數寬度）
- 視覺海報或多欄 grid：`max-w-5xl`（1024px）

---

## 組合成 Tailwind 配置

在生成的 HTML 中注入以下設定：

```html
<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: 'var(--color-primary)',
          cta: 'var(--color-cta)',
        },
        fontFamily: {
          headline: ['var(--font-headline)', 'serif'],
          body: ['var(--font-body)', 'sans-serif'],
        },
      },
    },
  };
</script>
```

## 最終品質檢查清單

- [ ] 字體僅限兩種（宋體標題 + 黑體內文）。
- [ ] 配色對比度高於 4.5:1，確保視力友善（適合家長與學生閱讀）。
- [ ] 所有 Padding / Margin 都是 8 的倍數。
- [ ] 響應式佈局在手機 (375px) 與電腦 (1024px) 上皆呈現完美比例。