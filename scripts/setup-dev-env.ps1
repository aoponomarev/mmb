# First-run / "настрой под этот ПК": ensure Node in PATH, check deps, then npm install + rebuild + preflight.
# Usage: .\scripts\setup-dev-env.ps1
#   Idempotent; safe to run on every new PC or after pull.
# See: scripts/README-node18.md

$ErrorActionPreference = "Stop"
$ProjectRoot = Join-Path $PSScriptRoot ".."
Set-Location $ProjectRoot

Write-Host "[Env Setup] Checking Node.js availability..."

# 1) Try to find Node in PATH
$nodeExe = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $nodeExe) {
    # Try common fallback location
    $FallbackNodeRoot = "C:\Program Files\nodejs"
    if (Test-Path (Join-Path $FallbackNodeRoot "node.exe")) {
        Write-Host "Node not in PATH, but found at $FallbackNodeRoot. Adding to session PATH."
        $env:Path = "$FallbackNodeRoot;$env:Path"
    } else {
        Write-Host "Node.js not found in PATH or standard locations. Please install Node 18+."
        Write-Host "See: scripts/README-node18.md"
        exit 1
    }
} else {
    Write-Host "Node found in PATH: $nodeExe"
}

$nodeVer = & node -v
Write-Host "Node version: $nodeVer"

# 2) Optional: warn if Python missing (needed for node-gyp if prebuild fails)
try {
    $pyVer = & python --version 2>&1
    Write-Host "Python: $pyVer"
} catch {
    Write-Host "Python not in PATH. If 'npm rebuild better-sqlite3' fails, install Python 3.11/3.12 and run: pip install setuptools"
}

# 3) npm install
Write-Host "`n[Env Setup] Running npm install..."
& npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 4) Rebuild native deps (better-sqlite3)
Write-Host "`n[Env Setup] Rebuilding native dependencies (better-sqlite3) for current PC ($env:COMPUTERNAME)..."
& npm rebuild better-sqlite3
if ($LASTEXITCODE -ne 0) {
    Write-Host "Rebuild failed. Ensure Python and VS Build Tools (C++) are installed. See scripts/README-node18.md"
    exit $LASTEXITCODE
}

# 5) Preflight
Write-Host "`n[Env Setup] Running npm run preflight..."
& npm run preflight
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n[Env Setup] Setup done. Environment is ready for this PC ($env:COMPUTERNAME)."
