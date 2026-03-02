---
title: "Architecture: Backend Core & Data Pipeline"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-01"
---

# Architecture: Backend Core & Data Pipeline

> **Context**: Defines the backend data architecture: provider management, service layering, HTTP transport, and security contracts for the Target App.

## Reasoning

- **#for-incremental-migration** Incremental migration over big-bang rewrite reduces regression risk. Each slice (provider, service, transport, HTTP) is independently testable.
- **#for-data-contracts-first** Data contracts first, UI second. Backend stability is foundational — UI and integrations depend on stable API/data shapes.
- **#for-ssot-paths** Infrastructure scripts run from varying CWDs (preflight, CI, local dev). Relative paths break; absolute paths from a single registry (`paths.js`) guarantee correctness.
- **#for-layer-separation** Layer separation (Service → Transport → HTTP Handler → Node Server): each layer has single responsibility, making testing trivial and replacement easy. Transport maps domain errors to HTTP status codes; handler manages routing; server provides socket binding.
- **#for-composition-root** Composition Root pattern: `backend-market-runtime.js` assembles all dependencies in one place, enabling test-time injection of mocks and ensuring no hidden coupling.
- **#for-fail-fast** Fail-fast over graceful degradation during migration: fallback chains for external critical contracts are intentionally avoided. Failed provider = visible failure, not silent data corruption.
- **#for-partial-failure-tolerance** `getAllBestEffort` returns healthy metrics alongside error reports for failed ones, preventing one bad metric from blocking the entire snapshot.
- **#for-request-id-traceability** Every HTTP request carries a sanitized `x-request-id` through all layers, making distributed debugging possible from day one.
- **#for-node-test** Zero external test dependency; built-in since Node 18. Sufficient for contract and integration testing at current scale.
- **#not-big-bang-rewrite** Full big-bang backend rewrite — too risky for migration phase.
- **#not-rewrite-from-scratch** Full rewrite from scratch — expensive, and most Legacy App patterns are sound.
- **#not-express-fastify** Express/Fastify for HTTP — thin native `http.createServer` sufficient for portfolio project.

---

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
