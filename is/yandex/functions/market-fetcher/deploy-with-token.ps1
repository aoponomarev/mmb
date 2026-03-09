# ============================================================
# This script exists to keep deploy + snapshot atomic.
# Usage: .\deploy-with-token.ps1 -OAuthToken "y0_AgAAAA..."
# ============================================================
param(
    [Parameter(Mandatory=$true)]
    [string]$OAuthToken
)

$YC = "$env:TEMP\yc.exe"
$FOLDER_ID = "b1gv03a122le5a934cqj"
$SERVICE_ACCOUNT_ID = "ajeudqscq65r5d5u7ras"
$FUNCTION_NAME = "coingecko-fetcher"
$FUNCTION_DIR = $PSScriptRoot

Write-Host "=== Deploy $FUNCTION_NAME ===" -ForegroundColor Cyan

# 1. Configure yc context first so later commands are deterministic.
Write-Host "`n[1] Configure yc CLI..."
& $YC config set token $OAuthToken
& $YC config set folder-id $FOLDER_ID

# IAM token check prevents running deploy with broken auth state.
$iamTest = & $YC iam create-token 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to get IAM token: $iamTest"
    exit 1
}
Write-Host "IAM token is valid" -ForegroundColor Green

# 2. Build zip payload exactly from runtime sources.
Write-Host "`n[2] Build function ZIP..."
$zipPath = "$FUNCTION_DIR\function.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }
Compress-Archive -Path "$FUNCTION_DIR\index.js", "$FUNCTION_DIR\package.json", "$FUNCTION_DIR\node_modules" -DestinationPath $zipPath
$zipSize = [math]::Round((Get-Item $zipPath).Length / 1KB)
Write-Host "ZIP created: $zipSize KB" -ForegroundColor Green

# 3. Reuse existing function id to avoid accidental duplicates.
Write-Host "`n[3] Resolve function $FUNCTION_NAME..."
$existingFunc = & $YC serverless function list --format json 2>&1 | ConvertFrom-Json | Where-Object { $_.name -eq $FUNCTION_NAME }

if ($existingFunc) {
    $FUNCTION_ID = $existingFunc.id
    Write-Host "Function found: $FUNCTION_ID" -ForegroundColor Green
} else {
    Write-Host "Create new function..."
    $newFunc = & $YC serverless function create --name $FUNCTION_NAME --description "CoinGecko top-250 fetcher -> PostgreSQL coin_market_cache" --format json 2>&1 | ConvertFrom-Json
    $FUNCTION_ID = $newFunc.id
    Write-Host "Function created: $FUNCTION_ID" -ForegroundColor Green
}

# 4. Read live env contract so deploy does not drift from working runtime.
Write-Host "`n[4] Read live env contract..."
$latestVersion = $null
$versionListRaw = & $YC serverless function version list --function-id $FUNCTION_ID --limit 1 --format json 2>&1
if ($LASTEXITCODE -eq 0) {
    $parsed = $versionListRaw | ConvertFrom-Json
    if ($parsed -and $parsed.Count -gt 0) {
        $latestVersion = $parsed[0]
    }
}

$envMap = @{}
if ($latestVersion -and $latestVersion.environment) {
    $latestVersion.environment.PSObject.Properties | ForEach-Object {
        $envMap[$_.Name] = [string]$_.Value
    }
    Write-Host "Live env contract restored from active version" -ForegroundColor Green
} else {
    # First deploy has no previous version, so host env is the only safe source.
    $requiredKeys = @("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD")
    foreach ($key in $requiredKeys) {
        $hostEnvValue = [Environment]::GetEnvironmentVariable($key)
        if ([string]::IsNullOrWhiteSpace($hostEnvValue)) {
            Write-Error "Missing required host env variable for first deploy: $key"
            exit 1
        }
        $envMap[$key] = [string]$hostEnvValue
    }
    if ($env:COINGECKO_API_KEY) {
        $envMap["COINGECKO_API_KEY"] = [string]$env:COINGECKO_API_KEY
    }
    Write-Host "Live env contract assembled from host environment" -ForegroundColor Yellow
}

$envPairs = ($envMap.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join ","
if ([string]::IsNullOrWhiteSpace($envPairs)) {
    Write-Error "Computed environment contract is empty"
    exit 1
}

# 5. Publish a new version so trigger references stay on $latest.
Write-Host "`n[5] Publish function version..."
& $YC serverless function version create `
    --function-id $FUNCTION_ID `
    --runtime nodejs18 `
    --entrypoint "index.handler" `
    --memory 256MB `
    --execution-timeout 600s `
    --source-path $zipPath `
    --environment $envPairs

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create function version"
    exit 1
}
Write-Host "Function version deployed" -ForegroundColor Green

# 6. Keep scheduled ingestion topology stable after version update.
Write-Host "`n[6] Ensure cron triggers (:00 and :30)..."

$triggers = @(
    @{ name = "$FUNCTION_NAME-cron-cap"; cron = "0 * * * ? *"; desc = "Every hour at :00: CoinGecko (market_cap) -> PostgreSQL" },
    @{ name = "$FUNCTION_NAME-cron-vol"; cron = "30 * * * ? *"; desc = "Every hour at :30: CoinGecko (volume) -> PostgreSQL" }
)

foreach ($t in $triggers) {
    $existingTrigger = & $YC serverless trigger list --format json 2>&1 | ConvertFrom-Json | Where-Object { $_.name -eq $t.name }

    if ($existingTrigger) {
        Write-Host "Trigger exists: $($existingTrigger.id) ($($t.name))" -ForegroundColor Yellow
    } else {
        & $YC serverless trigger create timer `
            --name $($t.name) `
            --description $($t.desc) `
            --cron-expression $($t.cron) `
            --invoke-function-id $FUNCTION_ID `
            --invoke-function-tag '$latest' `
            --invoke-function-service-account-id $SERVICE_ACCOUNT_ID

        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create trigger $($t.name)"
            exit 1
        }
        Write-Host "Trigger created ($($t.name))" -ForegroundColor Green
    }
}

# 7. Archive snapshot is mandatory to preserve rollback-grade state.
Write-Host "`n[7] Create deployment snapshot..."
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
node "$repoRoot\is\scripts\infrastructure\archive-deployment-snapshot.js" --target yandex-market-fetcher
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create deployment snapshot"
    exit 1
}
Write-Host "Deployment snapshot created" -ForegroundColor Green

Write-Host "`n=== Deploy completed ===" -ForegroundColor Cyan
Write-Host "Function ID: $FUNCTION_ID"
Write-Host "Triggers: every hour at :00 and :30"
Write-Host "Table: coin_market_cache in app_db"
