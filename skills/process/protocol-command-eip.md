---
id: protocol-command-eip
title: "Protocol: Command ЕИП (SSOT Check)"
scope: process
tags: [#protocol, #command, #ssot, #paths, #еип]
version: 1.0.0
priority: high
updated_at: 2026-02-22
migrated_from: mbb:process/process-paths-management
migration_status: done
migration_notes: "Derived from paths-management principle and adapted to MMB paths.js + .env SSOT model."
relations:
  - process-env-sync-governance
  - process-agent-commands
  - arch-master
---

# Protocol: Command `ЕИП` (SSOT Check)

## Command
`ЕИП` = проверить единый источник правды (SSOT) для путей/конфигурации.

## What to verify in MMB
1. `.env` contains only root-level host variables and secrets placeholders policy is respected.
2. `paths.js` is the only JS path registry used by MCP/scripts.
3. No new hardcoded absolute paths in code/docs/config.

## Output format
- **Status:** OK / drift detected.
- **Drift list:** concrete files and what deviates.
- **Fix plan:** minimal set of updates to restore SSOT.
