---
id: process-agent-commands
title: "Process: Agent Commands (MMB)"
scope: process
tags: [#process, #agent, #commands, #brevity, #ssot, #full-analysis, #planned-execution]
version: 1.0.0
priority: high
updated_at: 2026-02-22
migrated_from: mbb:process/process-agent-commands
migration_status: done
migration_notes: "Adapted command dictionary for MMB; removed MBB-only dependencies."
relations:
  - protocol-command-omk
  - protocol-command-eip
  - protocol-command-kai
  - protocol-command-vzp
  - protocol-command-ais
  - protocol-command-fin
  - protocol-command-fin-discovery
---

# Process: Agent Commands (MMB)

## Overview
Dictionary of short user commands that switch agent behavior predictably.

## Command Dictionary
- `ОМК` — answer maximally briefly.
- `ЕИП` — SSOT/path consistency verification mode.
- `КАИ` — full Code/Architecture/Infrastructure analysis.
- `ВЗП` — planned execution protocol (step-by-step with verification).
- `АИС` — legacy alias, routed to architecture/infrastructure analysis (`КАИ`/`arch-*`).
- `ФИН` — finalization protocol (closure by default, can include discovery blocks).
- `ФИНС` — discovery-only focus: explicit request for Ф/И/Н/С option listing.

## Rules
1. If command is present, corresponding protocol skill has priority.
2. Rules live in skills; chat text is not SSOT.
3. Legacy aliases are supported for compatibility, but MMB-native protocols are canonical.
4. `ФИН` and `ФИНС` are coordinated, not competing:
   - `ФИН` => run finalization protocol, optionally with discovery-block depth.
   - `ФИНС` => keep focus on discovery output (Features/Integrations/Settings/Skills) while preserving finalization context.
