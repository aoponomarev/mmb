---
id: sk-d6777d
title: "Architecture: Testing Strategy & CI"
tags:
  - "#architecture"
  - "#testing"
  - "#ci"
  - "#github"
reasoning_confidence: 0.9
reasoning_audited_at: 2026-03-08
reasoning_checksum: febd586c
last_change: ""
dependencies:
  - arch-foundation
updated_at: "2026-03-01T00:00:00.000Z"

---

# Architecture: Testing Strategy & CI

> **Context**: Defines the approach to testing and continuous integration during and after the migration to the Target App.

## Reasoning

- **#for-node-test** Zero external test dependency; built-in since Node 18. Sufficient for contract and integration testing at current scale.
- **#for-contract-first-preflight** Strict Zod-based contracts (#JS-NrBeANnz (is/scripts/preflight.js)) paired with `node:test` provide immediate failure on invalid environment states.
- **#for-minimal-ci** Migration-at-scale requires fast feedback loops. CI is kept minimal (Lint, Health, Test) to avoid flaky checks.
- **#not-manual-verification** Too high a risk of hidden regressions.
- **#not-heavy-test-frameworks** Jest and Mocha add unnecessary weight for this scale.
- **#not-complex-ci-e2e** Heavy E2E is deferred until the baseline runtime is fully stabilized.

---

## Core Rules

### Autonomous Quality Gate

**Context**: Automated quality checks in delivery pipeline. Trigger: push to `main` or PR creation.

**Execution**: Run tests (Playwright/Cypress or equivalent); send results to analytics; if errors, pass logs to LLM for fix hypotheses.

**Blocker**: Release blocked if Quality Gate fails.

*Docker Compose Release Validation moved to id:bskill-11683c (docs/backlog/skills/docker-infrastructure.md) — not yet deployed.*

### Git Local CI Mirror (Preflight)

**Goal**: Run high-value local checks before commit/push in solo mode. SSOT: `scripts/git/preflight-solo.ps1`.

**Trigger**: Before commit when staged files include `is/mcp/*`, `package.json`/lockfiles; before push; after large infra edits. *(When control-plane exists: also control-plane scripts in id:ais-b7a9ba (docs/ais/ais-control-plane-llmops.md)#LIR-006.A6.)*

**Checks**: (1) `.env` must not be staged; (2) `npm run skills:check` — path existence, @skill resolution (blocking); (3) `npm run skills:affected` — affected skills and causality hashes from staged files (informational, does not block). *(Secret leakage scan, MCP SDK drift check — to be added as needed.)*

**Success criteria**: Preflight exits 0; no secret-like tokens in staged diff; runtime health endpoints available; MCP SDK baseline consistent.

### Preflight Diagnostics Quality Gate

**Goal**: Keep preflight diagnostics accurate; avoid false failures that block safe rollout.

**Gate rules**: Diagnostics must be read-only and deterministic; each path runnable in isolation from CLI; new diagnostics require one positive and one failure-path test; dependency drift must verify baseline and cross-package consistency.

**Acceptance**: Check runs without side effects; output machine-readable (JSON or stable markers); strict mode explicit and documented; warnings vs blocking failures clearly separated. Any change to preflight-solo.ps1: direct execution, related self-test, lint on touched files.

### Cloudflare Testing Protocol

**Context**: Verification protocol for Edge services.

**Checklist**: Auth — does login return valid JWT?; D1 — save/retrieve portfolio; KV — API Proxy cached results (`cf-cache-status`); CORS — preflight `OPTIONS` handled by Worker.

**Tools**: `wrangler tail` for real-time Worker logs; DevTools Network tab filter by `workers.dev`.

---

## Implementation Status in Target App
- `Implemented`: `node:test` adopted globally. Minimal CI pipeline created via GitHub Actions (`ci.yml`).
- `Implemented`: `scripts/git/preflight-solo.ps1` — pre-commit flow with skills:check (blocking) and skills:affected (informational).
