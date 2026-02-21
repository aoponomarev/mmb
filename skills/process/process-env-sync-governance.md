---
id: process-env-sync-governance
title: Process - Environment Sync Governance
scope: process
tags: [#env, #security, #governance, #automation, #ssot]
priority: critical
created_at: 2026-02-16
updated_at: 2026-02-21
migrated_from: mbb:process/process-env-sync-governance
migration_status: done
migration_notes: "Adapted for MMB package.json"
---

# Process: Environment Sync Governance

> **Context**: Ensures `.env` and `.env.example` are always in sync (EIP - Every Item Present). Prevents "it works on my machine" failures.

## 1. The "EIP" Principle (Every Item Present)
Every key defined in `.env` (excluding values) MUST have a corresponding entry in `.env.example` with a placeholder or description.

## 2. Verification Protocol
1. **Automated Check**: `npm run env:check` (runs `scripts/validate-env-example.js`).
2. **Preflight Guard**: `scripts/git/preflight-solo.ps1` triggers `env:check` if `.env.example` is staged.

## 3. Sync Workflow
When adding a new feature requiring an environment variable:
1. Add to `.env` with the real value.
2. **Immediately** add to `.env.example` with a placeholder.
3. Run `npm run env:check` to verify synchronization.
4. Commit `.env.example`.

## 4. Hard Constraints
1. **No Secrets in Example**: NEVER commit real keys/tokens to `.env.example`.
2. **Mandatory Descriptions**: Use comments in `.env.example` to explain the purpose of each variable.
3. **Docker Coherence**: If a variable is used in `docker-compose.yml`, it MUST exist in both `.env` and `.env.example`.

## 5. Error Handling
If `env:check` fails:
- **Extra in .env**: You forgot to update `.env.example`.
- **Extra in .env.example**: You have a stale variable or a typo.
- **Action**: Fix the discrepancy before committing.

## 6. Relations
- `protocol-git-secrets-and-env-boundary` (depends_on)
