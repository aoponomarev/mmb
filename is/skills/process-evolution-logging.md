# Process: Project Evolution Logging

> **Context**: Defines how architectural decisions, session work, and milestones are recorded in `docs/project-evolution.md`.
> **SSOT**: `docs/project-evolution.md`

## 1. Purpose

`docs/project-evolution.md` is the cumulative project log — a living record of what changed, when, and why. It is the go-to source for answering "what happened in this project over the past N months" without reading git log line by line.

## 2. Architecture (Two Layers)

**Layer 1 — Commit-driven**: After a significant session, record what was committed in a dated block.

**Layer 2 — Agent-assisted**: At session close or after completing a major migration step, the agent enriches the block with context that git commits alone cannot capture (rationale, tradeoffs, blocked items, architectural decisions).

## 3. Tier Classification

When writing entries, classify each item:

| Tier | What it covers | Persistence |
|---|---|---|
| **A** (Critical) | Architecture boundaries, security model, SSOT files, MCP changes, `paths.js`, `package.json` | Keep explicit and first |
| **B** (Structural) | New skills, new scripts, new tests, integration links, reliability gates, major refactors | Keep grouped |
| **C** (Operational) | `.gitignore` tweaks, formatting, README-only changes, housekeeping | Aggregate into one tail phrase |

## 4. Block Format

One date block per day. Never create two blocks for the same date.

```markdown
### 01/03/26

**[Tier A]** Finalized backend core migration. Composition root `backend-market-runtime.js` 
assembles all services and passes 40 automated tests. Layer separation enforced:
Service → Transport → HTTP Handler → Node Server.

**[Tier B]** Added 7 new arch-*.md skills extracting causality from finalized plans.
`validate-skills.js` extended with `--json` mode and stale/orphan detection.

**[Tier C]** README files restored for 8 boundary directories.
```

## 5. Agent Trigger

After any non-trivial session (3+ files changed, or architectural decision made):
1. Check if today's dated block exists in `docs/project-evolution.md`.
2. If missing or incomplete — write or extend it.
3. Do NOT log: pure documentation reformatting, typo fixes, trivial housekeeping.

## 6. Commands

```bash
# View recent history
cat docs/project-evolution.md | head -100
```

The log is hand-maintained — no automation script is required at current scale.
When the log exceeds 500 lines, consider extracting older months to `docs/done/evolution-YYYY-MM.md`.
