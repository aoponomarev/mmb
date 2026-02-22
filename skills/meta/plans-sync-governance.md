---
id: plans-sync-governance
title: "Meta: Plans Sync Governance"
scope: meta
tags: [#meta, #migration, #plans, #sync, #governance]
version: 1.0.0
priority: high
updated_at: 2026-02-22
status: active
decision_scope: process
decision_id: ADR-META-004
supersedes: none
relations:
  - skills-linking-governance
  - skills-terminology-governance
  - process-agent-commands
---

# Meta: Plans Sync Governance

## Purpose
Keep all migration plans in factual sync so completed/replaced/changed work is reflected consistently across the whole planning layer.

## Mandatory sync contract
Whenever a migration task changes state, update all affected plan artifacts in the same turn:

1. `docs/План_MBB_to_MMB.md` (master status/checklists)
2. `docs/План_Migration_Sync.md` (source->target mapping/status)
3. Specific contour plans `docs/План_*.md` that were touched
4. `docs/План_Skills_MCP.md` if skill/MCP decisions changed

## Change types
- **completed**: planned item is implemented and verified
- **changed**: approach/sequence updated but objective remains
- **replaced**: old plan item superseded by another contour/decision

## Update protocol
1. Mark status in contour plan checklist.
2. Reflect the same status in master plan checkpoint.
3. Update mapping row in `docs/План_Migration_Sync.md`.
4. If replaced, explicitly state replacement target and rationale.

## Anti-divergence rule
No migration turn is considered finished if plan-state changes were made in code/config but not synchronized in plan documents.
