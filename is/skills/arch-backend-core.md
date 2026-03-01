# Architecture: Backend Core & Data Pipeline

> **Context**: Defines the backend data architecture: provider management, service layering, HTTP transport, and security contracts for the Target App.

## Implementation Status in Target App

- `Implemented`: Full backend core v1.
  - `core/api/data-provider-manager.js` — single entry point for data providers with rate-limit journal.
  - `core/api/providers/coingecko-provider.js` — CoinGecko market data with query validation.
  - `core/api/providers/binance-metrics-provider.js` — Binance OI/Funding Rate/LSR.
  - `core/api/request-registry.js` — rate-limit request tracking.
  - `core/api/market-data-service.js` — orchestration of raw market data fetching.
  - `core/api/market-metrics-service.js` — FGI/VIX/BTC dominance with cache + live strategy.
  - `core/api/market-snapshot-service.js` — composite snapshot (data + metrics).
  - `core/api/market-contracts.js` — Zod-validated query/payload contracts.
  - `core/api/backend-market-runtime.js` — composition root assembling all services.
  - `core/api/market-snapshot-transport.js` — query-to-response transport adapter.
  - `core/api/market-snapshot-http.js` — framework-agnostic HTTP handler.
  - `core/api/market-snapshot-node-server.js` — lightweight Node.js HTTP server.
  - `core/api/market-snapshot-client.js` — API consumer with request-id propagation.
- `Implemented`: Secret Resilience MVP (encrypted backup/restore, cache integrity gate).
- `Implemented`: Single-writer guard (`DATA_PLANE_ACTIVE_APP`).
- `Implemented`: 40 automated tests covering all backend contracts.

## Architectural Reasoning (Why this way)

- **Incremental migration over big-bang rewrite**: Reduces regression risk. Each slice (provider, service, transport, HTTP) is independently testable.
- **Data contracts first, UI second**: Backend stability is foundational — UI and integrations depend on stable API/data shapes.
- **SSOT-first**: All backend modules import paths from `is/contracts/paths/paths.js` and validate env via Zod schemas. Zero hardcoded paths.
- **Layer separation (Service → Transport → HTTP Handler → Node Server)**: Each layer has a single responsibility, making testing trivial and replacement easy. Transport maps domain errors to HTTP status codes; handler manages routing; server provides socket binding.
- **Composition Root pattern**: `backend-market-runtime.js` assembles all dependencies in one place, enabling test-time injection of mocks and ensuring no hidden coupling.
- **Fail-fast over graceful degradation during migration**: On the migration path, fallback chains for external critical contracts are intentionally avoided. Failed provider = visible failure, not silent data corruption.
- **Partial failure tolerance in metrics**: `getAllBestEffort` returns healthy metrics alongside error reports for failed ones, preventing one bad metric from blocking the entire snapshot.
- **Request-ID traceability**: Every HTTP request carries a sanitized `x-request-id` through all layers, making distributed debugging possible from day one.

## Alternatives Considered

- Full big-bang backend rewrite — rejected (too risky for migration phase).
- Full rewrite from scratch — rejected (expensive, and most Legacy App patterns are sound).
- Jest/Vitest for testing — rejected in favor of `node:test` (zero-dependency, built into Node.js).
- Express/Fastify for HTTP — rejected (thin native `http.createServer` sufficient for portfolio project).
