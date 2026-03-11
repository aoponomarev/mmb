---
id: sk-e8f2a1
title: "Infrastructure Snapshots (Rollback-Safe Deployments)"
tags: "[#architecture, #deploy, #rollback, #cloud]"
status: active
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-11
reasoning_checksum: 442f9188
last_change: "#for-deploy-verification-window-bypass — verify-before-archive for time-windowed functions must not depend on wall-clock schedule"

---

# Infrastructure Snapshots (Rollback-Safe Deployments)

> **Context**: Obligatory creation of stable deployment snapshots for all external clouds, datasets, and services. **Unified format** for every target (Cloudflare, Yandex, future). Each snapshot MUST link to skills and causalities: which skills are involved, why changes were made, what goals the deployed functionality serves. Macro spec: id:ais-8b2f1c (docs/ais/ais-infrastructure-snapshots.md).

## Reasoning

- **#for-rollback-safe-deployments** Without versioned snapshots of deployed code and config, rollback is guesswork. Each stable deployment must be capturable as a dated artifact.
- **#for-unified-snapshot-format** All deployment targets (Cloudflare Worker, Yandex Functions, etc.) use the same structure and location pattern. One convention reduces errors and simplifies tooling and rollback procedures.
- **#for-snapshot-readme-skills-causalities** Every snapshot README must list involved skills, causalities (reasons for changes), and functional goals. This ties deployments to the rest of the architecture and makes rollback decisions traceable.
- **#for-snapshot-on-success-only** Snapshots are created only after a successful deploy and a minimal verification step. Failed deploys or verification do not produce a stable snapshot.
- **#not-archive-failed-attempts** Failed attempts must not be written to the deployments store; any working snapshot created during a failed deploy must be automatically deleted, with the defect reason captured in an operational log.
- **#for-explicit-snapshot-command** Snapshot creation is an explicit, dedicated pipeline step (script or CI job) that runs automatically after a successful deploy and verification. It must not be a hidden side-effect of arbitrary commands, and for failed deploys it is responsible for automatic cleanup and defect logging.
- **#for-secrets-contract-only** Snapshots contain only the list of env variable names and their contract (required/optional). Never store secret values (passwords, API keys).
- **#for-snapshot-console-settings** Non-secret settings that an agent or user can change in the console of **any** service or cloud (Cloudflare, Yandex Cloud, N8N, external datasets, etc.) — memory, timeout, runtime, trigger schedule, access flags, binding names and types — MUST be stored in the snapshot (README or dedicated file). Rollback then restores full configuration, not just code.
- **#for-deploy-snapshot-diff** Snapshot value is incomplete without explicit change tracking. Each snapshot must include both full current settings and a structured diff against the previous stable state, including console settings and access bindings.
- **#for-post-deploy-auto-archive** If archive creation depends on memory or manual reminders, snapshots are skipped under time pressure. Agent workflow must trigger archive generation immediately after successful deploy + verification.
- **#for-deploy-verification-window-bypass** Some serverless handlers are intentionally gated by runtime windows or schedule-shaped routing. Deploy verification needs an explicit bypass path for those checks, otherwise verify-before-archive fails outside the allowed window even when the deploy is healthy.
- **#for-provider-readback-fallback** Provider CLIs can expose partial metadata depending on platform/version. Snapshot generation must store every reachable setting and transparently mark partial readback instead of failing the entire archive.

### Unified contract: path and structure (all targets)

**Root:** `is/deployments/`. One subfolder per deployment target: `cloudflare-edge-api/`, `yandex-market-fetcher/`, `yandex-api-gateway/`. For each target, dated snapshots: `YYYY-MM-DD/`.

**Inside each `YYYY-MM-DD/`:**
- Copy of source (e.g. `src/` for Edge API, or function root minus `node_modules` for Yandex).
- Config files present in the source (e.g. `wrangler.toml`, `package.json`, `spec.yaml` if any).
- **README.md** (mandatory) with:
  - Date, Version ID (if applicable).
  - List of env variable names (and required/optional). No secret values.
  - **Service/cloud settings (values)** — non-secret configuration set in the console of **any** service or cloud: memory, timeout, runtime, trigger cron, access flags, binding names and types, etc. Everything an agent might change in the console of the target platform (Cloudflare, Yandex Cloud, N8N, or any other service), so that rollback can reproduce the full configuration.
  - Short restore steps.
  - **Involved skills** (skill ids of the form `sk-...` from id-registry.json).
  - **Causalities** (#for-X / #not-Y — reasons for this deployment or changes).
  - **Functional goals** (what the deployed artifact is for).

### Scope (targets)

| Target | Source path | Snapshot path |
|--------|-------------|---------------|
| Cloudflare Edge API | is/cloudflare/edge-api/ | is/deployments/cloudflare-edge-api/YYYY-MM-DD/ |
| Yandex market-fetcher | is/yandex/functions/market-fetcher/ | is/deployments/yandex-market-fetcher/YYYY-MM-DD/ |
| Yandex api-gateway | is/yandex/functions/api-gateway/ | is/deployments/yandex-api-gateway/YYYY-MM-DD/ |

Future targets: same pattern under `is/deployments/<target>/`.

## Core Rules

1. **Unified format only** — every new deployment target uses `is/deployments/<target>/YYYY-MM-DD/` with the same README and content rules. No target-specific layout.
2. **Create a snapshot via an explicit pipeline step** that runs automatically only after (a) successful deploy and (b) minimal verification. Do not store failed attempts; if a working snapshot exists for a failed deploy, the step MUST delete it and record the defect reason (e.g., link to ticket/commit and a short description) instead of keeping the snapshot.
3. **Snapshot step MUST be explicit and observable** (dedicated script or CI job), not an implicit side-effect. Humans should not need to trigger it manually in the happy path, but they MUST be able to re-run it intentionally if automation fails.
4. **Every snapshot MUST include README.md** with: date; Version ID if applicable; env names (no secret values); **service/cloud settings values** (memory, timeout, triggers, runtime, access flags, bindings — all non-secret console configuration); restore steps; **involved skills**; **causalities** (reasons for changes); **functional goals**.
5. **Never put secrets or env values** (passwords, API keys) into snapshots. **Do** store non-secret console settings (values) so rollback can restore full configuration.
6. **One date, one logical release** — if multiple components are deployed as one stable set, use the same date for all; each target still has its own `YYYY-MM-DD/` folder and README.
7. **Archive completeness is mandatory** — every snapshot must pass all three checks:
   - Full reachable settings are captured (function/gateway metadata, versions, env contract, runtime resources, timeouts, triggers, access bindings, integration mapping).
   - Explicit diff vs previous stable state is captured, including configuration/settings changes.
   - Causality updates are applied and verified (new/updated `#for-` hashes in id:sk-3b1519, and snapshot README references those hashes).
   - If provider readback is partial, snapshot must include command-level error diagnostics and a fallback contract from local deployment config files (for example `wrangler.toml`), explicitly marked as partial.
8. **Path contract is strict** — snapshots are stored in `is/deployments/`, and root-level paths for this area must never be prefixed with the `app/` layer segment.

### Auto-Trigger Protocol (mandatory)

When a deploy command succeeds (exit code 0) and minimal verification succeeds:

1. Detect deploy completion for target artifacts (`yc serverless function version create`, `yc serverless api-gateway update/create`, `wrangler deploy`, equivalent CI steps).
2. Immediately generate/update dated snapshot folders in `is/deployments/<target>/YYYY-MM-DD/`.
3. Capture current settings and previous-state baseline from provider CLI/API outputs.
4. Compute and store configuration diff + functional diff summary.
5. Update causality registry when deployment behavior/rules changed.
6. Only then consider deploy workflow finished.

Reference implementation in this repository:
- `is/scripts/infrastructure/archive-deployment-snapshot.js` (CLI: `node ... --target yandex-api-gateway|yandex-market-fetcher|cloudflare-edge-api`).
- `is/scripts/infrastructure/verify-deployment-target.js` (target-specific verify-before-archive gate).
- Deploy wrappers must call verification first and snapshot archiving second as mandatory post-deploy steps.

### Relation to rollback and AIS

id:sk-6eeb9a (Rollback & Recovery) and id:runbook-b188b8 define when to roll back. This skill defines **what to preserve** and **how** (unified structure, README with skills/causalities/goals). id:ais-8b2f1c describes placement choice (is/deployments vs data/deployments) and the high-level flow.
