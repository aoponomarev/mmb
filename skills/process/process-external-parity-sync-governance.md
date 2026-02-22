---
id: process-external-parity-sync-governance
title: Process - External Parity Sync Governance
scope: process
tags: [#process, #migration, #parity, #external-infra, #security, #ssot]
priority: critical
updated_at: 2026-02-22
status: active
confidence: high
review_after: 2026-06-01
decision_scope: process
decision_id: ADR-PROC-001
supersedes: none
relations:
  - process-env-sync-governance
  - protocol-git-secrets-and-env-boundary
  - plans-sync-governance
---

# Process: External Parity Sync Governance

> **Context:** During migration both MBB and MMB may run alternately. External infra contracts must remain compatible to prevent runtime and deployment drift.

## 1. Scope

This protocol applies to migration-period external infrastructure:
- Docker runtime contracts;
- Cloudflare integrations;
- Yandex Cloud integrations;
- other external provider contours activated for MBB/MMB parallel operation.

## 2. Contract

1. **Bidirectional sync:**  
   - change in MBB external contour -> mirror-check in MMB;  
   - change in MMB external contour -> compatibility check against MBB.
2. **Keys and secrets:**  
   all active API keys must exist in secure local env management for both sides; no secret commits.
3. **Parity level:**  
   parity is required by contract behavior (keys, endpoints, retries, timeouts, fallback, runbook), not by identical internal implementation.
4. **Status discipline:**  
   each contour change must be reflected in `План_Migration_Sync.md` and master plan status sync.

## 3. Operational Checklist

1. Confirm active external contours for current stage.
2. Verify env-key presence and naming parity (without revealing secret values).
3. Verify contract parity for runtime behavior.
4. Update statuses (`continue/changed/replaced/defer`) in migration plans.

## 4. Key Transfer Completion + Ongoing Tracking

1. Initial API key transfer to MMB is treated as a one-time completion milestone.
2. After completion, synchronization remains mandatory in both directions.
3. Tracking signal:
   - monitor modification dates of `.env` and `.env.example` in MBB and MMB;
   - if one side changed, parity check must be re-run for key names/contracts.
4. Never compare or log secret values in repository artifacts; only key presence and contract parity are tracked.

## 5. Exit Rule

Compatibility mode can be disabled only when:
- parity checks are passed for the contour;
- target MMB contour is stable;
- migration plans mark legacy contour as `replaced` or `defer` with rationale.
