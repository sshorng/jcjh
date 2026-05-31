# setup-local.ps1
# Set up global links and configuration dynamically for the current computer
# Pure ASCII to prevent Windows PowerShell encoding issues

$localConfigDir = Join-Path $env:USERPROFILE ".gemini\config"
if (-not (Test-Path $localConfigDir)) {
    New-Item -ItemType Directory -Path $localConfigDir -Force
}

# Resolve the brain root directory dynamically based on this script's location
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$brainDir = (Resolve-Path (Join-Path $scriptDir "..\..\..\..")).Path

Write-Host "Brain Directory Resolved: $brainDir" -ForegroundColor Gray
Write-Host "Local Config Directory: $localConfigDir" -ForegroundColor Gray
Write-Host ""

# 1. Setup skills Junction
$localSkills = Join-Path $localConfigDir "skills"
$targetSkills = Join-Path $brainDir "000_Agent\skills"

Write-Host "Setting up skills Junction..."
if (Test-Path $localSkills) {
    Write-Host "  Removing existing skills link..."
    $item = Get-Item $localSkills
    if ($item.Attributes -match "ReparsePoint") {
        cmd.exe /c "rd `"$localSkills`""
    } else {
        Remove-Item $localSkills -Recurse -Force
    }
}
cmd.exe /c "mklink /j `"$localSkills`" `"$targetSkills`""

# 2. Copy config.json directly as robust fallback
$localConfigJson = Join-Path $localConfigDir "config.json"
$targetConfigJson = Join-Path $brainDir "000_Agent\.gemini\config\config.json"

Write-Host "Copying config.json..."
if (Test-Path $targetConfigJson) {
    Copy-Item -Path $targetConfigJson -Destination $localConfigJson -Force
    Write-Host "  [SUCCESS] config.json copied successfully." -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Source config.json not found at $targetConfigJson" -ForegroundColor Red
}

Write-Host ""
Write-Host "Local setup completed successfully!" -ForegroundColor Green
