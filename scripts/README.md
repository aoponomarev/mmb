---
id: readme-efc0b5
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Project Scripts (`scripts/`)

## Scope
Project-level utilities run by developers (backups, one-off tasks). Not part of infrastructure automation.

## Distinction
- `scripts/` — manual/adhoc developer tools (e.g. `scripts/backups/backup-app.ps1`).
- `is/scripts/` — infrastructure automation (preflight, health-check, CI, architecture validation).

## Subdirectories
- `backups/`: Backup scripts (PowerShell, ZIP archives). See `scripts/backups/backup-app.ps1`.
- `encoding-fixes/`: Mojibake recovery, UTF-8 enforcement, syntax fixes for migrated files.
- `git/`: TODO: add description
- `observability/`: Fallback observability checks, SSOT guardrails validation.
