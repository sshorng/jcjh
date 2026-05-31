---
name: symbiosis-assistant
description: "三棲大腦健檢助手 — 盤點並引導將您的規則、記憶與自訂技能無縫共享於 Antigravity、Codex 與 Open Code 三個 AI 大腦中。"
---

# 三棲大腦健檢助手（/symbiosis）

將您已經累積的規則、技能與記憶，整理成三個 AI 大腦（Antigravity, Codex, Open Code）都能讀懂的格式，實現高效共用，不被任何單一工具綁死。

---

## 三棲對照表

| 項目 | Antigravity (Gemini) | Codex (OpenAI) | Open Code (Claude) | 共享方案 |
| :-- | :-- | :-- | :-- | :-- |
| **專案規則** | `ANTIGRAVITY.md` | `AGENTS.md` | `CLAUDE.md` | 三者內容一致，或皆連結指向專案的 `000_Agent/CORE_RULES.md` |
| **全域設定** | `C:\Users\sshor\.gemini\config\` | `~/.codex/config.toml` | `~/.claude/settings.json` | 格式不同，不建議直接同步；用此技能引導對齊設定 |
| **自訂技能** | `C:\Users\sshor\.gemini\config\skills\` | `~/.codex/skills/` 或 `.agents/skills` | `~/.claude/skills/` | 物理檔案集中放在 `000_Agent/skills/`，再以 Junction 或掃描路徑讀取 |
| **長久記憶** | `000_Agent/memory/` | 同左 (透過規則載入) | 同左 (透過規則載入) | 寫成 Markdown，不要讓記憶只鎖死在單一對話紀錄中 |

---

## 執行流程

當使用者輸入 `/symbiosis` 或提及「大腦健檢」、「多棲大腦對齊」時，執行以下步驟：

### Phase 1：盤點專案與大腦狀態
1. 確認當前大腦母體路徑：`G:\我的雲端硬碟\AI_Agent\`。
2. 檢查此資料夾下是否同時存在 `ANTIGRAVITY.md`、`AGENTS.md` 與 `CLAUDE.md`。

### Phase 2：檢查規則文件一致性
1. 比對 `ANTIGRAVITY.md`、`AGENTS.md` 與 `CLAUDE.md` 的內容是否一致。
2. 若內容不一致或有缺漏，引導使用者將核心規則抽取至 `000_Agent/CORE_RULES.md`，並讓三者連結或包含此規則。

### Phase 3：檢查自訂技能共享狀態
1. 掃描 `G:\我的雲端硬碟\AI_Agent\000_Agent\skills\` 底下的技能。
2. 檢查各 AI 工具的全域 skills 掃描位置是否皆以 Junction 對接至此目錄。

### Phase 4：MCP 工具格式轉換
1. 若使用者有配置 Antigravity / Open Code 的 JSON 格式 MCP，提供對應的 Codex TOML 格式轉換建議。
