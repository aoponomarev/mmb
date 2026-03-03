---
title: "Legacy Unknowns (Causality)"
reasoning_confidence: 1.0
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "caac12c5"
id: sk-3df9f9

---

# Process: Legacy Unknowns & Magic Numbers

> **Context**: How AI agents should handle legacy code (from the Donor App) when the "Why" (causality) or magic numbers are unclear during migration.
> **Scope**: Entire codebase during refactoring/migration.

## Reasoning

- **#for-explicit-unknowns** When migrating legacy code, an agent might encounter "magic numbers" (e.g., `setTimeout(..., 1450)`) or weird architectural workarounds without comments. Guessing the causality leads to dangerous hallucinations. We must explicitly mark unknowns so the human developer can answer them later.
- **#for-harvester-integration** We used to have a separate markdown file (`docs/drafts/causality-questions.md`) for this, but it detached from the actual code. Using the raw `@causality` marker directly in the code with a question mark integrates perfectly with our MCP `harvest_causalities` tool.

## Core Rules

1. **Do Not Guess**: If you port a piece of legacy code and do not understand *why* it was written that way, do not invent a causality hash.
2. **Use Raw Markers for Questions**: Leave a raw causality marker with a question directly above the confusing code.
   - Example: `// @causality QUESTION: Why is this delay exactly 1450ms? Is it tied to a specific CSS animation?`
3. **Harvester Pipeline**: The `harvest_causalities` MCP tool will automatically pick up these `QUESTION:` markers.
4. **Resolution**: The human developer will read the `causality_backlog://` resource, answer the question, and then the agent will transform it into a formal `#for-` hash and an English skill.

## Contracts

- **No Silent Magic Numbers**: No magic number or bizarre legacy workaround may be ported to the Target App without either a valid `#for-` causality hash OR a `// @causality QUESTION:` marker.