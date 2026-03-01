# Architecture: Rollback & Recovery

> **Context**: Defines the rollback strategy, trigger conditions, and recovery order for the Target App.

## Implementation Status in Target App

- `Implemented`: Rollback protocol v1 at `docs/runbooks/rollback-protocol.md`.
- `Implemented`: Trigger conditions tied to health-check and monitoring commands.
- `Implemented`: Layered rollback order by blast radius.
- `Implemented`: Mandatory checkpoint rule for secret/path/writer changes.
- `Implemented`: Post-rollback verification via `npm run preflight` + `npm run test`.

## Architectural Reasoning (Why this way)

- **Explicit triggers over ad-hoc decisions**: Formal rollback triggers (`health-check` unhealthy, `cache:integrity:check` fail, `monitoring:baseline` Sev-2+) remove emotional decision-making during incidents.
- **Layered rollback by blast radius**: Rolling back in order (External Integrations → Backend → Control Plane) minimizes cascading damage. Outermost layers with largest blast radius are rolled back first.
- **Human confirmation required**: No automatic full-system rollback. Automated rollback of complex multi-layer systems produces too many false positives. Human operator makes the final call.
- **Checkpoint-before-change policy**: Before any nontrivial change to secrets, runtime bootstrap, or writer switching, `cache:integrity:check` must pass and evidence must be logged.
- **Secret restore as primary recovery path**: `npm run secret:restore` provides the first line of recovery for env/secret corruption, avoiding manual reconstruction.
- **Post-mortem closure**: Every rollback must end with action items and ownership assignment, preventing repeat incidents.

## Alternatives Considered

- Rollback "by situation" without documented protocol — rejected (unreproducible under stress).
- Fully automatic rollback on any error — rejected (too many false positives in a migration context).
- Multi-region DR scenarios — explicitly out of scope for portfolio project.
