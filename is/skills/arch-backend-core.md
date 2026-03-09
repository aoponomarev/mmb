---
id: sk-5c0ef8
title: "Architecture: Backend Core & Data Pipeline"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-09
reasoning_checksum: 70eadb33
last_change: ""

---

# Architecture: Backend Core & Data Pipeline

> **Context**: Defines the backend data architecture: provider management, service layering, HTTP transport, and security contracts for the PF.

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
- **#not-rewrite-from-scratch** Full rewrite from scratch is expensive, and most Legacy PF patterns are sound.
- **#not-express-fastify** Thin native `http.createServer` is sufficient for a portfolio project.

---

## Core Rules

*Docker/n8n infrastructure content moved to id:bskill-11683c (docs/backlog/skills/docker-infrastructure.md) and id:bskill-2cab14 (docs/backlog/skills/n8n-infrastructure.md) — not yet deployed in PF.*

### Client vs Cloud Responsibility

**Core principle (Version-Bound vs User-Bound)**: Client = functionality tied to application version (deterministic, static, immutable per deploy); Cloud = data tied to user (persistent, mutable, version-independent).

**Client**: App config (API endpoints, limits, feature flags), business logic, UI components, system messages, cache config, versioned cache. **Cloud**: D1 (profiles, portfolios, preferences); R2 (future: models, datasets, snapshots).

**Hard constraints**: No logic in Cloud (Workers route/auth, not calculate); no config in DB (belongs in code); client cache keys MUST include `appVersionHash`.

### Loading Strategy (Boot Sequence)

**Context**: Boot sequence, dependency management, template injection. SSOT: #JS-xj43kftu (module-loader.js), #JS-os34Gxk3 (modules-config.js).

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

## Implementation Status in PF

- `Implemented`: Full backend core v1.
  - #JS-2436XKxE (data-provider-manager.js) — single entry point for data providers with rate-limit journal.
  - #JS-DvQtSDsD (core/api/providers/coingecko-provider.js) — CoinGecko market data with query validation.
  - #JS-RRC5aRN1 (binance-metrics-provider.js) — Binance OI/Funding Rate/LSR.
  - #JS-iH26jSeT (request-registry.js) — rate-limit request tracking.
  - #JS-Lw3YqzH7 (market-data-service.js) — orchestration of raw market data fetching.
  - #JS-Xa3QAdTk (market-metrics-service.js) — FGI/VIX/BTC dominance with cache + live strategy.
  - #JS-4K2gU4Fq (market-snapshot-service.js) — composite snapshot (data + metrics).
  - #JS-P149SzKB (market-contracts.js) — Zod-validated query/payload contracts.
  - #JS-1n3NPbwx (backend-market-runtime.js) — composition root assembling all services.
  - #JS-ikUJ4ihH (market-snapshot-transport.js) — query-to-response transport adapter.
  - #JS-ba38kHXk (market-snapshot-http.js) — framework-agnostic HTTP handler.
  - #JS-wZTcVwWG (market-snapshot-node-server.js) — lightweight Node.js HTTP server.
  - #JS-3oL8h3k9 (market-snapshot-client.js) — API consumer with request-id propagation.
- `Implemented`: Secret Resilience MVP (encrypted backup/restore, cache integrity gate).
- `Implemented`: Single-writer guard (`DATA_PLANE_ACTIVE_APP`).
- `Implemented`: 40 automated tests covering all backend contracts.
