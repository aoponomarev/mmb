/**
 * #JS-3w3f6pz7
 * @description Yandex Cloud Function (cron): CoinGecko top-250 cap/vol + registry (wrapped/lst/commodity, stablecoins) → coin_market_cache + coin_registry.
 *
 * MODES: market_cap, volume (top-250 + history); registry_wlc (wrapped/lst/commodity); registry_fiat (stablecoins per-currency peg).
 * Schedule: :00 cap, :15 registry_wlc, :30 vol, :45 registry_fiat.
 * WLC categories: wrapped-tokens, liquid-staking, tokenized-gold, tokenized-silver, tokenized-commodities.
 * Fiat categories: eur/gbp/jpy/chf/cny/try/rub-stablecoin, then stablecoins catch-all (peg=usd).
 *
 * ENV VARS: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD; COINGECKO_API_KEY (optional).
 */

'use strict';

const https = require('https');
const { Client } = require('pg');
const { PostgresAdapter } = require('../shared/postgres-adapter');

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
const CHUNK_SIZE = 250;
const CHUNK_DELAY_MS = 21000;
const CHUNK_DELAY_WITH_KEY_MS = 2500;
const REQUEST_TIMEOUT_MS = 30000;

const MSK_WINDOW_START_HOUR = 6;   // 06:00 MSK
const MSK_WINDOW_END_HOUR   = 24;  // 24:00 MSK (midnight)
const MAX_CYCLES_KEPT = 8;

// ─── MSK time window ────────────────────────────────────────────────────────────

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

function readManualPayload(event) {
    const bodyRaw = event?.body;
    if (typeof bodyRaw === 'string' && bodyRaw.trim()) {
        return JSON.parse(bodyRaw);
    }
    if (bodyRaw && typeof bodyRaw === 'object') {
        return bodyRaw;
    }
    return null;
}

const VALID_MODES = ['market_cap', 'volume', 'registry_wlc', 'registry_fiat'];

function resolveModeFromEvent(event) {
    try {
        const manualPayload = readManualPayload(event);
        if (VALID_MODES.includes(manualPayload?.mode)) {
            return manualPayload.mode;
        }
        if (manualPayload?.order === 'market_cap' || manualPayload?.order === 'volume') {
            return manualPayload.order;
        }
    } catch (e) {
        // Ignore malformed payload
    }

    if (VALID_MODES.includes(event?.mode)) return event.mode;
    if (event?.order === 'market_cap' || event?.order === 'volume') return event.order;

    // @causality #for-trigger-minute-routing
    const minute = new Date().getMinutes();
    if (minute < 15) return 'market_cap';
    if (minute < 30) return 'registry_wlc';
    if (minute < 45) return 'volume';
    return 'registry_fiat';
}

function shouldBypassTimeWindow(event) {
    try {
        const manualPayload = readManualPayload(event);
        return manualPayload?.deploy_verification === true || manualPayload?.bypass_window === true;
    } catch (_) {
        return false;
    }
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
    const totalPages = 1;

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

// ─── CoinGecko: fetch by category (id:ais-82c9d0, id:ais-e41384) ───────────────

async function fetchCategoryCoins(category, page = 1) {
    const params = new URLSearchParams({
        vs_currency: 'usd',
        category,
        per_page: '250',
        page: String(page),
        sparkline: 'false',
        price_change_percentage: '1h,24h,7d,14d,30d,200d'
    });
    if (COINGECKO_API_KEY) params.set('x_cg_demo_api_key', COINGECKO_API_KEY);

    const url = `https://api.coingecko.com/api/v3/coins/markets?${params}`;
    const headers = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' };
    if (COINGECKO_API_KEY) headers['x-cg-demo-api-key'] = COINGECKO_API_KEY;

    return fetchJson(url, headers);
}

// ─── PostgreSQL: schema bootstrap ──────────────────────────────────────────────

async function ensureCoinRegistryTable(client) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS coin_registry (
            coin_id TEXT NOT NULL,
            type TEXT NOT NULL,
            peg TEXT,
            source_category TEXT NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (coin_id)
        )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_coin_registry_type ON coin_registry (type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_coin_registry_updated ON coin_registry (updated_at)`);
}

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

// ─── PostgreSQL: direct upsert to market cache (registry modes, no history) ───────

async function upsertCoinsToMarketCache(client, coins) {
    if (!coins.length) return 0;
    const delayMs = COINGECKO_API_KEY ? CHUNK_DELAY_WITH_KEY_MS : CHUNK_DELAY_MS;

    for (let i = 0; i < coins.length; i++) {
        const coin = coins[i];
        await client.query(`
            INSERT INTO coin_market_cache
                (coin_id, symbol, name, image, current_price, market_cap, market_cap_rank, total_volume,
                 pv_1h, pv_24h, pv_7d, pv_14d, pv_30d, pv_200d, sort_market_cap, sort_volume, fetched_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NULL,NULL,NOW(),NOW())
            ON CONFLICT (coin_id) DO UPDATE SET
                symbol=EXCLUDED.symbol, name=EXCLUDED.name, image=EXCLUDED.image,
                current_price=EXCLUDED.current_price, market_cap=EXCLUDED.market_cap,
                market_cap_rank=EXCLUDED.market_cap_rank, total_volume=EXCLUDED.total_volume,
                pv_1h=EXCLUDED.pv_1h, pv_24h=EXCLUDED.pv_24h, pv_7d=EXCLUDED.pv_7d,
                pv_14d=EXCLUDED.pv_14d, pv_30d=EXCLUDED.pv_30d, pv_200d=EXCLUDED.pv_200d,
                fetched_at=EXCLUDED.fetched_at, updated_at=NOW()
        `, [
            coin.id, coin.symbol, coin.name, coin.image || null,
            coin.current_price || null, coin.market_cap || null, coin.market_cap_rank || null, coin.total_volume || null,
            parsePV(coin, '1h'), parsePV(coin, '24h'), parsePV(coin, '7d'),
            parsePV(coin, '14d'), parsePV(coin, '30d'), parsePV(coin, '200d')
        ]);
        if ((i + 1) % 50 === 0) await sleep(50);
    }
    return coins.length;
}

// ─── Registry modes (id:ais-82c9d0, id:ais-e41384) ──────────────────────────────

// @causality #for-coingecko-category-wrapped
// Process order: lst first (highest priority), wrapped, then commodities (gold/silver specific, then general).
// First occurrence wins (seenIds) → dedup priority: lst > wrapped > commodity.
// Use wrapped-tokens (NOT asset-backed-tokens); asset-backed = crypto-backed stablecoins.
const REGISTRY_WLC_CATEGORIES = [
    { category: 'liquid-staking', type: 'lst', peg: null },
    { category: 'wrapped-tokens', type: 'wrapped', peg: null },
    { category: 'tokenized-gold', type: 'commodity', peg: 'gold' },
    { category: 'tokenized-silver', type: 'commodity', peg: 'silver' },
    { category: 'tokenized-commodities', type: 'commodity', peg: null },
];

// Per-currency stablecoin categories (specific first, catch-all last).
// Dedup via seenIds: first peg wins; ON CONFLICT DO NOTHING protects existing non-stable entries.
const FIAT_CATEGORIES = [
    { category: 'eur-stablecoin', peg: 'eur' },
    { category: 'gbp-stablecoin', peg: 'gbp' },
    { category: 'jpy-stablecoin', peg: 'jpy' },
    { category: 'chf-stablecoin', peg: 'chf' },
    { category: 'cny-stablecoin', peg: 'cny' },
    { category: 'try-stablecoins', peg: 'try' },
    { category: 'rub-stablecoin', peg: 'rub' },
    { category: 'stablecoins', peg: 'usd' },
];

function detectCommodityPeg(coin) {
    const name = (coin.name || '').toLowerCase();
    const sym = (coin.symbol || '').toLowerCase();
    if (name.includes('platinum') || sym === 'pplt' || sym.startsWith('pplt')) return 'platinum';
    if (name.includes('palladium') || sym === 'pall' || sym.startsWith('pall')) return 'palladium';
    if (name.includes('uranium') || sym.includes('u3o8')) return 'uranium';
    if (name.includes('copper') || sym.startsWith('cper')) return 'copper';
    if (name.includes('oil') || name.includes('crude') || name.includes('petroleum')) return 'oil';
    if (name.includes('gold')) return 'gold';
    if (name.includes('silver')) return 'silver';
    return 'other';
}

async function runRegistryWlc(client) {
    await ensureCoinRegistryTable(client);
    const existingCountRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM coin_registry WHERE type IN ('wrapped','lst','commodity')`);
    const existingCount = Number(existingCountRes.rows?.[0]?.cnt || 0);

    const allCoins = [];
    const seenIds = new Set();
    const toInsert = [];
    const delayMs = COINGECKO_API_KEY ? CHUNK_DELAY_WITH_KEY_MS : CHUNK_DELAY_MS;
    let successCategories = 0;

    for (const { category, type, peg } of REGISTRY_WLC_CATEGORIES) {
        try {
            const coins = await fetchCategoryCoins(category);
            if (!Array.isArray(coins) || coins.length === 0) {
                console.warn(`[fetcher] registry_wlc: ${category} empty`);
                await sleep(delayMs);
                continue;
            }
            successCategories++;
            let added = 0;
            for (const c of coins) {
                const id = (c.id || '').toLowerCase();
                if (!id || seenIds.has(id)) continue;
                seenIds.add(id);
                allCoins.push(c);
                const resolvedPeg = peg !== null ? peg : (type === 'commodity' ? detectCommodityPeg(c) : null);
                toInsert.push({ coin_id: id, type, peg: resolvedPeg, source_category: category });
                added++;
            }
            console.log(`[fetcher] registry_wlc: ${category} → +${added} new (${coins.length} raw, ${toInsert.length} unique total)`);
        } catch (err) {
            if (err.status === 429) {
                const wait = ((err.retryAfter || 60) * 1000) + 1000;
                console.warn(`[fetcher] 429 on ${category}, waiting ${Math.round(wait / 1000)}s`);
                await sleep(wait);
                continue;
            }
            console.error(`[fetcher] registry_wlc ${category}:`, err.message);
        }
        await sleep(delayMs);
    }

    // @causality #for-registry-safety-threshold
    const minimumAllowed = existingCount > 0 ? Math.max(20, Math.floor(existingCount * 0.5)) : 20;
    if (toInsert.length < minimumAllowed) {
        console.warn(`[fetcher] registry_wlc: collected ${toInsert.length}, below safety threshold ${minimumAllowed}; keep previous registry data`);
    } else {
        await client.transaction(async (tx) => {
            await tx.query(`DELETE FROM coin_registry WHERE type IN ('wrapped','lst','commodity')`);
            for (const row of toInsert) {
                await tx.query(`
                    INSERT INTO coin_registry (coin_id, type, peg, source_category, updated_at)
                    VALUES ($1,$2,$3,$4,NOW())
                    ON CONFLICT (coin_id) DO UPDATE SET type=EXCLUDED.type, peg=EXCLUDED.peg, source_category=EXCLUDED.source_category, updated_at=NOW()
                `, [row.coin_id, row.type, row.peg, row.source_category]);
            }
        });
        console.log(`[fetcher] registry_wlc: wrote ${toInsert.length} to coin_registry (${successCategories}/${REGISTRY_WLC_CATEGORIES.length} categories successful)`);
    }

    await upsertCoinsToMarketCache(client, allCoins);
    console.log(`[fetcher] registry_wlc: upserted ${allCoins.length} to coin_market_cache`);
    return toInsert.length;
}

async function runRegistryFiat(client) {
    await ensureCoinRegistryTable(client);
    const existingCountRes = await client.query(`SELECT COUNT(*)::int AS cnt FROM coin_registry WHERE type = 'stable'`);
    const existingCount = Number(existingCountRes.rows?.[0]?.cnt || 0);

    const allCoins = [];
    const seenIds = new Set();
    const toInsert = [];
    const delayMs = COINGECKO_API_KEY ? CHUNK_DELAY_WITH_KEY_MS : CHUNK_DELAY_MS;
    let successCategories = 0;

    for (const { category, peg } of FIAT_CATEGORIES) {
        try {
            const coins = await fetchCategoryCoins(category);
            if (!Array.isArray(coins) || coins.length === 0) {
                console.warn(`[fetcher] registry_fiat: ${category} empty`);
                await sleep(delayMs);
                continue;
            }
            successCategories++;
            let added = 0;
            for (const c of coins) {
                const id = (c.id || '').toLowerCase();
                if (!id || seenIds.has(id)) continue;
                seenIds.add(id);
                allCoins.push(c);
                toInsert.push({ coin_id: id, peg, source_category: category });
                added++;
            }
            console.log(`[fetcher] registry_fiat: ${category} (peg=${peg}) → +${added} new (${coins.length} raw, ${toInsert.length} total)`);
        } catch (err) {
            if (err.status === 429) {
                const wait = ((err.retryAfter || 60) * 1000) + 1000;
                console.warn(`[fetcher] 429 on ${category}, waiting ${Math.round(wait / 1000)}s`);
                await sleep(wait);
                continue;
            }
            console.error(`[fetcher] registry_fiat ${category}:`, err.message);
        }
        await sleep(delayMs);
    }

    // @causality #for-registry-safety-threshold
    const minimumAllowed = existingCount > 0 ? Math.max(50, Math.floor(existingCount * 0.5)) : 50;
    if (toInsert.length < minimumAllowed) {
        console.warn(`[fetcher] registry_fiat: collected ${toInsert.length}, below safety threshold ${minimumAllowed}; keep previous registry data`);
    } else {
        await client.transaction(async (tx) => {
            await tx.query(`DELETE FROM coin_registry WHERE type = 'stable'`);
            for (const row of toInsert) {
                // @causality #for-registry-cross-mode-preservation
                // DO NOTHING protects existing non-stable entries (e.g. PAXG as commodity from registry_wlc)
                await tx.query(`
                    INSERT INTO coin_registry (coin_id, type, peg, source_category, updated_at)
                    VALUES ($1,'stable',$2,$3,NOW())
                    ON CONFLICT (coin_id) DO NOTHING
                `, [row.coin_id, row.peg, row.source_category]);
            }
        });
        console.log(`[fetcher] registry_fiat: wrote ${toInsert.length} to coin_registry (${successCategories}/${FIAT_CATEGORIES.length} categories successful)`);
    }

    await upsertCoinsToMarketCache(client, allCoins);
    console.log(`[fetcher] registry_fiat: upserted ${allCoins.length} to coin_market_cache`);
    return toInsert.length;
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
    const bypassTimeWindow = shouldBypassTimeWindow(event);
    console.log(`[fetcher] Start: ${new Date().toISOString()}, MSK time: ${msk.iso} (hour=${msk.hour})`);

    // @causality #for-deploy-verification-window-bypass
    // Time-windowed ingest needs an explicit verification override so deploy
    // validation does not depend on wall-clock schedule.
    if (!isInsideMskWindow() && !bypassTimeWindow) {
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

    if (!isInsideMskWindow() && bypassTimeWindow) {
        console.log('[fetcher] Deploy verification bypassed MSK time window');
    }

    const cycleId = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    console.log(`[fetcher] Cycle ID: ${cycleId}`);

    const client = new PostgresAdapter(DB_CONFIG, { ClientClass: Client });

    try {
        await client.connect();
        console.log('[fetcher] DB connected');

        const mode = resolveModeFromEvent(event);

        if (mode === 'registry_wlc' || mode === 'registry_fiat') {
            await ensureCoinRegistryTable(client);
            const count = mode === 'registry_wlc'
                ? await runRegistryWlc(client)
                : await runRegistryFiat(client);
            const countRes = await client.query('SELECT COUNT(*) FROM coin_market_cache');
            const totalCoins = parseInt(countRes.rows[0].count);
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            console.log(`[fetcher] Done (${mode}) in ${elapsed}s. Registry: ${count}, cache: ${totalCoins}`);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'OK',
                    mode,
                    registry_written: count,
                    total_in_cache: totalCoins,
                    elapsed_sec: elapsed,
                    timestamp: new Date().toISOString()
                })
            };
        }

        await ensureHistoryTable(client);
        const order = mode;

        const coins = await fetchTop250(order);
        await insertHistoryCycle(client, cycleId, coins, order);
        await refreshLatestCacheFromCycle(client, cycleId);
        await rotateOldCycles(client);

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
                order_fetched: order,
                coins_fetched: coins.length,
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
        await client.close();
    }
};
