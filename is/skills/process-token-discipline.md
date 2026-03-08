---
id: sk-a304ea
title: "Token Discipline (Context Efficiency)"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-08
reasoning_checksum: 229eecc2
last_change: ""

---

# Token Discipline

> **Context**: Token optimization for AI agents. Reduces cost and improves response quality without breaking agent logic.
> **Scope**: Cursor rules, skills, conversation patterns.

## Reasoning

- **#for-token-efficiency** Long context degrades model attention ("lost in the middle"). Minimal viable context produces better results.
- **#for-front-load** Putting all relevant context in the first message avoids 3x token waste from incremental context building.
- **#for-fresh-chats** After 6–8 exchanges or when switching domains, start a new chat — condensation loses detail.
- **#for-minimum-viable-at** Attach only files the agent actually needs; agent can explore more if needed.

## Core Rules

### 1. Front-Load Context
Put everything relevant in the **first message**:
- Attach required files with `@`
- State domain, constraints, and expected outcome
- Avoid: "Look at X" → "Now look at Y" → "Now do Z"

### 2. Fresh Chats When
Start a new chat when:
- Context gauge is above 60% before typing
- Shifting to a different area of the codebase
- Agent repeats itself or references outdated info
- Finished one logical task and starting another

### 3. Minimum Viable @
Attach only the files the agent needs:
- Start with minimal context; agent can request more
- Avoid: attaching every file "just in case"
- Use `@folder` for directory overview instead of full files

### 4. Indices as Navigation
When exploring a new domain:
- Read `id:docidx-0b048e` or `id:docidx-3022eb` first
- Find relevant skills before deep-diving
- Resolve ids via `is/contracts/docs/id-registry.json`

### 5. Token-Safe Search Protocol (Anti-Token-Eater)

**#for-token-efficiency** Unoptimized searches consume millions of tokens. Index-first, path-limited grep, and chunked reads prevent "Token Eater" incidents.

**Anti-patterns to avoid:**
- Blind grep on workspace root without path filters
- `read_file` on files > 100KB without `offset`/`limit`
- Repeated broad search in a loop

**Mandatory protocol:**
1. **Index-first**: Use `search_skills`, `Glob`, or `find_skills_for_file` before grep/read.
2. **Scoped grep**: Never search root `[]` if a directory can narrow; use `type`/`glob` filters and `head_limit`.
3. **Chunked read**: For files > 50KB or > 1000 lines — use grep to find line numbers, then `read_file` with `offset` and `limit` (e.g. 100 lines around match).

**Enforcement:** If a tool returns "File too large" or thousands of grep matches — STOP, switch to Plan mode, use indexer for surgical approach.

**Skill Anchors for Safety:** Every file > 2000 lines MUST have a safety anchor at the top: `// Skill anchor: process-token-safety (Large file: use chunked reads only)`.

**Shadow Index:** Skills can use `shadow_index` in frontmatter — a concise summary for index-first search. Enables agents to find relevant skills without reading full content.

### 6. Context Modes (Cursor CLI)

When switching domains, use Cursor CLI to minimize active tools:

- **architect**: `filesystem`, `search` enabled; `coding-tools` disabled.
- **coder**: `coding-tools`, `linter`, `terminal` enabled.

```bash
cursor /mcp disable all
cursor /mcp enable needed-server
```

At session start for complex tasks: explicitly activate only the minimal tool set needed.

## Risk Mitigation

| Technique | Risk | Mitigation |
|-----------|------|------------|
| Front-load | Might miss context | Agent can ask for clarification; user can add in follow-up |
| Fresh chats | Lose some history | Critical agreements → formalize in skills (Memory → Skills) |
| Min @ | Agent might need more | Agent can read additional files; start minimal, expand if needed |
| Glob-scoped rules | Rule might not load | .cursorrules fallback + description for agent-decided |

## Contracts

- **No blind reduction**: If output quality drops after context reduction, add back the specific files that matter.
- **Reference over inline**: Rules reference skills via path; avoid inline content >50 lines.
