---
id: ais-8982e7
status: active
last_updated: "2026-03-11"
related_skills:
  - sk-cecbcc
  - sk-0e193a
related_ais:
  - ais-9f4e2d
  - ais-e3f4a5
  - ais-b6c7d8

---
<!-- Важно: оставлять пустую строку перед "---" ! -->

# AIS: Documentation Governance Model

## High-Level Concept

This specification defines how documentation stays stable during migrations:
id contracts are canonical, file paths are local context only, and validation gates are mandatory.

## Infrastructure & Data Flow

```mermaid
graph TD
  A[Skills and Rules] --> B[AIS Contracts]
  B --> C[Plans in docs/plans]
  C --> D[Backlog in docs/backlog]
  D --> E[Closure through LIR]
```

## Module Policies

- Active markdown documents must use `id:` contracts resolved through `is/contracts/docs/id-registry.json`.
- Mixed reference mode is mandatory: first governance-grade mention may include `(path)`, repeated mentions in the same file should collapse to bare `id:`.
- For code-file references, use `#JS-... (basename.js)` when basename is unique in the registry; use a full repo-relative path only for ambiguous basenames.
- Encoding policy is global: UTF-8 without BOM + LF for all text files. Mojibake markers block preflight. SSOT: id:sk-8f3a2e (process-encoding-policy), contract: encoding-contract.js.
- `AIS` may intentionally stay ahead of the current Arch-Scan, but only as an explicit target state. Every known rollout gap must be stated in the relevant `AIS` and mirrored by an inline code comment at the temporary deviation branch. If the mismatch is just stale documentation, update the `AIS` instead of excusing the drift.

## Components & Contracts

- id-registry.json + validate-global-md-ids — id-contract rollout complete.
- LIR complete; #JS-cMCNbcJ1 (path-contracts.js) SSOT for skip patterns.
- id:ais-9f4e2d (docs/ais/ais-anti-staleness.md) — anti-staleness architecture and validation gates.
- is/contracts/docs/id-registry.json — global SSOT: id → path for all 104 project markdown files.

## Active Gates (preflight)

| ID | Gate | Script | Scope |
|------|------|--------|-------|
| #JS-V63juXRG | All markdown have `id` | validate-global-md-ids.js | 104+ files |
| #JS-ht4FZQe4 | `id:` links resolve | validate-id-contract-links.js | all `.md` |
| #JS-3e2BNNyp | No raw path-only doc refs in active docs | audit-path-centric-doc-links.js | docs/** active |
| #JS-E4UcKE1H | No raw path-only doc refs in active skills | audit-path-centric-skill-links.js | skills/** active |
| #JS-BK2i557V | UTF-8 no BOM, LF, no mojibake | validate-docs-encoding.js | docs/** |
