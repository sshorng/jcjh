# symbiosis_checker.ps1
# 驗證 Antigravity, Codex 與 Open Code 三棲大腦狀態
# 由 symbiosis-assistant 生成 · by 雷蒙

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🩺 三棲大腦健檢開始..." -ForegroundColor Cyan
Write-Host ""

$fail = 0

# 動態解析路徑，避免中文編碼亂碼問題
$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $baseDir = "G:\我的雲端硬碟\AI_Agent"
} else {
    # 向上四層取得 AI_Agent 根目錄
    $baseDir = (Resolve-Path (Join-Path $scriptDir "..\..\..\..")).Path
}

Write-Host "專案母體路徑: $baseDir" -ForegroundColor Gray
Write-Host ""

# Step 1: 檢查規則文件
Write-Host "[1/3] 檢查規則文件..."
$rules = @{
    "ANTIGRAVITY.md" = "Antigravity"
    "AGENTS.md"      = "Codex"
    "CLAUDE.md"      = "Open Code"
}

$foundCount = 0
foreach ($file in $rules.Keys) {
    $path = Join-Path $baseDir $file
    if (Test-Path $path) {
        Write-Host "  ✅ 找到 $($rules[$file]) 規則檔: $file" -ForegroundColor Green
        $foundCount++
    } else {
        Write-Host "  ❌ 找不到 $($rules[$file]) 規則檔: $file" -ForegroundColor Red
        $fail++
    }
}

# Step 2: 檢查技能共享狀態
Write-Host ""
Write-Host "[2/3] 檢查自訂技能共享狀態..."
$skillsDir = Join-Path $baseDir "000_Agent\skills"
if (Test-Path $skillsDir) {
    $skills = Get-ChildItem $skillsDir -Directory
    Write-Host "  已在 000_Agent/skills 下偵測到 $($skills.Count) 個自訂技能：" -ForegroundColor Gray
    foreach ($skill in $skills) {
        Write-Host "    - $($skill.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "  ❌ 找不到自訂技能存放區 000_Agent/skills" -ForegroundColor Red
    $fail++
}

# Step 3: 記憶模組狀態
Write-Host ""
Write-Host "[3/3] 檢查長久記憶模組..."
$memoryFile = Join-Path $baseDir "000_Agent\memory\MEMORY.md"
if (Test-Path $memoryFile) {
    Write-Host "  ✅ 記憶母體 MEMORY.md 存在且正常" -ForegroundColor Green
} else {
    Write-Host "  ❌ 找不到記憶母體 MEMORY.md" -ForegroundColor Red
    $fail++
}

Write-Host ""
if ($fail -eq 0) {
    Write-Host "🎉 健檢完成！全部正常。" -ForegroundColor Green
} else {
    Write-Host "⚠️ 健檢完成，發現 $fail 個待對齊或未設定項目。" -ForegroundColor Yellow
}
