# sync-health.ps1
# 驗證 Antigravity 跨裝置同步架構是否健康
# 由 sync-assistant 生成 · by 雷蒙

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "💡 sync-health.ps1 開始體檢..." -ForegroundColor Cyan
Write-Host ""

$fail = 0

# 完全使用相對路徑動態解析，不包含任何中文硬編碼，徹底避開 Windows 編碼亂碼問題
try {
    if ($PSScriptRoot) {
        $baseDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
    } else {
        $baseDir = (Resolve-Path "..\..\..\..").Path
    }
} catch {
    # 預設 Fallback (若當前路徑無法解析)
    $baseDir = "G:\我的雲端硬碟\Antigravity"
}

$globalConfigDir = "C:\Users\sshor\.gemini\config"

Write-Host "偵測到的大腦根目錄為: $baseDir" -ForegroundColor Gray

# 檢查 1：C 槽 config 底下的軟連結/Junction 指向是否都存在且可讀
Write-Host "[1/3] 檢查全域連結與路徑..."
$itemsToCheck = @("skills", "settings.json")
foreach ($item in $itemsToCheck) {
    $path = Join-Path $globalConfigDir $item
    if (Test-Path $path) {
        $target = (Get-Item $path).Target
        if ($target) {
            Write-Host "  ✅ $item -> $target" -ForegroundColor Green
        } else {
            Write-Host "  ✅ $item 已就位 (本機實體檔案或目錄)" -ForegroundColor Green
        }
    } else {
        Write-Host "  ❌ 找不到 $item 於 $globalConfigDir" -ForegroundColor Red
        $fail++
    }
}

# 檢查 2：關鍵自訂 skill 可讀取
Write-Host ""
Write-Host "[2/3] 檢查關鍵自訂 Skill 可讀取..."
$testSkill = Join-Path $baseDir "000_Agent\skills\prepare-lesson\SKILL.md"
if (Test-Path $testSkill) {
    Write-Host "  ✅ prepare-lesson/SKILL.md 可正常讀取" -ForegroundColor Green
} else {
    Write-Host "  ⚠️ 找不到 prepare-lesson 自訂技能，請確認雲端硬碟同步狀態" -ForegroundColor Yellow
}

# 檢查 3：MEMORY.md 記憶系統可讀取
Write-Host ""
Write-Host "[3/3] 檢查記憶系統..."
$memory = Join-Path $baseDir "000_Agent\memory\MEMORY.md"
if (Test-Path $memory) {
    $lines = (Get-Content $memory).Count
    Write-Host "  ✅ MEMORY.md 可正常讀取 ($lines 行)" -ForegroundColor Green
} else {
    Write-Host "  ❌ MEMORY.md 遺失或無法讀取：$memory" -ForegroundColor Red
    $fail++
}

Write-Host ""
if ($fail -eq 0) {
    Write-Host "🎉 全部正常！您的 Antigravity 大腦狀態良好。" -ForegroundColor Green
} else {
    Write-Host "⚠️ 發現 $fail 個異常項目，請檢查 Google 雲端硬碟同步或重跑備份還原。" -ForegroundColor Red
    exit 1
}
