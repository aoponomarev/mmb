param()

$ErrorActionPreference = "Stop"

function Get-StagedFiles {
  $raw = git diff --cached --name-only
  if (-not $raw) { return @() }
  return @($raw | Where-Object { $_ -and $_.Trim().Length -gt 0 })
}

function Test-SecretsLeak {
  $diff = git diff --cached
  if (-not $diff) { return }

  $patterns = @(
    'ghp_[A-Za-z0-9]{20,}',
    'AIza[0-9A-Za-z\-_]{20,}',
    'sk-[A-Za-z0-9]{20,}',
    'Bearer\s+[A-Za-z0-9\-\._=]{20,}',
    'jwt[_\-]?secret\s*[:=]\s*["''][A-Za-z0-9\-_]{8,}',
    'api[_-]?key\s*[:=]\s*["''][A-Za-z0-9\-_]{12,}'
  )

  foreach ($pattern in $patterns) {
    if ($diff -match $pattern) {
      throw "Secret-like token detected in staged diff pattern: $pattern"
    }
  }
}

function Test-NodeFoundationIfNeeded([string[]]$files) {
  $needsNode = $files | Where-Object {
    $_ -match '(^|/)package\.json$' -or
    $_ -match '(^|/)package-lock\.json$' -or
    $_ -like 'mcp/*' -or
    $_ -like 'scripts/*.js' -or
    $_ -like 'scripts/*.mjs'
  }
  if (-not $needsNode) { return }

  Write-Host "[preflight] node foundation checks..."
  if ($files -contains ".env.example") {
    npm run env:check | Out-Null
  }
}

Write-Host "[preflight] staged-only Git checks started..."
$staged = Get-StagedFiles
if ($staged.Count -eq 0) {
  Write-Host "[preflight] no staged changes."
  exit 0
}

Test-SecretsLeak
Test-NodeFoundationIfNeeded -files $staged

Write-Host "[preflight] OK"