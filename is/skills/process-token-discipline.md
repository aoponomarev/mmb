---
title: "Token Discipline (Context Efficiency)"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "8f904eb5"
id: sk-a304ea

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
- Read `docs/index-skills.md` or `docs/index-ais.md` first
- Find relevant skills before deep-diving
- Resolve ids via `is/contracts/docs/id-registry.json`

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
