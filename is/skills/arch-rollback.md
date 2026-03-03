---
title: "Architecture: Rollback & Recovery"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-03"
reasoning_checksum: "df370bfa"
id: sk-6eeb9a

---

# Architecture: Rollback & Recovery

> **Context**: Defines the rollback strategy, trigger conditions, and recovery order for the Target App.

## Reasoning

- **#for-explicit-triggers** Formal triggers (`health-check` fails, Sev-2 monitoring) remove emotional hesitation during incidents.
- **#for-layered-rollback** Rolling back by blast radius (External → Backend → Control Plane) minimizes cascading damage.
- **#for-human-confirmation** Automated full-system rollbacks produce too many false positives; human operators make the final call.
- **#for-checkpoint-before-change** Pre-verification (`cache:integrity:check`) is required before any nontrivial infra change.
- **#for-secret-restore** `npm run secret:restore` provides fast recovery for corrupted env/secrets, avoiding manual reconstruction.
- **#for-postmortem-closure** Every rollback ends with action items to prevent repeat incidents.
- **#not-rollback-by-situation** Rollback "by situation" without a protocol is unreproducible under stress.
- **#not-auto-rollback** Too many false positives in a migration context.

---

## Core Rules

### Deployment Rollback (Primary)

See `docs/runbooks/rollback-protocol.md` for the full protocol. Summary:
- **Triggers**: health-check unhealthy, cache:integrity:check fail, Sev-2+ monitoring, validate:single-writer critical fail.
- **Order**: External Integrations → Backend/Transport → Control-plane.
- **Checkpoint**: `npm run cache:integrity:check` before nontrivial secret/path/writer changes.
- **Post-rollback**: `npm run preflight` + `npm run test`; post-mortem with action list.

### Infrastructure Recovery (Docker/Compose)

When the stack includes Docker Compose services:

1. **Fast health triage**: `docker compose ps`, `docker compose logs --tail=100`, `docker stats --no-stream`. If healthy, stop.
2. **Safe recovery first**: `docker compose config` to validate; restart only affected service (`docker compose restart <service>`).
3. **Controlled recreate**: Only if restart failed — `docker compose up -d --force-recreate --no-deps <service>`.
4. **Data protection**: Never remove named volumes before backup.
5. **Clean slate** (corrupted system): `docker compose down --remove-orphans`; verify env and mounts; rebuild if needed; start.

## Implementation Status in Target App

- `Implemented`: Rollback protocol v1 at `docs/runbooks/rollback-protocol.md`.
- `Implemented`: Trigger conditions tied to health-check and monitoring commands.
- `Implemented`: Layered rollback order by blast radius.
- `Implemented`: Mandatory checkpoint rule for secret/path/writer changes.
- `Implemented`: Post-rollback verification via `npm run preflight` + `npm run test`.

