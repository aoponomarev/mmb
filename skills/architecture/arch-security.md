---
id: arch-security
title: "Architecture: Security Boundaries (MMB)"
scope: architecture
tags: [#architecture, #security, #adr, #secrets, #auth]
version: 1.0.0
priority: high
updated_at: 2026-02-22
status: active
confidence: high
review_after: 2026-05-22
decision_scope: architecture
decision_id: ADR-ARCH-002
supersedes: none
migrated_from: mbb:docs/A_SECURITY.md
migration_status: done
migration_notes: "Converted MBB security topology into MMB ADR; removed MBB-only runtime specifics."
relations:
  - arch-master
  - skill-secrets-hygiene
  - protocol-git-secrets-and-env-boundary
  - process-env-sync-governance
  - protocol-command-eip
---

# Architecture: Security Boundaries (MMB)

## Overview
Defines security boundaries for MMB: secret handling, env policy, and least-privilege rules between local runtime, MCP tooling, and external providers.

## Implementation Status in MMB
- **Implemented:** `.env` is gitignored, `.env.example` placeholders policy, secret leak preflight checks, dedicated secrets hygiene skill.
- **Pending:** migration of cloud/edge auth specifics from legacy MBB where still relevant to MMB architecture.
- **Doubtful:** browser-side secret recovery patterns from old stack; likely replaced with stricter local-first flow.

## Architectural Reasoning (Why this way)
- Keep secrets in local runtime boundaries and never in tracked files.
- Separate policy (skills) from implementation (scripts/config), so agent decisions remain consistent.
- Favor least-privilege defaults to reduce accidental data exposure during migrations.

## Alternatives Considered
- **Single mega security doc in `docs/`:** rejected, low machine discoverability.
- **Ad-hoc comments in code only:** rejected, cannot enforce global policy across modules.

## Migration Notes
- Legacy details tied to MBB worker topology were not copied verbatim.
- Durable controls were preserved: no secrets in git, preflight checks, explicit governance skills.

## Relations
- `arch-master`
- `skill-secrets-hygiene`
- `protocol-git-secrets-and-env-boundary`
- `process-env-sync-governance`
- `protocol-command-eip`
