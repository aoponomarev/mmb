---
title: "Data Providers Architecture"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-03"
reasoning_checksum: "593567bf"
id: sk-224210

---

# Data Providers Architecture

> **Context**: The architectural rules for integrating, managing, and falling back between various market data providers (e.g., CoinGecko, PostgreSQL/Yandex Cache).
> **Scope**: `core/api/data-providers/*`, `core/api/data-provider-manager.js`

## Reasoning

- **#for-data-provider-interface** A unified interface (extending `BaseProvider`) ensures that the orchestrator (`DataProviderManager`) does not need to know the specific fetching, parsing, or ratelimiting details of individual providers.
- **#for-dual-channel-fallback** Relying solely on external APIs (like CoinGecko) exposes the application to strict rate limits and downtime. A dual-channel fetch mechanism (PostgreSQL primary + CoinGecko fallback) guarantees data availability and speed while minimizing external API usage.
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

### Rate Limiting & 429 Recovery

**#for-rate-limiting** Free-tier APIs (e.g. CoinGecko) enforce strict limits. Proactive throttling avoids persistent 429 bans.

- **Token Bucket**: `core/api/rate-limiter.js` — adaptive `requestsPerMinute` / `requestsPerSecond`. One limiter per API domain.
- **Feedback Loop**: MUST call `increaseTimeout()` on 429 and `decreaseTimeout()` on success.
- **Request Registry**: `core/api/request-registry.js` — call-frequency guard (localStorage). Enforces minimum intervals (e.g. 4h for `getTopCoins`), 3× multiplier after 429.
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

### Health Monitoring & Resilience

- **Health tracking**: Store successes/failures per provider; log latency for every call.
- **Fallback logic**: Sort providers by health and priority; use recovery window (e.g. 5 min) to re-test degraded providers.
- **Graceful degradation**: If all providers fail, serve cached data or minimal response.

### Data Validation

**#for-validation-at-edge** Validate provider data before calculation to fail fast on malformed responses.

- **Schema**: `core/validation/validator.js` — JSON structure (types, required fields).
- **Math**: `core/validation/math-validation.js` — value ranges (price > 0, percent 0–100).
- **Sanity**: `core/validation/normalizer.js` — common fixes (string to float).
- **Hard constraints**: No NaNs; `pvs` array must have exactly 6 elements.

### Backend Sync (PostgreSQL)

When using managed PostgreSQL for heavy data:

- **No Direct Connection**: Frontend MUST NOT connect to port 5432. Use HTTPS API gateway.
- **Batching**: Sync operations batched to minimize invocations.
- **Schema SSOT**: Canonical schema in `cloud/yandex/schema-postgres.sql`; migrations in `cloud/yandex/migrations/`.
- **Extensibility**: Use `extra_json JSONB` for provider-specific fields instead of rigid columns.
- **Transactional**: All financial record updates must use SQL transactions.

### File Map

| File | Responsibility |
|------|----------------|
| `core/api/rate-limiter.js` | Token bucket, adaptive throttling |
| `core/api/request-registry.js` | Call-frequency guard (localStorage) |
| `core/api/data-provider-manager.js` | Dual-channel orchestration |
| `core/api/data-providers/*` | Provider implementations |
| `core/config/data-providers-config.js` | Limits definition |
| `core/validation/validator.js` | Schema validation |
| `core/validation/math-validation.js` | Domain value ranges |

## Contracts

- **Fail-Fast in Providers**: Individual providers must fail fast and explicitly throw errors (like `BackendCoreError`) when they hit hard limits. They should not internally fallback to another provider; the fallback orchestration belongs strictly to `DataProviderManager`.
