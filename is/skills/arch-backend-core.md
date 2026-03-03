---
title: "Architecture: Backend Core & Data Pipeline"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-03"
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

## Core Rules

### Docker Resource Governance

**Goal**: Keep Docker stack stable under mixed load. SSOT: `docker-compose.yml`, `INFRASTRUCTURE_CONFIG.yaml`.

**Network**: Split networks — `public` for externally exposed services, `internal` for private service-to-service traffic; keep sensitive communication on `internal`.

**Storage**: Named volume with `nocopy: true` for faster startup; large mutable data in dedicated mounted paths, not container layers.

**Logging**: Mandatory rotation — `driver: json-file`, `max-size: 10m`, `max-file: 3-5`.

**Profiles**: `core` for production runtime; `maintenance` for diagnostics and one-off containers.

**Verification**: `docker compose --profile core config`, `docker compose --profile maintenance config`, `docker compose ps`, `docker network ls`.

### SQLite Runtime Compatibility Gate

**Context**: sqlite3 runtime stability in n8n/local scripts. SSOT: `n8n/package.json`.

**Trigger**: New sqlite3 release; errors around bindings/prebuilds/package install; infrastructure changes affecting SQLite files.

**Gate checklist**: (1) sqlite3 baseline in `n8n/package.json` on known-good line; (2) `GET /api/infra/dependency-health` confirm sqlite3 ok; (3) `node scripts/sqlite-health-snapshot.js`; (4) run workflow with SQLite access; (5) check n8n logs for binding errors.

**Rollback rule**: If workflow fails after upgrade, pin to last known good patch; do not downgrade below baseline without recording reason; prefer read-only evidence before destructive action.

### WSL2 & Docker Optimization

**Context**: WSL settings depend on hardware profile in `INFRASTRUCTURE_CONFIG.yaml`. File: `C:\Users\[User]\.wslconfig`.

**Profiles**: Home (high perf) — processors=12, memory=32GB, swap=8GB; Office — processors=4, memory=8GB, swap=4GB.

**Docker Desktop**: WSL Integration for Ubuntu-22.04; Resource Saver Auto; enable containerd and Docker MCP Toolkit; DISABLE Kubernetes.

**Applying changes**: `wsl --shutdown` → restart Docker Desktop → verify with `free -h` and `nproc` in Ubuntu.

### Client vs Cloud Responsibility

**Core principle**: Client = functionality tied to application version (deterministic, static); Cloud = data tied to user (persistent, mutable).

**Client**: App config, business logic, UI components, system messages, cache config, versioned cache. **Cloud**: D1 (profiles, portfolios, preferences); R2 (future: models, datasets, snapshots).

**Hard constraints**: No logic in Cloud (Workers route/auth, not calculate); no config in DB (belongs in code); client cache keys MUST include `appVersionHash`.

### Loading Strategy (Boot Sequence)

**Context**: Boot sequence, dependency management, template injection. SSOT: `core/module-loader.js`, `core/modules-config.js`.

**Critical order**: Bootstrap JS → Templates (`x-template`) → Vue.js → Components → App Root. **Invariant**: `x-template` scripts MUST be in DOM before Vue initialization.

**Module loader**: Topological sort (Kahn), cycle detection, `file://` & `http://` support; critical modules halt boot, optional log warning.

**Hard constraints**: No NPM bundling — native `<script>` injection; strict order Templates→Vue→Components→App.

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
