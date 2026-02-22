---
id: arch-ssot-governance
title: "Architecture: SSOT Governance"
scope: architecture
tags: [#architecture, #ssot, #governance, #paths, #config]
version: 1.0.0
priority: high
updated_at: 2026-02-22
status: active
confidence: high
review_after: 2026-08-22
decision_scope: architecture
decision_id: ADR-ARCH-004
supersedes: none
ssot_target: [paths.js]
relations:
  - arch-master
  - process-env-sync-governance
  - skills-linking-governance
---

# Architecture: SSOT Governance (Single Source of Truth)

## Implementation Status in MMB
- **Implemented:** `paths.js` as the single runtime path router, `.continue/config.ts` loading from `.env`, unified `validate-ssot.js` script, explicit `ssot_target` anchors in YAML.
- **Pending:** ESLint AST rule to strictly ban `process.env` imports outside of SSOT modules.
- **Doubtful:** System-wide NTFS symlinking for global tools (too fragile across WSL/Windows boundaries, relying on `.ts` dynamic configs instead).

## Architectural Reasoning (Why this way)
Data duplication leads to configuration drift. In MBB, we relied on symlinks and manual `> **SSOT**:` tags. In MMB, we move to **Programmatic SSOT & Runtime Contracts**:
1. **Paths Contract:** `paths.js` is the absolute SSOT for the JS layer. Direct reads of `.env` or `process.env` in business logic are forbidden.
2. **Config Contract:** External tools (Continue, MCP) must pull secrets from `.env` dynamically (e.g., via `config.ts`), avoiding hardcoded values in JSON/YAML.
3. **Docs Contract:** `docs/` is exclusively for high-level human planning. Structural AI knowledge must live in `skills/`. Documents in `docs/` are explicitly forbidden from using `relations` or `decision_id` to prevent shadow-skill graphs.
4. **Explicit Targets:** Skills describing a specific file must declare `ssot_target: [path/to/file.js]` in their frontmatter. This allows the validator to ensure the physical file still exists.

## Alternatives Considered
- **MBB Symlink Strategy:** Hardlinking `C:\Users\AO\.continue\config.yaml` to the repo. Rejected because it breaks easily when tools overwrite the symlink instead of editing the target.
- **Global `INFRASTRUCTURE_CONFIG.yaml`:** Rejected. YAML is static; we need dynamic path resolution for cross-platform (Windows/Docker) consistency.

## Enforcement
- Script: `scripts/validate-ssot.js`
- Command: `npm run ssot:check`

This validator ensures:
- All `env.XXX` variables requested by `paths.js` exist in `.env.example`.
- No `docs/*.md` files contain skill-graph metadata (`relations`, `decision_id`).
- Config files (`.continue/config.ts`) do not contain hardcoded secret patterns (`sk-...`, etc).
