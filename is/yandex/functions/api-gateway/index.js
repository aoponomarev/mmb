/**
 * #JS-HS3kQFDc
 * @description Yandex Cloud Function: API layer for PostgreSQL (health + CRUD); secrets outside repo.
 * @skill id:sk-73dcca
 * @see id:sk-7cf3f7
 *
 * PURPOSE: Health check, market-cache reads, and CRUD over PostgreSQL; invoked via API Gateway (OpenAPI spec in Yandex Cloud).
 *
 * ENV VARS:
 * - DB_HOST, DB_PORT (default 6432), DB_NAME, DB_USER, DB_PASSWORD
 * - Values from secrets dir or Yandex Console (not in repo)
 */
const { Client } = require('pg');
const https = require('https');

const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 6432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
};

const CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const COINGECKO_FETCHER_URL = process.env.COINGECKO_FETCHER_URL || '';

function invokeCoingeckoFetcher(order) {
    return new Promise((resolve, reject) => {
        if (!COINGECKO_FETCHER_URL) {
            reject(new Error('COINGECKO_FETCHER_URL is not configured'));
            return;
        }

        const url = new URL(COINGECKO_FETCHER_URL);
        const payload = JSON.stringify({ order });

        const options = {
            method: 'POST',
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + (url.search || ''),
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            },
            timeout: 30000
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => {
                try {
                    const json = body ? JSON.parse(body) : {};
                    resolve({ statusCode: res.statusCode || 200, body: json });
                } catch (e) {
                    resolve({ statusCode: res.statusCode || 200, body: { raw: body } });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('invokeCoingeckoFetcher timeout'));
        });

        req.write(payload);
        req.end();
    });
}

async function ensureCoinCacheHistoryTable(client) {
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

async function ensureCoinCacheTimestampColumns(client) {
    await client.query(`
        ALTER TABLE coin_market_cache
        ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMPTZ DEFAULT NOW()
    `);
    await client.query(`
        ALTER TABLE coin_market_cache
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()
    `);
}

module.exports.handler = async function (event, context) {
    const method =
        event.httpMethod ||
        event.method ||
        event?.requestContext?.http?.method ||
        'GET';

    const path =
        (event.path && event.path !== '/{proxy+}' ? event.path : null) ||
        event?.requestContext?.http?.path ||
        event?.requestContext?.path ||
        (event?.params?.proxy ? '/' + event.params.proxy : null) ||
        (event?.pathParameters?.proxy ? '/' + event.pathParameters.proxy : null) ||
        event.url ||
        event.rawPath ||
        event.path ||
        '';

    if (method === 'OPTIONS') {
        return { statusCode: 204, headers: CORS_HEADERS, body: '' };
    }

    const client = new Client(dbConfig);

        try {
            await client.connect();

            // 1. Health Check
        if (path === '/health' || path.endsWith('/health')) {
            const res = await client.query('SELECT NOW()');
            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify({ status: 'OK', server_time: res.rows[0].now })
            };
        }

        // 2. User Sync (Upsert)
        // POST /api/users/sync
            if (path.endsWith('/api/users/sync') && method === 'POST') {
                const body = JSON.parse(event.body || '{}');
                const { id, email, name, settings } = body;

                if (!id || !email) {
                return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing id or email' }) };
            }

            const query = `
                INSERT INTO users (id, email, name, settings, updated_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE
                SET email = EXCLUDED.email, name = EXCLUDED.name, settings = EXCLUDED.settings, updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            const res = await client.query(query, [id, email, name, settings || {}]);

            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify(res.rows[0])
            };
        }

        // 3. Portfolios
        // GET /api/portfolios?user_id=...
        if (path.endsWith('/api/portfolios') && method === 'GET') {
            const userId = event.queryStringParameters?.user_id || event?.params?.user_id;
            if (!userId) {
                return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing user_id' }) };
            }

            const res = await client.query('SELECT * FROM portfolios WHERE user_id = $1 AND is_deleted = FALSE ORDER BY updated_at DESC', [userId]);
            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify(res.rows)
            };
        }

        // POST /api/portfolios (Create/Update)
        if (path.endsWith('/api/portfolios') && method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { id, user_id, name, model_version_id, settings, model_mix_json } = body;

            if (!user_id || !name) {
                return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing user_id or name' }) };
            }

            const query = `
                INSERT INTO portfolios (id, user_id, name, model_version_id, settings, model_mix_json, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE
                SET name = EXCLUDED.name, settings = EXCLUDED.settings, model_mix_json = EXCLUDED.model_mix_json, updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            const res = await client.query(query, [id, user_id, name, model_version_id, settings, model_mix_json || {}]);

            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify(res.rows[0])
            };
        }

        // 4. Snapshots
        // POST /api/snapshots/batch
        if (path.endsWith('/api/snapshots/batch') && method === 'POST') {
            const body = JSON.parse(event.body || '{}');
            const { portfolio_id, market, assets, metrics } = body;

            if (!portfolio_id) {
                return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing portfolio_id' }) };
            }

            await client.query('BEGIN');
            try {
                // 1. Market Snapshot
                let marketSnapshotId = null;
                if (market) {
                    marketSnapshotId = market.id || `MS-${portfolio_id}`;
                    const marketQuery = `
                        INSERT INTO market_snapshots (id, fgi, btc_dom, oi, fr, lsr, vix, vix_available)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT (id) DO UPDATE SET fgi = EXCLUDED.fgi, btc_dom = EXCLUDED.btc_dom
                        RETURNING id
                    `;
                    await client.query(marketQuery, [
                        marketSnapshotId, market.fgi, market.btc_dom,
                        market.oi, market.fr, market.lsr, market.vix, market.vix_available
                    ]);

                    // Update portfolio reference
                    await client.query('UPDATE portfolios SET market_snapshot_id = $1 WHERE id = $2', [marketSnapshotId, portfolio_id]);
                }

                // 2. Asset Snapshots
                if (Array.isArray(assets)) {
                    for (const asset of assets) {
                        const assetQuery = `
                            INSERT INTO asset_snapshots (id, coin_id, ticker, name, price, market_cap, volume_24h, pv_1h, pv_24h, pv_7d, pv_14d, pv_30d, pv_200d, extra_json)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                            ON CONFLICT (id) DO NOTHING
                        `;
                        await client.query(assetQuery, [
                            asset.id, asset.coin_id, asset.ticker, asset.name,
                            asset.price, asset.market_cap, asset.volume_24h,
                            asset.pv_1h, asset.pv_24h, asset.pv_7d, asset.pv_14d, asset.pv_30d, asset.pv_200d,
                            asset.extra_json || {}
                        ]);
                    }
                }

                // 3. Metric Snapshots
                if (Array.isArray(metrics)) {
                    for (const metric of metrics) {
                        const metricQuery = `
                            INSERT INTO metric_snapshots (id, model_version_id, agr_final, agr_long, agr_short, a_metric, i_metric, r_metric, din, cgr, cpt, cdh, cmd, median_din, agr_method_used)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                            ON CONFLICT (id) DO NOTHING
                        `;
                        await client.query(metricQuery, [
                            metric.id, metric.model_version_id, metric.agr_final, metric.agr_long, metric.agr_short,
                            metric.a_metric, metric.i_metric, metric.r_metric, metric.din, metric.cgr, metric.cpt,
                            metric.cdh, metric.cmd, metric.median_din, metric.agr_method_used
                        ]);
                    }
                }

                // 4. Portfolio Assets (Links)
                if (Array.isArray(assets) && Array.isArray(metrics)) {
                    // Clear old links for this portfolio before update
                    await client.query('DELETE FROM portfolio_assets WHERE portfolio_id = $1', [portfolio_id]);

                    for (let i = 0; i < assets.length; i++) {
                        const asset = assets[i];
                        const metric = metrics.find(m => m.coin_id === asset.coin_id) || metrics[i];

                        const linkQuery = `
                            INSERT INTO portfolio_assets (portfolio_id, coin_id, ticker, asset_snapshot_id, metric_snapshot_id, weight, delegated_model_id)
                            VALUES ($1, $2, $3, $4, $5, $6, $7)
                        `;
                        await client.query(linkQuery, [
                            portfolio_id, asset.coin_id, asset.ticker, asset.id, metric.id, asset.weight || 0, metric.model_version_id
                        ]);
                    }
                }

                await client.query('COMMIT');
                return {
                    statusCode: 200,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ status: 'OK', portfolio_id })
                };
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
        }

        // 5. Coin Market Cache (CoinGecko cron data)
        // GET /api/coins/market-cache?sort=market_cap&limit=250
        // GET /api/coins/market-cache?ids=bitcoin,ethereum,solana
        // GET /api/coins/market-cache?ids=bitcoin,ethereum&include_prev=true
        if (path.endsWith('/api/coins/market-cache') && method === 'GET') {
            const qp = event.queryStringParameters || event.params || {};
            const ids = qp.ids ? String(qp.ids).split(',').map(s => s.trim()).filter(Boolean) : null;
            const sort = qp.sort || 'market_cap';
            const limit = Math.min(parseInt(qp.limit || '250'), 1000);
            const includePrev = qp.include_prev === 'true';
            const countOnly = qp.count_only === 'true';

            // Light query only for coin count in DB (no data)
            if (countOnly) {
                const cntRes = await client.query(
                    `SELECT COUNT(DISTINCT coin_id) AS total_count,
                            MAX(fetched_at) AS fetched_at
                     FROM coin_market_cache`
                );
                return {
                    statusCode: 200,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({
                        count: parseInt(cntRes.rows[0]?.total_count || '0'),
                        fetched_at: cntRes.rows[0]?.fetched_at || null
                    })
                };
            }

            let query, params;
            if (ids && ids.length > 0) {
                query = `SELECT * FROM coin_market_cache WHERE coin_id = ANY($1) ORDER BY COALESCE(sort_market_cap, 9999)`;
                params = [ids];
            } else if (sort === 'volume') {
                // sort_volume (cron rank, 1=best) has priority; if NULL — fallback by total_volume DESC
                query = `SELECT * FROM coin_market_cache
                         ORDER BY sort_volume ASC NULLS LAST, total_volume DESC NULLS LAST
                         LIMIT $1`;
                params = [limit];
            } else {
                query = `SELECT * FROM coin_market_cache WHERE sort_market_cap IS NOT NULL ORDER BY sort_market_cap LIMIT $1`;
                params = [limit];
            }

            const res = await client.query(query, params);
            const fetchedAt = res.rows[0]?.fetched_at || null;

            const response = { coins: res.rows, count: res.rows.length, fetched_at: fetchedAt };

            if (includePrev) {
                try {
                    const cyclesRes = await client.query(
                        `SELECT DISTINCT cycle_id FROM coin_market_cache_history ORDER BY cycle_id DESC LIMIT 2`
                    );
                    const cycles = cyclesRes.rows.map(r => r.cycle_id);

                    if (cycles.length >= 2) {
                        const prevCycleId = cycles[1];
                        const coinIds = ids || res.rows.map(r => r.coin_id);

                        const prevRes = await client.query(
                            `SELECT DISTINCT ON (coin_id) *
                             FROM coin_market_cache_history
                             WHERE cycle_id = $1 AND coin_id = ANY($2)
                             ORDER BY coin_id, sort_rank`,
                            [prevCycleId, coinIds]
                        );
                        response.prev_cycle = {
                            cycle_id: prevCycleId,
                            coins: prevRes.rows,
                            count: prevRes.rows.length
                        };
                    }
                    response.cycles_available = cycles;
                } catch (histErr) {
                    console.warn('[coins-db-gateway] History query failed (table may not exist yet):', histErr.message);
                    response.prev_cycle = null;
                    response.cycles_available = [];
                }
            }

            return {
                statusCode: 200,
                headers: CORS_HEADERS,
                body: JSON.stringify(response)
            };
        }

        // 6. POST /api/coins/market-cache — upsert coins from browser (CoinGecko fallback)
        // @causality #for-readonly-fallbacks
        // Removed to prevent browser from polluting SSOT cache/history table. Fallbacks must be Read-Only.
        if (path.endsWith('/api/coins/market-cache') && method === 'POST') {
            return {
                statusCode: 403,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: 'Browser fallback writes are disabled by architecture' })
            };
        }

        // 7. Cycle info endpoint
        // GET /api/coins/cycles
        if (path.endsWith('/api/coins/cycles') && method === 'GET') {
            try {
                const cyclesRes = await client.query(`
                    SELECT cycle_id,
                           COUNT(*) as row_count,
                           COUNT(DISTINCT coin_id) as coin_count,
                           MIN(sort_type) as sort_type,
                           MIN(fetched_at) as started_at,
                           MAX(fetched_at) as finished_at
                    FROM coin_market_cache_history
                    GROUP BY cycle_id
                    ORDER BY cycle_id DESC
                    LIMIT 5
                `);
                return {
                    statusCode: 200,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ cycles: cyclesRes.rows })
                };
            } catch (histErr) {
                return {
                    statusCode: 200,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ cycles: [], note: 'History table not yet created' })
                };
            }
        }

        // 8. Manual trigger for coingecko-fetcher (on-demand cap/volume ingest)
        // POST /api/coins/market-cache/trigger  { order: "market_cap" | "volume" }
        if (path.endsWith('/api/coins/market-cache/trigger') && method === 'POST') {
            let order = 'market_cap';
            try {
                const body = JSON.parse(event.body || '{}');
                if (body.order === 'volume') {
                    order = 'volume';
                }
            } catch (e) {
                // Fallback to default order; malformed body is treated as market_cap.
            }

            try {
                const result = await invokeCoingeckoFetcher(order);
                return {
                    statusCode: result.statusCode,
                    headers: CORS_HEADERS,
                    body: JSON.stringify(result.body)
                };
            } catch (invokeErr) {
                return {
                    statusCode: 503,
                    headers: CORS_HEADERS,
                    body: JSON.stringify({ error: 'Failed to invoke coingecko-fetcher', message: invokeErr.message })
                };
            }
        }

        return {
            statusCode: 404,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Endpoint not found', path, method })
        };
        } catch (error) {
            console.error('Database error:', error);
            return {
                statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal Server Error', message: error.message })
        };
    } finally {
        await client.end().catch(() => {});
    }
};
