---
id: sk-d599bd
title: "Architecture: Causality Traceability System"
reasoning_confidence: 0.92
reasoning_audited_at: 2026-03-14
reasoning_checksum: ""
last_change: "#for-explicit-over-implicit — align skill with current registry-backed causality traceability system"
related_ais:
  - ais-b6c7d8

---

# Architecture: Causality Traceability System

> **Context**: Defines how architectural rationale is captured, linked, validated, and kept live-actual across code, skills, AIS, and gates.

## Reasoning

- **#for-skill-anchors** Skill anchors in code (`@skill-anchor`) connect code to the rationale that governs it.
- **#for-gate-enforcement** Causality only stays trustworthy when registry existence, anchor integrity, and deletion lineage are validated by gates.
- **#for-explicit-over-implicit** Non-obvious rationale must be explicit via hashes, anchors, and docs; implicit reasoning silently rots.
- **#for-document-the-choice** Chosen and rejected paths must stay recoverable after the chat or plan is gone.
- **#not-causality-database** Canonical rationale should stay local-first and reviewable in markdown files, not hidden in runtime storage.

---

## Implementation Status in PF

- `Implemented`: Registry-backed hash namespace in id:sk-3b1519 (`is/skills/causality-registry.md`) for code, skills, and AIS.
- `Implemented`: Code/document anchors (`@causality`, `@skill-anchor`) plus validation gates and invariant checks.
- `Implemented`: Question markers, harvesting, supersession / rebinding, alias mapping, and exception ledger.
- `Implemented`: Meta-causalities as second-order hashes in the same canonical namespace.
- `Current limitation`: Dedicated causality graph visualization/tooling is still pending; current navigation remains registry, grep, validators, and indices.
- `SSOT`: id:ais-b6c7d8 (`docs/ais/ais-causality-traceability.md`) is the full high-level specification.

## Core Rules

- Use registry hashes for non-obvious rationale; no naked `@causality`.
- Keep code, skill, AIS, and exception lineage aligned when rationale changes.
- When a hash is renamed or generalized, prefer rebinding over silent coexistence.
- Treat meta-causalities as the same registry namespace, but second-order in meaning: they govern how agents decide about protocols and structural additions.

## Contracts

- id:ais-b6c7d8 (`docs/ais/ais-causality-traceability.md`) — high-level causality traceability specification.
- id:sk-3b1519 (`is/skills/causality-registry.md`) — canonical hash registry.
- id:sk-802f3b (`is/skills/process-causality-harvesting.md`) — harvesting and promotion flow.
- id:sk-8991cd (`is/skills/process-code-anchors.md`) — anchor placement rules.
- id:sk-dcc232 (`is/skills/process-meta-causality-discovery.md`) — meta-causality portrait and application algorithm.

