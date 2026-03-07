# ============================================================
# Деплой coingecko-fetcher через yc CLI
# Использование: .\deploy-with-token.ps1 -OAuthToken "y0_AgAAAA..."
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

Write-Host "=== Деплой $FUNCTION_NAME ===" -ForegroundColor Cyan

# 1. Настраиваем yc с OAuth токеном
Write-Host "`n[1] Настройка yc CLI..."
& $YC config set token $OAuthToken
& $YC config set folder-id $FOLDER_ID

# Проверяем токен
$iamTest = & $YC iam create-token 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Ошибка получения IAM токена: $iamTest"
    exit 1
}
Write-Host "IAM токен получен OK" -ForegroundColor Green

# 2. Создаём ZIP архив
Write-Host "`n[2] Создаём ZIP архив..."
$zipPath = "$FUNCTION_DIR\function.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }
Compress-Archive -Path "$FUNCTION_DIR\index.js", "$FUNCTION_DIR\package.json", "$FUNCTION_DIR\node_modules" -DestinationPath $zipPath
$zipSize = [math]::Round((Get-Item $zipPath).Length / 1KB)
Write-Host "ZIP создан: $zipSize KB" -ForegroundColor Green

# 3. Создаём или находим функцию
Write-Host "`n[3] Проверяем функцию $FUNCTION_NAME..."
$existingFunc = & $YC serverless function list --format json 2>&1 | ConvertFrom-Json | Where-Object { $_.name -eq $FUNCTION_NAME }

if ($existingFunc) {
    $FUNCTION_ID = $existingFunc.id
    Write-Host "Функция найдена: $FUNCTION_ID" -ForegroundColor Green
} else {
    Write-Host "Создаём новую функцию..."
    $newFunc = & $YC serverless function create --name $FUNCTION_NAME --description "CoinGecko top-250 fetcher -> PostgreSQL coin_market_cache" --format json 2>&1 | ConvertFrom-Json
    $FUNCTION_ID = $newFunc.id
    Write-Host "Функция создана: $FUNCTION_ID" -ForegroundColor Green
}

# 4. Создаём версию функции
Write-Host "`n[4] Деплоим версию функции..."
& $YC serverless function version create `
    --function-id $FUNCTION_ID `
    --runtime nodejs18 `
    --entrypoint "index.handler" `
    --memory 256MB `
    --execution-timeout 600s `
    --source-path $zipPath `
    --environment "DB_HOST=rc1b-dgs1vgc130gbme2n.mdb.yandexcloud.net,DB_PORT=6432,DB_NAME=app_db,DB_USER=app_admin,DB_PASSWORD=********"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Ошибка создания версии функции"
    exit 1
}
Write-Host "Версия задеплоена OK" -ForegroundColor Green

# 5. Создаём cron триггеры
Write-Host "`n[5] Создаём cron триггеры (в :00 и :30)..."

$triggers = @(
    @{ name = "$FUNCTION_NAME-cron-cap"; cron = "0 * * * ? *"; desc = "Every hour at :00: CoinGecko (market_cap) -> PostgreSQL" },
    @{ name = "$FUNCTION_NAME-cron-vol"; cron = "30 * * * ? *"; desc = "Every hour at :30: CoinGecko (volume) -> PostgreSQL" }
)

foreach ($t in $triggers) {
    $existingTrigger = & $YC serverless trigger list --format json 2>&1 | ConvertFrom-Json | Where-Object { $_.name -eq $t.name }

    if ($existingTrigger) {
        Write-Host "Триггер уже существует: $($existingTrigger.id) ($($t.name))" -ForegroundColor Yellow
    } else {
        & $YC serverless trigger create timer `
            --name $($t.name) `
            --description $($t.desc) `
            --cron-expression $($t.cron) `
            --invoke-function-id $FUNCTION_ID `
            --invoke-function-tag '$latest' `
            --invoke-function-service-account-id $SERVICE_ACCOUNT_ID

        if ($LASTEXITCODE -ne 0) {
            Write-Error "Ошибка создания триггера $($t.name)"
            exit 1
        }
        Write-Host "Триггер создан OK ($($t.name))" -ForegroundColor Green
    }
}

Write-Host "`n=== Деплой завершён ===" -ForegroundColor Cyan
Write-Host "Function ID: $FUNCTION_ID"
Write-Host "Триггеры: каждый час в :00 и :30"
Write-Host "Таблица: coin_market_cache в app_db"
