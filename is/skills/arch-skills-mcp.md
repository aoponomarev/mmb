---
title: "Architecture: Skills & MCP System"
reasoning_confidence: 0.85
reasoning_audited_at: "2026-03-03"
reasoning_checksum: "c243f8c0"
id: sk-7d810a

---

# Architecture: Skills & MCP System

> **Context**: Defines the knowledge management architecture: skills storage, validation, MCP server integration, Cursor rules, and the skill migration strategy from Legacy App.

## Reasoning

- **#for-demand-driven-migration** Skills are migrated from Legacy only when needed, preventing knowledge pollution.
- **#for-distributed-skill-placement** Skills co-evolve with code by living next to their domain (`is/`, `core/`, `app/`) rather than a central vault.
- **#for-plain-markdown** H1 Markdown is sufficient structure for current scale; YAML frontmatter is added incrementally.
- **#for-validate-skills-single** A single script validates format, staleness, and orphans, unlike the complex 4-script setup in Legacy.
- **#for-simplified-mcp** One unified validation script is sufficient for MCP indexing.
- **#for-always-apply-true** Cursor Agents are unreliable with `alwaysApply: false`, so critical `.mdc` rules use `true`.
- **#not-wholesale-skill-import** Most Legacy skills describe code not present here.
- **#not-central-vault** Obsidian vaults are deferred until 50+ skills.
- **#not-skill-submodule** High sync overhead for single-project scope.
- **#for-token-budget** alwaysApply rules consume tokens before every conversation. Budget <1,000 lines; prefer glob-scoped or agent-decided for domain-specific rules.

---

## Core Rules

### Autonomous Skill Synthesis Pipeline

**Context**: How the system transforms raw logs into structured knowledge.

**Pipeline**: (1) Watcher — scans external releases and Git for updates; (2) Swarm — analyzes content; (3) Synthesis — LLM generates candidate (JSON or MD) for review.

**Selection heuristics** (skill-worthy if): Fixes recurring architectural bug; introduces new integration pattern; defines new naming convention; solves complex environment issue (Docker/WSL).

**Hard constraints**: Human gate — no skill published without approval; context limit — analysis passes use optimized context windows (~1500 tokens).

### Commit Analysis Heuristics

**Context**: Rules for determining if a commit is worth analyzing for skill extraction.

**Worthiness decision tree**: Lines >1500 → REJECT (too_large); Files >15 → REJECT (too_many_files); All files .md or docs/ → REJECT (docs_only); Has keyword (implement, integrate, refactor, fix, add, create, auth, api, cache) → ACCEPT; Otherwise → ACCEPT if Swarm analysis confirms value.

**Noise patterns (always filtered)**: `package-lock.json`, `node_modules/`, `*.sqlite`, `*.min.js`, `*.min.css`, `workflows_export.json`.

### Skill Impact Analysis

**Context**: Evaluating how a new feature or change affects the existing knowledge base.

**Analysis steps**: (1) Search — find all skills related to target module; (2) Conflict check — does change violate Hard Constraints in those skills?; (3) Update requirement — list which skills need `action=update`; (4) New skill — determine if change introduces new pattern worth capturing.

**Decision gate**: If change impacts >5 skills → Major Architectural Shift → requires dedicated document update.

**Hard constraint**: No orphan rules — never implement a feature that contradicts a Skill without updating the Skill first.

---

## Implementation Status in Target App

- `Implemented`: Distributed skill storage across `is/skills/` (18 skills), `core/skills/` (6 skills), `app/skills/` (4 skills) = 28 skills total.
- `Implemented`: `validate-skills.js` — structural validation with JSON output for automation.
- `Implemented`: `generate-skills-index.js` — auto-generates `docs/index-skills.md`.
- `Implemented`: `skills-health-trend.js` — trend tracking with JSONL append and degradation alerts.
- `Implemented`: `skills-health-trend-report.js` — summary report over configurable window.
- `Implemented`: MCP server at `is/mcp/skills/server.js` (adapted from Legacy App).
- `Implemented`: Memory MCP server via `@modelcontextprotocol/server-memory`.
- `Implemented`: Cursor `.cursor/mcp.json` configuration for both MCP servers.
- `Simplified`: Skills stored as plain Markdown without YAML frontmatter (lightweight approach vs. Legacy App's full frontmatter format). Frontmatter can be adopted incrementally.
- `Simplified`: No Obsidian vault integration (not needed for single-project scope).
- `Simplified`: No `skills/MIGRATION.md` registry (migration tracked via `docs/plans/` and this skill).

### Token Budget (alwaysApply Rules)

- **Budget:** Total alwaysApply rules MUST stay under 1,000 lines (~5,000 tokens). Current: 3 rules, ~55 lines.
- **Justification:** Each new alwaysApply rule must justify why it cannot be glob-scoped or agent-decided.
- **Audit:** Run `grep -l "alwaysApply: true" .cursor/rules/**/*.mdc | xargs wc -l` quarterly.

### Batch Skills Review

Periodic audit to prevent rot. **Trigger**: Monthly or after major architectural shifts.

- **Dead links**: Scan `.md` files for broken paths or references to deleted scripts.
- **Redundancy**: Identify skills covering similar topics; MERGE when appropriate.
- **Staleness**: Skills older than 90 days need re-validation.
- **No orphans**: Every skill MUST be linked from at least one index (`docs/index-skills.md` or equivalent).

### Skills as Playbooks

Skills are "cartridges" loaded into the agent. **Principles**: File-centric (Markdown, not vectors); self-contained How-To; agent-readable (metadata + clear instructions). **Workflow**: Load (search/read) → Act (follow Steps) → Verify (check Validation). **Structure**: Scope, When to Use, Steps, Constraints.

### Skill Extraction (When Pipeline Exists)

When an extraction pipeline (e.g. n8n, Swarm) is used: Signal (commit/release) → analysis → JSON/Markdown candidate → human review. **Quality criteria**: Actionable, reusable, focused, traceable. Every proposal must have `suggested_by`; humans MUST confirm before promotion.

### Key Contracts

- Every skill file must have an H1 heading or `title:` frontmatter.
- Skills older than 90 days without updates are flagged as stale (warning, not blocking).
- Files with content < 50 chars are flagged as potentially orphaned.
- `npm run skills:check` must pass before any migration stage can be marked complete.

