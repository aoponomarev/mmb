---
title: "Architecture: Testing Strategy & CI"
tags: ["#architecture", "#testing", "#ci", "#github"]
dependencies: ["arch-foundation"]
updated_at: "2026-03-01T00:00:00.000Z"
reasoning_confidence: 0.9
reasoning_audited_at: "2026-03-02"
reasoning_checksum: "febd586c"

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

## Implementation Status in Target App
- `Implemented`: `node:test` adopted globally. Minimal CI pipeline created via GitHub Actions (`ci.yml`).
