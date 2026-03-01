/**
 * Деплой coingecko-fetcher в Yandex Cloud Functions через REST API
 * Использует API key сервисного аккаунта для получения IAM токена
 */
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Конфигурация ──────────────────────────────────────────────────────────────
const FOLDER_ID       = 'b1gv03a122le5a934cqj';
const SERVICE_ACCOUNT_ID = 'ajeudqscq65r5d5u7ras';
// @skill-anchor is/skills/process-secrets-hygiene: API keys are injected via CI/CD env, not hardcoded here.
const API_KEY_ID      = process.env.YC_API_KEY_ID;
const API_KEY_SECRET  = process.env.YC_API_KEY_SECRET;

const FUNCTION_NAME   = 'coingecko-fetcher';
const RUNTIME         = 'nodejs18';
const ENTRYPOINT      = 'index.handler';
const MEMORY_MB       = 256;
const TIMEOUT_SEC     = 600; // 10 минут (5 страниц × 2 × 21s = ~210s + запас)

const DB_HOST     = 'rc1b-dgs1vgc130gbme2n.mdb.yandexcloud.net';
const DB_PORT     = '6432';
const DB_NAME     = 'app_db';
// @skill-anchor is/skills/process-secrets-hygiene: DB credentials injected via CI/CD env
const DB_USER     = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

// ─── HTTP helper ───────────────────────────────────────────────────────────────
function apiRequest(options, body = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) {
                        reject(Object.assign(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`), { status: res.statusCode, body: parsed }));
                    } else {
                        resolve(parsed);
                    }
                } catch (e) {
                    reject(new Error(`Parse error: ${data.substring(0, 200)}`));
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
        req.end();
    });
}

// ─── Получить IAM токен через API key ─────────────────────────────────────────
async function getIamToken() {
    console.log('Получаем IAM токен...');
    // Для API key сервисного аккаунта используем endpoint /iam/v1/tokens с apiKey
    const body = JSON.stringify({
        apiKey: {
            id: API_KEY_ID,
            secret: API_KEY_SECRET
        }
    });
    // Правильный endpoint для service account API key
    const result = await apiRequest({
        hostname: 'iam.api.cloud.yandex.net',
        path: '/iam/v1/tokens',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, body);

    if (!result.iamToken) throw new Error('No iamToken in response: ' + JSON.stringify(result));
    console.log('IAM токен получен');
    return result.iamToken;
}

// ─── Создать ZIP архив функции ─────────────────────────────────────────────────
function createZip() {
    const zipPath = path.join(__dirname, 'function.zip');
    // Создаём zip из index.js + package.json + node_modules
    execSync(`powershell -Command "Compress-Archive -Force -Path '${__dirname}\\index.js','${__dirname}\\package.json','${__dirname}\\node_modules' -DestinationPath '${zipPath}'"`, { stdio: 'inherit' });
    const zipContent = fs.readFileSync(zipPath);
    const base64 = zipContent.toString('base64');
    console.log(`ZIP создан: ${zipPath} (${Math.round(zipContent.length / 1024)}KB)`);
    return base64;
}

// ─── Найти или создать функцию ─────────────────────────────────────────────────
async function getOrCreateFunction(token) {
    console.log('Ищем функцию', FUNCTION_NAME, '...');
    const list = await apiRequest({
        hostname: 'serverless-functions.api.cloud.yandex.net',
        path: `/functions/v1/functions?folderId=${FOLDER_ID}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const existing = (list.functions || []).find(f => f.name === FUNCTION_NAME);
    if (existing) {
        console.log('Функция найдена:', existing.id);
        return existing.id;
    }

    console.log('Создаём новую функцию...');
    const created = await apiRequest({
        hostname: 'serverless-functions.api.cloud.yandex.net',
        path: '/functions/v1/functions',
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    }, { folderId: FOLDER_ID, name: FUNCTION_NAME, description: 'CoinGecko top-250 fetcher → PostgreSQL coin_market_cache' });

    // Ждём завершения операции
    const funcId = await waitOperation(created, token);
    console.log('Функция создана:', funcId);
    return funcId;
}

// ─── Ждать завершения операции ─────────────────────────────────────────────────
async function waitOperation(operation, token) {
    if (operation.done) {
        return operation.response?.id || operation.metadata?.functionId;
    }
    const opId = operation.id;
    console.log('Ждём операцию', opId, '...');
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const op = await apiRequest({
            hostname: 'operation.api.cloud.yandex.net',
            path: `/operations/${opId}`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (op.done) {
            return op.response?.id || op.metadata?.functionId || op.response?.functionId;
        }
        process.stdout.write('.');
    }
    throw new Error('Operation timeout');
}

// ─── Создать версию функции ────────────────────────────────────────────────────
async function createVersion(token, functionId, zipBase64) {
    console.log('Создаём версию функции...');
    const body = {
        functionId,
        runtime: RUNTIME,
        entrypoint: ENTRYPOINT,
        resources: { memory: MEMORY_MB * 1024 * 1024 },
        executionTimeout: `${TIMEOUT_SEC}s`,
        content: zipBase64,
        environment: {
            DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
        }
    };

    const op = await apiRequest({
        hostname: 'serverless-functions.api.cloud.yandex.net',
        path: '/functions/v1/versions',
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    }, body);

    const versionId = await waitOperation(op, token);
    console.log('Версия создана:', versionId);
    return versionId;
}

// ─── Создать триггер (cron каждые 15 минут) ────────────────────────────────────
async function createCronTrigger(token, functionId) {
    console.log('Создаём cron триггер (каждые 15 минут)...');

    // Проверяем существующие триггеры
    const list = await apiRequest({
        hostname: 'serverless-triggers.api.cloud.yandex.net',
        path: `/triggers/v1/triggers?folderId=${FOLDER_ID}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const triggerName = `${FUNCTION_NAME}-cron`;
    const existing = (list.triggers || []).find(t => t.name === triggerName);
    if (existing) {
        console.log('Триггер уже существует:', existing.id);
        return existing.id;
    }

    const body = {
        folderId: FOLDER_ID,
        name: triggerName,
        description: 'Каждые 15 минут: CoinGecko → PostgreSQL',
        rule: {
            timer: {
                cronExpression: '0/15 * * * ? *', // каждые 15 минут
                invokeFunction: {
                    functionId,
                    functionTag: '$latest',
                    serviceAccountId: SERVICE_ACCOUNT_ID
                }
            }
        }
    };

    const op = await apiRequest({
        hostname: 'serverless-triggers.api.cloud.yandex.net',
        path: '/triggers/v1/triggers',
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    }, body);

    const triggerId = await waitOperation(op, token);
    console.log('Триггер создан:', triggerId);
    return triggerId;
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('=== Деплой coingecko-fetcher в Yandex Cloud ===\n');

    try {
        const token = await getIamToken();
        const zipBase64 = createZip();
        const functionId = await getOrCreateFunction(token);
        await createVersion(token, functionId, zipBase64);
        await createCronTrigger(token, functionId);

        console.log('\n=== Деплой завершён ===');
        console.log('Function ID:', functionId);
        console.log('Триггер: каждые 15 минут');
        console.log('Таблица: coin_market_cache в app_db');
    } catch (err) {
        console.error('\nОШИБКА ДЕПЛОЯ:', err.message);
        if (err.body) console.error('Детали:', JSON.stringify(err.body, null, 2));
        process.exit(1);
    }
}

main();
