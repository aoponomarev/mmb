---
id: protocol-command-fin
title: "Protocol: Command ФИН (Finalization)"
scope: process
tags: [#protocol, #command, #finalization, #фин]
version: 1.0.0
priority: medium
updated_at: 2026-02-22
migrated_from: mbb:process/process-agent-commands
migration_status: partial
migration_notes: "Legacy finalization command preserved; old MBB-specific routines removed."
relations:
  - process-agent-commands
  - protocol-command-vzp
  - protocol-command-fin-discovery
---

# Protocol: Command `ФИН` (Finalization)

## Command
`ФИН` = finalize the task cycle and synchronize documentation state.

## Protocol structure
`ФИН` has two coordinated parts:
1. **Closure (mandatory):** finalize task state, docs, and verification notes.
2. **Finalization Discovery Blocks (optional by intent):** enumerate candidate improvements by categories:
   - **Ф**: Features
   - **И**: Integrations
   - **Н**: Settings
   - **С**: Skills

## Mandatory finalization in MMB
1. Update migration and plan docs touched by the task.
2. Ensure changed skills have correct status/relations.
3. Provide concise closure summary with verification outcome.

## Note
In MMB, `ФИН` is explicit (by user request) and not implicitly forced by unrelated commands.
When user asks `ФИНС`, treat it as discovery-accent inside the same `ФИН` protocol family.
