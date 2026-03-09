---
id: sk-802f3b
title: "Causality Harvesting"
reasoning_confidence: 1.0
reasoning_audited_at: 2026-03-09
reasoning_checksum: e58d2adc
last_change: "#for-causality-question-marker — only @causality QUESTION is valid raw candidate format"

---

# Causality Harvesting (Skill Watcher)

> **Context**: The process of extracting architectural patterns from raw inline code comments and promoting them into centralized registry skills.
> **Scope**: Entire codebase, `is/skills/`

## Reasoning

- **#for-causality-harvesting** Enforcing immediate registry updates for every minor architectural decision breaks developer flow. Using explicit candidate markers keeps backlog capture fast while preserving machine-readability.
- **#for-causality-question-marker** The candidate format must be unambiguous (`@causality QUESTION:`). Otherwise agents cannot distinguish intentional backlog items from accidental unfinished annotations.

## Core Rules

1.  **Candidate Marker (The Seed):**
    When solving edge cases or implementing non-obvious logic with unresolved rationale, agents and developers must use:
    `// @causality QUESTION: Because the File API throws on X, should we do Y or refactor Z?`
    *(Note: This differs from `@skill-anchor` which links to an existing skill/hash).*

2.  **The Skill Watcher (Harvester Role):**
    AI agents acting in maintenance/review must scan only `// @causality QUESTION:` markers (without hashes).
    
3.  **Pattern Aggregation:**
    If a similar candidate explanation is found in 3 or more places across the codebase (e.g., repeating the same logic about CORS or Vue rendering), the agent must:
    - **Formulate a Hash**: Create a standardized `#for-xyz` hash.
    - **Register**: Add it to id:sk-3b1519 (is/skills/causality-registry.md).
    - **Promote to Skill**: If the pattern warrants it, generate a new architectural skill `.md` file using `npm run skills:create`.
    - **Refactor Code**: Replace the candidate marker with formalized hash-based causality:
      - `// @causality #for-xyz ...` or
      - `// @skill-anchor path/to/skill #for-xyz`
    - **Invalid format policy**: `@causality` without hash and without `QUESTION:` is considered unformalized debt, not a valid candidate.

## Contracts

- **Watcher Trigger**: The `harvest_causalities` MCP tool should be run periodically. It scans the codebase and deposits raw causalities into the SQLite `raw_causalities` table.
- **Review Loop**: Agents must occasionally read the `causality_backlog://` MCP resource to review the pending patterns, formalize them into hashes, create skills via `create_skill` tool, and update the codebase.
