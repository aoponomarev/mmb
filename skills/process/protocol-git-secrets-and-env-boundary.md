---
id: protocol-git-secrets-and-env-boundary
title: Protocol - Git Secrets and Env Boundary
scope: process
tags: [#protocol, #git, #security, #env]
priority: high
created_at: 2026-02-15
updated_at: 2026-02-21
migrated_from: mbb:process/protocol-git-secrets-and-env-boundary
migration_status: done
migration_notes: "Adapted for MMB structure"
---

# Protocol - Git Secrets and Env Boundary

> **Goal**: Prevent accidental secret leakage while keeping env governance practical for solo workflow.
> **SSOT**: root `.env` and `.env.example` policy.

## 1. Hard Rules

- Never stage real secrets from `.env`.
- Keep placeholders only in `.env.example`.
- Block commit when staged diff contains obvious key/token signatures.

## 2. Allowed vs Blocked

- **Allowed**:
  - key names
  - placeholders (`your-api-key-here`)
  - non-sensitive toggles
- **Blocked**:
  - bearer/JWT tokens
  - provider private keys
  - passwords and long API key strings

## 3. Pre-Commit Verification

1. `git diff --cached --name-only`
2. If `.env` is staged, unstage and re-check.
3. Run:
   - `powershell -ExecutionPolicy Bypass -File .\scripts\infrastructure\preflight-solo.ps1`

## 4. Incident Response

- If secret is committed by mistake:
  1. Revoke the key first.
  2. Rotate secret in provider console.
  3. Clean repository history only if required.
