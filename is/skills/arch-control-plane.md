---
title: "Architecture: Control Plane"
tags: ["#architecture", "#control-plane", "#infrastructure", "#health"]
dependencies: ["arch-foundation"]
updated_at: "2026-03-01T00:00:00.000Z"
---

# Architecture: Control Plane

> **Context**: Definition of the Control Plane layer and bootstrap contracts for the Target App.

## Implementation Status in Target App
- `Implemented`: Simplified Control Plane v1 (`preflight` + `health-check` + `single-writer`).

## Architectural Reasoning (Why this way)
- **Isolation:** Isolating the control plane prevents cascading failures during the migration process.
- **Observability:** Standardized startup contracts (`npm run preflight`, `npm run health-check`) increase system observability without adding heavy external dependencies.
- **Simplicity over Over-engineering:** Instead of complex legacy PowerShell orchestration, we rely on simple `node` execution and explicit `.js` scripts to maintain a clear and debuggable dependency map.
- **Single-Writer Guard:** A strict `DATA_PLANE_ACTIVE_APP` contract ensures only one environment (Target or Legacy) writes to shared cloud resources, preventing data races.

## Alternatives Considered
- **Embedding orchestration into backend services:** Rejected due to mixing of responsibilities (domain logic vs infrastructure state).
- **Temporarily abandoning the control plane:** Rejected due to loss of control over the application state and safety during migration.
- **Full legacy orchestration port:** Rejected to avoid transferring unnecessary technical debt.
