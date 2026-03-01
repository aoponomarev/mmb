/**
 * Локальный тест: загружает 1 страницу (50 монет) по market_cap и сохраняет в БД
 * Использует DB_PASSWORD из env или хардкод для теста
 */
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '********';

// Патчим handler чтобы загрузить только 1 страницу
const https = require('https');
const { Client } = require('pg');

const DB_CONFIG = {
    host: 'rc1b-dgs1vgc130gbme2n.mdb.yandexcloud.net',
    port: 6432, database: 'app_db', user: 'app_admin', password: process.env.DB_PASSWORD || '********',
    ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000
};

function fetchJson(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers, timeout: 30000 }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 429) { reject(Object.assign(new Error('429'), { status: 429, retryAfter: 60 })); return; }
                if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
                try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
}

async function main() {
    console.log('=== Тест: 1 страница (50 монет) по market_cap ===');
    const params = new URLSearchParams({
        vs_currency: 'usd', order: 'market_cap_desc', per_page: '50', page: '1',
        sparkline: 'false', price_change_percentage: '1h,24h,7d,14d,30d,200d'
    });
    const url = 'https://api.coingecko.com/api/v3/coins/markets?' + params;
    const headers = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

    const coins = await fetchJson(url, headers);
    console.log('Получено монет:', coins.length, '| Первая:', coins[0]?.id, coins[0]?.current_price);

    const client = new Client(DB_CONFIG);
    await client.connect();

    const now = new Date();
    let saved = 0;
    for (let i = 0; i < coins.length; i++) {
        const coin = coins[i];
        const pv1h   = parseFloat(coin.price_change_percentage_1h_in_currency  ?? 0) || 0;
        const pv24h  = parseFloat(coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h ?? 0) || 0;
        const pv7d   = parseFloat(coin.price_change_percentage_7d_in_currency  ?? coin.price_change_percentage_7d  ?? 0) || 0;
        const pv14d  = parseFloat(coin.price_change_percentage_14d_in_currency ?? coin.price_change_percentage_14d ?? 0) || 0;
        const pv30d  = parseFloat(coin.price_change_percentage_30d_in_currency ?? coin.price_change_percentage_30d ?? 0) || 0;
        const pv200d = parseFloat(coin.price_change_percentage_200d_in_currency ?? coin.price_change_percentage_200d ?? 0) || 0;

        await client.query(`
            INSERT INTO coin_market_cache (
                coin_id, symbol, name, image, current_price, market_cap, market_cap_rank, total_volume,
                pv_1h, pv_24h, pv_7d, pv_14d, pv_30d, pv_200d, sort_market_cap, sort_volume, fetched_at, updated_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)
            ON CONFLICT (coin_id) DO UPDATE SET
                current_price=EXCLUDED.current_price, market_cap=EXCLUDED.market_cap,
                total_volume=EXCLUDED.total_volume, pv_1h=EXCLUDED.pv_1h, pv_24h=EXCLUDED.pv_24h,
                pv_7d=EXCLUDED.pv_7d, pv_14d=EXCLUDED.pv_14d, pv_30d=EXCLUDED.pv_30d, pv_200d=EXCLUDED.pv_200d,
                sort_market_cap=EXCLUDED.sort_market_cap, fetched_at=EXCLUDED.fetched_at, updated_at=EXCLUDED.updated_at
        `, [coin.id, coin.symbol, coin.name, coin.image||null, coin.current_price||null, coin.market_cap||null,
            coin.market_cap_rank||null, coin.total_volume||null, pv1h, pv24h, pv7d, pv14d, pv30d, pv200d,
            i+1, null, now]);
        saved++;
    }

    const countRes = await client.query('SELECT COUNT(*) FROM coin_market_cache');
    console.log('Сохранено:', saved, '| Всего в кэше:', countRes.rows[0].count);

    // Проверяем первые 3 монеты
    const sample = await client.query('SELECT coin_id, symbol, current_price, pv_24h, sort_market_cap FROM coin_market_cache ORDER BY sort_market_cap LIMIT 3');
    console.log('Топ-3 из БД:', sample.rows);

    await client.end();
    console.log('=== Тест успешен ===');
}

main().catch(e => { console.error('ОШИБКА:', e.message); process.exit(1); });
