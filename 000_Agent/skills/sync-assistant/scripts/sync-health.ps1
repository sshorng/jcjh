# sync-health.ps1
# Verify Antigravity sync status
# Pure ASCII to prevent Windows PowerShell encoding issues

$fail = 0

try {
    if ($PSScriptRoot) {
        $baseDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
    } else {
        $baseDir = (Resolve-Path "..\..\..\..").Path
    }
} catch {
    $baseDir = "g:\我的雲端硬碟\AI_Agent"
}

$globalConfigDir = Join-Path $env:USERPROFILE ".gemini\config"

Write-Host "Starting sync-health check..." -ForegroundColor Cyan
Write-Host "Brain Root Directory: $baseDir" -ForegroundColor Gray
Write-Host "Global Config Directory: $globalConfigDir" -ForegroundColor Gray
Write-Host ""

# Check 1: Global Links
Write-Host "[1/3] Checking global links..."
$itemsToCheck = @("skills", "config.json")
foreach ($item in $itemsToCheck) {
    $path = Join-Path $globalConfigDir $item
    if (Test-Path $path) {
        $target = (Get-Item $path).Target
        if ($target) {
            Write-Host "  [OK] $item -> $target" -ForegroundColor Green
        } else {
            Write-Host "  [OK] $item is ready (local file/dir)" -ForegroundColor Green
        }
    } else {
        Write-Host "  [FAIL] Cannot find $item in $globalConfigDir" -ForegroundColor Red
        $fail++
    }
}

# Check 2: Critical Custom Skills
Write-Host ""
Write-Host "[2/3] Checking critical custom skills..."
$testSkill = Join-Path $baseDir "000_Agent\skills\prepare-lesson\SKILL.md"
if (Test-Path $testSkill) {
    Write-Host "  [OK] prepare-lesson/SKILL.md is readable" -ForegroundColor Green
} else {
    Write-Host "  [WARN] prepare-lesson skill not found. Check Google Drive sync." -ForegroundColor Yellow
}

# Check 3: Memory System
Write-Host ""
Write-Host "[3/3] Checking memory system..."
$memory = Join-Path $baseDir "000_Agent\memory\MEMORY.md"
if (Test-Path $memory) {
    $lines = (Get-Content $memory).Count
    Write-Host "  [OK] MEMORY.md is readable ($lines lines)" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] MEMORY.md is missing or unreadable at $memory" -ForegroundColor Red
    $fail++
}

Write-Host ""
if ($fail -eq 0) {
    Write-Host "SUCCESS: Your Antigravity brain is healthy and synced!" -ForegroundColor Green
} else {
    Write-Host "FAIL: Found $fail issues. Please check your Google Drive sync or setup." -ForegroundColor Red
    exit 1
}
