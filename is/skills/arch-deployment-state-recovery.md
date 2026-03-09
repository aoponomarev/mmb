---
id: sk-4f9d21
title: "Architecture: Deployment State Recovery from Snapshots"
tags: "[#architecture, #deploy, #rollback, #recovery]"
status: active
reasoning_confidence: 0.95
reasoning_audited_at: 2026-03-09
reasoning_checksum: 78216aab
last_change: "#for-config-code-parity-restore — recovery must include code/architecture parity, not only cloud config"
related_skills:
  - sk-e8f2a1
  - sk-6eeb9a
  - sk-73dcca
related_ais:
  - ais-8b2f1c
  - ais-e41384

---

# Architecture: Deployment State Recovery from Snapshots

> **Context**: Defines a strict but flexible recovery protocol for restoring deployment state from `is/deployments/<target>/YYYY-MM-DD/` snapshots, including code and architecture parity so restored cloud state does not break application logic.

## Reasoning

- **#for-snapshot-driven-restore** Recovery quality depends on preserved facts (source copy, settings, diffs), not operator memory.
- **#for-config-code-parity-restore** Deployment state and code revision are a single contract; restoring only one side causes runtime drift.
- **#for-restore-order-external-first** External integrations form runtime boundaries; restoring these first reduces blast radius.
- **#for-restore-verification-gates** Restore completion must be proven by gates and smoke checks, not assumed.
- **#for-deploy-snapshot-diff** Snapshot diffs are required to select exact rollback delta and avoid accidental over-rollback.
- **#for-post-deploy-auto-archive** Every stable deploy should already have fresh evidence, making restore deterministic under pressure.

## Core Rules

1. **Recovery input is snapshot SSOT only**: use `README.md`, `settings.current.json`, `settings.previous.json`, `changes-vs-previous.md`, and `source/`.
2. **Pick restore mode explicitly** before changes:
   - **Full rollback**: restore both runtime settings and code to snapshot state.
   - **Config-only rollback**: restore cloud settings while keeping current code (allowed only if contract parity is proven).
   - **Code-only rollback**: restore code while preserving runtime settings (allowed only if settings are forward-compatible).
3. **Default mode is Full rollback** for production incidents unless a narrower mode is justified and documented.
4. **Restore order**: external deployment targets first (Cloudflare/Yandex), then backend/control-plane verification, then app smoke checks.
5. **Never restore secrets from snapshots**: snapshots store names/contracts only; secret values are restored from secure secret storage.
6. **Fail fast on parity mismatch**: if restored external routes/env contract do not match expected app/core contracts, stop and switch to Full rollback.

## Contracts

### Recovery Checklist (mandatory)

- [ ] Select target snapshot folder: `is/deployments/<target>/YYYY-MM-DD/`.
- [ ] Read snapshot `README.md` and confirm functional goals match incident scope.
- [ ] Validate code parity:
  - Re-apply files from `source/` to active target source tree (or verify hashes already match).
  - Verify expected source hashes from snapshot README.
- [ ] Validate runtime parity:
  - Re-apply non-secret settings from `settings.current.json`.
  - Re-apply secrets by env-name contract from secure storage.
- [ ] Re-deploy target runtime (`wrangler deploy`, `yc ... version create/update`, or target-specific wrapper).
- [ ] Run gates:
  - `npm run preflight`
  - Target health/read endpoints from snapshot README or runbook
  - Scenario smoke check for affected feature paths
- [ ] If any gate fails, revert to previous stable snapshot (or escalate to broader rollback scope).

### Code/Architecture Parity Gate

A restore is **invalid** unless all checks pass:

- Route/API contract still matches consumers (`app/`, `core/`, and external clients).
- Env contract expected by code matches restored runtime contract (`required_names`, optional keys handling).
- Data-plane compatibility holds (cache keys, schema migration level, trigger schedules).

If any check fails, treat it as **contract drift** and execute Full rollback to a snapshot where code + runtime were known-good together.

### Mode Decision Matrix

| Incident type | Preferred mode | Why |
|---|---|---|
| `403/502` after infra deploy | Full rollback | Usually includes access/config + route coupling. |
| Wrong timeout/memory/trigger only | Config-only rollback | Safe only if code and API shape unchanged. |
| Functional regression after code merge with stable infra | Code-only rollback | Infra remains stable; code regression isolated. |
| Mixed unknown symptoms under pressure | Full rollback | Lowest cognitive risk and highest determinism. |

## Risk Mitigation

- Keep snapshots per target per date, but recover using a **coherent release set** when targets are coupled.
- Avoid partial manual edits in cloud consoles without immediate snapshot regeneration.
- Record recovery decision and rationale in operational logs/project evolution notes.
- For coupled targets (`yandex-api-gateway` + `yandex-market-fetcher` + `cloudflare-edge-api`), prefer synchronized rollback date when contracts intersect.

## Implementation Status in PF

- `Implemented`: Snapshot generation with full settings + diff for `yandex-api-gateway`, `yandex-market-fetcher`, `cloudflare-edge-api`.
- `Implemented`: Deploy wrappers with mandatory post-deploy snapshot for Yandex and Cloudflare edge-api.
- `Implemented`: Restore evidence contract in `is/deployments/<target>/YYYY-MM-DD/` with source copy and settings files.
- `Backlog`: Add one-command orchestrated recovery runner (guided restore with automated parity checks across multiple targets).
