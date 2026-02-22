---
id: process-agent-commands
title: "Process: Agent Commands (MMB)"
scope: process
tags: [#process, #agent, #commands, #омк, #еип, #каи, #взп]
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
- `ФИН` — legacy alias for explicit finalization request (not auto-mandated in MMB).

## Rules
1. If command is present, corresponding protocol skill has priority.
2. Rules live in skills; chat text is not SSOT.
3. Legacy aliases are supported for compatibility, but MMB-native protocols are canonical.
