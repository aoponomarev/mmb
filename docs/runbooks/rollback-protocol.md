---
id: runbook-b188b8
status: active
last_updated: "2026-03-04"
related_skills:
  - sk-6eeb9a
  - sk-92384e
  - sk-e8f2a1
related_ais:
  - ais-8b2f1c

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Rollback Protocol v1 (Target App)

## Principle

Rollback is a controlled operation with checkpoints and ordered layer recovery.
No automatic system-wide rollback without human confirmation.

## Trigger conditions

- `npm run health-check` overall = `unhealthy` in release window,
- `npm run cache:integrity:check` fails in full gate,
- `npm run monitoring:baseline` indicates sustained Sev-2+ on production path,
- `npm run validate:single-writer` critical fail after deployment.

## Response protocol

1) **Immediate stop**:
   - freeze further changes;
   - stop deploy train and notify owner.

2) **Checkpointing**:
   - restore from latest `npm run secret:restore` snapshot if secrets/paths invalid,
   - write operational note in id:doc-f1a4d3 (docs/project-evolution.md) and `logs/` evidence.

3) **Layered rollback order (by blast radius)**

   1. **External Integrations Layer**
      - stop/disable new integration triggers (Cloudflare/Yandex specific switchers),
      - **restore from deployment snapshot** if needed: `is/deployments/<target>/YYYY-MM-DD/` (id:ais-8b2f1c),
      - validate `npm run validate:single-writer`.
   2. **Backend/Transport Layer**
      - rollback changes in `core/api` + related scripts,
      - **restore from deployment snapshot** for Yandex/Cloudflare artifacts if deploy caused regression,
      - run `npm run test` to verify backend suite.
   3. **Control-plane/observability**
      - return monitoring snapshot cadence: `npm run monitoring:snapshot`.

## Mandatory checkpoint rule

- before nontrivial changes in:
  - secret/path contracts,
  - runtime bootstrap,
  - writer switching,
  make `npm run cache:integrity:check` + evidence note.

## Post-rollback

- re-run `npm run preflight` and `npm run test` in controlled environment,
- close with post-mortem action list and ownership assignment.
