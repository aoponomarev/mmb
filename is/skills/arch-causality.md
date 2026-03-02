---
title: "Architecture: Causality & Rationale Tracking"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-01"
---

# Architecture: Causality & Rationale Tracking

> **Context**: Defines how architectural "why" decisions are captured and preserved in the Target App, preventing context loss over time.

## Reasoning

- **#for-skill-anchors** Textual reasoning in skills (with #for-/#not- hashes) provides causality value. Skill anchors connect code to reasoning without a separate causality ID namespace.
- **#for-textual-over-registry** The donor project's causality registry (with MD5-hashed IDs, boolean formulas) is powerful but heavyweight. For current scale, textual reasoning in `arch-*.md` files provides 80% of the value at 10% of the cost.
- **#for-skill-anchors-code** `/** @skill is/skills/arch-foundation */` comments in code files connect implementation to reasoning without requiring a separate causality ID namespace. One mechanism (skill anchors) replaces two.
- **#for-plan-finalization-trigger** Rather than maintaining a living causality graph, we extract reasoning at a natural checkpoint — when a migration plan is completed and moved to `docs/done/`. Batch-efficient and ensures nothing is lost.
- **#not-causality-registry-day-one** Full causality registry from day one — maintenance cost exceeds value at current scale.
- **#not-no-causality** No causality tracking at all — context loss is the #1 risk in long-running projects.
- **#not-causality-in-comments-only** Causality in code comments only — too scattered, not discoverable by AI agents.
- **#not-causality-database** Causality in a separate database — violates zero-dependency and `file://` portability.

---

## Implementation Status in Target App

- `Implemented (Simplified)`: Causality captured as textual reasoning within `is/skills/arch-*.md` files under "Architectural Reasoning (Why this way)" sections. Each finalized migration plan has its key decisions extracted into a dedicated skill.
- `Implemented`: Active Causality Recording pattern — every plan finalization extracts decisions into new `arch-*.md` skill files.
- `Out of scope`: Full causality registry, machine-readable IDs (GC.*), and code-level causality anchors. Textual reasoning and skill anchors are the canonical mechanism.

## Migration Strategy for Causality

When finalizing any migration plan:
1. Read the plan thoroughly (not just checkboxes).
2. Identify non-obvious decisions, rejected alternatives, and constraints.
3. Create or update `is/skills/arch-*.md` with "Architectural Reasoning" section.
4. Mark the plan complete and move to `docs/done/`.

## Reasoning Confidence & Audit Gate

Every skill with Reasoning MUST include a confidence score (assigned by AI agent during audit):

```yaml
---
reasoning_confidence: 0.85   # 0–1: how well Reasoning matches the codebase
reasoning_audited_at: "2026-03-01"
---
```

- **Scale**: 0.9–1.0 = fully aligned; 0.5–0.69 = notable gaps; below 0.5 = fails gate.
- **Gate**: `npm run skills:reasoning:check` enforces presence and threshold.
- **Protocol**: See `process-reasoning-audit.md` for the mandatory audit order (Review → Add → Score → Gate).

