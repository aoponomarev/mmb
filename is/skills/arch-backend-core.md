---
title: "Architecture: Backend Core & Data Pipeline"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "70eadb33"
id: sk-5c0ef8

---

# Architecture: Backend Core & Data Pipeline

> **Context**: Defines the backend data architecture: provider management, service layering, HTTP transport, and security contracts for the Target App.

## Reasoning

- **#for-incremental-migration** Instead of a big-bang rewrite, we migrate slice by slice. Each slice (provider, service, transport, HTTP) is independently testable.
- **#for-data-contracts-first** Backend stability is foundational — UI and integrations depend on stable API/data shapes, so we validate inputs early.
- **#for-ssot-paths** Absolute paths from `paths.js` guarantee correctness regardless of CWD.
- **#for-layer-separation** Service → Transport → HTTP Handler → Node Server. Each layer has single responsibility, making testing trivial and replacement easy.
- **#for-composition-root** `backend-market-runtime.js` assembles all dependencies, enabling test-time injection of mocks and ensuring no hidden coupling.
- **#for-fail-fast** Data providers must throw BackendCoreError instead of infinite retries.
- **#for-partial-failure-tolerance** The orchestrator uses `getAllBestEffort` to return healthy metrics alongside error reports for failed ones.
- **#for-request-id-traceability** Every HTTP request carries a sanitized `x-request-id` through all layers for distributed debugging.
- **#for-node-test** Zero external test dependency; built-in test runner is sufficient.
- **#not-big-bang-rewrite** Full big-bang backend rewrite is too risky for the migration phase.
- **#not-rewrite-from-scratch** Full rewrite from scratch is expensive, and most Legacy App patterns are sound.
- **#not-express-fastify** Thin native `http.createServer` is sufficient for a portfolio project.

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
