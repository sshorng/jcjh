---
name: lou-shi-ming
description: 依 claude-video-specs 第 02 類規範製作 教學影片
target: antigravity
---

# 教學影片 生成技能（lou-shi-ming）

## 用途
依照 claude-video-specs 第 02 類規範製作 教學影片。

## 觸發情境
- 「做一支教學影片/學科解釋影片」
- 「按照規範做一支 教學影片」
- 「跑 lou-shi-ming 工作流」

## 工作流
1. 確認主題、片長、素材狀況
2. 讀規範：`G:\我的雲端硬碟\Antigravity\claude-video-specs/specs/02-*.md`
3. fork 範本：複製 `G:\我的雲端硬碟\Antigravity\claude-video-specs/examples/02-*/` 到工作目錄
4. 跑該 spec 第 9 / 11 章 checklist
5. Edge-TTS 序列生成旁白
6. Playwright（C:\Users\sshor\AppData\Local\Temp\cvs-render）錄製 webm
7. ffmpeg mux master_audio → mp4
8. 給使用者預覽 → 確認後存檔

## 規範路徑
`G:\我的雲端硬碟\Antigravity\claude-video-specs/specs/02-*.md`

## 範本路徑
`G:\我的雲端硬碟\Antigravity\claude-video-specs/examples/02-*/`

## 注意
- Playwright node_modules 必須在 `C:\Users\sshor\AppData\Local\Temp\cvs-render`，不能放 GDrive
- Edge-TTS 並行會被斷線，序列 + retry 3 次
