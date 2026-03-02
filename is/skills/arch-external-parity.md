---
title: "Architecture: External Infrastructure Parity"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-01"
---

# Architecture: External Infrastructure Parity

> **Context**: Defines the strategy for maintaining compatibility between Legacy App and Target App external infrastructure contracts during the migration period.

## Reasoning

- **#for-functional-parity** Target App must produce equivalent external behavior (same API contracts, env keys, health responses) without copying Legacy App's internal implementation flaws. Anti-calque principle applied to infrastructure.
- **#for-single-writer-guard** A strict `DATA_PLANE_ACTIVE_APP` contract ensures only one environment (Target or Legacy) writes to shared cloud resources, preventing data races.
- **#for-time-separated-operation** Legacy App and Target App share Cloudflare/Yandex data stores but never operate simultaneously in write mode. Eliminates race conditions without distributed locking.
- **#for-fail-fast** Fail-fast over graceful degradation during migration: fallback chains for external critical contracts are intentionally avoided. Failed provider = visible failure, not silent data corruption.
- **#for-env-contract-sync** `.env.example` defines the union of all required keys. Both Legacy App and Target App can be validated against it. Divergence in env keys is the most common source of parity bugs.
- **#not-simultaneous-read-write** Simultaneous read-write from both apps — race conditions, API rate limit conflicts.
- **#not-infra-duplication** Full infrastructure duplication (separate Cloudflare/Yandex per app) — cost, complexity.
- **#not-no-parity-checks** No parity checks — drift between apps causes silent failures during handoff.

---

## Implementation Status in Target App

- `Implemented`: Single-writer guard (`DATA_PLANE_ACTIVE_APP`) with blocking validation.
- `Implemented`: `.env.example` as SSOT for env contract (no secrets committed).
- `Implemented`: Cache integrity gate (`npm run cache:integrity:check`, `npm run cache:integrity:delta`).
- `Implemented`: Secret resilience (encrypted backup/restore via `npm run secret:backup/restore`).
- `Implemented`: Health-check validates contract plane (env, paths, single-writer).
- `Backlog`: Docker split compose (`base + target + legacy`) — deferred to backlog.
- `Backlog`: Cloudflare runtime parity checks — deferred to backlog.
- `Backlog`: Yandex Cloud functional migration — deferred (no confirmed use case).

