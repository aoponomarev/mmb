---
id: sk-8f3a2e
title: "Process: Encoding Policy (UTF-8 no BOM + LF)"
tags:
  - "#process"
  - "#encoding"
  - "#utf8"
  - "#line-endings"
reasoning_confidence: 0.98
reasoning_audited_at: "2026-03-09"
reasoning_checksum: 5724dbd0
last_change: ""

---

# Process: Encoding Policy

> **Context**: All text files in the repository MUST use **UTF-8 without BOM** and **LF** line endings. BOM breaks Unix tooling and Git diffs; CRLF causes cross-platform inconsistency. Single canonical encoding for all text files.

## Reasoning

- **#for-utf8-no-bom-lf** UTF-8 without BOM and LF everywhere. BOM breaks Unix tooling and Git diffs; CRLF causes cross-platform inconsistency. Single canonical encoding for all text files.
- **#for-mojibake-prevention** Mojibake (U+FFFD, BOM rendered as cp1251 text) indicates encoding corruption. Files with mojibake markers block preflight.

## Core Rules

- **Scope**: All text files: `.md`, `.mdc`, `.js`, `.ts`, `.json`, `.yml`, `.yaml`, `.ps1`, `.css`, `.html`, and any other human-editable text under the repo root. Excluded: `node_modules`, `.git`, `.cursor`.
- **Gates**: `validate-docs-encoding.js` (docs/**) — UTF-8 no BOM, LF, no mojibake. `normalize-text-encoding.js` strips BOM and converts CRLF→LF.
- **Preflight**: `docs:encoding:validate` runs in preflight.
- **Normalization**: `npm run encoding:normalize` — run after bulk edits or when encoding drift is suspected.
- **Triggers**: Before committing — ensure editor saves as UTF-8 no BOM, LF. After PowerShell/heredoc edits — run `encoding:normalize` and verify no mojibake.

## Contracts

- `is/contracts/encoding-contract.js` — SSOT for text extensions, exclusions, and policy constants. @causality #for-utf8-no-bom-lf
- `id:ais-8982e7` (docs/ais/ais-docs-governance.md) — governance reference.
