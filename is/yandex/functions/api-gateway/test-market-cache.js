/**
 * #JS-Tx3gkDQ8
 * @description Local test for /api/coins/market-cache endpoint; simulates direct function call (no HTTP).
 */
process.env.DB_HOST = 'rc1b-dgs1vgc130gbme2n.mdb.yandexcloud.net';
process.env.DB_PORT = '6432';
process.env.DB_NAME = 'app_db';
process.env.DB_USER = 'app_admin';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '********';
process.chdir(__dirname);
const handler = require('./index.js');

async function test(description, event) {
    console.log(`\n--- ${description} ---`);
    const result = await handler.handler(event, {});
    const body = JSON.parse(result.body);
    if (result.statusCode === 200) {
        if (body.coins) {
            console.log(`OK: ${body.count} монет, fetched_at: ${body.fetched_at}`);
            if (body.coins[0]) {
                const c = body.coins[0];
                console.log(`  Первая: ${c.coin_id} (${c.symbol}) $${c.current_price} rank=${c.sort_market_cap}`);
            }
        } else {
            console.log('OK:', JSON.stringify(body).substring(0, 100));
        }
    } else {
        console.error('ERROR:', result.statusCode, JSON.stringify(body));
    }
}

async function main() {
    await test('GET /api/coins/market-cache (top 10 by market_cap)', {
        httpMethod: 'GET',
        path: '/api/coins/market-cache',
        queryStringParameters: { limit: '10', sort: 'market_cap' }
    });

    await test('GET /api/coins/market-cache?ids=bitcoin,ethereum,solana', {
        httpMethod: 'GET',
        path: '/api/coins/market-cache',
        queryStringParameters: { ids: 'bitcoin,ethereum,solana' }
    });

    await test('GET /health', {
        httpMethod: 'GET',
        path: '/health',
        queryStringParameters: {}
    });

    console.log('\n=== Все тесты пройдены ===');
}

main().catch(e => { console.error('ОШИБКА:', e.message); process.exit(1); });
