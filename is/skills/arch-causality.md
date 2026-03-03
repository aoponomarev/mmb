---
title: "Architecture: Causality & Rationale Tracking"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "8d65409b"

---

# Architecture: Causality & Rationale Tracking

> **Context**: Defines how architectural "why" decisions are captured and preserved in the Target App, preventing context loss over time.

## Reasoning

- **#for-skill-anchors** Skill anchors in code (`@skill-anchor`) connect directly to the Reasoning section without a separate ID namespace.
- **#for-textual-over-registry** A heavyweight causality registry with boolean formulas is overkill. Textual reasoning in these markdown files provides enough value.
- **#for-skill-anchors-code** We use `/** @skill ... */` to link entire files to these architecture documents.
- **#for-plan-finalization-trigger** Reasoning is extracted from migration plans into these skills at a natural checkpoint — when a plan is completed.
- **#not-causality-registry-day-one** Full causality registry (GC.*) maintenance cost exceeds value at the current scale.
- **#not-no-causality** Complete lack of causality tracking risks context loss, the #1 risk in long-running projects.
- **#not-causality-in-comments-only** Causality in scattered code comments is not discoverable by AI agents without a centralized anchor.
- **#not-causality-database** Using a database for causality violates the zero-dependency, local-first portability rule.

---

## Implementation Status in Target App

- `Implemented (Simplified)`: Causality captured as textual reasoning within `is/skills/arch-*.md` files under "Architectural Reasoning (Why this way)" sections. Each finalized migration plan has its key decisions extracted into a dedicated skill.
- `Implemented`: Active Causality Recording pattern — every plan finalization extracts decisions into new `arch-*.md` skill files.
- `Out of scope`: Full causality registry, machine-readable IDs (GC.*), and code-level causality anchors. Textual reasoning and skill anchors are the canonical mechanism.

### Migration Strategy for Causality

When finalizing any migration plan:
1. Read the plan thoroughly (not just checkboxes).
2. Identify non-obvious decisions, rejected alternatives, and constraints.
3. Create or update `is/skills/arch-*.md` with "Architectural Reasoning" section.
4. Mark the plan complete and move to `docs/done/`.

### Reasoning Confidence & Audit Gate

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

