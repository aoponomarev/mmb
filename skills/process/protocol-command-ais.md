---
id: protocol-command-ais
title: "Protocol: Command АИС (Architecture & Infrastructure Scan)"
scope: process
tags: [#protocol, #command, #architecture, #infrastructure, #аис]
version: 1.0.0
priority: medium
updated_at: 2026-02-22
migrated_from: mbb:process/process-agent-commands
migration_status: done
migration_notes: "Kept as legacy-compatible command alias focused on architecture/infrastructure scan."
relations:
  - process-agent-commands
  - arch-master
  - protocol-command-eip
---

# Protocol: Command `АИС` (Architecture & Infrastructure Scan)

## Command
`АИС` = review architecture and infrastructure without deep code-level refactoring.

## Scope
- ADR consistency and relations.
- SSOT/path consistency.
- MCP/rules/config coherency.

## Result
- List of risks and drift points.
- Recommended migration-safe fixes.
