---
id: skills-symlinks-governance
title: "Meta: Symlinks Governance"
scope: meta
tags: [#meta, #symlinks, #ssot, #governance, #eip]
version: 1.0.0
priority: medium
updated_at: 2026-02-22
status: active
decision_scope: process
decision_id: ADR-META-002
supersedes: none
relations:
  - arch-ssot-governance
---

# Meta: Symlinks Governance

## Purpose
In MBB, NTFS symlinks were heavily used to sync global configurations (like `C:\Users\AO\.continue\config.yaml`) with the project repository. While MMB prefers dynamic runtime configs (e.g., `config.ts`), symlinks may still be necessary for certain external tools that only accept static files. 

This skill defines SSOT governance for managing symlinks in MMB.

## Contract (mandatory)
1. **No hidden symlinks:** Any symlink created for project infrastructure MUST be registered in `paths.js` (`SYMLINKS_REGISTRY`).
2. **Registry format:** The registry uses a strict `[linkPath]: targetPath` JS Object mapping.
3. **Validation:** The `validate-symlinks.js` script must pass on CI/pre-commit to ensure no registered symlink is broken.

## Validation Script
- Script: `scripts/infrastructure/validate-symlinks.js`
- Command: `npm run symlinks:check`

This script reads `paths.symlinksRegistry` and verifies that:
- The link actually exists on the filesystem.
- The link is indeed a symbolic link (or a valid file if hardlinked/copied as fallback, though it warns).
- The link points to the correct target.

## How to add a new symlink
1. Create the symlink manually (e.g., using `New-Item -ItemType SymbolicLink` in PowerShell).
2. Add a new mapping to `SYMLINKS_REGISTRY` in `paths.js`.
3. Run `npm run symlinks:check` to verify.