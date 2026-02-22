---
id: arch-infrastructure
title: "Architecture: Runtime and Infrastructure (MMB)"
scope: architecture
tags: [#architecture, #infrastructure, #adr, #runtime, #mcp]
version: 1.0.0
priority: high
updated_at: 2026-02-22
status: active
confidence: medium
review_after: 2026-05-22
decision_scope: architecture
decision_id: ADR-ARCH-003
supersedes: none
migrated_from: mbb:docs/A_INFRASTRUCTURE.md
migration_status: done
migration_notes: "Converted MBB infra map to MMB architecture; kept portable-path and runtime boundary principles."
relations:
  - arch-master
  - arch-security
  - process-env-sync-governance
  - protocol-command-eip
  - protocol-command-kai
---

# Architecture: Runtime and Infrastructure (MMB)

## Overview
Defines how MMB runs across local environments with stable path governance, MCP service boundaries, and migration-safe operational assumptions.

## Implementation Status in MMB
- **Implemented:** `paths.js` as JS SSOT, `.env` root-path model, local MCP split by project window, skills MCP operational.
- **Pending:** full migration of infra-specific legacy playbooks and workflow orchestration patterns.
- **Doubtful:** direct transfer of old MBB container/service mesh decisions without simplification.

## Architectural Reasoning (Why this way)
- Use one path registry (`paths.js`) to remove multi-source drift.
- Keep infra logic composable through skills + MCP instead of hardcoded runbooks.
- Prefer incremental migration of infra capabilities to avoid importing obsolete complexity.

## Alternatives Considered
- **Copy full old infrastructure topology immediately:** rejected due to high legacy drag.
- **No formal infra ADRs:** rejected; leads to repeated assumptions and fragile migrations.

## Migration Notes
- Preserved portable-path and SSOT principles.
- Deferred MBB-specific service internals until corresponding MMB code exists.

## Relations
- `arch-master`
- `arch-security`
- `process-env-sync-governance`
- `protocol-command-eip`
- `protocol-command-kai`
