---
id: arch-master
title: "Architecture: Master Topology (MMB)"
scope: architecture
tags: [#architecture, #adr, #ssot, #migration, #topology]
version: 1.0.0
priority: high
updated_at: 2026-02-22
status: active
confidence: high
review_after: 2026-05-22
decision_scope: architecture
decision_id: ADR-ARCH-001
supersedes: none
migrated_from: mbb:docs/A_MASTER.md
migration_status: done
migration_notes: "Converted from monolithic A_MASTER doc into hub ADR with relations-first topology."
relations:
  - process-env-sync-governance
  - protocol-git-secrets-and-env-boundary
  - skill-secrets-hygiene
  - process-agent-commands
  - arch-security
  - arch-infrastructure
---

# Architecture: Master Topology (MMB)

## Overview
`arch-master` is the architecture hub for MMB.  
It provides a compact system map and routes detailed reading through `relations` to focused skills.

## Implementation Status in MMB
- **Implemented:** skills MCP server, migration registry, security/env governance, ADR protocol for architecture skills.
- **Pending:** migration of all `A_*.md` docs to `arch-*` ADR skills, full coverage anchors in growing codebase.
- **Doubtful:** cloud-specific legacy patterns from MBB that may be replaced rather than migrated as-is.

## Architectural Reasoning (Why this way)
- **Hub instead of monolith:** one compact master skill with links is easier for agents to traverse than a long mixed document.
- **Relations-first navigation:** keeps context composable; agents read only the needed branch.
- **ADR structure:** preserves decision rationale, not only implementation details, preventing regressions to rejected approaches.

## Alternatives Considered
- **Keep a large `docs/A_MASTER.md` clone:** rejected; low machine readability and weak discoverability by MCP skill tools.
- **Split by random topics without hub:** rejected; poor global orientation and brittle cross-linking.

## Migration Notes
- Removed MBB-specific operational details that are no longer canonical for MMB.
- Kept only durable architecture principles and routing intent.

## Relations
- `process-env-sync-governance` — env SSOT and sync contract.
- `protocol-git-secrets-and-env-boundary` — secret boundaries in Git.
- `skill-secrets-hygiene` — emergency-level secrets hygiene.
- `process-agent-commands` — command-level behavior protocol for agents.
- `arch-security` — security boundary ADR.
- `arch-infrastructure` — runtime and infrastructure ADR.
