<#
.SYNOPSIS
Creates a ZIP archive of the app project (a + mmb), excluding heavy and system folders.
Archive name format: app-YYMMDDHH-suffix.zip

.DESCRIPTION
Backs up parent folder containing a\ and mmb\. Uses Robocopy for fast copying with exclusions,
then compresses. Archive root: restore-app.ps1, RESTORE-README.txt, a\, mmb\.
@causality #for-app-backup-restore-pair
#>

$ErrorActionPreference = "Stop"

# PSScriptRoot = scripts/backups, ..\.. = mmb root, parent = Statistics (contains a + mmb)
$mmbRoot = (Resolve-Path "$PSScriptRoot\..\..").Path
$parentRoot = Split-Path $mmbRoot -Parent

$destDir = "D:\Clouds\AO\OneDrive\AI\Projects\MMB\zip"
$dateStr = Get-Date -Format "yyMMddHH"

$suffix = Read-Host "Enter archive suffix (e.g. 'feature-x' or 'stable')"
if ([string]::IsNullOrWhiteSpace($suffix)) {
    $destFile = Join-Path $destDir "app-$dateStr.zip"
} else {
    $destFile = Join-Path $destDir "app-$dateStr-$suffix.zip"
}

if (-Not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    Write-Host "Created backup directory: $destDir" -ForegroundColor Cyan
}

$excludeFolders = @(".git", "node_modules", "dist", "build", "coverage", "logs", ".next", "out")
$excludeFiles = @("*.log", "state.vscdb*", "*.zip", "*.tar", "*.gz")

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "app_Backup_Temp_$dateStr"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

$robocopyBase = @("/XD") + $excludeFolders + @("/XF") + $excludeFiles + @("/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np")

if (Test-Path (Join-Path $parentRoot "a")) {
    Write-Host "Copying a\ ..." -ForegroundColor Cyan
    $proc = Start-Process -FilePath "robocopy" -ArgumentList (@((Join-Path $parentRoot "a"), (Join-Path $tempDir "a"), "/MIR") + $robocopyBase) -Wait -NoNewWindow -PassThru
    if ($proc.ExitCode -ge 8) { Write-Error "Robocopy a failed: $($proc.ExitCode)" }
}

Write-Host "Copying mmb\ ..." -ForegroundColor Cyan
$proc = Start-Process -FilePath "robocopy" -ArgumentList (@((Join-Path $parentRoot "mmb"), (Join-Path $tempDir "mmb"), "/MIR") + $robocopyBase) -Wait -NoNewWindow -PassThru
if ($proc.ExitCode -ge 8) { Write-Error "Robocopy mmb failed: $($proc.ExitCode)" }

Write-Host "Adding restore scripts to archive root..." -ForegroundColor Cyan
Copy-Item (Join-Path $PSScriptRoot "restore-app.ps1") -Destination $tempDir -Force
Copy-Item (Join-Path $PSScriptRoot "RESTORE-README.txt") -Destination $tempDir -Force

Write-Host "Compressing into ZIP archive..." -ForegroundColor Cyan
if (Test-Path $destFile) { Remove-Item -Force $destFile }
Compress-Archive -Path "$tempDir\*" -DestinationPath $destFile -Force

Write-Host "Cleaning up temporary files..." -ForegroundColor Cyan
Remove-Item -Recurse -Force $tempDir

Write-Host "=====================================================" -ForegroundColor Green
Write-Host "Backup created successfully!" -ForegroundColor Green
Write-Host "Path: $destFile" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
