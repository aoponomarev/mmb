# Dual-Channel Data Architecture: PostgreSQL + CoinGecko

## Overview

The app application uses a **dual-channel data pipeline** to load cryptocurrency market data:

1. **PostgreSQL (primary)** — fast, bulk data from Yandex Cloud cache
2. **CoinGecko (fallback)** — live API for coins missing from the cache

This eliminates rate-limit pressure on CoinGecko for the common case (~350 cached coins)
while preserving full coverage for custom user coin sets.

## Data Flow

```
User opens "Coin Lists" modal
│
├─ Collects all coin_ids from selected sets
│
├─ Phase 1: PostgreSQL (YandexCacheProvider)
│   ├── GET /api/coins/market-cache?ids=bitcoin,ethereum,...
│   ├── Instant response, no rate limits
│   ├── Progress: blue segment of the bar
│   └── Result: resolvedFromPg map
│
├─ Compute missingIds = requested - resolvedFromPg
│
├─ Phase 2: CoinGecko (if missingIds.length > 0)
│   ├── getCoinData(missingIds) via CoinGeckoProvider
│   ├── Chunked (50/request), 21s delay between chunks
│   ├── Progress: yellow/amber segment of the bar
│   └── Result: resolvedFromCG
│
└─ Merge: resolvedFromPg + resolvedFromCG → final coin set
```

## Server-Side: Cron Fetcher

**Location:** `is/yandex/functions/coingecko-fetcher/index.js`

### Time Window Gate

The fetcher only runs between **06:00 and 24:00 Moscow time** (Europe/Moscow, UTC+3).
Outside this window, the function returns `200 OK` with `status: SKIPPED`.
The cron schedule in Yandex Cloud remains unchanged; the code-level gate is a safety net.

### Cycle History Model

Each full fetch session (market_cap + volume) creates a unique `cycle_id`:

```
cycle_id = YYYYMMDDHHMMSS (e.g., "20260226143000")
```

Data is written to `coin_market_cache_history` with:
- `cycle_id` — groups all rows of one session
- `sort_type` — `'market_cap'` or `'volume'`
- `sort_rank` — position within that sort (1..250)
- `fetched_at` — actual timestamp

After each cycle:
1. The `coin_market_cache` table (latest view) is refreshed via upsert
2. Old cycles are rotated: only the **2 most recent** `cycle_id` values are kept

### Table: `coin_market_cache_history`

```sql
CREATE TABLE coin_market_cache_history (
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
);

CREATE INDEX idx_history_cycle_coin ON coin_market_cache_history (cycle_id, coin_id);
CREATE INDEX idx_history_cycle_sort ON coin_market_cache_history (cycle_id, sort_type, sort_rank);
```

## API Contract

**Base URL:** `https://d5dl2ia43kck6aqb1el5.k1mxzkh0.apigw.yandexcloud.net`

### GET /api/coins/market-cache

Returns the latest cached coin data.

**Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `ids` | string | — | Comma-separated coin IDs |
| `sort` | string | `market_cap` | `market_cap` or `volume` |
| `limit` | number | 250 | Max 500 |
| `include_prev` | string | `false` | If `true`, includes previous cycle data |

**Response:**
```json
{
  "coins": [ /* latest cycle rows */ ],
  "count": 250,
  "fetched_at": "2026-02-26T14:30:00.000Z",
  "prev_cycle": {
    "cycle_id": "20260226120000",
    "coins": [ /* previous cycle rows */ ],
    "count": 248
  },
  "cycles_available": ["20260226143000", "20260226120000"]
}
```

### GET /api/coins/cycles

Returns metadata about stored cycles.

**Response:**
```json
{
  "cycles": [
    {
      "cycle_id": "20260226143000",
      "row_count": 500,
      "coin_count": 348,
      "started_at": "2026-02-26T14:30:01Z",
      "finished_at": "2026-02-26T14:38:45Z"
    }
  ]
}
```

## Client-Side Integration

### DataProviderManager.getCoinDataDualChannel()

**Location:** `core/api/data-provider-manager.js`

```javascript
const coins = await window.dataProviderManager.getCoinDataDualChannel(coinIds, {
    onProgress: (event) => {
        // event.source: 'postgres' | 'coingecko'
        // event.phase: 'start' | 'chunk-success' | 'done' | 'error' | 'skip'
        // event.loaded, event.total
    },
    signal: abortController.signal
});
```

### Progress Bar

The modal displays a **stacked two-segment progress bar**:

- **Blue segment (bg-primary)** — PostgreSQL phase
- **Yellow/amber segment (bg-warning)** — CoinGecko phase (only appears if needed)

Below the bar, small labels show `PG: N` and `CG: N` coin counts.

### Fallback Behavior

| Scenario | Behavior |
|----------|----------|
| PG available, all coins found | CoinGecko phase = 0, instant load |
| PG available, some missing | PG delivers bulk, CG fetches remaining |
| PG unavailable | Full fallback to CoinGecko (existing logic) |
| CG rate-limited (429) | Shows retry countdown, respects requestRegistry |
| Both unavailable | Falls back to local cache, shows stale warning |

All degradation events are reported via `fallbackMonitor.notify()`.

## SSOT Timing Alignment

All timing values reference `core/ssot/policies.js`:

| Contract | Value | Used by |
|----------|-------|---------|
| `topCoins.ttlMs` | 2h | Cache TTL for top coins |
| `topCoins.uiStaleThresholdMs` | 2h | `isCoinsCacheStale()` |
| `topCoins.requestRegistryMinIntervalMs` | 2h | Rate limit check for getTopCoins |
| `marketMetrics.minIntervalMs` | 4h | BTC dom, OI, FR, LSR registry checks |
