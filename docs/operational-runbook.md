# Operational Runbook: Data Contour Monitoring & Troubleshooting

## Pre-Flight Checks

Before investigating any data issue, verify:

1. **Cron is running** — Check Yandex Cloud console for `coingecko-fetcher` invocation logs
2. **DB is reachable** — `GET /health` should return `{ status: "OK", server_time: "..." }`
3. **API Gateway is up** — `GET /api/coins/market-cache?limit=1` should return data
4. **Time window** — Fetcher only runs 06:00-24:00 MSK; night hours return `SKIPPED`

## How to Identify the Current Data Source

Open browser DevTools (Console) and look for log lines during coin loading:

| Log pattern | Meaning |
|-------------|---------|
| `dual-channel: PG phase failed` | PostgreSQL unreachable, using CoinGecko only |
| `PostgreSQL: N coins loaded` | PG delivered N coins successfully |
| `CoinGecko: N/M coins` | CG fetching remaining coins |
| `All coins resolved from PostgreSQL` | PG had everything, CG skipped |
| `data-provider-manager: pg-phase-failed` | fallbackMonitor notification |

## Scenario: CoinGecko 429 (Rate Limited)

**Symptoms:** Progress bar shows "Rate limit: retry in Ns..."

**What happens internally:**
1. `requestRegistry` records the 429 with the actual HTTP status
2. Subsequent requests within `topCoins.requestRegistryMinIntervalMs` (2h SSOT) are blocked
3. UI shows retry countdown from `Retry-After` header

**Actions:**
- Wait for the cooldown (typically 60s for public API)
- If persistent: check if `COINGECKO_API_KEY` is set in the fetcher env vars (30 req/min vs 3 req/60s)
- Check `window.requestRegistry.getLog()` in console for detailed call history

## Scenario: PostgreSQL Down

**Symptoms:** Progress bar only shows yellow (CoinGecko) segment

**What happens:**
1. `getCoinDataDualChannel` catches the PG error
2. `fallbackMonitor.notify({ event: 'pg-phase-failed' })` fires
3. All coins are fetched from CoinGecko (slower, rate-limited)

**Actions:**
- Check Yandex Cloud console for DB connectivity
- Verify `DB_HOST`, `DB_PORT`, `DB_PASSWORD` env vars in app-api function
- Check `GET /health` endpoint directly

## Scenario: Data is Stale (Not Updating)

**Symptoms:** `fetched_at` in `/api/coins/market-cache` is hours old

**Diagnosis:**
1. Check `GET /api/coins/cycles` — are new cycles being created?
2. Check fetcher logs in Yandex Cloud — is it returning `SKIPPED`?
3. Verify the cron trigger is active (Yandex Cloud Triggers page)

**Common causes:**
- Cron trigger disabled in Yandex Cloud
- Night hours (before 06:00 MSK) — expected `SKIPPED`
- CoinGecko outage — fetcher will error, no new cycle created
- DB connection exhausted — `statement_timeout` or connection errors in logs

## Scenario: Mixed/Fallback Data

**Symptoms:** Some coins show `_source: 'yandex-cache'`, others have CoinGecko-style data

**This is expected behavior** when:
- User loads a custom set with coins outside the top-350
- PG cache doesn't have the full set, CG fills the gap

**Verification:**
```javascript
// In browser console:
app.coins.forEach(c => console.log(c.id, c._source || 'coingecko'));
```

## How to Safely Reset Caches

```javascript
// Clear top coins cache (forces re-fetch on next load)
await window.cacheManager.delete('top-coins-by-market-cap');
await window.cacheManager.delete('top-coins-by-market-cap-meta');
await window.cacheManager.delete('top-coins-by-volume');
await window.cacheManager.delete('top-coins-by-volume-meta');

// Clear request registry (allows immediate re-fetch)
window.requestRegistry.clearLog();

// Clear active coin set data
await window.cacheManager.delete('active-coin-set-data');
```

## Data Freshness Checklist

| Check | Fresh | Stale | Fallback |
|-------|-------|-------|----------|
| `fetched_at` < 2h ago | Yes | — | — |
| `fetched_at` 2-4h ago | — | Yes | — |
| `fetched_at` > 4h ago | — | — | Yes |
| `_source` = `yandex-cache` | PG data | — | — |
| No `_source` field | CoinGecko live | — | — |
| `isCoinsCacheStale()` = false | Fresh | — | — |
| Progress bar all blue | PG primary | — | — |
| Progress bar all yellow | — | — | CG fallback |
| Progress bar blue+yellow | Dual-channel | — | — |

## Cycle Rotation Verification

After 3+ fetcher runs, verify only 2 cycles remain:

```sql
SELECT cycle_id, COUNT(*) as rows, COUNT(DISTINCT coin_id) as coins
FROM coin_market_cache_history
GROUP BY cycle_id
ORDER BY cycle_id DESC;
```

Expected: exactly 2 rows (2 most recent cycle_ids).

## Environment Variables Reference

### coingecko-fetcher (Yandex Cloud Function)
| Variable | Required | Description |
|----------|----------|-------------|
| `DB_HOST` | Yes | PostgreSQL host |
| `DB_PORT` | No | Default: 6432 |
| `DB_NAME` | Yes | Database name |
| `DB_USER` | Yes | Database user |
| `DB_PASSWORD` | Yes | Database password |
| `COINGECKO_API_KEY` | No | Demo/Pro key for higher rate limits |

### app-api (Yandex Cloud Function)
Same DB variables as above. Serves the `/api/coins/market-cache` and `/api/coins/cycles` endpoints.

### Cloudflare Worker (app-api)
| Variable | Type | Description |
|----------|------|-------------|
| `DB` | D1 binding | Cloudflare D1 database |
| `API_CACHE` | KV binding | KV namespace for API cache |
| `SETTINGS` | KV binding | KV namespace for app settings |
| `GOOGLE_CLIENT_SECRET` | Secret | OAuth client secret |
| `JWT_SECRET` | Secret | JWT signing key |
