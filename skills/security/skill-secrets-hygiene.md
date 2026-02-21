---
id: skill-secrets-hygiene
title: Security - Secrets Hygiene
scope: security
tags: [#security, #secrets, #git, #safety]
priority: emergency
created_at: 2026-01-28
updated_at: 2026-02-21
migrated_from: mbb:security/skill-secrets-hygiene
migration_status: done
migration_notes: "Moved to security category, updated for MMB paths"
---

# Security: Secrets Hygiene

> **Context**: Zero-tolerance policy for secrets in Git.
> **Vault**: `secrets-backup.txt` (Local Only).

## 1. Core Rules
1.  **No Secrets in Git**: Tokens, Keys, Passwords, JWT_SECRET are FORBIDDEN in tracked files.
2.  **Backup**: Store real values in `secrets-backup.txt` (GitIgnored).
3.  **Check**: Scan for `client_secret`, `api_key`, `token` before commit.
4.  **Leak Protocol**: Stop -> Remove -> Rewrite History -> Force Push.
5.  **Push Protection**: If blocked, do NOT bypass. Fix the leak.

## 2. Placeholders
Use these in code/docs:
- `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`
- `YOUR_GOOGLE_CLIENT_SECRET`
- `YOUR_JWT_SECRET`
- `YOUR_API_TOKEN`

## 3. File Map
- `@.gitignore`: Must include `secrets-backup.txt` and `.env`.
