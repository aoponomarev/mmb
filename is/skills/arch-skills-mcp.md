---
title: "Architecture: Skills & MCP System"
reasoning_confidence: 0.85
reasoning_audited_at: "2026-03-01"
---

# Architecture: Skills & MCP System

> **Context**: Defines the knowledge management architecture: skills storage, validation, MCP server integration, Cursor rules, and the skill migration strategy from Legacy App.

## Reasoning

- **#for-demand-driven-migration** Skills are not copied wholesale from Legacy App. A skill is migrated only when the corresponding code or pattern appears in Target App. Prevents knowledge pollution — stale skills describing non-existent code actively mislead AI agents.
- **#for-distributed-skill-placement** Skills live next to their domain (`is/skills/` for infra, `core/skills/` for API, `app/skills/` for UI) rather than in a monolithic `skills/` vault. Ensures natural co-evolution with code.
- **#for-plain-markdown** The Legacy App had 195 skills with complex YAML frontmatter. For current scale, plain Markdown with H1 as minimum structural contract is sufficient. Frontmatter can be added when skill count justifies it.
- **#for-validate-skills-single** One script (`validate-skills.js`) validates format, detects staleness (>90 days), and identifies orphaned files. JSON output feeds into health-check and trend tracking.
- **#for-simplified-mcp** Legacy App had 4+ validation scripts for skills alone. Target App consolidates into one `validate-skills.js` with `--json` flag, sufficient for current scale.
- **#for-always-apply-true** Testing showed `.cursorrules` and `alwaysApply: false` rules are unreliable in Cursor Agent mode. Critical rules must use `alwaysApply: true` MDC format.
- **#not-wholesale-skill-import** Wholesale skill import from Legacy App (195 skills) — most describe Legacy App-specific code not present in Target App.
- **#not-central-vault** Central `skills/` vault with Obsidian — deferred (reconsider at 50+).
- **#not-skill-submodule** Git submodule for skill sharing — single-project scope, high sync overhead.

---

## Implementation Status in Target App

- `Implemented`: Distributed skill storage across `is/skills/` (18 skills), `core/skills/` (6 skills), `app/skills/` (4 skills) = 28 skills total.
- `Implemented`: `validate-skills.js` — structural validation with JSON output for automation.
- `Implemented`: `generate-skills-index.js` — auto-generates skills index.
- `Implemented`: `skills-health-trend.js` — trend tracking with JSONL append and degradation alerts.
- `Implemented`: `skills-health-trend-report.js` — summary report over configurable window.
- `Implemented`: MCP server at `is/mcp/skills/server.js` (adapted from Legacy App).
- `Implemented`: Memory MCP server via `@modelcontextprotocol/server-memory`.
- `Implemented`: Cursor `.cursor/mcp.json` configuration for both MCP servers.
- `Simplified`: Skills stored as plain Markdown without YAML frontmatter (lightweight approach vs. Legacy App's full frontmatter format). Frontmatter can be adopted incrementally.
- `Simplified`: No Obsidian vault integration (not needed for single-project scope).
- `Simplified`: No `skills/MIGRATION.md` registry (migration tracked via `docs/plans/` and this skill).

## Key Contracts

- Every skill file must have an H1 heading or `title:` frontmatter.
- Skills older than 90 days without updates are flagged as stale (warning, not blocking).
- Files with content < 50 chars are flagged as potentially orphaned.
- `npm run skills:check` must pass before any migration stage can be marked complete.

