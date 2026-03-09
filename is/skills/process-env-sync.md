---
id: sk-918276
title: "Process: Environment Sync Governance"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-08
reasoning_checksum: 590b362d
last_change: ""

---

# Process: Environment Sync Governance

> **Context**: Ensures `.env` and `.env.example` are always synchronized. Prevents "works on my machine" failures caused by missing env variables.
> **Scope**: Root `.env`, `.env.example`, `is/contracts/env/env-rules.js`

## Reasoning

- **#for-eip** Divergence between `.env` and `.env.example` is the primary cause of "works on my machine" and CI failures.
- **#for-preflight-enforcement** Preflight Zod validation ensures the contract is maintained—fix the drift before committing.
- **#for-placeholders-no-secrets** Committing `.env.example` with descriptive placeholders documents requirements without leaking actual keys.
- **#for-single-writer-guard** Environment config ensures only one runtime actively writes to cloud resources.
- **#for-cloud-env-readback** For cloud runtimes, the active function version is the operational env SSOT. Redeploying from stale local defaults can silently point production to the wrong database or account.
- **#for-no-empty-cloud-env** Some cloud deployment APIs reject empty values for optional env variables. Empty optional keys must be omitted, not serialized as `KEY=`.

---

## Core Rules

Every key defined in `.env` MUST have a corresponding entry in `.env.example` with a placeholder.
Every key in `.env.example` MUST correspond to a key that is still expected in `.env`.

The preflight script (`npm run preflight`) enforces this contract on every run.

### Verification Protocol

**Automated check**: Zod validation in `is/contracts/env/env-rules.js` is run inside `is/scripts/preflight.js`.

If validation fails:
- **Key in `.env` but missing in `.env.example`**: You added a variable but forgot to update the template.
- **Key in `.env.example` but missing in `.env`**: Stale placeholder or missing local secret.
- **Fix first, commit second.**

### Sync Workflow

When adding a new feature requiring an environment variable:

1. Add the real value to `.env`.
2. **Immediately** add a placeholder entry to `.env.example` with a descriptive comment.
3. Update `is/contracts/env/env-rules.js` if the variable is required (add it to the Zod schema).
4. Run `npm run preflight` to verify.
5. Commit only `.env.example` and `env-rules.js`.

### Hard Constraints

1. **No real secrets in `.env.example`.** Use descriptive placeholders only.
2. **Mandatory comments**: Every variable in `.env.example` must have a `#` comment explaining its purpose and where to obtain the value.
3. **Required vs optional**: Mark each variable's criticality in `env-rules.js` (Zod `.required()` vs `.optional()`).
4. **Cloud function alignment**: If a variable is consumed by Cloudflare Workers or Yandex Cloud functions, it must be present in both `.env` and `.env.example`.

### Yandex Cloud Redeploy Guard

Before redeploying a Yandex Cloud function with `yc serverless function version create`:

1. Read the current active version first (`yc serverless function version list --function-name ...`).
2. Treat the active version env map as the operational SSOT for cloud runtime credentials unless a documented migration explicitly changes it.
3. Preserve unchanged variables from the live function even if local docs, examples, or legacy defaults show different values.
4. Do not pass empty optional values in `--environment`. If `COINGECKO_API_KEY` or another optional key is absent, omit the key entirely from the deploy command.

**Operational anti-pattern**: redeploying from hardcoded defaults such as a legacy database name when the live function already points to another production database.

### DATA_PLANE_ACTIVE_APP (Single-Writer Guard)

This special variable controls which application instance is allowed to write data to shared cloud resources.

**Valid values**: `TARGET`, `LEGACY`

The health-check (`npm run health-check`) validates this variable explicitly. An invalid or missing value will cause the `contracts` plane to show a warning.

**Rule**: Only one value (`TARGET`) should be active during normal PF operation. Switch to `LEGACY` only when intentionally handing over write authority.

### Env Key Governance

**Goal**: One authoritative key source, deterministic rotation, mandatory verification. Root `.env` is SSOT for shared keys; service-local `.env` only for service-specific toggles; service-local MUST NOT redefine shared keys unless documented emergency override.

**Rotation protocol**: Generate new key → update root first → remove stale duplicates → search for token fingerprints → run verification → update docs/skills.

**Drift detection**: Scan `**/.env*` and scripts for duplicate declarations; fix root first, eliminate duplicates, log in project-evolution.

**Verification**: Control-plane health probe; n8n API probe; service startup smoke test; `.env.example` same key set; `npm run env:check` after any key change.
