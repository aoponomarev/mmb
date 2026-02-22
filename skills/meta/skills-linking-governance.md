---
id: skills-linking-governance
title: "Meta: Skills Linking Governance"
scope: meta
tags: [#meta, #skills, #relations, #adr, #governance]
version: 1.0.0
priority: high
updated_at: 2026-02-22
status: active
decision_scope: process
decision_id: ADR-META-001
supersedes: none
relations:
  - arch-template-adr
  - arch-master
  - process-agent-commands
---

# Meta: Skills Linking Governance

## Purpose
Define minimal, enforceable contracts for skill linking so the skill graph stays navigable for agents and stable during migration.

## Contract (mandatory)
1. Every architecture skill `skills/architecture/arch-*.md` must define:
   - `decision_id`
   - `supersedes`
   - `relations`
2. Each `arch-*` must have at least **2** `relations`.
3. `relations` must reference existing skill IDs.
4. `supersedes` must not point to its own `decision_id`.

## Why this exists
- Reduces orphaned skills and broken references.
- Makes decision evolution explicit (`supersedes` chain).
- Improves agent routing quality in MCP queries.

## Enforcement
- Script: `scripts/validate-skill-graph.js`
- Command: `npm run skills:graph:check`

## Evolution rule
When linking policy changes, update this file first, then update validator logic, then update docs (`skills/README.md`, `docs/План_Skills_MCP.md`).
