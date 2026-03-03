# Backlog Skills Audit

> **Date**: 2026-03-01
> **Scope**: `docker-infrastructure.md`, `n8n-infrastructure.md` — compliance with arch-foundation, naming contracts, paths SSOT, and plan-skills-migration-registry §9.

## Summary

| File | Issues | Status |
|------|--------|--------|
| docker-infrastructure.md | Legacy paths, INFRASTRUCTURE_CONFIG, health-check path | Fixed |
| n8n-infrastructure.md | n8n-mbb (anti-calque), paths, GET /api/infra | Fixed |

## Findings

### 1. Anti-calque (arch-foundation, naming-rules.js)

- **n8n-mbb** in n8n-infrastructure.md — container name violates `FORBIDDEN_TERMS: ['mbb', 'mmb']`. Replace with generic `n8n` or `n8n-app`.

### 2. Paths SSOT (arch-foundation, paths.js)

- **scripts/health-check.js** — Wrong. Actual: `is/scripts/infrastructure/health-check.js`, invoked via `npm run health-check`.
- **events/SKILL_CANDIDATES.json** — Not in PATHS. When promoting: use `PATHS` or add to paths.js. arch-skills-mcp uses short form; clarify as `core/events/` or `is/events/` per project layout.
- **drafts/tasks/** — PATHS has `drafts: docs/drafts`. So `docs/drafts/tasks/` is canonical.

### 3. INFRASTRUCTURE_CONFIG.yaml

- Referenced in docker-infrastructure but **does not exist** in mmb. config-contracts.md declares it SSOT for settings sync. When promoting: create or document as future artifact.

### 4. control-plane / GET /api/infra/dependency-health

- n8n-infrastructure references `GET /api/infra/dependency-health`. This endpoint comes from control-plane, which **does not exist**. When promoting: either assume control-plane API or remove.

### 5. Active skills with deferred references

These active skills still reference non-existent infrastructure (control-plane/, Docker, INFRASTRUCTURE_CONFIG). They describe future state; consider adding "when deployed" notes:

- arch-control-plane — Hybrid Bridge (control-plane/, n8n)
- arch-dependency-governance — control-plane/package.json
- async-contracts — control-plane self-test, docker compose
- ai-providers-architecture — control-plane self-test, docker
- config-contracts — INFRASTRUCTURE_CONFIG.yaml

## Promotion Checklist (when moving to is/skills/)

1. Replace all paths with `PATHS` from paths.js.
2. Ensure no mbb/mmb in paths, filenames, or container names.
3. Add frontmatter (id, reasoning, etc.) per plan §5.
4. Register in causality-registry if anchors added.
5. Add to docs/index-skills.md.
6. Run full wiring per plan §5–7.
