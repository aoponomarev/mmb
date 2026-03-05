---
title: "Process: Secrets Hygiene & Git Boundary"
reasoning_confidence: 0.95
reasoning_audited_at: "2026-03-05"
reasoning_checksum: "a580359e"
id: sk-b7e114

---

# Process: Secrets Hygiene & Git Boundary

> **Context**: Zero-tolerance policy for secrets in Git. Covers pre-commit rules, recovery protocol, and the `.env` / `.env.example` boundary.
> **Scope**: Root `.env`, `is/secrets/`, `is/contracts/env/`, `.gitignore`

## Reasoning

- **#for-zero-tolerance-secrets** Secrets in Git propagate forever. Prevention is the only strategy, as rotation is costly.
- **#for-encrypted-backup** AES-256 archives in `is/secrets/archives/` enable quick 1-command restores, avoiding painful manual reconstruction on new machines.
- **#for-no-bypass-push** Bypassing GitHub secret detection with `--no-verify` defeats the safety net; leaks must be fixed properly.
- **#for-eip** The `.env` / `.env.example` sync boundary ensures no required keys are silently forgotten by team members.

---

### Hard Rules (Non-Negotiable)

1. **No secrets in Git.** Tokens, API keys, passwords, archive keys are **FORBIDDEN** in any tracked file.
2. **`.env` is always gitignored.** Only `.env.example` (with placeholders) is committed.
3. **`secrets-backup.txt` is always gitignored.** Real values live only in local encrypted archives (`is/secrets/archives/`).
4. **Encrypted backup is mandatory.** Before any system migration or machine move, run `npm run secret:backup`.
5. **Push protection must not be bypassed.** If GitHub blocks a push due to secret detection, fix the leak — do not use `--force` or `--no-verify` to bypass.

### Pre-Commit Verification

Before committing any change touching `.env`, `is/contracts/env/`, or `is/secrets/`:

1. Run `git diff --cached --name-only` to inspect what is staged.
2. If `.env` itself is staged — unstage it immediately: `git restore --staged .env`.
3. If `is/secrets/archives/` contains non-encrypted files — do not commit.
4. Run `npm run preflight` to trigger the full contract validation chain.

### `.env` / `.env.example` Sync Contract (EIP — Every Item Present)

Every key defined in `.env` MUST have a matching entry in `.env.example` (with a placeholder or description comment).
Every key in `.env.example` MUST still be expected in `.env` — no stale placeholders.

**Workflow when adding a new env variable:**
1. Add the real value to `.env`.
2. Add the placeholder immediately to `.env.example`.
3. Run `npm run preflight` to verify the sync (env validation runs inside preflight).
4. Commit only `.env.example`.

**Hard constraints for `.env.example`:**
- Never store real secret values — use placeholders like `YOUR_API_KEY_HERE`.
- Use `#` comments to explain the purpose of each variable.
- If a variable is used in Docker or cloud functions, it must exist in both files.

## Implementation Status

If a secret is accidentally committed:
1. **Revoke the key immediately** in the provider console (before anything else).
2. **Rotate the secret** — generate a new key and update `.env` locally.
3. **Purge from git history** only if the commit has NOT been pushed yet (interactive rebase). If already pushed, force-push cleanup is required (coordinate with team if any).
4. Verify `.gitignore` is correct and run a fresh `git status` check.

### File Map

| File | Purpose |
|---|---|
| `.env` | Real secrets. Gitignored. **Never committed.** |
| `.env.example` | Placeholder template. Committed. SSOT for expected keys. |
| `is/secrets/archives/` | AES-256 encrypted backups. Gitignored. |
| `is/contracts/env/env-rules.js` | Zod validation schema for required env variables. |
| `is/scripts/secrets/secret-resilience.js` | Backup/restore/check scripts. |

### Commands

```bash
npm run secret:backup     # Encrypt .env -> is/secrets/archives/
npm run secret:restore    # Restore .env from latest archive
npm run secret:check      # Verify archive integrity
npm run preflight         # Full validation chain (includes env contract check)
```

### Placeholders (Standard Format)

Use these placeholder patterns in `.env.example`:

```
YOUR_COINGECKO_API_KEY
YOUR_CLOUDFLARE_API_TOKEN
YOUR_BINANCE_API_KEY
YOUR_SECRET_ARCHIVE_KEY_32CHARS_MIN
```
