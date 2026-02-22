---
id: process-project-evolution-logging
title: Process — Project Evolution Logging
scope: mmb
tags: [#process, #logging, #evolution, #git, #automation]
priority: high
created_at: 2026-02-22
updated_at: 2026-02-22
---

# Process — Project Evolution Logging

> **Goal**: Keep `docs/project-evolution.md` cumulative, accurate, and automatically enriched from git history.
> **SSOT**: `docs/project-evolution.md`
> **Script**: `node scripts/architecture/project-evolution-update.js`

## 1. Architecture

The log is driven by two layers:

**Layer 1 — Automatic (script)**: After each session or on demand, the update script reads `git log`, classifies commits by tier, extracts machine-readable context tags (`[Skill:]`, `[MCP:]`, `[SSOT:]`, `[Rule:]`) and appends/merges blocks into `docs/project-evolution.md`.

**Layer 2 — Agent-assisted (at session close)**: When an agent closes a session (Handoff), it checks if today's evolution block is already present. If not — or if it's incomplete — the agent enriches it manually with context that git log alone cannot capture (rationale, architectural decisions, tradeoffs).

## 2. Tier Classification

| Tier | Criteria | Priority |
|------|----------|----------|
| **A** (Critical) | Architecture boundaries, security model, MCP changes, SSOT files, `paths.js`, `package.json`, `.cursor/rules/` | Keep explicit and first |
| **B** (Structural) | New skills, new scripts, integration links, reliability gates, major refactors | Keep grouped in middle |
| **C** (Operational) | Gitignore tweaks, formatting, README-only changes, housekeeping | Aggregate into one tail phrase |

## 3. Context Tag Protocol

Commit messages MUST include context tags in the body footer when applicable:

```
[Skill: <skill-id>]       — skill was applied, created, or modified
[MCP: <server-name>]      — MCP server was touched (skills-mcp, memory-mcp, agents-mcp)
[SSOT: <filename>]        — Single Source of Truth file was changed
[Rule: <rule-filename>]   — .cursor/rules/*.mdc was added or modified
```

Tags are written as HTML comments in `project-evolution.md` so they are machine-parseable but don't clutter reading.

## 4. Aggregation Rules (ONE DATE = ONE BLOCK)

- **Never** create two blocks for the same date.
- If a block for today exists, **merge** new information into it (compress without losing meaning).
- Compression priority: Tier A survives longest; Tier C merges first on repeated compressions.
- Tone: telegraphic technical (dry, precise, no emojis, no praise phrases).

## 5. Agent Trigger (Session Handoff)

Before closing any non-trivial session, agent MUST:
1. Run `git log --since="1 day ago" --oneline` to check what was committed.
2. Check if today's `### DD/MM/YY` block exists in `docs/project-evolution.md`.
3. If missing or incomplete: run `node scripts/architecture/project-evolution-update.js` OR write the block manually with Tier A/B items from the session.
4. Do NOT log: UI micro-tweaks, documentation-only changes, housekeeping commits (Tier C only days).

## 6. Commands

```bash
# Append today's commits (default mode)
node scripts/architecture/project-evolution-update.js

# Rebuild entire log from scratch
node scripts/architecture/project-evolution-update.js --rebuild

# Preview without writing
node scripts/architecture/project-evolution-update.js --dry-run
```

Also available as npm script (add to package.json):
```json
"evolution:update": "node scripts/architecture/project-evolution-update.js",
"evolution:rebuild": "node scripts/architecture/project-evolution-update.js --rebuild"
```

## 7. File Map

- `docs/project-evolution.md` — SSOT output file
- `scripts/architecture/project-evolution-update.js` — automation script
- `.gitmessage` — commit template (enforces context tag discipline)
- `.cursor/rules/tool-rules/git-commit-agent.mdc` — agent rule for enriched commits
