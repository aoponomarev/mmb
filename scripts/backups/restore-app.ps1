<#
.SYNOPSIS
Restores the project from an extracted backup archive to a user-specified destination.

.DESCRIPTION
Run this script from the folder where you extracted the archive (containing a\, mmb\, restore-app.ps1).
Prompts for destination path (paste from Explorer supported). Syncs a\ and mmb\ to destination
using copy+overwrite only (no purge). Runs npm install in mmb.
@causality #for-app-backup-restore-no-purge #for-app-backup-restore-pair
#>

$ErrorActionPreference = "Stop"

$archiveRoot = $PSScriptRoot
if (-not (Test-Path (Join-Path $archiveRoot "mmb"))) {
    Write-Error "mmb folder not found. Run this script from the extracted archive root."
}

Write-Host "Enter destination path (paste from Explorer or type):" -ForegroundColor Cyan
$targetInput = Read-Host
$targetPath = $targetInput.Trim().Trim('"')

while ($true) {
    try {
        $targetPath = [System.IO.Path]::GetFullPath($targetPath)
        if (-not (Test-Path $targetPath)) {
            New-Item -ItemType Directory -Force -Path $targetPath | Out-Null
            Write-Host "Created: $targetPath" -ForegroundColor Gray
        }
        # Verify writable
        $testFile = Join-Path $targetPath ".restore-write-test"
        [System.IO.File]::WriteAllText($testFile, "test")
        Remove-Item $testFile -Force
        break
    }
    catch {
        Write-Host "Invalid or unwritable path: $targetPath" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        $targetInput = Read-Host "Enter destination path again (or empty to exit)"
        if ([string]::IsNullOrWhiteSpace($targetInput)) { exit 1 }
        $targetPath = $targetInput.Trim().Trim('"')
    }
}

$robocopyArgs = @("/E", "/IS", "/IT", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np")

if (Test-Path (Join-Path $archiveRoot "a")) {
    Write-Host "Syncing a\ to $targetPath\a ..." -ForegroundColor Cyan
    $proc = Start-Process -FilePath "robocopy" -ArgumentList (@((Join-Path $archiveRoot "a"), (Join-Path $targetPath "a")) + $robocopyArgs) -Wait -NoNewWindow -PassThru
    if ($proc.ExitCode -ge 8) { Write-Error "Robocopy a failed: $($proc.ExitCode)" }
}

Write-Host "Syncing mmb\ to $targetPath\mmb ..." -ForegroundColor Cyan
$proc = Start-Process -FilePath "robocopy" -ArgumentList (@((Join-Path $archiveRoot "mmb"), (Join-Path $targetPath "mmb")) + $robocopyArgs) -Wait -NoNewWindow -PassThru
if ($proc.ExitCode -ge 8) { Write-Error "Robocopy mmb failed: $($proc.ExitCode)" }

Write-Host "Running npm install in mmb ..." -ForegroundColor Cyan
Push-Location (Join-Path $targetPath "mmb")
try {
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed" }
}
finally {
    Pop-Location
}

Write-Host "=====================================================" -ForegroundColor Green
Write-Host "Restore completed: $targetPath" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
