---
title: "Causality Harvesting"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "514aa3d6"
---

# Causality Harvesting (Skill Watcher)

> **Context**: The process of extracting architectural patterns from raw inline code comments and promoting them into centralized registry skills.
> **Scope**: Entire codebase, `is/skills/`

## Reasoning

- **#for-causality-harvesting** Enforcing immediate registry updates for every minor architectural decision breaks developer flow. Using "raw" `@causality` markers in inline comments allows agents and developers to log the "Why" instantly, creating a searchable backlog of potential patterns that can be harvested later.

## Core Rules

1.  **Raw Causality Markers (The Seed):**
    When solving edge cases or implementing non-obvious logic, agents and developers must leave a raw marker in the code:
    `// @causality Because the File API throws on X, we must do Y...`
    *(Note: This differs from `@skill-anchor` which links to an existing skill/hash).*

2.  **The Skill Watcher (Harvester Role):**
    AI agents acting in a maintenance or review capacity must scan the codebase for `// @causality` markers (without hashes).
    
3.  **Pattern Aggregation:**
    If a similar raw `@causality` explanation is found in 3 or more places across the codebase (e.g., repeating the same logic about CORS or Vue rendering), the agent must:
    - **Formulate a Hash**: Create a standardized `#for-xyz` hash.
    - **Register**: Add it to `is/skills/causality-registry.md`.
    - **Promote to Skill**: If the pattern warrants it, generate a new architectural skill `.md` file using `npm run skills:create`.
    - **Refactor Code**: Go back to the original files, replace the raw `// @causality ...` with a formalized `// @skill-anchor path/to/skill #for-xyz` linking to the new contract.

## Contracts

- **Watcher Trigger**: The command `npm run preflight` or explicit prompt "run causality harvester" should trigger an agent to search for unhashed `@causality` strings via grep and analyze them for pattern promotion.
