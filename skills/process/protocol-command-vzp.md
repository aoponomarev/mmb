---
id: protocol-command-vzp
title: "Protocol: Command ВЗП (Planned Execution)"
scope: process
tags: [#protocol, #command, #planning, #autonomy, #взп]
version: 1.0.0
priority: high
updated_at: 2026-02-22
migrated_from: mbb:process/protocol-command-vzp
migration_status: partial
migration_notes: "Core planned-execution protocol migrated; MBB-specific closure steps replaced with MMB documentation/update protocol."
relations:
  - process-agent-commands
  - process-env-sync-governance
  - protocol-git-secrets-and-env-boundary
---

# Protocol: Command `ВЗП` (Planned Execution)

## Command
`ВЗП` = execute the task in a planned way, with step-by-step verification.

## Core principles
1. Create a concrete step-by-step plan before edits.
2. After each atomic change, run verification (lint/tests/checks).
3. If a new pattern appears, add/update a governing skill.
4. Keep migration docs in sync (`skills/MIGRATION.md`, relevant `docs/*` plans).

## Hard constraints
- No blind edits without verification.
- No undocumented migration results.
- No finish with stale plan/checklist state.
