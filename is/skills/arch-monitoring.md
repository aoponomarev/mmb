---
title: "Architecture: Monitoring & Observability"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-03"
reasoning_checksum: "e9024df0"
id: sk-92384e

---

# Architecture: Monitoring & Observability

> **Context**: Defines the monitoring, health-check, and observability strategy for the Target App during and after migration.

## Reasoning

- **#for-observability** Early setup of lightweight standard checks (`preflight`, `health-check`) avoids migration regressions without heavy deps.
- **#for-observability-before-migration** Catch regressions early during migration.
- **#for-preflight-over-postmortem** Proactive validation is cheaper and more reliable than reactive debugging after failures.
- **#for-three-plane-model** Separating checks by plane (knowledge/contract/runtime) ensures failures in one don't mask issues in another.
- **#for-jsonl-over-database** Append-only `.jsonl` files for trend data keep monitoring zero-dependency and local-first (`file://`).
- **#for-redaction-by-design** Monitoring logs must never contain secrets or PII; structured outputs use known safe fields only.
- **#for-rollback-linkage** Explicitly tying monitoring to rollback triggers removes emotional decision-making.
- **#not-prometheus-grafana** Enterprise observability stacks are over-engineering for a portfolio project.
- **#not-manual-diagnosis** Unreproducible and error-prone during active migration.
- **#not-defer-monitoring** Waiting until after migration risks invisible regressions.

---

## Core Rules

### 1. Logging & Tracking Strategy

**Context**: Unified logging for transparency and debugging. Location: `logs/` directory.

**Log types**: (1) Tracking (Git tracked) — `changelog.md`, `fixes-tracking.md`, `issues-backlog.md`; (2) Operational — `session-report.md`, `handoff-note.md`; (3) Runtime (gitignored) — `skills-events.log`, `infra-manager.log`, `mcp-debug.log`.

**Agent workflow**: Start → read `handoff-note.md` + `issues-backlog.md`; Error → check `skills-events.log` (tail 50); Success → update `fixes-tracking.md`; End → write `session-report.md`.

**Hard constraints**: All log filenames lowercase/kebab-case; logs must NOT contain API keys or tokens; markdown logs newest entries at top.

### 2. SQLite Health Snapshot

**Goal**: Lightweight operational visibility for SQLite health. SSOT: см. is/scripts/infrastructure/ (health-check, validate-*).

**Trigger**: Node/runtime dependency changes; Docker compose/volume/path changes; SQLite incident symptoms (timeouts, lock errors, slow workflows).

**Command**: `node is/scripts/infrastructure/health-check.js` (или аналог). Expected output: JSON summary with detected SQLite files, WAL/SHM and DB size signals, better-sqlite3 load check result.

**Preflight integration**: Script used by staged-only preflight when SQLite-risk zones are touched; strict mode via env gates in CI/local policy.

### 3. SQLite Readonly Diagnostics Protocol

**Goal**: Collect SQLite evidence without risking data integrity. First step is read-only snapshot; do not run destructive cleanup/rebuild before diagnostics.

**Required command**: `node is/scripts/infrastructure/health-check.js` (или аналог).

**Evidence checklist**: Presence/size of `database.sqlite`; WAL/SHM size and growth behavior; better-sqlite3 loadability and reported sqlite version.

**Escalation**: If snapshot shows severe anomalies, continue with controlled recovery protocol; recovery steps explicit and reversible where possible.

---

## Implementation Status in Target App

- `Implemented`: Full monitoring baseline v1.
  - `npm run health-check` — checks knowledge/contract/runtime planes.
  - `npm run health-check:json` — JSON output for automation.
  - `npm run monitoring:snapshot` — appends health snapshot to `logs/monitoring-health.jsonl`.
  - `npm run monitoring:baseline` — sanity check on monitoring baseline.
  - `npm run skills:health:trend` — appends skills health metrics to `logs/skills-health-trend.jsonl`.
  - `npm run skills:health:trend:report` — summarizes trend over last N snapshots.
- `Implemented`: Rollback protocol runbook at `docs/runbooks/rollback-protocol.md`.
- `Implemented`: Monitoring baseline runbook at `docs/runbooks/monitoring-baseline.md`.

