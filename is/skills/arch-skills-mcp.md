# Architecture: Skills & MCP System

> **Context**: Defines the knowledge management architecture: skills storage, validation, MCP server integration, Cursor rules, and the skill migration strategy from Legacy App.

## Implementation Status in Target App

- `Implemented`: Distributed skill storage across `is/skills/`, `core/skills/`, `app/skills/` (8 skills total).
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

## Architectural Reasoning (Why this way)

- **Demand-driven skill migration**: Skills are not copied wholesale from Legacy App. A skill is migrated only when the corresponding code or pattern appears in Target App. This prevents knowledge pollution — stale skills describing non-existent code actively mislead AI agents.
- **Distributed skill placement over central vault**: Skills live next to their domain (`is/skills/` for infra, `core/skills/` for API, `app/skills/` for UI) rather than in a monolithic `skills/` vault. This ensures natural co-evolution with code.
- **Plain Markdown over full YAML frontmatter**: The Legacy App had 195 skills with complex YAML frontmatter (`id`, `scope`, `tags`, `priority`, `relations`, `decision_id`, `supersedes`). For 8 skills, this overhead is unjustified. The validation script checks for H1 headings as minimum structural contract. Frontmatter can be added when the skill count justifies it.
- **`validate-skills.js` as the single quality gate**: One script validates format, detects staleness (>90 days), and identifies orphaned files. JSON output feeds into health-check and trend tracking.
- **Simplified MCP over full graph/health system**: Legacy App had `validate-skill-graph.js`, `validate-skills-health.js`, `validate-ssot.js`, `validate-symlinks.js` — 4+ validation scripts for skills alone. Target App consolidates into one `validate-skills.js` with `--json` flag, sufficient for current scale.
- **No submodule for skills**: Legacy App used git submodule for skills sharing across projects. Target App has a single project — submodule would add synchronization overhead without benefit.
- **`alwaysApply: true` for critical Cursor rules**: Testing showed `.cursorrules` and `alwaysApply: false` rules are unreliable in Cursor Agent mode. Critical rules must use `alwaysApply: true` MDC format.

## Key Contracts

- Every skill file must have an H1 heading or `title:` frontmatter.
- Skills older than 90 days without updates are flagged as stale (warning, not blocking).
- Files with content < 50 chars are flagged as potentially orphaned.
- `npm run skills:check` must pass before any migration stage can be marked complete.

## Alternatives Considered

- Wholesale skill import from Legacy App (195 skills) — rejected (most describe Legacy App-specific code not present in Target App).
- Central `skills/` vault with Obsidian — deferred (overkill for 8 skills; reconsider at 30+).
- Git submodule for skill sharing — rejected (single-project scope, high sync overhead).
- Full YAML frontmatter on all skills — deferred (justified only at scale).
