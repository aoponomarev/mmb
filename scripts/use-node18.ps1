# Use Node 18 from downloaded folder: prepend to PATH and run npm rebuild.
# Usage: .\scripts\use-node18.ps1 [command]
#   No args: sets PATH and runs npm rebuild better-sqlite3; then shell keeps Node 18 in PATH.
#   With args: sets PATH and runs the command (e.g. .\scripts\use-node18.ps1 npm run preflight)

param([Parameter(ValueFromRemainingArguments = $true)] $Command)

$Node18Root = "C:\Program Files\nodejs"

$NodeExe = Join-Path $Node18Root "node.exe"
if (-not (Test-Path $NodeExe)) {
    Write-Error "Node not found at $Node18Root. Extract Node 18 LTS so that node.exe is at $Node18Root\node.exe (or edit Node18Root in this script)."
    exit 1
}

$env:Path = "$Node18Root;$env:Path"
& node -v

if ($Command) {
    & @Command
} else {
    Push-Location $PSScriptRoot\..
    npm rebuild better-sqlite3
    if ($LASTEXITCODE -eq 0) { Write-Host "Done. This terminal now uses Node 18. Run: npm run preflight" }
    Pop-Location
}
