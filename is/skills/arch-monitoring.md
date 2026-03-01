# Architecture: Monitoring & Observability

> **Context**: Defines the monitoring, health-check, and observability strategy for the Target App during and after migration.

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

## Architectural Reasoning (Why this way)

- **Observability before feature migration**: Without health-checks and monitoring, migration becomes opaque. Early investment in lightweight diagnostics catches regressions before they cascade.
- **Preflight + health-check over post-mortem**: Proactive validation (running scripts before deployment/commits) is cheaper and more reliable than reactive debugging after failures.
- **Three-plane model (knowledge/contract/runtime)**: Separating health checks by concern area ensures no single plane failure can mask issues in another. Knowledge plane checks skills integrity, contract plane validates env/path SSOT, runtime plane verifies app bootstrap.
- **JSONL trend tracking over database**: Using append-only `.jsonl` files for trend data keeps the monitoring stack zero-dependency and compatible with `file://` portability constraint.
- **Redaction by design**: Monitoring snapshots and logs must never contain secrets or PII. All logging paths use structured output with known safe fields only.
- **Linkage with rollback**: Monitoring triggers (Sev-2+ sustained, unhealthy health-check) are explicitly defined as rollback triggers in the protocol, creating a formal decision chain.

## Alternatives Considered

- Enterprise observability stack (Prometheus/Grafana) — rejected for v1 as over-engineering for a portfolio project. JSONL + console scripts provide sufficient signal.
- Manual-only diagnosis — rejected. Unreproducible and error-prone during active migration.
- Monitoring deferred until after migration — rejected. High operational risk of invisible regressions.
