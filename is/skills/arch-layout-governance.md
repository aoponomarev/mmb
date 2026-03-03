---
title: "Architecture: Layout & README Governance"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "7ebe9e38"

---

# Architecture: Layout & README Governance

> **Context**: Defines the rules for folder structures and mandatory directory documentation (README.md files) in the Target App.

## Reasoning

- **#for-readme-local-contract** A `README.md` acts as a localized architectural contract for a boundary, explaining rules without forcing devs to search global docs.
- **#for-cognitive-load-reduction** Documenting subfolders inside a parent `README.md` makes ownership clear and reduces visual noise.
- **#for-migration-exit-policy** Temporary migration folders must have strict Exit Policies so they don't become permanent tech debt.
- **#for-automated-enforcement** The `validate-readmes.js` script enforces documentation presence so it doesn't decay.
- **#not-central-docs** Monolithic docs lose context quickly; folder-level READMEs scale better.
- **#not-no-folder-docs** Skipping folder docs leads to structure degradation over time.

---

## Implementation Status in Target App

- `Implemented`: Required README.md files for core boundaries (`app/`, `core/`, `is/`, `docs/`, `data/`).
- `Implemented`: Required README.md files for skill directories (`app/skills/`, `core/skills/`, `is/skills/`).
- `Implemented`: Required README.md files for critical subsystems (`is/scripts/`, `is/contracts/`).
- `Implemented`: Required README.md files for supplemental root folders (`shared/`, `styles/`, `scripts/`, `mm/`). Enforced by `validate-readmes.js`.
- `Implemented`: Automated enforcement via `npm run readmes:check` (runs `is/scripts/architecture/validate-readmes.js`) and integrated into `health-check`.

## Core Rules

1. **Root Bounds**: The root layer is divided into strictly separated domains:
   - `app/`: Frontend UI (No-build architecture). Root component, domain-specific components, templates.
   - `core/`: Backend services, API, config, domain logic, and framework-agnostic business logic.
   - `is/`: Infrastructure space (scripts, skills, contracts, MCP, cloudflare, yandex, secrets).
   - `docs/`: Plans, done, ais, audits (system), backlog, cheatsheets, runbooks. See `process-docs-lifecycle.md`.
   - `data/`: Local storage, caches (git-ignored). MCP memory lives in `is/memory/`.
   - `shared/`: Reusable components, styles, utils (shared across app).
   - `styles/`: CSS files (wrappers, layout, custom).
   - `scripts/`: Project-level utilities (e.g. `scripts/backups/`). Distinct from `is/scripts/` (infrastructure automation).
   - `mm/`: Math models (domain-specific calculators). Legacy structure.
2. **Script Layout**: `is/scripts/` root must contain only `README.md`, top-level entrypoints (`preflight.js`), and one-off migration utilities (e.g. `migrate-plans.js`). All other scripts go into subfolders: `architecture/`, `infrastructure/`, `secrets/`, `tests/`. See `is/scripts/README.md`.
3. **Skill Layout**: Skills are distributed per `process-skill-governance.md`:
   - `is/skills/`: Infrastructure and process knowledge (`arch-*.md`, `process-*.md`).
   - `core/skills/`: Backend and shared domain knowledge (e.g. `api-layer.md`, `cache-layer.md`, `config-contracts.md`).
   - `app/skills/`: UI layer knowledge (e.g. `ui-architecture.md`, `file-protocol-cors-guard.md`, `ux-principles.md`).

## Contracts

### When to Update

| Trigger | Action |
|---------|--------|
| **Add subfolder** | Update parent `README.md` — add entry to Subdirectories/Subfolders/Structure section. |
| **Remove/rename subfolder** | Update parent `README.md` — remove or rename the corresponding entry. |
| **Change Scope or Constraints** | Update the relevant section in the affected `README.md`. |
| **Add new root-level folder** (with README) | Add path to `validate-readmes.js` `REQUIRED_READMES` and to this skill's Directory Policies. |

### Who Updates

- **Developer**: Before committing structural changes, run `npm run readmes:check`. If sync validation fails, run `npm run readmes:sync` to auto-fix subdirectory lists, then review and commit.
- **AI Agent**: When adding, removing, or renaming directories — update the parent README in the same commit. After structural edits, run `readmes:check` and `readmes:sync` if needed.

### Automation

- `npm run readmes:check` — Validates existence, minimal length, and **structure sync** (listed subdirs match filesystem). Fails if out of sync.
- `npm run readmes:sync` — Auto-updates Subdirectories/Subfolders/Structure sections to match filesystem. Adds missing entries (with placeholder description), removes stale entries. Does not overwrite existing descriptions.
- `health-check` runs `readmes:check` — structural drift blocks health.

### Agent Triggers

When an AI agent (Cursor, Continue) performs any of the following, it MUST:

1. **After adding a new directory** under `app/`, `core/`, `is/`, `shared/`, `styles/`, `scripts/`, `docs/`, `is/scripts/`, `is/contracts/`:
   - Update the parent `README.md` Subdirectories/Subfolders/Structure section.
   - Run `npm run readmes:check` before considering the task complete.

2. **After removing or renaming a directory** in the above paths:
   - Update the parent `README.md` accordingly.
   - Run `npm run readmes:check`.

3. **When `readmes:check` fails with structure sync errors**:
   - Run `npm run readmes:sync` to auto-fix subdirectory lists.
   - Review generated placeholders (e.g. `TODO: add description`) and fill in proper descriptions.
   - Re-run `readmes:check` until it passes.

4. **Before committing structural changes**:
   - Ensure `npm run readmes:check` passes. If not, fix or run `readmes:sync`.

