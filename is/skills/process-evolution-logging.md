---
id: sk-683b3c
title: "Process: Project Evolution Logging"
reasoning_confidence: 0.85
reasoning_audited_at: 2026-03-09
reasoning_checksum: 0f5fa6f6
last_change: ""

---

# Process: Project Evolution Logging

> **Context**: Defines how architectural decisions, session work, and milestones are recorded in `id:doc-f1a4d3`.
> **SSOT**: `id:doc-f1a4d3`

## Reasoning

- **#for-cumulative-log** Reading `git log` is too low-level. A living document provides an at-a-glance project history over time.
- **#for-two-layer-model** Commits state *what* changed, but the agent adds the *why* (trade-offs, blocked items) that Git cannot easily store.
- **#for-tier-classification** Grouping by tiers (A: Critical, B: Structural, C: Operational) ensures major decisions stand out and housekeeping doesn't add noise.
- **#for-hand-maintained** Automation adds overhead; when the log exceeds 500 lines, older entries are manually extracted.

---

## Core Rules

`docs/project-evolution.md` is the cumulative project log — a living record of what changed, when, and why. It is the go-to source for answering "what happened in this project over the past N months" without reading git log line by line.

## Contracts

### Architecture (Two Layers)

**Layer 1 — Commit-driven**: After a significant session, record what was committed in a dated block.

**Layer 2 — Agent-assisted**: At session close or after completing a major migration step, the agent enriches the block with context that git commits alone cannot capture (rationale, tradeoffs, blocked items, architectural decisions).

### Tier Classification

When writing entries, classify each item:

| Tier | What it covers | Persistence |
|---|---|---|
| **A** (Critical) | Architecture boundaries, security model, SSOT files, MCP changes, `paths.js`, `package.json` | Keep explicit and first |
| **B** (Structural) | New skills, new scripts, new tests, integration links, reliability gates, major refactors | Keep grouped |
| **C** (Operational) | `.gitignore` tweaks, formatting, README-only changes, housekeeping | Aggregate into one tail phrase |

### Block Format

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

### 5. Agent Trigger

After any non-trivial session (3+ files changed, or architectural decision made):
1. Check if today's dated block exists in `id:doc-f1a4d3`.
2. If missing or incomplete — write or extend it.
3. Do NOT log: pure documentation reformatting, typo fixes, trivial housekeeping.

### Project Evolution Aggregation

**Goal**: Keep `docs/project-evolution.md` cumulative, compact, and non-duplicative.

**Core rule**: One date = one record. New session outcomes for an existing date must be merged into the existing date record, not appended as a duplicate.

**Aggregation algorithm**: (1) Find date record; (2) Extract new milestones from current session; (3) Merge into existing narrative — remove repeated phrasing, preserve unique architectural decisions; (4) Compress wording while keeping technical meaning; (5) Keep reverse chronology intact.

**Compression rules**: Prefer one dense paragraph per date with semicolon-separated milestone clusters; avoid low-value operational noise; keep names of critical files/protocols/skills.

**Significance-aware compression**: Tier A (system-critical) — explicit, beginning of record; Tier B (structure-important) — grouped in middle; Tier C (operational-minor) — aggregate into one short tail phrase. On repeated compressions, Tier C merges first; Tier A preserved longest.

**Acceptance**: No duplicate date headers; record readable and technically complete; net log growth controlled via cumulative compression; critical changes remain visible after compression.

### Commands

```bash
# View recent history
cat docs/project-evolution.md | head -100
```

The log is hand-maintained — no automation script is required at current scale.
When the log exceeds 500 lines, consider extracting older months to separate files in docs/done/.
