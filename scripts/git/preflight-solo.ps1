# Pre-commit flow: skills validation and affected-skills report.
# SSOT: is/skills/arch-testing-ci.md
# Trigger: Before commit when staged files include is/mcp/*, package.json, skills, or code with @skill/@causality.
# Does not block on skills:affected; human decides whether to update skills before commit.

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot + "/../.."
Set-Location $projectRoot

Write-Host "[preflight-solo] Starting..." -ForegroundColor Cyan

# 1. Quick safety: .env must not be staged
$staged = git diff --cached --name-only 2>$null
if ($staged -match "\.env$") {
    Write-Host "[preflight-solo] ERROR: .env is staged. Unstage: git restore --staged .env" -ForegroundColor Red
    exit 1
}

# 2. Skills validation (blocking)
Write-Host "[preflight-solo] Running skills:check..." -ForegroundColor Cyan
npm run skills:check
if ($LASTEXITCODE -ne 0) {
    Write-Host "[preflight-solo] skills:check failed. Fix before commit." -ForegroundColor Red
    exit 1
}

# 3. Affected skills and hashes report (informational only — does not block)
Write-Host "[preflight-solo] Running skills:affected..." -ForegroundColor Cyan
npm run skills:affected
# Ignore exit code; skills:affected always exits 0

Write-Host "[preflight-solo] Done. Review affected skills/hashes if any; commit when ready." -ForegroundColor Green
