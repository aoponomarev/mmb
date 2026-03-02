# Automation & Diagnostics Scripts (`is/scripts/`)

## Scope
Contains all executable Node.js and PowerShell scripts used to validate, build, deploy, and monitor the project.

## Layout Governance Contract
1. The root of `is/scripts/` must contain ONLY:
   - This `README.md`.
   - Top-level entrypoints intended for manual/direct execution (e.g., `preflight.js`).
   - One-off migration utilities (e.g., `migrate-plans.js`).
2. All internal automation MUST be placed in categorized subfolders.
3. Every subfolder must be documented in this README.

## Subfolders
- `architecture/`: Scripts that validate skills, readmes, reasoning, and layout contracts (e.g., `validate-skills.js`).
- `infrastructure/`: Control plane scripts, health-checks, monitoring snapshots, and server bootstrap.
- `secrets/`: Scripts for encrypting, decrypting, and verifying the local secret archive.
- `tests/`: Project-wide test runners and linter entrypoints.
