---
id: sk-dcc232
title: "Process: Meta-Causality Discovery & Application"
tags:
  - "#process"
  - "#causality"
  - "#meta"
  - "#agent-behavior"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-14
reasoning_checksum: c32e4320
last_change: "Initial: portrait for agents to recognize, evaluate, and apply meta-causalities"
related_skills:
  - sk-3b1519
  - sk-cecbcc
  - sk-802f3b
related_ais:
  - ais-b6c7d8

---

# Process: Meta-Causality Discovery & Application

> **Context**: When multiple skills or causalities express the same decision pattern across different domains, that pattern may warrant a meta-causality — a second-order principle that guides *how* agents make decisions about protocols, skills, and structural artifacts.
> **Scope**: AI agents creating or extending causality-registry, process skills, and architectural protocols.

## Reasoning

- **#for-benefit-overhead-kpi** This skill itself: B = agents recognize reusable patterns; O = one skill + occasional invocation. B/O ≥ 1.5.
- **#for-explicit-over-implicit** The portrait makes implicit decision patterns explicit and discoverable.
- **#for-document-the-choice** When proposing a new meta-causality, document rationale for future agents.

## Core Rules

### Meta-Causality Portrait (for AI Agents)

**What is a Meta-Causality?**

A **meta-causality** applies to *how* agents decide — not to a specific technical choice. Its object is protocols, skills, gates, or structural additions. Example: `#for-benefit-overhead-kpi` does not say "use paths.js"; it says "when adding structure, estimate B/O and prefer ≥ 1.5".

### Invariants (Signs)

| Sign | Meaning |
|------|---------|
| **Second-order** | Subject is decision-making, not the chosen artifact |
| **Abstract** | Formulation uses context-defined variables (B, O, factors) |
| **Procedural** | Describes steps or a lens, not a static rule |
| **Cross-cutting** | Seen in 3+ artifacts across different domains |
| **Self-limiting** (optional) | Specifies when to apply (e.g. B/O ≥ 1.5) |
| **Prevents recurring failure** | Addresses a recurring class of mistakes |

### Recognition Signals

Consider a new meta-causality when:

1. **Repetition** — 3+ skills or causalities express the same logical pattern in different contexts.
2. **Meta-decision** — The decision is "should we add X?", "Inline or Defer?", "full protocol or lightweight?".
3. **Abstract roles** — Variables like benefit, overhead, factors are context-defined.
4. **Scattered guidance** — Without a single principle, guidance would be duplicated or inconsistent.

### Formulation Algorithm

1. **Discover** — Find 3+ artifacts with a shared decision pattern.
2. **Abstract** — Define the decision class and context-defined variables.
3. **Formulate** — Procedure (steps) + optional threshold + self-limiting clause.
4. **Self-check** — Does the candidate pass its own criterion (e.g. #for-benefit-overhead-kpi for structural additions)?
5. **Register** — Add to id:sk-3b1519 (causality-registry); reference in skills where B/O ≥ threshold.
6. **Scope** — State when it applies (conditional trigger).

### Agent Checklist (New Meta-Causality?)

- [ ] Same pattern in 3+ places? → Candidate
- [ ] Subject is "how to decide" not "what to choose"? → Yes
- [ ] Can formulate as procedure + context variables? → Yes
- [ ] Clear threshold or condition for application? → Prefer
- [ ] Passes own criterion (e.g. B/O ≥ 1.5)? → Required

If all pass → formulate, register, and add references where useful.

### Registered Meta-Causalities (id:sk-3b1519)

| Hash | When to apply |
|------|---------------|
| `#for-benefit-overhead-kpi` | Structural additions (automation, gate, skill, protocol step) |
| `#for-explicit-over-implicit` | Action might be forgotten or assumed implicitly |
| `#for-defer-over-incomplete` | Uncertain or high blast radius |
| `#for-conditional-trigger` | Heavy protocol; run only when conditions hold |
| `#for-flow-preservation` | Protocol adds friction without proportional gain |
| `#for-weighted-explicit` | Many options; intuition fails; use explicit weighting |
| `#for-document-the-choice` | Choosing A over B; record rationale |

### Application Rules

1. **Before adding a causality** — Check if it fits an existing meta-causality. If yes, reference it and add context-specific B/O or factors.
2. **Before proposing a new meta-causality** — Run the Portrait checklist. Ensure no semantic overlap with existing hashes.
3. **When applying** — Invoke only when the decision class matches. Don't over-apply; respect self-limiting clauses.

## Contracts

- id:ais-b6c7d8 (docs/ais/ais-causality-traceability.md) — high-level causality traceability system and lifecycle.
- id:sk-3b1519 (causality-registry) — SSOT for all hashes including meta-causalities.
- id:sk-cecbcc (process-ai-collaboration) — #for-multifactor-heuristics and #for-benefit-overhead-kpi for decision-making.
- id:sk-802f3b (process-causality-harvesting) — Pattern aggregation and promotion to registry.
