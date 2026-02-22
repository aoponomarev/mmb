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
---

# Protocol: Command `ФИН` (Finalization)

## Command
`ФИН` = зафиксировать завершение цикла задачи и синхронизировать состояние документов.

## Mandatory finalization in MMB
1. Update migration and plan docs touched by the task.
2. Ensure changed skills have correct status/relations.
3. Provide concise closure summary with verification outcome.

## Note
In MMB, `ФИН` is explicit (by user request) and not implicitly forced by unrelated commands.
