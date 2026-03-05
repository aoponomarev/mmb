---
title: "RRG refactor when editing reactive code"
tags: ["#frontend", "#rrg", "#refactor"]
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-05"
reasoning_checksum: "765480fa"
id: sk-d4f8a2

---

# RRG refactor on edit

> **Context**: When an AI agent edits a code block that contains outdated reactivity patterns, it should attempt to align the code with RRG instead of leaving legacy violations in place.
> **Scope**: `app/`, `shared/components/` (same as RRG gate). References: id:sk-318305 (ui-architecture), id:ais-c4e9b2 (docs/ais/ais-rrg-contour.md).

## Reasoning

- **#for-rrg-contour** Outdated reactivity (direct `window` mutation beyond allowed registration, `innerHTML`, duplicated state) increases risk of render-order bugs and makes the RRG gate a bottleneck. Fixing violations in passing reduces debt.
- **#not-breaking-edits** Refactor only when editing that block anyway; do not expand scope arbitrarily. If the change would require large refactors, touch many files, or break dependencies, leave a comment or backlog item instead of rewriting.

## Core Rules

When editing a code block that contains **outdated reactivity** (patterns that violate RRG-1 or RRG-2, or duplicate state instead of using store/computed), the agent MUST:

1. **Attempt** to rewrite that block to comply with RRG: move state to store or `computed`, remove disallowed `window.*` assignments (or keep only allowed registration), replace `innerHTML` with safe alternatives (e.g. template, `textContent`, or documented exception).
2. **Abort** the refactor if it would: require changing many files, break existing contracts or imports, or introduce unclear risk. In that case, add a short comment (e.g. `// TODO RRG: ...`) or leave the edit minimal and do not refactor.

Do not leave clearly fixable RRG violations unchanged when the surrounding edit already touches the same block.
