---
title: "Architecture: Rollback & Recovery"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-01"
---

# Architecture: Rollback & Recovery

> **Context**: Defines the rollback strategy, trigger conditions, and recovery order for the Target App.

## Reasoning

- **#for-explicit-triggers** Formal rollback triggers (`health-check` unhealthy, `cache:integrity:check` fail, `monitoring:baseline` Sev-2+) remove emotional decision-making during incidents.
- **#for-layered-rollback** Rolling back in order (External Integrations → Backend → Control Plane) minimizes cascading damage. Outermost layers with largest blast radius are rolled back first.
- **#for-human-confirmation** No automatic full-system rollback. Automated rollback of complex multi-layer systems produces too many false positives. Human operator makes the final call.
- **#for-checkpoint-before-change** Before any nontrivial change to secrets, runtime bootstrap, or writer switching, `cache:integrity:check` must pass and evidence must be logged.
- **#for-secret-restore** `npm run secret:restore` provides the first line of recovery for env/secret corruption, avoiding manual reconstruction.
- **#for-postmortem-closure** Every rollback must end with action items and ownership assignment, preventing repeat incidents.
- **#not-rollback-by-situation** Rollback "by situation" without documented protocol — unreproducible under stress.
- **#not-auto-rollback** Fully automatic rollback on any error — too many false positives in a migration context.

---

## Implementation Status in Target App

- `Implemented`: Rollback protocol v1 at `docs/runbooks/rollback-protocol.md`.
- `Implemented`: Trigger conditions tied to health-check and monitoring commands.
- `Implemented`: Layered rollback order by blast radius.
- `Implemented`: Mandatory checkpoint rule for secret/path/writer changes.
- `Implemented`: Post-rollback verification via `npm run preflight` + `npm run test`.

