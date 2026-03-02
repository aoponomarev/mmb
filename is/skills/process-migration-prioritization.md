---
title: "Process: Migration Prioritization Criteria"
tags: ["#process", "#migration", "#prioritization", "#heuristics"]
reasoning_confidence: 0.85
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "d59b0f77"
---

# Migration Prioritization Steps (Heuristic Weights)

> **Context**: In a complex migration from Legacy App to Target App with dozens of plans, it is crucial to choose the next step correctly to avoid creating chaos and accumulating technical debt.
> **Scope**: Global (migration process management)

## Reasoning

- **#for-weighted-formula** Human intuition fails with dozens of migration plans. Explicit weighting makes prioritization reproducible and auditable.
- **#for-fundamentality-first** Blocking dependencies like SSOT contracts and security are weighed heavily (0.5), as they block further progress.
- **#for-gap-closure** Leaving half-transferred modules creates context-switching debt. We weigh finishing an active logical piece at 0.3.
- **#for-debt-risk-weight** Missing tests or broken CI gates carry a 0.2 weight, tracking "what rots if we wait."

---

## Core Rules

When selecting the next migration step (or the next uncompleted checkbox from the plans), the AI agent must evaluate candidates against three criteria with the following weights:

### A. Fundamentality (Weight: 0.5)
*How much is this step blocking for other systems?*
- High (1.0): SSOT contracts, core security, paths, data core (everything that other layers rely on).
- Medium (0.5): Developer utilities, local conveniences, isolated features.
- Low (0.1): End-user UI components, visual improvements, decorative elements.

### B. Absence of Gaps (Weight: 0.3)
*How much does this step help to complete an already started logical piece?*
- High (1.0): The step closes a "hole" in a half-transferred module (e.g., writing tests for a just-transferred provider).
- Medium (0.5): Continuing work in the same layer, but on an independent module.
- Low (0.1): Jumping into a completely new context/plan when old ones are still full of open tasks.

### C. Technical Debt Risk Reduction (Weight: 0.2)
*What happens if we delay this step? Will the code start to "rot"?*
- High (1.0): Delaying will lead to bugs in production, lack of tests on a critical path, or secret leaks (e.g., setting up CI/CD gates).
- Medium (0.5): Delaying will create temporary inconveniences (manual script executions).
- Low (0.1): Delaying does not affect the quality of already transferred code (e.g., delaying new orchestration features).

---

## Contracts

`Priority Score = (A * 0.5) + (B * 0.3) + (C * 0.2)`

The agent MUST calculate this Score (explicitly in its mind or in the report) when suggesting the next step to the user, comparing 2-3 most likely candidates from `docs/plans/`.

---

## Examples

Candidate 1: Write E2E tests for transferred API providers.
- Fundamentality: 0.9 (data is the foundation of the app).
- Absence of Gaps: 1.0 (provider code already transferred, tests missing - this is a gap).
- Risk Reduction: 0.9 (without tests, code rots).
**Score: (0.9 * 0.5) + (1.0 * 0.3) + (0.9 * 0.2) = 0.45 + 0.3 + 0.18 = 0.93**

Candidate 2: Transfer UI table for coin list.
- Fundamentality: 0.2 (end-user UI).
- Absence of Gaps: 0.5 (continuing work on UI).
- Risk Reduction: 0.2 (old UI works in fallback mode).
**Score: (0.2 * 0.5) + (0.5 * 0.3) + (0.2 * 0.2) = 0.1 + 0.15 + 0.04 = 0.29**

Conclusion: Provider tests first, UI can wait.
