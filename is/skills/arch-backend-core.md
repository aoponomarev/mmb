---
id: sk-5c0ef8
title: "Architecture: Backend Core & Data Pipeline"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-05
reasoning_checksum: 70eadb33
last_change: ""

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

## Core Rules

*Docker/n8n infrastructure content moved to `docs/backlog/skills/docker-infrastructure.md` and `docs/backlog/skills/n8n-infrastructure.md` — not yet deployed in Target App.*

### Client vs Cloud Responsibility

**Core principle (Version-Bound vs User-Bound)**: Client = functionality tied to application version (deterministic, static, immutable per deploy); Cloud = data tied to user (persistent, mutable, version-independent).

**Client**: App config (API endpoints, limits, feature flags), business logic, UI components, system messages, cache config, versioned cache. **Cloud**: D1 (profiles, portfolios, preferences); R2 (future: models, datasets, snapshots).

**Hard constraints**: No logic in Cloud (Workers route/auth, not calculate); no config in DB (belongs in code); client cache keys MUST include `appVersionHash`.

### Loading Strategy (Boot Sequence)

**Context**: Boot sequence, dependency management, template injection. SSOT: `core/module-loader.js`, `core/modules-config.js`.

**Critical order**: Bootstrap JS → Templates (`x-template`) → Vue.js → Components → App Root. **Invariant**: `x-template` scripts MUST be in DOM before Vue initialization.

**Module loader**: Topological sort (Kahn's algorithm), cycle detection, `file://` & `http://` support; critical modules halt boot, optional log warning.

**Component boundaries**: All Vue components inside `#app`; splash screen blocks interaction until App mounted and `modules-config` resolved.

**Hard constraints**: No NPM bundling — native `<script>` injection; strict order Templates→Vue→Components→App; violation yields "Component not found".

### better-sqlite3 Node ABI Gate

**Context**: better-sqlite3 is native module; Node ABI/runtime shifts are primary risk. SSOT: `package.json`.

**Trigger**: better-sqlite3 release; Node version update; package-lock changes affecting native resolution.

**Execution**: (1) Keep better-sqlite3 on known-good baseline; (2) `node is/scripts/infrastructure/health-check.js`; (3) run smoke command; (4) confirm no native load failures; (5) if Node major changed, ABI re-check mandatory.

**What matters**: Node ABI compatibility; reproducibility with lockfile and runtime image; zero native load errors.

**Guardrail**: Treat Node and better-sqlite3 upgrades as linked; prefer rollback to last known-good patch over ad-hoc churn.

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
  - `core/contracts/market-contracts.js` — Zod-validated query/payload contracts.
  - `core/api/backend-market-runtime.js` — composition root assembling all services.
  - `core/api/market-snapshot-transport.js` — query-to-response transport adapter.
  - `core/api/market-snapshot-http.js` — framework-agnostic HTTP handler.
  - `core/api/market-snapshot-node-server.js` — lightweight Node.js HTTP server.
  - `core/api/market-snapshot-client.js` — API consumer with request-id propagation.
- `Implemented`: Secret Resilience MVP (encrypted backup/restore, cache integrity gate).
- `Implemented`: Single-writer guard (`DATA_PLANE_ACTIVE_APP`).
- `Implemented`: 40 automated tests covering all backend contracts.
