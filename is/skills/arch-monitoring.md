---
title: "Architecture: Monitoring & Observability"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-01"
---

# Architecture: Monitoring & Observability

> **Context**: Defines the monitoring, health-check, and observability strategy for the Target App during and after migration.

## Reasoning

- **#for-observability** Standardized startup contracts (`npm run preflight`, `npm run health-check`) increase system observability without adding heavy external dependencies.
- **#for-observability-before-migration** Without health-checks and monitoring, migration becomes opaque. Early investment in lightweight diagnostics catches regressions before they cascade.
- **#for-preflight-over-postmortem** Proactive validation (running scripts before deployment/commits) is cheaper and more reliable than reactive debugging after failures.
- **#for-three-plane-model** Separating health checks by concern area (knowledge/contract/runtime) ensures no single plane failure can mask issues in another.
- **#for-jsonl-over-database** Using append-only `.jsonl` files for trend data keeps the monitoring stack zero-dependency and compatible with `file://` portability constraint.
- **#for-redaction-by-design** Monitoring snapshots and logs must never contain secrets or PII. All logging paths use structured output with known safe fields only.
- **#for-rollback-linkage** Monitoring triggers (Sev-2+ sustained, unhealthy health-check) are explicitly defined as rollback triggers in the protocol, creating a formal decision chain.
- **#not-prometheus-grafana** Enterprise observability stack (Prometheus/Grafana) — over-engineering for a portfolio project. JSONL + console scripts provide sufficient signal.
- **#not-manual-diagnosis** Manual-only diagnosis — unreproducible and error-prone during active migration.
- **#not-defer-monitoring** Monitoring deferred until after migration — high operational risk of invisible regressions.

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

