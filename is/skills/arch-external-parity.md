---
id: sk-73dcca
title: "Architecture: External Infrastructure Parity"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-05
reasoning_checksum: 2e1079c9
last_change: ""

---

# Architecture: External Infrastructure Parity

> **Context**: Defines the strategy for maintaining compatibility between Legacy App and Target App external infrastructure contracts during the migration period.

## Reasoning

- **#for-functional-parity** Target App must produce equivalent external behavior to Legacy without copying its flawed internal implementations.
- **#for-single-writer-guard** Target and Legacy share Cloudflare/Yandex stores, so a strict `DATA_PLANE_ACTIVE_APP` variable guarantees only one app can mutate data at a time.
- **#for-time-separated-operation** Operating sequentially (never simultaneously) avoids race conditions without needing distributed locking.
- **#for-fail-fast** If external parity checks or integrations fail, we crash loudly rather than silently corrupting state.
- **#for-env-contract-sync** `.env.example` serves as the exact intersection contract for both Legacy and Target apps.
- **#not-simultaneous-read-write** Prevents rate limit conflicts and overlapping writes.
- **#not-infra-duplication** Keeps cloud costs down and avoids migrating data across separate Cloudflare buckets.
- **#not-no-parity-checks** Unchecked drift leads to silent production handoff failures.

---

## Core Rules

### External Integration Closure (Task Finalization)

**Goal**: Finalize tasks while identifying high-value growth opportunities (F-I-N-S) using ranked multi-variant analysis.

**Trigger**: Command initiates two-phase process — Closure (mandatory) and Discovery (conditional). Levels: L1 Routine (closure only); L2 Module (local discovery); L3 System (full + web intelligence).

**Phase 1 Closure**: Sync config/state paths; update project-evolution; run index-gen; sync .env keys to .env.example; add skill anchors in code.

**Phase 2 Discovery** (L2/L3): Ranked F-I-N-S analysis; ROI filter >1.5x; recommended selection; argumentation blocks per category. Zero-cost policy for integrations.

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

