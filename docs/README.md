# Documentation & Architecture History (`docs/`)

## Scope
This directory serves as the historical ledger and runbook repository for the project. While active architectural rules live in `is/skills/`, planning, execution history, and manual runbooks live here.

## Structure
- `plans/`: Active migration and architectural plans (must be empty when all stages are complete).
- `done/`: Finalized plans. This is the historical ledger of what was done and why.
- `runbooks/`: Step-by-step guides for manual operations (e.g., rollback protocols, monitoring baselines).
- `backlog/`: Deferred plans and future architecture drafts.
- `cheatsheets/`: Quick reference materials for development.

## Constraints
- **Russian Language Allowed**: Unlike `skills/` and code, `.md` files in `docs/` are permitted to be in Russian to lower the cognitive barrier for historical planning.
- **Active Causality**: When a plan is moved to `done/`, its architectural reasoning MUST be extracted into an `is/skills/arch-*.md` file.
