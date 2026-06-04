---
name: class-game-builder
description: 課堂沉浸式遊戲簡報產生器。當用戶（國文老師）提供課文原文、講義、大綱、備課資料，或者提及「代課」、「製作課堂遊戲」、「課文簡報遊戲」、「製作 HTML 簡報遊戲」、「/class-game」時，必須主動觸發此技能，為其自動生成一個高品質、16:9 比例鎖定、無多餘留白、中間內容自適應下拉滾動的單檔互動 HTML 遊戲簡報。
---

# 課堂沉浸式遊戲簡報產生器 (Class Game Builder)

本技能旨在為國中國文教師「夫子」快速將課文或講義，生成為具備「沉浸式劇情情境」、「互動決策關卡」與「國文寫作美學探討」的高品質單檔 HTML 網頁簡報遊戲。

---

## 📐 16:9 版面與 CSS 核心規範
為了確保投影與平板上的視覺美感，版面必須嚴格遵守以下大字自適應排版系統：

### 1. 外框鎖定 16:9 比例
外層大容器 `.slide-container` 必須嚴格鎖定比例，不被內容撐大變形：
```css
.slide-container {
    width: 96vw;
    height: 54vw; /* 鎖定 16:9 寬高比 */
    max-width: 177.78vh;
    max-height: 90vh; /* 貼合螢幕邊緣 */
    background-color: #050505;
    border: 3.5px solid #444;
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 2.2vh 4vw;
    border-radius: 12px;
    overflow: hidden; /* 保持外框穩定 */
}
```

### 2. 消除多餘留白與自適應下拉滾動
中間內容區 `.slide-body` 必須自動分配剩餘空間，吃掉多餘的留白，並在內容過多（如展開解析面板）時在內部產生垂直滾動條：
```css
.slide-body {
    flex: 1; /* 自動填滿 header 與 footer 之間的所有空間，徹底消除上下無用留白 */
    height: 0; /* 配合 flex 確保內容不會撐大 16:9 外框 */
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    overflow-y: auto; /* 內容超出時，在中間內容區內產生滾動，實現下拉 */
    z-index: 2;
    padding-right: 0.8vw;
    margin-bottom: 1.5vh;
}
```

### 3. 大字投影美學
* **字體大小**：說文字體一律設定在 `3.2vh` 至 `3.8vh` 以上，確保教室最後一排亦清晰易讀，絕不重疊。
* **高對比配色**：採用深色背景（如 `#050505`、`#000`）搭配高飽和度的金色（`#d4af37`）或亮紅色（`#ff3333`），營造沉浸式古風水墨感。

---

## ⚔️ 核心互動關卡模組架構

網頁簡報遊戲應包含以下互動關卡模組，用以增添趣味並扣緊教學：

### 模組 A：正反心境對照卡片
* **情境**：左右分欄卡片，讓學生點擊對比兩個角色的心境或反應。
* **範例**：左卡點擊呈現「眾官之慌（反襯）」，右卡點擊呈現「孔明之定」，全部點選完後彈出賞析解析。

### 模組 B：虛實心防指數量表
* **情境**：左側為防衛/部署按鈕（分為「他人作為」與「自己作為」分組），右側為「對手第一人稱主觀觀測鏡（內心獨白 OS）」。
* **機制**：學生點選不同部署，右側觀測鏡會動態呈現對手看到此部署時的懷疑與震驚，同時增加其「疑慮值進度條」。疑慮值累計 100% 後通關解鎖寫作手法解析。

### 模組 C：角色對話與寫作手法探索
* **情境**：出現小說經典的角色對話插曲（如司馬昭質疑司馬懿）。
* **機制**：不要讓學生去做無意義的劇情決策，而是引導學生站在「大作家/編劇」的視角，點擊探索**「為什麼作者要在這裡加入這段插曲？」**。
  - 按鈕分別代表不同的探索維度：【情節張力】、【人物反襯】、【側面烘托】。
  - 點擊後動態渲染該寫作手法的精緻分析，並解鎖翻頁。

### 模組 D：文本字詞尋寶
* **情境**：在一段課文原文中，用 `<span>` 包裹單詞，讓學生用手指點選「最能打擊心防」或「最關鍵」的神態特寫字詞。
* **機制**：點選後字詞高亮，點選「驗證」按鈕。答對後（如點選了笑容可掬、旁若無人）播放音效並解鎖賞析面板。

### 模組 E：戰略設伏沙盤與歇後語燈謎
* **機制**：提供地圖路線或歇後語選項，點選正確答案後解鎖金色大字展開動畫與擂鼓突襲等 CSS 動畫特效。

---

## 📖 國文經典寫作手法規範（修辭考點鐵律）
在撰寫任何寫作分析時，必須使用嚴謹、地道的國中修辭考點，**嚴禁使用非教材觀念的「以動襯靜」**：
1. **對比法**：分析多寡對比（十五萬 vs 二千五百）、虛實對比（大軍壓境 vs 大開城門）、忙閒對比（兵臨城下 vs 焚香操琴）。
2. **襯托法**：
   - **反襯**：以部下眾官「無不失色」的慌亂，反襯主帥孔明「笑容可掬」的冷靜。
   - **正襯**：以配角百姓「低頭灑掃，旁若無人」的從容，正襯主帥孔明「勝券在握」的定力。

---

## 🎵 音效與免檔案錯誤規範
為了避免在單檔 HTML 中載入外部 mp3 音效失敗導致 JS 執行中斷，必須使用 Web Audio API 生成音調，或者清空音效函式在第一行直接 `return;`：
```javascript
// Web Audio API 無音訊檔生成音效
function playQinSound(frequency) {
    if (!window.AudioContext && !window.webkitAudioContext) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
}
```

---

## 🚀 交付流程
當觸發此技能時，請依照下列步驟進行：
1. 深入閱讀用戶提供的課文/大綱，提煉出 **3-5 個經典的寫作美學/情境關卡**。
2. 規劃關卡設計：確定哪些頁面使用角色卡心境對照、點詞尋寶、量表沙盤、或寫作妙處探索。
3. 仿照 `empty-fort.html` 的 16:9 排版架構，生成完整的單檔 HTML 檔案。
4. 執行 HTML 全域 `<div>` 標籤平衡檢測，確保無破損。
5. 部署並提供檔案庫網址與 Pages 預覽網址。
