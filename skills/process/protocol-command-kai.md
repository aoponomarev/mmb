---
id: protocol-command-kai
title: "Protocol: Command КАИ (Code/Architecture/Infrastructure)"
scope: process
tags: [#protocol, #command, #analysis, #каи]
version: 1.0.0
priority: high
updated_at: 2026-02-22
migrated_from: mbb:process/process-agent-commands
migration_status: done
migration_notes: "Extracted KAI behavior into explicit protocol skill for predictable intent routing."
relations:
  - process-agent-commands
  - arch-master
  - protocol-command-eip
---

# Protocol: Command `КАИ` (Code/Architecture/Infrastructure)

## Command
`КАИ` = выполнить полный анализ по трем слоям: Code, Architecture, Infrastructure.

## Required analysis order
1. **Code:** defects, regressions, test gaps, anchor coverage.
2. **Architecture:** ADR consistency, relations integrity, deprecated decisions impact.
3. **Infrastructure:** env/paths SSOT, MCP health, runtime assumptions.

## Output contract
- Findings by severity.
- Assumptions/open questions.
- Minimal corrective plan with verification steps.
