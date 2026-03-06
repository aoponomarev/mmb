# First-run / "настрой под этот ПК": ensure Node in PATH, check deps, then npm install + rebuild + preflight.
# Usage: .\scripts\setup-dev-env.ps1
#   Idempotent; safe to run on every new PC or after pull.
# See: .cursor/environment-pc/README.md, scripts/README-node18.md

$ErrorActionPreference = "Stop"
$NodeRoot = "C:\Program Files\nodejs"
$ProjectRoot = Join-Path $PSScriptRoot ".."

# 1) Prepend Node to PATH so this session and child processes use it
$nodeExe = Join-Path $NodeRoot "node.exe"
if (-not (Test-Path $nodeExe)) {
    Write-Host "Node not found at $NodeRoot. Install Node 18 LTS there, or edit NodeRoot in this script."
    Write-Host "See: .cursor/environment-pc/README.md"
    exit 1
}
$env:Path = "$NodeRoot;$env:Path"
$nodeVer = & node -v
Write-Host "Node: $nodeVer ($NodeRoot)"

# 2) Optional: warn if Python missing (needed for node-gyp if prebuild fails)
try {
    $pyVer = & python --version 2>&1
    Write-Host "Python: $pyVer"
} catch {
    Write-Host "Python not in PATH. If 'npm rebuild better-sqlite3' fails, install Python 3.11/3.12 and run: pip install setuptools"
}

# 3) npm install
Set-Location $ProjectRoot
Write-Host "Running npm install..."
& npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 4) Rebuild native deps (better-sqlite3)
Write-Host "Running npm rebuild better-sqlite3..."
& npm rebuild better-sqlite3
if ($LASTEXITCODE -ne 0) {
    Write-Host "Rebuild failed. Ensure Python and VS Build Tools (C++) are installed. See .cursor/environment-pc/README.md"
    exit $LASTEXITCODE
}

# 5) Preflight
Write-Host "Running npm run preflight..."
& npm run preflight
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Setup done. This terminal uses Node from $NodeRoot."
