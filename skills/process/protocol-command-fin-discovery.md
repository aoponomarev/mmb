---
id: protocol-command-fin-discovery
title: "Protocol: Command ФИНС (Finalization Discovery Blocks)"
scope: process
tags: [#protocol, #command, #discovery, #finalization, #features-integrations-settings-skills]
version: 1.0.0
priority: medium
updated_at: 2026-02-22
status: active
confidence: high
review_after: 2026-06-01
decision_scope: process
decision_id: ADR-PROC-002
supersedes: none
relations:
  - protocol-command-fin
  - process-agent-commands
---

# Protocol: Command `ФИНС` (Finalization Discovery Blocks)

## Command intent
`ФИНС` is an explicit discovery-accent command inside the finalization family.

Use it when the user wants focused listing by four categories:
- **Ф**: Features
- **И**: Integrations
- **Н**: Settings
- **С**: Skills

## Relationship with `ФИН`
- `ФИН` is the master finalization protocol (closure-first, discovery optional).
- `ФИНС` does not replace `ФИН`; it narrows output emphasis to Features/Integrations/Settings/Skills enumeration and selection guidance.

## Output contract
1. Provide categorized options (Features, Integrations, Settings, Skills) in practical value-first order.
2. Keep recommendations migration-safe and consistent with active architecture constraints.
3. Preserve concise finalization context if task status closure is requested in the same turn.
