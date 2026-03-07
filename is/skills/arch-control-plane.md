---
id: sk-d7a2cc
title: "Architecture: Control Plane"
tags:
  - "#architecture"
  - "#control-plane"
  - "#infrastructure"
  - "#health"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-07
reasoning_checksum: 7dea41f2
last_change: ""
dependencies:
  - arch-foundation
updated_at: "2026-03-01T00:00:00.000Z"

---

# Architecture: Control Plane

> **Context**: Definition of the Control Plane layer and bootstrap contracts for the Target App.

## Reasoning

- **#for-control-plane-isolation** Isolating the control plane from the app runtime prevents cascading failures during the migration.
- **#for-observability** Standardized startup contracts (`preflight`, `health-check`) increase observability without heavy external dependencies.
- **#for-simplicity-over-orchestration** Simple `node` execution of `.js` scripts provides a clear, debuggable dependency map compared to legacy PowerShell.
- **#for-single-writer-guard** The `DATA_PLANE_ACTIVE_APP` contract in preflight ensures only one environment writes to cloud resources, preventing data races.
- **#not-orchestration-in-backend** Embedding orchestration into backend services mixes domain logic with infrastructure state.
- **#not-abandon-control-plane** Abandoning the control plane would lead to a loss of safety during the migration.
- **#not-legacy-orchestration-port** Fully porting legacy orchestration transfers unnecessary technical debt.

---

### Orchestrator Evolution

**Context**: Control plane orchestration evolves with migration. Isolate from app runtime; use standardized startup contracts.

**Principles**: Simple node execution of .js scripts; single-writer guard; no orchestration embedded in backend services.

### Hybrid Bridge (Control Plane ↔ n8n)

*Deferred until Docker/n8n deployed. See id:bskill-11683c (docs/backlog/skills/docker-infrastructure.md), id:bskill-2cab14 (docs/backlog/skills/n8n-infrastructure.md).*

**Context**: Safe MCP control plane for orchestrating n8n workflows from agent tools. Agent side stateless and provider-agnostic; strict execution safety.

**Scope**: Control plane legacy concept (tracked in `LIR-006.A1`); dedicated MCP server (stdio); proxies to n8n API, logs every action.

**Mandatory tools**: `check_system_health`, `list_active_workflows`, `execute_workflow`, `get_workflow_logs`.

**Safety gates**: Default dry-run; runtime writes disabled unless `CONTROL_PLANE_ALLOW_MUTATIONS=true`; destructive ops require `confirmToken`; invalid gate returns `blocked`, not raw errors.

**Reliability**: Timeouts for all HTTP; normalize endpoint compatibility; health checks degrade gracefully. Path resolution via path-resolver; events are tracked via id:ais-b7a9ba (docs/ais/ais-control-plane-llmops.md)#LIR-006.A2 (legacy control-plane event-log marker).

## Implementation Status in Target App
- `Implemented`: Simplified Control Plane v1 (`preflight` + `health-check` + `single-writer`).
- `Implemented`: Docs-ids gate — #JS-Hx2xaHE8 (validate-docs-ids.js) checks `related_skills`/`related_ais` id resolution; #JS-6U3KWB2e (generate-id-registry.js) produces `is/contracts/docs/id-registry.json`.
