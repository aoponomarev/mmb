---
title: "Architecture: Testing Strategy & CI"
tags: ["#architecture", "#testing", "#ci", "#github"]
dependencies: ["arch-foundation"]
updated_at: "2026-03-01T00:00:00.000Z"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-01"
---

# Architecture: Testing Strategy & CI

> **Context**: Defines the approach to testing and continuous integration during and after the migration to the Target App.

## Reasoning

- **#for-node-test** Zero external test dependency; built-in since Node 18. Sufficient for contract and integration testing at current scale.
- **#for-contract-first-preflight** Relying on strict Zod-based contracts (`preflight.js`) paired with `node:test` provides the best cost/reliability ratio, immediately failing on invalid environment states.
- **#for-minimal-ci** Migration-at-scale requires formal gates at the PR/commit level. CI pipeline is intentionally kept minimal (Lint, Health, Test) to ensure fast feedback loops and avoid flaky checks.
- **#not-manual-verification** Manual verification only — too high a risk of hidden regressions.
- **#not-heavy-test-frameworks** Heavy test frameworks (Jest, Mocha) — unnecessary weight for this project scale.
- **#not-complex-ci-e2e** Complex multi-stage CI / Heavy E2E Frameworks (Playwright/Cypress) — deferred. Start with simple, fast gates; introduce heavy E2E when baseline runtime is fully stabilized.

---

## Implementation Status in Target App
- `Implemented`: `node:test` adopted globally. Minimal CI pipeline created via GitHub Actions (`ci.yml`).
