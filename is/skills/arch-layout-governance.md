---
id: sk-c62fb6
title: "Architecture: Layout & README Governance"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-09
reasoning_checksum: 7ebe9e38
last_change: ""

---

# Architecture: Layout & README Governance

> **Context**: Defines the rules for folder structures and mandatory directory documentation (README.md files) in the PF.

## Reasoning

- **#for-readme-local-contract** A `README.md` acts as a localized architectural contract for a boundary, explaining rules without forcing devs to search global docs.
- **#for-cognitive-load-reduction** Documenting subfolders inside a parent `README.md` makes ownership clear and reduces visual noise.
- **#for-migration-exit-policy** Temporary migration folders must have strict Exit Policies so they don't become permanent tech debt.
- **#for-automated-enforcement** The #JS-VF3AHARR (validate-readmes.js) script enforces documentation presence so it doesn't decay.
- **#not-central-docs** Monolithic docs lose context quickly; folder-level READMEs scale better.
- **#not-no-folder-docs** Skipping folder docs leads to structure degradation over time.

---

## Implementation Status in PF

- `Implemented`: Required README.md files for core boundaries (`app/`, `core/`, `is/`, `docs/`, `data/`).
- `Implemented`: Required README.md files for skill directories (`app/skills/`, `core/skills/`, `is/skills/`).
- `Implemented`: Required README.md files for critical subsystems (`is/scripts/`, `is/contracts/`).
- `Implemented`: Required README.md files for supplemental root folders (`shared/`, `styles/`, `scripts/`, `mm/`). Enforced by #JS-VF3AHARR.
- `Implemented`: Automated enforcement via `npm run readmes:check` (runs #JS-VF3AHARR) and integrated into `health-check`.

## Core Rules

1. **Root Bounds**: The root layer is divided into strictly separated domains:
   - `app/`: Frontend UI (No-build architecture). Root component, domain-specific components, templates.
   - `core/`: Backend services, API, config, domain logic, and framework-agnostic business logic.
   - `is/`: Infrastructure space (scripts, skills, contracts, MCP, cloudflare, yandex, secrets).
   - `docs/`: Plans, done, ais, audits (system), backlog, cheatsheets, runbooks. See id:sk-0e193a (is/skills/process-docs-lifecycle.md).
   - `data/`: Local storage, caches (git-ignored). MCP memory lives in `is/memory/`.
   - `shared/`: Reusable components, styles, utils (shared across app).
   - `styles/`: CSS files (wrappers, layout, custom).
   - `scripts/`: Project-level utilities (e.g. `scripts/backups/`). Distinct from `is/scripts/` (infrastructure automation).
   - `mm/`: Math models (domain-specific calculators). Legacy structure.
2. **Script Layout**: `is/scripts/` root must contain only `README.md`, top-level entrypoints (#JS-NrBeANnz (is/scripts/preflight.js)), and one-off migration utilities (e.g. #JS-V931HiRK (migrate-plans.js)). All other scripts go into subfolders under `is/scripts/` (`architecture/`, `infrastructure/`, `secrets/`, `tests/`). Это legacy-маркировка маршрутизации модулей, трассируется в id:ais-bfd150 (docs/ais/ais-architecture-foundation.md)#LIR-008.A1.. #LIR-008.A4.
3. **Skill Layout**: Skills are distributed per id:sk-d763e7 (is/skills/process-skill-governance.md):
   - `is/skills/`: Infrastructure and process knowledge (`arch-*.md`, `process-*.md`).
   - `core/skills/`: Backend and shared domain knowledge (e.g. `api-layer.md`, `cache-layer.md`, `config-contracts.md`).
   - `app/skills/`: UI layer knowledge (e.g. `ui-architecture.md`, `file-protocol-cors-guard.md`, `ux-principles.md`).

### Libs Repository Setup

**Context**: Initialize or restore `libs` submodule. Type: standalone Git repo; role: CDN via GitHub Pages; branch: main.

**Workflow**: Clone libs repo; run download script; enable Pages (Source: Deploy from branch main/root). **Maintenance**: Add version folder → commit → push; remove old unused versions.

### Libs Repo Workflow

**Context**: Managing libs repository and dependency updates. Trigger: new lib needed or version update.

**Automation**: Check if file in `libs/<name>/<version>/`; if missing, download UMD from CDN; update #JS-xj43kftu (module-loader.js) sources and #JS-os34Gxk3 (modules-config.js) wiring; notify user to commit. **Constraints**: Explicit commit (automation prepares, user commits); UMD only for browser loading.

### Libs Directory Structure & Load Priority

**Context**: Layout of vendor libs repository. Structure: `libs/<name>/<version>/` (vendor only). Coin/icon assets live in a/ root (a/coins, a/data). Load priority: (1) GitHub Pages (primary for web); (2) CDN (backup); (3) Local `file://` (primary for dev/offline). Usage is governed by loader contracts in #JS-xj43kftu.

## Contracts

### When to Update

| Trigger | Action |
|---------|--------|
| **Add subfolder** | Update parent `README.md` — add entry to Subdirectories/Subfolders/Structure section. |
| **Remove/rename subfolder** | Update parent `README.md` — remove or rename the corresponding entry. |
| **Change Scope or Constraints** | Update the relevant section in the affected `README.md`. |
| **Add new root-level folder** (with README) | Add path to #JS-VF3AHARR `REQUIRED_READMES` and to this skill's Directory Policies. |

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

