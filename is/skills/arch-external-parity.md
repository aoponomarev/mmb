# Architecture: External Infrastructure Parity

> **Context**: Defines the strategy for maintaining compatibility between Legacy App and Target App external infrastructure contracts during the migration period.

## Implementation Status in Target App

- `Implemented`: Single-writer guard (`DATA_PLANE_ACTIVE_APP`) with blocking validation.
- `Implemented`: `.env.example` as SSOT for env contract (no secrets committed).
- `Implemented`: Cache integrity gate (`npm run cache:integrity:check`, `npm run cache:integrity:delta`).
- `Implemented`: Secret resilience (encrypted backup/restore via `npm run secret:backup/restore`).
- `Implemented`: Health-check validates contract plane (env, paths, single-writer).
- `Backlog`: Docker split compose (`base + mmb + mbb`) — deferred to backlog.
- `Backlog`: Cloudflare runtime parity checks — deferred to backlog.
- `Backlog`: Yandex Cloud functional migration — deferred (no confirmed use case).

## Architectural Reasoning (Why this way)

- **Functional parity, not implementation parity**: Target App must produce equivalent external behavior (same API contracts, env keys, health responses) without copying Legacy App's internal implementation flaws. This is the "anti-calque" principle applied to infrastructure.
- **Single-writer guard prevents data races**: `DATA_PLANE_ACTIVE_APP` ensures only one application instance can write to shared resources at any time. This is a hard-blocking contract, not advisory — preflight refuses to start if the value is invalid.
- **Time-separated operation**: Legacy App and Target App share Cloudflare/Yandex data stores but never operate simultaneously in write mode. This eliminates race conditions without requiring distributed locking.
- **Fail-fast during migration**: Until migration is complete, if an external contract check fails, the operation is blocked immediately. No fallback chains are activated during migration to keep failure modes visible and debuggable.
- **Env contract as the synchronization surface**: `.env.example` defines the union of all required keys. Both Legacy App and Target App can be validated against it. Divergence in env keys is the most common source of parity bugs.

## Alternatives Considered

- Simultaneous read-write from both apps — rejected (race conditions, API rate limit conflicts).
- Full infrastructure duplication (separate Cloudflare/Yandex per app) — rejected (cost, complexity).
- No parity checks — rejected (drift between apps causes silent failures during handoff).
