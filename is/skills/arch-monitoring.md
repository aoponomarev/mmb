---
title: "Architecture: Monitoring & Observability"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-02"
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

