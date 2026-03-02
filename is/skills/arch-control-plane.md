---
title: "Architecture: Control Plane"
tags: ["#architecture", "#control-plane", "#infrastructure", "#health"]
dependencies: ["arch-foundation"]
updated_at: "2026-03-01T00:00:00.000Z"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-01"
---

# Architecture: Control Plane

> **Context**: Definition of the Control Plane layer and bootstrap contracts for the Target App.

## Reasoning

- **#for-control-plane-isolation** Isolating the control plane prevents cascading failures during the migration process.
- **#for-observability** Standardized startup contracts (`npm run preflight`, `npm run health-check`) increase system observability without adding heavy external dependencies.
- **#for-simplicity-over-orchestration** Instead of complex legacy PowerShell orchestration, we rely on simple `node` execution and explicit `.js` scripts to maintain a clear and debuggable dependency map.
- **#for-single-writer-guard** A strict `DATA_PLANE_ACTIVE_APP` contract ensures only one environment (Target or Legacy) writes to shared cloud resources, preventing data races.
- **#not-orchestration-in-backend** Embedding orchestration into backend services — mixing of responsibilities (domain logic vs infrastructure state).
- **#not-abandon-control-plane** Temporarily abandoning the control plane — loss of control over the application state and safety during migration.
- **#not-legacy-orchestration-port** Full legacy orchestration port — would transfer unnecessary technical debt.

---

## Implementation Status in Target App
- `Implemented`: Simplified Control Plane v1 (`preflight` + `health-check` + `single-writer`).
