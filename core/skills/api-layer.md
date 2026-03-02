---
title: "API Layer & Data Providers"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-01"
---

# API Layer & Data Providers

> **Skill key**: `core/skills/api-layer`
> **Scope**: `core/api/`

## Reasoning

- **#for-fail-fast** Fail-fast over graceful degradation during migration: fallback chains for external critical contracts are intentionally avoided. Failed provider = visible failure, not silent data corruption.
- **#for-partial-failure-tolerance** `getAllBestEffort` returns healthy metrics alongside error reports for failed ones, preventing one bad metric from blocking the entire snapshot.
- **#for-rate-limiting** Free-tier APIs have strict rate limits. Proactive waiting avoids persistent 429 failures.
- **#for-filesystem-cache** A file-based cache survives script restarts, is trivially cleared, and does not consume application RAM.
- **#for-layer-separation** Layer separation (Service → Transport → HTTP Handler → Node Server): each layer has single responsibility, making testing trivial and replacement easy.
- **#for-composition-root** Composition Root pattern: `backend-market-runtime.js` assembles all dependencies in one place, enabling test-time injection of mocks and ensuring no hidden coupling.
- **#for-request-id-traceability** Every HTTP request carries a sanitized `x-request-id` through all layers, making distributed debugging possible from day one.

---

## Fail-Fast (Explicit Error Surfacing)

Data providers (`CoinGeckoProvider`, `BinanceMetricsProvider`) must not have hidden fallback chains or infinite retry loops.
External errors — especially timeouts and HTTP 5xx/4xx/429 — must be surfaced as a standardized `BackendCoreError`.

**#for-fail-fast** Hiding errors inside a provider obscures debugging and can cause the orchestrator to hang. A provider must fail explicitly when rate limits are exhausted or the upstream is unavailable.

## Best-Effort Orchestration (Non-blocking Aggregation)

Services aggregating data from multiple independent sources (`MarketMetricsService`) MUST use `Promise.allSettled` for bulk-load methods like `getAllBestEffort`.

**#for-partial-failure-tolerance** The failure of one provider (e.g., VIX source unavailable) must not kill the entire response. Healthy metrics are returned; failed ones are replaced by a structured error object (`{ source: "error", error: { ... } }`).

## Rate Limiting & Journaling

All calls to external APIs pass through `RequestRegistry` (or equivalent rate-limiter).
- On HTTP 429: the retry interval is multiplied by a backoff factor.
- On success: the interval resets to its base value.

**#for-rate-limiting** Free-tier APIs have strict rate limits. Proactive waiting avoids persistent 429 failures.

## Filesystem Caching (Native Node.js)

Instead of complex in-memory stores or `localStorage`, we use the lightweight deterministic `DataCacheManager` backed by Node.js `fs`.

**#for-filesystem-cache** A file-based cache survives script restarts, is trivially cleared, and does not consume application RAM.

## Contract Isolation (Zod Validation Before Network)

Input formats are strictly validated (via Zod contracts) before the request is sent over the wire.
- `core/contracts/market-contracts.js` defines `parseMarketQuery` and `buildSnapshotPayload`.
- Any invalid input causes an immediate `BackendCoreError` — no silent malformed requests.

## Layer Separation (Service → Transport → HTTP Handler → Server)

| Layer | File | Responsibility |
|---|---|---|
| **Service (Domain)** | `market-snapshot-service.js` | Orchestrates data retrieval. Knows nothing about HTTP. |
| **Transport (Adapter)** | `market-snapshot-transport.js` | Catches domain errors (`BackendCoreError`) and converts them to `{ status, body }` structures. Isolates business logic from protocol specifics. |
| **HTTP Handler** | `market-snapshot-http.js` | Framework-agnostic. Parses URL, handles CORS, request-id, headers. Delegates clean calls to Transport. |
| **Server (Runtime)** | `market-snapshot-node-server.js` | Thin Node.js `http.createServer` binding. No business logic. |

## 7. Composition Root (Dependency Assembly)

All dependencies (Cache, Services, Providers, Routers) are initialized in one place: `core/api/backend-market-runtime.js`.

**Reasoning**: Avoiding singletons enables easy dependency mocking in e2e tests and isolation between instances.

## 8. Request-ID Traceability

Every HTTP request carries a sanitized `x-request-id` header through all layers (Provider → Service → Transport → Handler → Response).
- Incoming `x-request-id` is sanitized (charset + max 64 chars); invalid values generate a safe UUID.
- Response always includes `x-request-id` so the caller can trace the full request lifecycle.

## Known Implementations

| File | Purpose |
|---|---|
| `core/api/data-provider-manager.js` | Single entry point for all data provider access |
| `core/api/providers/coingecko-provider.js` | CoinGecko market data (top coins, search) |
| `core/api/providers/binance-metrics-provider.js` | Binance OI, Funding Rate, Long/Short Ratio |
| `core/api/request-registry.js` | Rate-limit journal for all API calls |
| `core/api/market-data-service.js` | Raw market data fetching orchestration |
| `core/api/market-metrics-service.js` | FGI, VIX, BTC dominance aggregation |
| `core/api/market-snapshot-service.js` | Composite snapshot (data + metrics) |
| `core/api/market-contracts.js` | Zod schemas for query + payload validation |
| `core/api/backend-market-runtime.js` | Composition root |
| `core/api/market-snapshot-transport.js` | Transport adapter |
| `core/api/market-snapshot-http.js` | HTTP handler |
| `core/api/market-snapshot-node-server.js` | Node.js server binding |
| `core/api/market-snapshot-client.js` | API consumer client |
| `core/cache/data-cache-manager.js` | Filesystem cache manager |
