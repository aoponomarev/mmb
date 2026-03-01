<#
.SYNOPSIS
Creates a ZIP archive of the app project, excluding heavy and system folders (node_modules, .git, etc.).
Archive name format: app-YYMMDDHH-suffix.zip

.DESCRIPTION
The script uses Robocopy for fast copying of required files to a temporary directory 
(filtering out junk), and then compresses this directory using the built-in Compress-Archive.
It prompts the user for a suffix to include in the filename.
#>

$ErrorActionPreference = "Stop"

# Define paths
$sourcePath = (Resolve-Path "$PSScriptRoot\..").Path
$destDir = "D:\Clouds\AO\OneDrive\AI\Projects\MMB\zip"
$dateStr = Get-Date -Format "yyMMddHH"

# Prompt for suffix
$suffix = Read-Host "Enter archive suffix (e.g. 'feature-x' or 'stable')"
if ([string]::IsNullOrWhiteSpace($suffix)) {
    $destFile = Join-Path $destDir "app-$dateStr.zip"
} else {
    $destFile = Join-Path $destDir "app-$dateStr-$suffix.zip"
}

# Create target directory if it doesn't exist
if (-Not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    Write-Host "Created backup directory: $destDir" -ForegroundColor Cyan
}

# Exclusion lists (folder names and file masks)
$excludeFolders = @(".git", "node_modules", "dist", "build", "coverage", "logs", ".next", "out")
$excludeFiles = @("*.log", "*.sqlite", "*.sqlite-*", "state.vscdb*", "*.zip", "*.tar", "*.gz")

# Create temporary folder
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "app_Backup_Temp_$dateStr"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

Write-Host "Preparing files for backup (excluding junk)..." -ForegroundColor Cyan

# Use Robocopy for fast copying with exclusions
# Robocopy returns exit code < 8 on successful copy, so we handle it specially
$robocopyArgs = @(
    $sourcePath,
    $tempDir,
    "/MIR",
    "/XD"
) + $excludeFolders + @("/XF") + $excludeFiles + @("/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np")

$process = Start-Process -FilePath "robocopy" -ArgumentList $robocopyArgs -Wait -NoNewWindow -PassThru
if ($process.ExitCode -ge 8) {
    Write-Error "Robocopy failed with exit code $($process.ExitCode)"
}

Write-Host "Compressing into ZIP archive (this may take a few seconds)..." -ForegroundColor Cyan

# Delete archive if one already exists with this exact name
if (Test-Path $destFile) { Remove-Item -Force $destFile }

# Compress the contents of the temporary folder
Compress-Archive -Path "$tempDir\*" -DestinationPath $destFile -Force

Write-Host "Cleaning up temporary files..." -ForegroundColor Cyan
Remove-Item -Recurse -Force $tempDir

Write-Host "=====================================================" -ForegroundColor Green
Write-Host "Backup created successfully!" -ForegroundColor Green
Write-Host "Path: $destFile" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
