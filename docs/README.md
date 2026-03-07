---
id: docs-6a2d1f
status: active
last_updated: "2026-03-04"

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# Documentation & Architecture History (`docs/`)

## Scope
This directory serves as the historical ledger and runbook repository for the project. While active architectural rules live in `is/skills/`, planning, execution history, and manual runbooks live here.

## Structure
- `plans/`: Active migration and architectural plans (with `[ ]` checkboxes). New work starts here.
- `done/`: Staging for completed plans before distillation. Files are deleted after distillation.
- `ais/`: Architecture & Infrastructure Specifications (Russian). Macro-docs distilled from plans. Includes `ais-yandex-cloud.md` (ingest/read contours, Mermaid diagrams).
- `audits/`: **SYSTEM** — causality-exceptions.jsonl consumed by #JS-eG4BUXaS (validate-causality-invariant.js). **Do not rename or move.**
- `backlog/`: Deferred plans and future architecture drafts. Not for distillation.
- `backlog/skills/`: Deferred skills (Docker, n8n, Yandex Cloud, etc.) — useful but not wired until infrastructure exists.
- `cheatsheets/`: Quick reference materials (e.g., architecture layers, data-pipeline-debug). Human-oriented.
- `runbooks/`: Step-by-step operational procedures (monitoring, rollback, data-pipeline-troubleshooting). Implements skills.

## Root Files
- id:doc-del-log (docs/deletion-log.md): Log of removed docs (Doc | Commit | Rationale).
- id:doc-f8d4af (docs/migration-roadmap.md): Master roadmap tracking all migration stages.
- id:doc-f1a4d3 (docs/project-evolution.md): SSOT log of significant project milestones and decisions.
- id:docidx-0b048e (docs/index-skills.md): Auto-generated index of all skills (updated by `npm run skills:index`).
- id:docidx-3022eb (docs/index-ais.md): Auto-generated index of AIS specifications (updated by `npm run ais:index`).
- `СИМЛИНКИ.txt`: Personal Cursor symlink/junction instructions (not project architecture).

## ID Contracts (Global SSOT)
- Global registry: `is/contracts/docs/id-registry.json` (single SSOT for markdown id -> path mapping).
- Contract format in docs: use mixed reference mode. `id:<document-id>` is canonical; the first important mention may add `(docs/.../file.md)`, while repeated mentions in the same file should collapse to bare id.
- ID-contract rollout: id-registry.json + validate-global-md-ids (complete).
- Legacy remediation: LIR complete; #JS-cMCNbcJ1 (path-contracts.js) + Path Rewrite Log in docs/ais/*.md.

## Constraints
- **Russian Language Allowed**: Unlike skills (см. is/skills/, core/skills/, app/skills/) and code, `.md` files in `docs/` are permitted to be in Russian to lower the cognitive barrier for historical planning.
- **Active Causality**: When a plan is moved to `done/`, its architectural reasoning MUST be extracted into an `is/skills/arch-*.md` file.
