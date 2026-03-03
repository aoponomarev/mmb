# Documentation & Architecture History (`docs/`)

## Scope
This directory serves as the historical ledger and runbook repository for the project. While active architectural rules live in `is/skills/`, planning, execution history, and manual runbooks live here.

## Structure
- `plans/`: Active migration and architectural plans (with `[ ]` checkboxes). New work starts here.
- `done/`: Staging for completed plans before distillation. Files are deleted after distillation.
- `ais/`: Architecture & Infrastructure Specifications (Russian). Macro-docs distilled from plans. Includes `ais-yandex-cloud.md` (ingest/read contours, Mermaid diagrams).
- `audits/`: **SYSTEM** — `causality-exceptions.jsonl` consumed by `validate-causality-invariant.js`. **Do not rename or move.**
- `backlog/`: Deferred plans and future architecture drafts. Not for distillation.
- `cheatsheets/`: Quick reference materials (e.g., architecture layers, data-contour-debug). Human-oriented.
- `runbooks/`: Step-by-step operational procedures (monitoring, rollback, data-contour-troubleshooting). Implements skills.

## Root Files
- `migration-roadmap.md`: Master roadmap tracking all migration stages.
- `project-evolution.md`: SSOT log of significant project milestones and decisions.
- `index-skills.md`: Auto-generated index of all skills (updated by `npm run skills:index`).
- `index-ais.md`: Auto-generated index of AIS specifications (updated by `npm run ais:index`).
- `СИМЛИНКИ.txt`: Personal Cursor symlink/junction instructions (not project architecture).

## Constraints
- **Russian Language Allowed**: Unlike `skills/` and code, `.md` files in `docs/` are permitted to be in Russian to lower the cognitive barrier for historical planning.
- **Active Causality**: When a plan is moved to `done/`, its architectural reasoning MUST be extracted into an `is/skills/arch-*.md` file.
