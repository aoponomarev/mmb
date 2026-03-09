/**
 * #JS-rr4CFxo2
 * @description Deploy coingecko-fetcher to Yandex Cloud Functions via REST API; service account IAM token.
 */
'use strict';

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// ─── Configuration ──────────────────────────────────────────────────────────────
const FOLDER_ID       = 'b1gv03a122le5a934cqj';
const SERVICE_ACCOUNT_ID = 'ajeudqscq65r5d5u7ras';
// @skill-anchor id:sk-b7e114 #for-eip
const API_KEY_ID      = process.env.YC_API_KEY_ID;
const API_KEY_SECRET  = process.env.YC_API_KEY_SECRET;

const FUNCTION_NAME   = 'coingecko-fetcher';
const RUNTIME         = 'nodejs18';
const ENTRYPOINT      = 'index.handler';
const MEMORY_MB       = 256;
const TIMEOUT_SEC     = 600; // 10 min (5 pages × 2 × 21s = ~210s + buffer)

const DB_HOST     = 'rc1b-dgs1vgc130gbme2n.mdb.yandexcloud.net';
const DB_PORT     = '6432';
const DB_NAME     = 'app_db';
// @skill-anchor id:sk-b7e114 #for-eip
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

// ─── Get IAM token via API key ─────────────────────────────────────────
async function getIamToken() {
    console.log('Getting IAM token...');
    // For service account API key use endpoint /iam/v1/tokens with apiKey
    const body = JSON.stringify({
        apiKey: {
            id: API_KEY_ID,
            secret: API_KEY_SECRET
        }
    });
    // Correct endpoint for service account API key
    const result = await apiRequest({
        hostname: 'iam.api.cloud.yandex.net',
        path: '/iam/v1/tokens',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, body);

    if (!result.iamToken) throw new Error('No iamToken in response: ' + JSON.stringify(result));
    console.log('IAM token obtained');
    return result.iamToken;
}

// ─── Create function ZIP archive ─────────────────────────────────────────────────
function createZip() {
    const zipPath = path.join(__dirname, 'function.zip');
    // Create zip from index.js + package.json + node_modules
    execSync(`powershell -Command "Compress-Archive -Force -Path '${__dirname}\\index.js','${__dirname}\\package.json','${__dirname}\\node_modules' -DestinationPath '${zipPath}'"`, { stdio: 'inherit' });
    const zipContent = fs.readFileSync(zipPath);
    const base64 = zipContent.toString('base64');
    console.log(`ZIP created: ${zipPath} (${Math.round(zipContent.length / 1024)}KB)`);
    return base64;
}

// ─── Find or create function ─────────────────────────────────────────────────
async function getOrCreateFunction(token) {
    console.log('Looking for function', FUNCTION_NAME, '...');
    const list = await apiRequest({
        hostname: 'serverless-functions.api.cloud.yandex.net',
        path: `/functions/v1/functions?folderId=${FOLDER_ID}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const existing = (list.functions || []).find(f => f.name === FUNCTION_NAME);
    if (existing) {
        console.log('Function found:', existing.id);
        return existing.id;
    }

    console.log('Creating new function...');
    const created = await apiRequest({
        hostname: 'serverless-functions.api.cloud.yandex.net',
        path: '/functions/v1/functions',
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    }, { folderId: FOLDER_ID, name: FUNCTION_NAME, description: 'CoinGecko top-250 fetcher → PostgreSQL coin_market_cache' });

    // Wait for operation to complete
    const funcId = await waitOperation(created, token);
    console.log('Function created:', funcId);
    return funcId;
}

// ─── Wait for operation ─────────────────────────────────────────────────
async function waitOperation(operation, token) {
    if (operation.done) {
        return operation.response?.id || operation.metadata?.functionId;
    }
    const opId = operation.id;
    console.log('Waiting for operation', opId, '...');
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

// ─── Create function version ────────────────────────────────────────────────────
async function createVersion(token, functionId, zipBase64) {
    console.log('Creating function version...');
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
    console.log('Version created:', versionId);
    return versionId;
}

// ─── Create cron triggers (every hour at :00 and :30) ────────────────────────
async function createCronTriggers(token, functionId) {
    console.log('Creating cron triggers (every hour at :00 and :30)...');

    // Check existing triggers
    const list = await apiRequest({
        hostname: 'serverless-triggers.api.cloud.yandex.net',
        path: `/triggers/v1/triggers?folderId=${FOLDER_ID}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const triggers = [
        { name: `${FUNCTION_NAME}-cron-cap`, cron: '0 * * * ? *', desc: 'Every hour at :00: CoinGecko (market_cap) -> PostgreSQL' },
        { name: `${FUNCTION_NAME}-cron-vol`, cron: '30 * * * ? *', desc: 'Every hour at :30: CoinGecko (volume) -> PostgreSQL' }
    ];

    for (const t of triggers) {
        const existing = (list.triggers || []).find(existingT => existingT.name === t.name);
        if (existing) {
            console.log(`Trigger already exists: ${existing.id} (${t.name})`);
            continue;
        }

        const body = {
            folderId: FOLDER_ID,
            name: t.name,
            description: t.desc,
            rule: {
                timer: {
                    cronExpression: t.cron,
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
        console.log(`Trigger created: ${triggerId} (${t.name})`);
    }
}

function createDeploymentSnapshot() {
    console.log('Creating deployment snapshot...');
    execSync('node is/scripts/infrastructure/archive-deployment-snapshot.js --target yandex-market-fetcher', {
        cwd: REPO_ROOT,
        stdio: 'inherit'
    });
    console.log('Deployment snapshot created');
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('=== Deploy coingecko-fetcher to Yandex Cloud ===\n');

    try {
        const token = await getIamToken();
        const zipBase64 = createZip();
        const functionId = await getOrCreateFunction(token);
        await createVersion(token, functionId, zipBase64);
        await createCronTriggers(token, functionId);
        createDeploymentSnapshot();

        console.log('\n=== Deploy complete ===');
        console.log('Function ID:', functionId);
        console.log('Triggers: every hour at :00 and :30');
        console.log('Table: coin_market_cache in app_db');
    } catch (err) {
        console.error('\nDEPLOY ERROR:', err.message);
        if (err.body) console.error('Details:', JSON.stringify(err.body, null, 2));
        process.exit(1);
    }
}

main();
