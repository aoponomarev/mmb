---
title: "Architecture: Control Plane"
tags: ["#architecture", "#control-plane", "#infrastructure", "#health"]
dependencies: ["arch-foundation"]
updated_at: "2026-03-01T00:00:00.000Z"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "7dea41f2"
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

## Implementation Status in Target App
- `Implemented`: Simplified Control Plane v1 (`preflight` + `health-check` + `single-writer`).
