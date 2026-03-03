---
title: "Architecture: Testing Strategy & CI"
tags: ["#architecture", "#testing", "#ci", "#github"]
dependencies: ["arch-foundation"]
updated_at: "2026-03-01T00:00:00.000Z"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-03"
reasoning_checksum: "febd586c"
id: sk-d6777d

---

# Architecture: Testing Strategy & CI

> **Context**: Defines the approach to testing and continuous integration during and after the migration to the Target App.

## Reasoning

- **#for-node-test** Zero external test dependency; built-in since Node 18. Sufficient for contract and integration testing at current scale.
- **#for-contract-first-preflight** Strict Zod-based contracts (`preflight.js`) paired with `node:test` provide immediate failure on invalid environment states.
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

### Docker Compose Release Validation

**Context**: Docker Compose releases can affect watch mode, healthchecks, service orchestration. SSOT: `docker-compose.yml`.

**Trigger**: New Docker Compose release; anomalies in container restart/healthcheck.

**Validation path**: (1) `docker compose config` must pass; (2) Restart key services; (3) Validate `GET /health`, `GET /api/health-check`; (4) Confirm webhooks respond.

**Release notes priority**: Verify when notes mention watch-mode fixes, healthcheck handling, env-file path parsing.

### Git Local CI Mirror

**Goal**: Run high-value local checks before commit/push in solo mode. SSOT: `scripts/git/preflight-solo.ps1`.

**Trigger**: Before commit; before push; after large infra or control-plane edits.

**Checks**: Staged file map (identify changed areas); Docker — `docker compose --profile core config` when compose changed; MCP — `node control-plane/scripts/self-test.js` when control-plane changed; Secrets — fail if staged diff looks like secret leakage.

**Success criteria**: No secret-like strings; valid compose config (if touched); control-plane self-test passes (if touched).

### Cloudflare Testing Protocol

**Context**: Verification protocol for Edge services.

**Checklist**: Auth — does login return valid JWT?; D1 — save/retrieve portfolio; KV — API Proxy cached results (`cf-cache-status`); CORS — preflight `OPTIONS` handled by Worker.

**Tools**: `wrangler tail` for real-time Worker logs; DevTools Network tab filter by `workers.dev`.

---

## Implementation Status in Target App
- `Implemented`: `node:test` adopted globally. Minimal CI pipeline created via GitHub Actions (`ci.yml`).
