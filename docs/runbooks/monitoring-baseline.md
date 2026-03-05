---
id: runbook-94a80a
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Monitoring Baseline v1 (Target App)

## Scope
- Control Plane health (`health-check`)
- Operational snapshot collection
- Redaction contract for operational artifacts
- Incident severity and rollback linking

## Monitoring minimum v1

- 1-minute startup/control-plane health probe: `npm run health-check` / `npm run health-check:json`
- 5-minute heartbeat in long-running checks: `npm run health-check:json`
- `health snapshot` collection for every control checkpoint
- Snapshot journal: `logs/monitoring-health.jsonl`
- Snapshot collection entry point: `npm run monitoring:snapshot`

## Contracts

- Snapshot should be JSON object with:
  - `timestamp`
  - `generated_at`
  - `overall`
  - `planes`
- `overall` expected values: `healthy`, `degraded`, `unhealthy`
- `health-check` output can include warnings but no secret values.

## Redaction policy

- Secrets, provider keys, and runtime credentials must never be written into monitoring artifacts.
- Allowed artifacts: plane names, check names, status, non-sensitive details, timestamps.
- Any secret-like fields from environment or runtime diagnostics must be removed before persistence.

## Alert map (v1)

- `overall: unhealthy` — Sev-1; block rollout and open incident.
- `plane: unhealthy` with critical check — Sev-2; trigger `single-writer` and rollback evaluation.
- warning-only degradation — Sev-3; continue with postmortem note in change log.

## Incident flow (v1)

1. Run `npm run monitoring:baseline` after any environment or orchestration change.
2. Start from `npm run health-check:json` for current status.
3. Persist evidence:
   - `npm run monitoring:snapshot`
   - append to incident note with snapshot time and failing plane(s).
4. If severity requires rollback:
   - follow rollback procedures if data-plane ownership is involved.

## Rollback linkage

- This runbook is a trigger layer for rollback gates:
  - cache integrity checks and secret integrity checks
  - single-writer checks

## Test commands

- `npm run health-check:json`
- `npm run monitoring:snapshot`
- `npm run monitoring:baseline`
