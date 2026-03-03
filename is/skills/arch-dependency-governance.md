---
title: "Architecture: Dependency Governance"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "c221f6b1"
id: sk-bb5cf3

---

# Architecture: Dependency Governance

> **Context**: Defines the dependency management policy for the Target App, ensuring minimal footprint, version stability, and controlled upgrades.

## Reasoning

- **#for-minimal-deps** Every added dependency is a maintenance liability and attack surface. We rely heavily on built-in Node APIs.
- **#for-node-test** Zero external test framework weight. `node:test` is sufficient for our scale.
- **#for-zod-single** Zod is our chosen single validation library used ubiquitously (env, schemas, UI config).
- **#for-lockfile-ssot** Exact version lock using `package-lock.json` prevents drift.
- **#for-no-bundler** No Webpack/Vite/esbuild required because the application relies on native ES modules over the `file://` protocol.
- **#not-adhoc-deps** Ad-hoc updates risk regressions; all upgrades require intent.
- **#not-deps-freeze** Full freeze accumulates security debt.
- **#not-heavy-test-frameworks** Heavy frameworks (Jest/Mocha) add unnecessary bloat.

---

## Implementation Status in Target App

- `Implemented`: Minimal dependency set enforced.
  - Production: `better-sqlite3` (local DB), `zod` (contract validation).
  - DevDependencies: `espree` (AST linting), `playwright` (browser testing).
  - Built-in: `node:test`, `node:assert/strict` (zero external test framework).
- `Implemented`: Lockfile discipline via `package-lock.json`.
- `Implemented`: Preflight validates env and path contracts on startup.

### Dependency Inventory

| Package | Purpose | Layer | Critical |
|---|---|---|---|
| `zod` | Runtime schema validation for all contracts | core | yes |
| `better-sqlite3` | Local SQLite for cache/data storage | core | yes |
| `espree` | AST parsing for hardcode linting | dev/CI | no |
| `playwright` | Browser-based E2E testing | dev/CI | no |

## Core Rules

- **Minimal dependency surface**: Every added dependency is a maintenance liability and a security attack surface. The Target App intentionally keeps production deps to 2, preferring built-in Node.js APIs (`node:test`, `node:fs`, `node:crypto`, `node:http`).
- **`node:test` over Jest/Vitest**: Eliminates the heaviest dev dependency tree in JavaScript projects. Built-in test runner is stable since Node 20 LTS and sufficient for contract/integration testing.
- **Zod as the single validation library**: Chosen for its TypeScript-first design, zero-dependency nature, and ubiquity in the ecosystem. Used across env validation, naming contracts, market data schemas, and UI config validation.
- **Lockfile as the version contract**: `package-lock.json` is the SSOT for exact dependency versions. Direct `package.json` ranges are kept narrow (caret `^`). Major upgrades require explicit review and rollback plan.
- **No bundler/build step**: The `file://` portability constraint means no Webpack/Vite/esbuild in the critical path. Browser modules use native ES imports.

## Contracts

- **Patch/minor**: Auto-acceptable via `npm update` with test suite validation.
- **Major**: Requires explicit review, changelog analysis, and a rollback checkpoint.
- **Native addon updates** (e.g., `better-sqlite3`): Require ABI compatibility check against target Node.js version.
- **Security advisories**: `npm audit` run as part of CI. Critical CVEs trigger immediate patch.

