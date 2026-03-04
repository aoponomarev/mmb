/**
 * #JS-3w3f6pz7
 * @description Yandex Cloud Function (cron): CoinGecko top-250 → coin_market_cache_history + coin_market_cache; rotate 2 cycles; 06:00–24:00 MSK.
 */

'use strict';

const https = require('https');
const { Client } = require('pg');

// ─── Configuration ──────────────────────────────────────────────────────────────

const DB_CONFIG = {
    host:     process.env.DB_HOST     || 'rc1b-dgs1vgc130gbme2n.mdb.yandexcloud.net',
    port:     parseInt(process.env.DB_PORT || '6432'),
    database: process.env.DB_NAME     || 'app_db',
    user:     process.env.DB_USER     || 'app_admin',
    password: process.env.DB_PASSWORD || '',
    ssl:      { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    statement_timeout: 30000
};

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || '';
const CHUNK_SIZE = 50;
const CHUNK_DELAY_MS = 21000;
const CHUNK_DELAY_WITH_KEY_MS = 2500;
const REQUEST_TIMEOUT_MS = 30000;

const MSK_WINDOW_START_HOUR = 6;   // 06:00 MSK
const MSK_WINDOW_END_HOUR   = 24;  // 24:00 MSK (midnight)
const MAX_CYCLES_KEPT = 2;

// ─── MSK time gate ─────────────────────────────────────────────────────────────

function getMoscowHour() {
    const now = new Date();
    const mskOffsetMs = 3 * 60 * 60 * 1000;
    const msk = new Date(now.getTime() + mskOffsetMs + now.getTimezoneOffset() * 60 * 1000);
    return { hour: msk.getHours(), iso: msk.toISOString().replace('Z', '+03:00') };
}

function isInsideMskWindow() {
    const { hour } = getMoscowHour();
    return hour >= MSK_WINDOW_START_HOUR && hour < MSK_WINDOW_END_HOUR;
}

// ─── HTTP helper ───────────────────────────────────────────────────────────────

function fetchJson(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers, timeout: REQUEST_TIMEOUT_MS }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 429) {
                    const retryAfter = parseInt(res.headers['retry-after'] || '60');
                    reject(Object.assign(new Error('Rate limit exceeded'), { status: 429, retryAfter }));
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(Object.assign(new Error(`HTTP ${res.statusCode}`), { status: res.statusCode }));
                    return;
                }
                try { resolve(JSON.parse(body)); }
                catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── CoinGecko fetcher ─────────────────────────────────────────────────────────

async function fetchTopCoinsPage(page, order) {
    const params = new URLSearchParams({
        vs_currency: 'usd',
        order: order === 'volume' ? 'volume_desc' : 'market_cap_desc',
        per_page: String(CHUNK_SIZE),
        page: String(page),
        sparkline: 'false',
        price_change_percentage: '1h,24h,7d,14d,30d,200d'
    });

    if (COINGECKO_API_KEY) {
        params.set('x_cg_demo_api_key', COINGECKO_API_KEY);
    }

    const url = `https://api.coingecko.com/api/v3/coins/markets?${params}`;
    const headers = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    if (COINGECKO_API_KEY) {
        headers['x-cg-demo-api-key'] = COINGECKO_API_KEY;
    }

    return fetchJson(url, headers);
}

async function fetchTop250(order) {
    const allCoins = [];
    const delayMs = COINGECKO_API_KEY ? CHUNK_DELAY_WITH_KEY_MS : CHUNK_DELAY_MS;
    const totalPages = 5;

    console.log(`[fetcher] Loading top-250 by ${order} (${totalPages} pages x ${CHUNK_SIZE}, delay ${delayMs}ms)...`);

    for (let page = 1; page <= totalPages; page++) {
        try {
            const coins = await fetchTopCoinsPage(page, order);
            if (!Array.isArray(coins) || coins.length === 0) {
                console.warn(`[fetcher] Page ${page}/${order}: empty response, stopping`);
                break;
            }
            allCoins.push(...coins);
            console.log(`[fetcher] Page ${page}/${totalPages} (${order}): +${coins.length} (total ${allCoins.length})`);
        } catch (err) {
            if (err.status === 429) {
                console.warn(`[fetcher] 429 on page ${page}/${order}, waiting ${err.retryAfter}s...`);
                await sleep(err.retryAfter * 1000 + 1000);
                page--;
                continue;
            }
            console.error(`[fetcher] Error page ${page}/${order}:`, err.message);
            throw err;
        }

        if (page < totalPages) {
            await sleep(delayMs);
        }
    }

    return allCoins;
}

// ─── PostgreSQL: schema bootstrap ──────────────────────────────────────────────

async function ensureHistoryTable(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS coin_market_cache_history (
            id           BIGSERIAL PRIMARY KEY,
            cycle_id     TEXT NOT NULL,
            coin_id      TEXT NOT NULL,
            symbol       TEXT,
            name         TEXT,
            image        TEXT,
            current_price    NUMERIC,
            market_cap       NUMERIC,
            market_cap_rank  INTEGER,
            total_volume     NUMERIC,
            pv_1h        NUMERIC DEFAULT 0,
            pv_24h       NUMERIC DEFAULT 0,
            pv_7d        NUMERIC DEFAULT 0,
            pv_14d       NUMERIC DEFAULT 0,
            pv_30d       NUMERIC DEFAULT 0,
            pv_200d      NUMERIC DEFAULT 0,
            sort_type    TEXT NOT NULL,
            sort_rank    INTEGER NOT NULL,
            fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_history_cycle_coin
        ON coin_market_cache_history (cycle_id, coin_id)
    `);
    await client.query(`
        CREATE INDEX IF NOT EXISTS idx_history_cycle_sort
        ON coin_market_cache_history (cycle_id, sort_type, sort_rank)
    `);
}

// ─── PostgreSQL: write cycle ───────────────────────────────────────────────────

function parsePV(coin, period) {
    return parseFloat(
        coin[`price_change_percentage_${period}_in_currency`]
        ?? coin[`price_change_percentage_${period}`]
        ?? 0
    ) || 0;
}

async function insertHistoryCycle(client, cycleId, coins, sortType) {
    if (!coins.length) return;

    const now = new Date();
    let inserted = 0;

    for (let i = 0; i < coins.length; i++) {
        const coin = coins[i];
        const rank = i + 1;

        await client.query(`
            INSERT INTO coin_market_cache_history
                (cycle_id, coin_id, symbol, name, image,
                 current_price, market_cap, market_cap_rank, total_volume,
                 pv_1h, pv_24h, pv_7d, pv_14d, pv_30d, pv_200d,
                 sort_type, sort_rank, fetched_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        `, [
            cycleId,
            coin.id, coin.symbol, coin.name, coin.image || null,
            coin.current_price || null, coin.market_cap || null,
            coin.market_cap_rank || null, coin.total_volume || null,
            parsePV(coin, '1h'), parsePV(coin, '24h'), parsePV(coin, '7d'),
            parsePV(coin, '14d'), parsePV(coin, '30d'), parsePV(coin, '200d'),
            sortType, rank, now
        ]);
        inserted++;
    }

    console.log(`[fetcher] History insert (${sortType}): ${inserted} rows for cycle ${cycleId}`);
}

// ─── PostgreSQL: update latest cache from cycle ────────────────────────────────

async function refreshLatestCacheFromCycle(client, cycleId) {
    await client.query(`
        INSERT INTO coin_market_cache
            (coin_id, symbol, name, image,
             current_price, market_cap, market_cap_rank, total_volume,
             pv_1h, pv_24h, pv_7d, pv_14d, pv_30d, pv_200d,
             sort_market_cap, sort_volume, fetched_at, updated_at)
        SELECT
            h.coin_id, h.symbol, h.name, h.image,
            h.current_price, h.market_cap, h.market_cap_rank, h.total_volume,
            h.pv_1h, h.pv_24h, h.pv_7d, h.pv_14d, h.pv_30d, h.pv_200d,
            CASE WHEN h.sort_type = 'market_cap' THEN h.sort_rank ELSE NULL END,
            CASE WHEN h.sort_type = 'volume'     THEN h.sort_rank ELSE NULL END,
            h.fetched_at, NOW()
        FROM coin_market_cache_history h
        WHERE h.cycle_id = $1
        ON CONFLICT (coin_id) DO UPDATE SET
            symbol          = EXCLUDED.symbol,
            name            = EXCLUDED.name,
            image           = EXCLUDED.image,
            current_price   = EXCLUDED.current_price,
            market_cap      = EXCLUDED.market_cap,
            market_cap_rank = EXCLUDED.market_cap_rank,
            total_volume    = EXCLUDED.total_volume,
            pv_1h           = EXCLUDED.pv_1h,
            pv_24h          = EXCLUDED.pv_24h,
            pv_7d           = EXCLUDED.pv_7d,
            pv_14d          = EXCLUDED.pv_14d,
            pv_30d          = EXCLUDED.pv_30d,
            pv_200d         = EXCLUDED.pv_200d,
            sort_market_cap = COALESCE(EXCLUDED.sort_market_cap, coin_market_cache.sort_market_cap),
            sort_volume     = COALESCE(EXCLUDED.sort_volume,     coin_market_cache.sort_volume),
            fetched_at      = EXCLUDED.fetched_at,
            updated_at      = EXCLUDED.updated_at
    `, [cycleId]);

    console.log(`[fetcher] Latest cache refreshed from cycle ${cycleId}`);
}

// ─── PostgreSQL: rotate old cycles ─────────────────────────────────────────────

async function rotateOldCycles(client) {
    const res = await client.query(`
        SELECT DISTINCT cycle_id
        FROM coin_market_cache_history
        ORDER BY cycle_id DESC
        LIMIT $1
    `, [MAX_CYCLES_KEPT]);

    const keepIds = res.rows.map(r => r.cycle_id);
    if (keepIds.length < MAX_CYCLES_KEPT) {
        console.log(`[fetcher] Only ${keepIds.length} cycle(s) in history, no rotation needed`);
        return 0;
    }

    const delRes = await client.query(`
        DELETE FROM coin_market_cache_history
        WHERE cycle_id NOT IN (SELECT DISTINCT cycle_id FROM coin_market_cache_history ORDER BY cycle_id DESC LIMIT $1)
    `, [MAX_CYCLES_KEPT]);

    const deleted = delRes.rowCount || 0;
    if (deleted > 0) {
        console.log(`[fetcher] Rotated ${deleted} old history rows, kept cycles: ${keepIds.join(', ')}`);
    }
    return deleted;
}

// ─── Main handler ──────────────────────────────────────────────────────────────

module.exports.handler = async function (event, context) {
    const startTime = Date.now();
    const msk = getMoscowHour();
    console.log(`[fetcher] Start: ${new Date().toISOString()}, MSK time: ${msk.iso} (hour=${msk.hour})`);

    if (!isInsideMskWindow()) {
        console.log(`[fetcher] SKIPPED: MSK hour ${msk.hour} is outside allowed window [${MSK_WINDOW_START_HOUR}:00, ${MSK_WINDOW_END_HOUR}:00)`);
        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'SKIPPED',
                reason: `Outside MSK time window [${MSK_WINDOW_START_HOUR}:00-${MSK_WINDOW_END_HOUR}:00)`,
                msk_hour: msk.hour,
                msk_time: msk.iso,
                timestamp: new Date().toISOString()
            })
        };
    }

    const cycleId = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    console.log(`[fetcher] Cycle ID: ${cycleId}`);

    const client = new Client(DB_CONFIG);

    try {
        await client.connect();
        console.log('[fetcher] DB connected');

        await ensureHistoryTable(client);

        // 1. Fetch top-250 by market_cap
        const byMarketCap = await fetchTop250('market_cap');
        await insertHistoryCycle(client, cycleId, byMarketCap, 'market_cap');

        // Pause between two series
        const pauseMs = COINGECKO_API_KEY ? CHUNK_DELAY_WITH_KEY_MS : CHUNK_DELAY_MS;
        console.log(`[fetcher] Pause ${pauseMs}ms before volume fetch...`);
        await sleep(pauseMs);

        // 2. Fetch top-250 by volume
        const byVolume = await fetchTop250('volume');
        await insertHistoryCycle(client, cycleId, byVolume, 'volume');

        // 3. Refresh latest cache table from this cycle
        await refreshLatestCacheFromCycle(client, cycleId);

        // 4. Rotate old cycles (keep only last N)
        await rotateOldCycles(client);

        // 5. Stats
        const countRes = await client.query('SELECT COUNT(*) FROM coin_market_cache');
        const histRes = await client.query('SELECT COUNT(DISTINCT cycle_id) as cycles FROM coin_market_cache_history');
        const totalCoins = parseInt(countRes.rows[0].count);
        const totalCycles = parseInt(histRes.rows[0].cycles);

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`[fetcher] Done in ${elapsed}s. Cache: ${totalCoins} coins, History: ${totalCycles} cycles`);

        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'OK',
                cycle_id: cycleId,
                elapsed_sec: elapsed,
                market_cap_fetched: byMarketCap.length,
                volume_fetched: byVolume.length,
                total_in_cache: totalCoins,
                history_cycles: totalCycles,
                timestamp: new Date().toISOString()
            })
        };

    } catch (err) {
        console.error('[fetcher] ERROR:', err.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ status: 'ERROR', cycle_id: cycleId, error: err.message })
        };
    } finally {
        await client.end().catch(() => {});
    }
};
