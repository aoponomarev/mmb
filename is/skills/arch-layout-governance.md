---
title: "Architecture: Layout & README Governance"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-01"
---

# Architecture: Layout & README Governance

> **Context**: Defines the rules for folder structures and mandatory directory documentation (README.md files) in the Target App.

## Reasoning

- **#for-readme-local-contract** A `README.md` inside a directory acts as a local architectural contract. It explains the boundary, what is allowed, and what is forbidden in that directory, without forcing the developer to search through global architecture docs.
- **#for-cognitive-load-reduction** By documenting subfolders within a parent `README.md` (e.g., in `is/scripts/`), we reduce visual noise and make the ownership and purpose of each subfolder immediately clear.
- **#for-migration-exit-policy** Any folder created as a temporary layer during migration MUST have a `README.md` with a strict Exit Policy or Mandatory Removal condition. Prevents temporary "crutches" from becoming permanent technical debt.
- **#for-automated-enforcement** Documentation that isn't checked becomes stale. The `validate-readmes.js` script enforces the existence of these critical boundary documents.
- **#not-central-docs** Central docs/ architecture doc — low discoverability for AI agents; skills are MCP-indexed.
- **#not-no-folder-docs** No folder-level documentation — leads to structure degradation as new files are added randomly.

---

## Implementation Status in Target App

- `Implemented`: Required README.md files for core boundaries (`app/`, `core/`, `is/`, `docs/`, `data/`).
- `Implemented`: Required README.md files for skill directories (`app/skills/`, `core/skills/`, `is/skills/`).
- `Implemented`: Required README.md files for critical subsystems (`is/scripts/`, `is/contracts/`).
- `Implemented`: Required README.md files for supplemental root folders (`shared/`, `styles/`, `scripts/`, `mm/`). Enforced by `validate-readmes.js`.
- `Implemented`: Automated enforcement via `npm run readmes:check` (runs `is/scripts/architecture/validate-readmes.js`) and integrated into `health-check`.

## Architectural Reasoning (Why this way)

- **Local Contracts**: A `README.md` inside a directory acts as a local architectural contract. It explains the boundary, what is allowed, and what is forbidden in that directory, without forcing the developer to search through global architecture docs.
- **Cognitive Load Reduction**: By documenting subfolders within a parent `README.md` (e.g., in `is/scripts/`), we reduce visual noise and make the ownership and purpose of each subfolder immediately clear.
- **Migration & Temporary Layers**: Any folder created as a temporary layer during migration MUST have a `README.md` with a strict `Exit Policy` or `Mandatory Removal` condition. This prevents temporary "crutches" from becoming permanent technical debt.
- **Automated Enforcement**: Documentation that isn't checked becomes stale. The `validate-readmes.js` script enforces the existence of these critical boundary documents.

## Directory Policies

1. **Root Bounds**: The root layer is divided into strictly separated domains:
   - `app/`: Frontend UI (No-build architecture). Root component, domain-specific components, templates.
   - `core/`: Backend services, API, config, domain logic, and framework-agnostic business logic.
   - `is/`: Infrastructure space (scripts, skills, contracts, MCP, cloudflare, yandex, secrets).
   - `docs/`: Architectural history, plans, runbooks, backlog, cheatsheets, policies.
   - `data/`: Local storage, caches (git-ignored). MCP memory lives in `is/memory/`.
   - `shared/`: Reusable components, styles, utils (shared across app).
   - `styles/`: CSS files (wrappers, layout, custom).
   - `scripts/`: Project-level utilities (e.g. `scripts/backups/`). Distinct from `is/scripts/` (infrastructure automation).
   - `mm/`: Math models (domain-specific calculators). Legacy structure.
2. **Script Layout**: `is/scripts/` root must contain only `README.md`, top-level entrypoints (`preflight.js`), and one-off migration utilities (e.g. `migrate-plans.js`). All other scripts go into subfolders: `architecture/`, `infrastructure/`, `secrets/`, `tests/`. See `is/scripts/README.md`.
3. **Skill Layout**: Skills are distributed per `process-skill-placement.md`:
   - `is/skills/`: Infrastructure and process knowledge (`arch-*.md`, `process-*.md`).
   - `core/skills/`: Backend and shared domain knowledge (e.g. `api-layer.md`, `cache-layer.md`, `config-contracts.md`).
   - `app/skills/`: UI layer knowledge (e.g. `ui-architecture.md`, `file-protocol-cors-guard.md`, `ux-principles.md`).

## README Maintenance Procedure

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

## Agent Triggers

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

