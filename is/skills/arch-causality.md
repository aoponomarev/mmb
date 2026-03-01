# Architecture: Causality & Rationale Tracking

> **Context**: Defines how architectural "why" decisions are captured and preserved in the Target App, preventing context loss over time.

## Implementation Status in Target App

- `Implemented (Simplified)`: Causality captured as textual reasoning within `is/skills/arch-*.md` files under "Architectural Reasoning (Why this way)" sections. Each finalized migration plan has its key decisions extracted into a dedicated skill.
- `Implemented`: Active Causality Recording pattern — every plan finalization extracts decisions into new `arch-*.md` skill files.
- `Deferred`: Full causality registry (`skills/causality/registry/`) with machine-readable IDs, formulas, and `causality:check` validation. The complex registry structure from the donor is not justified at current scale.
- `Deferred`: Code-level causality anchors (`// Causality: GC.x1y2.ssot-paths-contract`). Skill anchors (`/** @skill ... */`) are used instead as a lighter mechanism.
- `Deferred`: Math domain causality (`GM.*`, `CM.*`, `GMC.*`) — no math code exists yet.

## Architectural Reasoning (Why this way)

- **Textual causality in skills over machine-readable registry**: The donor project's causality registry (with MD5-hashed IDs, boolean formulas, and composite factors) is powerful but heavyweight. For a project with 8 skills and ~20 source files, the overhead of maintaining a registry, validator, and impact analysis tool exceeds the value. Textual reasoning in `arch-*.md` files provides 80% of the value at 10% of the cost.
- **"Why this way" sections as minimum viable causality**: Every architectural skill explicitly documents the reasoning behind each decision and the alternatives that were rejected. This is the information an AI agent or future developer needs most — not formal IDs, but clear rationale.
- **Plan finalization as causality extraction trigger**: Rather than trying to maintain a living causality graph, we extract reasoning at a natural checkpoint — when a migration plan is completed and moved to `docs/done/`. This is batch-efficient and ensures nothing is lost.
- **Skill anchors as the lightweight code-level mechanism**: `/** @skill is/skills/arch-foundation */` comments in code files connect implementation to reasoning without requiring a separate causality ID namespace. One mechanism (skill anchors) replaces two (skill anchors + causality anchors).
- **Scale-triggered activation**: If the project grows to 30+ skills or 100+ source files, the full registry system can be activated. The textual reasoning already captured in skills would seed the registry, making the transition low-cost.

## Migration Strategy for Causality

When finalizing any migration plan:
1. Read the plan thoroughly (not just checkboxes).
2. Identify non-obvious decisions, rejected alternatives, and constraints.
3. Create or update `is/skills/arch-*.md` with "Architectural Reasoning" section.
4. Mark the plan complete and move to `docs/done/`.

## Alternatives Considered

- Full causality registry from day one — rejected (maintenance cost exceeds value at current scale).
- No causality tracking at all — rejected (context loss is the #1 risk in long-running projects).
- Causality in code comments only — rejected (too scattered, not discoverable by AI agents).
- Causality in a separate database — rejected (violates zero-dependency and `file://` portability).
