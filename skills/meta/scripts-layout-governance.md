---
id: scripts-layout-governance
title: "Meta: Scripts Layout Governance"
scope: meta
tags: [#meta, #scripts, #governance, #infrastructure, #architecture]
version: 1.0.0
priority: high
updated_at: 2026-02-22
status: active
decision_scope: process
decision_id: ADR-META-005
supersedes: none
relations:
  - plans-sync-governance
  - arch-ssot-governance
  - protocol-git-secrets-and-env-boundary
---

# Meta: Scripts Layout Governance

## Purpose
Keep `scripts/` predictable: user-facing entry scripts in root, internal automation in typed subfolders.

## Contract
1. In `scripts/` root keep only:
   - `README.md`
   - scripts explicitly intended for manual user launch (example: `settings-sync-mbb.ps1`).
2. Internal non-interactive scripts must live in subfolders:
   - `scripts/infrastructure/`
   - `scripts/architecture/`
3. Git safety/preflight scripts are part of infrastructure and must live in:
   - `scripts/infrastructure/`
4. Any new subfolder in `scripts/` must be documented in `scripts/README.md`.

## Why
- Reduces cognitive load and “visual noise” in root.
- Makes ownership clear: infra vs architecture vs manual operations.
- Prevents accidental direct execution of low-level internal validators.
