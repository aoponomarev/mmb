---
id: sk-224210
title: "Data Providers Architecture"
reasoning_confidence: 1.0
reasoning_audited_at: 2026-03-11
reasoning_checksum: fa9be7ba
last_change: "#for-pre-handoff-transport-smoke — direct/proxy transport smoke formalized"

---

# Data Providers Architecture

> **Context**: The architectural rules for integrating, managing, and falling back between various market data providers (e.g., CoinGecko, PostgreSQL/Yandex Cache).
> **Scope**: `core/api/data-providers/*`, `core/api/data-provider-manager.js`

## Reasoning

- **#for-data-provider-interface** A unified interface (extending `BaseProvider`) ensures that the orchestrator (`DataProviderManager`) does not need to know the specific fetching, parsing, or ratelimiting details of individual providers.
- **#for-dual-channel-fallback** Relying solely on external APIs (like CoinGecko) exposes the application to strict rate limits and downtime. A dual-channel fetch mechanism (PostgreSQL primary + CoinGecko fallback) guarantees data availability and speed while minimizing external API usage.
- **#for-readonly-fallbacks** Fallbacks must be Read-Only / Local-Only. Do not write fallback data back to the central SSOT database (e.g. no browser upserts to PostgreSQL) to avoid polluting chronologies and cron data.
- **#for-rate-limiting** Free-tier APIs have strict rate limits. Proactive waiting and adaptive throttling avoid persistent 429 failures.
- **#for-validation-at-edge** Validate provider data before calculation to fail fast on malformed responses.

## Core Rules

1.  **Unified Provider Interface:**
    All data providers must extend from a base class or implement a strict contract (e.g., `getCoinData`, `getGlobalMetrics`). They are responsible for their own mapping to the application's internal data formats.
2.  **Dual-Channel Fallback Mechanism:**
    The `DataProviderManager` implements a `getCoinDataDualChannel` strategy. It must first attempt to fetch data from the fast/internal primary source (e.g., Yandex Cache/PostgreSQL). Any missing IDs are then fetched from the fallback source (e.g., CoinGecko).
3.  **No Hardcoded `fetch` in Components:**
    UI components must never call `fetch` directly for market data. All requests must go through `window.dataProviderManager` or appropriate service layers.
4.  **Isolated Storage of API Keys and Caches:**
    API keys and cached responses must be stored separately for each provider to prevent key collision and ensure that clearing one provider's cache doesn't destroy another's.
5.  **Normalization:**
    All provider responses MUST be normalized to internal schema via `normalizeCoinData()`.
6.  **Transport policy on `file://`:**
    Default path can use Cloudflare Worker proxy, but public read-only endpoints are allowed to use direct-first transport with proxy fallback when proxy allowlist/policy rejects domain access.

### Provider Add/Register/Config Workflow

When adding a new provider: (1) Create `core/api/data-providers/{name}-provider.js` extending `BaseDataProvider`; (2) Register in #JS-2436XKxE (data-provider-manager.js); (3) Define limits and URLs in #JS-siMJxsfA (data-providers-config.js).

**#for-adapter-mandatory** Every new external integration (API, DB) MUST get a dedicated adapter. No direct `fetch` in services or components. Applies to all domains (market data, AI, N8N, PostgreSQL). See id:ais-d8e7f6.

### Additional Provider API

`getCoinData(coinIds)` — chunked loading for coin ID arrays. `getCoinIdBySymbol(symbol)` — reverse lookup. `tryLocalTopCoinsFallback()` — fallback to local infra (e.g. `http://127.0.0.1:3002/api/market/top-coins`) when CoinGecko is rate-limited. `BaseDataProvider` utilities: `requiresApiKey()`, `handleHttpError()`, `logError()`, `logWarning()`. `DataProviderManager.getTopCoins()` integrates with #JS-iH26jSeT (request-registry.js) (4-hour minimum interval between heavy calls).

### Provider Initialization Guard (Mandatory)

For any service wrapping providers (example: kline service), initialization must be fail-safe:
- Instantiate provider lazily on first request (`ensureProvider()` pattern), not only in app bootstrap.
- Keep explicit `init()` for deterministic boot, but requests must not depend solely on bootstrap timing.
- On `file://`, route external calls through an existing proxy route that is actually deployed (`generic` route fallback allowed).
- Return clear runtime error messages when provider class is missing, so UI can show actionable diagnostics.
- For public read-only market endpoints, prefer direct transport first and use proxy as fallback when proxy policy returns 403 for that domain.

### Pre-Handoff Transport Smoke (Mandatory)

**#for-pre-handoff-transport-smoke** Before handing off provider-based features, verify both direct and proxy paths with real requests instead of assuming proxy policy/allowlists are correct.

Before handing off provider-based features, run a quick transport smoke:
- Check direct endpoint response (status + minimal payload shape).
- Check proxy path response (status + explicit policy errors like allowlist 403).
- If direct works and proxy is blocked by policy, lock in direct-first strategy and document it in AIS/skills.

### Merge Rule for Multiple Coin Sets

When user loads one default set and merges another: (1) Union actual coins — `coins[]` is source of truth; rebuild `activeCoinSetIds` from `coins.map(c => c.id)`; (2) Never overwrite active IDs by last set only (anti-pattern: `activeCoinSetIds = coinIdsFromLastLoad`); (3) Avoid redundant refetch — prefer `coinSet.coins` from loader; call `loadCoinsByIds` only for truly missing IDs.

### Regression Checklist (Top-N & Merge)

After first load: `coins == activeCoinSetIds == totalCoinsCount`. After merge: all counters reflect union size. `missingLen`/unresolved = 0 on happy path. Progress bar and fallback states visible during long loads.

### Code Anchor Policy

When this skill is updated, place or refresh inline code anchors in risk branches (retry/fallback/merge), not only in file headers. See id:sk-8991cd.

### Rate Limiting & 429 Recovery

**#for-rate-limiting** Free-tier APIs (e.g. CoinGecko) enforce strict limits. Proactive throttling avoids persistent 429 bans.

- **Token Bucket**: #JS-oX451njh (rate-limiter.js) — adaptive `requestsPerMinute` / `requestsPerSecond`. One limiter per API domain. Usage: `RateLimiter.getOrCreate('coingecko', 15, 0.5)`; `await limiter.waitForToken()`; on 429 `limiter.increaseTimeout()`; on success `limiter.decreaseTimeout()`.
- **Request Registry API**: `isAllowed(key)`, `recordCall(key)`, `getTimeUntilNext(key)`, `clear()`. Limits in #JS-siMJxsfA (e.g. CoinGecko: 15 rpm, 0.5 rps).
- **Feedback Loop**: MUST call `increaseTimeout()` on 429 and `decreaseTimeout()` on success.
- **Request Registry**: #JS-iH26jSeT — call-frequency guard (localStorage). Enforces minimum intervals (e.g. 4h for `getTopCoins`), 3× multiplier after 429.
- **429 Recovery Protocol**:
  1. Honor `Retry-After` header first (bounded by sane min/max).
  2. If absent, use bounded exponential backoff.
  3. Preserve `error.status` at provider level; manager records real status (429, 500).
  4. Emit progress states (`retrying`, `waiting`, `chunk_done`) for UI transparency.

### Top-N Load on file://

For large top-list loads (100–250 coins) that often hit 429 and CORS:

- **Chunk first**: Split into pages (baseline: 50 per chunk).
- **Progress events**: `start` → `chunk-start` → `chunk-success` → `done`.
- **Fallback chain**: Primary (live API via proxy) → Secondary (local cache) → Last resort (stale browser cache).
- **Hard constraints**: Do not hard-delete cache before refresh; avoid duplicate IDs when concatenating chunks.

### Top-N Cap and Counter Semantics

- Keep a bounded Top-N cap on read endpoints as a performance guard (`#for-topn-cap-guard`), but treat the value as operational tuning, not domain truth.
- Current contract for Yandex market-cache read path: `limit <= 1000` (api-gateway clamp).
- UI counters used for DB-to-table replacement MUST use effective count (`#for-effective-count-parity`): compute from the same data path as apply action (same sort, same limit, same local filters), not from raw `count_only`.

### Health Monitoring & Resilience

- **Health tracking**: Store successes/failures per provider; log latency for every call (`avgLatency`, `totalCalls`, `totalSuccesses`). Log rotation for monitoring history (e.g. 5MB per file).
- **Fallback logic**: Sort providers by health and priority; use recovery window (e.g. 5 min) to re-test degraded providers.
- **Graceful degradation**: If all providers fail, serve cached data or minimal response.
- **Validation criteria**: API uptime >99.5%; avg response time under thresholds (e.g. 1s); fallback must trigger within 1 retry of failed call.

### Data Validation

**#for-validation-at-edge** Validate provider data before calculation to fail fast on malformed responses.

- **Schema**: #JS-qP2fyDmZ (validator.js) — JSON structure (types, required fields).
- **Math**: #JS-893TGk4K (math-validation.js) — value ranges (price > 0, percent 0–100).
- **Sanity**: #JS-WS3aAySc (normalizer.js) — common fixes (string to float).
- **Hard constraints**: No NaNs; `pvs` array must have exactly 6 elements.

### Provider Metadata vs Domain Data

**Principle**: Provider-specific fields (e.g. `market_cap_rank`) are metadata, not domain data. They MUST NOT appear as top-level columns in domain tables (`asset_snapshots`, `portfolios`), be used in allocation/rebalance math, or be displayed as portfolio properties. They MAY be stored in `extra_json JSONB`, used transiently for sorting/display, or passed through API responses without persistence. **CoinGecko**: `market_cap_rank` is volatile, provider-defined; use the markets API `order` parameter for deterministic sorting; tie-breaking: `name` then `id`. **Schema**: `extra_json JSONB` for extensibility — store arbitrary metadata without schema migrations; avoid adding columns for every provider field. **Migration**: `rank` column dropped from `asset_snapshots`; `extra_json JSONB` added. File Map: #JS-fJ68ZfEu (portfolio-adapters.js), #JS-aNzHSaKo (portfolio-config.js), #JS-A43TyZ6E (core/api/data-providers/coingecko-provider.js).

### Backend Sync (PostgreSQL)

When using managed PostgreSQL for heavy data:

- **No Direct Connection**: Frontend MUST NOT connect to port 5432. Use HTTPS API gateway.
- **Batching**: Sync operations batched to minimize invocations.
- **Schema SSOT**: Canonical schema in `is/yandex/` (schema и migrations в соответствующих function-папках).
- **Extensibility**: Use `extra_json JSONB` for provider-specific fields instead of rigid columns.
- **Transactional**: All financial record updates must use SQL transactions.
- **Secrets**: DB credentials only in Cloud Function env vars; backup outside repo.
- **No `rank` in domain**: `market_cap_rank` is provider metadata, NOT a portfolio domain field; never persist as top-level column.

**Schema Migration Pattern**: (1) Write migration SQL (YYYY-MM-DD-description.sql); (2) Update schema file; (3) Update Function code if INSERT/SELECT change; (4) Deploy with temporary admin endpoint; (5) Execute migration; (6) Remove admin endpoint, redeploy; (7) Use `IF EXISTS`/`IF NOT EXISTS` in DDL.

**Guard Layers**: Feature toggle `isFeatureEnabled('postgresSync')`; UI toggle `isUiToggleEnabled()`; `classifySyncSkipReason()` for expected skips; EventBus `auth-state-changed` triggers `syncUser()` and `syncPortfoliosFromCloud()`.

### File Map

| File | Responsibility |
|------|----------------|
| #JS-oX451njh | Token bucket, adaptive throttling |
| #JS-iH26jSeT | Call-frequency guard (localStorage) |
| #JS-2436XKxE | Dual-channel orchestration |
| `core/api/data-providers/*` | Provider implementations |
| #JS-siMJxsfA | Limits definition |
| #JS-qP2fyDmZ | Schema validation |
| #JS-893TGk4K | Domain value ranges |

## Contracts

- **Fail-Fast in Providers**: Individual providers must fail fast and explicitly throw errors (like `BackendCoreError`) when they hit hard limits. They should not internally fallback to another provider; the fallback orchestration belongs strictly to `DataProviderManager`.
